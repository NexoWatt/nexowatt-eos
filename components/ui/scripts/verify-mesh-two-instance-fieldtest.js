#!/usr/bin/env node
'use strict';
/**
 * Verifikation 0.8.42: Mesh/Microgrid Zwei-Instanzen-Feldtest.
 *
 * Dieser Test ist absichtlich statisch und schnell. Er schützt die wichtigsten
 * Produktregeln:
 * - Feldtest läuft über separate Mesh/Microgrid-API und nicht über den Apps-Reiter.
 * - Die Betreiberansicht zeigt Peer-Matrix, ACK-Verlauf und manuellen Probe-Test.
 * - Commands bleiben neutral; direkte Hardwarewrites sind weiterhin verboten.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function must(text, needle, label) {
  if (!text.includes(needle)) {
    console.error(`[mesh-two-instance-fieldtest] fehlt: ${label || needle}`);
    process.exit(1);
  }
}

/** Vergleicht semantische Versionen numerisch, statt Patch-Versionen auf zwei Stellen zu begrenzen. */
function isVersionAtLeast(actualValue, minimumValue) {
  const parse = value => {
    const match = String(value || '').match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
    return match ? match.slice(1).map(Number) : null;
  };
  const actual = parse(actualValue);
  const minimum = parse(minimumValue);
  if (!actual || !minimum) return false;
  for (let index = 0; index < actual.length; index += 1) {
    if (actual[index] === minimum[index]) continue;
    return actual[index] > minimum[index];
  }
  return true;
}
const meshTs = read('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts');
const mainTs = read('src-ts/runtime-executables/main.ts');
const uiTs = read('src-ts/runtime-executables/www/mesh-microgrid.ts');
const html = read('www/mesh-microgrid.html');
const pkg = JSON.parse(read('package.json'));

must(meshTs, 'buildTwoInstanceFieldTestDiagnostics', 'Feldtest-Diagnose im EMS-Modul');
must(meshTs, 'meshMicrogrid.fieldTest.peerMatrixJson', 'Peer-Matrix-State');
must(meshTs, 'meshMicrogrid.fieldTest.commandHistoryJson', 'Command-History-State');
must(meshTs, 'directHardwareWrite: false', 'keine direkten Hardwarewrites');
must(mainTs, "app.post('/api/mesh/peer/fieldtest'", 'manueller Feldtest-POST');
must(mainTs, "app.get('/api/mesh/peer/fieldtest'", 'Feldtest-Status-GET');
must(mainTs, 'meshMicrogrid.fieldTest.lastManualTestJson', 'manueller Feldtest-State');
must(uiTs, 'function renderFieldTest', 'Feldtest-Renderer');
must(uiTs, "fetch('/api/mesh/peer/fieldtest'", 'Feldtest-Button nutzt API');
must(html, 'runMeshFieldTest', 'Feldtest-Button im HTML');
must(html, 'meshFieldTestPeerRows', 'Peer-Matrix-Tabelle im HTML');
must(html, 'meshFieldTestHistoryRows', 'Command-History-Tabelle im HTML');
if (!isVersionAtLeast(pkg.version, '0.8.42')) {
  console.error(`[mesh-two-instance-fieldtest] package.json Version ist ${pkg.version}, erwartet mindestens 0.8.42`);
  process.exit(1);
}
console.log('[mesh-two-instance-fieldtest] OK');
