// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-charging-control-productive.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-charging-control-productive.js
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
 * Original-Hash: d530f3609ed6fb4686f31729ac7f862e223d2b98d4a015deef332d57e1b8fb21
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
 * Datei: scripts/verify-ts-charging-control-productive.js
 * Zweck: Prüft den beschleunigten EVCS-Schritt, in dem Control-/Summary-Werte
 * produktiv aus TypeScript übernommen werden, während Allocation und Setpoint-I/O
 * weiterhin JavaScript bleiben.
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
    console.error(`[ts-charging-control-productive] ${rel}: fehlt ${label || marker}`);
    process.exit(1);
  }
}
need('src-ts/ems/charging-management/charging-control.ts', 'buildChargingControlProductive', 'produktive TS-Control-Entscheidung');
need('src-ts/ems/charging-management/charging-control.ts', 'keepsAllocationInJavascript', 'Allocation bleibt Sicherheitsgrenze');
need('src-ts/ems/charging-management/charging-control.ts', 'keepsSetpointWritingInJavascript', 'Setpoint-I/O bleibt Sicherheitsgrenze');
need('lib/ts-mirrors/ems/charging-management/charging-control.js', 'exports.buildChargingControlProductive', 'CJS-Export für produktive Control-Entscheidung');
need('ems/modules/charging-management.js', 'tsControlProductiveJson', 'Produktiv-Diagnose-State');
need('ems/modules/charging-management.js', "'ts-control'", 'produktive TS-Control-Quelle');
need('ems/modules/charging-management.js', 'tsControlApply ? tsControlApply.status', 'Control-State wird aus TS-Apply übernommen');
need('main.js', 'tsControlProductiveJson', 'API liefert produktive Control-Diagnose');
need('www/ems-apps.js', 'TS‑Produktiv: EVCS Control', 'App-Center zeigt produktive EVCS-Control-Karte');
const control = require(path.join(root, 'lib/ts-mirrors/ems/charging-management/charging-control.js'));
if (typeof control.buildChargingControlProductive !== 'function') {
  console.error('[ts-charging-control-productive] buildChargingControlProductive ist nicht importierbar.');
  process.exit(1);
}
const input = {
  mode: 'auto', budgetMode: 'engine:pv', status: 'ok', active: true,
  budgetW: 5000, usedW: 1200, remainingW: 3800, totalPowerW: 900,
  totalTargetPowerW: 1200, totalTargetCurrentA: 5.2, wallboxCount: 1,
  onlineWallboxes: 1, connectedCount: 1, staleMeter: false, staleBudget: false,
};
const ok = control.buildChargingControlProductive(input);
if (!ok || !ok.productive || ok.fallback || !ok.apply || ok.apply.usedW !== 1200 || ok.apply.totalTargetCurrentA !== 5.2) {
  console.error('[ts-charging-control-productive] produktiver Control-Fall liefert keinen TS-Apply.');
  process.exit(1);
}
if (!ok.safety || ok.safety.keepsAllocationInJavascript !== true || ok.safety.keepsSetpointWritingInJavascript !== true) {
  console.error('[ts-charging-control-productive] Sicherheitsgrenzen fehlen.');
  process.exit(1);
}
const stale = control.buildChargingControlProductive({ ...input, staleBudget: true });
if (!stale || stale.productive || !stale.fallback || stale.fallbackReason !== 'stale-budget' || stale.apply !== null) {
  console.error('[ts-charging-control-productive] staleBudget blockiert Produktiv-Übernahme nicht korrekt.');
  process.exit(1);
}
const plan = control.buildChargingControlShadowPlan(input);
const mismatch = control.buildChargingControlProductive(input, plan, { source: 'ts-charging-control-shadow-comparison-v1', ok: false, mismatchCount: 1, mismatches: [{ field: 'status', js: 'ok', ts: 'off' }] });
if (!mismatch || mismatch.productive || !mismatch.fallback || mismatch.fallbackReason !== 'ts-js-control-mismatch') {
  console.error('[ts-charging-control-productive] Mismatch führt nicht zu JS-Fallback.');
  process.exit(1);
}
console.log('[ts-charging-control-productive] OK: EVCS-Control/Summary ist produktiv TS mit JS-Fallback abgesichert.');
