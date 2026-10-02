#!/usr/bin/env node
/**
 * Prüfskript: Energiefluss-TS produktive Aktivierung 0.7.101
 *
 * Zweck:
 * Stellt sicher, dass die kontrollierte TypeScript-Energiefluss-Umschaltung nicht
 * nur über JSON-Diagnose sichtbar ist, sondern einen eindeutigen booleschen State
 * `derived.core.building.tsProductiveActive` veröffentlicht.
 *
 * Zusammenhang:
 * Dieser Check schützt den nächsten Migrationsschritt. Wenn der Energiefluss über
 * TS produktiv aktiv wird, muss dieser Zustand für App-Center, Tests und spätere
 * Cleanup-Schritte eindeutig auswertbar sein.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const required = [
  'derived.core.building.tsProductiveActive',
  'energyFlowProductiveTsActive',
  "energyFlowSourceState === 'ts-candidate' || energyFlowSourceState === 'ts-normal'",
  'TypeScript produktiv aktiv',
];
const missing = required.filter((needle) => !main.includes(needle));
if (missing.length) {
  console.error('[ts-energy-flow-productive-active] Fehlende Anker:', missing.join(', '));
  process.exit(1);
}
console.log('[ts-energy-flow-productive-active] OK: produktive TS-Aktivierung inklusive TS-Normalquelle eindeutig diagnostizierbar.');
