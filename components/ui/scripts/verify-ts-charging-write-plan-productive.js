#!/usr/bin/env node
'use strict';
/**
 * Datei: scripts/verify-ts-charging-write-plan-productive.js
 * Zweck: Prüft den produktiven EVCS-Setpoint-Write-Plan als TS-Vertrag für den JS-Executor.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function need(rel, marker, label) {
  const text = read(rel);
  if (!text.includes(marker)) {
    console.error(`[ts-charging-write-plan-productive] ${rel}: fehlt ${label || marker}`);
    process.exit(1);
  }
}
need('src-ts/ems/charging-management/charging-write-plan.ts', 'buildChargingSetpointWritePlanProductive', 'Write-Plan-Produktiv-Helfer');
need('src-ts/ems/charging-management/charging-write-plan.ts', 'javascriptExecutorOnly', 'JS ist nur Executor');
need('lib/ts-mirrors/ems/charging-management/charging-write-plan.js', 'exports.buildChargingSetpointWritePlanProductive', 'CJS-Export Write-Plan produktiv');
need('ems/modules/charging-management.js', 'tsWritePlanProductiveJson', 'Write-Plan-Produktiv-State');
need('ems/modules/charging-management.js', '_executeChargingTsSetpointPlan', 'TS-Write-Plan-Executor');
need('ems/modules/charging-management.js', 'planned_by_ts_write_plan', 'alte Direktwrites werden deferiert');
need('main.js', 'tsWritePlanProductiveJson', 'API liefert Write-Plan produktiv');
need('www/ems-apps.js', 'TS‑Produktiv: EVCS Write‑Plan', 'App-Center zeigt produktiven Write-Plan');
const writePlan = require(path.join(root, 'lib/ts-mirrors/ems/charging-management/charging-write-plan.js'));
const input = {
  allowWrites: true,
  wallboxes: [
    { safe: 'wb_w', name: 'Power WB', enabled: true, online: true, controlBasis: 'power', setWKey: 'cm.wb.wb_w.setW' },
    { safe: 'wb_a', name: 'Current WB', enabled: true, online: true, controlBasis: 'currentA', setAKey: 'cm.wb.wb_a.setA' },
  ],
  allocationPlan: {
    wallboxes: [
      { safe: 'wb_w', targetPowerW: 4200, targetCurrentA: 0, reason: 'allocated', controlBasis: 'power' },
      { safe: 'wb_a', targetPowerW: 4140, targetCurrentA: 6, reason: 'allocated', controlBasis: 'current' },
    ],
  },
};
const shadow = writePlan.buildChargingSetpointWritePlan(input);
const productive = writePlan.buildChargingSetpointWritePlanProductive(input, shadow);
if (!productive || !productive.productive || !productive.apply || productive.apply.writeCount !== 2 || productive.apply.entries[1].targetValue !== 6) {
  console.error('[ts-charging-write-plan-productive] Produktiver Write-Plan erstellt keinen ausführbaren Apply-Vertrag.');
  process.exit(1);
}
if (!productive.safety || productive.safety.javascriptExecutorOnly !== true || productive.safety.doesNotWriteIoBrokerStates !== true || productive.safety.executorUsesTsPlannedBasis !== true || productive.safety.executorUsesTsPlannedSetpointKey !== true || productive.safety.fallbackOnExecutorError !== true) {
  console.error('[ts-charging-write-plan-productive] Sicherheitsgrenzen für JS-Executor/TS-Basis/Fallback fehlen.');
  process.exit(1);
}
const notAllowed = writePlan.buildChargingSetpointWritePlanProductive({ ...input, allowWrites: false }, shadow);
if (!notAllowed || notAllowed.productive || !notAllowed.fallback || notAllowed.fallbackReason !== 'writes-not-enabled' || notAllowed.apply !== null) {
  console.error('[ts-charging-write-plan-productive] fehlende Freigabe blockiert nicht korrekt.');
  process.exit(1);
}

const safeStopInput = {
  allowWrites: true,
  wallboxes: [
    { safe: 'wb_stop', name: 'Stop WB', enabled: false, online: true, controlBasis: 'powerW', setWKey: 'cm.wb.wb_stop.setW' },
  ],
  allocationPlan: {
    wallboxes: [
      { safe: 'wb_stop', targetPowerW: 0, targetCurrentA: 0, reason: 'control_disabled', controlBasis: 'power' },
    ],
  },
};
const safeStopShadow = writePlan.buildChargingSetpointWritePlan(safeStopInput);
const safeStop = writePlan.buildChargingSetpointWritePlanProductive(safeStopInput, safeStopShadow);
if (!safeStop || !safeStop.productive || !safeStop.apply || safeStop.apply.writeCount !== 1 || safeStop.apply.entries[0].targetValue !== 0 || safeStop.apply.entries[0].writeRequired !== true) {
  console.error('[ts-charging-write-plan-productive] sicherer 0-Setpoint bei deaktivierter Online-Wallbox wird nicht produktiv geplant.');
  process.exit(1);
}

const staleShadow = writePlan.buildChargingSetpointWritePlan({ ...input, staleMeter: true });
const stale = writePlan.buildChargingSetpointWritePlanProductive({ ...input, staleMeter: true }, staleShadow);
if (!stale || stale.productive || !stale.fallback || stale.fallbackReason !== 'stale-meter') {
  console.error('[ts-charging-write-plan-productive] staleMeter erzwingt keinen Fallback.');
  process.exit(1);
}
console.log('[ts-charging-write-plan-productive] OK: EVCS-Write-Plan ist produktiver TS-Vertrag mit JS-Executor.');
