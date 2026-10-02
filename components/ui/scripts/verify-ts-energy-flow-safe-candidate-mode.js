#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-energy-flow-safe-candidate-mode.js
 *
 * Zweck:
 * Prüft die Umsetzung von 0.7.82: Der Energiefluss darf TS-Kandidatenwerte nur
 * nutzen, wenn Modus `ts`, Sicherheitsfreigabe, Shadow-OK und Kandidatenprüfung OK sind.
 *
 * Zusammenhang:
 * Dieser Check verhindert, dass eine spätere Änderung den Sicherheitsgurt entfernt
 * und dadurch History oder Energiefluss versehentlich mit ungültigen TS-Werten schreibt.
 */

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const checks = [
  ['main.js', '_nwValidateEnergyFlowTsCandidate'],
  ['main.js', 'ts-candidate-active'],
  ['main.js', 'ts-candidate-warmup'],
  ['main.js', 'candidateSafety'],
  ['main.js', 'Kandidatenprüfung'],
  ['www/ems-apps.js', 'Kandidatenprüfung'],
  ['www/ems-apps.js', 'energyFlowCandidateSafety'],
  ['www/ems-apps.js', 'candidateSafety vor der Anzeige berechnen'],
  ['main.js', 'publishDischargeRound - publishChargeRound'],
];

const missing = [];
for (const [file, needle] of checks) {
  const text = read(file);
  if (!text.includes(needle)) missing.push(`${file}: ${needle}`);
}

if (missing.length) {
  console.error('[ts-energy-flow-safe-candidate-mode] FEHLER: fehlende Anker:\n' + missing.join('\n'));
  process.exit(1);
}
console.log('[ts-energy-flow-safe-candidate-mode] OK: sicherer Energiefluss-TS-Kandidatenmodus ist vorhanden.');
