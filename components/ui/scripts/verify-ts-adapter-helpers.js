#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-adapter-helpers.js
 *
 * Zweck:
 * Prüft die neuen adapter-nahen TypeScript-Helfer und ihre CommonJS-Spiegel ohne
 * TypeScript-Build. Dieser Check darf in `publish:check` laufen.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const mirrorSpecs = [
  { sourceRel: 'src-ts/adapter/connection-state.ts', mirrorRel: 'lib/ts-mirrors/adapter/connection-state.js', exports: ['buildInfoConnectionWritePlan'] },
  { sourceRel: 'src-ts/adapter/settings-writes.ts', mirrorRel: 'lib/ts-mirrors/adapter/settings-writes.js', exports: ['isCustomerSettingKey', 'normalizeSettingValue', 'normalizeSettingsWrite'] },
  { sourceRel: 'src-ts/adapter/state-cache.ts', mirrorRel: 'lib/ts-mirrors/adapter/state-cache.js', exports: ['normalizeStateEntry', 'isStateValuePresent', 'readCachedNumber', 'readCachedBoolean', 'readCachedString'] },
  { sourceRel: 'src-ts/adapter/api-set.ts', mirrorRel: 'lib/ts-mirrors/adapter/api-set.js', exports: ['normalizeApiValue', 'buildSettingsWritePlan'] },
  { sourceRel: 'src-ts/adapter/api-state.ts', mirrorRel: 'lib/ts-mirrors/adapter/api-state.js', exports: ['toApiStateEntry', 'buildApiStateResponse'] },
  { sourceRel: 'src-ts/adapter/index.ts', mirrorRel: 'lib/ts-mirrors/adapter/index.js', exports: [] },
];

/** Code-Teil: fail. Zweck: Bricht mit klarer Fehlermeldung ab. */
function fail(message) {
  console.error(`[verify-ts-adapter-helpers] ERROR: ${message}`);
  process.exit(1);
}

/** Code-Teil: readRequired. Zweck: Liest Pflichtdateien und normalisiert Zeilenenden. */
function readRequired(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) fail(`Pflichtdatei fehlt: ${rel}`);
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

/** Code-Teil: sourceHash. Zweck: Berechnet den erwarteten TS-Quellhash. */
function sourceHash(sourceRel) {
  return crypto.createHash('sha256').update(readRequired(sourceRel)).digest('hex');
}

/** Code-Teil: verifyHash. Zweck: Prüft, dass der JS-Spiegel zur aktuellen TS-Quelle passt. */
function verifyHash(spec) {
  const mirror = readRequired(spec.mirrorRel);
  const match = mirror.match(/Quell-Hash:\s*sha256:([a-f0-9]{64})/i);
  if (!match) fail(`${spec.mirrorRel} enthält keinen Quell-Hash.`);
  const expected = sourceHash(spec.sourceRel);
  const actual = String(match[1]).toLowerCase();
  if (actual !== expected) fail(`${spec.mirrorRel} ist veraltet. Erwartet ${expected}, gefunden ${actual}.`);
}

/** Code-Teil: verifyExports. Zweck: Lädt den Spiegel und prüft erwartete Runtime-Exports. */
function verifyExports(spec) {
  const mod = require(path.join(root, spec.mirrorRel));
  for (const name of spec.exports) {
    if (typeof mod[name] !== 'function') fail(`${spec.mirrorRel} exportiert ${name} nicht als Funktion.`);
  }
  return mod;
}

/**
 * Code-Teil: verifyRuntimeRules
 * Zweck: Prüft konkrete Fachregeln der ersten ausgelagerten main.js-Helfer.
 */
function verifyRuntimeRules() {
  const connection = require(path.join(root, 'lib/ts-mirrors/adapter/connection-state.js'));
  const plan = connection.buildInfoConnectionWritePlan(true, 'heartbeat');
  if (!plan || plan.stateId !== 'info.connection' || plan.value !== true || plan.ack !== true) {
    fail('connection-state Helfer erzeugt keinen gültigen info.connection-Schreibplan.');
  }

  const settings = require(path.join(root, 'lib/ts-mirrors/adapter/settings-writes.js'));
  if (!settings.isCustomerSettingKey('aiAdvisorEnabled')) fail('settings-writes erkennt aiAdvisorEnabled nicht.');
  if (settings.normalizeSettingValue('false') !== false) fail('settings-writes normalisiert "false" nicht korrekt.');
  if (settings.normalizeSettingValue('0') !== 0) fail('settings-writes normalisiert "0" nicht korrekt.');

  const stateCache = require(path.join(root, 'lib/ts-mirrors/adapter/state-cache.js'));
  const cache = { zero: { value: 0, ts: 1 }, no: { value: false, ts: 2 }, text: { value: '', ts: 3 } };
  if (stateCache.readCachedNumber(cache, 'zero', 99) !== 0) fail('state-cache liest 0 nicht als gültige Zahl.');
  if (stateCache.readCachedBoolean(cache, 'no', true) !== false) fail('state-cache liest false nicht als gültigen Boolean.');
  if (stateCache.readCachedString(cache, 'text', 'fallback') !== '') fail('state-cache liest leeren String nicht als gültigen String.');
}

for (const spec of mirrorSpecs) {
  verifyHash(spec);
  verifyExports(spec);
}
verifyRuntimeRules();
console.log('[verify-ts-adapter-helpers] OK: Adapter-Helfer-Spiegel sind synchron und fachlich plausibel.');
