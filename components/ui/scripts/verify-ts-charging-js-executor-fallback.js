#!/usr/bin/env node
'use strict';
/**
 * Datei: scripts/verify-ts-charging-js-executor-fallback.js
 * Zweck: Prüft, dass EVCS-JavaScript ab 0.7.127 nur noch Executor/Fallback ist und direkte Setpoint-Schreibschleifen entfernt sind.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function need(rel, marker, label) {
  const text = read(rel);
  if (!text.includes(marker)) {
    console.error(`[ts-charging-js-executor-fallback] ${rel}: fehlt ${label || marker}`);
    process.exit(1);
  }
}
need('ems/modules/charging-management.js', 'planned_by_ts_write_plan', 'Normalpfad plant nur noch über TS-Write-Plan');
need('ems/modules/charging-management.js', '_executeChargingTsSetpointPlan', 'TS-Write-Plan-Executor');
need('ems/modules/charging-management.js', '_executeChargingLegacySetpointFallback', 'Legacy-JS-Fallback');
need('ems/modules/charging-management.js', 'tsLegacyDecisionTreeJson', 'Legacy-Entscheidungsbaum-Diagnose');
need('ems/modules/charging-management.js', 'direct-js-setpoint-write-loop', 'Normalpfad-Removal-Marker');
need('ems/modules/charging-management.js', 'direct-js-failsafe-write-loop', 'Failsafe-Direktwrite-Removal-Marker');
need('ems/modules/charging-management.js', 'direct-js-peak-rampdown-write-loop', 'Peak-Rampdown-Direktwrite-Removal-Marker');
need('ems/modules/charging-management.js', 'planned_by_js_safety_executor', 'Safety-Rampdowns laufen über Executor');
need('ems/modules/charging-management.js', '_mapChargingWallboxesForTsAllocation', 'einheitlicher TS-Allocation-Input für Normalpfad und Safety-Zweige');
need('ems/modules/charging-management.js', 'stale-meter-safety-fallback', 'Stale-Meter-Failsafe läuft über Fallback-Executor');
need('ems/modules/charging-management.js', 'peak-shaving-safety-fallback', 'Peak-Shaving-Rampdown läuft über Fallback-Executor');
need('ems/modules/charging-management.js', "_publishChargingLegacyDecisionTreeState(tsAllocationState, tsWritePlanProductive, tsWritePlanUsed, debugAlloc, 'stale-meter-safety-fallback'", 'Stale-Failsafe publiziert TS-Allocation/Write-Plan-Diagnose');
need('ems/modules/charging-management.js', "_publishChargingLegacyDecisionTreeState(tsAllocationState, tsWritePlanProductive, tsWritePlanUsed, debugAlloc, 'peak-shaving-safety-fallback'", 'Peak-Rampdown publiziert TS-Allocation/Write-Plan-Diagnose');
need('ems/modules/charging-management.js', 'executor-and-hard-fallback', 'Fallback-Rollenmarker');
need('ems/modules/charging-management.js', 'hard-fallback-only', 'Normalquellen-Lockdown hält JS nur als harten Fallback');
need('ems/modules/charging-management.js', 'usesTsEntryBasis', 'Executor nutzt TS-geplante Basis');
need('ems/modules/charging-management.js', 'plannedSetpointKey', 'Executor nutzt TS-geplanten Setpoint-DP');
need('ems/modules/charging-management.js', 'basis: plannedBasis', 'applySetpoint erhält die TS-Basis');
need('ems/modules/charging-management.js', 'fallbackOnExecutorError', 'Executor-Fehler bleiben harter Fallback-Grund');
need('ems/modules/charging-management.js', 'executor-error', 'Legacy-Fallback kennt Executor-Schreibfehler');
need('main.js', 'tsLegacyDecisionTreeJson', 'API liefert Legacy-Reduktionsdiagnose');
need('www/ems-apps.js', 'TS‑Cleanup: EVCS JS Executor/Fallback', 'App-Center zeigt JS-Executor/Fallback-Cleanup');
const cm = read('ems/modules/charging-management.js');
const directWriteMarkers = (cm.match(/applyStatus = 'planned_by_ts_write_plan'/g) || []).length;
if (directWriteMarkers < 1) {
  console.error('[ts-charging-js-executor-fallback] Der normale Allocation-Loop deferiert keine Setpoints an den TS-Write-Plan.');
  process.exit(1);
}
if (!cm.includes("normalWritePath: normalSourceLockdown.normalWritePath")) {
  console.error('[ts-charging-js-executor-fallback] JS-Rolle wird nicht sauber als Executor/Fallback/Normalquelle diagnostiziert.');
  process.exit(1);
}
if (!cm.includes("const result = await this._executeChargingSetpointEntries(entries, wbList, debugAlloc, 'ts-write-plan', '');") || !cm.includes('return !!(result && result.ok === true);')) {
  console.error('[ts-charging-js-executor-fallback] TS-Executor-Fehler führen nicht sauber in den Legacy-Fallback.');
  process.exit(1);
}
if (!cm.includes('controlBasis: plannedBasis') || !cm.includes('{ targetW, targetA, basis: plannedBasis }')) {
  console.error('[ts-charging-js-executor-fallback] JS-Executor nutzt nicht konsequent die TS-geplante Basis.');
  process.exit(1);
}
// Seit RC88 läuft der einzige Hardware-Executor im isolierten Watchdog. Deshalb wird
// der semantische Callback gezählt und nicht mehr die veraltete direkte `await applySetpoint`-Schreibweise.
const applySetpointCalls = (cm.match(/\(\)\s*=>\s*applySetpoint\s*\(/g) || []).length;
const directAwaitApplySetpointCalls = (cm.match(/await\s+applySetpoint\s*\(/g) || []).length;
if (applySetpointCalls !== 1 || directAwaitApplySetpointCalls !== 0) {
  console.error(`[ts-charging-js-executor-fallback] Erwartet genau einen applySetpoint-Aufruf im zentralen Executor, gefunden: isoliert=${applySetpointCalls}, direkt=${directAwaitApplySetpointCalls}`);
  process.exit(1);
}
const inlineMapInputUsages = (cm.match(/wallboxes: this\._mapChargingWallboxesForTsAllocation\(wbList\)/g) || []).length;
const normalMapInputAssigned = cm.includes('const tsWallboxesForAllocation = this._mapChargingWallboxesForTsAllocation(wbList);');
const normalMapInputUsages = (cm.match(/wallboxes: tsWallboxesForAllocation/g) || []).length;
const mapInputUsages = inlineMapInputUsages + (normalMapInputAssigned && normalMapInputUsages > 0 ? 1 : 0);
if (mapInputUsages < 3) {
  console.error(`[ts-charging-js-executor-fallback] Erwartet TS-Allocation-Input im Normalpfad, Stale-Failsafe und Peak-Rampdown, gefunden: ${mapInputUsages}`);
  process.exit(1);
}
if (cm.includes('_publishChargingLegacyDecisionTreeState(null, null, false')) {
  console.error('[ts-charging-js-executor-fallback] Safety-Zweige dürfen keine leere Legacy-Diagnose ohne TS-Allocation-State mehr publizieren.');
  process.exit(1);
}
console.log('[ts-charging-js-executor-fallback] OK: EVCS-JS ist Executor/Fallback; TS liefert produktive Allocation und Write-Plan-Vertrag.');
