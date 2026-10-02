// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-nl-p1-dsmr.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-nl-p1-dsmr.js
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
 * Original-Hash: f631f84256f16ca2d7f5a720c9c67608ec0dbba78415fd8b74c7b79d32f714cb
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
 * Prüft statisch, dass die NL P1/DSMR-Basis in TS-Quelle, App-Center,
 * ModuleManager, Feature-Flags und io-package verdrahtet ist.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
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
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
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
function must(rel, needle) {
  const s = read(rel);
  if (!s.includes(needle)) {
    console.error(`[nl-p1-dsmr] FEHLT in ${rel}: ${needle}`);
    process.exit(1);
  }
}
/**
 * Code-Teil: mustFile
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function mustFile(rel) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.error(`[nl-p1-dsmr] Datei fehlt: ${rel}`);
    process.exit(1);
  }
}

mustFile('src-ts/runtime-executables/ems/modules/nl-p1-dsmr.ts');
must('src-ts/runtime-executables/ems/modules/nl-p1-dsmr.ts', 'class NlP1DsmrModule extends BaseModule');
must('src-ts/runtime-executables/ems/modules/nl-p1-dsmr.ts', 'nl.p1.importPowerW');
must('src-ts/runtime-executables/ems/modules/nl-p1-dsmr.ts', 'nl.saldering.summaryJson');
must('src-ts/runtime-executables/ems/modules/nl-p1-dsmr.ts', 'nl.teruglevering.summaryJson');
must('src-ts/runtime-executables/ems/modules/nl-p1-dsmr.ts', 'read-only');
must('src-ts/runtime-executables/ems/module-manager.ts', "require('./modules/nl-p1-dsmr')");
must('src-ts/runtime-executables/ems/module-manager.ts', "key: 'nlP1'");
must('src-ts/runtime-executables/ems/services/feature-flags.ts', "nlP1: 'nlP1'");
must('src-ts/runtime-executables/ems/services/feature-flags.ts', "'nlP1Basic'");
must('src-ts/runtime-executables/www/ems-apps.ts', 'nlP1Mount: document.getElementById');
must('www/ems-apps.html', 'id="nlP1MappingSlot"');
must('src-ts/runtime-executables/www/ems-apps.ts', 'buildNlP1Card');
must('src-ts/runtime-executables/www/ems-apps.ts', 'data-nlp1-dp="importPowerW"');
must('src-ts/runtime-executables/www/ems-apps.ts', 'patch.nlP1.datapoints');
must('src-ts/runtime-executables/ems/modules/energy-wallet.ts', 'energyWallet.nlBridge.summaryJson');
must('src-ts/runtime-executables/ems/modules/energy-wallet.ts', '_nlBridge()');
const io = JSON.parse(read('io-package.json'));
if (!io.native || !io.native.nlP1 || !io.native.nlP1.datapoints) {
  console.error('[nl-p1-dsmr] io-package native.nlP1 fehlt.');
  process.exit(1);
}
for (const key of ['importPowerW','exportPowerW','netPowerW','importEnergyKwh','exportEnergyKwh','gasM3','activeTariff']) {
  if (!(key in io.native.nlP1.datapoints)) {
    console.error(`[nl-p1-dsmr] native.nlP1.datapoints.${key} fehlt.`);
    process.exit(1);
  }
}
console.log('[nl-p1-dsmr] OK: NL P1/DSMR-Basis ist verdrahtet.');
