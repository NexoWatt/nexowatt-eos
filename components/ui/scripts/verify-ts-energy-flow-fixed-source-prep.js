#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-energy-flow-fixed-source-prep.js
 *
 * Zweck:
 * Prüft den 0.7.103-Schritt: Der Energiefluss-TS-Kandidat sammelt einen stabilen
 * Fixed-Source-Status, damit der alte JS-Fallback nur noch Sicherheitsnetz bleibt.
 *
 * Wichtig:
 * Der Check stellt sicher, dass JS-Fallback nicht entfernt wurde. Er prüft nur, dass
 * TS als feste Energieflussquelle vorbereitet und sauber diagnostiziert wird.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function need(file, needle) {
  const text = read(file);
  if (!text.includes(needle)) {
    console.error(`[energy-flow-fixed-source] ERROR: ${file} fehlt Marker: ${needle}`);
    process.exit(1);
  }
}
need('main.js', '_nwUpdateEnergyFlowTsFixedSourceState');
need('main.js', '_nwIsEnergyFlowHardFallbackReason');
need('main.js', 'ts-normal-source-active');
need('main.js', 'derived.core.building.tsFixedSourceJson');
need('main.js', 'energyFlowTsFixedSourceState');
need('main.js', 'JS weiterhin Sicherheitsnetz');
need('www/ems-apps.js', 'TS-Normalquelle');
need('www/ems-apps.js', 'TS-Fixed Ticks');
need('www/ems-apps.js', 'energyFlowTsFixedSourceJson');
console.log('[energy-flow-fixed-source] OK: Energiefluss-TS feste/Normalquelle ist vorbereitet, JS-Fallback bleibt Sicherheitsnetz.');
