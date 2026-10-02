'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Datei: scripts/verify-ts-api-state-feature.js
 *
 * Zweck:
 * Strukturcheck für den TypeScript-Migrationsschritt 0.7.63.
 */
const root = path.join(__dirname, '..');
const requiredFiles = [
  'src-ts/contracts/api-state.ts',
  'src-ts/backend/state/api-state-cache.ts',
  'src-ts/backend/state/index.ts',
  'src-ts/backend/visibility/feature-visibility.ts',
  'src-ts/backend/visibility/index.ts',
  'src-ts/quality/api-state-feature-cases.ts',
  'src-ts/tests/api-state-feature-runtime.ts',
  'src-ts/tests/api-state-feature-smoke.ts',
  'tsconfig.api-state-feature.json',
];
for (const rel of requiredFiles) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) throw new Error(`[ts-api-state-feature] Datei fehlt: ${rel}`);
}
const apiStateSource = fs.readFileSync(path.join(root, 'src-ts/backend/state/api-state-cache.ts'), 'utf8');
const visibilitySource = fs.readFileSync(path.join(root, 'src-ts/backend/visibility/feature-visibility.ts'), 'utf8');
const runtimeSource = fs.readFileSync(path.join(root, 'src-ts/tests/api-state-feature-runtime.ts'), 'utf8');
const requiredAnchors = [
  [apiStateSource, 'Code-Teil: extractPayloadValue'],
  [apiStateSource, "`0`, `false` und `''` bleiben gültige Werte"],
  [apiStateSource, 'Code-Teil: buildApiStateEnvelope'],
  [visibilitySource, 'Code-Teil: deriveFeatureVisibility'],
  [visibilitySource, 'EVCS zählt nur mit echtem Ladepunktnachweis'],
  [runtimeSource, 'Code-Teil: runApiStateCases'],
  [runtimeSource, 'Code-Teil: runFeatureVisibilityCases'],
];
for (const [source, needle] of requiredAnchors) {
  if (!source.includes(needle)) throw new Error(`[ts-api-state-feature] Kommentar-/Funktionsanker fehlt: ${needle}`);
}
console.log('[ts-api-state-feature] OK: API-State- und Feature-Sichtbarkeits-TS-Struktur vorhanden.');
