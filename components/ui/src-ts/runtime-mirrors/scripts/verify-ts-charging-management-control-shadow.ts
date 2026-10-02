// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-charging-management-control-shadow.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-charging-management-control-shadow.js
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
 * Original-Hash: 3a0bee22f3134b59576ebc295cd6162de2be34193cfa66c2b90f0f34dbae345b
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
 * Datei: scripts/verify-ts-charging-management-control-shadow.js
 *
 * Zweck:
 * Prüft den 0.7.122-Schritt: EVCS/Charging-Management bekommt einen TypeScript-
 * Control-Shadow als Vorbereitung für spätere produktive Übernahme.
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
function need(rel, marker) { if (!read(rel).includes(marker)) { console.error(`[ts-charging-control-shadow] missing ${marker} in ${rel}`); process.exit(1); } }
need('src-ts/ems/charging-management/charging-control.ts', 'buildChargingControlShadowPlan');
need('src-ts/ems/charging-management/charging-control.ts', 'compareChargingControlShadowPlan');
need('lib/ts-mirrors/ems/charging-management/charging-control.js', 'buildChargingControlShadowPlan');
need('ems/modules/charging-management.js', 'requireChargingControlTsMirror');
need('ems/modules/charging-management.js', '_publishChargingControlTsShadow');
need('ems/modules/charging-management.js', 'chargingManagement.control.tsControlShadowJson');
need('main.js', 'tsControlShadowJson');
need('scripts/build-ts-ems-mirrors.js', 'src-ts/ems/charging-management/charging-control.ts');
const mirror = require(path.join(root, 'lib/ts-mirrors/ems/charging-management/charging-control.js'));
const plan = mirror.buildChargingControlShadowPlan({ mode: 'auto', status: 'ok', budgetW: 5000, usedW: 0, remainingW: 5000, wallboxCount: 1, onlineWallboxes: 1, staleMeter: false });
if (!plan || plan.control.budgetW !== 5000 || plan.control.usedW !== 0 || plan.visibility.hasEvcs !== true) {
  console.error('[ts-charging-control-shadow] helper runtime check failed');
  process.exit(1);
}
console.log('[ts-charging-control-shadow] OK: EVCS/Charging-Management TS-Control-Shadow vorbereitet.');
