#!/usr/bin/env node
'use strict';

/**
 * Regression 0.8.121: Ein typisierter Phase-3-Laufzeitstand führt Snapshot,
 * Reservierungen und Publikation. Bei Fehlern bleibt die JS-Referenz aktiv.
 */
const assert = require('assert');
const mirror = require('../lib/ts-mirrors/ems/core-limits/core-runtime');
const { makeBudgetRuntime } = require('../ems/modules/core-limits');

function snapshot() {
  return {
    ts: 1710000000000,
    active: true,
    mode: 'central-background-ts-runtime',
    source: 'ts-core-runtime',
    raw: {
      gridW: -6000,
      gridImportW: 0,
      gridExportW: 6000,
      pvPowerW: 12000,
      storageChargeW: 0,
      storageDischargeW: 0,
      flexUsedW: 0,
      pvFlexUsedW: 0,
      pvBudgetFlowRawW: 6000,
      pvBudgetPhysicalCapW: 6000,
      pvBudgetPhysicalSource: 'direct-pv+nvp-flow-confirmed',
      pvBudgetPhysicalHeld: false,
      pvBudgetDirectSource: 'derived.core.pv.totalW',
      pvBudgetDirectFresh: true,
      pvBudgetClampedW: 6000,
    },
    gates: {
      grid: { importLimitW: 40000, importW: 0, exportW: 6000, measurementUsable: true },
      pv: { rawW: 6000, effectiveW: 6000 },
      storage: {},
      total: { effectiveW: 20000, binding: 'grid' },
      forecast: { valid: false, usable: false },
      tariff: { active: false, dischargeAllowed: true },
      pvAllocation: {
        allocationEnabled: true,
        mode: 'both',
        evcsSharePct: 50,
        evcsCapW: 3000,
        storageGuaranteedW: 3000,
        storageEligible: true,
        storageMaxChargeW: 10000,
        reason: 'configured-both',
      },
      para14a: { active: false, appCapsW: {} },
    },
    consumers: {},
    typedRuntime: { productive: true, fallback: false, contractVersion: 'core-runtime-v2' },
  };
}

const adapter = {
  setStateAsync: async () => {},
  updateValue() {},
};

// Pure typed contract.
const runtime0 = mirror.createCoreRuntimePhase3State(snapshot());
assert.strictEqual(runtime0.source, 'ts-core-runtime-phase3');
assert.strictEqual(runtime0.reservationState.remainingTotalW, 20000);
assert.strictEqual(runtime0.reservationState.remainingPvW, 6000);

const evcs = mirror.applyCoreRuntimePhase3Reservation(runtime0, {
  key: 'evcs', app: 'evcs', requestedW: 2500, reserveW: 2500, pvReserveW: 2500, pvOnly: true,
}, 1710000000100);
assert.strictEqual(evcs.source, 'ts-core-runtime-phase3-reservation');
assert.strictEqual(evcs.runtime.revision, 1);
assert.strictEqual(evcs.runtime.reservationState.remainingTotalW, 17500);
assert.strictEqual(evcs.runtime.reservationState.remainingPvW, 3500);

const storage = mirror.applyCoreRuntimePhase3Reservation(evcs.runtime, {
  key: 'storage', app: 'storage', requestedW: 3000, reserveW: 3000, pvReserveW: 3000, pvOnly: true,
}, 1710000000200);
assert.strictEqual(storage.runtime.revision, 2);
assert.strictEqual(storage.runtime.reservationState.remainingTotalW, 14500);
assert.strictEqual(storage.runtime.reservationState.remainingPvW, 500);

const seq = mirror.applyCoreRuntimePhase3Sequence(runtime0, [
  { key: 'evcs', app: 'evcs', requestedW: 2500, reserveW: 2500, pvReserveW: 2500, pvOnly: true },
  { key: 'storage', app: 'storage', requestedW: 3000, reserveW: 3000, pvReserveW: 3000, pvOnly: true },
], 1710000000300);
assert.strictEqual(seq.runtime.reservationState.remainingPvW, 500);
assert.strictEqual(Object.prototype.hasOwnProperty.call(seq.runtime.reservationState.consumers, '__phase3_snapshot__'), false);

const plan = mirror.buildCoreRuntimePhase3PublicationPlan({ runtime: storage.runtime, coreRuntimeStatus: { active: true, fallback: false, mismatchCount: 0 } });
assert.strictEqual(plan.source, 'ts-core-runtime-publication-v3');
assert.strictEqual(plan.states['ems.budget.remainingTotalW'], 14500);
assert.strictEqual(plan.states['ems.budget.remainingPvW'], 500);
assert.strictEqual(plan.states['ems.budget.phase3RuntimeMode'], 'typed-core-runtime-v3');
assert.strictEqual(plan.states['ems.budget.phase3RuntimeFallback'], false);
assert.strictEqual(plan.states['ems.budget.phase2PublicationMode'], 'typed-core-runtime-publication-v3');

// Productive compatibility shell uses phase 3 but retains exact JS parity fallback.
const productive = makeBudgetRuntime(adapter, snapshot());
assert.strictEqual(productive.version, 3);
assert.strictEqual(productive.phase3.active, true);
const entry = productive.reserve({ key: 'evcs', app: 'evcs', requestedW: 2000, reserveW: 2000, pvReserveW: 2000, pvOnly: true });
assert.strictEqual(entry.usedW, 2000);
assert.strictEqual(productive.remainingTotalW, 18000);
assert.strictEqual(productive.remainingPvW, 4000);
assert.strictEqual(productive.phase3.fallback, false);
assert.strictEqual(productive.phase3.revision, 1);

// Forced typed failure: legacy reference must remain operational and phase3 is disabled.
const original = mirror.applyCoreRuntimePhase3Reservation;
mirror.applyCoreRuntimePhase3Reservation = () => { throw new Error('forced-phase3-error'); };
try {
  const fallback = makeBudgetRuntime(adapter, snapshot());
  assert.strictEqual(fallback.phase3.active, true);
  const fallbackEntry = fallback.reserve({ key: 'evcs', app: 'evcs', requestedW: 1500, reserveW: 1500, pvReserveW: 1500, pvOnly: true });
  assert.strictEqual(fallbackEntry.usedW, 1500);
  assert.strictEqual(fallback.remainingTotalW, 18500);
  assert.strictEqual(fallback.remainingPvW, 4500);
  assert.strictEqual(fallback.phase3.fallback, true);
  assert.strictEqual(fallback.phase3.source, 'legacy-js-runtime');
} finally {
  mirror.applyCoreRuntimePhase3Reservation = original;
}

console.log('[core-limits-typed-runtime-phase3] OK: one typed runtime state with strict JS fallback.');
