#!/usr/bin/env node
'use strict';
/** Prüft den 0.7.122-Schritt: EVCS/Charging-Management TS-Budget-Caps als Shadow-Vorbereitung. */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel){ const p=path.join(root,rel); if(!fs.existsSync(p)){throw new Error('missing '+rel)} return fs.readFileSync(p,'utf8'); }
function must(rel, marker){ const t=read(rel); if(!t.includes(marker)) throw new Error(rel+': missing '+marker); }
for (const [rel, marker] of [
  ['src-ts/ems/charging-management/charging-budget.ts','computeChargingBudgetSafetyCaps'],
  ['src-ts/ems/charging-management/charging-budget.ts','compareChargingBudgetSafetyCaps'],
  ['lib/ts-mirrors/ems/charging-management/charging-budget.js','computeChargingBudgetSafetyCaps'],
  ['ems/modules/charging-management.js','chargingBudgetTsMirror'],
  ['ems/modules/charging-management.js','_runChargingBudgetTsShadow'],
  ['ems/modules/charging-management.js','chargingManagement.control.tsBudgetJson'],
  ['scripts/build-ts-ems-mirrors.js','charging-management/charging-budget'],
]) must(rel, marker);
const mirror = require(path.join(root,'lib/ts-mirrors/ems/charging-management/charging-budget.js'));
const r = mirror.computeChargingBudgetSafetyCaps({budgetW:10000,budgetMode:'engine',gridCapEvcsW:6000,gridCapBinding:true,phaseCapEvcsW:5000,phaseCapBinding:true,para14aActive:true,para14aTotalCapW:4200});
if (!r || r.budgetAfterW !== 4200 || !r.gridCapApplied || !r.phaseCapApplied || !r.para14aApplied) throw new Error('TS charging budget cap calculation failed');
console.log('[ts-charging-management-shadow] OK: EVCS/Charging-Management TS-Shadow vorbereitet.');
