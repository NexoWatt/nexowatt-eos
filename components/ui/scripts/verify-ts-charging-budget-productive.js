#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-charging-budget-productive.js
 * Zweck: Prüft 0.7.123, ob EVCS-/Charging-Budget-Caps produktiv aus TypeScript
 * übernommen werden und JavaScript als Fallback erhalten bleibt.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function need(rel, marker, label) {
  const text = read(rel);
  if (!text.includes(marker)) {
    console.error(`[ts-charging-budget-productive] ${rel}: fehlt ${label || marker}`);
    process.exit(1);
  }
}
need('src-ts/ems/charging-management/charging-budget.ts', 'buildChargingBudgetSafetyCapsProductive', 'produktive TS-Budget-Entscheidung');
need('lib/ts-mirrors/ems/charging-management/charging-budget.js', 'exports.buildChargingBudgetSafetyCapsProductive', 'CJS-Export für produktive Entscheidung');
need('ems/modules/charging-management.js', '_runChargingBudgetTsProductive', 'Produktiv-Methode in Charging-Management');
need('ems/modules/charging-management.js', 'ts-budget-productive', 'produktive TS-Quelle');
need('ems/modules/charging-management.js', 'fallbackReason', 'Fallback-Grund');
need('ems/modules/charging-management.js', 'budgetW = (typeof tsApply.budgetW', 'Budget wird aus TS übernommen');
need('ems/modules/charging-management.js', 'Ladepunktverteilung', 'Sicherheitskommentar zur Scope-Grenze');
const budget = require(path.join(root, 'lib/ts-mirrors/ems/charging-management/charging-budget.js'));
if (typeof budget.buildChargingBudgetSafetyCapsProductive !== 'function') {
  console.error('[ts-charging-budget-productive] buildChargingBudgetSafetyCapsProductive ist nicht importierbar.');
  process.exit(1);
}
const ok = budget.buildChargingBudgetSafetyCapsProductive(
  { budgetAfterW: 6000, effectiveBudgetMode: 'engine:pv+gridImport', gridCapApplied: true, phaseCapApplied: false, para14aApplied: false },
  { budgetW: 10000, budgetMode: 'engine:pv', gridCapEvcsW: 6000, gridCapBinding: true }
);
if (!ok.productive || ok.fallback || !ok.apply || ok.apply.budgetW !== 6000) {
  console.error('[ts-charging-budget-productive] Produktivfall liefert falsches Ergebnis.');
  process.exit(1);
}

const pvGridModeParity = budget.buildChargingBudgetSafetyCapsProductive(
  { budgetAfterW: 0, effectiveBudgetMode: 'engine:pvSurplus+gridImport', gridCapApplied: false, phaseCapApplied: false, para14aApplied: false },
  { budgetW: 0, budgetMode: 'engine:pvSurplus', gridCapEvcsW: 29888, gridCapBinding: true, phaseCapEvcsW: null, phaseCapBinding: false, para14aActive: false, para14aTotalCapW: null }
);
if (!pvGridModeParity.productive || pvGridModeParity.fallback || !pvGridModeParity.apply || pvGridModeParity.apply.effectiveBudgetMode !== 'engine:pvSurplus+gridImport') {
  console.error('[ts-charging-budget-productive] PV/Grid-Import-BudgetMode-Parität ist nicht erfüllt.');
  process.exit(1);
}
const cmJs = read('ems/modules/charging-management.js');
if (!cmJs.includes('let gridImportW = 0;') || cmJs.includes('const gridImportW = (typeof gridW')) {
  console.error('[ts-charging-budget-productive] gridImportW ist nicht tick-weit gültig deklariert.');
  process.exit(1);
}
const bad = budget.buildChargingBudgetSafetyCapsProductive(
  { budgetAfterW: 7000, effectiveBudgetMode: 'engine:pv', gridCapApplied: false, phaseCapApplied: false, para14aApplied: false },
  { budgetW: 10000, budgetMode: 'engine:pv', gridCapEvcsW: 6000, gridCapBinding: true }
);
if (!bad.fallback || bad.fallbackReason !== 'ts-js-mismatch') {
  console.error('[ts-charging-budget-productive] Mismatch führt nicht zu Fallback.');
  process.exit(1);
}
console.log('[ts-charging-budget-productive] OK: EVCS Budget-Caps sind produktiv TS mit JS-Fallback vorbereitet.');
