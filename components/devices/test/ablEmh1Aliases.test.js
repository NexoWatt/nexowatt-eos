'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const root = path.resolve(__dirname, '..');
const runtimeTemplates = JSON.parse(fs.readFileSync(path.join(root, 'lib/templates.json'), 'utf8'));
const adminTemplates = JSON.parse(fs.readFileSync(path.join(root, 'admin/templates.json'), 'utf8'));
const templateId = 'evcs.abl.emh1.evcc2_3.modbusAscii';

function getTemplate(doc) {
  const template = doc.templates.find(item => item && item.id === templateId);
  assert.ok(template, `missing template ${templateId}`);
  return template;
}

function getDp(template, id) {
  const dp = template.datapoints.find(item => item && item.id === id);
  assert.ok(dp, `missing datapoint ${id}`);
  return dp;
}

function loadDeviceRuntime() {
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'modbus-serial') return class ModbusRTU {};
    if (request === 'serialport') return { SerialPort: class SerialPort {} };
    if (request === 'mqtt') return { connect() { throw new Error('not used in ABL alias test'); } };
    if (request === 'axios') return {};
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const modulePath = require.resolve('../lib/deviceRuntime');
    delete require.cache[modulePath];
    return require('../lib/deviceRuntime').DeviceRuntime;
  } finally {
    Module._load = originalLoad;
  }
}

function createAliasDefinitions(adapterOverride) {
  const DeviceRuntime = loadDeviceRuntime();
  const template = getTemplate(runtimeTemplates);
  const adapter = adapterOverride || { log: { debug() {}, info() {}, warn() {}, error() {} } };
  const runtime = new DeviceRuntime(adapter, {
    id: 'evcs1',
    templateId,
    category: 'EVCS',
    manufacturer: 'ABL',
    connection: {},
  }, template, {});

  for (const dp of template.datapoints) {
    runtime.dpById.set(dp.id, dp);
    runtime.dpByStateRelId.set(runtime.relStateId(dp), dp);
  }

  const definitions = runtime._buildAliasDefinitions();
  const byPath = new Map();
  for (const def of definitions) {
    const prefix = 'devices.evcs1.aliases.';
    if (def && String(def.relId).startsWith(prefix)) {
      byPath.set(String(def.relId).slice(prefix.length), def);
    }
  }
  return { runtime, definitions, byPath };
}

function alias(byPath, pathName) {
  const def = byPath.get(pathName);
  assert.ok(def, `missing alias ${pathName}`);
  return def;
}

test('runtime and admin contain the same audited ABL eMH1 template', () => {
  const runtime = getTemplate(runtimeTemplates);
  const admin = getTemplate(adminTemplates);
  assert.deepEqual(admin, runtime);
  assert.equal(runtime.category, 'EVCS');
  assert.equal(runtime.manufacturer, 'ABL');
  assert.deepEqual(runtime.protocols, ['modbusAscii']);
  assert.equal(runtime.driverHints.modbus.unitIdDefault, 1);
  assert.equal(runtime.driverHints.modbus.asciiResponseStart, '>');
});

test('ABL full-current and Icmax registers use the exact EVCC2/3 API addresses and scaling', () => {
  const template = getTemplate(runtimeTemplates);
  const l1 = getDp(template, 'cURRENT_L1');
  const l2 = getDp(template, 'cURRENT_L2');
  const l3 = getDp(template, 'cURRENT_L3');
  const appliedPwm = getDp(template, 'iCMAX_DUTY_CYCLE_PCT');
  const setPwm = getDp(template, 'sET_ICMAX_DUTY_CYCLE_PCT');

  assert.deepEqual([l1.source.address, l2.source.address, l3.source.address], [48, 49, 50]);
  for (const dp of [l1, l2, l3]) {
    assert.equal(dp.source.fc, 3);
    assert.equal(dp.source.length, 1);
    assert.equal(dp.source.dataType, 'uint16');
    assert.equal(dp.source.scaleFactor, -1);
    assert.equal(dp.source.nanValue, 1000);
  }

  assert.equal(appliedPwm.source.address, 47);
  assert.equal(appliedPwm.source.bitMask, 4095);
  assert.equal(appliedPwm.source.scaleFactor, -1);
  assert.equal(setPwm.source.write.fc, 16);
  assert.equal(setPwm.source.write.address, 20);
  assert.equal(setPwm.source.write.length, 1);
  assert.equal(setPwm.source.write.scaleFactor, -1);
  assert.equal(setPwm.source.write.finite, true);
  assert.deepEqual(setPwm.source.write.allowedRanges, [[8, 100]]);
  assert.equal(setPwm.min, 8);
  assert.equal(setPwm.max, 100);
  assert.equal(setPwm.step, 0.1);

  const modifyState = getDp(template, 'mODIFY_STATE');
  assert.match(modifyState.name, /Expert\/service/);
});

test('ABL live-current aliases compare per-phase current instead of summing amperes', () => {
  const { byPath } = createAliasDefinitions();
  const balanced = {
    cURRENT_L1: 5.5,
    cURRENT_L2: 5.5,
    cURRENT_L3: 5.5,
    iCMAX_DUTY_CYCLE_PCT: 10,
  };

  assert.equal(alias(byPath, 'r.currentL1').dpId, 'cURRENT_L1');
  assert.equal(alias(byPath, 'r.currentL2').dpId, 'cURRENT_L2');
  assert.equal(alias(byPath, 'r.currentL3').dpId, 'cURRENT_L3');

  assert.equal(alias(byPath, 'r.currentA').get(balanced), 5.5);
  assert.equal(alias(byPath, 'r.currentTotalA').get(balanced), 5.5);
  assert.equal(alias(byPath, 'r.currentPhaseSumA').get(balanced), 16.5);
  assert.equal(alias(byPath, 'r.power').get(balanced), 3795);
  assert.equal(alias(byPath, 'r.powerEstimated').get(balanced), 3795);

  const singlePhase = { cURRENT_L1: 5.5, cURRENT_L2: 0, cURRENT_L3: 0 };
  assert.equal(alias(byPath, 'r.currentA').get(singlePhase), 5.5);
  assert.equal(alias(byPath, 'r.currentTotalA').get(singlePhase), 5.5);
  assert.equal(alias(byPath, 'r.currentPhaseSumA').get(singlePhase), 5.5);
  assert.equal(alias(byPath, 'r.power').get(singlePhase), 1265);

  const unbalanced = { cURRENT_L1: 5.4, cURRENT_L2: 5.8, cURRENT_L3: 5.5 };
  assert.equal(alias(byPath, 'r.currentA').get(unbalanced), 5.8);
  assert.equal(alias(byPath, 'r.currentTotalA').get(unbalanced), 5.8);
  assert.equal(alias(byPath, 'r.currentPhaseSumA').get(unbalanced), 16.7);

  const { runtime } = createAliasDefinitions();

  // EVCC2/3 marks phase current as unavailable in state A. Runtime-level fail-safe
  // handling must clear the operational aliases instead of keeping an old load value.
  const unavailable = {
    eVSE_STATE: 0xA1,
    cURRENT_L1: null,
    cURRENT_L2: null,
    cURRENT_L3: null,
  };
  assert.equal(runtime._shouldResetAblEmh1LiveMeasurements(unavailable, { connected: true }), true);

  // The EVSE state is authoritative. A waiting/non-charging state must clear stale
  // currents even if an older sample is still present in the snapshot.
  const waitingWithStaleCurrents = {
    eVSE_STATE: 0xA1,
    cURRENT_L1: 6.5,
    cURRENT_L2: 6.3,
    cURRENT_L3: 6.3,
  };
  assert.equal(runtime._shouldResetAblEmh1LiveMeasurements(waitingWithStaleCurrents, { connected: true }), true);

  // C2/C3/C4 with at least one finite phase current remains a valid live snapshot.
  assert.equal(runtime._shouldResetAblEmh1LiveMeasurements({
    eVSE_STATE: 0xC2,
    cURRENT_L1: 6.5,
    cURRENT_L2: 6.3,
    cURRENT_L3: 6.3,
  }, { connected: true }), false);

  // A missing atomic R5 group and a transport outage both fail safe to zero.
  assert.equal(runtime._shouldResetAblEmh1LiveMeasurements({ mODBUS_SETTINGS_RAW: 807 }, { connected: true }), true);
  assert.equal(runtime._shouldResetAblEmh1LiveMeasurements({}, { connected: false }), true);
});

test('ABL live measurement aliases are actively reset on null, missing and offline input', async () => {
  const writes = new Map();
  const adapter = {
    log: { debug() {}, info() {}, warn() {}, error() {} },
    async setStateAsync(id, state) {
      writes.set(String(id), state && state.val);
    },
  };
  const { runtime, definitions } = createAliasDefinitions(adapter);
  runtime.aliasDefs = definitions;

  await runtime._updateAliases({
    eVSE_STATE: 0xC2,
    cURRENT_L1: 6.5,
    cURRENT_L2: 6.3,
    cURRENT_L3: 6.3,
    iCMAX_DUTY_CYCLE_PCT: 26.6,
  }, { connected: true, lastError: '' });

  assert.equal(writes.get('devices.evcs1.aliases.r.currentA'), 6.5);
  assert.equal(writes.get('devices.evcs1.aliases.r.power'), 4393);
  assert.equal(writes.get('devices.evcs1.aliases.v1.r.power'), 4393);

  await runtime._updateAliases({
    eVSE_STATE: 0xA1,
    cURRENT_L1: null,
    cURRENT_L2: null,
    cURRENT_L3: null,
    iCMAX_DUTY_CYCLE_PCT: 26.6,
  }, { connected: true, lastError: '' });

  assert.equal(writes.get('devices.evcs1.aliases.r.currentL1'), 0);
  assert.equal(writes.get('devices.evcs1.aliases.r.currentA'), 0);
  assert.equal(writes.get('devices.evcs1.aliases.r.currentPhaseSumA'), 0);
  assert.equal(writes.get('devices.evcs1.aliases.r.power'), 0);
  assert.equal(writes.get('devices.evcs1.aliases.r.powerEstimated'), 0);
  assert.equal(writes.get('devices.evcs1.aliases.v1.r.power'), 0);

  // A failed live-current read group in an otherwise connected poll also clears the
  // aliases through the ABL live-snapshot fail-safe.
  await runtime._updateAliases({ mODBUS_SETTINGS_RAW: 807 }, { connected: true, lastError: '' });
  assert.equal(writes.get('devices.evcs1.aliases.r.currentL1'), 0);
  assert.equal(writes.get('devices.evcs1.aliases.r.power'), 0);

  // A transport failure passes an empty snapshot. The ABL live measurements reset
  // without changing the generic last-value behaviour of any other template.
  await runtime._updateAliases({}, { connected: false, lastError: 'timeout' });
  assert.equal(writes.get('devices.evcs1.aliases.r.currentA'), 0);
  assert.equal(writes.get('devices.evcs1.aliases.r.power'), 0);
  assert.equal(writes.get('devices.evcs1.aliases.v1.r.power'), 0);

  // The independent heartbeat timeout must clear the same values even when no poll
  // callback is available to provide a new snapshot.
  await runtime._updateAliases({
    eVSE_STATE: 0xC2,
    cURRENT_L1: 6.5,
    cURRENT_L2: 6.3,
    cURRENT_L3: 6.3,
  }, { connected: true, lastError: '' });
  runtime._hbOnline = true;
  await runtime._setHeartbeatOnline(false);
  assert.equal(writes.get('devices.evcs1.aliases.r.currentA'), 0);
  assert.equal(writes.get('devices.evcs1.aliases.r.power'), 0);
  assert.equal(writes.get('devices.evcs1.aliases.v1.r.power'), 0);
});

test('ABL current-limit command converts EOS amperes to exact vendor PWM values', () => {
  const { byPath } = createAliasDefinitions();
  const readback = alias(byPath, 'r.currentLimitA');
  const control = alias(byPath, 'ctrl.currentLimitA');

  assert.equal(readback.dpId, 'iCMAX_DUTY_CYCLE_PCT');
  assert.equal(control.writeDpId, 'sET_ICMAX_DUTY_CYCLE_PCT');
  assert.equal(control.preferCommandValue, true);

  // ABL/IEC 61851 normal-current range: D = I / 0.6. Truncation keeps
  // the advertised maximum at or below the requested EMS current.
  assert.equal(control.toDevice(0), 100);
  assert.equal(control.toDevice(5.9), 100);
  assert.equal(control.toDevice(6), 10);
  assert.equal(control.toDevice(10), 16.6);
  assert.equal(control.toDevice(16), 26.6);
  assert.equal(control.toDevice(32), 53.3);
  assert.equal(control.toDevice(51), 85);

  // High-current range and safe handling of the IEC discontinuity.
  assert.equal(control.toDevice(52), 85);
  assert.equal(control.toDevice(52.75), 85.1);
  assert.equal(control.toDevice(80), 96);
  assert.equal(control.toDevice(90), 96);

  assert.equal(readback.fromDevice(0), 0);
  assert.equal(readback.fromDevice(10), 6);
  assert.equal(readback.fromDevice(16.6), 10);
  assert.equal(readback.fromDevice(26.6), 16);
  assert.equal(readback.fromDevice(85), 51);
  assert.equal(readback.fromDevice(85.1), 52.8);
  assert.equal(readback.fromDevice(96), 80);
  assert.equal(readback.fromDevice(100), 0);
});

test('ABL pause/resume uses Icmax 100 percent and never the service-state register', () => {
  const { runtime, byPath } = createAliasDefinitions();
  const run = alias(byPath, 'ctrl.run');
  const chargeEnable = alias(byPath, 'ctrl.chargeEnable');
  const pctControl = alias(byPath, 'ctrl.currentLimitPct');
  const waiting = alias(byPath, 'r.waitingForCurrent');
  const released = alias(byPath, 'r.chargingReleased');

  for (const def of [run, chargeEnable]) {
    assert.equal(def.dpId, 'iCMAX_DUTY_CYCLE_PCT');
    assert.equal(def.writeDpId, 'sET_ICMAX_DUTY_CYCLE_PCT');
    assert.notEqual(def.writeDpId, 'mODIFY_STATE');
    assert.equal(def.toDevice(false), 100);
    assert.equal(def.fromDevice(100), false);
    assert.equal(def.fromDevice(10), true);
  }

  // With no earlier current command, resume safely at 6 A = 10 %.
  assert.equal(run.toDevice(true), 10);

  // After an active 16-A command, pause must not erase the resume value.
  runtime._rememberCommandedValue('sET_ICMAX_DUTY_CYCLE_PCT', 26.6);
  assert.equal(run.toDevice(true), 26.6);
  runtime._rememberCommandedValue('sET_ICMAX_DUTY_CYCLE_PCT', 100);
  assert.equal(run.toDevice(false), 100);
  assert.equal(run.toDevice(true), 26.6);
  assert.equal(chargeEnable.toDevice(true), 26.6);

  assert.equal(pctControl.toDevice(26.67), 26.6);
  assert.equal(pctControl.toDevice(8), 100);
  assert.equal(pctControl.toDevice(97), 100);
  assert.equal(pctControl.toDevice(100), 100);

  assert.equal(waiting.get({ iCMAX_DUTY_CYCLE_PCT: 100 }), true);
  assert.equal(waiting.get({ iCMAX_DUTY_CYCLE_PCT: 26.6 }), false);
  assert.equal(released.get({ iCMAX_DUTY_CYCLE_PCT: 100 }), false);
  assert.equal(released.get({ iCMAX_DUTY_CYCLE_PCT: 26.6 }), true);
});
