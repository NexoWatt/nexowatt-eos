#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Datei: scripts/verify-ts-feature-visibility-resolver.js
 *
 * Zweck:
 * Strukturprüfung für den TypeScript-Schritt 0.7.68.
 *
 * Zusammenhang:
 * Dieser Check verhindert, dass der zentrale Feature-Sichtbarkeitsresolver oder seine
 * Regressionen versehentlich aus dem Projekt verschwinden.
 */

const root = path.join(__dirname, '..');
const requiredFiles = [
  'src-ts/resolvers/feature-visibility-resolver.ts',
  'src-ts/quality/feature-visibility-resolver-cases.ts',
  'src-ts/tests/feature-visibility-resolver-runtime.ts',
  'tsconfig.feature-visibility-resolver.json',
];

for (const rel of requiredFiles) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) throw new Error(`[ts-feature-visibility-resolver] Datei fehlt: ${rel}`);
}

const resolverSource = fs.readFileSync(path.join(root, 'src-ts/resolvers/feature-visibility-resolver.ts'), 'utf8');
const casesSource = fs.readFileSync(path.join(root, 'src-ts/quality/feature-visibility-resolver-cases.ts'), 'utf8');
const runtimeSource = fs.readFileSync(path.join(root, 'src-ts/tests/feature-visibility-resolver-runtime.ts'), 'utf8');

const anchors = [
  [resolverSource, 'Code-Teil: hasRealEvcsPresenceProof'],
  [resolverSource, 'Code-Teil: hasRealStorageFarmPresenceProof'],
  [resolverSource, 'Code-Teil: deriveCustomerFeatureVisibility'],
  [casesSource, 'anlage-ohne-wallbox-und-ohne-farm'],
  [casesSource, 'wetter-braucht-daten'],
  [runtimeSource, 'Code-Teil: runCentralResolverCases'],
  [runtimeSource, 'Code-Teil: runCompatibilityExports'],
];

for (const [source, needle] of anchors) {
  if (!source.includes(needle)) throw new Error(`[ts-feature-visibility-resolver] Kommentar-/Funktionsanker fehlt: ${needle}`);
}

console.log('[ts-feature-visibility-resolver] OK: Feature-Sichtbarkeitsresolver und Regressionen vorhanden.');
