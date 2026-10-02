#!/usr/bin/env node
'use strict';

/**
 * Code-Teil: TypeScript-Doctor für die Migrationsphase.
 * Zweck: Prüft, ob TypeScript lokal installiert ist, und startet optional den
 *        strikten Typecheck der Dateien unter src-ts/ und tests/types/.
 * Zusammenhang: publish:check bleibt ohne tsc lauffähig; GitHub/CI und
 *        Entwicklungschecks nutzen dieses Skript über npm run typecheck.
 * Wichtig: Dieses Skript verändert keine Adapterlogik. Es erklärt nur sauber,
 *        was fehlt, wenn node_modules noch nicht installiert wurden.
 */
const { spawnSync } = require('child_process');
const path = require('path');

function log(msg) { console.log(`[ts-doctor] ${msg}`); }
function fail(msg, code = 1) { console.error(`[ts-doctor] ERROR: ${msg}`); process.exit(code); }

let ts;
try {
  ts = require('typescript');
} catch (_e) {
  fail('TypeScript wurde nicht lokal gefunden. Bitte zuerst "npm install" oder in CI "npm ci" ausführen. Danach: npm run typecheck');
}

log(`TypeScript ${ts.version} gefunden.`);
if (!process.argv.includes('--run')) {
  log('Nur Umgebung geprüft. Für den Typecheck: npm run typecheck');
  process.exit(0);
}

const tscPath = require.resolve('typescript/lib/tsc');
const result = spawnSync(process.execPath, [tscPath, '-p', 'tsconfig.json', '--noEmit'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
});
process.exit(result.status || 0);
