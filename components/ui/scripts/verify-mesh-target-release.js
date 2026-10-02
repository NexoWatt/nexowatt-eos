#!/usr/bin/env node
'use strict';
const fs = require('fs');
function read(p){return fs.readFileSync(p,'utf8');}
function must(file, text){const s=read(file); if(!s.includes(text)){console.error(`Missing in ${file}: ${text}`); process.exit(1);}}
function mustNot(file, text){const s=read(file); if(s.includes(text)){console.error(`Forbidden in ${file}: ${text}`); process.exit(1);}}
const releasePkg = JSON.parse(read('package.json'));
const releaseIo = JSON.parse(read('io-package.json'));
if (!releasePkg.version || !releaseIo.common || releasePkg.version !== releaseIo.common.version) {
  console.error(`Version mismatch: package.json=${releasePkg.version || ''}, io-package.json=${releaseIo.common && releaseIo.common.version || ''}`);
  process.exit(1);
}
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'nexowatt.mesh-microgrid-target-group-fairness.v1');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'normalizeManualReleaseList');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'buildTargetCommandHistory');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'manualReleaseActive');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'meshMicrogrid.localBridge.targetCommandHistoryJson');
must('src-ts/runtime-executables/main.ts', "/api/mesh/local-bridge/release");
must('src-ts/runtime-executables/www/mesh-microgrid.ts', 'releaseBridgeTarget');
must('www/mesh-microgrid.html', 'meshLocalBridgeHistoryRows');
must('www/mesh-microgrid.html', 'meshLocalBridgeRelease');
mustNot('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'setForeignStateAsync(ackStateDp');
mustNot('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'setForeignStateAsync(statusStateDp');
console.log('OK: Mesh/Microgrid Ziel-Wiederfreigabe und zielweiser Command-Verlauf sind vorbereitet; keine direkten Hardwarewrites.');
