#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-adapter-mirrors.js
 *
 * Zweck:
 * Prüft die adapter-nahen TypeScript-zu-JavaScript-Spiegel ohne TypeScript-Compiler.
 *
 * Zusammenhang:
 * Dieser Check läuft in `publish:check`, damit Git/ZIP sofort merkt, wenn Spiegel fehlen
 * oder nicht mehr zum TS-Quellhash passen. Die produktive Runtime wird dabei nicht
 * gestartet oder verändert.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const specs = [
  ['src-ts/adapter/state-cache.ts', 'lib/ts-mirrors/adapter/state-cache.js', ['normalizeStateEntry', 'isStateValuePresent', 'readFirstAvailableState']],
  ['src-ts/adapter/api-state.ts', 'lib/ts-mirrors/adapter/api-state.js', ['toApiStateEntry', 'buildApiStateResponse']],
  ['src-ts/adapter/api-set.ts', 'lib/ts-mirrors/adapter/api-set.js', ['normalizeApiValue', 'buildSettingsWritePlan']],
  ['src-ts/adapter/connection-state.ts', 'lib/ts-mirrors/adapter/connection-state.js', ['buildInfoConnectionWritePlan']],
  ['src-ts/adapter/settings-writes.ts', 'lib/ts-mirrors/adapter/settings-writes.js', ['isCustomerSettingKey', 'normalizeSettingsWrite']],
  ['src-ts/adapter/index.ts', 'lib/ts-mirrors/adapter/index.js', ['stateCache', 'apiState', 'apiSet']],
];

/** Code-Teil: fail. Zweck: Bricht den Mirror-Check mit klarer Meldung ab. */
function fail(message) {
  console.error(`[verify-ts-adapter-mirrors] ERROR: ${message}`);
  process.exit(1);
}

/** Code-Teil: read. Zweck: Liest Pflichtdateien und liefert verständliche Fehler. */
function read(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) fail(`Pflichtdatei fehlt: ${rel}`);
  return fs.readFileSync(abs, 'utf8').replace(/\r\n/g, '\n');
}

/** Code-Teil: hash. Zweck: Berechnet den Quellhash der TypeScript-Datei. */
function hash(rel) {
  return crypto.createHash('sha256').update(read(rel)).digest('hex');
}

for (const [src, mirror, expectedExports] of specs) {
  const srcText = read(src);
  const mirrorText = read(mirror);
  const expectedHash = hash(src);
  if (!mirrorText.includes(`Quelle: ${src}`)) fail(`${mirror} enthält keinen Quellenhinweis auf ${src}`);
  if (!mirrorText.includes(`Quell-Hash: sha256:${expectedHash}`)) fail(`${mirror} hat einen veralteten Quell-Hash.`);
  if (!mirrorText.includes('AUTO-GENERATED FILE')) fail(`${mirror} enthält keinen Generator-Hinweis.`);
  for (const name of expectedExports) {
    if (!mirrorText.includes(name)) fail(`${mirror} enthält erwarteten Export/Hinweis nicht: ${name}`);
  }
  if (!srcText.includes('Code-Teil') && !srcText.includes('Datei:')) fail(`${src} enthält keine deutschen Kommentaranker.`);
}

console.log('[verify-ts-adapter-mirrors] OK: Adapter-CJS-Spiegel sind vorhanden, kommentiert und synchron.');
