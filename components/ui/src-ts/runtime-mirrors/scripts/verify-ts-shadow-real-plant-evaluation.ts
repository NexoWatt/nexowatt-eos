// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-shadow-real-plant-evaluation.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-shadow-real-plant-evaluation.js
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
 * Original-Hash: 2858e8b180e1f722db52deb4a74e07ef93d2420269daa4c973e689521b1eb40e
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
 * Prüft die interne Diagnose für echte Anlagen-Shadow-Auswertung. Die sichtbare
 * App-Center-Karte ist ab 0.8.3 bewusst entfernt.
 */
const fs = require('fs');
const path = require('path');
const root = process.cwd();
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
/**
 * Code-Teil: need
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const need = (cond, msg) => { if (!cond) { console.error('[ts-shadow-real-plant-evaluation] ' + msg); process.exit(1); } };

const main = read('main.js');
const ui = read('www/ems-apps.js');
const html = read('www/ems-apps.html');

need(main.includes('_nwBuildTsShadowPlantSample'), 'main.js: Plant-Sample Builder fehlt.');
need(main.includes('_nwSummarizeTsShadowPlantSamples'), 'main.js: Plant-Sample Zusammenfassung fehlt.');
need(main.includes('_nwUpdateTsShadowPlantEvaluation'), 'main.js: Rolling-Auswertung fehlt.');
need(main.includes('control.tsShadowPlantEvaluation = this._nwUpdateTsShadowPlantEvaluation(control, control.tsShadowReadiness);'), 'main.js: Diagnose-API hängt tsShadowPlantEvaluation nicht an.');
need(main.includes('_nwBuildTsShadowRealPlantEvaluation'), 'main.js: zusätzliche Sofortauswertung fehlt.');
need(main.includes('control.tsShadowRealPlantEvaluation = this._nwBuildTsShadowRealPlantEvaluation(control);'), 'main.js: Diagnose-API hängt tsShadowRealPlantEvaluation nicht an.');
need(ui.includes('_renderShadowPlantEvaluationCard'), 'www/ems-apps.js: interner Plant-Auswertungsrenderer fehlt.');
need(ui.includes('ctrl.tsShadowPlantEvaluation || ctrl.tsShadowRealPlantEvaluation'), 'www/ems-apps.js: UI-Fallback für RealPlant-Auswertung fehlt.');
need(!html.includes('Reale Anlagen-Auswertung'), 'www/ems-apps.html: sichtbare Plant-Auswertung muss entfernt bleiben.');
need(!html.includes('TypeScript Shadow'), 'www/ems-apps.html: sichtbare TypeScript-Shadow-Sektion muss entfernt bleiben.');

console.log('[ts-shadow-real-plant-evaluation] OK: Echte-Anlage-Auswertung bleibt intern/API-seitig vorhanden.');
