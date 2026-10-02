// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-heating-rod-normal-path.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-heating-rod-normal-path.js
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
 * Original-Hash: fa5e8bb150e4fd1cce4a51269dde66941db66824a3e3ff275ad58ac9ac5f9719
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
 * Datei: scripts/verify-ts-heating-rod-normal-path.js
 *
 * Zweck:
 * Prüft 0.7.110: Der Heizstab-TS-Pfad wird nach stabiler Runtime-Auswertung als
 * Normalpfad vorbereitet. JavaScript bleibt weiterhin Notfallback bei harten Blockern.
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
 * Code-Teil: fail
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function fail(msg) { console.error('[ts-heating-rod-normal-path] ERROR: ' + msg); process.exit(1); }
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
function must(file, marker) { if (!read(file).includes(marker)) fail(file + ' fehlt Marker: ' + marker); }

must('ems/modules/heating-rod-control.js', '_updateHeatingRodTsNormalSourceState');
must('ems/modules/heating-rod-control.js', 'heatingRod.summary.tsNormalSourceJson');
must('ems/modules/heating-rod-control.js', 'ts-heating-rod-normal');
must('ems/modules/heating-rod-control.js', 'JavaScript bleibt nur Notfallback');
must('main.js', 'heatingRodTsNormalSourceJson');
must('www/ems-apps.js', 'TS-Normalpfad');
must('www/ems-apps.js', 'TS-Normal Ticks');

console.log('[ts-heating-rod-normal-path] OK: Heizstab-TS-Normalpfad ist vorbereitet und diagnostisch sichtbar.');
