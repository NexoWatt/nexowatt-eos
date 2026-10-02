#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-energy-flow-fallback-reduction.js
 *
 * Zweck:
 * Prüft 0.7.102: Der Energiefluss-TS-Kandidat darf bei reinen Anlagen-Warmup-Gründen
 * produktiv bleiben, harte Blocker bleiben aber JS-Fallback.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
function need(marker, label) {
  if (!main.includes(marker)) {
    console.error(`[energy-flow-fallback-reduction] ERROR: fehlt ${label}: ${marker}`);
    process.exit(1);
  }
}
need('_nwIsEnergyFlowPlantGateWarmupOnly', 'Warmup-only Helper');
need('plantGateWarmupOnly', 'Warmup-only Variable');
need('plantEvaluationSoftReleased', 'Diagnoseflag für weich freigegebene Anlagenbewertung');
need("normalized.includes('samples gesammelt')", 'Sample-Warmup-Erkennung');
need("normalized.includes('ok-samples in folge')", 'OK-Folge-Warmup-Erkennung');
need('blockerCount > 0 || mismatchCount > 0', 'harte Blocker bleiben blockierend');
console.log('[energy-flow-fallback-reduction] OK: TS-Energiefluss reduziert JS-Fallback nur bei reinen Warmup-Gründen.');
