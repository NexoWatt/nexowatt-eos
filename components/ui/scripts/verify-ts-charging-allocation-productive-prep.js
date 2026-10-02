#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-charging-allocation-productive-prep.js
 * Zweck: Prüft die produktive Vorbereitung der EVCS-Wallbox-Allocation in TS.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function need(rel, marker, label) {
  const text = read(rel);
  if (!text.includes(marker)) {
    console.error(`[ts-charging-allocation-productive-prep] ${rel}: fehlt ${label || marker}`);
    process.exit(1);
  }
}
need('src-ts/ems/charging-management/charging-allocation.ts', 'buildChargingAllocationProductivePrep', 'Allocation-Produktiv-Vorbereitung');
need('src-ts/ems/charging-management/charging-allocation.ts', 'keepsSetpointWritingInJavascript', 'Setpoint-I/O bleibt JS');
need('lib/ts-mirrors/ems/charging-management/charging-allocation.js', 'exports.buildChargingAllocationProductivePrep', 'CJS-Export Allocation-Prep');
need('ems/modules/charging-management.js', 'tsAllocationProductivePrepJson', 'Allocation-Prep-State');
need('ems/modules/charging-management.js', 'ts-allocation-prepared', 'Allocation-Prep-Quelle');
need('main.js', 'tsAllocationProductivePrepJson', 'API liefert Allocation-Prep');
const allocation = require(path.join(root, 'lib/ts-mirrors/ems/charging-management/charging-allocation.js'));
const input = {
  mode: 'auto', budgetMode: 'engine:pv', budgetW: 7000, usedW: 3200, remainingW: 3800,
  totalTargetPowerW: 3200, totalTargetCurrentA: 13.9,
  wallboxes: [{ safe: 'wb_1', name: 'WB 1', enabled: true, online: true, vehiclePlugged: true, controlBasis: 'power', setWKey: 'cm.wb.wb_1.setW' }],
  allocations: [{ safe: 'wb_1', targetW: 3200, targetA: 13.9, reason: 'ok', effectiveMode: 'auto' }],
};
const prep = allocation.buildChargingAllocationProductivePrep(input);
if (!prep || !prep.prepared || prep.productive !== false || prep.fallback || !prep.apply || prep.apply.wallboxes[0].targetPowerW !== 3200) {
  console.error('[ts-charging-allocation-productive-prep] Produktiv-Vorbereitung liefert keinen sauberen Apply-Vertrag.');
  process.exit(1);
}
if (!prep.safety || prep.safety.keepsSetpointWritingInJavascript !== true || prep.safety.doesNotWriteIoBrokerStates !== true) {
  console.error('[ts-charging-allocation-productive-prep] Sicherheitsgrenzen fehlen.');
  process.exit(1);
}
const stale = allocation.buildChargingAllocationProductivePrep({ ...input, staleMeter: true });
if (!stale || !stale.fallback || stale.fallbackReason !== 'stale-meter' || stale.apply !== null) {
  console.error('[ts-charging-allocation-productive-prep] staleMeter blockiert Allocation-Prep nicht korrekt.');
  process.exit(1);
}
const plan = allocation.buildChargingAllocationShadowPlan(input);
const mismatch = allocation.buildChargingAllocationProductivePrep(input, plan, { source: 'ts-charging-allocation-shadow-comparison-v1', ok: false, mismatchCount: 1, mismatches: [{ field: 'targetPowerW', safe: 'wb_1', js: 1, ts: 2 }] });
if (!mismatch || !mismatch.fallback || mismatch.fallbackReason !== 'ts-js-allocation-mismatch') {
  console.error('[ts-charging-allocation-productive-prep] Mismatch führt nicht zu JS-Fallback.');
  process.exit(1);
}
console.log('[ts-charging-allocation-productive-prep] OK: EVCS-Allocation ist als produktiver TS-Kandidat mit JS-Executor vorbereitet.');
