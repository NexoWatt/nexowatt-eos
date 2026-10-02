'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const root = path.resolve(__dirname, '..');
const templatesDoc = JSON.parse(fs.readFileSync(path.join(root, 'lib/templates.json'), 'utf8'));
const templateId = 'evcs.abl.emh1.evcc2_3.modbusAscii';

function getTemplate() {
  const template = templatesDoc.templates.find(item => item && item.id === templateId);
  assert.ok(template, `missing template ${templateId}`);
  return template;
}

function loadModbusDriver() {
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'modbus-serial') return class ModbusRTU {};
    if (request === 'serialport') return { SerialPort: class SerialPort {} };
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    for (const rel of [
      '../lib/drivers/modbus',
      '../lib/drivers/modbusAsciiBus',
      '../lib/drivers/modbusRtuBus',
    ]) {
      try { delete require.cache[require.resolve(rel)]; } catch (_) {}
    }
    return require('../lib/drivers/modbus').ModbusDriver;
  } finally {
    Module._load = originalLoad;
  }
}

function adapterStub() {
  return { log: { debug() {}, info() {}, warn() {}, error() {} } };
}

function readSource(dp) {
  const source = dp && dp.source;
  if (!source || source.kind !== 'modbus') return null;
  return source.read && typeof source.read === 'object' ? source.read : source;
}

async function captureHoldingReads(template, datapoints) {
  const ModbusDriver = loadModbusDriver();
  const driver = new ModbusDriver(adapterStub(), {
    id: 'evcs1',
    templateId: template.id,
    protocol: 'modbusAscii',
    connection: { unitId: 1 },
  }, template, {});

  const calls = [];
  driver.ensureConnected = async () => true;
  driver.disconnect = async () => {};
  driver._mbReadHoldingRegisters = async (start, length, unitId) => {
    calls.push({ start, length, unitId });
    return { data: new Array(length).fill(0) };
  };

  await driver.readDatapoints(datapoints);
  return calls;
}

test('ABL EVCC2/3 template declares the protocol-specific exact read requests', () => {
  const template = getTemplate();
  const groups = new Map();

  for (const dp of template.datapoints) {
    const src = readSource(dp);
    if (!src || Number(src.fc) !== 3) continue;
    const key = String(src.readRequestGroup || '');
    assert.ok(key, `${dp.id} must declare readRequestGroup`);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ id: dp.id, address: Number(src.address), length: Number(src.length || 1) });
  }

  assert.deepEqual([...groups.keys()].sort(), [
    'abl-0x0001-r2',
    'abl-0x0003-r1',
    'abl-0x0006-r2',
    'abl-0x002e-r5',
  ]);
});

test('ABL EVCC2/3 reads 0x0001/R2 and 0x0003/R1 separately instead of invalid 0x0001/R3', async () => {
  const template = getTemplate();
  const datapoints = template.datapoints.filter(dp => {
    const src = readSource(dp);
    return src && Number(src.fc) === 3;
  });

  const calls = await captureHoldingReads(template, datapoints);
  assert.deepEqual(calls, [
    { start: 0x0001, length: 2, unitId: 1 },
    { start: 0x0003, length: 1, unitId: 1 },
    { start: 0x0006, length: 2, unitId: 1 },
    { start: 0x002E, length: 5, unitId: 1 },
  ]);
  assert.equal(calls.some(call => call.start === 0x0001 && call.length === 3), false);
});

test('explicit read-request boundaries do not change normal grouping for untagged Modbus templates', async () => {
  const template = {
    id: 'test.modbus.read-groups',
    manufacturer: 'Test',
    driverHints: { modbus: { strictContiguousReads: true, maxReadRegs: 8 } },
    datapoints: [
      { id: 'a', source: { kind: 'modbus', fc: 3, address: 10, length: 1, dataType: 'uint16' } },
      { id: 'b', source: { kind: 'modbus', fc: 3, address: 11, length: 1, dataType: 'uint16' } },
    ],
  };

  const calls = await captureHoldingReads(template, template.datapoints);
  assert.deepEqual(calls, [{ start: 10, length: 2, unitId: 1 }]);
});
