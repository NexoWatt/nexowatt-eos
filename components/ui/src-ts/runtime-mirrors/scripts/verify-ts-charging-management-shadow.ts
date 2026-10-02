// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-charging-management-shadow.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-charging-management-shadow.js
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
 * Original-Hash: 43af381c8ecd91f7bfc47c83041b304fb809fdc76fd1939552e3297ac8e90d0f
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
/** Prüft den 0.7.122-Schritt: EVCS/Charging-Management TS-Budget-Caps als Shadow-Vorbereitung. */
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
function read(rel){ const p=path.join(root,rel); if(!fs.existsSync(p)){throw new Error('missing '+rel)} return fs.readFileSync(p,'utf8'); }
/**
 * Code-Teil: must
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
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
