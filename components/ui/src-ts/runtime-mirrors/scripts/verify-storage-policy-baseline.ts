// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-storage-policy-baseline.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-storage-policy-baseline.js
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
 * Original-Hash: a8716c2f8c6f326a43dc28ef97d44d5e8b212dc714129398bd8fb7928dab90b3
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
 * Regression 0.8.138: Baseline-Fachlogik fuer Speicher.
 * - Standalone-Speicher optimiert Eigenverbrauch.
 * - MultiUse besitzt SoC-Zonen nur im aktiven Zustand.
 * - Speicherfarm verteilt den bereits aufgeloesten Sollwert und verwendet
 *   dieselbe zentrale SoC-Policy wie die Einzelregelung.
 */
const assert = require('assert');
const fs = require('fs');

/**
 * Code-Teil: text
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function text(file) { return fs.readFileSync(file, 'utf8'); }
/**
 * Code-Teil: must
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function must(file, needle, label) {
  if (!text(file).includes(needle)) {
    console.error(`[storage-policy-baseline] FEHLT ${label}: ${needle}`);
    process.exit(1);
  }
}
/**
 * Code-Teil: mustNot
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function mustNot(file, needle, label) {
  if (text(file).includes(needle)) {
    console.error(`[storage-policy-baseline] VERBOTEN ${label}: ${needle}`);
    process.exit(1);
  }
}

const storageFiles = [
  'src-ts/runtime-executables/ems/modules/storage-control.ts',
  'src-ts/runtime-mirrors/ems/modules/storage-control.ts',
  'ems/modules/storage-control.js',
];
for (const file of storageFiles) {
  must(file, "require('../services/storage-self-consumption-policy')", 'zentraler Speicher-Policy-Resolver');
  must(file, 'const storageOperatingPolicy = resolveStorageOperatingPolicy({', 'gemeinsame Betriebs-Policy');
  must(file, "const multiUseOwnsZones = storageOperatingPolicy.mode === 'multiuse';", 'Zonenbesitzer ist aktives MultiUse');
  must(file, 'const reserveEnabled = storageOperatingPolicy.reserve.enabled === true;', 'Reserve aus zentraler Policy');
  must(file, 'const lskEnabledCfg = storageOperatingPolicy.lsk.enabled === true;', 'LSK aus zentraler Policy');
  must(file, 'let selfMinSoc = clamp(num(storageOperatingPolicy.self.minSocPct, 10)', 'Eigenverbrauchs-Floor aus zentraler Policy');
  must(file, 'const evcsStorageAssistPolicyAllowed = !!multiUsePolicyActive;', 'EVCS-Assist nur MultiUse');
  must(file, 'const maxByDemandW = measuredDemandCapW;', 'Entlade-Demand-Cap ohne alten Sollwert');
  mustNot(file, 'const selfMinSoc = clamp(num((multiUseOwnsZones || !multiUsePolicyConfigured) ? cfg.selfMinSocPct : undefined, reserveMin)', 'versteckter inaktiver MultiUse-Fallback');
}

const mainFiles = ['src-ts/runtime-executables/main.ts', 'main.js'];
for (const file of mainFiles) {
  must(file, "require('./ems/services/storage-self-consumption-policy')", 'Farm nutzt zentralen Policy-Resolver');
  must(file, 'const storageOperatingPolicy = resolveStorageOperatingPolicy({', 'Farm-SoC-Floor aus gemeinsamer Policy');
  must(file, 'const selfFloor = storageOperatingPolicy.self.enabled === true', 'Farm-Eigenverbrauchsfloor aus gemeinsamer Policy');
  must(file, 'MultiUse-Zonen nicht mehr in `storage.*` kopiert', 'kein Runtime-Spiegel aktiver MultiUse-Zonen');
  mustNot(file, 'const selfMinRaw = Number((multiUsePolicyActive || !mu) ? storageCfg.selfMinSocPct : 20);', 'Farm-20-%-Fallback bei inaktivem MultiUse');
  must(file, 'Eine bewusst eingetragene 0-W-Vorgabe sperrt diese Richtung', '0-W bleibt Stop in Farmlimits');
}

const serviceFiles = [
  'src-ts/runtime-executables/ems/services/storage-self-consumption-policy.ts',
  'ems/services/storage-self-consumption-policy.js',
];
for (const file of serviceFiles) {
  must(file, 'function resolveStorageSocPolicy', 'zentraler Resolver exportiert');
  must(file, 'previouslyMirroredByMultiUse', 'Legacy-MultiUse-Spiegel wird erkannt');
  must(file, "source = 'standalone-default-after-multiuse'", 'sicherer Standalone-Fallback');
  must(file, 'reserve: {', 'Reserve-Vertrag vorhanden');
  must(file, 'lsk: {', 'LSK-Vertrag vorhanden');
  must(file, 'self: {', 'Eigenverbrauchs-Vertrag vorhanden');
}

// Der Adapterkern darf im MultiUse-Hydrationsschritt keine aktiven Zonen mehr
// nach storage.* kopieren.
for (const file of mainFiles) {
  const src = text(file);
  const start = src.indexOf('nwApplyStorageMultiUsePolicy(nativeObj) {');
  const end = src.indexOf('Code-Teil: loadInstallerConfigFromState', start);
  assert(start >= 0 && end > start, `${file}: nwApplyStorageMultiUsePolicy nicht gefunden`);
  const block = src.slice(start, end);
  for (const forbidden of [
    'st.reserveEnabled = reserveEnabled',
    'st.lskEnabled = peakEnabled',
    'st.selfDischargeEnabled = selfEnabled',
    'st.selfMinSocPct = selfMin',
    'st.selfMaxSocPct = selfMax',
  ]) {
    assert(!block.includes(forbidden), `${file}: MultiUse-Zone wird weiterhin gespiegelt (${forbidden})`);
  }
}

console.log('[storage-policy-baseline] OK: Standalone, aktives MultiUse und Speicherfarm verwenden eine gemeinsame, isolierte SoC-Policy.');
