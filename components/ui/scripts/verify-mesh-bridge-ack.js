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
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', '0.8.45 Bridge-ACK');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', '_evaluateLocalBridgeAck');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'classifyLocalBridgeAck');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'meshMicrogrid.localBridge.ackSummaryJson');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'directHardwareWrite: false');
must('src-ts/runtime-executables/www/ems-apps.ts', 'Default Bridge ACK-State');
must('src-ts/runtime-executables/www/mesh-microgrid.ts', 'meshLocalBridgeAckRows');
must('www/mesh-microgrid.html', 'Bridge ACK / Zielstatus');
must('src-ts/runtime-executables/main.ts', 'LocalBridgeAck');
mustNot('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'setForeignStateAsync(ackStateDp');
console.log('OK: Mesh/Microgrid Bridge ACK/Zielstatus ist TypeScript-first, app-center-konform und ohne direkte Hardwarewrites abgesichert.');
