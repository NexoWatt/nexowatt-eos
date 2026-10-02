'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Module = require('node:module');

// These are protocol/runtime unit tests with a simulated RTU bus. Loading the
// real serial packages before installing the test doubles makes the entire
// file fail during startup in a fresh checkout (or with unavailable native
// Windows serial bindings), before any register assertions can run.
// Keep the production driver and real transport tests unchanged.
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'modbus-serial') return class ModbusRTU {};
  if (request === 'serialport') return { SerialPort: class SerialPort {} };
  return originalLoad.call(this, request, parent, isMain);
};
let DeyeModbusDriver;
try {
  ({ DeyeModbusDriver } = require('../lib/drivers/deyeModbus'));
} finally {
  Module._load = originalLoad;
}
const protocol = require('../lib/deyeProtocol');
const helper = require('./helpers/compatibilityHarness.cjs');
const DeviceRuntime = helper.loadDeviceRuntime(path.resolve(__dirname, '../lib/deviceRuntime.js'));
const templates = require('../lib/templates.json').templates.filter(t => t.manufacturer === 'DEYE');
const illegal = () => Object.assign(new Error('Illegal data address'), { modbusCode: 2 });

function make(key = 'threePhaseHv', options = {}) {
  const template = templates.find(t => t.id === `ess.deye.${key}.modbusRtu`);
  const p = protocol.getDeyeProfile(template);
  const map = new Map();
  for (const d of protocol.registersForProfile(p)) for (const a of d.addresses) map.set(a, 0);
  // Values below independently encode the published registers, not derived
  // expected answers from the decoder/template being tested.
  for (const [a, n] of [[0, p.single ? 0x300 : p.hv ? 0x600 : 0x500], [1, 1], [2, 0x0105], [3, 0x4148], [4, 0x3132], [5, 0x3334], [6, 0x3536], [7, 0x3738]]) map.set(a, n);
  for (const [a, n] of (p.single ? [[18, 0x0201], [59, 2], [182, 1234], [183, 5123], [184, 65], [186, 1200], [187, 1300], [190, 65536 - 1234], [191, 65536 - 2500], [169, 65536 - 400], [70, 18], [72, 0xffff], [73, 1], [193, 5001]] : [[22, 0x0203], [24, 1], [25, 0], [500, 2], [587, 5123], [588, 65], [590, 65536 - 1234], [591, 65536 - 2500], [625, 0x3cb0], [690, 0xffff], [636, 0xc350], [694, 0], [653, 0x1170], [659, 1], [672, 1200], [673, 1300], [514, 18], [516, 0xffff], [517, 1], [638, 5001]])) map.set(a, n);
  const adapter = { log: { warn() {}, debug() {}, info() {}, error() {} } };
  const device = { id: 'deye', protocol: 'modbusRtu', ...options.device, connection: { path: '/dev/test-deye', minCommandIntervalMs: 0, ...options.connection } };
  const driver = new DeyeModbusDriver(adapter, device, template, {});
  const calls = [];
  driver.ensureConnected = async () => true;
  const bus = {
    async readHoldingRegisters(uid, timeout, address, length) {
      calls.push({ fc: 3, uid, address, length });
      if (options.beforeRead) await options.beforeRead(address, length);
      if (options.readError) { const e = options.readError(address, length); if (e) throw e; }
      const data = Array.from({ length }, (_, i) => { assert.ok(map.has(address + i), `reserved/undocumented address read: ${address + i}`); return map.get(address + i); });
      return { data: options.shortResponse && address === 0 ? data.slice(1) : data };
    },
    async writeRegisters(uid, timeout, address, words) {
      calls.push({ fc: 16, uid, address, words: [...words] });
      if (options.writeError) throw options.writeError;
      if (!options.ignoreWrite) words.forEach((w, i) => map.set(address + i, w));
      return { address, length: words.length };
    },
  };
  driver.rtuBus = bus;
  return { driver, device, template, map, calls, bus };
}
const dp = (x, id) => x.template.datapoints.find(d => d.id === id);

test('DEYE offers exactly three preliminary RTU families, safe serial defaults and identical catalogues', () => {
  assert.equal(templates.length, 3);
  assert.deepEqual(require('../admin/templates.json').templates.filter(t => t.manufacturer === 'DEYE'), templates);
  const fields = require('../admin/jsonConfig.json').items.devicesTab.items.devices.items;
  assert.ok(fields.find(f => f.attr === 'manufacturer').options.some(o => o.value === 'DEYE'));
  for (const t of templates) {
    assert.deepEqual(t.protocols, ['modbusRtu']);
    assert.equal(t.driverHints.modbus.unitIdDefault, 1);
    assert.deepEqual(t.driverHints.modbus.serialDefaults, { baudRate: 9600, parity: 'none', dataBits: 8, stopBits: 1, enforce: false });
    assert.equal(t.driverHints.modbus.forceAddressOffset, 0);
    assert.equal(t.driverHints.modbus.restoreSetpointsOnStart.enabled, false);
    assert.equal(t.driverHints.modbus.setpointKeepalive.enabled, false);
    assert.ok(fields.find(f => f.attr === 'templateId').options.some(o => o.value === t.id));
  }
  for (const attr of ['deyeAllowConfigurationWrites', 'deyeReadRemoteRegisters']) assert.equal(fields.find(f => f.attr === attr).default, false);
});

for (const key of ['singlePhase', 'threePhaseLv', 'threePhaseHv']) test(`${key}: fixed addresses, signed values, LV/HV units, Wh counters and zero startup writes`, async () => {
  const x = make(key, { connection: { addressOffset: -1, byteOrder: 'le', wordOrder: 'be' } });
  const out = await x.driver.readDatapoints([]);
  assert.equal(out['identity.serial'], 'AH12345678');
  assert.equal(out['diagnostics.familyMatched'], true);
  assert.equal(out['diagnostics.externalControlSupported'], false);
  assert.equal(out['canonical.soc'], 65);
  assert.equal(out['battery1.voltage'], key === 'threePhaseHv' ? 512.3 : 51.23);
  assert.equal(out['battery1.current'], -25);
  assert.equal(out['battery.chargeToday'], 1800);
  assert.equal(out['battery.chargeTotal'], 13107100);
  assert.equal(out['battery.powerRaw'], -1234);
  assert.equal(out['canonical.batteryPower'], null);
  assert.equal(out['canonical.pvPower'], key === 'threePhaseHv' ? 25000 : 2500);
  assert.equal(out['inverter.frequency'], 50.01);
  assert.equal(out['grid.power'], key === 'singlePhase' ? -400 : -50000);
  if (key === 'singlePhase') { assert.equal(out['battery1.temperature'], 23.4); assert.equal(out['canonical.gridPower'], -400); }
  else { assert.equal(out['canonical.gridPower'], null); assert.equal(out['inverter.power'], 50000); assert.equal(out['load.power'], 70000); }
  assert.ok(x.calls.every(c => c.fc === 3 && c.uid === 1 && c.address < 1100));
  assert.equal(x.driver.manualAddressOffset, 0);
  await x.driver.disconnect();
});

test('32-bit boundary words, signed minimum and literal non-contiguous power registers', () => {
  const p = protocol.getDeyeProfile(templates.find(t => t.id.includes('threePhaseHv')));
  const defs = protocol.registersForProfile(p);
  const grid = defs.find(d => d.id === 'grid.power');
  assert.deepEqual(grid.addresses, [625, 690]);
  assert.deepEqual(defs.find(d => d.id === 'inverter.power').addresses, [636, 694]);
  assert.equal(protocol.decode([0, 0x8000], grid), -2147483648);
  assert.equal(protocol.decode([0xffff, 0x7fff], grid), 2147483647);
  assert.equal(protocol.decode([0xffff, 0xffff], grid), -1);
  assert.equal(protocol.decode([0xffff, 0xffff], defs.find(d => d.id === 'battery.chargeTotal')), 429496729500);
});

test('family mismatch retires values and refuses configuration before any FC16', async () => {
  const x = make('threePhaseHv', { device: { deyeAllowConfigurationWrites: true } });
  x.map.set(0, 0x0500);
  const out = await x.driver.readDatapoints();
  assert.equal(out['diagnostics.familyMatched'], false);
  assert.equal(out['battery1.soc'], null);
  await assert.rejects(x.driver.writeDatapoint(dp(x, 'settings.maxChargeCurrent'), 30), { code: 'E_DEYE_IDENTITY' });
  assert.ok(x.calls.every(c => c.fc === 3));
});

test('split-phase and PCS identifiers are not claimed as three-phase hybrid support', async () => {
  for (const [type, phases, topology] of [[0x0800, 3, 0], [0x0900, 3, 0], [0x0601, 2, 1], [0x0601, 3, 1]]) {
    const x = make(); x.map.set(0, type); x.map.set(22, 0x0200 + phases); x.map.set(25, topology);
    assert.equal((await x.driver.readDatapoints())['diagnostics.familyMatched'], false);
  }
  const x = make(); x.map.set(0, 0x0601);
  assert.equal((await x.driver.readDatapoints())['diagnostics.familyMatched'], true);
});

test('confirmed units/signs enable single-input EOS power but never invent multiple-battery totals', async () => {
  const x = make('threePhaseHv', { device: { deyeBatteryPowerScale: '10', deyeBatteryPowerSign: 'positiveCharge', deyeGridPowerSign: 'positiveExport' } });
  let out = await x.driver.readDatapoints();
  assert.equal(out['canonical.batteryPower'], 12340);
  assert.equal(out['canonical.gridPower'], 50000);
  for (const inputs of [2, 3, 4]) {
    x.map.set(24, inputs); out = await x.driver.readDatapoints();
    assert.equal(out['canonical.soc'], null);
    assert.equal(out['canonical.batteryPower'], null);
    assert.equal(out['battery1.soc'], 65);
  }
});

test('PV aggregate is unavailable for more than four MPPT inputs, not a partial total', async () => {
  const x = make(); x.map.set(22, 0x0803);
  assert.equal((await x.driver.readDatapoints())['canonical.pvPower'], null);
});

test('missing high word becomes unknown without truncation, old cache or address fallback', async () => {
  let missing = false;
  const x = make('threePhaseHv', { readError: a => missing && a === 687 ? illegal() : null });
  assert.equal((await x.driver.readDatapoints())['grid.power'], -50000);
  missing = true;
  assert.equal((await x.driver.readDatapoints())['grid.power'], null);
  assert.ok(x.calls.every(c => c.address !== 624 && c.address !== 691));
});

test('optional battery-2 exception cannot poison mandatory battery-1 SOC', async () => {
  const x = make('threePhaseHv', { readError: (a, len) => a <= 589 && a + len > 589 ? illegal() : null });
  const out = await x.driver.readDatapoints();
  assert.equal(out['canonical.soc'], 65);
  assert.equal(out['battery2.soc'], null);
});

test('core register errors, short frames and transport faults fail instead of pretending valid data', async () => {
  await assert.rejects(make('threePhaseHv', { shortResponse: true }).driver.readDatapoints(), { code: 'E_DEYE_RESPONSE' });
  await assert.rejects(make('threePhaseHv', { readError: a => a === 588 ? illegal() : null }).driver.readDatapoints(), /Illegal/);
  await assert.rejects(make('threePhaseHv', { readError: a => a === 687 ? Object.assign(new Error('RTU timed out'), { code: 'ETIMEDOUT' }) : null }).driver.readDatapoints(), /timed out/);
});

test('four exact configuration register addresses per family; FC16 and readback only', async () => {
  for (const [key, addresses] of [['singlePhase', [210, 211, 230, 245]], ['threePhaseLv', [108, 109, 128, 143]], ['threePhaseHv', [108, 109, 128, 143]]]) {
    const x = make(key, { device: { deyeAllowConfigurationWrites: true } });
    const writable = x.template.datapoints.filter(d => d.rw === 'rw');
    assert.deepEqual(writable.map(d => d.source.write.address), addresses);
    for (let i = 0; i < writable.length; i++) {
      const value = i === 3 ? 4200 : 30;
      assert.deepEqual(await x.driver.writeDatapoint(writable[i], value), { effectiveValue: value });
    }
    const writes = x.calls.filter(c => c.fc === 16);
    assert.deepEqual(writes.map(c => c.address), addresses);
    assert.deepEqual(writes.map(c => c.words), [[30], [30], [30], [key === 'threePhaseHv' ? 420 : 4200]]);
    for (const c of writes) { const next = x.calls[x.calls.indexOf(c) + 1]; assert.equal(next.fc, 3); assert.equal(next.address, c.address); }
  }
});

test('writes default locked; forged addresses, remote writes and invalid numeric values cannot escape allowlist', async () => {
  const x = make();
  await assert.rejects(x.driver.writeDatapoint(dp(x, 'settings.maxChargeCurrent'), 30), { code: 'E_DEYE_WRITE_LOCKED' });
  x.device.deyeAllowConfigurationWrites = true;
  for (const id of ['remote.mode', 'remote.batteryPowerPercent', 'ctrl.power', 'identity.deviceType']) await assert.rejects(x.driver.writeDatapoint({ id, source: { write: { address: 1109 } } }, 100), { code: 'E_DEYE_WRITE_UNSUPPORTED' });
  for (const value of [NaN, Infinity, null, '', true, -1, 186, 2.5, '1e2']) await assert.rejects(x.driver.writeDatapoint(dp(x, 'settings.maxChargeCurrent'), value), { code: 'E_DEYE_WRITE_VALUE' });
  await assert.rejects(x.driver.writeDatapoint(dp(x, 'settings.maxExportPower'), 4201), { code: 'E_DEYE_WRITE_VALUE' });
  assert.equal(x.calls.length, 0);
  await x.driver.writeDatapoint({ id: 'settings.maxChargeCurrent', source: { write: { address: 1100 } } }, 30);
  assert.deepEqual(x.calls.filter(c => c.fc === 16).map(c => c.address), [108]);
});

test('device-rejected or ignored writes are never acknowledged or retried', async () => {
  for (const options of [{ ignoreWrite: true }, { writeError: illegal() }, { writeError: Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }) }]) {
    const x = make('threePhaseHv', { ...options, device: { deyeAllowConfigurationWrites: true } });
    await assert.rejects(x.driver.writeDatapoint(dp(x, 'settings.maxChargeCurrent'), 30));
    assert.equal(x.calls.filter(c => c.fc === 16).length, 1);
  }
});

test('invalid identity/serial/address prevents all writes', async () => {
  for (const [a, value] of [[1, 2], [3, 0], [22, 0x0201]]) {
    const x = make('threePhaseHv', { device: { deyeAllowConfigurationWrites: true } }); x.map.set(a, value);
    await assert.rejects(x.driver.writeDatapoint(dp(x, 'settings.maxChargeCurrent'), 30), { code: 'E_DEYE_IDENTITY' });
    assert.ok(x.calls.every(c => c.fc === 3));
  }
});

test('remote reads are opt-in, remain read-only and use signed 0.1 percent', async () => {
  const x = make('threePhaseHv', { device: { deyeReadRemoteRegisters: true } }); x.map.set(1109, 65536 - 425);
  assert.equal((await x.driver.readDatapoints())['remote.batteryPowerPercent'], -42.5);
  assert.ok(x.calls.every(c => c.fc === 3));
  x.device.deyeReadRemoteRegisters = false;
  assert.equal((await x.driver.readDatapoints())['remote.batteryPowerPercent'], null);
});

test('reset cancels queued and active transactions before any configuration write; next poll reconnects', async () => {
  let unblock;
  let entered;
  const waiting = new Promise(resolve => { entered = resolve; });
  const gate = new Promise(resolve => { unblock = resolve; });
  let first = true;
  const x = make('threePhaseHv', { device: { deyeAllowConfigurationWrites: true }, beforeRead: async () => { if (first) { first = false; entered(); await gate; } } });
  const poll = x.driver.readDatapoints();
  const write = x.driver.writeDatapoint(dp(x, 'settings.maxChargeCurrent'), 30);
  const settled = Promise.allSettled([poll, write]);
  await waiting; await x.driver.resetTransport(); unblock();
  assert.ok((await settled).every(r => r.status === 'rejected' && r.reason.code === 'E_DEYE_CANCELLED'));
  assert.ok(x.calls.every(c => c.fc === 3));
  x.driver.rtuBus = x.bus;
  assert.equal((await x.driver.readDatapoints())['canonical.soc'], 65);
  await x.driver.disconnect();
  await assert.rejects(x.driver.readDatapoints(), { code: 'E_DEYE_CANCELLED' });
});

test('revoking opt-in while queued blocks configuration without a write', async () => {
  const x = make('threePhaseHv', { device: { deyeAllowConfigurationWrites: true } });
  const pending = x.driver.writeDatapoint(dp(x, 'settings.maxChargeCurrent'), 30);
  x.device.deyeAllowConfigurationWrites = false;
  await assert.rejects(pending, { code: 'E_DEYE_WRITE_LOCKED' });
  assert.equal(x.calls.length, 0);
});

test('runtime dispatches DEYE dedicated driver, keeps measured aliases read-only and full precision', () => {
  for (const t of templates) {
    const runtime = helper.buildRuntime(DeviceRuntime, t);
    runtime.cfg.protocol = 'modbusRtu';
    assert.equal(runtime._createDriver().constructor.name, 'DeyeModbusDriver');
    const defs = runtime._buildAliasDefinitions();
    assert.equal(runtime.aliasContractInfo.missingRequired.length, 0);
    assert.ok(defs.some(d => d.dpId === 'canonical.batteryPower' && d.rw === 'ro'));
    assert.ok(!defs.some(d => /\.ctrl\./.test(d.relId)), 'no invented control aliases for configuration limits');
    assert.equal(runtime._getRoundingDecimals({ unit: 'V' }), null);
  }
});

test('RTU defaults apply at runtime; an explicitly configured unit address and serial settings survive', () => {
  const x = make();
  assert.deepEqual(x.driver._getSerialConnOpts(), { path: '/dev/test-deye', baudRate: 9600, parity: 'none', dataBits: 8, stopBits: 1, responseStart: ':' });
  assert.equal(x.driver.unitId, 1); assert.equal(x.driver.timeoutMs, 2000);
  const y = make('singlePhase', { connection: { unitId: 17, baudRate: 19200, parity: 'even' } });
  assert.equal(y.driver.unitId, 17); assert.equal(y.driver._getSerialConnOpts().baudRate, 19200); assert.equal(y.driver._getSerialConnOpts().parity, 'even');
  for (const unitId of [0, 248, 1.5, 'abc']) assert.throws(() => make('singlePhase', { connection: { unitId } }), { code: 'E_DEYE_UNIT_ID' });
});

test('Admin auto-fills RTU defaults on selection and preserves saved serial configuration', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../admin/index_m.js'), 'utf8');
  const start = source.indexOf('function getTemplateModbusSerialDefaults');
  const end = source.indexOf('function applyTemplateModbusTcpDefaultsToForm', start);
  const values = {};
  const ctx = { $: key => ({ val(v) { values[key] = v; } }), refreshSelect() {} };
  vm.runInNewContext(source.slice(start, end), ctx);
  ctx.applyTemplateModbusSerialDefaultsToForm(templates[0], 'modbusRtu', {});
  assert.deepEqual(values, { '#mb_baud': 9600, '#mb_parity': 'none', '#mb_databits': 8, '#mb_stopbits': 1, '#mb_unitId_rtu': 1, '#mb_timeout_rtu': 2000, '#mb_addrOffset_rtu': 0, '#mb_wordOrder_rtu': 'le', '#mb_byteOrder_rtu': 'be' });
  for (const key of Object.keys(values)) delete values[key];
  ctx.applyTemplateModbusSerialDefaultsToForm(templates[0], 'modbusRtu', { unitId: 17, baudRate: 19200, parity: 'even', dataBits: 8, stopBits: 1, timeoutMs: 5000, wordOrder: 'le', byteOrder: 'be' });
  assert.deepEqual(values, { '#mb_addrOffset_rtu': 0 });
  assert.ok(source.includes('applyTemplateModbusSerialDefaultsToForm(tpl, proto, currentConn)'));
  assert.ok(source.includes('const currentConn = (editIndex >= 0) ? getCurrentConnectionFormValues(proto) : {};'));
});
