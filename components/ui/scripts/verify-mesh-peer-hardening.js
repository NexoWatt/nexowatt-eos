#!/usr/bin/env node
'use strict';
/**
 * Regressionstest für 0.8.43 Mesh/Microgrid Peer-Härtung.
 * Schützt die Feldtest-Diagnose: Fehlerklassen, Roundtrip-Ampel, Allowlist
 * und Remote-Node-Matrix müssen in TS-Quelle, Runtime und Betreiberansicht
 * vorhanden bleiben. Es wird keine Hardwaresteuerung geprüft oder eingeführt.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const must = (file, needle) => {
  const s = read(file);
  if (!s.includes(needle)) {
    console.error(`Missing in ${file}: ${needle}`);
    process.exit(1);
  }
};
const not = (file, needle) => {
  const s = read(file);
  if (s.includes(needle)) {
    console.error(`Forbidden in ${file}: ${needle}`);
    process.exit(1);
  }
};
for (const file of ['src-ts/runtime-executables/ems/modules/mesh-microgrid.ts','src-ts/runtime-executables/main.ts']) {
  must(file, 'errorClassesJson');
  must(file, 'roundtripStatus');
  must(file, 'remoteNodeMatrixJson');
  must(file, 'allowedPeerNodeIds');
  must(file, 'directHardwareWrite: false');
  must(file, 'neutralCommandOnly: true');
}
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'classifyPeerFieldTestIssue');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'buildRemoteNodeMatrixFromPeers');
must('src-ts/runtime-executables/www/mesh-microgrid.ts', 'meshFieldTestHardening');
must('www/mesh-microgrid.html', 'meshRemoteNodeMatrixRows');
not('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'ocpp.');
not('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'modbus.');
console.log('OK: Mesh/Microgrid Peer-Härtung mit Fehlerklassen, Roundtrip-Ampel, Allowlist und Remote-Node-Matrix ist vorhanden.');
