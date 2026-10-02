// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-storage-policy-core-cleanup.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-storage-policy-core-cleanup.js
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
 * Original-Hash: d91ba69cb9c2ef2314afe79b252564b4e7e0a77535d56c0ff402c6d299f4cb86
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
 * Regression 0.8.138: Alle Speicherpfade verwenden denselben, seiteneffektfreien
 * Policy-Resolver. Ein deaktiviertes MultiUse darf keine Reserve-/LSK-/SoC-Zone
 * oder versteckte NVP-Parameter in die Standalone-Regelung einschleusen.
 */
const fs = require('fs');
/**
 * Code-Teil: read
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function read(file) { return fs.readFileSync(file, 'utf8'); }
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
  if (!read(file).includes(needle)) {
    console.error(`[storage-policy-core-cleanup] FEHLT ${label}: ${needle}`);
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
  if (read(file).includes(needle)) {
    console.error(`[storage-policy-core-cleanup] VERBOTEN ${label}: ${needle}`);
    process.exit(1);
  }
}

for (const file of [
  'src-ts/runtime-executables/ems/modules/storage-control.ts',
  'src-ts/runtime-mirrors/ems/modules/storage-control.ts',
  'ems/modules/storage-control.js',
]) {
  must(file, "require('../services/storage-self-consumption-policy')", 'zentraler Policy-Service');
  must(file, 'const storageOperatingPolicy = resolveStorageOperatingPolicy({', 'einheitliche Policy-Auflösung');
  must(file, "const multiUseOwnsZones = storageOperatingPolicy.mode === 'multiuse';", 'MultiUse führt nur im aktiven Modus');
  must(file, 'const reserveEnabled = storageOperatingPolicy.reserve.enabled === true;', 'Reserve aus Resolver');
  must(file, 'const lskEnabledCfg = storageOperatingPolicy.lsk.enabled === true;', 'LSK aus Resolver');
  must(file, 'let selfMinSoc = clamp(num(storageOperatingPolicy.self.minSocPct, 10)', 'Standalone-Min-SoC aus Resolver');
  must(file, 'const selfTargetGridW = activeStorageNvpTargetW;', 'NVP-Ziel aus der aktiven Topologie-Policy');
  must(file, 'const selfImportThresholdW = activeStorageNvpHysteresisW;', 'NVP-Hysterese aus der aktiven Topologie-Policy');
  must(file, "await this._setIfChanged('speicher.regelung.selfNvpTuningTopology'", 'Topologie-Quellendiagnose');
  must(file, 'Eigenverbrauch: Entladen blockiert (SoC', 'expliziter SoC-Sperrgrund');
  must(file, "await this._setIfChanged('speicher.regelung.policySource'", 'Policy-Quellendiagnose');
  mustNot(file, '(multiUseOwnsZones || !multiUsePolicyConfigured) ? cfg.selfMinSocPct', 'alter versteckter MultiUse-Fallback');
}

for (const file of [
  'src-ts/runtime-executables/main.ts',
  'src-ts/runtime-mirrors/main.ts',
  'main.js',
]) {
  must(file, "require('./ems/services/storage-self-consumption-policy')", 'Policy-Service im Adapterkern');
  must(file, 'MultiUse-Zonen nicht mehr in `storage.*` kopiert', 'keine Runtime-Spiegelung');
  must(file, 'const storageOperatingPolicy = resolveStorageOperatingPolicy({', 'Farm nutzt identische Policy');
  must(file, 'const selfFloor = storageOperatingPolicy.self.enabled === true', 'Farm-Eigenverbrauchs-Floor aus Resolver');
  mustNot(file, 'st.selfMinSocPct = selfMin;', 'MultiUse darf Standalone-SoC nicht überschreiben');
  mustNot(file, 'const selfMinRaw = Number((multiUsePolicyActive || !mu)', 'alter 20-Prozent-Fallback entfernt');
}

for (const file of [
  'src-ts/runtime-executables/ems/services/storage-self-consumption-policy.ts',
  'src-ts/runtime-mirrors/ems/services/storage-self-consumption-policy.ts',
  'ems/services/storage-self-consumption-policy.js',
]) {
  must(file, 'function resolveStorageOperatingPolicy', 'zentraler Resolver');
  must(file, "let source = 'standalone-default'", 'sicherer Standalone-Default');
  must(file, 'staleMultiUseIgnored', 'Diagnose für ignorierte Altwerte');
}

console.log('[storage-policy-core-cleanup] OK: Standalone, MultiUse und Farm verwenden eine gemeinsame, seiteneffektfreie Speicher-Policy.');
