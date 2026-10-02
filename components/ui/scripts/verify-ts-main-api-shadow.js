#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-main-api-shadow.js
 *
 * Zweck:
 * Prüft den Migrationsschritt 0.7.99: /api/state und /api/set laufen über
 * TypeScript-Helfer im Shadow-/Vergleichsmodus.
 *
 * Zusammenhang:
 * Ab 0.7.100 nutzt /api/state produktiv den TS-Builder mit JS-Fallback.
 * Der Shadow-Vergleich bleibt zusätzlich erhalten, damit die Migration weiter messbar ist.
 */

const fs = require('fs');
const path = require('path');
const root = process.cwd();

function fail(msg) {
  console.error('[ts-main-api-shadow] ERROR:', msg);
  process.exit(1);
}
function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) fail(`Datei fehlt: ${rel}`);
  return fs.readFileSync(file, 'utf8');
}
function need(text, marker, label) {
  if (!text.includes(marker)) fail(`Marker fehlt: ${label}`);
}

const main = read('main.js');
read('lib/ts-mirrors/backend/main-runtime/main-runtime-helpers.js');

need(main, "require('./lib/ts-mirrors/backend/main-runtime/main-runtime-helpers')", 'main-runtime TS-Helfer werden geladen');
need(main, '_nwRunApiStateTsShadowComparison', '/api/state Shadow-Funktion vorhanden');
need(main, '_nwRunApiSetTsShadowPlan', '/api/set Shadow-Funktion vorhanden');
need(main, "this._nwRunApiStateTsShadowComparison('GET /api/state')", '/api/state ruft Shadow-Vergleich auf');
need(main, 'this._nwRunApiSetTsShadowPlan(scope, key, value)', '/api/set ruft Shadow-Schreibplan auf');
need(main, 'mainApiTsShadow', '/config zeigt API-Shadow-Diagnose');
need(main, 'const source = tsStates || this.stateCache;', '/api/state nutzt TS mit JS-Fallback');
need(main, 'installerAccess ? source : nwBuildPublicStateSnapshot(source, true)', '/api/state redigiert Kundenantworten');

const helpers = require(path.join(root, 'lib/ts-mirrors/backend/main-runtime/main-runtime-helpers.js'));
if (!helpers || typeof helpers.compareApiStateShadow !== 'function') fail('compareApiStateShadow wird nicht exportiert');
if (typeof helpers.buildApiSetShadowPlan !== 'function') fail('buildApiSetShadowPlan wird nicht exportiert');
const stateResult = helpers.compareApiStateShadow({ zeroW: { value: 0, ts: 1 }, disabled: { value: false, ts: 2 } });
if (!stateResult || stateResult.ok !== true || !stateResult.snapshot || !stateResult.snapshot.zeroValueKeys.includes('zeroW') || !stateResult.snapshot.falseValueKeys.includes('disabled')) {
  fail('compareApiStateShadow behandelt 0/false nicht korrekt');
}
const setPlan = helpers.buildApiSetShadowPlan('settings', 'weatherEnabled', 'false');
if (!setPlan || setPlan.ok !== true || !setPlan.normalized || setPlan.normalized.value !== false) fail('buildApiSetShadowPlan normalisiert false nicht korrekt');
const blocked = helpers.buildApiSetShadowPlan('settings', 'peakShavingEnabled', true);
if (!blocked || blocked.blocked !== true) fail('buildApiSetShadowPlan blockiert peakShavingEnabled nicht');

console.log('[ts-main-api-shadow] OK: /api/state nutzt TS-Fallback-Pfad, redigierte Kundenantwort und erhaltene Shadow-Diagnose.');
