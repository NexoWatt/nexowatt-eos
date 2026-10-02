// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-energy-flow-active-test.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-energy-flow-active-test.js
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
 * Original-Hash: cea62ce44067ba38055b4e027142c2eacb39fd62859048c0477686af43c30048
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
 * Prüft den kontrollierten Energiefluss-TS-Aktivtest. Seit 0.8.3 bleibt die
 * Diagnose intern/API-seitig vorhanden, wird aber nicht mehr als eigene
 * sichtbare App-Center-Kachel gerendert.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
/**
 * Code-Teil: read
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const errors = [];
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
  const text = read(file);
  if (!text.includes(needle)) errors.push(`${file}: fehlt ${label}`);
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
  const text = read(file);
  if (text.includes(needle)) errors.push(`${file}: sichtbar geblieben ${label}`);
}

must('main.js', '_nwRecordEnergyFlowTsActiveTestSample', 'Backend-Aufzeichnung des Aktivtests');
must('main.js', '_nwSummarizeEnergyFlowTsActiveTestSamples', 'Backend-Zusammenfassung des Aktivtests');
must('main.js', 'control.energyFlowTsActiveTest', 'Diagnose-API-Feld energyFlowTsActiveTest');
must('main.js', 'tsActiveTest: effectiveEnergyFlow.activeTest', 'Energiefluss-Debugfeld tsActiveTest');
must('www/ems-apps.js', '_renderEnergyFlowTsActiveTestCard', 'interner Aktivtest-Renderer');
mustNot('www/ems-apps.html', 'Energiefluss TS‑Aktivtest', 'eigener sichtbarer App-Center Titel');

if (errors.length) {
  console.error('[energy-flow-active-test] Fehler:\n' + errors.map((x) => ' - ' + x).join('\n'));
  process.exit(1);
}
console.log('[energy-flow-active-test] OK: Energiefluss-TS-Aktivtest bleibt intern verdrahtet, UI-Kachel ist entfernt.');
