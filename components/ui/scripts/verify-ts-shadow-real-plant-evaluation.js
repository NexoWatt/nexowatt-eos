#!/usr/bin/env node
'use strict';

/**
 * Prüft die interne Diagnose für echte Anlagen-Shadow-Auswertung. Die sichtbare
 * App-Center-Karte ist ab 0.8.3 bewusst entfernt.
 */
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
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
