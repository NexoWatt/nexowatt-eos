#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-backend-api-state.js
 *
 * Zweck:
 * Prüft den TypeScript-Migrationsschritt 0.7.63 für Backend-API, StateCache und Feature-Sichtbarkeit.
 *
 * Zusammenhang:
 * Dieser Check läuft ohne TypeScript-Compiler und kann deshalb in `publish:check` bleiben. Der
 * eigentliche Compiler-/Runtime-Test läuft separat über `npm run test:backend-api-state-runtime`.
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

/** Code-Teil: readRequiredFile. Zweck: Bricht verständlich ab, wenn eine Migrationsdatei fehlt. */
function readRequiredFile(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    console.error(`[ts-backend-api-state] Missing file: ${rel}`);
    process.exit(1);
  }
  return fs.readFileSync(file, 'utf8');
}

const files = {
  apiContract: readRequiredFile('src-ts/contracts/api.ts'),
  stateCache: readRequiredFile('src-ts/backend/state-cache/state-cache.ts'),
  apiHelpers: readRequiredFile('src-ts/backend/api-state/api-set-helpers.ts'),
  featureVisibility: readRequiredFile('src-ts/backend/feature-visibility/feature-visibility.ts'),
  cases: readRequiredFile('src-ts/quality/backend-api-state-cases.ts'),
  smoke: readRequiredFile('src-ts/tests/backend-api-state-smoke.ts'),
  runtime: readRequiredFile('src-ts/tests/backend-api-state-runtime.ts'),
  tsconfig: readRequiredFile('tsconfig.backend-api-state.json'),
  packageJson: readRequiredFile('package.json'),
};

const combined = Object.values(files).join('\n');

/** Code-Teil: requireAnchor. Zweck: Hält fachlich wichtige Kommentar- und Funktionsanker stabil. */
function requireAnchor(anchor, description) {
  if (!combined.includes(anchor)) {
    console.error(`[ts-backend-api-state] Missing ${description}: ${anchor}`);
    process.exit(1);
  }
}

for (const [anchor, description] of [
  ['ApiSetRequest', 'API-Set-Vertrag'],
  ['normalizeCachedState', 'StateCache-Normalisierung'],
  ['readNumberFromCache', 'Zahlenleser mit 0-W-Regel'],
  ['planApiStateWrite', 'API-State-Schreibplan'],
  ['buildFeatureVisibilityState', 'Feature-Sichtbarkeit'],
  ['zero-watt-is-valid', 'Regression: 0 W bleibt gültig'],
  ['settings-write-builds-state-id', 'Regression: API-State-ID'],
  ['Code-Teil: readNumberFromCache', 'deutscher Kommentar StateCache'],
  ['Code-Teil: planApiStateWrite', 'deutscher Kommentar API-Set-Helfer'],
  ['Code-Teil: buildFeatureVisibilityState', 'deutscher Kommentar Feature-Sichtbarkeit'],
  ['test:backend-api-state-runtime', 'npm-Runtime-Testskript'],
]) {
  requireAnchor(anchor, description);
}

console.log('[ts-backend-api-state] OK: Backend-API-/StateCache-Struktur und Kommentare vorhanden.');
