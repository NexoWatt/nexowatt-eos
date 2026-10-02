#!/usr/bin/env node
'use strict';
/**
 * Datei: scripts/verify-ts-charging-allocation-productive.js
 * Zweck: Prüft die produktive EVCS-Wallbox-Allocation über TypeScript mit JS-Executor/Fallback.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function need(rel, marker, label) {
  const text = read(rel);
  if (!text.includes(marker)) {
    console.error(`[ts-charging-allocation-productive] ${rel}: fehlt ${label || marker}`);
    process.exit(1);
  }
}
need('src-ts/ems/charging-management/charging-allocation.ts', 'buildChargingAllocationProductive', 'Allocation-Produktiv-Helfer');
need('src-ts/ems/charging-management/charging-allocation.ts', 'javascriptAllocationIsFallbackOnly', 'JS-Allocation nur Fallback');
need('lib/ts-mirrors/ems/charging-management/charging-allocation.js', 'exports.buildChargingAllocationProductive', 'CJS-Export Allocation produktiv');
need('ems/modules/charging-management.js', 'tsAllocationProductiveJson', 'Allocation-Produktiv-State');
need('ems/modules/charging-management.js', 'ts-allocation', 'Allocation-Quelle produktiv');
need('ems/modules/charging-management.js', '_executeChargingLegacySetpointFallback', 'JS-Fallback-Executor');
need('main.js', 'tsAllocationProductiveJson', 'API liefert Allocation produktiv');
need('www/ems-apps.js', 'TS‑Produktiv: EVCS Allocation', 'App-Center zeigt produktive Allocation');
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
const decision = allocation.buildChargingAllocationProductive(input);
if (!decision || !decision.productive || decision.fallback || !decision.apply || decision.apply.wallboxes.length !== 2) {
  console.error('[ts-charging-allocation-productive] Produktive Allocation liefert keinen sauberen Apply-Vertrag.');
  process.exit(1);
}
if (decision.apply.wallboxes[0].targetPowerW !== 3200 || decision.apply.wallboxes[1].controlBasis !== 'current') {
  console.error('[ts-charging-allocation-productive] Zielwerte oder currentA-Normalisierung fehlerhaft.');
  process.exit(1);
}
// Expliziter Boost darf auch ohne optionalen Fahrzeug-/Ladebedarfsnachweis
// den lokal maximalen, bereits durch harte Caps begrenzten Sollwert vorladen.
// Auto bleibt unter denselben Bedingungen fail-closed.
const boostNoDemandInput = {
  mode: 'boost', budgetMode: 'engine:static+gridImport', budgetW: 11040, usedW: 0, remainingW: 11040,
  totalTargetPowerW: 11040, totalTargetCurrentA: 16,
  wallboxes: [
    {
      safe: 'boost_no_demand', name: 'Boost no demand', enabled: true, online: true, vehiclePlugged: false,
      vehicleDemandConfirmed: false, boostPrearmAllowed: true,
      effectiveMode: 'boost', userMode: 'boost', controlBasis: 'currentA', chargerType: 'ac', phases: 3, voltageV: 230,
      minPowerW: 4140, maxPowerW: 11040, minA: 6, maxA: 16, stepA: 1, setAKey: 'cm.wb.boost_no_demand.setA',
      hasSetpoint: true, hasSetCurrent: true,
    },
  ],
  allocations: [
    { safe: 'boost_no_demand', targetW: 11040, targetA: 16, reason: 'allocated', effectiveMode: 'boost', boost: true },
  ],
};
const boostNoDemand = allocation.buildChargingAllocationProductive(boostNoDemandInput);
if (!boostNoDemand || !boostNoDemand.productive || !boostNoDemand.apply || boostNoDemand.apply.wallboxes[0].targetPowerW !== 11040 || boostNoDemand.apply.wallboxes[0].targetCurrentA !== 16) {
  console.error('[ts-charging-allocation-productive] Boost wird ohne optionalen Fahrzeugnachweis noch auf 0 gesetzt oder nicht auf Maximalleistung freigegeben.', boostNoDemand && boostNoDemand.apply);
  process.exit(1);
}
if (boostNoDemand.apply.wallboxes[0].connected !== false
  || boostNoDemand.apply.wallboxes[0].demandConfirmed !== false
  || boostNoDemand.apply.wallboxes[0].boostPrearmAllowed !== true) {
  console.error('[ts-charging-allocation-productive] Physischer Anschluss, Ladebedarf und Boost-Vorruestung werden nicht sauber getrennt.', boostNoDemand.apply.wallboxes[0]);
  process.exit(1);
}
const autoNoDemandInput = {
  ...boostNoDemandInput,
  mode: 'auto',
  wallboxes: [{ ...boostNoDemandInput.wallboxes[0], safe: 'auto_no_demand', name: 'Auto no demand', effectiveMode: 'auto', userMode: 'auto', boostPrearmAllowed: false, setAKey: 'cm.wb.auto_no_demand.setA' }],
  allocations: [{ safe: 'auto_no_demand', targetW: 0, targetA: 0, reason: 'no_vehicle', effectiveMode: 'auto', boost: false }],
};
const autoNoDemand = allocation.buildChargingAllocationProductive(autoNoDemandInput);
if (!autoNoDemand || !autoNoDemand.productive || !autoNoDemand.apply || autoNoDemand.apply.wallboxes[0].targetPowerW !== 0 || autoNoDemand.apply.wallboxes[0].targetCurrentA !== 0) {
  console.error('[ts-charging-allocation-productive] Auto bleibt ohne bestaetigten Ladebedarf nicht fail-closed.', autoNoDemand && autoNoDemand.apply);
  process.exit(1);
}

if (!decision.safety || decision.safety.javascriptAllocationIsFallbackOnly !== true || decision.safety.setpointWritingUsesJavascriptExecutorOnly !== true || decision.safety.normalJavascriptDecisionTreeRemovedFromNormalPath !== true || decision.safety.directJavascriptSetpointLoopsRemoved !== true || decision.safety.executorFallbackOnlyForHardBlockers !== true) {
  console.error('[ts-charging-allocation-productive] Sicherheitsgrenzen für JS-Fallback/Executor/Normalpfad-Cleanup fehlen.');
  process.exit(1);
}
const stale = allocation.buildChargingAllocationProductive({ ...input, staleMeter: true });
if (!stale || stale.productive || !stale.fallback || stale.fallbackReason !== 'stale-meter' || stale.apply !== null) {
  console.error('[ts-charging-allocation-productive] staleMeter erzwingt keinen JS-Fallback.');
  process.exit(1);
}
const plan = allocation.buildChargingAllocationShadowPlan(input);
const mismatch = allocation.buildChargingAllocationProductive(input, plan, { source: 'ts-charging-allocation-shadow-comparison-v1', ok: false, mismatchCount: 1, mismatches: [{ field: 'targetPowerW', safe: 'wb_p', js: 3200, ts: 3100 }] });
if (!mismatch || mismatch.productive || !mismatch.fallback || mismatch.fallbackReason !== 'ts-js-allocation-mismatch') {
  console.error('[ts-charging-allocation-productive] Mismatch führt nicht zum JS-Fallback.');
  process.exit(1);
}
console.log('[ts-charging-allocation-productive] OK: EVCS-Allocation wird produktiv aus TS freigegeben, JS bleibt Executor/Fallback.');
