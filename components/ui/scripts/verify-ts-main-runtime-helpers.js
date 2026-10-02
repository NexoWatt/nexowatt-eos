#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-main-runtime-helpers.js
 *
 * Zweck:
 * Prüft den ersten echten main.js-Auslagerungsschritt nach TypeScript.
 *
 * Zusammenhang:
 * 0.7.98 nutzt erstmals einen generierten TS->JS-Helfer produktiv in main.js,
 * allerdings mit Fallback auf die alte JS-Logik. Dieser Check stellt sicher,
 * dass Quelle, Spiegel und Runtime-Anbindung vorhanden sind.
 */

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

function fail(message) {
  console.error('[verify-ts-main-runtime-helpers] ERROR: ' + message);
  process.exit(1);
}

function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) fail('Pflichtdatei fehlt: ' + rel);
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

function requireContains(rel, needle) {
  const text = read(rel);
  if (!text.includes(needle)) fail(rel + ' enthält erwarteten Inhalt nicht: ' + needle);
  return text;
}

// Code-Teil: Strukturprüfung. Zweck: Die TS-Quelle und der JS-Spiegel müssen vorhanden sein.
requireContains('src-ts/backend/main-runtime/main-runtime-helpers.ts', 'Code-Teil: buildInfoConnectionStateUpdate');
requireContains('src-ts/backend/main-runtime/main-runtime-helpers.ts', 'Code-Teil: normalizeApiSetPrimitive');
requireContains('lib/ts-mirrors/backend/main-runtime/main-runtime-helpers.js', 'AUTO-GENERATED FILE');
requireContains('lib/ts-mirrors/backend/main-runtime/main-runtime-helpers.js', 'Quell-Hash: sha256:');

// Code-Teil: main.js-Anbindung. Zweck: main.js muss den Spiegel sicher laden und Fallbacks behalten.
requireContains('main.js', 'nwMainRuntimeTsHelpers');
requireContains('main.js', "require('./lib/ts-mirrors/backend/main-runtime/main-runtime-helpers')");
requireContains('main.js', 'main-runtime TS helper failed');
requireContains('main.js', 'buildInfoConnectionStateUpdate');
// The integrated product delegates licensing to the central Admin lease client.
// The retired local key store must not be reintroduced merely to satisfy this gate.
const runtime = requireContains('main.js', 'eosIntegrated.makeLicenseClient(this)');
requireContains('main.js', "managedBy: 'eos-admin.0'");
for (const retired of ['_nwLicenseSecret', '_nwEvaluateLicense', '_nwExpectedLicenseKey']) {
  if (runtime.includes(retired)) fail('Entfernter lokaler Lizenzpfad wieder vorhanden: ' + retired);
}

// Code-Teil: Runtime-Prüfung. Zweck: Der Spiegel muss mit Node importierbar sein und kritische Regeln erfüllen.
const helper = require(path.join(root, 'lib/ts-mirrors/backend/main-runtime/main-runtime-helpers.js'));
if (helper.isMaskedLicenseKeyInput('********') !== true) fail('Maskierter Lizenzwert wurde nicht erkannt.');
if (helper.isMaskedLicenseKeyInput('NW1T-REAL-KEY-123') !== false) fail('Echter NW1T-Schlüssel wurde fälschlich maskiert.');
if (helper.normalizeLicenseKeyForStorage('********') !== '') fail('Maskierter Lizenzwert dürfte nicht speicherbar sein.');
const plan = helper.buildInfoConnectionStateUpdate(true, 'runtime-check', 456);
if (!plan || plan.id !== 'info.connection' || plan.value !== true || plan.ack !== true || plan.ts !== 456) fail('info.connection Schreibplan ist falsch.');
const normalizedFalse = helper.normalizeApiSetPrimitive('false');
if (!normalizedFalse || normalizedFalse.value !== false || normalizedFalse.valueType !== 'boolean') fail('false-String wurde falsch normalisiert.');
const normalizedZero = helper.normalizeApiSetPrimitive('0');
if (!normalizedZero || normalizedZero.value !== false || normalizedZero.valueType !== 'boolean') fail('0-String soll für Schalter als false normalisiert werden.');

console.log('[verify-ts-main-runtime-helpers] OK: main.js nutzt den ersten TS-Helfer kontrolliert mit Fallback.');
