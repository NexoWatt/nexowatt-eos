#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const mustContain = (text, needle, label) => {
  if (!text.includes(needle)) throw new Error(`${label} fehlt: ${needle}`);
};
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
