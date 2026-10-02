// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-energy-flow-plant-gate.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-energy-flow-plant-gate.js
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
 * Original-Hash: e8d6d2a83d5bfcc72a15bfbf691093210f5aac5a334a80ec7e45206f92eedf6a
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
const root = path.join(__dirname, '..');
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
function read(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }
/**
 * Code-Teil: need
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function need(cond,msg){ if(!cond){ console.error('[energy-flow-plant-gate] ERROR:', msg); process.exitCode=1; } }
const main = read('main.js');
const ui = read('www/ems-apps.js');
const html = read('www/ems-apps.html');
need(main.includes('_nwEvaluateEnergyFlowPlantGate'), 'main.js: Anlagen-Gate-Funktion fehlt.');
need(main.includes('ts-real-plant-evaluation-not-stable'), 'main.js: TS-Switch blockiert stabile Anlagen-Auswertung nicht.');
need(main.includes('plantEvaluationRequired'), 'main.js: SwitchState enthält keine Anlagen-Auswertung.');
need(!html.includes('energyFlowTsRequireStablePlant'), 'ems-apps.html: sichtbarer Schalter für stabile Anlagen-Auswertung muss entfernt bleiben.');
need(ui.includes('energyFlowRequireStablePlantEvaluation'), 'ems-apps.js: UI speichert Anlagen-Auswertung-Gate nicht.');
need(ui.includes('Anlagen-Auswertung'), 'ems-apps.js: Statusanzeige zeigt Anlagen-Auswertung nicht.');
if (process.exitCode) process.exit(process.exitCode);
console.log('[energy-flow-plant-gate] OK: TS-Energiefluss bleibt intern durch stabile Anlagen-Auswertung abgesichert, UI-Schalter ist entfernt.');
