// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-charging-allocation-shadow.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-charging-allocation-shadow.js
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
 * Original-Hash: 25c45b885c08eac89540b2f96793ebca1e5ce0d0cdfe550786ab02ba6fd08f84
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
 * Datei: scripts/verify-ts-charging-allocation-shadow.js
 * Zweck: Prüft den EVCS-Wallbox-Allocation-Shadow in TypeScript.
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
    console.error(`[ts-charging-allocation-shadow] ${rel}: fehlt ${label || marker}`);
    process.exit(1);
  }
}
need('src-ts/ems/charging-management/charging-allocation.ts', 'buildChargingAllocationShadowPlan', 'Allocation-Shadow-Helfer');
need('src-ts/ems/charging-management/charging-allocation.ts', 'compareChargingAllocationShadowPlan', 'Allocation-Vergleich');
need('lib/ts-mirrors/ems/charging-management/charging-allocation.js', 'exports.buildChargingAllocationShadowPlan', 'CJS-Export Allocation-Shadow');
need('scripts/build-ts-ems-mirrors.js', 'charging-allocation.ts', 'Mirror-Sync enthält Allocation-Quelle');
need('ems/modules/charging-management.js', 'requireChargingAllocationTsMirror', 'Runtime lädt Allocation-Spiegel');
need('ems/modules/charging-management.js', 'tsAllocationShadowJson', 'Allocation-Shadow-State');
need('main.js', 'tsAllocationShadowJson', 'API liefert Allocation-Shadow');
need('www/ems-apps.js', 'TS‑Prep: EVCS Allocation', 'App-Center zeigt Allocation-Karte');
const allocation = require(path.join(root, 'lib/ts-mirrors/ems/charging-management/charging-allocation.js'));
if (typeof allocation.buildChargingAllocationShadowPlan !== 'function') {
  console.error('[ts-charging-allocation-shadow] buildChargingAllocationShadowPlan ist nicht importierbar.');
  process.exit(1);
}
const input = {
  mode: 'auto', budgetMode: 'engine:pv', budgetW: 7000, usedW: 3200, remainingW: 3800,
  totalPowerW: 2800, totalTargetPowerW: 3200, totalTargetCurrentA: 13.9,
  wallboxes: [{ safe: 'wb_1', name: 'WB 1', enabled: true, online: true, vehiclePlugged: true, controlBasis: 'power', setWKey: 'cm.wb.wb_1.setW', maxPowerW: 11000 }],
  allocations: [{ safe: 'wb_1', targetW: 3200, targetA: 13.9, reason: 'ok', effectiveMode: 'auto', applied: true }],
};
const plan = allocation.buildChargingAllocationShadowPlan(input);
if (!plan || plan.wallboxCount !== 1 || plan.totalTargetPowerW !== 3200 || plan.wallboxes[0].targetPowerW !== 3200 || plan.productive !== false) {
  console.error('[ts-charging-allocation-shadow] Shadow-Plan normalisiert Zielwerte nicht korrekt.');
  process.exit(1);
}
const cmp = allocation.compareChargingAllocationShadowPlan(input, plan);
if (!cmp || !cmp.ok || cmp.mismatchCount !== 0) {
  console.error('[ts-charging-allocation-shadow] Vergleich meldet fälschlich Mismatches.');
  process.exit(1);
}
const zero = allocation.buildChargingAllocationShadowPlan({ wallboxes: [{ safe: 'wb_0', enabled: true, online: true, setWKey: 'x' }], allocations: [{ safe: 'wb_0', targetW: 0, targetA: 0, reason: 'no_pv_surplus' }], totalTargetPowerW: 0, totalTargetCurrentA: 0 });
if (!zero || zero.wallboxes[0].targetPowerW !== 0 || zero.activeTargetCount !== 0) {
  console.error('[ts-charging-allocation-shadow] 0-W-Ziel wird nicht korrekt als gültiger sicherer Wert behandelt.');
  process.exit(1);
}
console.log('[ts-charging-allocation-shadow] OK: EVCS-Allocation-Shadow typisiert Wallbox-Zielwerte und vergleicht sie sauber.');
