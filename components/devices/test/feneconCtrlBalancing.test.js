'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const root = path.resolve(__dirname, '..');
const runtimeRaw = fs.readFileSync(path.join(root, 'lib/templates.json'), 'utf8');
const adminRaw = fs.readFileSync(path.join(root, 'admin/templates.json'), 'utf8');
const templates = JSON.parse(runtimeRaw).templates;
const compatibility = require('./helpers/compatibilityHarness.cjs');
const DeviceRuntime = compatibility.loadDeviceRuntime(path.join(root, 'lib/deviceRuntime.js'));

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

function templateById(id) {
  const template = templates.find((entry) => entry && entry.id === id);
  assert.ok(template, `missing template ${id}`);
  return template;
}

function datapoint(template, id) {
  const item = template.datapoints.find((entry) => entry && entry.id === id);
  assert.ok(item, `missing datapoint ${id}`);
  return item;
}

function stringToRegisters(value, registerCount) {
  const buffer = Buffer.alloc(registerCount * 2);
  buffer.write(String(value), 0, Math.min(buffer.length, Buffer.byteLength(String(value), 'ascii')), 'ascii');
  const registers = [];
  for (let offset = 0; offset < buffer.length; offset += 2) {
    registers.push(buffer.readUInt16BE(offset));
  }
  return registers;
}

function float32Registers(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeFloatBE(Number(value), 0);
  return [buffer.readUInt16BE(0), buffer.readUInt16BE(2)];
}

function createDriver(template) {
  const logs = [];
  const adapter = {
    log: {
      debug(message) { logs.push({ level: 'debug', message }); },
      info(message) { logs.push({ level: 'info', message }); },
      warn(message) { logs.push({ level: 'warn', message }); },
      error(message) { logs.push({ level: 'error', message }); },
    },
  };
  const driver = new ModbusDriver(adapter, {
    id: 'fenecon1',
    protocol: 'modbusTcp',
    templateId: template.id,
    connection: {
      host: '127.0.0.1',
      port: 502,
      unitId: 1,
      addressOffset: 0,
      wordOrder: 'be',
      byteOrder: 'be',
    },
  }, template, {});
  driver.ensureConnected = async () => true;
  return { driver, logs };
}

function aliasMap(template) {
  const runtime = compatibility.buildRuntime(DeviceRuntime, template, 'fenecon1');
  const prefix = 'devices.fenecon1.aliases.';
  const definitions = runtime._buildAliasDefinitions();
  return new Map(definitions.map((entry) => [String(entry.relId).slice(prefix.length), entry]));
}

test('FENECON ctrlBalancing0 datapoints are additive, synchronized and match the documented example block', () => {
  assert.equal(runtimeRaw, adminRaw);
  const template = templateById('ess.fenecon.FeneconHomeEssImpl');

  const expected = [
    ['cTRL_BALANCING_COMPONENT_ID', 890, 8, 'string'],
    ['cTRL_BALANCING_BLOCK_LENGTH', 906, 1, 'uint16'],
    ['cTRL_BALANCING_OPENEMS_COMPONENT_HASH', 910, 1, 'uint16'],
    ['cTRL_BALANCING_OPENEMS_COMPONENT_LENGTH', 911, 1, 'uint16'],
    ['cTRL_BALANCING_STATE', 912, 1, 'uint16'],
    ['cTRL_BALANCING_IMPL_HASH', 990, 1, 'uint16'],
    ['cTRL_BALANCING_IMPL_LENGTH', 991, 1, 'uint16'],
  ];

  for (const [id, address, length, dataType] of expected) {
    const dp = datapoint(template, id);
    assert.equal(dp.rw, 'ro', id);
    assert.equal(dp.source.read.fc, 3, id);
    assert.equal(dp.source.read.address, address, id);
    assert.equal(dp.source.read.length, length, id);
    assert.equal(dp.source.read.dataType, dataType, id);
    assert.equal(dp.source.read.wordOrder, 'be', id);
    assert.equal(dp.source.read.byteOrder, 'be', id);
    assert.equal(dp.source.read.optional, true, id);
  }

  assert.deepEqual(datapoint(template, 'cTRL_BALANCING_STATE').states, {
    '0': 'Ok',
    '1': 'Info',
    '2': 'Warning',
    '3': 'Fault',
  });

  const command = datapoint(template, 'sET_GRID_ACTIVE_POWER');
  assert.equal(command.rw, 'wo');
  assert.equal(command.unit, 'kW');
  assert.equal(command.source.scaleFactor, -3);
  assert.deepEqual(command.source.write, {
    fc: 16,
    address: 992,
    length: 2,
    dataType: 'float32',
    wordOrder: 'be',
    byteOrder: 'be',
    finite: true,
    requireComponentId: {
      fc: 3,
      address: 890,
      length: 8,
      dataType: 'string',
      wordOrder: 'be',
      byteOrder: 'be',
      expected: 'ctrlBalancing0',
      cacheMs: 60000,
    },
  });
  assert.match(command.note, /0 kW = Ausregelung auf null/);
  assert.match(command.note, /negativer Wert = gewünschte Einspeisung/);
  assert.match(command.note, /positiver Wert = gewünschter Netzbezug/);
});

test('FENECON SetGridActivePower writes float32 watts at address 992 after component-ID verification', async () => {
  const template = templateById('ess.fenecon.FeneconHomeEssImpl');
  const command = datapoint(template, 'sET_GRID_ACTIVE_POWER');
  const { driver } = createDriver(template);
  const reads = [];
  const writes = [];

  driver._mbReadHoldingRegisters = async (address, length, unitId) => {
    reads.push({ address, length, unitId });
    return { data: stringToRegisters('ctrlBalancing0', 8) };
  };
  driver._mbWriteRegisters = async (address, values, unitId) => {
    writes.push({ address, values: values.slice(), unitId });
  };

  await driver.writeDatapoint(command, -5);
  await driver.writeDatapoint(command, 5);
  await driver.writeDatapoint(command, 0);

  driver._markDisconnected(new Error('simulated reconnect'));
  await driver.writeDatapoint(command, 1);

  assert.deepEqual(reads, [
    { address: 890, length: 8, unitId: 1 },
    { address: 890, length: 8, unitId: 1 },
  ], 'component identity is cached during one connection and rechecked after reconnect');
  assert.deepEqual(writes, [
    { address: 992, values: float32Registers(-5000), unitId: 1 },
    { address: 992, values: float32Registers(5000), unitId: 1 },
    { address: 992, values: float32Registers(0), unitId: 1 },
    { address: 992, values: float32Registers(1000), unitId: 1 },
  ]);
});

test('FENECON movable-register safety blocks SetGridActivePower when address 890 is not ctrlBalancing0', async () => {
  const template = templateById('ess.fenecon.FeneconHomeEssImpl');
  const command = datapoint(template, 'sET_GRID_ACTIVE_POWER');
  const { driver } = createDriver(template);
  const writes = [];

  driver._mbReadHoldingRegisters = async () => ({ data: stringToRegisters('otherComponent', 8) });
  driver._mbWriteRegisters = async (address, values, unitId) => writes.push({ address, values, unitId });

  await assert.rejects(
    driver.writeDatapoint(command, 5),
    (error) => {
      assert.equal(error.code, 'E_MODBUS_COMPONENT_ID_MISMATCH');
      assert.match(error.message, /expected component-ID "ctrlBalancing0"/);
      assert.match(error.message, /register blocks can move/i);
      return true;
    },
  );
  assert.deepEqual(writes, []);
});

test('FENECON grid target is exposed only via Alias Contract v1 and converts W to the raw kW command', () => {
  const template = templateById('ess.fenecon.FeneconHomeEssImpl');
  const aliases = aliasMap(template);

  assert.equal(aliases.has('ctrl.gridSetpointW'), false, 'legacy aliases.* must stay unchanged');
  assert.equal(aliases.has('ctrl.napSetpointW'), false, 'legacy aliases.* must stay unchanged');

  for (const pathName of ['v1.ctrl.gridSetpointW', 'v1.ctrl.napSetpointW']) {
    const alias = aliases.get(pathName);
    assert.ok(alias, `missing ${pathName}`);
    assert.equal(alias.unit, 'W');
    assert.equal(alias.writeDpId, 'sET_GRID_ACTIVE_POWER');
    assert.equal(alias.commandOnlyAlias, true);
    assert.equal(alias.toDevice(-5000), -5);
    assert.equal(alias.toDevice(5000), 5);
    assert.equal(alias.toDevice(0), 0);
  }
});
