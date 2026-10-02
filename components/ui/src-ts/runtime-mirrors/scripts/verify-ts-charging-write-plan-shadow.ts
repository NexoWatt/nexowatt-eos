// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-charging-write-plan-shadow.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-charging-write-plan-shadow.js
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
 * Original-Hash: 17b9055cc52948693a8e920898d88f4009cd35f4b2fa59eaa5231c00c7efc574
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
 * Datei: scripts/verify-ts-charging-write-plan-shadow.js
 * Zweck: Prüft den EVCS-Setpoint-Write-Plan-Shadow in TypeScript.
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
    console.error(`[ts-charging-write-plan-shadow] ${rel}: fehlt ${label || marker}`);
    process.exit(1);
  }
}
need('src-ts/ems/charging-management/charging-write-plan.ts', 'buildChargingSetpointWritePlan', 'Write-Plan-Shadow-Helfer');
need('src-ts/ems/charging-management/charging-write-plan.ts', 'doesNotWriteIoBrokerStates', 'keine Schreiboperation in TS');
need('lib/ts-mirrors/ems/charging-management/charging-write-plan.js', 'exports.buildChargingSetpointWritePlan', 'CJS-Export Write-Plan');
need('scripts/build-ts-ems-mirrors.js', 'charging-write-plan.ts', 'Mirror-Sync enthält Write-Plan-Quelle');
need('ems/modules/charging-management.js', 'requireChargingWritePlanTsMirror', 'Runtime lädt Write-Plan-Spiegel');
need('ems/modules/charging-management.js', 'tsWritePlanShadowJson', 'Write-Plan-Shadow-State');
need('ems/modules/charging-management.js', 'ts-write-plan-shadow', 'Write-Plan-Quelle');
need('main.js', 'tsWritePlanShadowJson', 'API liefert Write-Plan');
need('www/ems-apps.js', 'TS‑Shadow: EVCS Write‑Plan', 'App-Center zeigt Write-Plan-Karte');
const writePlan = require(path.join(root, 'lib/ts-mirrors/ems/charging-management/charging-write-plan.js'));
if (typeof writePlan.buildChargingSetpointWritePlan !== 'function') {
  console.error('[ts-charging-write-plan-shadow] buildChargingSetpointWritePlan ist nicht importierbar.');
  process.exit(1);
}
const plan = writePlan.buildChargingSetpointWritePlan({
  wallboxes: [
    { safe: 'wb_w', name: 'Power WB', enabled: true, online: true, controlBasis: 'power', setWKey: 'cm.wb.wb_w.setW' },
    { safe: 'wb_a', name: 'Current WB', enabled: true, online: true, controlBasis: 'current', setAKey: 'cm.wb.wb_a.setA' },
  ],
  allocations: [
    { safe: 'wb_w', targetW: 4200, targetA: 0, reason: 'ok' },
    { safe: 'wb_a', targetW: 4140, targetA: 6, reason: 'ok' },
  ],
});
if (!plan || plan.productive !== false || plan.writeCount !== 2 || plan.entries[0].targetValue !== 4200 || plan.entries[1].targetValue !== 6) {
  console.error('[ts-charging-write-plan-shadow] Write-Plan erstellt falsche Einträge.');
  process.exit(1);
}
if (!plan.safety || plan.safety.doesNotWriteIoBrokerStates !== true || plan.safety.javascriptExecutorStillRequired !== true) {
  console.error('[ts-charging-write-plan-shadow] Sicherheitsgrenzen fehlen.');
  process.exit(1);
}
const stale = writePlan.buildChargingSetpointWritePlan({ ...plan, staleMeter: true, wallboxes: [{ safe: 'wb_w', enabled: true, online: true, controlBasis: 'power', setWKey: 'x' }], allocations: [{ safe: 'wb_w', targetW: 1000 }] });
if (!stale || stale.ok || !stale.entries[0].blocked || stale.writeCount !== 0) {
  console.error('[ts-charging-write-plan-shadow] staleMeter blockiert Write-Plan nicht korrekt.');
  process.exit(1);
}
console.log('[ts-charging-write-plan-shadow] OK: EVCS-Setpoint-Write-Plan ist als TS-Shadow ohne I/O vorbereitet.');
