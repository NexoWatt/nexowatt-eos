#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-charging-control-productive.js
 * Zweck: Prüft den beschleunigten EVCS-Schritt, in dem Control-/Summary-Werte
 * produktiv aus TypeScript übernommen werden, während Allocation und Setpoint-I/O
 * weiterhin JavaScript bleiben.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function need(rel, marker, label) {
  const text = read(rel);
  if (!text.includes(marker)) {
    console.error(`[ts-charging-control-productive] ${rel}: fehlt ${label || marker}`);
    process.exit(1);
  }
}
need('src-ts/ems/charging-management/charging-control.ts', 'buildChargingControlProductive', 'produktive TS-Control-Entscheidung');
need('src-ts/ems/charging-management/charging-control.ts', 'keepsAllocationInJavascript', 'Allocation bleibt Sicherheitsgrenze');
need('src-ts/ems/charging-management/charging-control.ts', 'keepsSetpointWritingInJavascript', 'Setpoint-I/O bleibt Sicherheitsgrenze');
need('lib/ts-mirrors/ems/charging-management/charging-control.js', 'exports.buildChargingControlProductive', 'CJS-Export für produktive Control-Entscheidung');
need('ems/modules/charging-management.js', 'tsControlProductiveJson', 'Produktiv-Diagnose-State');
need('ems/modules/charging-management.js', "'ts-control'", 'produktive TS-Control-Quelle');
need('ems/modules/charging-management.js', 'tsControlApply ? tsControlApply.status', 'Control-State wird aus TS-Apply übernommen');
need('main.js', 'tsControlProductiveJson', 'API liefert produktive Control-Diagnose');
need('www/ems-apps.js', 'TS‑Produktiv: EVCS Control', 'App-Center zeigt produktive EVCS-Control-Karte');
const control = require(path.join(root, 'lib/ts-mirrors/ems/charging-management/charging-control.js'));
if (typeof control.buildChargingControlProductive !== 'function') {
  console.error('[ts-charging-control-productive] buildChargingControlProductive ist nicht importierbar.');
  process.exit(1);
}
const input = {
  mode: 'auto', budgetMode: 'engine:pv', status: 'ok', active: true,
  budgetW: 5000, usedW: 1200, remainingW: 3800, totalPowerW: 900,
  totalTargetPowerW: 1200, totalTargetCurrentA: 5.2, wallboxCount: 1,
  onlineWallboxes: 1, connectedCount: 1, staleMeter: false, staleBudget: false,
};
const ok = control.buildChargingControlProductive(input);
if (!ok || !ok.productive || ok.fallback || !ok.apply || ok.apply.usedW !== 1200 || ok.apply.totalTargetCurrentA !== 5.2) {
  console.error('[ts-charging-control-productive] produktiver Control-Fall liefert keinen TS-Apply.');
  process.exit(1);
}
if (!ok.safety || ok.safety.keepsAllocationInJavascript !== true || ok.safety.keepsSetpointWritingInJavascript !== true) {
  console.error('[ts-charging-control-productive] Sicherheitsgrenzen fehlen.');
  process.exit(1);
}
const stale = control.buildChargingControlProductive({ ...input, staleBudget: true });
if (!stale || stale.productive || !stale.fallback || stale.fallbackReason !== 'stale-budget' || stale.apply !== null) {
  console.error('[ts-charging-control-productive] staleBudget blockiert Produktiv-Übernahme nicht korrekt.');
  process.exit(1);
}
const plan = control.buildChargingControlShadowPlan(input);
const mismatch = control.buildChargingControlProductive(input, plan, { source: 'ts-charging-control-shadow-comparison-v1', ok: false, mismatchCount: 1, mismatches: [{ field: 'status', js: 'ok', ts: 'off' }] });
if (!mismatch || mismatch.productive || !mismatch.fallback || mismatch.fallbackReason !== 'ts-js-control-mismatch') {
  console.error('[ts-charging-control-productive] Mismatch führt nicht zu JS-Fallback.');
  process.exit(1);
}
console.log('[ts-charging-control-productive] OK: EVCS-Control/Summary ist produktiv TS mit JS-Fallback abgesichert.');
