// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-evcs-storage-policy-mode-scope.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-evcs-storage-policy-mode-scope.js
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
 * Original-Hash: de952b7cf4239be88d29f136b98ee865e36b26493bf7c44a889a1492a1ccfad4
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
 * Regression 0.8.146: EVCS-Speicherschutz nur in Auto, Boost und Min+PV.
 *
 * Verbindliche Regeln:
 * - Reine PV-Ueberschussladung nutzt ausschliesslich den zentralen PV-Rest.
 * - In `pv` duerfen weder Speicherschutz noch Speicher-Assist eine Last an die
 *   Speicherregelung melden.
 * - Die gespeicherte Kundenwahl bleibt erhalten und wird nach dem Wechsel zu
 *   Auto, Boost oder Min+PV wieder wirksam.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const {
  resolveEvcsStoragePolicy,
  resolveEvcsStoragePolicyActualLoad,
} = require(path.join(root, 'ems', 'modules', 'charging-management.js'));

assert.strictEqual(typeof resolveEvcsStoragePolicy, 'function', 'storage policy helper missing');
assert.strictEqual(typeof resolveEvcsStoragePolicyActualLoad, 'function', 'storage actual-load helper missing');

const autoProtect = resolveEvcsStoragePolicy(true, false, 'auto');
assert.strictEqual(autoProtect.mode, 'protect');
assert.strictEqual(autoProtect.protectionRequested, true, 'Auto must apply storage protection');
assert.strictEqual(autoProtect.assistRequested, false);

const autoAssist = resolveEvcsStoragePolicy(true, true, 'auto');
assert.strictEqual(autoAssist.mode, 'assist');
assert.strictEqual(autoAssist.assistRequested, true, 'Auto must allow storage assist when selected');
assert.strictEqual(autoAssist.protectionRequested, false);

const boostProtect = resolveEvcsStoragePolicy(true, false, 'boost');
assert.strictEqual(boostProtect.protectionRequested, true, 'Boost must apply storage protection');

const minPvAssist = resolveEvcsStoragePolicy(true, true, 'min+pv');
assert.strictEqual(minPvAssist.assistRequested, true, 'Min+PV must allow storage assist when selected');

const pvProtect = resolveEvcsStoragePolicy(true, false, 'pv');
assert.strictEqual(pvProtect.mode, 'normal', 'pure PV must expose a neutral runtime policy');
assert.strictEqual(pvProtect.protectionRequested, false, 'pure PV must not protect an EVCS load from storage');
assert.strictEqual(pvProtect.assistRequested, false, 'pure PV must not request storage assist');

const pvAssist = resolveEvcsStoragePolicy(true, true, 'pv_surplus');
assert.strictEqual(pvAssist.mode, 'normal', 'PV aliases must also neutralize the runtime policy');
assert.strictEqual(pvAssist.protectionRequested, false);
assert.strictEqual(pvAssist.assistRequested, false);

const pvActualLoad = resolveEvcsStoragePolicyActualLoad({
  actualPowerW: 4200,
  meterFresh: true,
  online: true,
  enabled: true,
  vehicleDemandConfirmed: true,
  vehicleStateNormalized: 'charging',
  activityThresholdW: 200,
  storageProtectionRequested: pvProtect.protectionRequested,
  storageAssistRequested: pvAssist.assistRequested,
});
assert.strictEqual(pvActualLoad.protectedLoadW, 0, 'pure PV must publish no protected storage load');
assert.strictEqual(pvActualLoad.assistRequestedLoadW, 0, 'pure PV must publish no storage-assist request');

const autoActualLoad = resolveEvcsStoragePolicyActualLoad({
  actualPowerW: 4200,
  meterFresh: true,
  online: true,
  enabled: true,
  vehicleDemandConfirmed: true,
  vehicleStateNormalized: 'charging',
  activityThresholdW: 200,
  storageProtectionRequested: autoProtect.protectionRequested,
  storageAssistRequested: autoProtect.assistRequested,
});
assert.strictEqual(autoActualLoad.protectedLoadW, 4200, 'Auto protection must still protect real vehicle load');

const source = fs.readFileSync(path.join(root, 'src-ts', 'runtime-executables', 'ems', 'modules', 'charging-management.ts'), 'utf8');
assert(source.includes("function resolveEvcsStoragePolicy(customerAllowed, userAssistEnabled, wallboxMode = 'auto')"), 'mode-scoped helper contract missing');
assert(source.includes("normalizedMode === 'auto'"), 'Auto mode scope missing');
assert(source.includes("normalizedMode === 'boost'"), 'Boost mode scope missing');
assert(source.includes("normalizedMode === 'minpv'"), 'Min+PV mode scope missing');
assert(source.includes('resolveEvcsStoragePolicy(storageAssistCustomerAllowed, userStorageAssistEnabled, userMode)'), 'runtime must pass the selected wallbox mode');
assert(!source.includes('resolveEvcsStoragePolicy(storageAssistCustomerAllowed, userStorageAssistEnabled);'), 'legacy mode-independent policy call must be removed');

console.log('[evcs-storage-policy-mode-scope] OK: pure PV is storage-policy neutral; Auto, Boost and Min+PV retain protection/assist.');
