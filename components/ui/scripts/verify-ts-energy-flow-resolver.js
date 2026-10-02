#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-energy-flow-resolver.js
 *
 * Zweck:
 * Prüft den neuen TypeScript-Energiefluss-Resolver-Schritt aus 0.7.61.
 *
 * Zusammenhang:
 * `publish:check` bleibt weiterhin ohne TypeScript lauffähig. Dieses Skript ist
 * ein gezielter Migrationscheck und stellt sicher, dass Resolver, Regression-
 * Beispiele und deutsche Kommentaranker vorhanden sind.
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const resolverFile = path.join(root, 'src-ts', 'resolvers', 'energy-flow-resolver.ts');
const regressionFile = path.join(root, 'src-ts', 'tests', 'energy-flow-resolver-regression.ts');
const fixtureFile = path.join(root, 'src-ts', 'test-fixtures', 'energy-flow-resolver.cases.ts');

const errors = [];

/**
 * Code-Teil: requireFile
 * Zweck: Meldet klar, wenn eine Migrationsdatei fehlt.
 */
function requireFile(file) {
  if (!fs.existsSync(file)) errors.push(`Missing file: ${path.relative(root, file)}`);
}

/**
 * Code-Teil: requireText
 * Zweck: Stellt sicher, dass wichtige Funktionen und deutsche Kommentaranker nicht fehlen.
 */
function requireText(file, needle, label) {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes(needle)) errors.push(`Missing ${label}: ${needle}`);
}

requireFile(resolverFile);
requireFile(regressionFile);
requireFile(fixtureFile);

requireText(resolverFile, 'Code-Teil: resolveStorageFlow', 'storage resolver comment');
requireText(resolverFile, 'export function resolveStorageFlow', 'resolveStorageFlow export');
requireText(resolverFile, 'export function resolveGridFlow', 'resolveGridFlow export');
requireText(resolverFile, 'export function calculateBuildingLoadFromBalance', 'building load resolver export');
requireText(resolverFile, 'Bilanz-Fallback bleibt gesperrt', 'configured DP fallback guard');
requireText(regressionFile, 'splitStorageZeroIsValid', 'split storage zero regression case');
requireText(regressionFile, 'configuredDpBlocksFallback', 'configured DP blocks fallback regression case');
requireText(fixtureFile, 'Fallback wird nur ohne konfigurierten Speicher-DP genutzt', 'fixture fallback case');

if (errors.length) {
  console.error('[ts-energy-flow-resolver] FAILED');
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log('[ts-energy-flow-resolver] OK');
