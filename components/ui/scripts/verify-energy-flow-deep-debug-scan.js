#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-energy-flow-deep-debug-scan.js
 *
 * Zweck:
 * Tieferer Code-Scan für den Energiefluss-Umbau. Der Check sucht nach typischen
 * Regressionsstellen aus den letzten Versionen: exakte Quelle nur `ts-candidate`,
 * fehlendes `ts-normal`, falsche JS-Fallback-Wertung und fehlende Diagnosefelder.
 *
 * Wichtig:
 * Das ist kein Ersatz für echte Anlagentests. Es verhindert aber, dass bekannte
 * Migrationsfallen direkt im Code wieder eingebaut werden.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const appCenter = fs.readFileSync(path.join(root, 'www', 'ems-apps.js'), 'utf8');
const errors = [];
function requireMarker(text, marker, label) { if (!text.includes(marker)) errors.push(`${label}: fehlt ${marker}`); }
function forbid(text, marker, label) { if (text.includes(marker)) errors.push(`${label}: verbotener alter Marker ${marker}`); }
requireMarker(main, "publishedSource = switchState.useTs ? (switchState.normalSourceActive ? 'ts-normal' : 'ts-candidate') : 'js-runtime'", 'main.js');
requireMarker(main, 'switchState.normalSourceActive', 'main.js');
requireMarker(main, 'fixedSourceReady', 'main.js');
requireMarker(main, 'tsFixedSourceJsonText', 'main.js');
requireMarker(main, 'derived.core.building.energyFlowSource', 'main.js');
requireMarker(appCenter, 'TS NORMAL', 'www/ems-apps.js');
requireMarker(appCenter, 'TS-Normalquelle', 'www/ems-apps.js');
forbid(main, "const energyFlowProductiveTsActive = energyFlowSourceState === 'ts-candidate';", 'main.js');
if (errors.length) {
  console.error('[energy-flow-deep-debug-scan] Fehler:');
  for (const e of errors) console.error(' - ' + e);
  process.exit(1);
}
console.log('[energy-flow-deep-debug-scan] OK: keine bekannten Energiefluss-TS-Normalquellen-Debugfallen gefunden.');
