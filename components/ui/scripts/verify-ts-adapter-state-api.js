#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-adapter-state-api.js
 *
 * Zweck:
 * Prüft, ob der TypeScript-Schritt für die spätere `main.js`-State-/API-Migration vorhanden ist.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const requiredFiles = [
  'src-ts/contracts/api.ts',
  'src-ts/adapter/state-cache.ts',
  'src-ts/adapter/api-state.ts',
  'src-ts/adapter/api-set.ts',
  'src-ts/adapter/connection-state.ts',
  'src-ts/quality/adapter-state-api-cases.ts',
  'src-ts/tests/adapter-state-api-smoke.ts',
  'src-ts/tests/adapter-state-api-runtime.ts',
  'tsconfig.adapter-state-api.json',
];
const requiredAnchors = [
  'Code-Teil: normalizeStateEntry',
  'Code-Teil: buildApiStateResponse',
  'Code-Teil: buildSettingsWritePlan',
  'Code-Teil: buildInfoConnectionWritePlan',
  'ADAPTER_STATE_API_CASES',
];
let failed = false;
function fail(message) { console.error(`[ts-adapter-state-api-check] ERROR: ${message}`); failed = true; }
for (const file of requiredFiles) if (!fs.existsSync(path.join(root, file))) fail(`${file} fehlt`);
const combined = requiredFiles.filter((f) => f.endsWith('.ts') && fs.existsSync(path.join(root, f))).map((f) => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
for (const anchor of requiredAnchors) if (!combined.includes(anchor)) fail(`Kommentar-/Codeanker fehlt: ${anchor}`);
if (failed) process.exit(1);
console.log('[ts-adapter-state-api-check] OK: Adapter-State-/API-TypeScript-Vorbereitung vorhanden.');
