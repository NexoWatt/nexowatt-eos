'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const path = require('node:path');
const { parseChargePointInventory, assertStationScope } = require('../ocpp/license-scope');
const { registerHandlers: register16 } = require('../ocpp/v16');
const { registerHandlers: register201 } = require('../ocpp/v201');
const { registerHandlers: register21 } = require('../ocpp/v21');
const inventory = () => parseChargePointInventory([
  { stationIdentity: 'station', evseId: 1, connectorId: 1 },
  { stationIdentity: 'station', evseId: 1, connectorId: 2 },
]);
function adapterWithGuard(guard) {
  const file = path.join(__dirname, '../main.js');
  const localRequire = createRequire(file);
  const module = { exports: {} };
  class Adapter {
    constructor(options) { this.name = options.name; this.namespace = `${this.name}.0`; this.config = {}; this.log = { warn() {}, error() {}, info() {} }; }
    on() {}
  }
  const context = { module, exports: module.exports, setTimeout, clearTimeout, setInterval, clearInterval,
    require(name) {
      if (name === '@iobroker/adapter-core') return { Adapter };
      if (name === './packages/eos-license-client') return { createLicenseGuard() { return guard; } };
      if (name === './ocpp/server') return { OcppRpcServer: class { constructor() { throw new Error('NETWORK_STARTED'); } } };
      return localRequire(name);
    },
  };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  return module.exports({});
}

test('physical inventory is strict, complete in count, and never assumes one connector', () => {
  assert.equal(inventory().count, 2);
  for (const bad of [null, {}, [{ stationIdentity: 'station', evseId: 1, connectorId: '1' }],
    [{ stationIdentity: 'station', evseId: 1, connectorId: 0 }]]) assert.throws(() => parseChargePointInventory(bad));
  assert.throws(() => parseChargePointInventory(Array(2).fill({ stationIdentity: 'station', evseId: 1, connectorId: 1 })), /DUPLICATE/);
  assert.throws(() => assertStationScope(parseChargePointInventory([]), { rawIdentity: 'station' }, 3), /LIMIT/);
  assert.throws(() => assertStationScope(inventory(), { rawIdentity: 'station' }, 1), /LIMIT/);
  assert.throws(() => assertStationScope(inventory(), { rawIdentity: 'unknown' }, 3), /REQUIRED/);
  assert.throws(() => assertStationScope(inventory(), { rawIdentity: 'station', connectors: new Set(['1:3']) }, 3), /MISMATCH/);
  assert.doesNotThrow(() => assertStationScope(inventory(), { rawIdentity: 'station', connectors: new Set(['0:0', '1:1']) }, 3));
  assert.throws(() => assertStationScope(inventory(), { rawIdentity: 'station', proto: 'ocpp1.6' }, 3, { connectorId: 3 }), /UNKNOWN/);
});

test('startup fails closed without opening an OCPP listener', async () => {
  const adapter = adapterWithGuard({ async start() { return false; }, isAllowed() { return false; } });
  adapter._resetPersistedHealth = async () => {};
  await adapter.onReady();
  assert.equal(adapter.server, null);
});

test('last outbound boundary denies missing/stale lease and unknown topology, preserving telemetry', async () => {
  let allowed = true;
  const calls = [];
  const adapter = adapterWithGuard();
  adapter.licenseGuard = { assertAllowed() { if (!allowed) throw new Error('EOS_LICENSE_REQUIRED'); }, getStatus() { return { limits: { chargePoints: 3 } }; } };
  adapter.chargePointInventory = inventory();
  adapter.runtimeIndex.set('station', { rawIdentity: 'station', proto: 'ocpp1.6', connectors: new Set(['1:1']), client: { async call(method) { calls.push(method); return {}; } } });
  await adapter._callClient('station', 'SetChargingProfile', { connectorId: 1 });
  allowed = false;
  await assert.rejects(adapter._callClient('station', 'Reset', {}), /LICENSE/);
  await assert.rejects(adapter._callClient('station', 'TriggerMessage', { requestedMessage: 'MeterValues' }), /LICENSE/);
  await adapter._callClient('station', 'TriggerMessage', { requestedMessage: 'MeterValues' }, { licenseTelemetry: true });
  await assert.rejects(adapter._callClient('station', 'TriggerMessage', { requestedMessage: 'BootNotification' }, { licenseTelemetry: true }), /LICENSE/);
  assert.deepEqual(calls, ['SetChargingProfile', 'TriggerMessage']);
  allowed = true;
  adapter.runtimeIndex.get('station').connectors.add('1:3');
  await assert.rejects(adapter._callClient('station', 'Reset', {}), /MISMATCH/);
});

for (const [protocol, register] of [['ocpp1.6', register16], ['ocpp2.0.1', register201], ['ocpp2.1', register21]]) {
  test(`${protocol}: lease loss blocks new authorization but heartbeat and telemetry acknowledgement remain`, async () => {
    const handlers = new Map();
    const client = { identity: 'station', protocol, handle(name, fn) { if (typeof name === 'string') handlers.set(name, fn); } };
    let allowed = true;
    const ctx = { config: {}, log: { warn() {}, debug() {} }, defer() { return true; }, states: {}, runtime: { isStationAuthorized() { return allowed; } } };
    register(client, ctx);
    const responseKey = protocol === 'ocpp1.6' ? 'idTagInfo' : 'idTokenInfo';
    assert.equal((await handlers.get('Authorize')({ params: {} }))[responseKey].status, 'Accepted');
    allowed = false;
    assert.equal((await handlers.get('Authorize')({ params: {} }))[responseKey].status, 'Blocked');
    assert.equal(typeof (await handlers.get('Heartbeat')({ params: {} })).currentTime, 'string');
    assert.deepEqual(await handlers.get('MeterValues')({ params: {} }), {});
    if (protocol === 'ocpp1.6') assert.equal((await handlers.get('StartTransaction')({ params: { connectorId: 1 } })).idTagInfo.status, 'Blocked');
  });
}

test('OCPP starts once after central activation and does not queue denied commands for reactivation', async () => {
  let allowed = false;
  let starts = 0;
  const adapter = adapterWithGuard({ async start() { return allowed; }, isAllowed() { return allowed; } });
  adapter._resetPersistedHealth = async () => {};
  adapter._startOcppRuntime = async () => { starts++; adapter.server = {}; };
  await adapter.onReady();
  assert.equal(starts, 0);
  await adapter.onStateChange('ocpp21.0.station.control.hardReset', { val: true, ack: false });
  allowed = true;
  await adapter._startLicensedRuntime();
  await adapter._startLicensedRuntime();
  assert.equal(starts, 1);
  assert.equal(adapter.runtimeIndex.size, 0);
});
