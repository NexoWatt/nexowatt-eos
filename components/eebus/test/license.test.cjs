'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { EebusRuntime } = require('../build/lib/eebusRuntime');
const { getConfig } = require('../build/lib/config');
const { NexoWattPara14aBridge, NEXOWATT_PARA14A_COMMAND, NEXOWATT_PARA14A_HELLO } = require('../build/lib/nexowattBridge');

function fixture() {
  let allowed = true;
  const calls = [];
  const adapter = {
    namespace: 'eebus.0', isEosLicenseAllowed: () => allowed,
    log: { warn() {}, info() {}, debug() {} },
    async setStateAsync() {}, setTimeout, clearTimeout,
    sendTo(_to, command, _message, callback) { calls.push(command); callback({ accepted: true }); },
  };
  return { adapter, calls, deny() { allowed = false; } };
}

test('EEBUS runtime denies startup, user writes and automatic connections without permission', async () => {
  const f = fixture(); f.deny();
  const runtime = new EebusRuntime(f.adapter, getConfig({}), {}, {});
  await assert.rejects(runtime.start(), /EOS_LICENSE_REQUIRED/);
  await assert.rejects(runtime.handleStateChange('eebus.0.pairing.autoAcceptNewDevices', { ack: false, val: true }), /EOS_LICENSE_REQUIRED/);
  await assert.rejects(runtime.connectDevice('device'), /EOS_LICENSE_REQUIRED/);
  assert.equal(runtime.endpoint, undefined);
});

test('EEBUS rechecks permission after async trust lookup, immediately before SPINE actuation', async () => {
  const f = fixture();
  const runtime = new EebusRuntime(f.adapter, getConfig({ commandDryRun: false }), { shipId: 'local' }, {});
  let sent = 0;
  runtime.endpoint = { sendSpine() { sent++; return true; } };
  runtime.isTrusted = async () => { f.deny(); return true; };
  await assert.rejects(runtime.processCommand({ deviceId: 'device', channel: 'limits', stateName: 'powerLimitW', value: 4200 }), /EOS_LICENSE_REQUIRED/);
  assert.equal(sent, 0);
});

test('EEBUS bridge denies fresh and synthesized control at final send but retains handshake', async () => {
  const f = fixture();
  const bridge = new NexoWattPara14aBridge(f.adapter, getConfig({}), async () => {});
  f.deny();
  const result = await bridge.dispatchLimit({ commandId: 'example', operation: 'limitConsumption' });
  assert.equal(result.accepted, false);
  await assert.rejects(bridge.sendRequest('nexowatt-ui.0', NEXOWATT_PARA14A_COMMAND, {}, 20), /EOS_LICENSE_REQUIRED/);
  await bridge.sendRequest('nexowatt-ui.0', NEXOWATT_PARA14A_HELLO, {}, 20);
  assert.deepEqual(f.calls, [NEXOWATT_PARA14A_HELLO]);
});

test('EEBUS lease loss holds established limits without synthesized release or shutdown', async () => {
  const f = fixture(); f.deny();
  const runtime = new EebusRuntime(f.adapter, getConfig({}), {}, {});
  runtime.bridge = { dispatchLimit() { throw new Error('unsafe-new-write'); } };
  runtime.endpoint = { stop() { throw new Error('unsafe-disconnect'); } };
  runtime.clsSources.set('device', { lastRegularCommand: { active: true, expiresAtMs: Date.now() - 1 } });
  await runtime.superviseClsSources();
  assert.equal(runtime.clsSources.get('device').lastRegularCommand.active, true);
});

test('EEBUS suspension discards old automatic transitions while retaining equipment state', () => {
  const f = fixture();
  const runtime = new EebusRuntime(f.adapter, getConfig({}), {}, {});
  runtime.clsSources.set('device', { lastCommand: { active: true }, lastRegularCommand: { active: true }, failsafeActive: true });
  runtime.suspendControl();
  assert.equal(runtime.clsSources.get('device').lastCommand, undefined);
  assert.equal(runtime.clsSources.get('device').lastRegularCommand, undefined);
  assert.equal(runtime.clsSources.get('device').failsafeActive, true);
});

test('EEBUS starts exactly once after later central activation, without adapter restart', async () => {
  const fs = require('node:fs');
  const vm = require('node:vm');
  const path = require('node:path');
  const { createRequire } = require('node:module');
  const file = path.join(__dirname, '../build/main.js');
  const localRequire = createRequire(file);
  let allowed = false;
  let starts = 0;
  class Adapter {
    constructor() { this.config = {}; this.namespace = 'eebus.0'; this.log = { warn() {}, error() {}, info() {} }; }
    on() {} async setStateAsync() {} setInterval() { return {}; } clearInterval() {} subscribeStates() {}
  }
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), { module, exports: module.exports,
    require(name) {
      if (name === '@iobroker/adapter-core') return { Adapter };
      if (name === '../packages/eos-license-client') return { createLicenseGuard() { return { async start() { return allowed; }, isAllowed() { return allowed; }, assertAllowed() { assert.equal(allowed, true); } }; } };
      if (name === './lib/eebusRuntime') return { EebusRuntime: class { async start() { starts++; } async stop() {} } };
      if (name === './lib/objectFactory') return { ObjectFactory: class { async ensureBaseObjects() {} async publishIdentity() {} } };
      if (name === './lib/identityManager') return { IdentityManager: class { async ensureIdentity() { return {}; } } };
      return localRequire(name);
    },
  }, { filename: file });
  const adapter = module.exports({});
  await adapter.onReady();
  assert.equal(starts, 0);
  allowed = true;
  await adapter.startLicensedRuntime();
  await adapter.startLicensedRuntime();
  assert.equal(starts, 1);
});
