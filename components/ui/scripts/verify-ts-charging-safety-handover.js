#!/usr/bin/env node
'use strict';
/**
 * Datei: scripts/verify-ts-charging-safety-handover.js
 * Zweck: Prüft den beschleunigten EVCS-Safety-Handover: Stale-Meter-Stopps und Peak-Rampdown
 * laufen als 0-Setpoint-Vertrag über TS Allocation + TS Write-Plan; JS bleibt nur Executor/Hard-Fallback.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function need(rel, marker, label) {
  const text = read(rel);
  if (!text.includes(marker)) {
    console.error(`[ts-charging-safety-handover] ${rel}: fehlt ${label || marker}`);
    process.exit(1);
  }
}
need('src-ts/ems/charging-management/charging-allocation.ts', 'safeStopCanBypassStaleBlockersForZeroTargets', 'Allocation kennt TS-Safety-Stop-Handover');
need('src-ts/ems/charging-management/charging-write-plan.ts', 'allowsSafeStopWhileMeterStale', 'Write-Plan erlaubt sichere 0-Stopps bei staleMeter');
need('src-ts/ems/charging-management/charging-write-plan.ts', 'forceZeroTargetsOnSafetyStop', 'Write-Plan erzwingt 0-Zielwerte im Safety-Stop');
need('lib/ts-mirrors/ems/charging-management/charging-allocation.js', 'safeStopCanBypassStaleBlockersForZeroTargets', 'CJS Allocation Safety-Handover');
need('lib/ts-mirrors/ems/charging-management/charging-write-plan.js', 'allowsSafeStopWhileMeterStale', 'CJS Write-Plan Safety-Handover');
need('ems/modules/charging-management.js', "safetyReason: 'stale-meter-safety-stop'", 'Stale-Failsafe setzt Safety-Stop-Reason');
need('ems/modules/charging-management.js', "safetyReason: 'peak-shaving-safety-stop'", 'Peak-Rampdown setzt Safety-Stop-Reason');
need('ems/modules/charging-management.js', 'safetyStopHandoverViaTsWritePlan', 'Legacy-Diagnose zeigt TS-Safety-Handover');
need('ems/modules/charging-management.js', 'js-only-safety-stop-write-plan', 'alter JS-only-Safety-Stop als entfernt markiert');
need('ems/modules/charging-management.js', "source: 'ts-charging-legacy-js-decision-tree-reduction-v4'", 'Legacy-Reduktionsdiagnose v4');
need('www/ems-apps.js', 'TS‑Härtung: EVCS Safety‑Handover', 'App-Center zeigt Safety-Handover-Härtung');

const allocation = require(path.join(root, 'lib/ts-mirrors/ems/charging-management/charging-allocation.js'));
const writePlan = require(path.join(root, 'lib/ts-mirrors/ems/charging-management/charging-write-plan.js'));
const safetyInput = {
  mode: 'auto',
  budgetMode: 'engine',
  staleMeter: true,
  safetyStop: true,
  safetyReason: 'stale-meter-safety-stop',
  totalTargetPowerW: 0,
  totalTargetCurrentA: 0,
  wallboxes: [
    { safe: 'wb_stop_w', name: 'Safe Stop Power', enabled: true, online: true, controlBasis: 'power', setWKey: 'cm.wb.stopW' },
    { safe: 'wb_stop_a', name: 'Safe Stop Current', enabled: true, online: true, controlBasis: 'currentA', setAKey: 'cm.wb.stopA' },
  ],
  allocations: [
    { safe: 'wb_stop_w', targetW: 0, targetA: 0, reason: 'stale-meter-safety-stop', controlBasis: 'power' },
    { safe: 'wb_stop_a', targetW: 0, targetA: 0, reason: 'stale-meter-safety-stop', controlBasis: 'current' },
  ],
};
const safetyAllocation = allocation.buildChargingAllocationProductive(safetyInput);
if (!safetyAllocation || !safetyAllocation.productive || safetyAllocation.fallback || !safetyAllocation.apply || safetyAllocation.apply.totalTargetPowerW !== 0) {
  console.error('[ts-charging-safety-handover] TS-Allocation gibt Safety-Stop trotz staleMeter nicht produktiv frei.');
  process.exit(1);
}
if (!safetyAllocation.safety || safetyAllocation.safety.allowsTsSafetyStopHandover !== true || safetyAllocation.safety.safeStopCanBypassStaleBlockersForZeroTargets !== true || safetyAllocation.safety.nonZeroSafetyStopRejected !== true) {
  console.error('[ts-charging-safety-handover] Allocation-Safety-Grenzen fehlen.');
  process.exit(1);
}
if (safetyAllocation.apply.wallboxes.some((wb) => wb.targetPowerW !== 0 || wb.targetCurrentA !== 0 || wb.writeRequired !== true)) {
  console.error('[ts-charging-safety-handover] Safety-Stop-Allocation erzwingt nicht sauber 0-Zielwerte pro Wallbox.');
  process.exit(1);
}
const safetyWritePlan = writePlan.buildChargingSetpointWritePlanProductive({
  ...safetyInput,
  allowWrites: true,
  allocationPlan: { wallboxes: safetyAllocation.apply.wallboxes },
});
if (!safetyWritePlan || !safetyWritePlan.productive || safetyWritePlan.fallback || !safetyWritePlan.apply || safetyWritePlan.apply.writeCount !== 2) {
  console.error('[ts-charging-safety-handover] TS-Write-Plan gibt ausführbaren Safety-Stop-Vertrag nicht frei.');
  process.exit(1);
}
if (safetyWritePlan.apply.entries.some((entry) => entry.targetValue !== 0 || entry.writeRequired !== true || entry.blocked !== false)) {
  console.error('[ts-charging-safety-handover] Safety-Stop-Write-Plan enthält nicht ausschließlich freigegebene 0-Setpoints.');
  process.exit(1);
}
if (!safetyWritePlan.safety || safetyWritePlan.safety.allowsSafeStopWhileMeterStale !== true || safetyWritePlan.safety.forceZeroTargetsOnSafetyStop !== true || safetyWritePlan.safety.nonZeroSafetyStopRejected !== true) {
  console.error('[ts-charging-safety-handover] Write-Plan-Safety-Grenzen fehlen.');
  process.exit(1);
}
const staleWithoutSafety = writePlan.buildChargingSetpointWritePlanProductive({
  ...safetyInput,
  safetyStop: false,
  allowWrites: true,
});
if (!staleWithoutSafety || staleWithoutSafety.productive || staleWithoutSafety.fallbackReason !== 'stale-meter') {
  console.error('[ts-charging-safety-handover] staleMeter ohne Safety-Stop muss weiterhin hart blockieren.');
  process.exit(1);
}
console.log('[ts-charging-safety-handover] OK: EVCS-Safety-Zweige laufen als TS-0-Setpoint-Handover, JS bleibt Executor/Hard-Fallback.');
