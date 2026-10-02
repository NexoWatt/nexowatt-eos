// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-real-plant-shadow-evaluation.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-real-plant-shadow-evaluation.js
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
 * Original-Hash: 99600f200c2aced7bce82fa3a3f37b99af7acfffed83499e7b10b57f77584fb9
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
 * Seit 0.8.3 ist die echte Anlagen-Shadow-Auswertung eine interne Diagnose.
 * Backend/API und Helfer bleiben vorhanden, sichtbare Migrationskarten nicht.
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'www', 'ems-apps.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'www', 'ems-apps.html'), 'utf8');
const mustMain = [
  '_nwBuildTsShadowPlantSample',
  '_nwSummarizeTsShadowPlantSamples',
  '_nwUpdateTsShadowPlantEvaluation',
  'control.tsShadowPlantEvaluation',
  'real-plant-shadow-evaluation-v1',
];
const mustUi = [
  '_renderShadowPlantEvaluationCard',
  'ctrl.tsShadowPlantEvaluation',
  'Rolling-Auswertung der letzten Shadow-Samples',
];
const missing = [];
for (const a of mustMain) if (!main.includes(a)) missing.push(`main.js:${a}`);
for (const a of mustUi) if (!ui.includes(a)) missing.push(`www/ems-apps.js:${a}`);
if (html.includes('Reale Anlagen-Auswertung') || html.includes('TypeScript Shadow')) missing.push('www/ems-apps.html:sichtbare TS-Migrationsdiagnose');
if (missing.length) {
  console.error('[ts-real-plant-shadow-evaluation] Missing/invalid anchors:', missing.join(', '));
  process.exit(1);
}
console.log('[ts-real-plant-shadow-evaluation] OK: reale Anlagen-Auswertung ist intern verdrahtet und UI-bereinigt.');
