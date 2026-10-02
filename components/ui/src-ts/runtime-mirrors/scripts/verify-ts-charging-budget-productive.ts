// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-charging-budget-productive.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-charging-budget-productive.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Produktive Originalquellen liegen unter
 * src-ts/runtime-executables/ bzw. den im generierten JS genannten TS-Pfaden.
 * Dort ändern, Laufzeit erzeugen und danach die Spiegel synchronisieren.
 * Build-/Prüfskripte ohne TS-Original werden weiterhin unter scripts/ gepflegt.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: 099f56ff0aeb744cab094a965265ddfdedf28f6c261ce8f27d451d2108d4f0b0
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

'use strict';

/**
 * Datei: scripts/verify-ts-charging-budget-productive.js
 * Zweck: Prüft 0.7.123, ob EVCS-/Charging-Budget-Caps produktiv aus TypeScript
 * übernommen werden und JavaScript als Fallback erhalten bleibt.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
/**
 * Code-Teil: read
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
/**
 * Code-Teil: need
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
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
