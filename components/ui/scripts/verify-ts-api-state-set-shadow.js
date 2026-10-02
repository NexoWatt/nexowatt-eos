#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-api-state-set-shadow.js
 *
 * Zweck:
 * Prüft den 0.7.99-Schritt: `/api/state` und `/api/set` werden als TS-Helfer im
 * Shadow-/Vergleichsmodus vorbereitet.
 *
 * Wichtig:
 * Dieser Check stellt sicher, dass die TS-Diagnose erhalten bleibt. Ab 0.7.100
 * darf `/api/state` produktiv den TS-Builder nutzen, muss aber einen JS-Fallback besitzen.
 */

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

function fail(message) {
  console.error('[verify-ts-api-state-set-shadow] ERROR: ' + message);
  process.exit(1);
}
function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) fail('Pflichtdatei fehlt: ' + rel);
  return fs.readFileSync(file, 'utf8');
}
function contains(rel, needle) {
  const text = read(rel);
  if (!text.includes(needle)) fail(`${rel} enthält nicht: ${needle}`);
}

contains('src-ts/backend/main-runtime/main-runtime-helpers.ts', 'Code-Teil: buildApiStateShadowSnapshot');
contains('src-ts/backend/main-runtime/main-runtime-helpers.ts', 'Code-Teil: buildApiSetShadowPlan');
contains('lib/ts-mirrors/backend/main-runtime/main-runtime-helpers.js', 'exports.buildApiStateShadowSnapshot');
contains('lib/ts-mirrors/backend/main-runtime/main-runtime-helpers.js', 'exports.buildApiSetShadowPlan');
contains('main.js', '_nwRunApiStateTsShadowComparison');
contains('main.js', '_nwRunApiSetTsShadowPlan');
contains('main.js', 'const source = tsStates || this.stateCache;');
contains('main.js', 'nwBuildPublicStateSnapshot(source, true)');
contains('main.js', 'installerAccess ? source : nwBuildPublicStateSnapshot(source, true)');

const helper = require(path.join(root, 'lib/ts-mirrors/backend/main-runtime/main-runtime-helpers.js'));
if (typeof helper.buildApiStateShadowSnapshot !== 'function') fail('buildApiStateShadowSnapshot wird nicht exportiert.');
if (typeof helper.buildApiSetShadowPlan !== 'function') fail('buildApiSetShadowPlan wird nicht exportiert.');

const summary = helper.buildApiStateShadowSnapshot({ zero: { value: 0 }, off: { value: false }, text: { value: '' } }, 123);
if (!summary.ok) fail('api-state Snapshot sollte ok sein.');
if (!summary.zeroValueKeys.includes('zero')) fail('api-state Snapshot muss 0 als gültigen Wert zählen.');
if (!summary.falseValueKeys.includes('off')) fail('api-state Snapshot muss false als gültigen Wert zählen.');

const plan = helper.buildApiSetShadowPlan('settings', 'aiAdvisorEnabled', 'false');
if (!plan.ok) fail('api-set Shadow-Plan sollte ok sein.');
if (plan.targetStateId !== 'settings.aiAdvisorEnabled') fail('api-set Shadow-Plan hat falsche State-ID.');
if (!plan.normalized || plan.normalized.value !== false) fail('api-set Shadow-Plan muss false-String zu false normalisieren.');

const blocked = helper.buildApiSetShadowPlan('settings', 'peakShavingEnabled', false);
if (blocked.blocked !== true) fail('peakShavingEnabled muss im Shadow-Plan als blocked markiert werden.');

console.log('[verify-ts-api-state-set-shadow] OK: /api/state nutzt TS-Builder mit redigierter Kundenantwort und vollständiger Installerdiagnose; /api/set-Shadow bleibt kompatibel.');
