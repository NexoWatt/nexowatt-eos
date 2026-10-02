#!/usr/bin/env node
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
