// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-core-limits-rest-gates.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-core-limits-rest-gates.js
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
 * Original-Hash: 4c98ac5129fd62cc32f8cbf21f514089c183d2a42000d1705ae365ad8ab57bc7
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
function read(rel) { const f = path.join(root, rel); if (!fs.existsSync(f)) throw new Error('Pflichtdatei fehlt: '+rel); return fs.readFileSync(f,'utf8'); }
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
