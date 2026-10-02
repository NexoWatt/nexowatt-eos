#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const root = path.resolve(__dirname, '..');
const { validateEvcsElectricalConfig, resolveDcElectricalLimits } = require('../lib/evcs-electrical-limits');
const { EmsEngine } = require('../ems/engine');
const { ChargingManagementModule } = require('../ems/modules/charging-management');
const { DatapointRegistry } = require('../ems/datapoints');

// Reuse the existing isolated ioBroker fixtures; the productive module, TS
// allocation, write plan and executor themselves remain the real shipped code.
function fixture(file, before, exports) {
  const filename = path.join(__dirname, file);
  const source = fs.readFileSync(filename, 'utf8');
  assert.ok(source.includes(before));
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod._compile(source.slice(0, source.indexOf(before)) + `\nmodule.exports = { ${exports} };`, filename);
  return mod.exports;
}
const { makeHarness } = fixture('verify-rc60-universal-auto-wallbox.js', 'async function withHarness', 'makeHarness');
const safetyFixture = fixture('verify-rc61-evcs-hardening.js', '(async () => {', 'makeAdapter, makeDp, wallbox');

function configured(overrides = {}) {
  const row = {
    index: 1, name: 'DC 20 kW', chargerType: 'dc', phases: 3, voltageV: 230,
    controlPreference: 'auto', minPowerW: 4200, maxPowerW: 20000,
    powerId: 'test.wallbox.powerW', statusId: 'test.wallbox.status',
    vehicleConnectedId: 'test.wallbox.vehicleConnected', onlineId: 'test.wallbox.online',
    heartbeatId: 'test.wallbox.lastSeenMs', setPowerWId: 'test.wallbox.setPowerW',
    setCurrentAId: '', ...overrides,
  };
  const engine = new EmsEngine({ namespace: 'nexowatt-ui.0', evcsList: [row], config: {
    settingsConfig: { evcsMaxPowerKw: 20 }, datapoints: {}, chargingManagement: {},
  } });
  return engine._buildChargingConfig().chargingCfg.wallboxes[0];
}

async function tick(overrides, options = {}) {
  const wb = configured(overrides);
  const h = makeHarness({ wallbox: { ...wb, setCurrentAId: wb.setCurrentAId || '', setPowerWId: wb.setPowerWId || '',
    minA: wb.minA || 0, maxA: wb.maxA || 0, minPowerW: wb.minPowerW || 0, maxPowerW: wb.maxPowerW || 0 },
    userMode: 'minpv', totalBudgetW: 20000, pvW: 0, actualPowerW: 5000, status: 'Charging', ...options });
  h.module._publishChargingAllocationTsShadow = ChargingManagementModule.prototype._publishChargingAllocationTsShadow.bind(h.module);
  try {
    const out = await h.tick();
    assert.equal(h.module._chargingAllocationTsProductiveLast.productive, true, 'Real TS plan must execute');
    return { ...out, valid: h.localStates.get('chargingManagement.wallboxes.lp1.electricalLimitsValid'),
      error: h.localStates.get('chargingManagement.wallboxes.lp1.electricalLimitsError') };
  } finally { h.stop(); }
}

async function run() {
  assert.equal(configured().minPowerW, 4200, 'Minimum must survive the configuration bridge');
  for (const row of [
    { chargerType: 'dc', setPowerWId: 'p', maxPowerW: 20000 },
    { chargerType: 'dc', setPowerWId: 'p', minPowerW: 4200 },
    { chargerType: 'dc', setPowerWId: 'p', minPowerW: 5000, maxPowerW: 4200 },
    { chargerType: 'ac', setCurrentAId: 'a', minCurrentA: 6 },
    { chargerType: 'dc', setCurrentAId: 'a', minCurrentA: 6, maxCurrentA: 60 },
  ]) assert.equal(validateEvcsElectricalConfig(row).valid, false, JSON.stringify(row));
  assert.equal(validateEvcsElectricalConfig({ chargerType: 'ac', setCurrentAId: 'a', minCurrentA: 6, maxCurrentA: 16 }).valid, true);
  assert.equal(validateEvcsElectricalConfig({ chargerType: 'ac', setPowerWId: 'p', minPowerW: 4200, maxPowerW: 11000 }).valid, true);

  assert.equal((await tick({})).targetPowerW, 4200, 'DC Min+PV must hold the configured grid base without PV');
  assert.equal((await tick({ minPowerW: 0 })).targetPowerW, 0, 'Missing DC minimum must stop');
  assert.equal((await tick({ maxPowerW: 0 }, { userMode: 'boost' })).targetPowerW, 0, 'Missing maximum must never become 1 MW');
  assert.equal((await tick({ minPowerW: 21000 })).targetPowerW, 0, 'Contradictory limits must stop');
  assert.equal((await tick({}, { totalBudgetW: 4100 })).targetPowerW, 0, 'A hard budget below the minimum must stop');
  assert.equal((await tick({}, { userMode: 'boost' })).targetPowerW, 20000, 'Boost respects the per-point maximum');
  assert.equal((await tick({ stepW: 1000 })).targetPowerW, 5000, 'Round minimum up to a supported device step');
  assert.equal((await tick({ stepW: 1000, maxPowerW: 4500 })).targetPowerW, 0, 'No valid device step -> zero');
  assert.equal((await tick({ setCurrentAId: 'test.wallbox.setCurrentA' })).writes.find(x => /setW$/.test(x.key)).value, 4200, 'DC auto prefers power with both targets');
  const ac = await tick({ chargerType: 'ac', minPowerW: 0, maxPowerW: 11040, minCurrentA: 6, maxCurrentA: 16,
    setCurrentAId: 'test.wallbox.setCurrentA', setPowerWId: '' });
  assert.equal(ac.targetCurrentA, 6, 'AC Min+PV remains at 6 A');
  assert.equal(ac.targetPowerW, 4140);

  const dcCurrent = { chargerType: 'dc', setCurrentAId: 'test.wallbox.setCurrentA', setPowerWId: '',
    minPowerW: 0, maxPowerW: 20000, minCurrentA: 6, maxCurrentA: 60,
    dcCurrentReference: 'dc-output', dcVoltageId: 'test.dc.voltage' };
  assert.equal((await tick(dcCurrent, { userMode: 'boost', totalBudgetW: 4200, objectValues: { 'test.dc.voltage': 400 } })).targetCurrentA, 10.5);
  assert.equal((await tick(dcCurrent, { userMode: 'boost', totalBudgetW: 4200, objectValues: { 'test.dc.voltage': 700 } })).targetCurrentA, 6);
  assert.equal((await tick(dcCurrent, { userMode: 'boost', totalBudgetW: 4200 })).targetPowerW, 0, 'No voltage -> no DC current');
  assert.equal(resolveDcElectricalLimits(dcCurrent, { voltageV: 400, fresh: false }).valid, false, 'Stale voltage must block');
  const acInput = await tick({ ...dcCurrent, dcCurrentReference: 'ac-input', dcVoltageId: '' }, { userMode: 'boost', totalBudgetW: 6900 });
  assert.equal(acInput.targetCurrentA, 10, 'Three-phase input current uses all configured network phases');

  // Reproduce the field symptom: a running DC point must reduce from Boost to Min+PV.
  {
    const h = makeHarness({ wallbox: { ...configured(), setCurrentAId: '' },
      userMode: 'boost', totalBudgetW: 20000, actualPowerW: 20000, pvW: 0, status: 'Charging' });
    h.module._publishChargingAllocationTsShadow = ChargingManagementModule.prototype._publishChargingAllocationTsShadow.bind(h.module);
    try {
      assert.equal((await h.tick()).targetPowerW, 20000);
      h.setLocal('chargingManagement.wallboxes.lp1.userMode', 'minpv');
      assert.equal((await h.tick()).targetPowerW, 4200, 'Min+PV must reduce immediately to its grid base');
    } finally { h.stop(); }
  }

  // A voltage that expires after planning must be checked again by the final writer.
  {
    const w = configured(dcCurrent);
    const h = makeHarness({ wallbox: { ...w, setPowerWId: '', minPowerW: 0 }, userMode: 'boost',
      totalBudgetW: 4200, actualPowerW: 4200, status: 'Charging', objectValues: { 'test.dc.voltage': 400 } });
    h.module._publishChargingAllocationTsShadow = ChargingManagementModule.prototype._publishChargingAllocationTsShadow.bind(h.module);
    const execute = h.module._executeChargingSetpointEntries.bind(h.module);
    h.module._executeChargingSetpointEntries = async (...args) => {
      h.setObject('test.dc.voltage', 400, Date.now() - 11000);
      return execute(...args);
    };
    try { assert.equal((await h.tick()).targetCurrentA, 0, 'Expired voltage at write boundary -> zero current'); }
    finally { h.stop(); }
  }

  // The final physical phase guard must see the DC station's AC grid connection.
  for (const [currentA, actualW, expectedW] of [[22, 0, 6900], [42, 20000, 13100]]) {
    const adapter = safetyFixture.makeAdapter();
    const dp = safetyFixture.makeDp(true);
    const writes = [];
    adapter._emsCaps = { grid: { gridSafetyMarginW: 0, gridImportLimitW_physical: 30000,
      gridImportLimitW_effective: 30000, gridMaxPhaseA_cfg: 32 } };
    for (const key of ['ps.l1A', 'ps.l2A', 'ps.l3A']) dp.entries.set(key, { key, objectId: key });
    dp.getRaw = (key, fallback) => key.startsWith('ps.l') ? currentA : fallback;
    dp.writeNumber = async (key, value) => { writes.push({ key, value }); return true; };
    const mod = new ChargingManagementModule(adapter, dp);
    const wb = { ...safetyFixture.wallbox(actualW), chargerType: 'DC', phases: 1,
      configuredPhaseCount: 3, gridPhaseCount: 3, maxPW: 20000, minPW: 4200, userMode: 'boost' };
    try {
      await mod._executeChargingSetpointEntries([{ safe: 'lp1', targetPowerW: 20000, targetCurrentA: 0,
        basis: 'powerW', setpointKey: 'wb.setW', writeRequired: true }], [wb], [], 'regression', '');
      assert.equal(writes[0].value, expectedW, 'Final phase guard must use three network phases');
    } finally { mod.stop(); }
  }

  // Verify the actual outgoing value at the ioBroker boundary, including aliases.
  for (const [alias, targetUnit, expected] of [[false, 'W', 4200], [false, 'kW', 4.2], [true, 'kW', 4200]]) {
    const writes = [];
    const adapter = { namespace: 'nexowatt-ui.0', config: {}, log: { warn() {}, debug() {} },
      getForeignObjectAsync: async id => ({ common: id === 'target' ? { unit: targetUnit }
        : { unit: 'W', alias: { id: 'target', write: 'val / 1000', read: 'val * 1000' } } }),
      getForeignStateAsync: async () => null, subscribeForeignStatesAsync: async () => {},
      setForeignStateAsync: async (id, value) => { writes.push({ id, value }); },
    };
    const dp = new DatapointRegistry(adapter, []);
    await dp.upsert({ key: 'setW', objectId: alias ? 'alias.0.dc.power' : 'target', direction: 'out', unit: 'W' });
    await dp.writeNumber('setW', 4200, false);
    assert.equal(writes[0].value, expected, 'Alias conversion must occur exactly once');
  }
  console.log('[stable-1.0.6-dc-control] OK: explicit limits, configuration bridge, AC/DC Min+PV, current domains, voltage freshness, final phase guard and alias writes.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
