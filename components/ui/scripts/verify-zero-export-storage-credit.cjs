#!/usr/bin/env node
'use strict';
/**
 * NexoWatt Regression (DE): Hausvorrang und belegter Netto-Speicheranteil.
 * Rein synthetische W/ms; keine Hardware. Prüft insbesondere Ghost-Budget aus
 * akzeptierten Requests, Brutto-Farmleistung, Messausfall und fehlenden Gegenkanälen.
 */
const assert = require('node:assert/strict');
const { resolveZeroExportStorageCreditW: credit, resolveZeroExportStorageCredit: liveCredit }
  = require('../ems/services/zero-export-storage-credit');
const now = 1800000000000;
const sample = { now, mode: { active: true }, gridW: 1000, gridFresh: true,
  storageFresh: true, safetyReady: true, externalBlocked: false, tariffCurtail: false,
  pvW: 0, pvFresh: false, storageDischargeW: 5000 };
const input = { now, sample, budgetTs: now, measuredNetDischargeW: 5000,
  storageNetFresh: true, acceptedW: 5000, acceptedTs: now, commandEffective: true,
  acceptedTopology: 'single', requestedTopology: 'single', acceptedSource: 'evcs',
  eligibleActualW: 4000, eligibleMetersFresh: true };

// 2 kW Hauslast + 4 kW EV, 5 kW Batterie, 1 kW Netz: nur 3 kW für das EV.
assert.equal(credit(input), 3000);
assert.equal(credit({ ...input, acceptedW: 1500 }), 1500);
assert.equal(credit({ ...input, pendingOtherW: 750 }), 2250);
assert.equal(credit({ ...input, eligibleActualW: 0, sample: { ...sample, gridW: 0 } }), 0,
  'Hausversorgung/akzeptierter Befehl startet kein EV ohne belegten Anteil');
assert.equal(credit({ ...input, eligibleActualW: 1380, sample: { ...sample, gridW: 1380 } }), 0,
  'Bestehende reine Netzladung ist noch keine Batteriezuteilung');
assert.equal(credit({ ...input, eligibleActualW: 4000, measuredNetDischargeW: 700,
  sample: { ...sample, gridW: -1000 } }), 700, 'Export erzeugt keine zusätzliche Batterie');
assert.equal(credit({ ...input, acceptedSource: 'evcs:accepted' }), 3000);
assert.equal(credit({ ...input, acceptedTs: now - 5000, budgetTs: now - 5000,
  sample: { ...sample, now: now - 5000 } }), 3000);

for (const patch of [
  { now: null }, { now: now - 1 }, { budgetTs: now - 5001 }, { budgetTs: now + 1 },
  { acceptedTs: now - 5001 }, { acceptedTs: now + 1 }, { acceptedTs: 0 },
  { commandEffective: false }, { storageNetFresh: false }, { eligibleMetersFresh: false },
  { acceptedSource: 'self' }, { acceptedTopology: 'farm' }, { requestedTopology: 'none' },
  { acceptedW: 0 }, { acceptedW: NaN }, { measuredNetDischargeW: NaN },
  { measuredNetDischargeW: -10 }, { eligibleActualW: true }, { eligibleActualW: -1 },
  { pendingOtherW: null }, { pendingOtherW: -1 }, { pendingOtherW: Infinity },
]) assert.equal(credit({ ...input, ...patch }), 0, JSON.stringify(patch));
for (const patch of [
  { mode: { active: false } }, { now: now - 5001 }, { now: now + 1 },
  { gridFresh: false }, { storageFresh: false }, { safetyReady: false },
  { externalBlocked: true }, { tariffCurtail: true }, { gridW: null }, { gridW: true },
]) assert.equal(credit({ ...input, sample: { ...sample, ...patch } }), 0, JSON.stringify(patch));

let flow = { dischargeW: 5000, src: 'batterySigned', derived: false, staleMs: { batteryPower: 0 } };
let authority = { writerActive: true, selectedTopology: 'single' };
let flowRequest;
const adapter = { config: { gridConstraints: { zeroExportEnabled: true }, datapoints: { batteryPower: 'battery.w' } },
  _emsBudget: { ts: now }, _zeroExportPvCoordinator: { sample },
  _nwGetStorageControlAuthority: () => authority,
  _nwResolveBatteryFlowFromCache: (request) => { flowRequest = request; return flow; } };
assert.equal(liveCredit(adapter, input), 3000);
assert.deepEqual(flowRequest, { now, maxAgeMs: 5000, strictStale: true, deadbandW: 0 });
flow = { ...flow, derived: true }; assert.equal(liveCredit(adapter, input), 0);
flow = { ...flow, derived: false, staleMs: { batteryPower: 5001 } }; assert.equal(liveCredit(adapter, input), 0);
flow = { ...flow, src: 'mapped-missing', staleMs: { batteryPower: 0 } }; assert.equal(liveCredit(adapter, input), 0);

adapter.config.datapoints.storageChargePower = 'battery.charge';
adapter.config.datapoints.storageDischargePower = 'battery.discharge';
flow = { dischargeW: 900, grossDischargeW: 5000, grossChargeW: 4100,
  src: 'chargeDischarge-net-normalized', derived: false,
  staleMs: { batteryPower: 0, storageChargePower: 0, storageDischargePower: 0 } };
assert.equal(liveCredit(adapter, input), 900, 'Split-Netto statt Brutto');
flow.staleMs.storageChargePower = 5001;
assert.equal(liveCredit(adapter, input), 0, 'Frischer signed DP heilt keinen veralteten tatsächlich genutzten Split-Kanal');
flow.staleMs.storageChargePower = 0;
delete adapter.config.datapoints.storageChargePower;
assert.equal(liveCredit(adapter, input), 0, 'Ein Split-Kanal beweist die Gegenrichtung nicht');

authority = { writerActive: true, selectedTopology: 'farm' };
const farmInput = { ...input, requestedTopology: 'farm', acceptedTopology: 'farm' };
flow = { dischargeW: 600, grossDischargeW: 5000, grossChargeW: 4400,
  src: 'storageFarmNet', derived: false, staleMs: { farmPower: 0, farmCharge: 0, farmDischarge: 0 } };
assert.equal(liveCredit(adapter, farmInput), 600, 'Gemischte Farm liefert ausschließlich Nettoleistung');
assert.equal(liveCredit(adapter, input), 0, 'Aktuelle Topologie muss zur Annahme passen');
flow.staleMs.farmCharge = null; assert.equal(liveCredit(adapter, farmInput), 0);
flow.staleMs.farmCharge = 0;
authority.writerActive = false; assert.equal(liveCredit(adapter, farmInput), 0);
authority.writerActive = true;
adapter.config.gridConstraints.zeroExportEnabled = false;
assert.equal(liveCredit(adapter, farmInput), 0, 'Live-Abschaltung überstimmt ein altes aktives Sample');

console.log('[zero-export-storage-credit] OK: frischer Nettoanteil, Hausvorrang, Reserven, Akzeptanz und Farm/Split-Frische');
