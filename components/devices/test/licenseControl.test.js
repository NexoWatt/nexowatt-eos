'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { loadDeviceRuntime } = require('./helpers/compatibilityHarness.cjs');
const root = path.resolve(__dirname, '..');
const DeviceRuntime = loadDeviceRuntime(path.join(root, 'lib/deviceRuntime.js'));
const { ModbusDriver } = require('../lib/drivers/modbus');
const { MqttDriver } = require('../lib/drivers/mqtt');
const { UdpDriver } = require('../lib/drivers/udp');
const { TaCmiDriver } = load('lib/drivers/taCmi.js', { axios: { create() { return {}; } }, 'modbus-serial': {} });
const templates = Object.fromEntries(require('../lib/templates.json').templates.map(t => [t.id, t]));
const device = (id = 'one', templateId = 'generic.http') => ({ id, templateId, protocol: 'http' });
const instance = devices => ({ type: 'instance', common: { enabled: true }, native: { devices } });
const log = { debug() {}, info() {}, warn() {}, error() {} };
function load(file, dependencies = {}) {
  const filename = path.join(root, file);
  const req = createRequire(filename);
  const mod = { exports: {}, parent: {} };
  const wrapper = vm.runInThisContext(`(function(require,module,exports,__filename,__dirname) {\n${fs.readFileSync(filename, 'utf8')}\n})`, { filename });
  wrapper(name => Object.hasOwn(dependencies, name) ? dependencies[name] : req(name), mod, mod.exports, filename, path.dirname(filename));
  return mod.exports;
}
const client = load('lib/eos-license-client/index.js', { './eos-platform': { assertEosPlatform() {} } });
const inventory = load('lib/licenseInventory.js', { './eos-license-client': client });

function harness() {
  let allowed = true;
  const adapter = { name: 'nexowatt-devices', namespace: 'nexowatt-devices.0', log,
    _licenseGuard: { assertAllowed() { if (!allowed) throw new client.LicenseError('TEST_DENIED'); } },
    states: new Map(), async setStateAsync(id, value) { this.states.set(id, value); }, async getStateAsync() { return null; } };
  return { adapter, deny() { allowed = false; adapter._licenseControlEpoch = (adapter._licenseControlEpoch || 0) + 1; }, allow() { allowed = true; } };
}

function runtimeHarness() {
  const h = harness();
  const dp = { id: 'power', type: 'number', rw: 'rw', source: { kind: 'http' } };
  const runtime = new DeviceRuntime(h.adapter, device(), { id: 'generic.http', category: 'GENERIC', datapoints: [dp] }, {});
  runtime.dpById.set(dp.id, dp); runtime.dpByStateRelId.set(runtime.relStateId(dp), dp);
  const writes = [];
  runtime.driver = { async writeDatapoint(dp, value) { writes.push(value); }, async readDatapoints() { return { power: 42 }; }, async disconnect() {} };
  return { ...h, runtime, dp, writes, id: `nexowatt-devices.0.${runtime.relStateId(dp)}` };
}

test('actual runtime rejects uninitialized startup and writes without touching hardware', async () => {
  const h = runtimeHarness(); delete h.adapter._licenseGuard;
  await assert.rejects(() => h.runtime.start(), /NOT_CHECKED/);
  await h.runtime.handleStateChange(h.id, { val: 12, ack: false });
  assert.deepEqual(h.writes, []);
});

test('raw and alias controls require current authorization; loss retains telemetry and clears queued intent', async () => {
  const h = runtimeHarness();
  const alias = 'devices.one.aliases.v1.ctrl.powerSetpoint';
  h.runtime.aliasByStateRelId.set(alias, { rw: 'rw', dpId: 'power' });
  await h.runtime.handleStateChange(h.id, { val: 12, ack: false });
  h.deny(); h.runtime.suspendLicensedControl();
  await h.runtime.handleStateChange(`nexowatt-devices.0.${alias}`, { val: 99, ack: false });
  assert.deepEqual(h.writes, [12]);
  assert.deepEqual(await h.runtime.driver.readDatapoints(), { power: 42 });
  h.allow();
  await h.runtime._runAutomaticControl(() => h.runtime._writeLicensedDatapoint(h.dp, 12));
  assert.deepEqual(h.writes, [12], 'old command resumed after reauthorization');
  await h.runtime.handleStateChange(`nexowatt-devices.0.${alias}`, { val: 24, ack: false });
  assert.deepEqual(h.writes, [12, 24]);
});

test('an in-flight preparation cannot replay a prior epoch command after reauthorization', async () => {
  const h = runtimeHarness(); let release;
  h.runtime._maybeExecutePreWritesForDp = () => new Promise(resolve => { release = resolve; });
  const pending = h.runtime.handleStateChange(h.id, { val: 123, ack: false });
  h.deny(); h.runtime.suspendLicensedControl(); h.allow(); release(); await pending;
  assert.deepEqual(h.writes, []);
});

test('Modbus checks authorization after its IO lock, before every actual register write', async () => {
  const h = harness();
  const driver = new ModbusDriver(h.adapter, { id: 'one', protocol: 'modbusTcp', connection: {} }, { datapoints: [] }, {});
  let writes = 0; let unlock;
  driver._withIoLock = fn => new Promise(resolve => { unlock = () => resolve(fn()); });
  driver.client = { setID() {}, async writeRegister() { writes++; } };
  const pending = driver._mbWriteRegister(5, 12); h.deny(); unlock();
  await assert.rejects(() => pending, /TEST_DENIED/); assert.equal(writes, 0);
});

test('MQTT cyclic publish is gated without disconnecting telemetry', async () => {
  const h = harness(); let publishes = 0;
  const driver = new MqttDriver(h.adapter, { id: 'one', connection: {} }, { datapoints: [] }, {}, () => {});
  driver.connected = true; driver.client = { publish(t, p, o, callback) { publishes++; callback(); } };
  await driver._publish('test/control', '10', {}, true);
  h.deny(); driver.suspendLicensedControl();
  await assert.rejects(() => driver._publish('test/control', '20', {}, true));
  h.allow(); await assert.rejects(() => driver._publish('test/control', '20', {}, true), /fresh MQTT/);
  assert.equal(driver.connected, true); assert.equal(publishes, 1);
});

test('queued UDP control rechecks after asynchronous socket setup', async () => {
  const h = harness(); const driver = new UdpDriver(h.adapter, { id: 'one', connection: {} }, {}, {});
  let sends = 0;
  driver._ensureSocket = async () => { h.deny(); };
  driver.socket = { on() {}, once() {}, off() {}, send() { sends++; } };
  await assert.rejects(() => driver.writeDatapoint({ source: { kind: 'udp', write: { cmd: 'ena 1' } } }, 1), /TEST_DENIED/);
  assert.equal(sends, 0);
});

test('TA CMI outgoing registers require a fresh command after loss, incoming telemetry remains usable', async () => {
  const h = harness(); const driver = new TaCmiDriver(h.adapter, { id: 'one', connection: {} }, {}, {}, null);
  driver.connect = async () => {};
  await driver.writeDatapoint({ source: { kind: 'taCmiBridge', direction: 'toCmi', valueType: 'analog', channel: 1 } }, 12);
  assert.equal(driver._getHolding(driver.txAnalogBase), 12);
  h.deny(); driver.suspendLicensedControl();
  await driver._onCmiRegisterWrite(driver.rxAnalogBase, 7);
  assert.equal(driver.rxAnalog[0], 7);
  h.allow(); assert.throws(() => driver._getHolding(driver.txAnalogBase), /fresh CMI/);
});

test('inventory aggregates immutable template classes across instances; unknowns and edits deny', () => {
  const charger = Object.values(templates).find(t => t.aliasContract.deviceClass === 'evCharger').id;
  const battery = Object.values(templates).find(t => t.aliasContract.deviceClass === 'storageSystem').id;
  const local = [device('one', charger)];
  const objects = { 'system.adapter.nexowatt-devices.0': instance(local), 'system.adapter.nexowatt-devices.1': instance([device('two', charger), device('battery', battery)]) };
  assert.deepEqual(inventory.countInventory(objects, templates, 'nexowatt-devices.0', local), { chargePoints: 2, batteries: 1 });
  objects['system.adapter.nexowatt-devices.1'].native.devices.push(device('bad', 'unknown'));
  assert.throws(() => inventory.countInventory(objects, templates, 'nexowatt-devices.0', local), /INVENTORY_UNAVAILABLE/);
  delete objects['system.adapter.nexowatt-devices.1'];
  objects['system.adapter.nexowatt-devices.0'].native.devices = [device('changed', charger)];
  assert.throws(() => inventory.countInventory(objects, templates, 'nexowatt-devices.0', local), /INVENTORY_UNAVAILABLE/);
});

test('central Home authorization recovers, revocation denies, aggregate quantities reach the real client', async () => {
  const h = harness(); let valid = false; let requests = [];
  h.adapter.getForeignObjectsAsync = async () => ({ 'system.adapter.nexowatt-devices.0': instance([device()]) });
  h.adapter.sendTo = (_to, command, request, callback) => {
    requests.push(request); const now = Date.now();
    callback({ v: 1, nonce: request.nonce, valid, code: valid ? 'LICENSE_VALID' : 'LICENSE_DENIED', ...(valid ? { edition: 'home', features: ['energy'], limits: { chargePoints: 3, batteries: 2 }, checkedAt: now, validUntil: now + 15000 } : {}) });
  };
  let losses = 0; const guard = inventory.createInventoryLicenseGuard(h.adapter, templates, [device()], () => { losses++; });
  try {
    assert.equal(await guard.start(), false); valid = true;
    assert.equal(await guard.refresh(), true); guard.assertAllowed();
    assert.deepEqual(requests.at(-1).required, { chargePoints: 0, batteries: 0 });
    valid = false; assert.equal(await guard.refresh(), false); assert.throws(() => guard.assertAllowed()); assert.ok(losses);
  } finally { await guard.stop(); }
});

test('main entry starts once after central activation and retains diagnostics while unlicensed', async () => {
  let allowed = false; let starts = 0; let controls = 0; let stops = 0;
  class Adapter { constructor(options) { this.config = options.config; this.name = options.name; this.namespace = `${options.name}.0`; this.instance = 0; this.log = log; } on() {} subscribeStates() {} async subscribeForeignObjectsAsync() {} async setObjectNotExistsAsync() {} async setStateAsync() {} async getForeignObjectsAsync() { return {}; } }
  class Runtime { constructor(adapter, cfg) { this.adapter = adapter; this.cfg = cfg; this.baseId = `devices.${cfg.id}`; } async initObjects() {} async start() { starts++; this.started = true; } async stop() { stops++; } suspendLicensedControl() {} async handleStateChange() { controls++; } }
  const guard = { async start() { return allowed; }, isAllowed() { return allowed; }, assertAllowed() { assert.ok(allowed); }, async stop() {} };
  const main = load('main.js', { '@iobroker/adapter-core': { Adapter }, './lib/deviceRuntime': { DeviceRuntime: Runtime }, './lib/eos-license-client': { assertEosPlatform() {} }, './lib/licenseInventory': { createInventoryLicenseGuard() { return guard; } } });
  const adapter = main({ config: { devices: [device()] } });
  try {
    await adapter.onReady(); assert.equal(starts, 0);
    allowed = true; await Promise.all([adapter._ensureDevicesStarted(), adapter._ensureDevicesStarted()]); assert.equal(starts, 1);
    await adapter.onStateChange('nexowatt-devices.0.devices.one.power', { val: 1, ack: false }); assert.equal(controls, 1);
    allowed = false; await adapter.onStateChange('nexowatt-devices.0.devices.one.power', { val: 2, ack: false }); assert.equal(controls, 1);
  } finally { await adapter.onUnload(() => {}); }
  assert.equal(stops, 1);
});


test('timed-out inventory reads remain single-flight and cannot reopen a stopped guard', async () => {
  const h = harness(); let reads = 0; let resolve;
  h.adapter.getForeignObjectsAsync = () => { reads++; return new Promise(done => { resolve = done; }); };
  const guard = inventory.createInventoryLicenseGuard(h.adapter, templates, [device()], () => {});
  try {
    assert.equal(await guard.refresh(), false);
    assert.equal(await guard.refresh(), false);
    assert.equal(reads, 1);
    await guard.stop(); resolve({ 'system.adapter.nexowatt-devices.0': instance([device()]) });
    await Promise.resolve(); assert.equal(guard.isAllowed(), false);
  } finally { await guard.stop(); }
});

test('a valid central lease expires at the actual write boundary', async () => {
  const h = runtimeHarness();
  h.adapter.sendTo = (_target, _command, request, callback) => {
    const now = Date.now();
    callback({ v: 1, nonce: request.nonce, valid: true, code: 'LICENSE_VALID', edition: 'home', features: ['energy'], limits: { chargePoints: 3, batteries: 2 }, checkedAt: now, validUntil: now + 20 });
  };
  const guard = client.createLicenseGuard(h.adapter, { onLost() { h.runtime.suspendLicensedControl(); } });
  h.adapter._licenseGuard = guard;
  try {
    assert.equal(await guard.refresh(), true);
    await h.runtime.handleStateChange(h.id, { val: 12, ack: false });
    await new Promise(resolve => setTimeout(resolve, 35));
    await h.runtime.handleStateChange(h.id, { val: 24, ack: false });
    assert.deepEqual(h.writes, [12]);
    assert.equal(guard.isAllowed(), false);
  } finally { await guard.stop(); }
});

for (const kind of ['Rtu', 'Ascii']) {
  test(`shared Modbus ${kind} bus rechecks the originating instance after its queue`, async () => {
    const first = harness(); const origin = harness(); let sends = 0;
    const api = load(`lib/drivers/modbus${kind}Bus.js`, { 'modbus-serial': class {}, serialport: { SerialPort: class {} } });
    const { bus } = api.acquireBus(first.adapter, { path: '/test/no-device' });
    let release;
    bus._queue = new Promise(resolve => { release = resolve; });
    bus.ensureConnected = async () => true;
    bus.connected = true;
    bus.client = { setID() {}, setTimeout() {}, async writeRegister() { sends++; } };
    bus.port = { write(_data, callback) { sends++; callback(); } };
    const write = bus.writeRegister(1, 100, 10, 20, () => origin.adapter._licenseGuard.assertAllowed());
    origin.deny(); release();
    await assert.rejects(() => write, /TEST_DENIED/);
    assert.equal(sends, 0, 'another instance owner must not authorize this request');
    assert.equal(bus.connected, true, 'license denial must not invalidate a healthy telemetry transport');
  });
}
