#!/usr/bin/env node
'use strict';

/**
 * Regression 0.8.99: Ein einziges zentrales PV-Budget orchestriert EVCS,
 * Speicher und alle nachgelagerten Verbraucher.
 *
 * Feldszenario:
 * - PV-Erzeugung 17,7 kW
 * - NVP-Einspeisung 7,4 kW
 * - Speicher lädt bereits 3,0 kW
 * - Kundeneinstellung 80 % E-Mobilität / 20 % Speicher
 * - Wallbox ist verbunden und wartet als `SuspendedEVSE`
 *
 * Erwartung:
 * - physikalisches PV-Potential 10,4 kW
 * - nach 0,5 kW Reserve zentrales Budget 9,9 kW
 * - EVCS-Maximalgrant 7,92 kW
 * - noch nicht gestartete Ladepunkte reservieren davon nur ihre technisch
 *   fahrbaren Startminima
 * - der gesamte ungenutzte EVCS-Anteil bleibt im selben EMS-Zyklus fuer den
 *   Speicher verfuegbar
 * - der Pending-EVCS-Intent reduziert ausschließlich remainingPvW, nicht das
 *   Gesamt-/Netzbudget.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  makeBudgetRuntime,
  buildPvSurplusAllocation,
  computePvBudgetFlowRawW,
} = require('../ems/modules/core-limits');
const {
  resolveChargingPvBudgetControl,
  computePendingPvStartIntentW,
  computePendingPvStartTotalBudgetW,
  computeEvcsPvBudgetReservationW,
} = require('../ems/modules/charging-management');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const flowRawW = computePvBudgetFlowRawW({
  gridW: -7400,
  flexUsedW: 0,
  storageChargeW: 3000,
  storageDischargeW: 0,
});
assert.strictEqual(flowRawW, 10400, '7,4 kW Export + 3,0 kW Speicherladung müssen 10,4 kW PV-Potential ergeben');

const pvReserveW = 500;
const effectivePvW = Math.max(0, flowRawW - pvReserveW);
assert.strictEqual(effectivePvW, 9900);

const allocation = buildPvSurplusAllocation(effectivePvW, 'both', 80, {
  storageEligible: true,
  storageMaxChargeW: 30000,
});
assert.strictEqual(allocation.evcsCapW, 7920, '80 % E-Mobilität müssen 7,92 kW EVCS-Cap ergeben');
assert.strictEqual(allocation.storageGuaranteedW, 1980, '20 % Speicher müssen 1,98 kW Speicheranteil ergeben');

const published = new Map();
const adapter = {
  setStateAsync(id, val) {
    published.set(id, val);
    return Promise.resolve();
  },
  updateValue(id, val) {
    published.set(id, val);
  },
};
const runtime = makeBudgetRuntime(adapter, {
  ts: Date.now(),
  raw: {
    gridW: -7400,
    pvPowerW: 17700,
    storageChargeW: 3000,
    pvReserveW,
  },
  gates: {
    total: { effectiveW: null },
    pv: { rawW: flowRawW, effectiveW: effectivePvW },
    pvAllocation: allocation,
  },
});

const chargingBudget = resolveChargingPvBudgetControl({
  centralBudget: runtime,
  now: Date.now(),
  maxAgeMs: 30000,
  localRawW: 0,
  localEffectiveW: 0,
});
assert.strictEqual(chargingBudget.authoritative, true, 'Zentrales EMS-Budget muss die EVCS-Quelle sein');
assert.strictEqual(chargingBudget.source, 'central-ems-budget');
assert.strictEqual(chargingBudget.totalW, 9900);
assert.strictEqual(chargingBudget.evcsCapW, 7920, 'Lokale 0-W-Schätzung darf den zentralen EVCS-Cap nicht überschreiben');

// Sobald eine zentrale Runtime existiert, darf auch ein kurzzeitig veralteter
// Snapshot kein lokales EVCS-Parallelbudget aktivieren.
const staleCentralBudget = makeBudgetRuntime(adapter, {
  ...runtime.peek(),
  ts: Date.now() - 120000,
});
staleCentralBudget.ts = Date.now() - 120000;
const staleBlocked = resolveChargingPvBudgetControl({
  centralBudget: staleCentralBudget,
  now: Date.now(),
  maxAgeMs: 30000,
  localRawW: 10000,
  localEffectiveW: 9500,
});
assert.strictEqual(staleBlocked.authoritative, true, 'vorhandener Core bleibt auch bei Stale autoritativ');
assert.strictEqual(staleBlocked.evcsCapW, 0, 'staler Core muss PV sicher blockieren statt ein lokales Budget zu starten');
assert.strictEqual(staleBlocked.source, 'central-ems-budget-stale-blocked');

// Die lokale PV-Start-Hysterese darf den produktiven Sollwert noch auf 0 W
// halten. Fuer den Pending-Intent bleibt trotzdem der zentrale Gesamt-Grant
// massgeblich, damit der Speicher den EVCS-Anteil nicht waehrend der
// Startverzoegerung uebernimmt.
const pendingStartTotalW = computePendingPvStartTotalBudgetW({
  localRemainingW: 0,
  centralTotalGrantW: 20000,
  activeDemandW: 0,
});
assert.strictEqual(pendingStartTotalW, 20000, 'Lokale 0-W-Start-Hysterese darf den zentralen EVCS-Intent nicht blockieren');

const wallboxOne = computePendingPvStartIntentW({
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
  maxPowerW: 5000,
  totalRemainingW: pendingStartTotalW,
  stationRemainingW: 11000,
  pvRemainingW: chargingBudget.evcsCapW,
});
assert.strictEqual(wallboxOne.intentW, 4140, 'Ein wartender Ladepunkt darf nur sein technisches Startminimum reservieren');

const wallboxTwo = computePendingPvStartIntentW({
  mode: 'pv',
  enabled: true,
  online: true,
  connected: true,
  controlBasis: 'power',
  status: 'SuspendedEVSE',
  currentPowerW: 0,
  currentPvIntentW: 0,
  minPowerW: 1380,
  technicalMinW: 1380,
  maxPowerW: 11000,
  totalRemainingW: pendingStartTotalW - wallboxOne.totalDemandW,
  stationRemainingW: 6000,
  pvRemainingW: chargingBudget.evcsCapW - wallboxOne.intentW,
});
assert.strictEqual(wallboxTwo.intentW, 1380, 'Zweiter Ladepunkt darf nur sein technisches Startminimum reservieren');

const pendingPvIntentW = wallboxOne.intentW + wallboxTwo.intentW;
assert.strictEqual(pendingPvIntentW, 5520, 'Pending-Intent darf den ungenutzten prozentualen EVCS-Anteil nicht vorsorglich blockieren');
const pendingTotalDemandW = wallboxOne.totalDemandW + wallboxTwo.totalDemandW;
const evcsPvReserveW = computeEvcsPvBudgetReservationW({
  reserveW: 0,
  demandW: 0,
  pendingDemandW: pendingTotalDemandW,
  actualPvW: 0,
  intentPvW: 0,
  pendingIntentPvW: pendingPvIntentW,
  allocationCapW: chargingBudget.evcsCapW,
});
assert.strictEqual(evcsPvReserveW, 5520);

const totalBeforeEvcs = runtime.remainingTotalW;
runtime.reserve({
  key: 'evcs',
  app: 'chargingManagement',
  label: 'Ladepunkte',
  priority: 100,
  actualW: 0,
  requestedW: pendingTotalDemandW,
  reserveW: 0,
  pvReserveW: evcsPvReserveW,
  pvOnly: false,
  mode: 'pv',
});
assert.strictEqual(runtime.remainingPvW, 4380, 'Ungenutzter EVCS-Anteil muss im selben Tick fuer den Speicher frei bleiben');
assert.strictEqual(runtime.remainingTotalW, totalBeforeEvcs, 'Pending-PV-Intent darf das Gesamt-/Netzbudget nicht reduzieren');
assert.strictEqual(runtime.consumers.evcs.pvReserveW, 5520);
assert.strictEqual(runtime.consumers.evcs.reserveW, 0);

const storageGrant = runtime.getPvGrant({
  key: 'storage',
  requestedW: 30000,
  pvOnly: true,
});
assert.strictEqual(storageGrant.grantW, 4380, 'Speicher muss den gesamten ungenutzten Rest nach echten EVCS-Reservierungen erhalten');

runtime.reserve({
  key: 'storage',
  app: 'storageControl',
  priority: 150,
  requestedW: storageGrant.grantW,
  reserveW: 0,
  pvReserveW: storageGrant.grantW,
  pvOnly: true,
  mode: 'both',
});
assert.strictEqual(runtime.remainingPvW, 0);
assert.strictEqual(runtime.getPvGrant({ key: 'thermal', requestedW: 5000, pvOnly: true }).grantW, 0);
assert.strictEqual(runtime.getPvGrant({ key: 'heatingRod', requestedW: 5000, pvOnly: true }).grantW, 0);
assert.deepStrictEqual(runtime.order.slice(0, 2), ['evcs', 'storage'], 'Prioritätsreihenfolge muss EVCS vor Speicher abbilden');

// Kein aktiver oder pending Ladebedarf: Die prozentuale EVCS-Freigabe ist nur
// ein Maximalcap und darf nicht als Ghost-Reservierung wirken. Der Speicher muss
// den kompletten physikalischen PV-Rest erhalten.
const idleAllocation = buildPvSurplusAllocation(5300, 'both', 50, {
  storageEligible: true,
  storageMaxChargeW: 30000,
});
const idleRuntime = makeBudgetRuntime(adapter, {
  ts: Date.now(),
  raw: { gridW: -2700, storageChargeW: 2600 },
  gates: {
    total: { effectiveW: null },
    pv: { rawW: 5300, effectiveW: 5300 },
    pvAllocation: idleAllocation,
  },
});
const idleEvcsReserveW = computeEvcsPvBudgetReservationW({
  reserveW: 0,
  demandW: 0,
  pendingDemandW: 0,
  actualPvW: 0,
  intentPvW: 0,
  pendingIntentPvW: 0,
  allocationCapW: idleAllocation.evcsCapW,
});
assert.strictEqual(idleEvcsReserveW, 0, 'Ohne Ladebedarf darf kein EVCS-PV-Budget reserviert werden');
idleRuntime.reserve({
  key: 'evcs',
  app: 'chargingManagement',
  priority: 100,
  requestedW: 0,
  reserveW: 0,
  pvReserveW: idleEvcsReserveW,
  pvOnly: false,
  mode: 'pv',
});
assert.strictEqual(idleRuntime.remainingPvW, 5300, '50-%-EVCS-Cap darf ohne reale Reservierung keinen PV-Rest abschneiden');
assert.strictEqual(
  idleRuntime.getPvGrant({ key: 'storage', requestedW: 30000, pvOnly: true }).grantW,
  5300,
  'Speicher muss ohne aktive/reservierte Verbraucher den kompletten PV-Ueberschuss erhalten',
);

// Netz-/Gesamtbudget wird ueber dieselbe Runtime sequenziell verteilt. Damit
// kann ein tarif- oder reservebedingtes Speicher-Netzladen nach der EVCS-
// Reservierung nicht mehr parallel zu Thermik/Heizstab dasselbe Anschlussbudget
// verwenden.
const totalRuntime = makeBudgetRuntime(adapter, {
  ts: Date.now(),
  raw: { gridW: 0 },
  gates: {
    total: { effectiveW: 9000 },
    pv: { rawW: 0, effectiveW: 0 },
    pvAllocation: buildPvSurplusAllocation(0, 'both', 80, { storageEligible: true }),
  },
});
totalRuntime.reserve({
  key: 'evcs',
  app: 'chargingManagement',
  priority: 100,
  requestedW: 3000,
  reserveW: 3000,
  pvReserveW: 0,
  pvOnly: false,
  mode: 'auto',
});
assert.strictEqual(totalRuntime.getTotalGrant({ key: 'storage', requestedW: 5000 }).grantW, 5000);
totalRuntime.reserve({
  key: 'storage',
  app: 'storageControl',
  priority: 150,
  requestedW: 5000,
  reserveW: 5000,
  pvReserveW: 0,
  pvOnly: false,
  mode: 'tarif',
});
assert.strictEqual(totalRuntime.getTotalGrant({ key: 'thermal', requestedW: 5000 }).grantW, 1000);
totalRuntime.reserve({
  key: 'thermal',
  app: 'thermalControl',
  priority: 200,
  requestedW: 1000,
  reserveW: 1000,
  pvReserveW: 0,
  pvOnly: false,
  mode: 'tariffNegative',
});
assert.strictEqual(totalRuntime.getTotalGrant({ key: 'heatingRod', requestedW: 5000 }).grantW, 0);
assert.deepStrictEqual(totalRuntime.order, ['evcs', 'storage', 'thermal']);

const vehicleNotRequesting = computePendingPvStartIntentW({
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
assert.strictEqual(vehicleNotRequesting.intentW, 0, 'SuspendedEV darf keinen EVCS-PV-Anteil blockieren');

// Strukturprüfung: Die lokale EVCS-Bilanz bleibt Diagnose/Fallback, der
// Speicher rekonstruiert keine zweite 80/20-Verteilung aus Prozentwerten.
const chargingSource = read('src-ts/runtime-executables/ems/modules/charging-management.ts');
assert(chargingSource.includes('resolveChargingPvBudgetControl({'), 'EVCS muss den zentralen Budgetresolver verwenden');
assert(chargingSource.includes('zentrale PV-Intent-Reservierung vor Speicherregelung'), 'EVCS-Start-Intent muss vor dem Speicher reserviert werden');
assert(chargingSource.includes('computePendingPvStartTotalBudgetW({'), 'PV-Start-Hysterese muss den zentralen Gesamt-Grant fuer den Pending-Intent verwenden');
assert(chargingSource.includes('pvCentralRemainingAfterEvcsW'), 'EVCS muss den zentralen Rest diagnostizieren');
assert(!chargingSource.includes('computePendingPvDemandIntentW'), 'Alte parallele Pending-Logik muss entfernt bleiben');

const storageSource = read('src-ts/runtime-executables/ems/modules/storage-control.ts');
assert(storageSource.includes('central-grant-after-evcs'), 'Speicher muss den zentralen Grant nach EVCS verwenden');
assert(storageSource.includes('Rekonstruktion aus Allocation-Prozenten waere ein Parallelbudget'), 'Lokale Speicher-Rekonstruktion muss ausdrücklich entfernt sein');
assert(!storageSource.includes("pvBudgetResolution = 'allocation-reconciled'"), 'Speicher darf kein zweites Allocation-Budget rekonstruieren');
assert(storageSource.includes('Finaler zentraler Gesamtbudget-Cap fuer Speicher-Netzladen'), 'Speicher-Netzladen muss den zentralen Gesamt-Grant verwenden');
assert(storageSource.includes('reserveW: pvSource ? pvBudgetReservedW : (gridChargeSource ? totalBudgetStorageReservedW : 0)'), 'Speicher muss PV-Laden im PV-Budget und Netzladen im Gesamtbudget fuer nachgelagerte Verbraucher reservieren');
assert(storageSource.includes("'central-stale-blocked'"), 'Speicher muss einen stalen zentralen Snapshot blockieren statt lokal zu rekonstruieren');

const thermalSource = read('src-ts/runtime-executables/ems/modules/thermal-control.ts');
assert(thermalSource.includes('ems.budget.central-stale-or-invalid-blocked'), 'Thermik muss bei vorhandenem, aber unbrauchbarem Core sicher blockieren');
const heatingSource = read('src-ts/runtime-executables/ems/modules/heating-rod-control.ts');
assert(heatingSource.includes('ems.budget.central-stale-or-invalid-blocked'), 'Heizstab muss bei vorhandenem, aber unbrauchbarem Core sicher blockieren');
const coreSource = read('src-ts/runtime-executables/ems/modules/core-limits.ts');
assert(coreSource.includes('const flexibleFlowMaxAgeMs = Math.max(staleMs * 3, 45000);'), 'alte flexible Verbraucherwerte brauchen ein endliches Freshness-Fenster');

const managerSource = read('src-ts/runtime-executables/ems/module-manager.ts');
const order = ['coreLimits', 'chargingManagement', 'speicherRegelung', 'thermalControl', 'heatingRodControl']
  .map((key) => managerSource.indexOf(`key: '${key}'`));
assert(order.every((index) => index >= 0), 'Alle zentralen Module müssen registriert sein');
for (let i = 1; i < order.length; i += 1) {
  assert(order[i] > order[i - 1], 'Modulreihenfolge muss Core → EVCS → Speicher → Thermik → Heizstab sein');
}

console.log('[central-pv-budget-orchestration] OK: Ein zentrales PV-Budget verteilt 80/20 sequenziell auf EVCS, Speicher und nachgelagerte Verbraucher.');
