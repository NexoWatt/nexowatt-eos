#!/usr/bin/env node
'use strict';
const fs = require('fs');
function read(p){ return fs.readFileSync(p,'utf8'); }
function must(file, needle){ const s=read(file); if(!s.includes(needle)){ console.error(`[loadmanagement-actual-vs-reserve] Missing in ${file}: ${needle}`); process.exit(1); } }
function mustNot(file, needle){ const s=read(file); if(s.includes(needle)){ console.error(`[loadmanagement-actual-vs-reserve] Forbidden in ${file}: ${needle}`); process.exit(1); } }
// Die Regression ist versionsunabhängig. Ein fest verdrahteter alter Release-String
// würde jeden späteren, fachlich korrekten Patch fälschlich blockieren.
const packageJson = JSON.parse(read('package.json'));
if (!/^\d+\.\d+\.\d+$/.test(String(packageJson.version || ''))) {
  console.error('[loadmanagement-actual-vs-reserve] package.json enthält keine gültige SemVer-Version.');
  process.exit(1);
}
must('src-ts/runtime-executables/ems/modules/charging-management.ts', 'totalFreshActualPowerW');
must('src-ts/runtime-executables/ems/modules/charging-management.ts', 'gridEvcsActualForCapW');
must('src-ts/runtime-executables/ems/modules/charging-management.ts', 'gridEvcsReserveIgnoredForCapW');
must('src-ts/runtime-executables/ems/modules/charging-management.ts', 'gridBaseLoadRawW = gridW - gridEvcsActualForCapW');
must('src-ts/runtime-executables/ems/modules/charging-management.ts', "chargingManagement.summary.totalReservedPowerW");
must('src-ts/runtime-executables/ems/modules/charging-management.ts', "actualW: evcsActualW");
must('src-ts/runtime-executables/ems/modules/charging-management.ts', 'actualPvW: evcsControlPvReserveW');
must('src-ts/runtime-executables/ems/modules/charging-management.ts', 'Nicht an pvAvailableState koppeln');
must('src-ts/runtime-executables/ems/modules/charging-management.ts', "reserveW: evcsReserveW");
must('src-ts/runtime-executables/main.ts', 'actualW: await getOwn');
must('src-ts/runtime-executables/main.ts', 'gridEvcsReserveIgnoredForCapW');
must('src-ts/runtime-executables/www/ems-apps.ts', 'EVCS Ist für Netz-Gate');
must('src-ts/runtime-executables/www/ems-apps.ts', 'Reservierung ignoriert');
must('src-ts/runtime-executables/www/ems-apps.ts', 'EVCS Reserviert');
// Prevent the previous regression: Gate A must not subtract command/reserve totalPowerW from grid power.
mustNot('src-ts/runtime-executables/ems/modules/charging-management.ts', 'gridBaseLoadRawW = gridW - (Number.isFinite(totalPowerW)');
console.log('[loadmanagement-actual-vs-reserve] OK');
