#!/usr/bin/env node
'use strict';
/**
 * NexoWatt Regression 1.0.19 (DE)
 * Aufgabe: Prüft Netzanteil statt Gesamtleistung, PV-Einmalverteilung, Auto,
 * Phasen und Zeit-Ziel über reale Build-Artefakte und den produktiven Writer.
 * Daten/Wirkung: Synthetische W/A/ms, keine Hardware und keine Fremdschreibungen.
 * Bei Änderungen: Grenze 0/leer, Messausfall und abgeschaltete Nulleinspeisung
 * mitprüfen. Bestehende RC60-Fixture wird ohne deren Testlauf wiederverwendet.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const root = path.resolve(__dirname, '..');
const ze = require('../ems/services/zero-export-pv-coordinator');
const bridge = require('../ems/services/forecast-target-runtime-bridge');
const planner = require('../ems/services/forecast-aware-target-planner');
const { buildChargingAllocationShadowPlan: allocate } = require('../lib/ts-mirrors/ems/charging-management/charging-allocation');
const { buildChargingPhaseSelectionPlan: phases } = require('../lib/ts-mirrors/ems/charging-management/charging-phase-selection');
let clock = Date.UTC(2026, 8, 24, 12);
const policy = (x = {}) => bridge.resolveZeroExportChargingPolicy({ active: true, userMode: 'auto', effectiveMode: 'normal', boostMaxPowerW: 3700, ...x });
assert.deepEqual(policy(), { effectiveMode: 'minpv', gridMaxW: 3700 });
assert.deepEqual(policy({ active: false }), { effectiveMode: 'normal', gridMaxW: null });
for (const x of [{ cheapWindow: true }, { goalActive: true }, { strategy: { active: true } }]) assert.equal(policy(x).effectiveMode, 'normal');
assert.equal(policy({ effectiveMode: 'pv' }).effectiveMode, 'pv');
for (const userMode of ['auto', 'boost', 'minpv', 'pv']) assert.equal(policy({ userMode }).gridMaxW, 3700);
for (const boostMaxPowerW of [0, -1, true, 'broken']) assert.equal(policy({ boostMaxPowerW }).gridMaxW, 0);
for (const boostMaxPowerW of [null, undefined, '']) assert.equal(policy({ boostMaxPowerW }).gridMaxW, null);
assert.equal(bridge.runtimeChargingMaximumW({ maxPW: 11000, zeroExportGridMaxW: 3700 }, 5000), 8700);
assert.equal(bridge.runtimeChargingMaximumW({ maxPW: 11000, zeroExportGridMaxW: 0 }, 5000), 5000);

const point = { safe: 'a', enabled: true, online: true, vehiclePlugged: true, vehicleDemandConfirmed: true,
  userMode: 'boost', effectiveMode: 'boost', chargerType: 'DC', controlBasis: 'power', minPowerW: 2000,
  maxPowerW: 22000, stepW: 1, setWKey: 'a.power', targetPowerW: 22000, actualPowerW: 0, zeroExportGridMaxW: 3700 };
function plan(points, pvW = 5000, extras = {}) {
  return allocate({ ts: clock, budgetW: 40000, pvPhysicalAvailableW: pvW, pvPureAvailableW: pvW,
    preferTsNativeAllocation: false, wallboxes: points, ...extras }).wallboxes;
}
assert.equal(plan([point])[0].targetPowerW, 8700);
assert.equal(plan([point], 0)[0].targetPowerW, 3700);
assert.equal(plan([{ ...point, zeroExportGridMaxW: 0 }])[0].targetPowerW, 5000);
assert.equal(plan([{ ...point, zeroExportGridMaxW: 0 }], 0)[0].targetPowerW, 0);
assert.equal(plan([{ ...point, zeroExportGridMaxW: null, boostMaxPowerW: 3700 }], 0)[0].targetPowerW, 22000, 'Ohne aktives Gate keine neue Grenze');
assert.equal(plan([{ ...point, effectiveMode: 'minpv', userMode: 'minpv' }])[0].targetPowerW, 7000);
assert.equal(plan([{ ...point, minPowerW: 4140, effectiveMode: 'minpv' }])[0].targetPowerW, 8700);
assert.equal(plan([{ ...point, minPowerW: 4140 }], 0)[0].targetPowerW, 0);
const pair = plan([point, { ...point, safe: 'b', allocationRank: 2 }]);
assert.deepEqual(pair.map(x => x.targetPowerW), [8700, 3700]);
assert.equal(pair.reduce((s, p) => s + p.pvUsedW, 0), 5000);
assert.equal(plan([{ ...point, actualPowerW: 8700, targetPowerW: 0 }, { ...point, safe: 'b' }])[1].targetPowerW, 3700, 'Abgeregelte Istleistung bleibt reserviert');
assert(plan([point], 5000, { budgetW: 2500 })[0].targetPowerW <= 2500);
assert.equal(plan([{ ...point, stationKey: 's', stationMaxPowerW: 3000 }])[0].targetPowerW, 3000);
assert.equal(plan([{ ...point, zeroExportRestartUntilMs: clock + 1000 }])[0].targetPowerW, 0);
for (let seed = 0; seed < 120; seed++) {
  const pv = seed * 137 % 13000;
  const pts = [0, 1, 2].map(i => ({ ...point, safe: `r${i}`, zeroExportGridMaxW: (seed * 41 + i * 1700) % 7000, actualPowerW: 0 }));
  const out = plan(pts, pv);
  assert(out.reduce((s, p) => s + p.pvUsedW, 0) <= pv + 1e-6);
  for (const p of out) assert(p.targetPowerW <= p.zeroExportGridMaxW + p.pvUsedW + 1e-6);
}

const phasePoint = { ...point, chargerType: 'AC', controlBasis: 'current', phases: 3, currentPhaseCount: 3,
  phaseMode: 'auto-pv', phaseSwitchKey: 'phase', supportsPhaseSwitch: true, minA: 6, maxA: 32,
  voltageV: 230, lowSinceMs: clock - 121000, highSinceMs: clock - 301000 };
const phase = (wb, pv = 0) => phases({ now: clock, budgetW: 30000, stablePvPhysicalAvailableW: pv,
  pvPhysicalAvailableW: pv, phaseAutoEnabled: true, wallboxes: [wb] }).wallboxes[0];
assert.equal(phase(phasePoint).targetPhaseCount, 1);
assert.equal(phase({ ...phasePoint, currentPhaseCount: 1, phases: 1 }, 5000).targetPhaseCount, 3);
assert.equal(phase({ ...phasePoint, phaseMode: 'fixed-3p' }).targetPhaseCount, 3);
assert.equal(phase({ ...phasePoint, chargerType: 'DC' }).switchRequired, false);

const goalInput = { nowMs: clock, siteCapW: 30000, energySafetyFactor: 1, reserveMs: 0,
  goals: [{ id: 'a', deadlineMs: clock + 3600000, requiredWh: 8000, minPowerW: 1380, maxPowerW: 11000, maxGridPowerW: 3700 }] };
let gp = planner.buildForecastAwareTargetPlans(goalInput)[0];
assert.equal(gp.targetReachable, false); assert(gp.plannedGridWh <= 3700); assert(gp.plannedNowW <= 3700);
gp = planner.buildForecastAwareTargetPlans({ ...goalInput, pvPlanningSafetyPct: 100,
  pvCurve: [{ startMs: clock, endMs: clock + 3600000, powerW: 5000 }] })[0];
assert.equal(gp.targetReachable, true); assert(gp.plannedGridWh <= 3700); assert(gp.plannedPvWh <= 5000); assert(gp.plannedNowW <= 8700);
gp = planner.buildForecastAwareTargetPlans({ ...goalInput, pvPlanningSafetyPct: 100,
  goals: [{ ...goalInput.goals[0], minPowerW: 4140, requiredWh: 4600 }],
  pvCurve: [{ startMs: clock, endMs: clock + 3600000, powerW: 1000 }] })[0];
assert.equal(gp.targetReachable, true, 'Netz und PV zusammen erreichen technisches Minimum');
assert(gp.plannedGridWh <= 3700); assert(gp.plannedNowW <= 4700);
console.log('[1.0.19] OK: Netzanteil+PV, 120 Mehr-LP-Fälle, Istreservierung, Phasen und Zielplanung');

const fixtureFile = path.join(root, 'scripts/verify-rc60-universal-auto-wallbox.js');
const fixtureSource = fs.readFileSync(fixtureFile, 'utf8');
const fixtureModule = new Module(fixtureFile, module);
fixtureModule.filename = fixtureFile; fixtureModule.paths = Module._nodeModulePaths(path.dirname(fixtureFile));
fixtureModule._compile(fixtureSource.slice(0, fixtureSource.indexOf('async function withHarness')) + '\nmodule.exports = { makeHarness };', fixtureFile);
const base = 'chargingManagement.wallboxes.lp1.';
function harness(options = {}) {
  const h = fixtureModule.exports.makeHarness({ actualPowerW: 1380, status: 'Charging', totalBudgetW: 22000, ...options,
    wallbox: { phases: 1, phaseMode: 'fixed-1p', minA: 6, maxA: 32, boostMaxPowerW: 3700, ...options.wallbox } });
  h.adapter.config.gridConstraints = { zeroExportEnabled: options.zero !== false, ...options.gridConstraints };
  delete h.module._publishChargingAllocationTsShadow;
  delete h.module._publishChargingPhaseSelectionRuntimeStates;
  delete h.module._publishChargingStationDiagnosticsFromAllocationPlan;
  const tick = async (pv = 0, sample = {}) => {
    clock += 1000;
    h.adapter._nvpFreshnessSnapshot.ts = clock;
    const b = h.adapter._emsBudget;
    b.ts = clock; b.gates.pv = { effectiveW: pv, rawW: pv };
    b.gates.pvAllocation = { totalW: pv, evcsCapW: pv, mode: 'evcs', evcsSharePct: 100 }; b.remainingPvW = pv;
    h.setObject(h.wallbox.actualPowerWId, h.objectValues.get(h.wallbox.actualPowerWId), clock);
    ze.updateZeroExportProbe(h.adapter, { now: clock, gridFresh: true, gridW: 2000, pvFresh: true,
      pvW: pv + 2000, storageFresh: true, storageDischargeW: 0, safetyReady: true,
      externalBlocked: false, tariffCurtail: false, ...sample });
    const out = await h.tick();
    h.setObject(h.wallbox.actualPowerWId, out.targetPowerW, clock);
    return out;
  };
  return { h, tick };
}
async function runtimeChecks() {
  const originalNow = Date.now; Date.now = () => clock;
  try {
    for (const [opts, pv, upper, lower] of [
      [{ userMode: 'boost' }, 0, 3700, 3680],
      [{ userMode: 'boost', wallbox: { phases: 3, phaseMode: 'fixed-3p' } }, 5000, 8700, 8000],
      [{ userMode: 'boost', wallbox: { phases: 3, phaseMode: 'fixed-3p' } }, 0, 0, 0],
      [{ userMode: 'auto' }, 0, 1380, 1380],
      [{ userMode: 'auto' }, 5000, 6380, 5000],
      [{ userMode: 'auto', tariffState: 'guenstig' }, 0, 3700, 3600],
      [{ userMode: 'auto', gridAllowed: false, tariffState: 'teuer' }, 0, 0, 0],
      [{ userMode: 'boost', zero: false }, 0, 7360, 7000],
      [{ userMode: 'auto', zero: false }, 0, 7360, 7000],
      [{ userMode: 'boost', wallbox: { boostMaxPowerW: 0 } }, 5000, 5000, 4500],
      [{ userMode: 'minpv', wallbox: { boostMaxPowerW: 1000 } }, 0, 0, 0],
      [{ userMode: 'minpv', wallbox: { boostMaxPowerW: 1000 } }, 3000, 4000, 3500],
      [{ userMode: 'boost', wallbox: { chargerType: 'DC', controlBasis: 'powerW', minA: 0, maxA: 0,
        minPowerW: 1000, maxPowerW: 22000, setCurrentAId: '', setPowerWId: 'test.dc.setW' } }, 5000, 8700, 8000],
    ]) {
      const { h, tick } = harness(opts);
      try {
        let out;
        for (let i = 0; i < 55; i++) out = await tick(pv);
        assert(out.targetPowerW >= lower && out.targetPowerW <= upper, JSON.stringify({ opts, pv, out }));
        if (opts.zero !== false && upper > 3700) {
          out = await tick(0, { pvFresh: false });
          assert(out.targetPowerW <= 3700, 'Wegfall PV sofort, nicht durch Auto-Mindestlaufzeit überbrücken');
        }
      } finally { h.stop(); }
    }
    for (const [deadlineHours, pv, shouldWait] of [[10, 0, true], [0.25, 0, false], [0.25, 5000, false]]) {
      const { h, tick } = harness({ userMode: 'auto', gridAllowed: false, tariffState: 'teuer',
        goalEnabled: true, goalTargetSocPct: 60, vehicleSoc: 50, goalBatteryKwh: 60, deadlineHours });
      try {
        let out;
        for (let i = 0; i < 55; i++) out = await tick(pv);
        assert.equal(out.goalActive, true);
        if (shouldWait) assert.equal(out.targetPowerW, 0, 'Nicht dringendes Ziel wartet weiterhin');
        else {
          assert(out.targetPowerW > 1300, JSON.stringify(out));
          assert(out.targetPowerW <= 3700 + pv, 'Zeit-Ziel darf Netzgrenze nicht aufheben');
          assert.equal(out.goalTariffOverride, true, 'Dringendes Ziel darf Tarif weiterhin übersteuern');
        }
      } finally { h.stop(); }
    }
    for (const sample of [{ gridFresh: false }, { pvFresh: false }, { pvW: null }, { storageFresh: false },
      { safetyReady: false }, { externalBlocked: true }, { tariffCurtail: true }]) {
      const { h, tick } = harness({ userMode: 'boost' });
      try {
        for (let i = 0; i < 55; i++) await tick(5000);
        const out = await tick(5000, sample);
        assert(out.targetPowerW <= 3700, `Unbewiesenes PV: ${JSON.stringify(sample)}`);
      } finally { h.stop(); }
    }
    // PV-Freigabe verfällt nach der Allokation, aber vor dem echten Writer.
    // Auch dessen Auto-Haltepfad darf die verlorene Quelle nicht nachholen.
    for (const userMode of ['auto', 'boost']) {
      const { h, tick } = harness({ userMode });
      try {
        for (let i = 0; i < 55; i++) await tick(5000);
        const execute = h.module._executeChargingTsSetpointPlan;
        h.module._executeChargingTsSetpointPlan = async function (...args) {
          ze.updateZeroExportProbe(h.adapter, { ...h.adapter._zeroExportPvCoordinator.sample, now: clock, pvFresh: false });
          return execute.apply(this, args);
        };
        const before = h.writes.length;
        const out = await tick(5000);
        assert(out.targetPowerW <= 3700, 'Alte Zuteilung darf den finalen Guard nicht passieren');
        for (const write of h.writes.slice(before).filter(w => w.key.endsWith('.setA'))) {
          assert(write.value * 230 <= 3700, 'Tatsächlicher Amperebefehl muss Netzgrenze einhalten');
        }
      } finally { h.stop(); }
    }
    console.log('[1.0.19] OK: reale Writer Auto/Boost/PV-Verlust, 1p/3p und unveränderte Bestandsanlage');
  } finally { Date.now = originalNow; }
}
runtimeChecks().catch(error => { console.error(error); process.exitCode = 1; });
