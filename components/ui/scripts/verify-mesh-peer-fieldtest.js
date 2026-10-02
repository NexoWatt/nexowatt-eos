#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function must(file, needle) {
  const s = read(file);
  if (!s.includes(needle)) {
    console.error(`Missing in ${file}: ${needle}`);
    process.exit(1);
  }
}

must('src-ts/runtime-executables/main.ts', "/api/mesh/peer/fieldtest");
must('src-ts/runtime-executables/main.ts', 'nexowatt.mesh-two-instance-fieldtest-api.v1');
must('src-ts/runtime-executables/main.ts', 'fieldTestProbe');
must('src-ts/runtime-executables/main.ts', 'directHardwareWrite: false');
must('src-ts/runtime-executables/main.ts', 'neutralCommandOnly: true');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'meshMicrogrid.fieldTest.lastManualTestJson');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'nexowatt.mesh-microgrid-two-instance-fieldtest.v1');
must('src-ts/runtime-executables/www/mesh-microgrid.ts', 'runFieldTest');
must('www/mesh-microgrid.html', 'Peer-Handshake + Probe-Command testen');

console.log('OK: Mesh/Microgrid Zwei-Instanzen-Feldtest statisch geprüft.');
