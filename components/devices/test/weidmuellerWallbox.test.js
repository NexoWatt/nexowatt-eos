'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  decodeAsciiLswFirst,
  encodeAsciiLswFirst,
  decodeHexLswFirst,
  decodeIpv4U16,
} = require('../lib/weidmuellerCodec');

const root = path.resolve(__dirname, '..');
const runtimeTemplates = JSON.parse(fs.readFileSync(path.join(root, 'lib/templates.json'), 'utf8'));
const adminTemplates = JSON.parse(fs.readFileSync(path.join(root, 'admin/templates.json'), 'utf8'));
const templateId = 'evcs.weidmueller.chargeWallboxBusiness.modbusTcp';

function getTemplate(doc) {
  return doc.templates.find(item => item && item.id === templateId);
}

function getDp(template, id) {
  const dp = template.datapoints.find(item => item && item.id === id);
  assert.ok(dp, `missing datapoint ${id}`);
  return dp;
}

function wordsToBuffer(words) {
  const buffer = Buffer.alloc(words.length * 2);
  words.forEach((word, index) => buffer.writeUInt16BE(word & 0xFFFF, index * 2));
  return buffer;
}

test('runtime and admin contain the same Weidmüller CH-W-B template', () => {
  const runtime = getTemplate(runtimeTemplates);
  const admin = getTemplate(adminTemplates);
  assert.ok(runtime);
  assert.ok(admin);
  assert.deepEqual(admin, runtime);
  assert.equal(runtime.category, 'EVCS');
  assert.equal(runtime.manufacturer, 'Weidmüller');
  assert.deepEqual(runtime.protocols, ['modbusTcp']);
});

test('connection and safety hints match the vendor guide', () => {
  const template = getTemplate(runtimeTemplates);
  const hints = template.driverHints.modbus;
  assert.equal(hints.unitIdDefault, 255);
  assert.equal(hints.tcpUnitIdDefault, 255);
  assert.equal(hints.enforceTcpUnitIdDefault, true);
  assert.equal(hints.forceAddressOffset, 0);
  assert.equal(hints.disableAddressFallbackOffsets, true);
  assert.equal(hints.restoreSetpointsOnStart.enabled, false);
  assert.equal(hints.setpointKeepalive.enabled, false);
});

test('control registers use exact documented addresses and scaling', () => {
  const template = getTemplate(runtimeTemplates);
  const enable = getDp(template, 'sET_ENABLE');
  assert.equal(enable.rw, 'wo');
  assert.equal(enable.source.fc, 5);
  assert.equal(enable.source.address, 400);

  const released = getDp(template, 'cHARGING_RELEASED');
  assert.equal(released.source.fc, 1);
  assert.equal(released.source.address, 436);

  const current = getDp(template, 'sET_CHARGING_CURRENT');
  assert.equal(current.source.read.fc, 3);
  assert.equal(current.source.read.address, 528);
  assert.equal(current.source.read.scaleFactor, -1);
  assert.equal(current.source.write.fc, 6);
  assert.equal(current.source.write.address, 528);
  assert.equal(current.source.write.scaleFactor, -1);

  const rfid = getDp(template, 'rFID_READER_ENABLE');
  assert.equal(rfid.source.fc, 5);
  assert.equal(rfid.source.address, 419);
});

test('32-bit live values are decoded low-word-first without byte swapping', () => {
  const template = getTemplate(runtimeTemplates);
  for (const id of ['cHARGING_TIME', 'vOLTAGE_L1', 'vOLTAGE_L2', 'vOLTAGE_L3', 'cURRENT_L1', 'cURRENT_L2', 'cURRENT_L3', 'aCTIVE_POWER', 'eNERGY_SESSION']) {
    const dp = getDp(template, id);
    assert.equal(dp.source.length, 2, id);
    assert.equal(dp.source.wordOrder, 'le', id);
    assert.equal(dp.source.byteOrder, 'be', id);
  }
});


test('scaled 0.1 A current writes round to the exact integer register value', () => {
  const driverSource = fs.readFileSync(path.join(root, 'lib/drivers/modbus.js'), 'utf8');
  assert.match(driverSource, /writeUInt16BE\(Math\.round\(Number\(value\)\), 0\)/);
  assert.equal(Math.round(7.1 / 0.1), 71);
  assert.equal(Math.round(7.6 / 0.1), 76);
  assert.equal(Math.round(31.9 / 0.1), 319);
});

test('vendor low-word-first ASCII codec reproduces the documented RFID example', () => {
  const words = [0x3235, 0x4341, 0x3045, 0x3435, ...Array(12).fill(0)];
  assert.equal(decodeAsciiLswFirst(wordsToBuffer(words)), '450ECA25');

  const encoded = encodeAsciiLswFirst('450ECA25', 32);
  assert.deepEqual(
    [0, 1, 2, 3].map(index => encoded.readUInt16BE(index * 2)),
    [0x3235, 0x4341, 0x3045, 0x3435],
  );
});

test('MAC and IPv4 helper decoders preserve documented register layout', () => {
  assert.equal(
    decodeHexLswFirst(wordsToBuffer([0xEEFF, 0xCCDD, 0xAABB])),
    'AA:BB:CC:DD:EE:FF',
  );
  assert.equal(
    decodeIpv4U16(wordsToBuffer([192, 168, 0, 8])),
    '192.168.0.8',
  );
});


test('Modbus driver reads low-word-first values and writes exact CH-W-B commands', async () => {
  const Module = require('node:module');
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'modbus-serial') return class ModbusRTU {};
    if (request === 'serialport') return { SerialPort: class SerialPort {} };
    return originalLoad.call(this, request, parent, isMain);
  };

  let ModbusDriver;
  try {
    ({ ModbusDriver } = require('../lib/drivers/modbus'));
  } finally {
    Module._load = originalLoad;
  }

  const template = getTemplate(runtimeTemplates);
  const adapter = { log: { debug() {}, info() {}, warn() {}, error() {} } };
  const driver = new ModbusDriver(adapter, {
    id: 'weidmueller-test',
    protocol: 'modbusTcp',
    connection: { host: '127.0.0.1', port: 502, unitId: 1, addressOffset: 1 },
  }, template, {});

  // The template must override stale/user values with the documented constants.
  assert.equal(driver.unitId, 255);
  assert.equal(driver.manualAddressOffset, 0);

  const input = new Map([
    [100, 67], // ASCII C
    [102, 3600], [103, 0],
    [120, 12345], [121, 0],
  ]);
  const holding = new Map([[528, 76]]);
  const coils = new Map([[436, true]]);
  const readMap = (map, start, length) => ({
    data: Array.from({ length }, (_, index) => map.get(start + index) ?? 0),
  });

  driver.ensureConnected = async () => true;
  driver._mbReadInputRegisters = async (start, length, unitId) => {
    assert.equal(unitId, 255);
    return readMap(input, start, length);
  };
  driver._mbReadHoldingRegisters = async (start, length, unitId) => {
    assert.equal(unitId, 255);
    return readMap(holding, start, length);
  };
  driver._mbReadCoils = async (start, length, unitId) => {
    assert.equal(unitId, 255);
    return { data: Array.from({ length }, (_, index) => !!coils.get(start + index)) };
  };

  const selected = ['eVSE_STATE', 'cHARGING_TIME', 'aCTIVE_POWER', 'sET_CHARGING_CURRENT', 'cHARGING_RELEASED']
    .map(id => getDp(template, id));
  const values = await driver.readDatapoints(selected);
  assert.equal(values.eVSE_STATE, 67);
  assert.equal(values.cHARGING_TIME, 3600);
  assert.equal(values.aCTIVE_POWER, 12345);
  assert.equal(values.sET_CHARGING_CURRENT, 7.6000000000000005);
  assert.equal(values.cHARGING_RELEASED, true);

  const writes = [];
  driver._mbWriteRegister = async (address, value, unitId) => writes.push({ kind: 'register', address, value, unitId });
  driver._mbWriteCoil = async (address, value, unitId) => writes.push({ kind: 'coil', address, value, unitId });

  await driver.writeDatapoint(getDp(template, 'sET_CHARGING_CURRENT'), 7.6);
  await driver.writeDatapoint(getDp(template, 'sET_ENABLE'), true);

  assert.deepEqual(writes, [
    { kind: 'register', address: 528, value: 76, unitId: 255 },
    { kind: 'coil', address: 400, value: true, unitId: 255 },
  ]);
});

test('device runtime contains separate command and charger-side release alias paths', () => {
  const source = fs.readFileSync(path.join(root, 'lib/deviceRuntime.js'), 'utf8');
  assert.match(source, /evcs\.weidmueller\.chargewallboxbusiness/);
  assert.match(source, /const releaseCommandDp = getAnyById\('sET_ENABLE'\)/);
  assert.match(source, /const releasedDp = getAnyById\('cHARGING_RELEASED'\)/);
  assert.match(source, /writeDpId: releaseCommandDp\.id/);
  assert.match(source, /dpId: releasedDp\.id/);
});
