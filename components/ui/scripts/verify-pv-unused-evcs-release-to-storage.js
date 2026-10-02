#!/usr/bin/env node
'use strict';

/**
 * Regression 0.8.104: Ungenutzte EVCS-PV-Anteile werden nicht als Ghost-Budget
 * festgehalten. Ohne aktive oder technisch fahrbare Ladeanforderung erhaelt der
 * Speicher den kompletten zentralen PV-Rest im selben EMS-Zyklus.
 */
const assert = require('assert');
const {
  makeBudgetRuntime,
  buildPvSurplusAllocation,
} = require('../ems/modules/core-limits');
const {
  computePendingPvStartIntentW,
  computeEvcsPvBudgetReservationW,
} = require('../ems/modules/charging-management');

function makeRuntime(totalPvW, evcsSharePct = 50) {
  const allocation = buildPvSurplusAllocation(totalPvW, 'both', evcsSharePct, {
    storageEligible: true,
    storageMaxChargeW: 30000,
  });
  const adapter = {
    setStateAsync() { return Promise.resolve(); },
    updateValue() {},
  };
  const runtime = makeBudgetRuntime(adapter, {
    ts: Date.now(),
    raw: {},
    gates: {
      total: { effectiveW: null },
      pv: { rawW: totalPvW, effectiveW: totalPvW },
      pvAllocation: allocation,
    },
  });
  return { runtime, allocation };
}

function reserveEvcs(runtime, allocationCapW, pending) {
  const pvReserveW = computeEvcsPvBudgetReservationW({
    reserveW: 0,
    demandW: 0,
    pendingDemandW: Math.max(0, Number(pending && pending.totalDemandW) || 0),
    actualPvW: 0,
    intentPvW: 0,
    pendingIntentPvW: Math.max(0, Number(pending && pending.intentW) || 0),
    allocationCapW,
  });
  runtime.reserve({
    key: 'evcs',
    app: 'chargingManagement',
    priority: 100,
    requestedW: Math.max(0, Number(pending && pending.totalDemandW) || 0),
    reserveW: 0,
    pvReserveW,
    pvOnly: false,
    mode: 'pv',
  });
  return pvReserveW;
}

// Feldbild: 2,7 kW Export + 2,6 kW laufende Speicherladung = 5,3 kW
// physikalischer PV-Rest. Bei 50/50 liegt der reine EVCS-Cap bei 2,65 kW,
// also unter dem 3-phasigen Startminimum. Deshalb darf keine Teilreservierung
// entstehen und der Speicher muss die vollen 5,3 kW sehen.
{
  const { runtime, allocation } = makeRuntime(5300, 50);
  assert.strictEqual(allocation.evcsCapW, 2650);
  const pending = computePendingPvStartIntentW({
    mode: 'pv',
    enabled: true,
    online: true,
    connected: true,
    controlBasis: 'powerW',
    status: 'SuspendedEVSE',
    currentPowerW: 0,
    currentPvIntentW: 0,
    minPowerW: 4200,
    technicalMinW: 4200,
    maxPowerW: 11000,
    totalRemainingW: 20000,
    stationRemainingW: 11000,
    pvRemainingW: allocation.evcsCapW,
  });
  assert.deepStrictEqual(pending, {
    intentW: 0,
    totalDemandW: 0,
    reason: 'below-technical-minimum',
  });
  assert.strictEqual(reserveEvcs(runtime, allocation.evcsCapW, pending), 0);
  assert.strictEqual(runtime.remainingPvW, 5300);
  assert.strictEqual(runtime.getPvGrant({ key: 'storage', requestedW: 30000, pvOnly: true }).grantW, 5300);
}

// Ist ein reiner PV-Start technisch moeglich, wird nur das Startminimum und
// nicht der komplette Prozent-Cap vorgemerkt. Der Rest bleibt beim Speicher.
{
  const { runtime, allocation } = makeRuntime(10000, 80);
  const pending = computePendingPvStartIntentW({
    mode: 'pv',
    enabled: true,
    online: true,
    connected: true,
    controlBasis: 'powerW',
    status: 'SuspendedEVSE',
    currentPowerW: 0,
    currentPvIntentW: 0,
    minPowerW: 4200,
    technicalMinW: 4200,
    maxPowerW: 11000,
    totalRemainingW: 20000,
    stationRemainingW: 11000,
    pvRemainingW: allocation.evcsCapW,
  });
  assert.strictEqual(pending.intentW, 4200);
  assert.strictEqual(pending.totalDemandW, 4200);
  assert.strictEqual(reserveEvcs(runtime, allocation.evcsCapW, pending), 4200);
  assert.strictEqual(runtime.remainingPvW, 5800);
  assert.strictEqual(runtime.getPvGrant({ key: 'storage', requestedW: 30000, pvOnly: true }).grantW, 5800);
}

// Min+PV reserviert vor dem Start nur die netzgestuetzte Basis im Gesamtbudget.
// PV wird erst bei realem/kommandiertem Ladebetrieb belegt.
{
  const { runtime, allocation } = makeRuntime(6000, 50);
  const pending = computePendingPvStartIntentW({
    mode: 'minpv',
    enabled: true,
    online: true,
    connected: true,
    controlBasis: 'powerW',
    status: 'SuspendedEVSE',
    currentPowerW: 0,
    currentPvIntentW: 0,
    minPowerW: 4200,
    technicalMinW: 4200,
    maxPowerW: 11000,
    totalRemainingW: 20000,
    stationRemainingW: 11000,
    pvRemainingW: 6000,
  });
  assert.strictEqual(pending.intentW, 0);
  assert.strictEqual(pending.totalDemandW, 4200);
  assert.strictEqual(reserveEvcs(runtime, allocation.evcsCapW, pending), 0);
  assert.strictEqual(runtime.remainingPvW, 6000);
  assert.strictEqual(runtime.getPvGrant({ key: 'storage', requestedW: 30000, pvOnly: true }).grantW, 6000);
}

console.log('[pv-unused-evcs-release-to-storage] OK: Nicht genutzte EVCS-PV-Anteile werden vollstaendig an den Speicher freigegeben.');
