#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-charging-management-control-shadow.js
 *
 * Zweck:
 * Prüft den 0.7.122-Schritt: EVCS/Charging-Management bekommt einen TypeScript-
 * Control-Shadow als Vorbereitung für spätere produktive Übernahme.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function need(rel, marker) { if (!read(rel).includes(marker)) { console.error(`[ts-charging-control-shadow] missing ${marker} in ${rel}`); process.exit(1); } }
need('src-ts/ems/charging-management/charging-control.ts', 'buildChargingControlShadowPlan');
need('src-ts/ems/charging-management/charging-control.ts', 'compareChargingControlShadowPlan');
need('lib/ts-mirrors/ems/charging-management/charging-control.js', 'buildChargingControlShadowPlan');
need('ems/modules/charging-management.js', 'requireChargingControlTsMirror');
need('ems/modules/charging-management.js', '_publishChargingControlTsShadow');
need('ems/modules/charging-management.js', 'chargingManagement.control.tsControlShadowJson');
need('main.js', 'tsControlShadowJson');
need('scripts/build-ts-ems-mirrors.js', 'src-ts/ems/charging-management/charging-control.ts');
const mirror = require(path.join(root, 'lib/ts-mirrors/ems/charging-management/charging-control.js'));
const plan = mirror.buildChargingControlShadowPlan({ mode: 'auto', status: 'ok', budgetW: 5000, usedW: 0, remainingW: 5000, wallboxCount: 1, onlineWallboxes: 1, staleMeter: false });
if (!plan || plan.control.budgetW !== 5000 || plan.control.usedW !== 0 || plan.visibility.hasEvcs !== true) {
  console.error('[ts-charging-control-shadow] helper runtime check failed');
  process.exit(1);
}
console.log('[ts-charging-control-shadow] OK: EVCS/Charging-Management TS-Control-Shadow vorbereitet.');
