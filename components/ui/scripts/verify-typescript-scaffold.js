#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-typescript-scaffold.js
 *
 * Zweck:
 * Prüft die neue TypeScript-Migrationsbasis, ohne produktive Adapterlogik zu laden.
 * Dieser Check ist bewusst klein und stabil: Er prüft nur, ob die erwarteten
 * TS-Konfigurationsdateien, Vertragsdateien und Compile-only-Beispiele vorhanden sind.
 *
 * Zusammenhang:
 * - `npm run typecheck` prüft den TypeScript-Compiler.
 * - Dieses Skript prüft zusätzlich die Projektstruktur, damit spätere Migrationen
 *   nicht versehentlich außerhalb des geplanten `src-ts/`-Bereichs anfangen.
 *
 * Wichtig:
 * Das Skript ändert keine Dateien und wird nicht im ioBroker-Runtime-Betrieb genutzt.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

/**
 * Code-Teil: Pflichtdateien prüfen.
 *
 * Zweck:
 * Die TypeScript-Migration soll reproduzierbar sein. Fehlt eine dieser Dateien,
 * ist der Scaffold nicht vollständig und GitHub/CI soll rot werden.
 */
const requiredFiles = [
  'tsconfig.base.json',
  'tsconfig.json',
  'tsconfig.build.json',
  'tsconfig.contracts.json',
  'src-ts/contracts/index.ts',
  'src-ts/contracts/energy-flow.ts',
  'src-ts/contracts/features.ts',
  'src-ts/contracts/ai-advisor.ts',
  'src-ts/contracts/license.ts',
  'src-ts/test-fixtures/energy-flow-contract.examples.ts',
  'src-ts/test-fixtures/feature-visibility-contract.examples.ts',
  'src-ts/test-fixtures/ai-advisor-contract.examples.ts',
  'src-ts/test-fixtures/license-contract.examples.ts',
  'docs/TYPESCRIPT_BUILD_BASIS_0758_DE.md',
  'docs/TYPESCRIPT_RELEASE_PLAN_0758_DE.md',
];

let failed = false;
for (const rel of requiredFiles) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    console.error(`[ts-scaffold] Missing required file: ${rel}`);
    failed = true;
  }
}

/**
 * Code-Teil: package.json-Skripte prüfen.
 *
 * Zweck:
 * `publish:check` soll npm-stabil bleiben, während TypeScript in eigenen
 * Befehlen geprüft wird. Diese Trennung verhindert, dass lokales `npm publish`
 * an einem fehlenden `node_modules/.bin/tsc` scheitert.
 */
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const scripts = pkg.scripts || {};
const requiredScripts = ['typecheck', 'typecheck:contracts', 'build:ts', 'test:ts-scaffold', 'test:all'];
for (const name of requiredScripts) {
  if (!scripts[name]) {
    console.error(`[ts-scaffold] Missing npm script: ${name}`);
    failed = true;
  }
}

if (scripts['publish:check'] && scripts['publish:check'].includes('typecheck')) {
  console.error('[ts-scaffold] publish:check must not directly call typecheck. Use test:all in CI.');
  failed = true;
}

if (failed) process.exit(1);
console.log('[ts-scaffold] OK: TypeScript migration scaffold is complete.');
