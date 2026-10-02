// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-contracts.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-contracts.js
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
 * Original-Hash: 05925c76c48dc4226dbdef27cba350e2b7425b5fb183acf8961df20281efc167
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
 * Code-Teil: TypeScript-Vertragsprüfung.
 * Zweck: Stellt sicher, dass die angelegten TS-Vertragsdateien vorhanden sind
 *        und zentrale Schnittstellen nicht versehentlich entfernt wurden.
 * Zusammenhang: Diese Prüfung ist bewusst leichtgewichtig und läuft auch ohne
 *        echte ioBroker-Instanz. Die eigentliche Typprüfung macht ts-doctor.
 * Wichtig: Wenn später Logik nach TypeScript migriert wird, werden hier neue
 *        Pflichtverträge ergänzt, damit Regressionen früh auffallen.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const required = [
  ['src-ts/contracts/energy-flow.ts', ['StorageFlowResult', 'EnergyFlowSnapshot', 'GridFlowResult', 'StorageFlowResolverInput', 'GridFlowResolverInput']],
  ['src-ts/contracts/datapoints.ts', ['DatapointDefinition', 'DatapointReadResult']],
  ['src-ts/contracts/features.ts', ['FeatureVisibilityState', 'EvcsPresenceProof', 'StorageFarmPresenceProof']],
  ['src-ts/contracts/ai-advisor.ts', ['AiAdvisorSuggestion', 'DailyPlanEntry']],
  ['src-ts/contracts/license.ts', ['LicenseState', 'LicenseValidationResult']],
  ['src-ts/contracts/iobroker-states.ts', ['AdapterStateValue', 'ApiStateResponse']],
  ['src-ts/utils/energy-flow.ts', ['SplitSignedStorageInput', 'SplitStorageDpInput', 'CalculatedStorageInput', 'splitSignedStoragePower', 'resolveSplitStorageDps', 'calculateStorageFromBalance', 'chooseStorageFlowResult', 'splitSignedGridPower', 'resolveSplitGridDps']],
];
let failed = false;
for (const [file, symbols] of required) {
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) {
    console.error(`[ts-contracts] fehlt: ${file}`);
    failed = true;
    continue;
  }
  const text = fs.readFileSync(abs, 'utf8');
  for (const sym of symbols) {
    if (!new RegExp(`\\b${sym}\\b`).test(text)) {
      console.error(`[ts-contracts] Symbol fehlt in ${file}: ${sym}`);
      failed = true;
    }
  }
}
const tsconfig = path.join(root, 'tsconfig.json');
if (!fs.existsSync(tsconfig)) {
  console.error('[ts-contracts] tsconfig.json fehlt');
  failed = true;
}
if (failed) process.exit(1);
console.log('[ts-contracts] OK: TypeScript-Vertragsdateien vorhanden.');
