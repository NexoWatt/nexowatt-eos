#!/usr/bin/env node
'use strict';
/**
 * Datei: scripts/verify-ts-charging-final-handover.js
 * Zweck: Prüft den finalen EVCS-TS-Handover: TypeScript ist fachliche Quelle,
 * JavaScript bleibt nur generierte Runtime-Grenze, ioBroker-Executor und harter Fallback.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function need(rel, marker, label) {
  const text = read(rel);
  if (!text.includes(marker)) {
    console.error(`[ts-charging-final-handover] ${rel}: fehlt ${label || marker}`);
    process.exit(1);
  }
}
need('src-ts/ems/charging-management/charging-normal-source.ts', 'buildChargingEvcsJavascriptRemovalDecision', 'finales EVCS-JS-Removal-Gate in TS');
need('src-ts/ems/charging-management/charging-normal-source.ts', 'nodeIobrokerStillExecutesGeneratedJavascript', 'saubere Trennung TS-Quelle vs. generierte JS-Runtime');
need('src-ts/ems/charging-management/charging-normal-source.ts', 'generated-js-runtime-boundary-only', 'JS-Rolle nur Runtime-Grenze');
need('lib/ts-mirrors/ems/charging-management/charging-normal-source.js', 'exports.buildChargingEvcsJavascriptRemovalDecision', 'CJS-Export finales Handover-Gate');
need('ems/modules/charging-management.js', '_publishChargingEvcsJavascriptRemovalState', 'Runtime publiziert finales JS-Abbau-Gate');
need('ems/modules/charging-management.js', 'tsEvcsJsRemovalJson', 'Runtime-State EVCS JS-Removal JSON');
need('ems/modules/charging-management.js', 'tsEvcsJsRemovalReady', 'Runtime-State EVCS JS-Removal Ready');
need('ems/modules/charging-management.js', 'tsAdapterRuntimeHandoverJson', 'Runtime-State Adapter Handover JSON');
need('ems/modules/charging-management.js', 'typescript-source-with-generated-js-runtime-boundary', 'Runtime-Quelle macht generierte JS-Grenze sichtbar');
need('main.js', 'tsEvcsJsRemovalJson', 'API liefert EVCS JS-Removal JSON');
need('main.js', 'tsAdapterRuntimeHandoverJson', 'API liefert Adapter Runtime-Handover');
need('www/ems-apps.js', 'TS‑Finale: EVCS JS‑Abbau bereit', 'App-Center zeigt finale EVCS-Abbaukarte');
need('www/ems-apps.js', 'TS‑Runtime: Adapter Handover', 'App-Center zeigt Adapter-Handoverkarte');

const normalGate = require(path.join(root, 'lib/ts-mirrors/ems/charging-management/charging-normal-source.js'));
const normalSource = normalGate.buildChargingNormalSourceDecision({
  context: 'normal-allocation-write-plan',
  mode: 'auto',
  status: 'ok',
  budget: { source: 'ts-charging-budget-productive-v1', productive: true, ok: true, fallback: false },
  control: { source: 'ts-charging-control-productive-v1', productive: true, ok: true, fallback: false },
  allocation: { source: 'ts-charging-allocation-normal-source-v1', productive: true, ok: true, normalSource: true, fallback: false },
  writePlan: { source: 'ts-charging-setpoint-write-plan-productive-v1', productive: true, ok: true, fallback: false },
  executor: { source: 'ts-write-plan', ok: true, appliedCount: 1, failedCount: 0, skippedCount: 0 },
  legacy: { source: 'ts-charging-legacy-js-decision-tree-reduction-v5', jsRole: 'executor-only', fallbackReason: '' },
  ts: 123,
});
const removal = normalGate.buildChargingEvcsJavascriptRemovalDecision({
  context: 'normal-allocation-write-plan',
  normalSource,
  allocation: { source: 'ts-charging-allocation-normal-source-v1', productive: true, ok: true, normalSource: true, fallback: false },
  writePlan: { source: 'ts-charging-setpoint-write-plan-productive-v1', productive: true, ok: true, fallback: false },
  executor: { source: 'ts-write-plan', ok: true, appliedCount: 1, failedCount: 0, skippedCount: 0 },
  legacy: { source: 'ts-charging-legacy-js-decision-tree-reduction-v5', jsRole: 'executor-only', fallbackReason: '' },
  ts: 456,
});
if (!removal || !removal.readyForEvcsJsDecisionTreeRemoval || !removal.readyForAdapterTsRuntime || removal.runtimeSource !== 'typescript') {
  console.error('[ts-charging-final-handover] Finales Handover-Gate wird bei grünem Normalpfad nicht ready.');
  process.exit(1);
}
if (!removal.removal || removal.removal.evcsDecisionTreeCanBeRemoved !== true || removal.removal.javascriptSetStateExecutorBoundaryKept !== true || removal.removal.generatedJavascriptRuntimeArtifactsKept !== true) {
  console.error('[ts-charging-final-handover] Removal-Vertrag trennt JS-Altlogik und Runtime-Grenze nicht sauber.');
  process.exit(1);
}
if (!removal.safety || removal.safety.nodeIobrokerStillExecutesGeneratedJavascript !== true || removal.safety.noJavascriptEvcsNormalDecisionWhenOk !== true) {
  console.error('[ts-charging-final-handover] Sicherheitsvertrag für TS-Quelle/generierte JS-Runtime fehlt.');
  process.exit(1);
}
const blocked = normalGate.buildChargingEvcsJavascriptRemovalDecision({
  normalSource: { ...normalSource, runtimeSource: 'javascript-hard-fallback', productive: false, fallback: true, fallbackReason: 'executor:not-ok' },
  executor: { source: 'ts-write-plan', ok: false, failedCount: 1 },
  legacy: { source: 'ts-charging-legacy-js-decision-tree-reduction-v5', jsRole: 'executor-and-hard-fallback', fallbackReason: 'executor-error' },
});
if (!blocked || blocked.readyForEvcsJsDecisionTreeRemoval || blocked.runtimeSource !== 'javascript-hard-fallback' || !String(blocked.fallbackReason || '').includes('normal-source:')) {
  console.error('[ts-charging-final-handover] Harter Fallback darf nicht als abbau-ready gelten.');
  process.exit(1);
}

const cm = read('ems/modules/charging-management.js');
// Seit RC88 läuft der einzige Hardware-Executor im isolierten Watchdog. Deshalb wird
// der semantische Callback gezählt und nicht mehr die veraltete direkte `await applySetpoint`-Schreibweise.
const applySetpointCalls = (cm.match(/\(\)\s*=>\s*applySetpoint\s*\(/g) || []).length;
const directAwaitApplySetpointCalls = (cm.match(/await\s+applySetpoint\s*\(/g) || []).length;
if (applySetpointCalls !== 1 || directAwaitApplySetpointCalls !== 0) {
  console.error(`[ts-charging-final-handover] Es darf nur noch einen zentralen applySetpoint-Executor geben, gefunden: isoliert=${applySetpointCalls}, direkt=${directAwaitApplySetpointCalls}`);
  process.exit(1);
}
if (!cm.includes("source: 'ts-charging-legacy-js-decision-tree-reduction-v5'")) {
  console.error('[ts-charging-final-handover] Legacy-Diagnose wurde nicht auf v5/finalen Handover angehoben.');
  process.exit(1);
}
console.log('[ts-charging-final-handover] OK: EVCS ist fachlich TS-geführt; JS bleibt nur generierte Runtime-Grenze, Executor und Hard-Fallback.');
