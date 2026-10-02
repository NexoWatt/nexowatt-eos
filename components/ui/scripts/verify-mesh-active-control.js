#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
function must(file, needle) {
  const s = read(file);
  if (!s.includes(needle)) {
    console.error(`Missing in ${file}: ${needle}`);
    process.exit(1);
  }
}
function mustNot(file, needle) {
  const s = read(file);
  if (s.includes(needle)) {
    console.error(`Forbidden in ${file}: ${needle}`);
    process.exit(1);
  }
}

for (const file of ['src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'ems/modules/mesh-microgrid.js']) {
  must(file, "'active'");
  must(file, 'active-output-ready');
  must(file, 'Aktivsteuerung freigegeben');
  must(file, 'executionMode');
  must(file, 'activeControl');
  must(file, 'directHardwareWrite: false');
  must(file, 'neutralCommandOnly: true');
  must(file, 'setForeignStateAsync(control.commandStateDp');
  mustNot(file, 'new OCPP');
  mustNot(file, 'directOcpp');
}

must('src-ts/runtime-executables/www/ems-apps.ts', 'Aktiv: Local-First Commands ausgeben');
must('www/ems-apps.js', 'Aktiv: Local-First Commands ausgeben');
must('src-ts/runtime-executables/www/ems-apps.ts', "['off','diagnostic','field_test','active']");
const releasePkg = JSON.parse(read('package.json'));
const releaseIo = JSON.parse(read('io-package.json'));
if (!releasePkg.version || !releaseIo.common || releasePkg.version !== releaseIo.common.version) {
  console.error(`Version mismatch: package.json=${releasePkg.version || ''}, io-package.json=${releaseIo.common && releaseIo.common.version || ''}`);
  process.exit(1);
}
// Historical 0.8.52 feature marker is no longer tied to the current release-news window.

console.log('OK: Mesh/Microgrid Aktivmodus gibt nur neutrale Local-First-/Grid-Last-Command-Intents aus und bleibt herstellerneutral.');
