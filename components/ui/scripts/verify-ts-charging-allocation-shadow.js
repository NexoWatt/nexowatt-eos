#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-charging-allocation-shadow.js
 * Zweck: Prüft den EVCS-Wallbox-Allocation-Shadow in TypeScript.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function need(rel, marker, label) {
  const text = read(rel);
  if (!text.includes(marker)) {
    console.error(`[ts-charging-allocation-shadow] ${rel}: fehlt ${label || marker}`);
    process.exit(1);
  }
}
need('src-ts/ems/charging-management/charging-allocation.ts', 'buildChargingAllocationShadowPlan', 'Allocation-Shadow-Helfer');
need('src-ts/ems/charging-management/charging-allocation.ts', 'compareChargingAllocationShadowPlan', 'Allocation-Vergleich');
need('lib/ts-mirrors/ems/charging-management/charging-allocation.js', 'exports.buildChargingAllocationShadowPlan', 'CJS-Export Allocation-Shadow');
need('scripts/build-ts-ems-mirrors.js', 'charging-allocation.ts', 'Mirror-Sync enthält Allocation-Quelle');
need('ems/modules/charging-management.js', 'requireChargingAllocationTsMirror', 'Runtime lädt Allocation-Spiegel');
need('ems/modules/charging-management.js', 'tsAllocationShadowJson', 'Allocation-Shadow-State');
need('main.js', 'tsAllocationShadowJson', 'API liefert Allocation-Shadow');
need('www/ems-apps.js', 'TS‑Prep: EVCS Allocation', 'App-Center zeigt Allocation-Karte');
const allocation = require(path.join(root, 'lib/ts-mirrors/ems/charging-management/charging-allocation.js'));
if (typeof allocation.buildChargingAllocationShadowPlan !== 'function') {
  console.error('[ts-charging-allocation-shadow] buildChargingAllocationShadowPlan ist nicht importierbar.');
  process.exit(1);
}
const input = {
  mode: 'auto', budgetMode: 'engine:pv', budgetW: 7000, usedW: 3200, remainingW: 3800,
  totalPowerW: 2800, totalTargetPowerW: 3200, totalTargetCurrentA: 13.9,
  wallboxes: [{ safe: 'wb_1', name: 'WB 1', enabled: true, online: true, vehiclePlugged: true, controlBasis: 'power', setWKey: 'cm.wb.wb_1.setW', maxPowerW: 11000 }],
  allocations: [{ safe: 'wb_1', targetW: 3200, targetA: 13.9, reason: 'ok', effectiveMode: 'auto', applied: true }],
};
const plan = allocation.buildChargingAllocationShadowPlan(input);
if (!plan || plan.wallboxCount !== 1 || plan.totalTargetPowerW !== 3200 || plan.wallboxes[0].targetPowerW !== 3200 || plan.productive !== false) {
  console.error('[ts-charging-allocation-shadow] Shadow-Plan normalisiert Zielwerte nicht korrekt.');
  process.exit(1);
}
const cmp = allocation.compareChargingAllocationShadowPlan(input, plan);
if (!cmp || !cmp.ok || cmp.mismatchCount !== 0) {
  console.error('[ts-charging-allocation-shadow] Vergleich meldet fälschlich Mismatches.');
  process.exit(1);
}
const zero = allocation.buildChargingAllocationShadowPlan({ wallboxes: [{ safe: 'wb_0', enabled: true, online: true, setWKey: 'x' }], allocations: [{ safe: 'wb_0', targetW: 0, targetA: 0, reason: 'no_pv_surplus' }], totalTargetPowerW: 0, totalTargetCurrentA: 0 });
if (!zero || zero.wallboxes[0].targetPowerW !== 0 || zero.activeTargetCount !== 0) {
  console.error('[ts-charging-allocation-shadow] 0-W-Ziel wird nicht korrekt als gültiger sicherer Wert behandelt.');
  process.exit(1);
}
console.log('[ts-charging-allocation-shadow] OK: EVCS-Allocation-Shadow typisiert Wallbox-Zielwerte und vergleicht sie sauber.');
