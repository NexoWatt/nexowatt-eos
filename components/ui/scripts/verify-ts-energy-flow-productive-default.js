#!/usr/bin/env node
'use strict';

/**
 * Code-Teil: verify-ts-energy-flow-productive-default
 *
 * Zweck:
 * Prüft den 0.7.101-Schritt: Der Energiefluss soll standardmäßig in den sicheren
 * TS-Kandidatenmodus gehen. Gleichzeitig muss die doppelte Sicherheitslogik erhalten
 * bleiben, damit bei Blockern automatisch JavaScript produktiv bleibt.
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'www', 'ems-apps.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'www', 'ems-apps.html'), 'utf8');
const errors = [];
function need(text, pattern, label) {
  if (!pattern.test(text)) errors.push(label);
}
need(main, /energyFlowMode:\s*'ts'/, 'main.js default energyFlowMode ist nicht ts');
need(main, /energyFlowProductionAllowed:\s*true/, 'main.js default energyFlowProductionAllowed ist nicht true');
need(main, /energyFlowProductiveTsEnabledSince:\s*'0\.7\.101'/, 'main.js Migrationsmarker 0.7.101 fehlt');
need(main, /looksLikeOldDefault[\s\S]*currentMode === 'shadow'[\s\S]*tm\.energyFlowMode = 'ts'/, 'main.js alte shadow-Defaults werden nicht auf TS migriert');
need(main, /plantEvaluationOk[\s\S]*candidateStable[\s\S]*useTs/, 'main.js TS-Gates fehlen oder wurden beschädigt');
need(ui, /tm\.energyFlowProductionAllowed !== false/, 'ems-apps.js UI-Freigabe defaultet nicht auf true');
need(ui, /\? v : 'ts'/, 'ems-apps.js normalisiert unbekannte Modi nicht auf ts');
if (/TS – produktiver Kandidat mit Sicherheitsgates/.test(html) || /energyFlowTsMode/.test(html)) errors.push('ems-apps.html sichtbare TS-Migrationsoption muss entfernt bleiben');
if (errors.length) {
  console.error('[ts-energy-flow-productive-default] Fehler:');
  for (const err of errors) console.error(' - ' + err);
  process.exit(1);
}
console.log('[ts-energy-flow-productive-default] OK: Energiefluss-TS ist intern produktiv voreingestellt, sichtbare Migrationsoption ist entfernt.');
