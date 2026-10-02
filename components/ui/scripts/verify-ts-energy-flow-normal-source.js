#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-energy-flow-normal-source.js
 *
 * Zweck:
 * Prüft den 0.7.104-Schritt: Nach stabiler Fixed-Source-Phase wird der Energiefluss
 * als `ts-normal` veröffentlicht. JavaScript bleibt nur noch Notfallback bei harten Blockern.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function need(file, needle) {
  const text = read(file);
  if (!text.includes(needle)) {
    console.error(`[energy-flow-normal-source] ERROR: ${file} fehlt Marker: ${needle}`);
    process.exit(1);
  }
}
need('main.js', 'ts-normal');
need('main.js', 'ts-normal-source-active');
need('main.js', 'normalSourceActive');
need('main.js', "energyFlowSourceState === 'ts-candidate' || energyFlowSourceState === 'ts-normal'");
need('main.js', 'TS ist als Energiefluss-Normalquelle vorbereitet');
need('main.js', 'JS-Fallback bleibt nur noch Notfallback');
need('www/ems-apps.js', 'TS NORMAL');
need('www/ems-apps.js', 'TS-Normalquelle');
need('scripts/verify-ts-energy-flow-productive-active.js', "ts-normal");
console.log('[energy-flow-normal-source] OK: Energiefluss-TS ist als Normalquelle vorbereitet, JS bleibt Notfallback.');
