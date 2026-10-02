#!/usr/bin/env node
'use strict';
const fs = require('fs');
function read(p){ return fs.readFileSync(p,'utf8'); }
function must(file, needle){ const s=read(file); if(!s.includes(needle)){ console.error(`Missing in ${file}: ${needle}`); process.exit(1); } }
function mustNot(file, needle){ const s=read(file); if(s.includes(needle)){ console.error(`Forbidden in ${file}: ${needle}`); process.exit(1); } }
const pkg = JSON.parse(read('package.json'));
if (!/^\d+\.\d+\.\d+$/.test(String(pkg.version || ''))) { console.error('package.json: ungueltige SemVer-Version'); process.exit(1); }
must('src-ts/runtime-executables/ems/modules/core-limits.ts','pvBudgetPhysicalCapW');
must('src-ts/runtime-executables/ems/modules/core-limits.ts','computePvBudgetFlowRawW({');
must('src-ts/runtime-executables/ems/modules/core-limits.ts','Math.min(pvBudgetFlowRawW, pvPhysicalCapW)');
must('src-ts/runtime-executables/ems/modules/charging-management.ts','budgetDebug.evcsActualW = (typeof totalFreshActualPowerW');
must('src-ts/runtime-executables/ems/modules/charging-management.ts','budgetDebug.evcsPotentialReservedW = (typeof totalPowerW');
must('src-ts/runtime-executables/ems/modules/charging-management.ts','budgetDebug.evcsReservedW = evcsControlReserveW');
must('src-ts/runtime-executables/ems/modules/charging-management.ts','evcsActiveDemandReserveW');
must('src-ts/runtime-executables/www/ems-apps.ts','Reserve und PV-Reserve werden separat angezeigt.');
must('src-ts/runtime-executables/www/ems-apps.ts','ctrl.actualW ?? ctrl.gridEvcsActualForCapW');
must('src-ts/runtime-executables/www/ems-apps.ts',"{ label: 'Ist-Quelle', value: 'frischer Messwert / Grid-Gate' }");
mustNot('src-ts/runtime-executables/www/ems-apps.ts','const actualW = n(c.actualW ?? c.usedW ?? c.reserveW');
console.log('OK: Loadmanagement Budget-Konsistenz: PV physisch geklemmt, EVCS-Ist getrennt, Reserve aus aktivem Ladebedarf.');
