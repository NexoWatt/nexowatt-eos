// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-release-safety-gate.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-release-safety-gate.js
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
 * Original-Hash: 461792731513081e489fa9cbe921e7b52fa65a56394bd3cef5113b4ea182bae1
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
 * 0.8.59 Regression-Safety-Gate.
 * Prüft, dass das App-Center beim Speichern keine bestehenden Kernbereiche
 * versehentlich leer überschreiben kann, wenn ein Reiter/DOM/Hydration ausfällt.
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
  const text = read(file);
  if (!text.includes(needle)) {
    console.error(`[release-safety-gate] FEHLT ${label}: ${needle} in ${file}`);
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
  const text = read(file);
  if (text.includes(needle)) {
    console.error(`[release-safety-gate] VERBOTEN ${label}: ${needle} in ${file}`);
    process.exit(1);
  }
}
must('src-ts/runtime-executables/www/ems-apps.ts', 'applyReleaseRegressionSafetyGate', 'Safety-Gate-Funktion');
must('src-ts/runtime-executables/www/ems-apps.ts', 'storageFarm.storages', 'Speicherfarm-Schutz');
must('src-ts/runtime-executables/www/ems-apps.ts', 'settings.evcsList', 'Ladepunkt-Schutz');
must('src-ts/runtime-executables/www/ems-apps.ts', 'chargeKiosk.stations', 'DC-Station-Schutz');
must('src-ts/runtime-executables/www/ems-apps.ts', 'nlP1.datapoints', 'NL/P1-Schutz');
must('src-ts/runtime-executables/www/ems-apps.ts', 'meshMicrogrid.nodes', 'Mesh-Knoten-Schutz');
must('src-ts/runtime-executables/www/ems-apps.ts', 'meshMicrogrid.peers', 'Mesh-Peer-Schutz');
must('src-ts/runtime-executables/www/ems-apps.ts', 'const safetyReport = applyReleaseRegressionSafetyGate(patch);', 'SaveConfig nutzt Safety-Gate');
must('src-ts/runtime-executables/www/ems-apps.ts', '_releaseSafetyGate', 'Report wird im Patch dokumentiert');
must('src-ts/runtime-executables/www/ems-apps.ts', 'Bewusstes Löschen ganzer Kernbereiche', 'Kommentar für spätere Löschfunktion');
must('www/ems-apps.js', 'applyReleaseRegressionSafetyGate', 'Runtime Safety-Gate');
must('www/ems-apps.js', 'storageFarm.storages', 'Runtime Speicherfarm-Schutz');
must('www/ems-apps.js', 'settings.evcsList', 'Runtime Ladepunkt-Schutz');
must('www/ems-apps.js', 'chargeKiosk.stations', 'Runtime DC-Station-Schutz');
must('www/ems-apps.js', 'nlP1.datapoints', 'Runtime NL/P1-Schutz');
mustNot('src-ts/runtime-executables/www/ems-apps.ts', 'storageFarm = {}', 'kein unsicheres Speicherfarm-Reset');
console.log('[release-safety-gate] OK: App-Center-Save schützt Kernbereiche vor leerem Regression-Save.');
