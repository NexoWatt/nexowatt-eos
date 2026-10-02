#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-main-api-productive.js
 *
 * Zweck:
 * Prüft den produktiven 0.7.100-Schritt für `/api/state` und einfache `/api/set settings.*`.
 *
 * Zusammenhang:
 * Diese Prüfung stellt sicher, dass main.js die TS-Helfer wirklich produktiv nutzt,
 * aber weiterhin einen JS-Fallback besitzt. Dadurch wird die Migration messbar, ohne
 * komplexe EMS-/Flow-/EVCS-Schreibpfade anzufassen.
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function fail(msg) { console.error('[ts-main-api-productive] ERROR: ' + msg); process.exit(1); }
function read(rel) { const file = path.join(root, rel); if (!fs.existsSync(file)) fail('Pflichtdatei fehlt: ' + rel); return fs.readFileSync(file, 'utf8'); }

const main = read('main.js');
const apiSetTs = read('src-ts/main/api-set.ts');

for (const snippet of [
  'nwMainApiStateTsHelpers',
  'nwMainApiSetTsHelpers',
  '_nwBuildApiStateTsRuntimeResponse',
  '_nwTryApplyApiSetTsSettingsPlan',
  "const tsStates = this._nwBuildApiStateTsRuntimeResponse('GET /api/state')",
  'const source = tsStates || this.stateCache;',
  'installerAccess ? source : nwBuildPublicStateSnapshot(source, true)',
  "source: 'ts-settings-plan'",
  'apiStateRuntime: this._nwApiStateTsRuntimeLast',
  'apiSetRuntime: this._nwApiSetTsRuntimeLast',
]) {
  if (!main.includes(snippet)) fail('main.js enthält erwarteten produktiven TS-API-Anker nicht: ' + snippet);
}

for (const snippet of [
  "{ key: 'aiAdvisorEnabled'",
  "{ key: 'weatherEnabled'",
  "{ key: 'weatherApiKey'",
  "{ key: 'flowInvertGrid'",
  "{ key: 'netFeeEnabled'",
]) {
  if (!apiSetTs.includes(snippet)) fail('src-ts/main/api-set.ts enthält erwartete Setting-Definition nicht: ' + snippet);
}

const apiStateMirror = require(path.join(root, 'lib/ts-mirrors/main/api-state'));
const apiSetMirror = require(path.join(root, 'lib/ts-mirrors/main/api-set'));
if (typeof apiStateMirror.buildMainApiStateResponse !== 'function') fail('api-state Spiegel exportiert buildMainApiStateResponse nicht.');
if (typeof apiSetMirror.buildMainSettingsWritePlan !== 'function') fail('api-set Spiegel exportiert buildMainSettingsWritePlan nicht.');

const apiState = apiStateMirror.buildMainApiStateResponse({
  zeroW: { value: 0, ts: 1 },
  falseValue: { value: false, ts: 2 },
  emptyText: { value: '', ts: 3 },
});
if (!apiState.states.zeroW || apiState.states.zeroW.value !== 0) fail('/api/state TS-Builder verliert 0 nicht korrekt.');
if (!apiState.states.falseValue || apiState.states.falseValue.value !== false) fail('/api/state TS-Builder verliert false nicht korrekt.');
if (!apiState.states.emptyText || apiState.states.emptyText.value !== '') fail('/api/state TS-Builder verliert leeren String nicht korrekt.');

const boolPlan = apiSetMirror.buildMainSettingsWritePlan({ scope: 'settings', key: 'aiAdvisorEnabled', value: 'false' });
if (!boolPlan.ok || !boolPlan.plan || boolPlan.plan.value !== false) fail('/api/set TS-Plan normalisiert String false nicht korrekt.');
const stringPlan = apiSetMirror.buildMainSettingsWritePlan({ scope: 'settings', key: 'weatherApiKey', value: '12345' });
if (!stringPlan.ok || !stringPlan.plan || stringPlan.plan.value !== '12345') fail('/api/set TS-Plan hält weatherApiKey nicht als String.');
const numberPlan = apiSetMirror.buildMainSettingsWritePlan({ scope: 'settings', key: 'aiAdvisorEvTargetSocPct', value: '500' });
if (!numberPlan.ok || !numberPlan.plan || numberPlan.plan.value !== 100) fail('/api/set TS-Plan begrenzt aiAdvisorEvTargetSocPct nicht korrekt.');

console.log('[ts-main-api-productive] OK: /api/state nutzt TS-Produktivpfad mit redigierter Kundenantwort; settings-/api/set TS-Produktivpfad geprüft.');
