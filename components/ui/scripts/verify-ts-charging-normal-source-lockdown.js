#!/usr/bin/env node
'use strict';
/**
 * Datei: scripts/verify-ts-charging-normal-source-lockdown.js
 * Zweck: Prüft den nächsten EVCS-Migrationsschritt: TS-Allocation ist Normalquelle;
 * JS-Allocation-Vergleich bleibt Diagnose und JS bleibt nur Executor/Hard-Fallback.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function need(rel, marker, label) {
  const text = read(rel);
  if (!text.includes(marker)) {
    console.error(`[ts-charging-normal-source-lockdown] ${rel}: fehlt ${label || marker}`);
    process.exit(1);
  }
}
need('src-ts/ems/charging-management/charging-allocation.ts', 'buildChargingAllocationNormalSource', 'Allocation-Normalquelle-Helfer');
need('src-ts/ems/charging-management/charging-normal-source.ts', 'buildChargingNormalSourceDecision', 'vollständiges EVCS-Normalquellen-Gate');
need('src-ts/ems/charging-management/charging-normal-source.ts', 'completeEvcsTsHandoverGate', 'kompletter Handover-Sicherheitsvertrag');
need('src-ts/ems/charging-management/charging-allocation.ts', 'jsComparisonIsDiagnosticOnly', 'JS-Vergleich nur Diagnose');
need('src-ts/ems/charging-management/charging-allocation.ts', 'javascriptAllocationIsHardFallbackOnly', 'JS-Allocation nur harter Fallback');
need('lib/ts-mirrors/ems/charging-management/charging-allocation.js', 'exports.buildChargingAllocationNormalSource', 'CJS-Export Allocation-Normalquelle');
need('lib/ts-mirrors/ems/charging-management/charging-normal-source.js', 'exports.buildChargingNormalSourceDecision', 'CJS-Export Normalquellen-Gate');
need('ems/modules/charging-management.js', 'tsAllocationNormalSourceJson', 'Runtime-State Allocation-Normalquelle');
need('ems/modules/charging-management.js', 'tsNormalSourceLockdownJson', 'Runtime-State Normalquelle-Lockdown');
need('ems/modules/charging-management.js', 'ts-normal-source', 'Allocation-Source zeigt TS-Normalquelle');
need('ems/modules/charging-management.js', 'allocationDecisionForWritePlan', 'Write-Plan nutzt Normalquelle als Entscheidung');
need('ems/modules/charging-management.js', 'ts-js-allocation-mismatch-as-normal-path-blocker', 'Mismatch ist aus Normalpfad entfernt');
need('ems/modules/charging-management.js', "source: 'ts-charging-normal-source-lockdown-v1'", 'Normalquelle-Lockdown-Diagnose');
need('ems/modules/charging-management.js', "source: 'ts-charging-legacy-js-decision-tree-reduction-v4'", 'Legacy-Reduktion v4');
need('main.js', 'tsAllocationNormalSourceJson', 'API liefert Allocation-Normalquelle');
need('main.js', 'tsNormalSourceLockdownJson', 'API liefert Normalquelle-Lockdown');
need('www/ems-apps.js', 'TS‑Normalquelle: EVCS Allocation', 'App-Center zeigt Allocation-Normalquelle');
need('www/ems-apps.js', 'TS‑Lockdown: EVCS Normalquelle', 'App-Center zeigt Normalquelle-Lockdown');

need('src-ts/ems/charging-management/charging-normal-source.ts', 'buildChargingNormalSourceDecision', 'EVCS-Normalquellen-Gesamtgate');
need('lib/ts-mirrors/ems/charging-management/charging-normal-source.js', 'exports.buildChargingNormalSourceDecision', 'CJS-Export Normalquellen-Gesamtgate');
need('ems/modules/charging-management.js', 'async _publishChargingNormalSourceState(inputOrTsAllocationState', 'Runtime nutzt Objektvertrag für vollständiges Normalquellen-Gate');
need('ems/modules/charging-management.js', 'tsMigrationReady', 'Runtime-State Migration-ready');
need('main.js', 'tsRuntimeSource', 'API liefert Runtime-Quelle');
need('main.js', 'tsMigrationReady', 'API liefert Migration-ready');
need('www/ems-apps.js', 'TypeScript die Entscheidungsquelle', 'App-Center erklärt produktive TS-Quelle');

const allocation = require(path.join(root, 'lib/ts-mirrors/ems/charging-management/charging-allocation.js'));
const input = {
  mode: 'auto', budgetMode: 'engine:pv', budgetW: 7400, usedW: 3200, remainingW: 4200,
  totalTargetPowerW: 3200, totalTargetCurrentA: 13.9,
  wallboxes: [
    { safe: 'wb_p', name: 'Power WB', enabled: true, online: true, vehiclePlugged: true, controlBasis: 'power', setWKey: 'cm.wb.wb_p.setW' },
    { safe: 'wb_a', name: 'Current WB', enabled: true, online: true, vehiclePlugged: true, controlBasis: 'currentA', setAKey: 'cm.wb.wb_a.setA' },
  ],
  allocations: [
    { safe: 'wb_p', targetW: 3200, targetA: 0, reason: 'allocated', effectiveMode: 'auto' },
    { safe: 'wb_a', targetW: 0, targetA: 0, reason: 'no_pv_surplus', effectiveMode: 'pv' },
  ],
};
const plan = allocation.buildChargingAllocationShadowPlan(input);
const diagnosticMismatch = { source: 'ts-charging-allocation-shadow-comparison-v1', ok: false, mismatchCount: 1, mismatches: [{ field: 'targetPowerW', safe: 'wb_p', js: 3200, ts: 3190, diff: 10 }] };
const productive = allocation.buildChargingAllocationProductive(input, plan, diagnosticMismatch);
if (!productive || productive.productive || productive.fallbackReason !== 'ts-js-allocation-mismatch') {
  console.error('[ts-charging-normal-source-lockdown] Alter Produktiv-Vertrag muss Mismatch weiterhin als Sicherheitsfallback markieren.');
  process.exit(1);
}
const normalSource = allocation.buildChargingAllocationNormalSource(input, plan, diagnosticMismatch);
if (!normalSource || !normalSource.normalSource || !normalSource.productive || normalSource.fallback || !normalSource.apply) {
  console.error('[ts-charging-normal-source-lockdown] Normalquelle gibt valide TS-Allocation trotz Diagnose-Mismatch nicht frei.');
  process.exit(1);
}
if (normalSource.diagnosticMismatchCount !== 1 || !normalSource.warnings.some((w) => String(w).startsWith('js-comparison-diagnostic-only:'))) {
  console.error('[ts-charging-normal-source-lockdown] Diagnose-Mismatch wird nicht als Warnung geführt.');
  process.exit(1);
}
if (!normalSource.safety || normalSource.safety.tsIsNormalAllocationSource !== true || normalSource.safety.jsComparisonIsDiagnosticOnly !== true || normalSource.safety.javascriptAllocationIsHardFallbackOnly !== true) {
  console.error('[ts-charging-normal-source-lockdown] Sicherheitsvertrag der TS-Normalquelle fehlt.');
  process.exit(1);
}
const stale = allocation.buildChargingAllocationNormalSource({ ...input, staleMeter: true });
if (!stale || stale.normalSource || !stale.fallback || stale.fallbackReason !== 'stale-meter' || stale.apply !== null) {
  console.error('[ts-charging-normal-source-lockdown] staleMeter ohne Safety-Stop muss weiterhin hart blockieren.');
  process.exit(1);
}

const nativeInput = {
  ...input,
  preferTsNativeAllocation: true,
  tsNormalSourceLock: true,
  allowJsComparisonFallback: false,
  budgetW: 3000,
  remainingW: 3000,
  totalTargetPowerW: 3200,
  totalTargetCurrentA: 13.9,
};
const nativePlan = allocation.buildChargingAllocationShadowPlan(nativeInput);
if (!nativePlan || nativePlan.allocationMode !== 'ts-native' || nativePlan.normalSource !== 'ts-native-allocation' || nativePlan.gates.tsNativeAllocation !== true) {
  console.error('[ts-charging-normal-source-lockdown] TS-native Allocation-Modus wird nicht aktiviert.');
  process.exit(1);
}
if (!nativePlan.warnings.includes('ts-native-allocation-active') || !nativePlan.warnings.includes('js-comparison-diagnostic-only')) {
  console.error('[ts-charging-normal-source-lockdown] TS-native/Diagnose-only Warnungen fehlen.');
  process.exit(1);
}
if (nativePlan.totalTargetPowerW !== 3000 || nativePlan.totalTargetPowerW > input.totalTargetPowerW) {
  console.error('[ts-charging-normal-source-lockdown] TS-native Allocation respektiert Demand-Obergrenze oder Zentralbudget nicht.');
  process.exit(1);
}
const nativeComparison = allocation.compareChargingAllocationShadowPlan(nativeInput, nativePlan);
if (!nativeComparison || nativeComparison.ok !== false || nativeComparison.mismatchCount < 1) {
  console.error('[ts-charging-normal-source-lockdown] JS/TS-Abweichung muss bei TS-native sichtbar bleiben.');
  process.exit(1);
}
const nativeProductive = allocation.buildChargingAllocationProductive(nativeInput, nativePlan, nativeComparison);
if (!nativeProductive || !nativeProductive.productive || nativeProductive.fallback || nativeProductive.jsComparisonDiagnosticOnly !== true || nativeProductive.tsNormalSourceLocked !== true) {
  console.error('[ts-charging-normal-source-lockdown] TS-native Allocation muss trotz JS-Diagnose-Mismatch produktiv bleiben.');
  process.exit(1);
}
const nativeNormalSource = allocation.buildChargingAllocationNormalSource(nativeInput, nativePlan, nativeComparison);
if (!nativeNormalSource || !nativeNormalSource.normalSource || nativeNormalSource.fallback || nativeNormalSource.diagnosticMismatchCount < 1) {
  console.error('[ts-charging-normal-source-lockdown] TS-native Normalquelle wird nicht freigegeben.');
  process.exit(1);
}

const normalSourceGate = require(path.join(root, 'lib/ts-mirrors/ems/charging-management/charging-normal-source.js'));
const fullGate = normalSourceGate.buildChargingNormalSourceDecision({
  context: 'normal-allocation-write-plan',
  mode: 'auto',
  status: 'ok',
  budget: { source: 'ts-charging-budget-productive-v1', productive: true, fallback: false },
  control: { source: 'ts-charging-control-productive-v1', productive: true, fallback: false },
  allocation: normalSource,
  writePlan: { source: 'ts-charging-setpoint-write-plan-productive-v1', productive: true, fallback: false },
  executor: { source: 'ts-write-plan', ok: true, appliedCount: 2, failedCount: 0, skippedCount: 0 },
  legacy: { source: 'ts-charging-legacy-js-decision-tree-reduction-v4', jsRole: 'executor-only', fallbackReason: '' },
});
if (!fullGate || !fullGate.productive || fullGate.runtimeSource !== 'typescript' || fullGate.jsRole !== 'executor-only' || !fullGate.readyForJavascriptRemoval) {
  console.error('[ts-charging-normal-source-lockdown] Vollständiges Normalquellen-Gate wird nicht grün.');
  process.exit(1);
}
if (!fullGate.safety || fullGate.safety.completeEvcsTsHandoverGate !== true || fullGate.safety.javascriptLegacyDecisionTreeHardFallbackOnly !== true) {
  console.error('[ts-charging-normal-source-lockdown] Vollständiger Normalquellen-Sicherheitsvertrag fehlt.');
  process.exit(1);
}


const normalGate = require(path.join(root, 'lib/ts-mirrors/ems/charging-management/charging-normal-source.js'));
const gateOk = normalGate.buildChargingNormalSourceDecision({
  context: 'normal-allocation-write-plan',
  mode: 'auto',
  status: 'ok',
  budget: { source: 'ts-charging-budget-productive-v1', productive: true, ok: true, fallback: false },
  control: { source: 'ts-charging-control-productive-v1', productive: true, ok: true, fallback: false },
  allocation: { source: 'ts-charging-allocation-normal-source-v1', productive: true, ok: true, normalSource: true, fallback: false },
  writePlan: { source: 'ts-charging-setpoint-write-plan-productive-v1', productive: true, ok: true, fallback: false },
  executor: { source: 'ts-write-plan', ok: true, appliedCount: 1, failedCount: 0, skippedCount: 0 },
  legacy: { source: 'ts-charging-legacy-js-decision-tree-reduction-v4', jsRole: 'executor-only', fallbackReason: '' },
  ts: 123,
});
if (!gateOk || !gateOk.productive || gateOk.runtimeSource !== 'typescript' || gateOk.jsRole !== 'executor-only' || !gateOk.apply || gateOk.safety.noJavascriptNormalSetpointDecision !== true) {
  console.error('[ts-charging-normal-source-lockdown] Vollständiges EVCS-Normalquellen-Gate gibt grünen TS-Pfad nicht frei.');
  process.exit(1);
}
const gateFallback = normalGate.buildChargingNormalSourceDecision({
  ...gateOk,
  budget: { source: 'ts-charging-budget-productive-v1', productive: true, ok: true, fallback: false },
  control: { source: 'ts-charging-control-productive-v1', productive: true, ok: true, fallback: false },
  allocation: { source: 'ts-charging-allocation-normal-source-v1', productive: true, ok: true, fallback: false },
  writePlan: { source: 'ts-charging-setpoint-write-plan-productive-v1', productive: true, ok: true, fallback: false },
  executor: { source: 'js-fallback', ok: true, appliedCount: 1, failedCount: 0 },
  legacy: { source: 'ts-charging-legacy-js-decision-tree-reduction-v4', jsRole: 'executor-only', fallbackReason: '' },
});
if (!gateFallback || gateFallback.productive || gateFallback.runtimeSource !== 'javascript-hard-fallback' || !String(gateFallback.fallbackReason || '').includes('executor:unexpected-source-js-fallback')) {
  console.error('[ts-charging-normal-source-lockdown] JS-Fallback-Executor darf nicht als TS-Normalquelle gelten.');
  process.exit(1);
}

console.log('[ts-charging-normal-source-lockdown] OK: EVCS-Allocation und vollständiges EVCS-Gate laufen als TS-Normalquelle; JS ist nur Executor/Hard-Fallback.');
