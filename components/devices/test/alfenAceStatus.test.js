'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const root = path.resolve(__dirname, '..');
const templatesDoc = JSON.parse(fs.readFileSync(path.join(root, 'lib/templates.json'), 'utf8'));
const compatibility = require('./helpers/compatibilityHarness.cjs');

function template(id) {
  const item = templatesDoc.templates.find((entry) => entry && entry.id === id);
  assert.ok(item, `missing template ${id}`);
  return item;
}

function datapoint(t, id) {
  const item = (t.datapoints || []).find((entry) => entry && entry.id === id);
  assert.ok(item, `missing datapoint ${id} in ${t.id}`);
  return item;
}

function loadModbusDriver() {
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'modbus-serial') return class ModbusRTU {};
    if (request === 'serialport') return { SerialPort: class SerialPort {} };
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    const modulePath = require.resolve('../lib/drivers/modbus');
    delete require.cache[modulePath];
    return require('../lib/drivers/modbus').ModbusDriver;
  } finally {
    Module._load = originalLoad;
  }
}

const ModbusDriver = loadModbusDriver();
const DeviceRuntime = compatibility.loadDeviceRuntime(path.join(root, 'lib/deviceRuntime.js'));
const adapter = { log: { debug() {}, info() {}, warn() {}, error() {} } };

function createDriver(t) {
  const driver = new ModbusDriver(adapter, {
    id: `status-${t.id}`,
    protocol: 'modbusTcp',
    templateId: t.id,
    connection: {
      host: '127.0.0.1',
      port: 502,
      unitId: 1,
      // This is the real Alfen numeric layout used by the installation. It must
      // not reverse sequential ASCII register strings such as Mode 3 state.
      wordOrder: 'LE',
      byteOrder: 'BE',
      addressOffset: 0,
    },
  }, t, {});
  driver.ensureConnected = async () => true;
  return driver;
}

function aliasDef(defs, pathName) {
  const found = defs.find((def) => compatibility.extractLegacyPath(def && def.relId) === pathName);
  assert.ok(found, `missing alias ${pathName}`);
  return found;
}

test('Alfen Mode 3 strings keep normal register order even when numeric word order is LE', async () => {
  const t = template('evcs.alfen.ng9xx.ace.socket1.modbusTcp');
  const mode3 = datapoint(t, 'mODE3_STATE');
  const driver = createDriver(t);
  assert.equal(driver.wordOrder, 'le');
  assert.equal(driver.byteOrder, 'be');

  const reads = [];
  driver._mbReadHoldingRegisters = async (address, length, unitId) => {
    reads.push({ address, length, unitId });
    // "A" + NUL padding in five consecutive 16-bit ASCII registers.
    return { data: [0x4100, 0x0000, 0x0000, 0x0000, 0x0000] };
  };

  const result = await driver.readDatapoints([mode3]);
  assert.deepEqual(reads, [{ address: 1200, length: 5, unitId: 1 }]);
  assert.equal(result.mODE3_STATE, 'A');
});

test('Alfen direct-address compatibility also decodes Mode 3 strings without numeric word reversal', async () => {
  const t = template('evcs.alfen.ng9xx.ace.socket1.modbusTcp');
  const mode3 = datapoint(t, 'mODE3_STATE');
  const driver = createDriver(t);

  // Simulate the already proven field variant where the direct table address (+1)
  // is selected by a successful control write. Numeric values remain LE, strings do not.
  driver._cacheAlfenReadVariantForControlBlock('socket', 1, 1, 'le', 'be');

  const reads = [];
  driver._mbReadHoldingRegisters = async (address, length, unitId) => {
    reads.push({ address, length, unitId });
    // "B2" + NUL padding.
    return { data: [0x4232, 0x0000, 0x0000, 0x0000, 0x0000] };
  };

  const result = await driver.readDatapoints([mode3]);
  assert.deepEqual(reads, [{ address: 1201, length: 5, unitId: 1 }]);
  assert.equal(result.mODE3_STATE, 'B2');
});

test('Alfen aliases distinguish EVSE availability from the actual vehicle/charging state', () => {
  const t = template('evcs.alfen.ng9xx.ace.socket1.modbusTcp');
  const runtime = compatibility.buildRuntime(DeviceRuntime, t, 'alfen-status');
  const defs = runtime._buildAliasDefinitions();

  const status = aliasDef(defs, 'r.status');
  const statusText = aliasDef(defs, 'r.statusText');
  const statusCode = aliasDef(defs, 'r.statusCode');
  const vehicleConnected = aliasDef(defs, 'r.vehicleConnected');
  const charging = aliasDef(defs, 'r.charging');
  const available = aliasDef(defs, 'r.available');

  const idleValues = {
    eVSE_STATE: 1,          // EVSE itself is operative
    mODE3_STATE: 'A',      // but no vehicle is connected
    aCTIVE_POWER: 0,
  };
  const ctx = { connected: true };

  assert.equal(status.get(idleValues, ctx), 'No vehicle (A)');
  assert.equal(statusText.get(idleValues, ctx), 'No vehicle (A)');
  assert.equal(statusCode.get(idleValues, ctx), 0);
  assert.equal(vehicleConnected.get(idleValues, ctx), false);
  assert.equal(charging.get(idleValues, ctx), false);
  assert.equal(available.get(idleValues, ctx), true);

  const connectedValues = { ...idleValues, mODE3_STATE: 'B2' };
  assert.equal(status.get(connectedValues, ctx), 'Vehicle connected, ready (B2)');
  assert.equal(vehicleConnected.get(connectedValues, ctx), true);
  assert.equal(charging.get(connectedValues, ctx), false);

  const chargingValues = { ...idleValues, mODE3_STATE: 'C2', aCTIVE_POWER: 7000 };
  assert.equal(status.get(chargingValues, ctx), 'Charging (C2)');
  assert.equal(vehicleConnected.get(chargingValues, ctx), true);
  assert.equal(charging.get(chargingValues, ctx), true);
});
