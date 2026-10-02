#!/usr/bin/env node
'use strict';

/**
 * Regression 0.8.119: echte Typisierung des zentralen EMS-Kerns – Phase 1.
 *
 * Geprüft werden die produktiven, typisierten Rechenverträge für:
 * - physikalisches PV-Potential,
 * - PV-Plausibilisierung/Trusted-Hold,
 * - zentrale Grants inkl. PV-Aufteilung und §14a,
 * - vollständigen Budget-Snapshot inkl. NVP-/Grid-Headroom,
 * - harte Legacy-Fallback-Grenze in der Runtime.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const mirror = require(path.join(root, 'lib/ts-mirrors/ems/core-limits/core-runtime.js'));
const runtime = require(path.join(root, 'ems/modules/core-limits.js'));

for (const name of [
  'computeCorePvBudgetFlowRawW',
  'resolveCorePvBudgetPhysicalCap',
  'buildCorePvAllocation',
  'computeCoreCentralBudgetGrant',
  'buildCoreRuntimeBudgetSnapshot',
  'compareCoreRuntimeBudgetSnapshots',
]) {
  assert.strictEqual(typeof mirror[name], 'function', `TS-Core-Runtime exportiert ${name} nicht`);
}

assert.strictEqual(mirror.computeCorePvBudgetFlowRawW({
  gridW: -5000,
  flexUsedW: 3000,
  storageChargeW: 2000,
  storageDischargeW: 0,
}), 10000, 'PV-Flow aus Export + laufenden PV-Senken falsch');
assert.strictEqual(mirror.computeCorePvBudgetFlowRawW({
  gridW: 1000,
  flexUsedW: 3000,
  storageChargeW: 2000,
  storageDischargeW: 4000,
}), 0, 'Netzbezug/Entladung darf kein künstliches PV-Budget erzeugen');

const direct = mirror.resolveCorePvBudgetPhysicalCap({
  measuredPvW: 5000,
  measuredPvFresh: true,
  flowRawW: 7000,
  gridExportW: 1000,
});
assert.deepStrictEqual(direct, {
  capW: 7000,
  source: 'direct-pv+nvp-flow-confirmed',
  trusted: true,
  held: false,
});
const hold = mirror.resolveCorePvBudgetPhysicalCap({
  measuredPvW: 0,
  measuredPvFresh: false,
  flowRawW: 5000,
  gridExportW: 0,
  gridImportW: 0,
  activePvSinkW: 3000,
  lastTrustedW: 8000,
  lastTrustedAgeMs: 10000,
  holdMs: 30000,
});
assert.strictEqual(hold.capW, 5000);
assert.strictEqual(hold.held, true);
assert.strictEqual(hold.source, 'trusted-pv-hold-with-active-sink');
const zeroPvWithExport = mirror.resolveCorePvBudgetPhysicalCap({
  measuredPvW: 0,
  measuredPvFresh: true,
  flowRawW: 5000,
  gridExportW: 1000,
});
assert.strictEqual(zeroPvWithExport.capW, 1000, 'frische falsche 0-PV darf reale Einspeisung nicht auf 0 klemmen');

const allocation = mirror.buildCorePvAllocation({
  totalW: 10000,
  mode: 'both',
  evcsSharePct: 80,
  storageEligible: true,
});
assert.strictEqual(allocation.evcsCapW, 8000);
assert.strictEqual(allocation.storageGuaranteedW, 2000);
const dynamicAllocation = mirror.buildCorePvAllocation({
  totalW: 10000,
  mode: 'both',
  evcsSharePct: 80,
  allocationEnabled: false,
  storageEligible: true,
});
assert.strictEqual(dynamicAllocation.mode, 'dynamic');
assert.strictEqual(dynamicAllocation.evcsCapW, 10000);
assert.strictEqual(dynamicAllocation.storageGuaranteedW, 0);

const grantState = {
  remainingTotalW: 12000,
  remainingPvW: 10000,
  gates: {
    pvAllocation: { mode: 'both', evcsCapW: 8000 },
    para14a: {
      active: true,
      appCapsW: { evcs: 6000, storage: 4000, thermal: 3000, heatingRod: null, airCondition: null, custom: null },
    },
  },
};
const evcsGrant = mirror.computeCoreCentralBudgetGrant(grantState, {
  key: 'evcs',
  requestedW: 10000,
  pvOnly: true,
});
assert.strictEqual(evcsGrant.grantW, 6000);
assert.strictEqual(evcsGrant.allocationCapApplied, true);
assert.strictEqual(evcsGrant.para14aCapApplied, true);
const storageGrant = mirror.computeCoreCentralBudgetGrant(grantState, {
  key: 'storage',
  requestedW: 8000,
  pvOnly: true,
});
assert.strictEqual(storageGrant.grantW, 4000);
assert.strictEqual(storageGrant.allocationCapApplied, false);
assert.strictEqual(storageGrant.para14aCapApplied, true);

const snapshotInput = {
  ts: 123456,
  grid: {
    netW: -7000,
    usable: true,
    status: 'fresh',
    source: 'signed',
    reason: 'ok',
    measurementAgeMs: 500,
    importLimitW: 40000,
    highLevelCapW: 30000,
    highLevelBinding: 'para14a',
  },
  pv: {
    measuredW: 30000,
    measuredFresh: true,
    measuredSource: 'derived.core.pv.totalW',
    reserveW: 500,
  },
  storage: {
    chargeW: 3000,
    dischargeW: 0,
    writerActive: true,
    eligible: true,
    maxChargeW: 10000,
    socPct: 50,
    maxSocPct: 100,
  },
  consumers: {
    evcsUsedW: 11000,
    evcsActualW: 0,
    evcsPvUsedW: 8000,
    thermalUsedW: 0,
    thermalActualW: 0,
    heatingRodUsedW: 0,
    heatingRodActualW: 0,
  },
  allocation: {
    enabled: true,
    mode: 'both',
    evcsSharePct: 80,
  },
  forecast: { usable: true, nowW: 25000 },
  tariff: { active: false, dischargeAllowed: true },
  para14a: { active: true, appCapsW: { evcs: 10000 } },
};
const snapshot = mirror.buildCoreRuntimeBudgetSnapshot(snapshotInput);
assert.strictEqual(snapshot.mode, 'central-background-ts-runtime');
assert.strictEqual(snapshot.raw.pvBudgetFlowRawW, 18000);
assert.strictEqual(snapshot.gates.pv.rawW, 18000);
assert.strictEqual(snapshot.gates.pv.effectiveW, 17500);
assert.strictEqual(snapshot.gates.pvAllocation.evcsCapW, 14000);
assert.strictEqual(snapshot.gates.pvAllocation.storageGuaranteedW, 3500);
assert.strictEqual(snapshot.raw.currentControlledLoadW, 3000, 'Nur reale Istlast, nicht EVCS-Reservierung, darf zum Gesamtzielbudget addiert werden');
assert.strictEqual(snapshot.gates.grid.incrementHeadroomW, 47000, 'Einspeisung muss den signierten Import-Headroom erhöhen');
assert.strictEqual(snapshot.gates.grid.headroomRawW, 50000);
assert.strictEqual(snapshot.gates.grid.headroomW, 50000);
assert.strictEqual(snapshot.gates.total.effectiveW, 30000);
assert.strictEqual(snapshot.gates.total.binding, 'para14a');
assert.strictEqual(snapshot.typedRuntime.productive, true);

const staleSnapshot = mirror.buildCoreRuntimeBudgetSnapshot({
  ...snapshotInput,
  grid: { ...snapshotInput.grid, usable: false, status: 'stale' },
});
assert.strictEqual(staleSnapshot.gates.pv.effectiveW, 0);
assert.strictEqual(staleSnapshot.gates.total.effectiveW, 0);
assert.ok(staleSnapshot.gates.total.binding.includes('nvp_stale'));

const mismatch = mirror.compareCoreRuntimeBudgetSnapshots(
  { ...snapshot, gates: { ...snapshot.gates, total: { ...snapshot.gates.total, effectiveW: 123 } } },
  snapshot,
  1,
);
assert.ok(mismatch.some((row) => row.field === 'gates.total.effectiveW'), 'Snapshot-Vergleich erkennt Abweichung nicht');

// Randomisierte Invarianten: keine negativen Budgets, kein Grant über Caps.
let seed = 0x8119;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 0x100000000;
};
for (let i = 0; i < 50000; i++) {
  const gridW = Math.round((rnd() - 0.5) * 80000);
  const gridUsable = rnd() > 0.05;
  const importLimitW = Math.round(rnd() * 60000);
  const highLevelCapW = rnd() > 0.2 ? Math.round(rnd() * 60000) : null;
  const evcs = Math.round(rnd() * 30000);
  const evcsActual = Math.round(rnd() * 30000);
  const thermalUsed = Math.round(rnd() * 12000);
  const thermalActual = Math.round(rnd() * 12000);
  const heatingRodUsed = Math.round(rnd() * 12000);
  const heatingRodActual = Math.round(rnd() * 12000);
  const charge = Math.round(rnd() * 25000);
  const discharge = Math.round(rnd() * 25000);
  const storageWriterActive = rnd() > 0.3;
  const measuredPv = Math.round(rnd() * 50000);
  const snap = mirror.buildCoreRuntimeBudgetSnapshot({
    ts: i,
    grid: {
      netW: gridW,
      usable: gridUsable,
      status: 'random',
      source: 'test',
      importLimitW,
      highLevelCapW,
    },
    pv: {
      measuredW: measuredPv,
      measuredFresh: rnd() > 0.1,
      reserveW: Math.round(rnd() * 1500),
      lastTrustedW: measuredPv,
      lastTrustedAgeMs: Math.round(rnd() * 60000),
      holdMs: 30000,
    },
    storage: {
      chargeW: charge,
      dischargeW: discharge,
      eligible: rnd() > 0.2,
      maxChargeW: Math.round(rnd() * 25000),
      socPct: rnd() * 100,
      maxSocPct: 100,
      writerActive: storageWriterActive,
    },
    consumers: {
      evcsUsedW: evcs,
      evcsActualW: evcsActual,
      evcsPvUsedW: Math.min(evcs, Math.round(rnd() * evcs)),
      thermalUsedW: thermalUsed,
      thermalActualW: thermalActual,
      heatingRodUsedW: heatingRodUsed,
      heatingRodActualW: heatingRodActual,
    },
    allocation: { enabled: true, mode: 'both', evcsSharePct: rnd() * 100 },
  });
  assert.ok(snap.gates.pv.rawW >= 0 && snap.gates.pv.effectiveW >= 0);
  assert.ok(snap.gates.pv.effectiveW <= snap.gates.pv.rawW);
  assert.ok(snap.gates.pv.rawW <= snap.gates.pv.flowRawW + 1);
  assert.ok(snap.gates.pv.rawW <= snap.gates.pv.physicalCapW + 1);
  if (snap.gates.total.effectiveW !== null) assert.ok(snap.gates.total.effectiveW >= 0);
  assert.ok(snap.gates.pvAllocation.evcsCapW >= 0);
  assert.ok(snap.gates.pvAllocation.storageGuaranteedW >= 0);
  assert.ok(snap.gates.pvAllocation.evcsCapW + snap.gates.pvAllocation.storageGuaranteedW <= snap.gates.pv.effectiveW + 1);
  const expectedControlledActualW = evcsActual + thermalActual + heatingRodActual + (storageWriterActive ? charge : 0);
  assert.strictEqual(snap.raw.currentControlledLoadW, expectedControlledActualW);
  if (!gridUsable) {
    assert.strictEqual(snap.gates.grid.headroomW, 0);
    assert.strictEqual(snap.gates.total.effectiveW, 0);
  } else if (importLimitW > 0) {
    const expectedGridAllowanceW = Math.max(0, expectedControlledActualW + importLimitW - gridW);
    assert.strictEqual(snap.gates.grid.incrementHeadroomW, importLimitW - gridW);
    assert.strictEqual(snap.gates.grid.headroomRawW, expectedGridAllowanceW);
    assert.strictEqual(snap.gates.grid.headroomW, expectedGridAllowanceW);
    if (highLevelCapW !== null) {
      assert.strictEqual(snap.gates.total.effectiveW, Math.min(expectedGridAllowanceW, Math.max(0, highLevelCapW)));
    } else {
      assert.strictEqual(snap.gates.total.effectiveW, expectedGridAllowanceW);
    }
  }

  const req = Math.round(rnd() * 50000);
  const pvRemaining = Math.round(rnd() * 30000);
  const totalRemaining = Math.round(rnd() * 50000);
  const cap = Math.round(rnd() * 25000);
  const grant = mirror.computeCoreCentralBudgetGrant({
    remainingTotalW: totalRemaining,
    remainingPvW: pvRemaining,
    gates: { pvAllocation: { mode: 'both', evcsCapW: cap } },
  }, { key: 'evcs', requestedW: req, pvOnly: true });
  assert.ok(grant.grantW >= 0);
  assert.ok(grant.grantW <= req);
  assert.ok(grant.grantW <= totalRemaining);
  assert.ok(grant.grantW <= pvRemaining);
  assert.ok(grant.grantW <= cap);
}

assert.strictEqual(runtime.computePvBudgetFlowRawW({ gridW: -1000, storageChargeW: 2000 }), 3000);
const runtimeGrant = runtime.computeCentralBudgetGrant({ remainingTotalW: 5000, remainingPvW: 3000 }, { key: 'evcs', requestedW: 2000, pvOnly: true });
assert.strictEqual(runtimeGrant.grantW, 2000);
assert.strictEqual(runtimeGrant.source, 'ts-core-runtime-grant');

// Produktiver Modulpfad: Ein echter Budget-Snapshot muss nach erfolgreicher
// Legacy-Parität tatsächlich aus der typisierten Core-Runtime stammen.
const makeCore = (snapshot) => new runtime.CoreLimitsModule({
  config: { chargingManagement: { staleTimeoutSec: 15 }, enableChargingManagement: true },
  stateCache: {},
  _nvpFreshnessSnapshot: snapshot,
  _nwResolveBatteryFlowFromCache() { return { chargeW: 0, dischargeW: 0 }; },
  log: { warn() {}, debug() {}, info() {}, error() {} },
}, { getNumberFresh() { return null; } });
const productiveCore = makeCore({
  ts: Date.now(),
  usable: true,
  status: 'ok',
  source: 'signed',
  reason: 'measurement-fresh',
  netW: 2000,
  measurementAgeMs: 250,
});
const productiveSnapshot = productiveCore._makeBudgetSnapshot(Date.now(), {
  grid: { gridImportLimitW_effective: 40000 },
  evcsHighLevel: { capW: null },
});
assert.strictEqual(productiveSnapshot.mode, 'central-background-ts-runtime');
assert.strictEqual(productiveSnapshot.source, 'ts-core-runtime');
assert.strictEqual(productiveSnapshot.gates.total.effectiveW, 38000);
assert.strictEqual(productiveSnapshot.tsCoreRuntime.active, true);
assert.strictEqual(productiveSnapshot.tsCoreRuntime.fallback, false);
assert.strictEqual(productiveSnapshot.tsCoreRuntime.reason, 'parity-ok');

// Fehlergrenze: Ein absichtlich unpassender Eingabevertrag darf nie den Legacy-
// Snapshot überschreiben. Der harte Fallback bleibt damit feldkompatibel.
const legacyProbe = {
  ts: 1,
  active: true,
  mode: 'legacy-probe',
  source: 'legacy-probe',
  raw: { gridW: 123 },
  gates: {
    grid: {},
    pv: {},
    storage: {},
    pvAllocation: {},
    forecast: {},
    tariff: {},
    para14a: {},
    total: { effectiveW: 456, binding: 'legacy' },
  },
  consumers: {},
};
const fallbackSnapshot = productiveCore._applyCoreRuntimeTsSnapshot(legacyProbe, {
  ts: 1,
  grid: { netW: 9999, usable: true, importLimitW: 10000 },
});
assert.strictEqual(fallbackSnapshot, legacyProbe, 'Mismatch muss exakt die Legacy-Hülle erhalten');
assert.strictEqual(fallbackSnapshot.tsCoreRuntime.fallback, true);
assert.strictEqual(fallbackSnapshot.tsCoreRuntime.reason, 'typed-core-runtime-mismatch');
assert.ok(fallbackSnapshot.tsCoreRuntime.mismatchCount > 0);

const source = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/core-limits.ts'), 'utf8');
for (const marker of [
  'requireCoreRuntimeTsMirror',
  '_applyCoreRuntimeTsSnapshot',
  'typed-core-runtime-mismatch',
  'legacy-js-fallback',
  'ems.budget.tsCoreRuntimeJson',
]) {
  assert.ok(source.includes(marker), `Runtime-Marker fehlt: ${marker}`);
}

console.log('[core-limits-typed-runtime-phase1] OK: zentraler Core rechnet PV, Grants, Headroom und Snapshots produktiv typisiert mit Legacy-Fallback.');
