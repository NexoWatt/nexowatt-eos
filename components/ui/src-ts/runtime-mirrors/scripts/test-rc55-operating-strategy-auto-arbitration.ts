// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/test-rc55-operating-strategy-auto-arbitration.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/test-rc55-operating-strategy-auto-arbitration.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Produktive Originalquellen liegen unter
 * src-ts/runtime-executables/ bzw. den im generierten JS genannten TS-Pfaden.
 * Dort ändern, Laufzeit erzeugen und danach die Spiegel synchronisieren.
 * Build-/Prüfskripte ohne TS-Original werden weiterhin unter scripts/ gepflegt.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: 063f30651d7e1a4443024561e52bfd0d3dec3021402673349f9aaf0bab82dd35
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
let ts;
try { ts = require('typescript'); } catch (error) {
  console.error('TypeScript dependency is required for RC55 arbitration test.');
  throw error;
}
const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'src', 'lib', 'operatingStrategies', 'autoArbitration.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, strict: true, esModuleInterop: true },
  reportDiagnostics: true,
});
if (compiled.diagnostics && compiled.diagnostics.length) {
  throw new Error(ts.formatDiagnosticsWithColorAndContext(compiled.diagnostics, {
    getCanonicalFileName: f => f,
    getCurrentDirectory: () => root,
    getNewLine: () => '\n',
  }));
}
const moduleBox = { exports: {} };
const wrapper = `(function(require,module,exports){${compiled.outputText}\n})`;
vm.runInThisContext(wrapper, { filename: sourcePath })(require, moduleBox, moduleBox.exports);
const api = moduleBox.exports;
const now = 1_700_000_000_000;
const base = {
  nowMs: now, appInstalled: true, appEnabled: true, profileActive: true,
  resourceId: 'cp-1', resourceEnabled: true, strategyParticipationEnabled: true,
  operatingMode: 'Auto', autoSource: 'strategy', controlStage: 'active',
  commissioningConfirmed: true, online: true, alarmActive: false,
  telemetryFresh: true, fallback: 'standardAuto',
};
const env = { minPowerW: 0, maxPowerW: 11000 };
/**
 * Code-Teil: req
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const req = (overrides={}) => ({
  id: 'r1', resourceId: 'cp-1', ruleId: 'rule-1', requirementClass: 'should', priority: 50,
  issuedAtMs: now-1000, expiresAtMs: now+14000, targetPowerW: 8000,
  reason: 'target charging', ...overrides,
});
assert.equal(api.arbitrateStrategyPowerRequests([req()], {...base, appEnabled:false}, env).owner, 'standardAuto');
assert.equal(api.arbitrateStrategyPowerRequests([req()], {...base, operatingMode:'Boost'}, env).reason, 'mode-not-auto');
assert.equal(api.arbitrateStrategyPowerRequests([req()], {...base, autoSource:'standard'}, env).reason, 'standard-auto-selected');
let result = api.arbitrateStrategyPowerRequests([req()], {...base, controlStage:'shadow'}, env);
assert.equal(result.handoverPermitted, false);
assert.equal(result.shadowEvaluation, true);
result = api.arbitrateStrategyPowerRequests([req()], {...base, controlStage:'commissioning'}, env);
assert.equal(result.handoverPermitted, false);
result = api.arbitrateStrategyPowerRequests([req()], {...base, commissioningConfirmed:false}, env);
assert.equal(result.handoverPermitted, false);
result = api.arbitrateStrategyPowerRequests([req({expiresAtMs:now})], base, env);
assert.equal(result.reason, 'no-fresh-request');
result = api.arbitrateStrategyPowerRequests([
  req({id:'may', requirementClass:'may', priority:100, targetPowerW:10000}),
  req({id:'must', requirementClass:'must', priority:1, targetPowerW:9000}),
], base, env);
assert.equal(result.selectedRequestId, 'must');
assert.equal(result.owner, 'strategy');
assert.equal(result.handoverPermitted, true);
result = api.arbitrateStrategyPowerRequests([req({targetPowerW:16000})], base, {...env, maxPowerW:4200, limitingReason:'section-14a'});
assert.equal(result.finalPlannerPowerW, 4200);
assert.equal(result.limitingReason, 'section-14a');
result = api.arbitrateStrategyPowerRequests([req()], base, {...env, forceStop:true, limitingReason:'emergency-stop'});
assert.equal(result.owner, 'pause');
assert.equal(result.finalPlannerPowerW, 0);
result = api.arbitrateStrategyPowerRequests([req({resourceId:'cp-2'})], base, env);
assert.equal(result.reason, 'no-fresh-request');
assert.equal(api.SAFE_STRATEGY_AUTO_DEFAULTS.defaultAutoSource, 'standard');
assert.equal(api.SAFE_STRATEGY_AUTO_DEFAULTS.stage, 'shadow');
assert.equal(api.SAFE_STRATEGY_AUTO_DEFAULTS.requirePerResourceOptIn, true);
assert.equal(api.SAFE_STRATEGY_AUTO_DEFAULTS.requireCommissioningConfirmation, true);
assert.equal(source.includes('setState('), false, 'Arbitration module must not write ioBroker states directly');
console.log('RC55 operating-strategy Auto arbitration: all safety contract tests passed.');
