#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { const f = path.join(root, rel); if (!fs.existsSync(f)) throw new Error('Pflichtdatei fehlt: '+rel); return fs.readFileSync(f,'utf8'); }
function must(file, marker) { if (!read(file).includes(marker)) throw new Error(file+': Marker fehlt: '+marker); }
must('src-ts/ems/core-limits/core-budget.ts','buildCoreForecastGate');
must('src-ts/ems/core-limits/core-budget.ts','buildCoreTariffGate');
must('src-ts/ems/core-limits/core-budget.ts','buildCorePeakTariffGridGates');
must('src-ts/ems/core-limits/core-budget.ts','buildCoreRestGatesShadow');
must('lib/ts-mirrors/ems/core-limits/core-budget.js','buildCoreRestGatesShadow');
must('ems/modules/core-limits.js','_runCoreRestGatesTsShadowComparison');
must('ems/modules/core-limits.js','ems.budget.tsRestGatesJson');
must('main.js','emsBudgetTsRestGatesJson');
const mirror = require(path.join(root, 'lib/ts-mirrors/ems/core-limits/core-budget.js'));
const result = mirror.buildCoreRestGatesShadow({ forecast:{valid:true,usable:true,avgNext1hW:2500,status:'ok'}, tariff:{active:true,dischargeAllowed:true,status:'inactive'}, peak:{active:true,budgetW:5000}, evcsHighLevel:{capW:5000,binding:'peak'}, grid:{gridImportLimitW_effective:9000,gridImportLimitW_source:'physical'}, ts:123 });
if (!result || !result.gates || result.gates.forecast.avgNext1hW !== 2500) throw new Error('buildCoreRestGatesShadow liefert kein plausibles Ergebnis.');
if (result.gates.tariff.dischargeAllowed !== true) throw new Error('Tarif-Gate muss true/false korrekt erhalten.');
console.log('[ts-core-limits-rest-gates] OK: Core-Limits Restgates sind als TS-Shadow vorbereitet.');
