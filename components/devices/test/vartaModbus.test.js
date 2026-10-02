'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Module = require('node:module');
const root = path.resolve(__dirname, '..');
const protocol = require('../lib/vartaProtocol');
const doc = JSON.parse(fs.readFileSync(path.join(root, 'lib/templates.json'), 'utf8'));
const templates = doc.templates.filter(t => t.manufacturer === 'VARTA');
const originalLoad = Module._load;
Module._load = function(request, parent, main) {
  if (request === 'modbus-serial') return class {};
  if (request === 'serialport') return { SerialPort: class {} };
  return originalLoad.call(this, request, parent, main);
};
let VartaModbusDriver;
try { ({ VartaModbusDriver } = require('../lib/drivers/vartaModbus')); } finally { Module._load = originalLoad; }
const helper = require('./helpers/compatibilityHarness.cjs');
const DeviceRuntime = helper.loadDeviceRuntime(path.join(root, 'lib/deviceRuntime.js'));
const templateFor = key => templates.find(t => t.id === `ess.varta.${key}.modbusTcpV14`);
const dpFor = (t, id) => t.datapoints.find(dp => dp.id === id);
let sequence = 0;

function putString(map, address, length, value) {
  for (let i = 0; i < length; i++) map.set(address + i, i < value.length ? value.charCodeAt(i) : 0);
}
function makeMap(template) {
  const map = new Map();
  for (const def of protocol.registersForProfile(protocol.getVartaProfile(template))) {
    for (let i = 0; i < def.length; i++) map.set(def.address + i, 0);
    if (def.dataType === 'string16') putString(map, def.address, def.length, def.address === 1054 ? '123456789' : def.address === 975 ? 'VARTA element backup' : '2.2.2.12');
  }
  for (const [addr, value] of [
    [1051, 14], [1052, 0x2345], [1053, 0x9234], [1064, 3], [1065, 2],
    [1066, 1200], [1067, 1300], [1068, 75], [1069, 0x5678], [1070, 0xf234],
    [1071, 960], [1078, 65536 - 400], [1082, 5001], [1083, 2500], [1084, 3500],
    [1085, 5000], [1086, 6000], [1087, 65536 - 200], [1102, 4321],
  ]) if (map.has(addr)) map.set(addr, value);
  return map;
}
function makeDriver(key = 'pulseNeo', options = {}) {
  const template = templateFor(key);
  const map = options.map || makeMap(template);
  const clock = options.clock || { now: 10000 };
  const calls = [];
  const warnings = [];
  const adapter = { namespace: 'nexowatt-devices.0', log: { debug() {}, info() {}, warn(msg) { warnings.push(msg); }, error() {} } };
  // Preserve the original public-table regression independently of the new
  // extended-profile tests, including its exact wire register matrix.
  const config = { id: `varta${++sequence}`, templateId: template.id, protocol: 'modbusTcp', vartaExtendedEnabled: false, ...options.config,
    connection: { host: options.host || `mock-${sequence}`, port: 502, unitId: 255, ...options.connection } };
  const driver = new VartaModbusDriver(adapter, config, template, options.global || {});
  driver.ensureConnected = async () => true;
  driver._now = () => clock.now;
  driver._delay = async ms => { clock.now += ms; };
  let uid = null;
  driver.client = {
    setID(id) { uid = id; },
    async readHoldingRegisters(address, length) {
      calls.push({ fc: 3, address, length, uid, at: clock.now });
      if (options.readError) { const failure = options.readError(address, length, calls); if (failure) throw failure; }
      const data = [];
      for (let i = 0; i < length; i++) {
        assert.ok(map.has(address + i), `${key}: unsupported/reserved register ${address + i} read`);
        data.push(map.get(address + i));
      }
      return { data: options.shortResponse && address !== 1051 ? data.slice(1) : data };
    },
    async writeRegister(address, value) {
      calls.push({ fc: 6, address, value, uid, at: clock.now });
      if (options.writeError) throw options.writeError;
      if (!options.ignoreWrite) map.set(address, value);
      return { address, value };
    },
    close() {},
  };
  return { driver, map, calls, clock, warnings, adapter, template, config };
}
const illegalAddress = () => Object.assign(new Error('Modbus exception 2: Illegal data address'), { modbusCode: 2 });

// This independently transcribed matrix is intentionally not generated from the
// runtime registry: a wrong product checkmark must fail the test, not agree with itself.
const BASE = [1051, 1052, 1054, 1065, 1066, 1067, 1068, 1069, 1071, 1078];
const SOFTWARE = [1000, 1017, 1034];
const EXTRA = [1082, 1083, 1084, 1085, 1086];
const SF = [2066, 2067, 2069, 2071, 2078, 2083, 2084, 2085, 2086];
const expectedMatrix = {
  element: [...BASE, ...SOFTWARE, 1064], oneL: [...BASE, ...SOFTWARE, 1064], oneXL: [...BASE, ...SOFTWARE, 1064],
  elementBackup: [...BASE, ...SOFTWARE, 975, 1064, ...EXTRA, 1087, 1102],
  pulse: [...BASE, ...SOFTWARE, 1064, ...EXTRA, 1087, 1102],
  pulseNeo: [...BASE, ...SOFTWARE, 1064, ...EXTRA, 1087, 1102, ...SF],
  link: [...BASE, 1064], flexStorage: [...BASE, 1000, ...EXTRA, ...SF],
};

test('VARTA catalogue contains eight independent model selections in runtime and both Admin UIs', () => {
  assert.equal(templates.length, 8);
  assert.deepEqual(templates.map(t => t.model), ['element', 'one L', 'one XL', 'element backup', 'pulse', 'pulse neo', 'link', 'flex storage']);
  const admin = JSON.parse(fs.readFileSync(path.join(root, 'admin/templates.json'), 'utf8'));
  assert.deepEqual(admin.templates.filter(t => t.manufacturer === 'VARTA'), templates);
  const fields = JSON.parse(fs.readFileSync(path.join(root, 'admin/jsonConfig.json'), 'utf8')).items.devicesTab.items.devices.items;
  assert.ok(fields.find(f => f.attr === 'manufacturer').options.some(o => o.value === 'VARTA'));
  for (const t of templates) {
    assert.equal(t.category, 'ESS');
    assert.deepEqual(t.protocols, ['modbusTcp']);
    assert.ok(fields.find(f => f.attr === 'templateId').options.some(o => o.value === t.id));
  }
  assert.ok(fields.some(f => f.attr === 'vartaAllowScaleFactorWrites' && f.default === false));
  assert.equal(fields.find(f => f.attr === 'connection.unitId' && f.hidden === "data.protocol !== 'modbusTcp'").max, 255);
});

for (const [key, expected] of Object.entries(expectedMatrix)) {
  test(`${key}: exact product matrix, full simulated read, rate limit and zero automatic writes`, async () => {
    const { driver, calls, template } = makeDriver(key, { connection: { addressOffset: -1, wordOrder: 'le', byteOrder: 'le', minCommandIntervalMs: 0 } });
    const selected = template.datapoints.filter(dp => dp.source.kind === 'modbus' && !dp.source.vartaExtended);
    assert.deepEqual(selected.map(dp => dp.source.read.address).sort((a,b)=>a-b), [...expected].sort((a,b)=>a-b));
    const result = await driver.readDatapoints(template.datapoints);
    assert.equal(result.aCTIVE_POWER, 1200);
    assert.equal(result.gRID_POWER, -400);
    assert.equal(result.sOC, 75);
    assert.equal(result.iNSTALLED_CAPACITY, 9600);
    assert.equal(result.aCTIVE_CHARGE_ENERGY, 0xf2345678);
    assert.equal(result.tIMESTAMP, 0x92342345);
    assert.equal(result.sERIAL_NUMBER, '123456789');
    assert.equal(result['diagnostics.tableSupported'], true);
    assert.equal(result['diagnostics.scalingValid'], true);
    assert.equal(result['diagnostics.externalControlSupported'], false);
    assert.equal(calls.some(c => c.fc !== 3), false);
    assert.ok(calls.every(c => c.uid === 255));
    for (let i = 1; i < calls.length; i++) assert.ok(calls[i].at - calls[i-1].at >= (key === 'link' ? 5000 : 1000));
    assert.equal(driver.manualAddressOffset, 0);
    assert.equal(driver.autoAddressOffset, 0);
    if (key === 'flexStorage') assert.equal(Object.hasOwn(result, 'bATTERY_MODULES_INSTALLED'), false);
    if (key === 'link') assert.equal(Object.hasOwn(result, 'sOFTWARE_VERSION_EMS'), false);
    if (key === 'elementBackup') assert.equal(result.mANUFACTURER_TYPE, 'VARTA element backup');
    await driver.disconnect();
  });
}

test('string16, signed 16-bit, unsigned low-word-first and maximum energy do not use global endian settings', () => {
  const def = (length, dataType) => ({ id: 'x', length, dataType });
  assert.equal(protocol.decodeWords([0x0056, 0x0041, 0x0052, 0x0054, 0x0041, 0, 0], def(7, 'string16')), 'VARTA');
  assert.equal(protocol.decodeWords([0xffff], def(1, 'int16')), -1);
  assert.equal(protocol.decodeWords([0x8000], def(1, 'int16')), -32768); // no undocumented SMA sentinel rule
  assert.equal(protocol.decodeWords([0xffff, 0xffff], def(2, 'uint32')), 4294967295);
  assert.throws(() => protocol.decodeWords([1], def(2, 'uint32')), /invalid response/);
  assert.throws(() => protocol.decodeWords([65536], def(1, 'uint16')), /invalid response/);
});

test('all nine live SF mappings, base 10 Wh capacity and 0.01 Hz frequency are applied independently', async () => {
  const x = makeDriver();
  const changes = [[2066,1],[2067,-1],[2069,1],[2071,-1],[2078,1],[2083,1],[2084,-1],[2085,1],[2086,-1]];
  for (const [a,n] of changes) x.map.set(a, n & 65535);
  const out = await x.driver.readDatapoints(x.template.datapoints);
  assert.equal(out.aCTIVE_POWER, 12000);
  assert.equal(out.aPPARENT_POWER, 130);
  assert.equal(out.aCTIVE_CHARGE_ENERGY, 0xf2345678 * 10);
  assert.equal(out.iNSTALLED_CAPACITY, 960);
  assert.equal(out.gRID_POWER, -4000);
  assert.equal(out.gRID_FREQUENCY, 50.01);
  assert.equal(out.aLLOWED_CHARGE_POWER, 25000);
  assert.equal(out.aLLOWED_DISCHARGE_POWER, 350);
  assert.equal(out.uSABLE_CHARGE_ENERGY, 50000);
  assert.equal(out.uSABLE_DISCHARGE_ENERGY, 600);
  assert.equal(out.rEACTIVE_POWER, -200);
  assert.equal(out.pV_POWER, 4321);
  await x.driver.disconnect();
});

test('each SF dependency is read even when only its measurement datapoint is requested', async () => {
  const x = makeDriver('flexStorage');
  x.map.set(2071, 1);
  const out = await x.driver.readDatapoints([dpFor(x.template, 'iNSTALLED_CAPACITY')]);
  assert.equal(out.iNSTALLED_CAPACITY, 96000);
  assert.ok(x.calls.some(c => c.address === 2071));
  await x.driver.disconnect();
});

test('missing SF does not fall back to zero or reuse a preceding successful value', async () => {
  let broken = false;
  const x = makeDriver('pulseNeo', { readError: a => broken && a === 2066 ? illegalAddress() : null });
  let out = await x.driver.readDatapoints([dpFor(x.template, 'aCTIVE_POWER')]);
  assert.equal(out.aCTIVE_POWER, 1200);
  broken = true;
  out = await x.driver.readDatapoints([dpFor(x.template, 'aCTIVE_POWER')]);
  assert.equal(out.aCTIVE_POWER, null);
  assert.equal(out['diagnostics.scalingValid'], false);
  broken = false; x.map.set(2066, 1);
  out = await x.driver.readDatapoints([dpFor(x.template, 'aCTIVE_POWER')]);
  assert.equal(out.aCTIVE_POWER, 12000);
  await x.driver.disconnect();
});

test('overflow, underflow and missing SF are null, never Infinity, NaN or fabricated zero', async () => {
  for (const sf of [32767, -32768, null, undefined, NaN]) assert.equal(protocol.scaleValue(1234, sf), null);
  assert.equal(protocol.scaleValue(0, -32768), null);
  const x = makeDriver(); x.map.set(2066, 0x8000);
  const out = await x.driver.readDatapoints([dpFor(x.template, 'aCTIVE_POWER')]);
  assert.equal(out.aCTIVE_POWER, null);
  assert.equal(out['diagnostics.scalingValid'], false);
  await x.driver.disconnect();
});

test('unknown table version blocks interpretation and retires previously known measurements', async () => {
  const x = makeDriver(); x.map.set(1051, 13);
  const out = await x.driver.readDatapoints([dpFor(x.template, 'sOC')]);
  assert.equal(out.tABLE_VERSION, 13);
  assert.equal(out.aCTIVE_POWER, null);
  assert.equal(out.iNSTALLED_CAPACITY, null);
  assert.equal(out['diagnostics.tableSupported'], false);
  assert.equal(out['diagnostics.scalingValid'], false);
  assert.equal(x.calls.length, 1);
  assert.match(out['diagnostics.note'], /expected 14/);
  await x.driver.disconnect();
});

test('invalid SOC is null rather than clamped, scaled as a fraction or advertised as valid percent', async () => {
  const x = makeDriver('element'); x.map.set(1068, 65535);
  const out = await x.driver.readDatapoints([dpFor(x.template, 'sOC')]);
  assert.equal(out.sOC, null);
  await x.driver.disconnect();
});

test('optional PV exception produces null; core errors, transport errors and short responses fail the poll', async () => {
  const x = makeDriver('pulse', { readError: a => a === 1102 ? illegalAddress() : null });
  const out = await x.driver.readDatapoints(x.template.datapoints);
  assert.equal(out.pV_POWER, null); assert.equal(out.aCTIVE_POWER, 1200);
  await x.driver.disconnect();
  for (const options of [
    { readError: a => a === 1066 ? illegalAddress() : null },
    { readError: a => a === 1066 ? Object.assign(new Error('socket closed'), {code:'ECONNRESET'}) : null },
    { shortResponse: true },
  ]) {
    const y = makeDriver('element', options);
    await assert.rejects(y.driver.readDatapoints([dpFor(y.template, 'aCTIVE_POWER')]));
    await y.driver.disconnect();
  }
});

test('all eight profiles have real monitoring aliases, correct signs and no fictitious power control or discharge counter', async () => {
  for (const template of templates) {
    const runtime = helper.buildRuntime(DeviceRuntime, template);
    const aliases = runtime._buildAliasDefinitions();
    const read = (p, raw) => {
      const a = aliases.find(a => helper.extractLegacyPath(a.relId) === p); assert.ok(a, `${template.model}: ${p}`);
      return a.fromDevice ? a.fromDevice(raw) : raw;
    };
    assert.equal(read('r.power', 1200), -1200);
    assert.equal(read('v1.r.power', -500), 500);
    assert.equal(read('v1.r.powerCharge', 1200), 1200);
    assert.equal(read('v1.r.powerDischarge', -500), 500);
    assert.equal(read('v1.r.powerCharge', -500), 0);
    assert.equal(read('r.gridPower', -400), 400);
    assert.equal(read('r.gridPower', 400), -400);
    assert.equal(read('v1.r.power', null), null);
    assert.equal(read('v1.r.powerCharge', null), null);
    assert.equal(read('v1.alarm.fault', null), null);
    for (let code = 0; code <= 7; code++) {
      assert.equal(read('r.statusText', code), protocol.STATUS_NAMES[code]);
      assert.equal(read('v1.alarm.fault', code), code === 5);
    }
    assert.ok(aliases.every(a => a.rw === 'ro'));
    assert.equal(aliases.some(a => helper.extractLegacyPath(a.relId).includes('ctrl.')), false);
    assert.equal(aliases.some(a => helper.extractLegacyPath(a.relId).endsWith('r.energyDischarge')), false);
    assert.equal(aliases.some(a => helper.extractLegacyPath(a.relId).endsWith('r.voltage')), false);
    assert.deepEqual(runtime.aliasContractInfo.missingRequired, []);
    assert.equal(runtime.aliasDeviceClass, 'storageSystem');
    assert.equal(read('v1.r.gridPower', -400), 400);
    assert.ok(!runtime.aliasContractInfo.capabilities.some(c => c.startsWith('write.')));
    runtime.cfg.protocol = 'modbusTcp';
    const actualDriver = runtime._createDriver();
    assert.ok(actualDriver instanceof VartaModbusDriver);
    await actualDriver.disconnect();
  }
});

test('six read-only profiles cannot write; SF opt-in defaults to locked and measurement registers always remain read-only', async () => {
  for (const key of Object.keys(expectedMatrix)) {
    const x = makeDriver(key, { config: { vartaAllowScaleFactorWrites: true } });
    await assert.rejects(x.driver.writeDatapoint(dpFor(x.template, 'aCTIVE_POWER'), 1000), {code:'E_VARTA_READ_ONLY'});
    if (!['pulseNeo','flexStorage'].includes(key)) await assert.rejects(x.driver.writeDatapoint({id:'sF_ACTIVE_POWER'}, 0), {code:'E_VARTA_READ_ONLY'});
    assert.equal(x.calls.length, 0);
    await x.driver.disconnect();
  }
  const x = makeDriver();
  await assert.rejects(x.driver.writeDatapoint(dpFor(x.template, 'sF_ACTIVE_POWER'), 0), {code:'E_VARTA_WRITE_LOCKED'});
  assert.equal(x.calls.length, 0);
  await x.driver.disconnect();
});

test('each of the nine SFs uses an identity read, target probe, one exact FC6 write and matching readback', async () => {
  for (const key of ['pulseNeo','flexStorage']) {
    const x = makeDriver(key, { config: { vartaAllowScaleFactorWrites: true }, connection: { addressOffset: 1, forceAddressOffset: 1, wordOrder: 'le', byteOrder: 'le' } });
    for (const address of SF) {
      x.calls.length = 0;
      const dp = x.template.datapoints.find(dp => dp.source?.write?.address === address);
      // Deliberately corrupted caller-supplied address/FC must never redirect IO.
      await x.driver.writeDatapoint({ ...dp, source: {write:{fc:16,address:address-1}} }, -2);
      assert.deepEqual(x.calls.map(c => [c.fc,c.address]), [[3,1051],[3,address],[6,address],[3,address]]);
      assert.equal(x.calls[2].value, 65534);
      assert.ok(x.calls.every(c => c.uid === 255));
      for (let i=1;i<x.calls.length;i++) assert.ok(x.calls[i].at-x.calls[i-1].at >= 1000);
    }
    await x.driver.disconnect();
  }
});

test('invalid SF inputs cannot cause any request or wrap around', async () => {
  const x = makeDriver('pulseNeo', { config: {vartaAllowScaleFactorWrites:true} });
  for (const value of [null,undefined,true,false,'',' ','abc',1.1,NaN,Infinity,-32769,32768,{},[]]) {
    await assert.rejects(x.driver.writeDatapoint(dpFor(x.template,'sF_ACTIVE_POWER'),value), {code:'E_VARTA_WRITE_VALUE'});
  }
  assert.equal(x.calls.length,0);
  for (const value of [-32768,32767,'-1',0]) await x.driver.writeDatapoint(dpFor(x.template,'sF_ACTIVE_POWER'),value);
  await x.driver.disconnect();
});

test('wrong version, implausible serial or inaccessible target cannot lead to a write', async () => {
  for (const reason of ['version','serial','target']) {
    const x = makeDriver('pulseNeo', {config:{vartaAllowScaleFactorWrites:true}, readError:a=>reason==='target'&&a===2066?illegalAddress():null});
    if (reason==='version') x.map.set(1051,15);
    if (reason==='serial') putString(x.map,1054,10,'garbage');
    await assert.rejects(x.driver.writeDatapoint(dpFor(x.template,'sF_ACTIVE_POWER'),1));
    assert.equal(x.calls.some(c=>c.fc===6),false);
    await x.driver.disconnect();
  }
});

test('write rejection and readback mismatch are reported without retry, FC16 or address fallback', async () => {
  for (const options of [{ignoreWrite:true},{writeError:illegalAddress()},{writeError:Object.assign(new Error('socket closed'),{code:'ECONNRESET'})}]) {
    const x = makeDriver('pulseNeo', {...options, config:{vartaAllowScaleFactorWrites:true}});
    await assert.rejects(x.driver.writeDatapoint(dpFor(x.template,'sF_ACTIVE_POWER'),1));
    assert.equal(x.calls.filter(c=>c.fc===6).length,1);
    assert.equal(x.calls.some(c=>c.fc===16),false);
    assert.ok(x.calls.every(c=>[1051,2066].includes(c.address)));
    await x.driver.disconnect();
  }
});

test('successful SF write is used by the very next snapshot, never by a stale cache', async () => {
  const x = makeDriver('pulseNeo',{config:{vartaAllowScaleFactorWrites:true}});
  assert.equal((await x.driver.readDatapoints([dpFor(x.template,'aCTIVE_POWER')])).aCTIVE_POWER,1200);
  await x.driver.writeDatapoint(dpFor(x.template,'sF_ACTIVE_POWER'),1);
  assert.equal((await x.driver.readDatapoints([dpFor(x.template,'aCTIVE_POWER')])).aCTIVE_POWER,12000);
  await x.driver.disconnect();
});

test('same host and different Unit-IDs share pacing and non-interleaving write transactions', async () => {
  const clock={now:10000};
  const a=makeDriver('pulseNeo',{host:'same-varta',clock,config:{vartaAllowScaleFactorWrites:true},connection:{unitId:1}});
  const b=makeDriver('flexStorage',{host:'same-varta',clock,config:{vartaAllowScaleFactorWrites:true},connection:{unitId:255}});
  await Promise.all([a.driver.writeDatapoint(dpFor(a.template,'sF_ACTIVE_POWER'),1),b.driver.writeDatapoint(dpFor(b.template,'sF_GRID_POWER'),2)]);
  const calls=[...a.calls,...b.calls].sort((a,b)=>a.at-b.at);
  assert.deepEqual(calls.map(c=>c.uid),[1,1,1,1,255,255,255,255]);
  for(let i=1;i<calls.length;i++) assert.ok(calls[i].at-calls[i-1].at>=1000);
  await a.driver.disconnect();await b.driver.disconnect();
});

test('overlapping reads are coalesced and the SF write queue is bounded', async () => {
  const x=makeDriver('pulseNeo',{config:{vartaAllowScaleFactorWrites:true}});
  const dp=dpFor(x.template,'sOC');
  await Promise.all([x.driver.readDatapoints([dp]),x.driver.readDatapoints([dp])]);
  assert.equal(x.calls.filter(c=>c.address===1051).length,1);
  const jobs=Array.from({length:9},(_,i)=>x.driver.writeDatapoint(dpFor(x.template,'sF_ACTIVE_POWER'),i));
  const results=await Promise.allSettled(jobs);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,8);
  assert.equal(results[8].reason.code,'E_VARTA_WRITE_BUSY');
  await x.driver.disconnect();
});

test('disconnect cancels pending operations and does not reconnect or replay queued SF changes', async () => {
  const x=makeDriver('pulseNeo',{config:{vartaAllowScaleFactorWrites:true}});
  const pending=x.driver.writeDatapoint(dpFor(x.template,'sF_ACTIVE_POWER'),1);
  await x.driver.disconnect();
  await assert.rejects(pending,{code:'E_VARTA_STOPPED'});
  assert.equal(x.calls.length,0);
  await assert.rejects(x.driver.readDatapoints(x.template.datapoints),{code:'E_VARTA_STOPPED'});
});

test('custom Admin expert opt-in resets on model switch and is unavailable on read-only models', () => {
  const source=fs.readFileSync(path.join(root,'admin/index_m.js'),'utf8');
  const functionSource=source.slice(source.indexOf('function renderVartaOptions('),source.indexOf('function renderDatapoints('));
  const elements=new Map();
  const $=selector=>{
    if(!elements.has(selector)) elements.set(selector,{values:{},data(k,v){if(arguments.length===1)return this.values[k];this.values[k]=v;return this;},prop(k,v){this.values[k]=v;return this;},val(v){if(!arguments.length)return this.values.value;this.values.value=v;return this;},toggle(v){this.visible=v;return this;},text(v){this.textValue=v;return this;}});
    return elements.get(selector);
  };
  const context=vm.createContext({$});vm.runInContext(functionSource,context);
  context.renderVartaOptions(templateFor('pulseNeo'));
  $('#varta_allow_sf_writes').prop('checked',true);
  context.renderVartaOptions(templateFor('flexStorage'));
  assert.equal($('#varta_allow_sf_writes').values.checked,false);
  context.renderVartaOptions(templateFor('link'));
  assert.equal($('#varta_allow_sf_writes').values.disabled,true);
  assert.match($('#varta_pacing_note').textValue,/5 Sekunden/);
  context.renderVartaOptions(null);
  assert.equal($('#varta_settings').visible,false);
});

test('unit ID recommendation is 255, 1..255 stays configurable, invalid IDs are rejected', async () => {
  const x=makeDriver('element',{connection:{unitId:undefined}});assert.equal(x.driver.unitId,255);await x.driver.disconnect();
  for(const id of [1,247,255]) { const x=makeDriver('element',{connection:{unitId:id}});assert.equal(x.driver.unitId,id);await x.driver.disconnect(); }
  for(const id of [-1,0,256,1.5,'abc']) assert.throws(()=>makeDriver('element',{connection:{unitId:id}}),{code:'E_VARTA_UNIT_ID'});
});

test('runtime transport-error recovery retains VARTA driver and reconnects on the next poll', async () => {
  const x=makeDriver('pulseNeo');
  const runtime=helper.buildRuntime(DeviceRuntime,x.template);
  runtime.driver=x.driver; runtime._connOk=true;
  runtime._setStateCached=async()=>{};
  runtime._updateAliases=async()=>{};
  const client=x.driver.client;
  await runtime._setError(Object.assign(new Error('connection reset by peer'),{code:'ECONNRESET'}));
  assert.equal(x.driver._stopped,false,'transient disconnect must not stop all future polls');
  assert.equal(x.driver.client,null);
  let reconnects=0;
  x.driver.ensureConnected=async()=>{reconnects++;x.driver.client=client;x.driver.connected=true;};
  const out=await x.driver.readDatapoints([dpFor(x.template,'sOC')]);
  assert.equal(reconnects,1);assert.equal(out.sOC,75);
  assert.equal(x.calls.some(c=>c.fc===6),false);
  await x.driver.disconnect();
});

test('transport reset rejects old queued SF writes without replay, but permits a fresh poll', async () => {
  const x=makeDriver('pulseNeo',{config:{vartaAllowScaleFactorWrites:true}});
  const client=x.driver.client;
  const old=x.driver.writeDatapoint(dpFor(x.template,'sF_ACTIVE_POWER'),1);
  await x.driver.resetTransport();
  await assert.rejects(old,{code:'E_VARTA_RESET'});
  assert.equal(x.calls.length,0);
  x.driver.client=client;
  const out=await x.driver.readDatapoints([dpFor(x.template,'aCTIVE_POWER')]);
  assert.equal(out.aCTIVE_POWER,1200);
  await x.driver.disconnect();
});

test('capacity and its scale factor refresh together in the fast poll after an expert write', async () => {
  const x=makeDriver('pulseNeo',{config:{vartaAllowScaleFactorWrites:true}});
  const fast=x.template.datapoints.filter(dp=>x.template.driverHints.polling.fastDpIds.includes(dp.id));
  assert.equal((await x.driver.readDatapoints(fast)).iNSTALLED_CAPACITY,9600);
  await x.driver.writeDatapoint(dpFor(x.template,'sF_CAPACITY'),1);
  assert.equal((await x.driver.readDatapoints(fast)).iNSTALLED_CAPACITY,96000);
  await x.driver.disconnect();
});

test('actual pacing timer separates physical client calls by at least one second', async () => {
  const x=makeDriver('element');
  x.driver._now=VartaModbusDriver.prototype._now;
  x.driver._delay=VartaModbusDriver.prototype._delay;
  const starts=[];
  const original=x.driver.client.readHoldingRegisters;
  x.driver.client.readHoldingRegisters=async(...args)=>{starts.push(x.driver._now());return original(...args);};
  await x.driver.readDatapoints([dpFor(x.template,'sOC')]);
  assert.equal(starts.length,2);
  assert.ok(starts[1]-starts[0]>=999.5,`request gap was ${starts[1]-starts[0]} ms`);
  await x.driver.disconnect();
});

test('runtime publishes SF precision without generic W rounding or guessed Hz correction', async () => {
  const x=makeDriver('pulseNeo');
  x.map.set(1066,15123); x.map.set(2066,65535); // 1512.3 W, SF -1
  x.map.set(1082,50000); // Exactly 500.00 Hz in the documented unit; do not guess 50 Hz
  const runtime=helper.buildRuntime(DeviceRuntime,x.template,'vartaPrecision');
  runtime.cfg.protocol='modbusTcp';
  const states=new Map();
  runtime._createDriver=()=>x.driver;
  runtime._setStateCached=async(id,val,ack)=>{states.set(id,{val,ack});};
  runtime._loadHeartbeatStateFromDb=async()=>{};
  runtime._startHeartbeatChecker=()=>{};
  runtime._tickHeartbeatFromIncomingData=async()=>{};
  runtime.aliasDefs=runtime._buildAliasDefinitions();
  try {
    await runtime.start();
    assert.equal(states.get('devices.vartaPrecision.aCTIVE_POWER').val,1512.3);
    assert.equal(states.get('devices.vartaPrecision.aliases.v1.r.power').val,-1512.3);
    assert.equal(states.get('devices.vartaPrecision.gRID_FREQUENCY').val,500);
    assert.equal(states.get('devices.vartaPrecision.aliases.r.gridFrequency').val,500);
  } finally { await runtime.stop(); }
});
