// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-heating-rod-legacy-removal-plan.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-heating-rod-legacy-removal-plan.js
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
 * Original-Hash: 5eedfc07b21b88d861d832ce296400a02d3698cd453c39127693f7f222bdd946
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
 * Datei: scripts/verify-ts-heating-rod-legacy-removal-plan.js
 *
 * Zweck:
 * Prüft 0.7.115: Der alte Heizstab-JS-Referenzpfad wird als konkreter
 * Entfernungs-/Cleanup-Plan vorbereitet. TS bleibt Normalpfad; JS bleibt nur
 * Notfallback/Debug-Brücke.
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
function fail(msg) { console.error('[heating-rod-legacy-removal-plan] ERROR: ' + msg); process.exit(1); }
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
function must(file, marker, label) { if (!read(file).includes(marker)) fail(`${file}: fehlt ${label || marker}`); }

must('ems/modules/heating-rod-control.js', '_buildHeatingRodTsLegacyRemovalPlanState', 'Legacy-Removal-Plan Builder');
must('ems/modules/heating-rod-control.js', 'heatingRod.summary.tsLegacyRemovalPlanJson', 'Legacy-Removal-Plan State');
must('ems/modules/heating-rod-control.js', 'legacy-js-reference-removal-prepared', 'Removal prepared Status');
must('ems/modules/heating-rod-control.js', 'removableParts', 'removableParts Diagnose');
must('ems/modules/heating-rod-control.js', 'keepParts', 'keepParts Notfallback');
must('ems/modules/heating-rod-control.js', 'hard-safety-fallback', 'harter Notfallback bleibt erhalten');
must('ems/modules/heating-rod-control.js', 'legacyRemovalPlan', 'Removal-Plan wird an Diagnoseobjekte gehängt');
must('www/ems-apps.js', 'JS-Entfernung', 'App-Center zeigt JS-Entfernung');
console.log('[heating-rod-legacy-removal-plan] OK: Alter JS-Heizstabpfad ist als Cleanup-/Removal-Plan vorbereitet.');
