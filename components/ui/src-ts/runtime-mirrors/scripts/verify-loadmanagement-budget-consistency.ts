// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-loadmanagement-budget-consistency.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-loadmanagement-budget-consistency.js
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
 * Original-Hash: 757deed2bf464f1e6bfd84dadefd684bfc4c1418c66700ffcd88f71ebef2fac4
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
const fs = require('fs');
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
function read(p){ return fs.readFileSync(p,'utf8'); }
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
function must(file, needle){ const s=read(file); if(!s.includes(needle)){ console.error(`Missing in ${file}: ${needle}`); process.exit(1); } }
/**
 * Code-Teil: mustNot
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
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
