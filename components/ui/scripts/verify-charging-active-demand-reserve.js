#!/usr/bin/env node
'use strict';

/**
 * Regression: Reale Ladeleistung und noch wartender PV-Start-Intent muessen
 * getrennt im zentralen Budget verbucht werden.
 *
 * - Reale/kommandierte EVCS-Leistung reduziert das Gesamtbudget.
 * - Ein verbundener `SuspendedEVSE`-Ladepunkt reserviert vor dem Start nur
 *   seine technisch fahrbare Mindestleistung; ungenutzter PV-Anteil bleibt
 *   fuer Speicher und nachgelagerte Verbraucher frei.
 * - Dieser Pending-Intent reduziert nur das PV-Restbudget, nicht das Netzbudget.
 */
const assert = require('assert');
const fs = require('fs');
const {
  computePendingPvStartIntentW,
  computePendingPvStartTotalBudgetW,
  computeEvcsPvBudgetReservationW,
} = require('../ems/modules/charging-management');

function read(p) { return fs.readFileSync(p, 'utf8'); }
function must(file, needle, label = needle) {
  const s = read(file);
  if (!s.includes(needle)) {
    console.error(`[charging-active-demand-reserve] missing ${label}: ${needle}`);
    process.exit(1);
  }
}
function mustNot(file, needle, label = needle) {
  const s = read(file);
  if (s.includes(needle)) {
    console.error(`[charging-active-demand-reserve] forbidden ${label}: ${needle}`);
    process.exit(1);
  }
}

const cm = 'src-ts/runtime-executables/ems/modules/charging-management.ts';
const pkg = JSON.parse(read('package.json'));
if (!/^\d+\.\d+\.\d+$/.test(String(pkg.version || ''))) {
  console.error('[charging-active-demand-reserve] invalid SemVer');
  process.exit(1);
}

must(cm, 'let evcsActiveDemandReserveW = 0;', 'active-demand reserve accumulator');
must(cm, 'const activeChargingDemand = !!(', 'active-demand predicate');
must(cm, 'let evcsPendingDemandPvIntentW = 0;', 'pending PV intent accumulator');
must(cm, 'function computePendingPvStartIntentW(', 'pending PV helper');
must(cm, 'function computePendingPvStartTotalBudgetW(', 'pending total-budget helper');
must(cm, 'status: w.connectorStatus', 'connector status reaches pending helper');
must(cm, 'centralTotalGrantW: evcsPendingCentralTotalGrantW', 'pending intent uses central total grant during PV start hysteresis');
must(cm, 'let evcsControlTotalPvIntentW = Math.max(0, evcsControlPvIntentW + evcsControlPendingPvIntentW);', 'active and waiting PV intent are combined and can be recomputed from the final plan');
must(cm, "chargingManagement.control.pvPendingDemandIntentW", 'pending demand diagnostic state');
must(cm, "chargingManagement.control.pvCentralRemainingAfterEvcsW", 'central remaining PV diagnostic state');
must(cm, 'const evcsReserveW = evcsControlReserveW;', 'central EMS reserve uses active demand');
must(cm, 'requestedW: Math.max(0, evcsReserveW + evcsControlPendingDemandW)', 'central request includes active load plus waiting PV intent');
must(cm, 'reserveW: evcsReserveW', 'only active load reduces total budget');
must(cm, 'pendingIntentPvW: evcsControlPendingPvIntentW', 'pending intent reaches central PV reservation');
mustNot(cm, 'pvAvailableState ? evcsControlPvReserveW : 0', 'single-tick PV hysteresis must not clear PV reservation');
mustNot(cm, 'computePendingPvDemandIntentW', 'obsolete parallel pending helper removed');

const pendingTotalW = computePendingPvStartTotalBudgetW({
  localRemainingW: 0,
  centralTotalGrantW: 10920,
  activeDemandW: 3000,
});
assert.strictEqual(pendingTotalW, 7920, 'Pending start must use central remaining total budget after active EVCS demand');

const suspendedEvse = computePendingPvStartIntentW({
  mode: 'pv',
  enabled: true,
  online: true,
  connected: true,
  controlBasis: 'power',
  status: 'SuspendedEVSE',
  currentPowerW: 0,
  currentPvIntentW: 0,
  minPowerW: 4140,
  technicalMinW: 4140,
  maxPowerW: 11000,
  totalRemainingW: pendingTotalW,
  stationRemainingW: 11000,
  pvRemainingW: 7920,
});
assert.strictEqual(suspendedEvse.intentW, 4140, 'SuspendedEVSE darf vor dem Start nur das technische PV-Startminimum reservieren');
assert.strictEqual(suspendedEvse.reason, 'pv-start-minimum-intent');

const suspendedEv = computePendingPvStartIntentW({
  mode: 'pv',
  enabled: true,
  online: true,
  connected: true,
  controlBasis: 'power',
  status: 'SuspendedEV',
  minPowerW: 4140,
  technicalMinW: 4140,
  maxPowerW: 11000,
  totalRemainingW: 20000,
  stationRemainingW: 11000,
  pvRemainingW: 7920,
});
assert.strictEqual(suspendedEv.intentW, 0, 'Ein Fahrzeug ohne Ladeanforderung darf kein PV-Budget blockieren');
assert.strictEqual(suspendedEv.reason, 'vehicle-not-requesting');

const reserve = computeEvcsPvBudgetReservationW({
  reserveW: 0,
  demandW: 0,
  pendingDemandW: suspendedEvse.intentW,
  actualPvW: 0,
  intentPvW: 0,
  pendingIntentPvW: suspendedEvse.intentW,
  allocationCapW: 7920,
});
assert.strictEqual(reserve, 4140, 'Pending-Intent darf vor dem Start nur das technische Minimum zentral reservieren');

const activePlusPending = computeEvcsPvBudgetReservationW({
  reserveW: 3000,
  demandW: 3000,
  pendingDemandW: 4920,
  actualPvW: 3000,
  intentPvW: 3000,
  pendingIntentPvW: 4920,
  allocationCapW: 7920,
});
assert.strictEqual(activePlusPending, 7920, 'Aktive und wartende PV-Leistung muessen gemeinsam bis zum Cap reserviert werden');

console.log('[charging-active-demand-reserve] OK: EVCS-Aktivlast und Pending-PV-Intent werden zentral und ohne Doppelbuchung reserviert.');
