'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { getVartaProfile, registersForProfile } = require('../lib/vartaProtocol');
const { extendedRegistersForProfile, tokenResponse } = require('../lib/vartaExtendedProtocol');
const templates = require('../lib/templates.json').templates;
const originalLoad = Module._load;
Module._load = function(request, parent, main) {
  if (request === 'modbus-serial') return class {};
  if (request === 'serialport') return { SerialPort: class {} };
  return originalLoad.call(this, request, parent, main);
};
let VartaModbusDriver;
try { ({ VartaModbusDriver } = require('../lib/drivers/vartaModbus')); } finally { Module._load = originalLoad; }
let sequence = 0;
const illegalAddress = () => Object.assign(new Error('Illegal data address'), { modbusCode: 2 });
function fixture(key = 'pulseNeo', options = {}) {
  const base = templates.find(t => t.id === `ess.varta.${key}.modbusTcpV14`);
  const profile = getVartaProfile(base);
  const defs = [...registersForProfile(profile), ...extendedRegistersForProfile(profile)];
  const template = { ...base, datapoints: defs.map(def => ({ id: def.id })) };
  const map = new Map();
  for (const def of defs) for (let i = 0; i < def.length; i++) map.set(def.address + i, 0);
  for (let i = 0; i < 10; i++) map.set(1054 + i, i < 9 ? '123456789'.charCodeAt(i) : 0);
  for (const [a, v] of [[1051, 14], [1065, 2], [1066, 1234], [1068, 65], [1069, 12345], [1071, 960], [1076, 0x7ced], [1088, 235], [1090, 2500], [1091, 2500], [1300, 1]]) if (map.has(a)) map.set(a, v);
  const clock = options.clock || { now: 10000 };
  let timerEnd = clock.now + (options.timerSeconds || 0) * 1000;
  const setTimer = seconds => { timerEnd = clock.now + seconds * 1000; };
  const calls = [];
  const adapter = { namespace: 'nexowatt-devices.0', _licenseGuard: { assertAllowed() {} }, log: { debug() {}, info() {}, warn() {}, error() {} } };
  const device = { id: `varta-ext-${++sequence}`, protocol: 'modbusTcp', vartaAllowControlWrites: true, vartaLimitClass: 'residential', ...options.config,
    connection: { host: options.host || `varta-ext-${sequence}`, port: 502, unitId: 255, ...options.connection } };
  const driver = new VartaModbusDriver(adapter, device, template, {});
  driver.ensureConnected = async () => true;
  driver._now = () => clock.now;
  driver._delay = async ms => { clock.now += ms; if (options.onDelay) await options.onDelay(ms, { driver, clock, map, calls }); };
  let uid;
  driver.client = {
    setID(id) { uid = id; },
    async readHoldingRegisters(address, length) {
      calls.push({ fc: 3, address, length, at: clock.now, uid });
      if (options.readError) { const fail = options.readError(address, length, calls); if (fail) throw fail; }
      const data = [];
      for (let i = 0; i < length; i++) {
        const a = address + i;
        if (!map.has(a)) throw illegalAddress();
        data.push(a === 1073 ? Math.max(0, Math.ceil((timerEnd - clock.now) / 1000)) : map.get(a));
      }
      return { data };
    },
    async writeRegister(address, value) {
      calls.push({ fc: 6, address, value, at: clock.now, uid });
      if (options.writeError) throw options.writeError;
      if (address === 1076) {
        if (!options.rejectToken && value === tokenResponse(map.get(1076), options.legacyFirmware === true)) setTimer(120);
        // The protocol says a new challenge may replace the submitted answer.
        // Correct auth therefore cannot depend on a token readback echo.
        map.set(1076, 0x4955);
      } else if (!options.ignoreWrite) map.set(address, value);
      if (address === 1306 && !options.staleMirror) map.set(1303, value);
      if (options.onWrite) options.onWrite(address, value, { driver, clock, map, calls, setTimer });
      return { address, value };
    },
    close() {},
  };
  return { driver, device, template, map, clock, calls, setTimer };
}
const write = (x, id, value) => x.driver.writeDatapoint({ id, source: { write: { fc: 16, address: 1 } } }, value);
const read = (x, ...ids) => x.driver.readDatapoints(ids.map(id => ({ id })));

// Expectations are handwritten from the supplied workbook, not from the driver.
test('extended read defaults on; engineering units, encrypted raw counter and frequency opt-in are distinct', async () => {
  const x = fixture();
  x.map.set(1074, 65536 - 500); x.map.set(2074, 1);
  x.map.set(1075, 1234); x.map.set(2075, 65535);
  x.map.set(1077, 65536 - 25); x.map.set(2077, 1);
  x.map.set(1079, 0xffff); x.map.set(1080, 0xffff);
  x.map.set(1101, 181); x.map.set(2101, 65535);
  const out = await read(x, 'aCTIVE_POWER', 'dISCHARGE_LIMIT', 'cHARGE_LIMIT', 'aDDITIONAL_POWER', 'eNVIRONMENT_TEMPERATURE', 'eNCRYPTED_DISCHARGE_ENERGY', 'eXTERNAL_PV_ENERGY', 'fREQUENCY_POWER');
  assert.equal(out.aCTIVE_POWER, 1234);
  assert.equal(out.dISCHARGE_LIMIT, -5000);
  assert.equal(out.cHARGE_LIMIT, 123.4);
  assert.equal(out.aDDITIONAL_POWER, -250);
  assert.equal(out.eNVIRONMENT_TEMPERATURE, 23.5);
  assert.equal(out.eNCRYPTED_DISCHARGE_ENERGY, 4294967295);
  assert.equal(out.eXTERNAL_PV_ENERGY, 181);
  assert.equal(out.fREQUENCY_POWER, null);
  assert.equal(out['diagnostics.externalControlSupported'], true);
  assert.equal(x.calls.some(c => c.address >= 1300 && c.address <= 1306), false);
  assert.equal(x.calls.some(c => c.fc !== 3), false);
  for (let i = 1; i < x.calls.length; i++) assert.ok(x.calls[i].at - x.calls[i - 1].at >= 1000);
  await x.driver.disconnect();
});

test('optional extension exception cannot poison adjacent public energy, capacity or grid power', async () => {
  const x = fixture('pulse', { readError: (a, n) => a <= 1072 && a + n > 1072 ? illegalAddress() : null });
  const out = await read(x, 'aCTIVE_CHARGE_ENERGY', 'iNSTALLED_CAPACITY', 'eRROR_CODE', 'cONTROL_REMAINING_S', 'gRID_POWER');
  assert.equal(out.aCTIVE_CHARGE_ENERGY, 12345);
  assert.equal(out.iNSTALLED_CAPACITY, 9600);
  assert.equal(out.gRID_POWER, 0);
  assert.equal(out.eRROR_CODE, null);
  assert.equal(out.cONTROL_REMAINING_S, null);
  assert.equal(out['diagnostics.tableSupported'], true);
  assert.equal(x.calls.some(c => c.address <= 1071 && c.address + c.length > 1072), false);
  await x.driver.disconnect();
});

test('extension disable clears extension values and blocks writes without IO', async () => {
  const x = fixture('pulseNeo', { config: { vartaExtendedEnabled: false } });
  await assert.rejects(write(x, 'aDDITIONAL_POWER', 0), { code: 'E_VARTA_WRITE_LOCKED' });
  assert.equal(x.calls.length, 0);
  const out = await read(x, 'sOC', 'aDDITIONAL_POWER', 'fREQUENCY_POWER');
  assert.equal(out.sOC, 65); assert.equal(out.aDDITIONAL_POWER, null);
  assert.equal(out.fREQUENCY_POWER, null);
  assert.equal(out['diagnostics.externalControlSupported'], false);
  assert.ok(x.calls.every(c => [1051, 1068].includes(c.address)));
  await x.driver.disconnect();
});

test('measurement, token, wrong-model and missing opt-in writes cannot address arbitrary registers', async () => {
  const x = fixture('pulse');
  for (const id of ['aCTIVE_POWER', 'pEXTRA_TOKEN', 'fREQUENCY_POWER', 'sF_ADDITIONAL_POWER', 'invented']) await assert.rejects(write(x, id, 1), { code: 'E_VARTA_READ_ONLY' });
  assert.equal(x.calls.length, 0);
  x.device.vartaAllowControlWrites = false;
  await assert.rejects(write(x, 'aDDITIONAL_POWER', 1000), { code: 'E_VARTA_WRITE_LOCKED' });
  assert.equal(x.calls.length, 0);
  await x.driver.disconnect();
});

test('UG and OG use live SF, correct signed FC6 and active countdown confirmation', async () => {
  const x = fixture('pulseNeo', { timerSeconds: 120 });
  x.map.set(2074, 1); x.map.set(2075, 65535);
  await write(x, 'dISCHARGE_LIMIT', -4200);
  await write(x, 'cHARGE_LIMIT', 500.5);
  assert.deepEqual(x.calls.filter(c => c.fc === 6).map(c => [c.address, c.value]), [[1074, 65536 - 420], [1075, 5005]]);
  assert.ok(x.calls.some(c => c.address === 2074)); assert.ok(x.calls.some(c => c.address === 2075));
  assert.equal(x.calls.at(-1).address, 1073);
  assert.equal(x.calls.some(c => c.address === 1076 || c.fc === 16), false);
  x.map.set(2074, 65535);
  await write(x, 'dISCHARGE_LIMIT', -500.5);
  assert.equal(x.calls.filter(c => c.fc === 6).at(-1).value, 65536 - 5005);
  await x.driver.disconnect();
});

test('limit register echo without active countdown is not acknowledged as effective control', async () => {
  const x = fixture('link');
  await assert.rejects(write(x, 'dISCHARGE_LIMIT', -500), { code: 'E_VARTA_LIMIT_INACTIVE' });
  assert.equal(x.calls.filter(c => c.fc === 6).length, 1);
  assert.ok(x.calls.every(c => [1051, 1074, 1073].includes(c.address)));
  for (let i = 1; i < x.calls.length; i++) assert.ok(x.calls[i].at - x.calls[i - 1].at >= 5000);
  await x.driver.disconnect();
});

test('UG/OG deadbands require a confirmed limit class and reject reversed signs', async () => {
  const x = fixture('element', { timerSeconds: 120 });
  for (const [id, value] of [['dISCHARGE_LIMIT', 500], ['cHARGE_LIMIT', -500], ['dISCHARGE_LIMIT', -499], ['cHARGE_LIMIT', 499]]) await assert.rejects(write(x, id, value), { code: 'E_VARTA_WRITE_VALUE' });
  x.device.vartaLimitClass = '';
  await assert.rejects(write(x, 'cHARGE_LIMIT', 500), { code: 'E_VARTA_LIMIT_CLASS' });
  assert.equal(x.calls.length, 0);
  await write(x, 'cHARGE_LIMIT', 0);
  x.device.vartaLimitClass = 'commercial';
  await assert.rejects(write(x, 'cHARGE_LIMIT', 4999), { code: 'E_VARTA_WRITE_VALUE' });
  await write(x, 'cHARGE_LIMIT', 5000);
  await x.driver.disconnect();
});

test('Pextra authenticates every fresh command using documented CRC and timer, then verifies scaled target', async () => {
  const x = fixture('pulseNeo', { timerSeconds: 120 });
  x.map.set(2077, 65535);
  await write(x, 'aDDITIONAL_POWER', -150.5);
  const writes = x.calls.filter(c => c.fc === 6);
  assert.deepEqual(writes.map(c => [c.address, c.value]), [[1076, 0xfcd6], [1077, 65536 - 1505]]);
  assert.equal(x.calls.at(-1).address, 1077);
  assert.equal(x.calls.filter(c => c.fc === 3 && c.address === 1076).length, 1, 'token echo must not be used as authorization');
  await write(x, 'aDDITIONAL_POWER', 0);
  assert.deepEqual(x.calls.filter(c => c.fc === 6).slice(-2).map(c => [c.address, c.value]), [[1076, 0x8512], [1077, 0]]);
  await x.driver.disconnect();
});

test('Pextra wrong response cannot reuse an old running timer or write a target', async () => {
  for (const timerSeconds of [0, 100, 120]) {
    const x = fixture('pulse', { timerSeconds, rejectToken: true });
    await assert.rejects(write(x, 'aDDITIONAL_POWER', 1000), { code: 'E_VARTA_AUTH' });
    assert.deepEqual(x.calls.filter(c => c.fc === 6).map(c => c.address), [1076]);
    await x.driver.disconnect();
  }
});

test('Pextra legacy leading-zero formatting is explicit and never tried automatically', async () => {
  const x = fixture('pulse', { legacyFirmware: true }); x.map.set(1076, 0x099a);
  await assert.rejects(write(x, 'aDDITIONAL_POWER', 500), { code: 'E_VARTA_AUTH' });
  assert.deepEqual(x.calls.filter(c => c.fc === 6).map(c => [c.address, c.value]), [[1076, 0x9216]]);
  x.map.set(1076, 0x099a); x.device.vartaLegacyUnpaddedToken = true;
  await write(x, 'aDDITIONAL_POWER', 500);
  assert.equal(x.calls.filter(c => c.fc === 6).at(-2).value, tokenResponse(0x099a, true));
  await x.driver.disconnect();
});

test('missing timer or challenge fails Pextra before target write', async () => {
  for (const address of [1073, 1076]) {
    const x = fixture('pulse', { readError: a => a === address ? illegalAddress() : null });
    await assert.rejects(write(x, 'aDDITIONAL_POWER', 100));
    assert.equal(x.calls.some(c => c.fc === 6), false);
    await x.driver.disconnect();
  }
});

test('pulse PSP is percent with 0.1 percent precision; no absolute-power conversion or token write', async () => {
  const x = fixture('pulse');
  await write(x, 'pOWER_FRACTION', -42.1);
  assert.deepEqual(x.calls.filter(c => c.fc === 6).map(c => [c.address, c.value]), [[1089, 65536 - 421]]);
  assert.equal((await read(x, 'pOWER_FRACTION')).pOWER_FRACTION, -42.1);
  for (const n of [-100.1, 100.1, 0.01]) await assert.rejects(write(x, 'pOWER_FRACTION', n));
  await x.driver.disconnect();
  for (const key of ['pulseNeo', 'flexStorage']) {
    const y = fixture(key);
    await assert.rejects(write(y, 'pOWER_FRACTION', 50), { code: 'E_VARTA_READ_ONLY' });
    assert.equal(y.calls.length, 0); await y.driver.disconnect();
  }
});

test('external PV values are visualization inputs in W and Wh with live SF and 10 Wh base', async () => {
  const x = fixture(); x.map.set(2100, 1); x.map.set(2101, 65535);
  await write(x, 'eXTERNAL_PV_POWER', 4200);
  await write(x, 'eXTERNAL_PV_ENERGY', 1810);
  assert.deepEqual(x.calls.filter(c => c.fc === 6).map(c => [c.address, c.value]), [[1100, 420], [1101, 1810]]);
  assert.equal((await read(x, 'eXTERNAL_PV_ENERGY')).eXTERNAL_PV_ENERGY, 1810);
  await assert.rejects(write(x, 'eXTERNAL_PV_POWER', 4201));
  await assert.rejects(write(x, 'eXTERNAL_PV_POWER', -1));
  assert.equal(x.calls.filter(c => c.fc === 6).length, 2);
  await x.driver.disconnect();
  const y = fixture('element'); await write(y, 'eXTERNAL_PV_ENERGY', 1810);
  assert.equal(y.calls.find(c => c.fc === 6).value, 181);
  await assert.rejects(write(y, 'eXTERNAL_PV_ENERGY', 1811));
  await y.driver.disconnect();
});

test('frequency control requires activation opt-in, ready gate, live SF and explicit activation only', async () => {
  const x = fixture('flexStorage');
  await assert.rejects(write(x, 'fREQUENCY_POWER', -4200), { code: 'E_VARTA_FREQUENCY_LOCKED' });
  assert.equal(x.calls.length, 0);
  x.device.vartaFrequencyControlEnabled = true;
  x.map.set(1300, 0);
  await assert.rejects(write(x, 'fREQUENCY_POWER', -4200), { code: 'E_VARTA_NOT_READY' });
  await assert.rejects(write(x, 'fREQUENCY_ACTIVE', 1), { code: 'E_VARTA_NOT_READY' });
  assert.equal(x.calls.some(c => c.fc === 6), false);
  await write(x, 'fREQUENCY_ACTIVE', 0);
  x.map.set(1300, 1); x.map.set(2305, 1);
  await write(x, 'fREQUENCY_POWER', -4200);
  await write(x, 'fREQUENCY_ACTIVE', 1);
  assert.deepEqual(x.calls.filter(c => c.fc === 6).map(c => [c.address, c.value]), [[1304, 0], [1305, 65536 - 420], [1304, 1]]);
  await assert.rejects(write(x, 'fREQUENCY_ACTIVE', 2), { code: 'E_VARTA_WRITE_VALUE' });
  const priorWrites = x.calls.filter(c => c.fc === 6).length;
  await read(x, 'fREQUENCY_READY', 'fREQUENCY_POWER', 'fREQUENCY_ACTIVE');
  await x.driver.disconnect();
  assert.equal(x.calls.filter(c => c.fc === 6).length, priorWrites, 'poll/stop must never write enable, target or alive');
});

test('frequency alive uses signed16 echo and independent mirror confirmation without retries', async () => {
  for (const staleMirror of [false, true]) {
    const x = fixture('pulseNeo', { staleMirror, config: { vartaFrequencyControlEnabled: true } });
    const job = write(x, 'fREQUENCY_ALIVE', -32768);
    if (staleMirror) await assert.rejects(job, { code: 'E_VARTA_WRITE_VERIFY' }); else await job;
    assert.deepEqual(x.calls.filter(c => c.fc === 6).map(c => [c.address, c.value]), [[1306, 32768]]);
    assert.deepEqual(x.calls.slice(-2).map(c => c.address), [1306, 1303]);
    await x.driver.disconnect();
  }
});

test('extended SF writes have their separate opt-in and signed16 FC6; frequency SF remains gated', async () => {
  const x = fixture('pulseNeo', { config: { vartaAllowControlWrites: false } });
  await assert.rejects(write(x, 'sF_ADDITIONAL_POWER', -1), { code: 'E_VARTA_WRITE_LOCKED' });
  x.device.vartaAllowScaleFactorWrites = true;
  await write(x, 'sF_ADDITIONAL_POWER', -1);
  assert.deepEqual(x.calls.filter(c => c.fc === 6).map(c => [c.address, c.value]), [[2077, 65535]]);
  await assert.rejects(write(x, 'sF_FREQUENCY_POWER', 0), { code: 'E_VARTA_FREQUENCY_LOCKED' });
  await x.driver.disconnect();
});

test('unsupported identity, missing live SF and target rejection prevent physical commands', async () => {
  for (const failure of ['version', 'serial', 'scale', 'target']) {
    const x = fixture('pulseNeo', { readError: a => (failure === 'scale' && a === 2100) || (failure === 'target' && a === 1100) ? illegalAddress() : null });
    if (failure === 'version') x.map.set(1051, 15);
    if (failure === 'serial') x.map.set(1054, 'X'.charCodeAt(0));
    await assert.rejects(write(x, 'eXTERNAL_PV_POWER', 1000));
    assert.equal(x.calls.some(c => c.fc === 6), false);
    await x.driver.disconnect();
  }
});

test('invalid, unrepresentable and overflowing values do not wrap or trigger a write', async () => {
  const x = fixture('pulseNeo', { config: { vartaFrequencyControlEnabled: true } });
  for (const value of [null, undefined, true, false, '', ' ', {}, [], NaN, Infinity, '1;2']) await assert.rejects(write(x, 'eXTERNAL_PV_POWER', value), { code: 'E_VARTA_WRITE_VALUE' });
  assert.equal(x.calls.length, 0);
  for (const [id, value] of [['eXTERNAL_PV_POWER', 65536], ['fREQUENCY_POWER', -32769], ['fREQUENCY_ALIVE', 0.1], ['eXTERNAL_PV_POWER', '1000.00000000000001']]) await assert.rejects(write(x, id, value));
  x.map.set(2100, 32767); await assert.rejects(write(x, 'eXTERNAL_PV_POWER', 1));
  assert.equal(x.calls.some(c => c.fc === 6), false);
  await x.driver.disconnect();
});

test('extended physical write failure or readback mismatch is never retried or redirected', async () => {
  for (const options of [{ ignoreWrite: true }, { writeError: illegalAddress() }]) {
    const x = fixture('element', options);
    await assert.rejects(write(x, 'eXTERNAL_PV_POWER', 4200));
    assert.deepEqual(x.calls.filter(c => c.fc === 6).map(c => c.address), [1100]);
    assert.equal(x.calls.some(c => c.fc === 16 || c.address === 1099), false);
    await x.driver.disconnect();
  }
});

test('queued commands expire before any IO at the model-specific 30/60-second deadline', async () => {
  for (const [key, maxAge] of [['element', 30000], ['link', 60000]]) {
    const x = fixture(key);
    let release;
    x.driver._endpoint.tail = new Promise(resolve => { release = resolve; });
    const job = write(x, 'eXTERNAL_PV_POWER', 1000);
    x.clock.now += maxAge; release();
    await assert.rejects(job, { code: 'E_VARTA_COMMAND_EXPIRED' });
    assert.equal(x.calls.length, 0);
    await x.driver.disconnect();
  }
  const x = fixture('link');
  let release; x.driver._endpoint.tail = new Promise(resolve => { release = resolve; });
  const job = write(x, 'eXTERNAL_PV_POWER', 1000);
  x.clock.now += 30000; release();
  await job;
  assert.equal(x.calls.filter(c => c.fc === 6).length, 1, 'link must allow the slower documented request pacing');
  await x.driver.disconnect();
});

test('command expiry and permission revocation during pacing block the actual FC6', async () => {
  for (const mode of ['expire', 'revoke']) {
    const x = fixture('element', { onDelay: (_ms, ctx) => {
      if (ctx.calls.length === 2) {
        if (mode === 'expire') ctx.clock.now += 30000;
        else ctx.driver.device.vartaAllowControlWrites = false;
      }
    } });
    await assert.rejects(write(x, 'eXTERNAL_PV_POWER', 1000), { code: mode === 'expire' ? 'E_VARTA_COMMAND_EXPIRED' : 'E_VARTA_WRITE_LOCKED' });
    assert.equal(x.calls.some(c => c.fc === 6), false);
    await x.driver.disconnect();
  }
});

test('public scale-factor permission is also rechecked after pacing immediately before FC6', async () => {
  const x = fixture('pulseNeo', { config: { vartaAllowScaleFactorWrites: true }, onDelay: (_ms, ctx) => {
    if (ctx.calls.length === 2) ctx.driver.device.vartaAllowScaleFactorWrites = false;
  } });
  await assert.rejects(write(x, 'sF_ACTIVE_POWER', 1), { code: 'E_VARTA_WRITE_LOCKED' });
  assert.equal(x.calls.some(c => c.fc === 6), false);
  await x.driver.disconnect();
});

test('bounded command queue rejects overload, stop and reset discard commands without replay', async () => {
  const x = fixture('element');
  let release; x.driver._endpoint.tail = new Promise(resolve => { release = resolve; });
  const jobs = Array.from({ length: 9 }, (_, i) => write(x, 'eXTERNAL_PV_POWER', i));
  // Attach handlers immediately, including the ninth synchronous rejection.
  const settled = Promise.allSettled(jobs);
  await x.driver.resetTransport(); release();
  const results = await settled;
  assert.equal(results[8].reason.code, 'E_VARTA_WRITE_BUSY');
  assert.ok(results.slice(0, 8).every(r => r.reason.code === 'E_VARTA_RESET'));
  assert.equal(x.calls.length, 0);
  await x.driver.disconnect();
  await assert.rejects(write(x, 'eXTERNAL_PV_POWER', 0), { code: 'E_VARTA_STOPPED' });
});

test('stop during Pextra authentication never replays the target and clears no register automatically', async () => {
  const x = fixture('pulse', { onWrite: (address, _value, ctx) => { if (address === 1076) void ctx.driver.disconnect(); } });
  await assert.rejects(write(x, 'aDDITIONAL_POWER', 1000), { code: 'E_VARTA_STOPPED' });
  assert.deepEqual(x.calls.filter(c => c.fc === 6).map(c => c.address), [1076]);
});
