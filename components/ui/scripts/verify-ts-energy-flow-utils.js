#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-energy-flow-utils.js
 *
 * Zweck:
 * Prüft die Dateien des TypeScript-Migrationsschritts 0.7.60.
 *
 * Zusammenhang:
 * Dieses Skript ist bewusst normales JavaScript, damit es ohne TypeScript-Build direkt
 * in `npm run test:types` laufen kann. Es prüft nur Struktur und Kommentaranker; die
 * eigentliche Typprüfung erfolgt über `npm run typecheck`.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) throw new Error(`Datei fehlt: ${rel}`);
  return fs.readFileSync(file, 'utf8');
}

/**
 * Code-Teil: Pflichtdateien prüfen.
 * Zweck: Verhindert, dass die neuen TS-Helfer versehentlich aus dem Paket fallen.
 */
const energyFlowUtils = read('src-ts/utils/energy-flow.ts');
read('src-ts/tests/energy-flow-utils-smoke.ts');

/**
 * Code-Teil: Kommentaranker prüfen.
 * Zweck: Unser Projektstandard verlangt bei jeder TS-Migration verständliche deutsche
 * Kommentare direkt am betroffenen Code-Teil.
 */
const requiredAnchors = [
  'Code-Teil: splitSignedStoragePower',
  'Code-Teil: resolveSplitStorageDps',
  'Code-Teil: calculateStorageFromBalance',
  'Code-Teil: chooseStorageFlowResult',
  'Code-Teil: splitSignedGridPower',
  'Code-Teil: resolveSplitGridDps',
  '0 W ist ein gültiger Wert',
];

const missing = requiredAnchors.filter((anchor) => !energyFlowUtils.includes(anchor));
if (missing.length) {
  console.error('[ts-energy-flow-utils] Fehlende Kommentar-/Regelanker:');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('[ts-energy-flow-utils] OK: TypeScript-Energiefluss-Helfer und Kommentare vorhanden.');
