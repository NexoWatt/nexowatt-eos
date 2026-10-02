// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-heating-rod-legacy-compact-cleanup.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-heating-rod-legacy-compact-cleanup.js
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
 * Original-Hash: 6ce64732379de2c7b9adba568c841f671d8fd39c9c2319bf97b2fe2d917bde85
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
 * Datei: scripts/verify-ts-heating-rod-legacy-compact-cleanup.js
 * Zweck: Prüft, dass die alte Heizstab-JS-Referenz im TS-Normalpfad nur noch kompakte
 * Diagnose/Cleanup-Daten mitführt und nicht mehr als großer Entscheidungsblock wirkt.
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
function fail(msg) { console.error('[heating-rod-legacy-compact-cleanup] ERROR: ' + msg); process.exit(1); }
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
function must(rel, marker, label) { if (!read(rel).includes(marker)) fail(`${label} fehlt: ${marker}`); }
must('ems/modules/heating-rod-control.js', 'heating-rod-legacy-js-reference-cleanup-v3', 'Legacy-Referenzdiagnose v2');
must('ems/modules/heating-rod-control.js', 'diagnosticPayloadMode', 'kompakter Payload-Modus');
must('ems/modules/heating-rod-control.js', 'legacyReferenceDetailsSuppressed', 'Detailunterdrückung');
must('ems/modules/heating-rod-control.js', 'referenceMismatchSample', 'kleine Referenzmismatch-Probe');
must('ems/modules/heating-rod-control.js', 'referenceMismatches: diagnosticOnly ? []', 'vollständige Listen im Normalpfad geleert');
must('ems/modules/heating-rod-control.js', 'cleanupRemovalCandidate', 'Cleanup-Entfernungskandidat');
must('ems/modules/heating-rod-control.js', 'oldJsReferenceRemovalStage', 'JS-Referenz-Entfernungsstufe');
must('www/ems-apps.js', 'JS-Diagnosedaten', 'App-Center Payload-Zeile');
must('www/ems-apps.js', 'JS-Cleanup-Kandidat', 'App-Center Cleanup-Kandidat-Zeile');
console.log('[heating-rod-legacy-compact-cleanup] OK: Heizstab Legacy-JS-Referenzdiagnose ist kompakt und cleanupfähig.');
