// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-pv-surplus-dynamic-storage-remainder.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-pv-surplus-dynamic-storage-remainder.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Produktive Originalquellen liegen unter
 * src-ts/runtime-executables/ bzw. den im generierten JS genannten TS-Pfaden.
 * Dort ändern, Laufzeit erzeugen und danach die Spiegel synchronisieren.
 * Build-/Prüfskripte ohne TS-Original werden weiterhin unter scripts/ gepflegt.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: 8b11618bd20d838990142cb710c133b361c32f61b194de1f73747a47898caf48
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

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
