#!/usr/bin/env node
'use strict';

/**
 * Regression 0.8.112: Feste PV-Aufteilung kann abgeschaltet werden.
 * Dann reservieren EVCS/weitere Verbraucher nur reale Leistung bzw. ein
 * technisch fahrbares Startminimum. Der Speicher erhält den gesamten Rest.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { buildPvSurplusAllocation, makeBudgetRuntime, normalizePvSurplusPriority } = require('../ems/modules/core-limits');

assert.strictEqual(normalizePvSurplusPriority('dynamic'), 'dynamic');
assert.strictEqual(normalizePvSurplusPriority('off'), 'dynamic');

const disabled = buildPvSurplusAllocation(10000, 'both', 80, {
  allocationEnabled: false,
  storageEligible: true,
  storageMaxChargeW: 30000,
});
assert.strictEqual(disabled.mode, 'dynamic');
assert.strictEqual(disabled.allocationEnabled, false);
assert.strictEqual(disabled.evcsCapW, 10000, 'Ohne feste Aufteilung darf EVCS nur durch reale Nachfrage begrenzt werden');
assert.strictEqual(disabled.storageGuaranteedW, 0, 'Ohne feste Aufteilung gibt es keinen kuenstlichen Vorabanteil');

const adapter = { setStateAsync(){ return Promise.resolve(); }, updateValue(){} };
const runtime = makeBudgetRuntime(adapter, {
  ts: Date.now(), raw: {},
  gates: { total: { effectiveW: null }, pv: { effectiveW: 10000 }, pvAllocation: disabled },
});

runtime.reserve({ key: 'evcs', app: 'chargingManagement', requestedW: 0, reserveW: 0, pvReserveW: 0, actualW: 0, mode: 'pv' });
assert.strictEqual(runtime.getPvGrant({ key: 'storage', requestedW: 30000, pvOnly: true }).grantW, 10000,
  'Ohne aktiven Verbraucher muss der komplette PV-Rest zum Speicher gehen');

runtime.reserve({ key: 'storage', app: 'storageControl', requestedW: 10000, reserveW: 0, pvReserveW: 10000, actualW: 10000, pvOnly: true, mode: 'dynamic' });
assert.strictEqual(runtime.remainingPvW, 0);

const runtimeWithDemand = makeBudgetRuntime(adapter, {
  ts: Date.now(), raw: {},
  gates: { total: { effectiveW: null }, pv: { effectiveW: 10000 }, pvAllocation: disabled },
});
runtimeWithDemand.reserve({ key: 'evcs', app: 'chargingManagement', requestedW: 4140, reserveW: 4140, pvReserveW: 4140, actualW: 4140, mode: 'pv' });
assert.strictEqual(runtimeWithDemand.getPvGrant({ key: 'storage', requestedW: 30000, pvOnly: true }).grantW, 5860,
  'Speicher muss exakt den nach echter EVCS-Reservierung verbleibenden Rest erhalten');

const html = fs.readFileSync(path.join(__dirname, '../www/settings.html'), 'utf8');
assert(html.includes('data-key="pvSurplusAllocationEnabled"'), 'Kundenschalter fuer feste PV-Aufteilung fehlt');
const core = fs.readFileSync(path.join(__dirname, '../src-ts/runtime-executables/ems/modules/core-limits.ts'), 'utf8');
assert(core.includes("readCacheValue('settings.pvSurplusAllocationEnabled'"), 'Core liest den Kundenschalter nicht');

console.log('[pv-surplus-dynamic-storage-remainder] OK: ohne feste Aufteilung geht ungenutzter PV-Rest voll an den Speicher.');
