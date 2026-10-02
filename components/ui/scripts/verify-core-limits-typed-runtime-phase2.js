#!/usr/bin/env node
'use strict';

/**
 * Regression 0.8.120: TypeScript Core-Limits Phase 2.
 *
 * Prüft:
 * - normalisierte Mess-/Quellenübergabe,
 * - zentrale Grant-/Reservierungsreihenfolge,
 * - Restbudgetmutation,
 * - produktive State-/Cache-Publikation,
 * - harten Legacy-Fallback bei fehlendem TS-Publikationsvertrag.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const mirror = require('../lib/ts-mirrors/ems/core-limits/core-runtime');
const runtime = require('../ems/modules/core-limits');

(async () => {
const prepared = mirror.prepareCoreRuntimeSnapshotInput({
  ts: 123,
  grid: { netW: '0', usable: true, status: 'fresh', source: 'signed', measurementAgeMs: '250', importLimitW: '40000' },
  pv: { measuredW: '12000', measuredFresh: true, measuredSource: 'derived.core.pv.totalW', reserveW: 500 },
  storage: { chargeW: '3000', dischargeW: 0, writerActive: true, eligible: true, maxChargeW: 10000, socPct: 50, maxSocPct: 100 },
  consumers: { evcsUsedW: '4000', evcsActualW: 2500, evcsPvUsedW: 3000, thermalUsedW: 0, thermalActualW: 0, heatingRodUsedW: 0, heatingRodActualW: 0 },
  allocation: { enabled: true, mode: 'both', evcsSharePct: 80 },
});
assert.strictEqual(prepared.ok, true);
assert.strictEqual(prepared.source, 'ts-core-runtime-input-v2');
assert.strictEqual(prepared.input.grid.netW, 0, '0 W muss bei der Quellenübergabe erhalten bleiben');
assert.strictEqual(prepared.diagnostics.gridSource, 'signed');
assert.strictEqual(prepared.diagnostics.pvFresh, true);
assert.strictEqual(prepared.diagnostics.consumerCount, 1, 'EVCS-Ist, Reservierung und PV-Anteil zählen als ein Verbraucher');

const snapshot = mirror.buildCoreRuntimeBudgetSnapshot({
  ts: 456,
  grid: {
    netW: -7000,
    usable: true,
    status: 'fresh',
    source: 'signed',
    reason: 'ok',
    measurementAgeMs: 300,
    importLimitW: 40000,
    highLevelCapW: 12000,
    highLevelBinding: 'test-cap',
  },
  pv: {
    measuredW: 30000,
    measuredFresh: true,
    measuredSource: 'derived.core.pv.totalW',
    reserveW: 500,
  },
  storage: { chargeW: 3000, dischargeW: 0, writerActive: true, eligible: true, maxChargeW: 10000, socPct: 50, maxSocPct: 100 },
  consumers: { evcsUsedW: 4000, evcsActualW: 2500, evcsPvUsedW: 3000, thermalUsedW: 0, thermalActualW: 0, heatingRodUsedW: 0, heatingRodActualW: 0 },
  allocation: { enabled: true, mode: 'both', evcsSharePct: 80 },
  forecast: { usable: true, nowW: 25000 },
  tariff: { active: false, dischargeAllowed: true },
  para14a: {
    active: true,
    appCapsW: { evcs: 6000, storage: 4000, thermal: 3000, heatingRod: null, airCondition: null, custom: null },
  },
});
assert.strictEqual(snapshot.typedRuntime.contractVersion, 'core-runtime-v2');
assert.strictEqual(snapshot.gates.total.effectiveW, 12000);
assert.strictEqual(snapshot.gates.pv.effectiveW, 12500);

let state = mirror.createCoreRuntimeReservationState(snapshot);
assert.strictEqual(state.remainingTotalW, 12000);
assert.strictEqual(state.remainingPvW, 12500);
assert.deepStrictEqual(state.order, []);
assert.strictEqual(state.sequence, 0);

const evcs = mirror.applyCoreRuntimeReservation(state, {
  key: 'evcs',
  app: 'evcs',
  label: 'E-Mobilität',
  priority: 100,
  requestedW: 10000,
  reserveW: 6000,
  pvReserveW: 6000,
  actualW: 5500,
  pvOnly: true,
  mode: 'pv',
}, 1000);
assert.strictEqual(evcs.source, 'ts-core-runtime-reservation-v2');
assert.strictEqual(evcs.entry.grantW, 10000, 'Lokale PV-Leistung darf zusätzlich zum §14a-Netzanteil freigegeben werden');
assert.strictEqual(evcs.nextRemainingTotalW, 6000);
assert.strictEqual(evcs.nextRemainingPvW, 6500);
assert.strictEqual(evcs.entry.sequence, 1);
state = evcs.state;

const storage = mirror.applyCoreRuntimeReservation(state, {
  key: 'storage',
  requestedW: 8000,
  reserveW: 4000,
  pvReserveW: 4000,
  actualW: 3900,
  pvOnly: true,
  priority: 150,
  mode: 'charge',
}, 1001);
assert.strictEqual(storage.entry.grantW, 6000, 'Der verbleibende lokale PV-Anteil darf zusätzlich zum Speicher-Netzcap freigegeben werden');
assert.strictEqual(storage.nextRemainingTotalW, 2000);
assert.strictEqual(storage.nextRemainingPvW, 2500);
assert.strictEqual(storage.entry.sequence, 2);
state = storage.state;

const thermal = mirror.applyCoreRuntimeReservation(state, {
  key: 'thermal',
  requestedW: 3000,
  reserveW: 2000,
  actualW: 1800,
  pvOnly: false,
  priority: 200,
  mode: 'auto',
}, 1002);
assert.strictEqual(thermal.entry.grantW, 2000);
assert.strictEqual(thermal.nextRemainingTotalW, 0);
assert.strictEqual(thermal.nextRemainingPvW, 2500, 'Nicht-PV-Reservierung darf PV-Rest nicht verändern');
assert.deepStrictEqual(thermal.order, ['evcs', 'storage', 'thermal']);
assert.strictEqual(thermal.flexUsedW, 12000);
state = thermal.state;

const sequence = mirror.applyCoreRuntimeReservationSequence(
  mirror.createCoreRuntimeReservationState(snapshot),
  [
    { key: 'evcs', requestedW: 10000, reserveW: 6000, pvReserveW: 6000, pvOnly: true, priority: 100 },
    { key: 'storage', requestedW: 8000, reserveW: 4000, pvReserveW: 4000, pvOnly: true, priority: 150 },
    { key: 'thermal', requestedW: 3000, reserveW: 2000, pvOnly: false, priority: 200 },
  ],
  2000,
);
assert.strictEqual(sequence.source, 'ts-core-runtime-sequence-v2');
assert.strictEqual(sequence.entries.length, 3);
assert.deepStrictEqual(sequence.state.order, ['evcs', 'storage', 'thermal']);
assert.strictEqual(sequence.state.remainingTotalW, 0);
assert.strictEqual(sequence.state.remainingPvW, 2500);
assert.strictEqual(sequence.flexUsedW, 12000);

const coreStatus = {
  active: true,
  mode: 'typed-core-runtime',
  fallback: false,
  mismatchCount: 0,
  contractVersion: 'core-runtime-v2',
};
const plan = mirror.buildCoreRuntimePublicationPlan({
  snapshot,
  runtime: state,
  tsReservation: { source: 'ts-core-runtime-reservation-v2', ok: true },
  tsRestGates: { active: true },
  tsProductive: { active: true },
  tsShadow: { available: true },
  coreRuntimeStatus: coreStatus,
});
assert.strictEqual(plan.ok, true);
assert.strictEqual(plan.source, 'ts-core-runtime-publication-v2');
assert.strictEqual(plan.states['ems.budget.totalBudgetW'], 12000);
assert.strictEqual(plan.states['ems.budget.remainingTotalW'], 0);
assert.strictEqual(plan.states['ems.budget.remainingPvW'], 2500);
assert.strictEqual(plan.states['ems.budget.consumers.evcs.usedW'], 6000);
assert.strictEqual(plan.states['ems.budget.consumers.storage.usedW'], 4000);
assert.strictEqual(plan.states['ems.budget.consumers.thermal.usedW'], 2000);
assert.strictEqual(plan.states['ems.budget.phase2PublicationMode'], 'typed-core-runtime-publication-v2');
assert.strictEqual(plan.cache['ems.budget.remainingPvW'], 2500);
assert.strictEqual(plan.cache['ems.budget.phase2PublicationMode'], 'typed-core-runtime-publication-v2');
for (const [id, value] of Object.entries(plan.states)) {
  assert.notStrictEqual(value, undefined, `Publikationswert darf nicht undefined sein: ${id}`);
}

const runtimeBudget = runtime.makeBudgetRuntime(null, snapshot);
assert.strictEqual(runtimeBudget.version, 3);
assert.strictEqual(runtimeBudget.phase2.active, true);
const runtimeEntry = runtimeBudget.reserve({
  key: 'evcs', requestedW: 10000, reserveW: 6000, pvReserveW: 6000, actualW: 5500, pvOnly: true, priority: 100,
});
assert.strictEqual(runtimeEntry.grantW, 10000);
assert.ok(['ts-core-runtime-reservation-v2', 'ts-core-runtime-phase3-reservation'].includes(runtimeBudget.tsReservationLast.source));
assert.strictEqual(runtimeBudget.tsReservationLast.fallback, false);
assert.strictEqual(runtimeBudget.remainingTotalW, 6000);
assert.strictEqual(runtimeBudget.remainingPvW, 6500);

const written = new Map();
const cached = new Map();
const adapter = {
  config: {},
  stateCache: {},
  log: { warn() {}, debug() {}, info() {}, error() {} },
  async setStateAsync(id, value) { written.set(id, value); },
  updateValue(id, value) { cached.set(id, value); },
};
const core = new runtime.CoreLimitsModule(adapter, { getNumberFresh() { return null; } });
const publicationOk = await core._publishCoreRuntimeBudgetPlan(3000, snapshot, runtimeBudget, { available: true }, { active: true });
assert.strictEqual(publicationOk, true);
assert.strictEqual(written.get('ems.budget.phase2PublicationMode'), 'typed-core-runtime-publication-v3');
assert.strictEqual(written.get('ems.budget.remainingTotalW'), 6000);
assert.strictEqual(written.get('ems.budget.remainingPvW'), 6500);
assert.strictEqual(cached.get('ems.budget.remainingPvW'), 6500);
assert.strictEqual(runtimeBudget.phase2.publicationFallback, false);

const originalPlanBuilder = mirror.buildCoreRuntimePublicationPlan;
const originalPlanBuilderV3 = mirror.buildCoreRuntimePhase3PublicationPlan;
mirror.buildCoreRuntimePublicationPlan = null;
mirror.buildCoreRuntimePhase3PublicationPlan = null;
const fallbackOk = await core._publishCoreRuntimeBudgetPlan(3001, snapshot, runtimeBudget, {}, {});
mirror.buildCoreRuntimePublicationPlan = originalPlanBuilder;
mirror.buildCoreRuntimePhase3PublicationPlan = originalPlanBuilderV3;
assert.strictEqual(fallbackOk, false, 'fehlender TS-Publikationsvertrag muss den Legacy-Pfad aktivieren');
assert.strictEqual(runtimeBudget.phase2.publicationFallback, true);

let seed = 0x8120;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 0x100000000;
};
for (let i = 0; i < 50000; i++) {
  const totalW = Math.round(rnd() * 60000);
  const pvW = Math.round(rnd() * totalW);
  const initial = {
    remainingTotalW: totalW,
    remainingPvW: pvW,
    gates: {
      pvAllocation: { mode: 'both', evcsCapW: Math.round(rnd() * pvW) },
      para14a: {
        active: rnd() > 0.5,
        appCapsW: { evcs: Math.round(rnd() * 30000), storage: Math.round(rnd() * 30000), thermal: null, heatingRod: null },
      },
    },
    consumers: {},
    order: [],
    sequence: 0,
  };
  const requests = ['evcs', 'storage', 'thermal', 'heatingRod'].map((key, index) => {
    const requestedW = Math.round(rnd() * 25000);
    const reserveW = Math.round(rnd() * Math.min(requestedW, totalW));
    const pvOnly = index < 2;
    return {
      key,
      requestedW,
      reserveW,
      pvReserveW: pvOnly ? Math.round(rnd() * Math.min(reserveW, pvW)) : 0,
      actualW: reserveW,
      pvOnly,
      priority: 100 + index * 50,
    };
  });
  const result = mirror.applyCoreRuntimeReservationSequence(initial, requests, i);
  assert.ok(result.state.remainingTotalW === null || result.state.remainingTotalW >= 0);
  assert.ok(result.state.remainingPvW >= 0);
  assert.ok(result.state.remainingTotalW === null || result.state.remainingTotalW <= totalW);
  assert.ok(result.state.remainingPvW <= pvW);
  assert.strictEqual(result.entries.length, 4);
  for (const entry of result.entries) {
    assert.ok(entry.grantW >= 0);
    assert.ok(entry.grantW <= entry.requestedW);
    assert.ok(entry.usedW >= 0);
    assert.ok(entry.pvUsedW >= 0);
  }
}

const source = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/core-limits.ts'), 'utf8');
for (const marker of [
  'prepareCoreRuntimeSnapshotInput',
  'applyCoreRuntimeReservation',
  'applyCoreRuntimeReservationSequence',
  'buildCoreRuntimePublicationPlan',
  '_publishCoreRuntimeBudgetPlan',
  'typed-core-runtime-publication-v2',
  'ems.budget.phase2PublicationMode',
]) {
  assert.ok(
    source.includes(marker) || fs.readFileSync(path.join(root, 'src-ts/ems/core-limits/core-runtime.ts'), 'utf8').includes(marker),
    `Phase-2-Marker fehlt: ${marker}`,
  );
}

console.log('[core-limits-typed-runtime-phase2] OK: Quellenübergabe, Grants, Reservierungen, Restbudgetmutation und State-Publikation laufen typisiert mit Legacy-Fallback.');
})().catch((err) => {
  console.error('[core-limits-typed-runtime-phase2] ERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
});
