// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-core-limits-rest-gates-productive.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-core-limits-rest-gates-productive.js
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
 * Original-Hash: d8fe01d8debbb37399cfd481918f51a768e512209ae0cbc6a76746df834690d7
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
function read(rel) { const f = path.join(root, rel); if (!fs.existsSync(f)) throw new Error('Pflichtdatei fehlt: ' + rel); return fs.readFileSync(f, 'utf8'); }
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
function must(rel, marker) { const text = read(rel); if (!text.includes(marker)) throw new Error(rel + ': Marker fehlt: ' + marker); }

must('src-ts/ems/core-limits/core-budget.ts', 'buildCoreRestGatesProductive');
must('lib/ts-mirrors/ems/core-limits/core-budget.js', 'buildCoreRestGatesProductive');
must('ems/modules/core-limits.js', '_applyCoreRestGatesTsProductiveSnapshot');
must('ems/modules/core-limits.js', 'tsRestGatesProductive');
must('ems/modules/core-limits.js', 'source: \'ts-core-rest-gates\'');
must('ems/modules/core-limits.js', 'ems.budget.tsRestGatesJson');

const mirror = require(path.join(root, 'lib/ts-mirrors/ems/core-limits/core-budget.js'));
const result = mirror.buildCoreRestGatesProductive({
  forecast: { valid: true, usable: true, nowW: 1000, avgNext1hW: 1500, status: 'ok' },
  tariff: { active: true, gridChargeAllowed: true, dischargeAllowed: false, negativeActive: true, gridImportPreferred: true },
  peak: { active: true, budgetW: 5000 },
  grid: { gridImportLimitW_effective: 9000, gridImportLimitW_source: 'physical' },
  para14a: { active: true, mode: 'reduced', evcsCapW: 4200 },
  evcsHighLevel: { capW: 4200, binding: '14a' },
  ts: 123,
});
if (!result || result.source !== 'ts-core-rest-gates-productive' || result.productive !== true || result.preparedOnly !== false) {
  throw new Error('buildCoreRestGatesProductive liefert keinen produktiven Snapshot.');
}
if (!result.gates || !result.gates.forecast || result.gates.forecast.avgNext1hW !== 1500) throw new Error('Forecast-Gate fehlt im Produktivsnapshot.');
if (!result.gates.tariff || result.gates.tariff.dischargeAllowed !== false) throw new Error('Tarif-Gate verliert false-Wert.');
if (!result.gates.evcsHighLevel || result.gates.evcsHighLevel.capW !== 4200) throw new Error('EVCS-High-Level-Cap fehlt.');
console.log('[ts-core-limits-rest-gates-productive] OK: Core-Limits Restgates werden produktiv via TS vorbereitet/übernommen.');
