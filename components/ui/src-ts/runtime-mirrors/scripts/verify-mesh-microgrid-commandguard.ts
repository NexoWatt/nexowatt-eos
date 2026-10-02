// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-mesh-microgrid-commandguard.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-mesh-microgrid-commandguard.js
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
 * Original-Hash: a59cc90ebb2731fb5c29eb88e25f942f5c9c6011829f71c91860ee1d5c281e03
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
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
/**
 * Code-Teil: mustContain
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const mustContain = (text, needle, label) => {
  if (!text.includes(needle)) throw new Error(`${label} fehlt: ${needle}`);
};
/**
 * Code-Teil: mustNotContain
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const mustNotContain = (text, needle, label) => {
  if (text.includes(needle)) throw new Error(`${label} darf nicht enthalten sein: ${needle}`);
};

const moduleTs = read('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts');
const moduleJs = read('ems/modules/mesh-microgrid.js');
const mainTs = read('src-ts/runtime-executables/main.ts');
const mainJs = read('main.js');
const uiTs = read('src-ts/runtime-executables/www/mesh-microgrid.ts');
const uiJs = read('www/mesh-microgrid.js');
const html = read('www/mesh-microgrid.html');
const appCenterTs = read('src-ts/runtime-executables/www/ems-apps.ts');

for (const src of [moduleTs, moduleJs]) {
  mustContain(src, 'nexowatt.mesh-commandguard-field-control.v1', 'CommandGuard-Feldschema im Modul');
  mustContain(src, 'function buildCommandGuard', 'CommandGuard-Builder im Modul');
  mustContain(src, 'meshMicrogrid.commandGuard.plannedCommandsJson', 'geplante Command-Intents');
  mustContain(src, 'meshMicrogrid.commandGuard.blockedActionsJson', 'blockierte Command-Aktionen');
  mustContain(src, 'meshMicrogrid.fieldControl.lastCommandJson', 'Feldsteuerung Command-Envelope State');
  mustContain(src, 'meshMicrogrid.tailscale.remoteNodesJson', 'Tailscale Remote-Knoten State');
  mustContain(src, 'neutralCommandOnly', 'neutrale Command-Ausgabe');
  mustContain(src, 'directHardwareWrite: false', 'direktes Hardware-Schreiben gesperrt');
  mustContain(src, 'setForeignStateAsync(control.commandStateDp', 'Command-Ausgabe nur in konfigurierten JSON-State');
  mustNotContain(src, 'ocpp', 'keine OCPP-Hartkopplung in Mesh/Microgrid');
  mustNotContain(src, 'modbus', 'keine Modbus-Hartkopplung in Mesh/Microgrid');
}

for (const src of [mainTs, mainJs]) {
  mustContain(src, '/api/mesh/microgrid/command-guard', 'CommandGuard Snapshot API');
  mustContain(src, '/api/mesh/microgrid/command', 'CommandGuard Command API');
  mustContain(src, 'accepted-for-neutral-command-pipeline', 'Command API verweist auf neutralen Feldpfad');
  mustContain(src, 'directHardwareWrite: false', 'API verhindert direkten Hardware-Schreibpfad');
}

for (const src of [uiTs, uiJs]) {
  mustContain(src, 'renderCommandGuard', 'Betreiberansicht rendert CommandGuard');
  mustContain(src, 'renderFieldControl', 'Betreiberansicht rendert Feldsteuerung');
  mustContain(src, 'meshFieldStatus', 'Feldstatus in UI');
  mustContain(src, 'meshTailscaleStatus', 'Tailscale-Status in UI');
}

mustContain(html, 'CommandGuard / Feldtest', 'CommandGuard/Feldtest Abschnitt im HTML');
mustContain(html, 'meshCommandRows', 'CommandGuard Tabelle im HTML');
mustContain(html, 'meshFieldStatus', 'Feldsteuerung Abschnitt im HTML');
mustContain(html, 'meshTailscaleStatus', 'Tailscale Abschnitt im HTML');
mustContain(appCenterTs, 'meshMicrogridControlMode', 'Feldsteuerungsmodus im Mesh/Microgrid-Reiter');
mustContain(appCenterTs, 'meshMicrogridTailscalePeerUrls', 'Tailscale-Peer-URLs im Mesh/Microgrid-Reiter');
mustNotContain(appCenterTs, 'app_meshMicrogrid_installed".*meshMicrogridCommandStateDp', 'keine Feldsteuerungsdetails im Apps-Katalog');

console.log('OK: Mesh/Microgrid CommandGuard unterstützt feldtestfähige, neutrale Command-Ausgabe und Tailscale-Mesh ohne direkten Hardware-Schreibpfad.');
