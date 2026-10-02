// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-grid-export-guard.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-grid-export-guard.js
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
 * Original-Hash: 29803c1da06031efb8d1ca647898e581220b97826ccd4b412bb063d955c7bb32
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
 * Code-Teil: assertMatch
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function assertMatch(rel, re, msg) {
  const txt = read(rel);
  if (!re.test(txt)) {
    console.error(`[grid-export-guard] FAIL: ${msg} (${rel})`);
    process.exit(1);
  }
  console.log(`[grid-export-guard] OK: ${msg}`);
}
assertMatch('src-ts/runtime-executables/ems/modules/grid-constraints.ts', /_isExportLimitInstallerApproved/, 'Installer-Freigabe ist in GridConstraints vorhanden');
assertMatch('src-ts/runtime-executables/ems/modules/grid-constraints.ts', /_getMaxFeedInPowerW/, 'maximale Einspeiseleistung wird zentral gelesen');
assertMatch('src-ts/runtime-executables/ems/modules/grid-constraints.ts', /targetGridW\s*=\s*biasW\s*-\s*maxFeedInPowerW/, 'Regelziel nutzt erlaubte Einspeiseleistung statt nur 0 W');
assertMatch('src-ts/runtime-executables/ems/modules/grid-constraints.ts', /feedInLimitW',\s*maxFeedInPowerW/, 'Einzel-WR Feed-in-Limit schreibt die Installergrenze');
assertMatch('src-ts/runtime-executables/www/ems-apps.ts', /Installateurfreigabe Einspeisebegrenzung/, 'App-Center hat Freigabe-Schalter');
assertMatch('src-ts/runtime-executables/www/ems-apps.ts', /(?:Lokale Sicherheitsobergrenze Einspeisung|Maximale Einspeiseleistung)/, 'App-Center hat maximale Einspeiseleistung');
assertMatch('src-ts/runtime-executables/www/ems-apps.ts', /Export Guard für DE\/NL/, 'UI-Hinweis beschreibt DE/NL Export Guard');
console.log('[grid-export-guard] Alle Prüfungen bestanden.');
