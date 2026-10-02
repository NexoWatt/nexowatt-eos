#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-main-helpers-runtime.js
 *
 * Zweck:
 * Bündel-Check für den 0.7.98-Schritt „main.js in echte TypeScript-Helfer auslagern“.
 *
 * Zusammenhang:
 * Es gibt zwei Ebenen:
 * - `src-ts/backend/main-helpers/*` bereitet API-/State-Schreibpläne vor.
 * - `src-ts/backend/main-runtime/main-runtime-helpers.ts` wird bereits von `main.js`
 *   kontrolliert genutzt, z. B. für Lizenzmasken und `info.connection`.
 *
 * Wichtig:
 * Dieser Check soll bei `publish:check` schnell erkennen, ob die TS-Helfer, JS-Spiegel
 * und main.js-Anbindung auseinanderlaufen.
 */

const { spawnSync } = require('child_process');
const path = require('path');
const root = path.resolve(__dirname, '..');

function run(script) {
  const result = spawnSync(process.execPath, [path.join(root, 'scripts', script)], {
    cwd: root,
    stdio: 'inherit',
    shell: false,
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

// Code-Teil: Reihenfolge der Checks. Zweck: Erst allgemeine main-Helfer prüfen,
// danach die echte main.js-Runtime-Anbindung an den TS-Spiegel prüfen.
run('verify-ts-main-helpers.js');
run('verify-ts-main-runtime-helpers.js');

console.log('[verify-ts-main-helpers-runtime] OK: main-Helfer und Runtime-Anbindung sind gültig.');
