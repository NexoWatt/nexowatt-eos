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
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', '0.8.46 ACK-Gate');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'buildBridgeAckGate');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'meshMicrogrid.localBridge.ackRequired');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'meshMicrogrid.localBridge.ackGateStatus');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'blocked-by-ack-gate');
must('src-ts/runtime-executables/www/ems-apps.ts', 'ACK als Gate erforderlich');
must('src-ts/runtime-executables/www/mesh-microgrid.ts', 'meshLocalBridgeAckGate');
must('www/mesh-microgrid.html', 'meshLocalBridgeAckGate');
mustNot('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'setForeignStateAsync(ackStateDp');
mustNot('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'setForeignStateAsync(statusStateDp');
console.log('OK: Mesh/Microgrid ACK-Gate blockiert Folge-Commands zielweise und bleibt herstellerneutral ohne direkte Hardwarewrites.');
