#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-energy-flow-regression.js
 *
 * Zweck:
 * Prüft, ob der TypeScript-Schritt 0.7.61 für produktionsnahe Energiefluss-
 * Regressionen im Repository vorhanden ist.
 *
 * Zusammenhang:
 * Dieser Check ist absichtlich ein leichtgewichtiges Node-Skript und benötigt kein
 * `tsc`. `publish:check` bleibt dadurch weiterhin ohne TypeScript-Installation nutzbar.
 * Der eigentliche TypeScript-Compiler prüft die Dateien zusätzlich über `npm run typecheck`.
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

/**
 * Code-Teil: readRequiredFile
 * Zweck: Lädt eine Datei oder beendet den Check mit verständlicher Fehlermeldung.
 */
function readRequiredFile(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    console.error(`[energy-flow-regression-check] Missing file: ${rel}`);
    process.exit(1);
  }
  return fs.readFileSync(abs, 'utf8');
}

const regressionFile = 'src-ts/quality/energy-flow-regression-cases.ts';
const smokeFile = 'src-ts/tests/energy-flow-regression-smoke.ts';
const text = readRequiredFile(regressionFile);
readRequiredFile(smokeFile);

/**
 * Code-Teil: requireText
 * Zweck: Stellt sicher, dass fachlich wichtige Regressionen und Kommentare vorhanden sind.
 */
function requireText(needle, description) {
  if (!text.includes(needle)) {
    console.error(`[energy-flow-regression-check] Missing ${description}: ${needle}`);
    process.exit(1);
  }
}

for (const [needle, description] of [
  ['Code-Teil: caseSplitStorageZeroIsValid', 'Kommentar für 0-W-Speicherfall'],
  ['storage-split-zero-is-valid', 'Regressionsfall: Split-DP 0 W bleibt gültig'],
  ['storage-split-beats-calculated', 'Regressionsfall: DP schlägt Fallback'],
  ['storage-balance-fallback-standby', 'Regressionsfall: Bilanz-Fallback nur ohne DP'],
  ['grid-split-export-zero-import', 'Regressionsfall: Netz 0 W Bezug bei Einspeisung'],
  ['ENERGY_FLOW_REGRESSION_CASES', 'exportierte Regressionstabelle'],
  ['relatedRuntimeFiles', 'Verknüpfung zu produktiven Dateien'],
]) {
  requireText(needle, description);
}

console.log('[energy-flow-regression-check] OK: TypeScript energy-flow regression cases are present and documented.');
