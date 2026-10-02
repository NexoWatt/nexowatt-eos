#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
function read(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }
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
