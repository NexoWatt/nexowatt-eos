#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-energy-flow-regressions.js
 *
 * Zweck:
 * Prüft den neuen produktionsnahen Energiefluss-Regressionskatalog aus Version 0.7.61.
 *
 * Zusammenhang:
 * Das Skript ist bewusst normales JavaScript und benötigt kein `tsc`. Es kontrolliert,
 * dass die wichtigen Testfälle und erklärenden deutschen Kommentaranker vorhanden sind.
 * Die eigentliche Typprüfung der Datei erfolgt zusätzlich über `npm run typecheck`.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const matrixPath = path.join(root, 'src-ts', 'tests', 'energy-flow-regression-matrix.ts');

/**
 * Code-Teil: readMatrix
 * Zweck: Lädt die TypeScript-Testmatrix und liefert den Dateiinhalt für Strukturprüfungen.
 */
function readMatrix() {
  if (!fs.existsSync(matrixPath)) {
    throw new Error('Datei fehlt: src-ts/tests/energy-flow-regression-matrix.ts');
  }
  return fs.readFileSync(matrixPath, 'utf8');
}

/**
 * Code-Teil: requiredAnchors
 *
 * Zweck:
 * Enthält die fachlichen Mindestfälle, die beim Speicher-/Netzresolver nie wieder fehlen
 * dürfen. Wenn einer dieser Anker fehlt, wäre der TypeScript-Migrationsschritt nicht
 * vollständig dokumentiert.
 */
const requiredAnchors = [
  'Testfall: Split-DPs mit 0 W',
  'Testfall: Signed Speicher-DP mit positiver Entladung',
  'Testfall: Signed Speicher-DP mit negativer Ladeleistung',
  'Testfall: Bilanz-Fallback ohne Speicher-DP',
  'Testfall: Quellenpriorität Split schlägt Fallback',
  'Testfall: Quellenpriorität signed schlägt Fallback',
  'Testfall: Signed Netz-DP bei Einspeisung',
  'Testfall: Split-Netz-DPs',
  '0 W ist ein gültiger Messwert',
  'Diese Rechnung ist aber nur Fallback',
];

/**
 * Code-Teil: main
 * Zweck: Prüft die Anker und beendet den Prozess mit Fehlercode, falls etwas fehlt.
 */
function main() {
  const text = readMatrix();
  const missing = requiredAnchors.filter((anchor) => !text.includes(anchor));
  if (missing.length) {
    console.error('[ts-energy-flow-regressions] Fehlende Test-/Kommentaranker:');
    for (const item of missing) console.error(`- ${item}`);
    process.exit(1);
  }
  console.log('[ts-energy-flow-regressions] OK: Energiefluss-Regressionsmatrix vorhanden und kommentiert.');
}

main();
