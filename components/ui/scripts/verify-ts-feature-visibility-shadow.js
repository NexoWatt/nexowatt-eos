#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-feature-visibility-shadow.js
 *
 * Zweck:
 * Prüft die vorbereitete Feature-Sichtbarkeits-Shadow-Schicht.
 *
 * Zusammenhang:
 * Diese Prüfung stellt sicher, dass die spätere Vergleichslogik zwischen alter
 * JS-Sichtbarkeit und neuer TS-Sichtbarkeit vorhanden, kommentiert und testbar ist.
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function fail(message) {
  console.error(`[verify-ts-feature-visibility-shadow] ERROR: ${message}`);
  process.exit(1);
}

function requireFile(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) fail(`Pflichtdatei fehlt: ${rel}`);
  return fs.readFileSync(file, 'utf8');
}

function requireContains(rel, needle) {
  const text = requireFile(rel);
  if (!text.includes(needle)) fail(`${rel} enthält erwarteten Inhalt nicht: ${needle}`);
  return text;
}

requireContains('src-ts/frontend/feature-visibility-shadow-compare.ts', 'Code-Teil: compareFeatureVisibility');
requireContains('src-ts/frontend/feature-visibility-shadow-compare.ts', 'Code-Teil: hasBlockingVisibilityMismatch');
requireContains('src-ts/frontend/feature-visibility-shadow-compare.ts', 'Code-Teil: formatFeatureVisibilityShadowLog');
requireContains('src-ts/quality/feature-visibility-shadow-cases.ts', 'featureVisibilityShadowCases');
requireContains('src-ts/tests/feature-visibility-shadow-runtime.ts', 'Feature-Sichtbarkeits-Shadowfälle');
requireContains('tsconfig.feature-visibility-shadow.json', 'feature-visibility-shadow-runtime.ts');
requireContains('www/static/ts-mirrors/frontend/feature-visibility-shadow-compare.mjs', 'AUTO-GENERATED FILE');

console.log('[verify-ts-feature-visibility-shadow] OK: Feature-Visibility-Shadow-Schicht ist vorhanden.');
