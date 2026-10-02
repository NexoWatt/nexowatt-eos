#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-feature-visibility.js
 *
 * Zweck:
 * Prüft die neue TypeScript-Vorbereitung für kundenseitige Feature-Sichtbarkeit.
 * Dieser Check braucht keinen TypeScript-Compiler und ist daher für schnelle lokale
 * Prüfungen geeignet.
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function fail(message) {
  console.error(`[verify-ts-feature-visibility] ERROR: ${message}`);
  process.exit(1);
}

function readRequired(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) fail(`Pflichtdatei fehlt: ${rel}`);
  return fs.readFileSync(file, 'utf8');
}

function requireContains(rel, needle) {
  const text = readRequired(rel);
  if (!text.includes(needle)) fail(`${rel} enthält erwarteten Inhalt nicht: ${needle}`);
}

requireContains('src-ts/frontend/customer-feature-visibility.ts', 'Code-Teil: explainCustomerFeatureVisibility');
requireContains('src-ts/frontend/customer-feature-visibility.ts', 'Code-Teil: decideEvcsVisibility');
requireContains('src-ts/quality/frontend-feature-visibility-cases.ts', 'no-wallbox-no-farm-stays-hidden');
requireContains('src-ts/frontend/feature-visibility-diagnostics.ts', 'Code-Teil: buildCustomerFeatureDiagnostics');
requireContains('src-ts/tests/frontend-feature-visibility-runtime.ts', 'runFrontendFeatureVisibilityCases');
requireContains('tsconfig.frontend-feature-visibility.json', 'src-ts/tests/frontend-feature-visibility-runtime.ts');
requireContains('www/static/ts-mirrors/frontend/customer-feature-visibility.mjs', 'explainCustomerFeatureVisibility');

const pkg = JSON.parse(readRequired('package.json'));
const scripts = pkg.scripts || {};
for (const key of ['test:feature-visibility', 'test:feature-visibility-runtime']) {
  if (!scripts[key]) fail(`package.json scripts.${key} fehlt.`);
}

console.log('[verify-ts-feature-visibility] OK: Feature-Visibility TS-Vorbereitung vorhanden.');
