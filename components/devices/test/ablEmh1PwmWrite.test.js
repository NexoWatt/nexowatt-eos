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

function getDp(template, id) {
  const dp = template.datapoints.find(item => item && item.id === id);
  assert.ok(dp, `missing datapoint ${id}`);
  return dp;
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

function toHexByte(value) {
  return (Number(value) & 0xFF).toString(16).toUpperCase().padStart(2, '0');
}

function buildFc16AsciiFrame(unitId, address, registers) {
  const regs = Array.isArray(registers) ? registers : [registers];
  const data = [];
  for (const value of regs) {
    const word = Number(value) & 0xFFFF;
    data.push((word >> 8) & 0xFF, word & 0xFF);
  }
  const body = [
    unitId & 0xFF,
    0x10,
    (address >> 8) & 0xFF,
    address & 0xFF,
    (regs.length >> 8) & 0xFF,
    regs.length & 0xFF,
    data.length & 0xFF,
    ...data,
  ];
  const sum = body.reduce((acc, byte) => (acc + byte) & 0xFF, 0);
  const lrc = (0x100 - sum) & 0xFF;
  return `:${[...body, lrc].map(toHexByte).join('')}\r\n`;
}

async function captureWrite(engineeringDutyPct) {
  const template = getTemplate();
  const setPwm = getDp(template, 'sET_ICMAX_DUTY_CYCLE_PCT');
  const ModbusDriver = loadModbusDriver();
  const driver = new ModbusDriver(adapterStub(), {
    id: 'evcs1',
    templateId,
    protocol: 'modbusAscii',
    connection: { unitId: 1 },
  }, template, {});

  const calls = [];
  driver.ensureConnected = async () => true;
  driver._mbWriteRegisters = async (address, registers, unitId) => {
    calls.push({ address, registers: [...registers], unitId });
    return { address, length: registers.length };
  };

  await driver.writeDatapoint(setPwm, engineeringDutyPct);
  assert.equal(calls.length, 1);
  return calls[0];
}

test('ABL 10 A vendor example is emitted as 16.6 percent / register 0x00A6', async () => {
  const call = await captureWrite(16.6);
  assert.deepEqual(call, { address: 0x0014, registers: [0x00A6], unitId: 1 });
  assert.equal(
    buildFc16AsciiFrame(call.unitId, call.address, call.registers),
    ':0110001400010200A632\r\n'
  );
});

test('ABL wait command is emitted as 100 percent / register 0x03E8', async () => {
  const call = await captureWrite(100);
  assert.deepEqual(call, { address: 0x0014, registers: [0x03E8], unitId: 1 });
  assert.equal(
    buildFc16AsciiFrame(call.unitId, call.address, call.registers),
    ':0110001400010203E8ED\r\n'
  );
});

test('ABL raw Icmax datapoint rejects values outside the documented 8..100 percent range', async () => {
  await assert.rejects(() => captureWrite(0), /Allowed values\/ranges: 8\.\.100/);
  await assert.rejects(() => captureWrite(101), /Allowed values\/ranges: 8\.\.100/);
});
