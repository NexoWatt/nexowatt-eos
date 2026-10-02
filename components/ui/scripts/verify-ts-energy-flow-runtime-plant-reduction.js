#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-energy-flow-runtime-plant-reduction.js
 *
 * Zweck:
 * Prüft 0.7.102: Energiefluss-TS sammelt eigene Runtime-Samples und reduziert damit
 * unnötige JS-Fallbacks, ohne die Sicherheitsgates zu entfernen.
 */

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

function fail(message) {
  console.error('[energy-flow-runtime-plant-reduction] ERROR: ' + message);
  process.exit(1);
}
function read(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) fail('Pflichtdatei fehlt: ' + rel);
  return fs.readFileSync(abs, 'utf8');
}
function must(text, needle, label) {
  if (!text.includes(needle)) fail('Marker fehlt: ' + label + ' / ' + needle);
}

const main = read('main.js');
must(main, '_nwBuildEnergyFlowTsRuntimePlantSample', 'Runtime-Sample Builder');
must(main, '_nwSummarizeEnergyFlowTsRuntimePlantSamples', 'Runtime-Sample Summary');
must(main, '_nwUpdateEnergyFlowTsRuntimePlantEvaluation(tsShadow)', 'Runtime-Sample Update im Switch');
must(main, 'runtimePlantEvaluation', 'Plant-Gate nutzt Runtime-Evaluation');
must(main, "source: runtimeEvaluation ? 'energy-flow-runtime' : 'shadow-plant'", 'Plant-Gate Quellenangabe');
must(main, 'control.energyFlowTsRuntimePlantEvaluation', 'App-Center-Diagnosefeld');
must(main, 'JS-Fallbacks, ohne das Gate zu', 'deutscher Sicherheitskommentar');

// Wichtig: Die Gates müssen weiter vorhanden bleiben.
for (const marker of ['!cfg.productionAllowed', '!shadowAvailable', '!shadowOk', '!candidateSafety.ok', 'plantGate.required']) {
  must(main, marker, 'Sicherheitsgate bleibt vorhanden');
}

console.log('[energy-flow-runtime-plant-reduction] OK: Energiefluss-TS sammelt Runtime-Samples und JS-Fallbacks bleiben Gate-basiert.');
