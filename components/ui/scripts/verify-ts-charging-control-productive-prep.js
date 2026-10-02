#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-charging-control-productive-prep.js
 * Zweck: Prüft 0.7.124, ob der EVCS-/Charging-Management-Control-Shadow als
 * rückfallfähiger Produktiv-Kandidat vorbereitet ist, ohne Wallbox-Verteilung oder
 * Setpoint-Schreiben aus JavaScript herauszulösen.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function need(rel, marker, label) {
  const text = read(rel);
  if (!text.includes(marker)) {
    console.error(`[ts-charging-control-productive-prep] ${rel}: fehlt ${label || marker}`);
    process.exit(1);
  }
}
need('src-ts/ems/charging-management/charging-control.ts', 'buildChargingControlProductivePrep', 'TS-Produktiv-Vorbereitung');
need('src-ts/ems/charging-management/charging-control.ts', 'keepsSetpointWritingInJavascript', 'Setpoint-Sicherheitsgrenze');
need('lib/ts-mirrors/ems/charging-management/charging-control.js', 'exports.buildChargingControlProductivePrep', 'CJS-Export für Produktiv-Vorbereitung');
need('ems/modules/charging-management.js', 'tsControlProductivePrepJson', 'neuer Control-Prep-Diagnose-State');
need('ems/modules/charging-management.js', 'tsControlSource', 'Control-Quelle/Prep-State');
need('ems/modules/charging-management.js', 'ts-control-prepared', 'vorbereitete TS-Control-Quelle');
need('ems/modules/charging-management.js', 'Ladepunktverteilung', 'Scope-Grenze: Wallbox-Verteilung bleibt JS');
need('main.js', 'tsControlProductivePrepJson', 'Diagnose-API liefert Control-Prep');
need('www/ems-apps.js', 'TS‑Produktiv: EVCS Control', 'App-Center zeigt EVCS-Control-Karte');
need('scripts/build-ts-ems-mirrors.js', 'src-ts/ems/charging-management/charging-control.ts', 'Mirror-Sync enthält Control-Quelle');
const control = require(path.join(root, 'lib/ts-mirrors/ems/charging-management/charging-control.js'));
if (typeof control.buildChargingControlProductivePrep !== 'function') {
  console.error('[ts-charging-control-productive-prep] buildChargingControlProductivePrep ist nicht importierbar.');
  process.exit(1);
}
const input = {
  mode: 'auto',
  budgetMode: 'engine:pv',
  status: 'ok',
  active: true,
  budgetW: 5000,
  usedW: 1000,
  remainingW: 4000,
  totalPowerW: 900,
  totalTargetPowerW: 1000,
  totalTargetCurrentA: 4.3,
  wallboxCount: 1,
  onlineWallboxes: 1,
  connectedCount: 1,
  staleMeter: false,
  staleBudget: false,
};
const ok = control.buildChargingControlProductivePrep(input);
if (!ok || !ok.prepared || ok.productive !== false || ok.fallback || !ok.apply || ok.apply.budgetW !== 5000 || ok.apply.totalTargetPowerW !== 1000) {
  console.error('[ts-charging-control-productive-prep] Produktiv-Vorbereitung liefert keinen sauberen Apply-Kandidaten.');
  process.exit(1);
}
if (!ok.safety || ok.safety.keepsAllocationInJavascript !== true || ok.safety.keepsSetpointWritingInJavascript !== true) {
  console.error('[ts-charging-control-productive-prep] Sicherheitsgrenzen fehlen.');
  process.exit(1);
}
const stale = control.buildChargingControlProductivePrep({ ...input, staleMeter: true });
if (!stale || !stale.fallback || stale.fallbackReason !== 'stale-meter' || stale.apply !== null) {
  console.error('[ts-charging-control-productive-prep] Stale-Meter blockiert Produktiv-Vorbereitung nicht korrekt.');
  process.exit(1);
}
const plan = control.buildChargingControlShadowPlan(input);
const mismatch = control.buildChargingControlProductivePrep(input, plan, { source: 'ts-charging-control-shadow-comparison-v1', ok: false, mismatchCount: 1, mismatches: [{ field: 'budgetW', js: 1, ts: 2 }] });
if (!mismatch || !mismatch.fallback || mismatch.fallbackReason !== 'ts-js-control-mismatch') {
  console.error('[ts-charging-control-productive-prep] Mismatch führt nicht zu JS-Fallback.');
  process.exit(1);
}
console.log('[ts-charging-control-productive-prep] OK: EVCS-Control-Shadow ist als produktiver TS-Kandidat mit JS-Fallback vorbereitet.');
