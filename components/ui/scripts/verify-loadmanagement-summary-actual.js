#!/usr/bin/env node
'use strict';
const fs = require('fs');
function read(p){return fs.readFileSync(p,'utf8');}
function need(p,s,label){const t=read(p); if(!t.includes(s)){console.error(`[loadmanagement-summary-actual] missing ${label}: ${s}`); process.exit(1);}}
const cm = read('src-ts/runtime-executables/ems/modules/charging-management.ts');
const packageJson = JSON.parse(read('package.json'));
if (!/^\d+\.\d+\.\d+$/.test(String(packageJson.version || ''))) {
  console.error('[loadmanagement-summary-actual] package.json enthält keine gültige SemVer-Version.');
  process.exit(1);
}
need('src-ts/runtime-executables/ems/modules/charging-management.ts','applyActualW','TS-Control darf Summary-Ist nicht aus Reserve überschreiben');
need('src-ts/runtime-executables/ems/modules/charging-management.ts','totalPowerW: totalFreshActualPowerW','TS-Control bekommt Actual statt Reserve');
need('src-ts/runtime-executables/ems/modules/charging-management.ts','summary.totalReservedPowerW','Reservierung bleibt getrennt');
need('src-ts/runtime-executables/ems/modules/charging-management.ts','activeDemandReserveW','Reservierung folgt aktivem Ladebedarf');
need('src-ts/runtime-executables/ems/modules/charging-management.ts','budgetDebug.evcsActualW = (typeof totalFreshActualPowerW','Debug actual nutzt frischen Istwert');
const badApply = "await this._queueState('chargingManagement.summary.totalPowerW', Number.isFinite(Number(apply.totalPowerW)) ? Number(apply.totalPowerW) : 0, true);";
if (cm.includes(badApply)) { console.error('[loadmanagement-summary-actual] old apply.totalPowerW overwrite still present'); process.exit(1); }
console.log('[loadmanagement-summary-actual] OK');
