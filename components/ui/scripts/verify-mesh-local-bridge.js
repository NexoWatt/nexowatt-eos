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
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', '0.8.44 Lokale Bridge-Zuordnung');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'normalizeLocalBridgeCfg');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'buildLocalBridgePlan');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'lastWritesJson');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'directHardwareWrite: false');
must('src-ts/runtime-executables/www/ems-apps.ts', 'meshMicrogridLocalBridgeMappingsJson');
must('src-ts/runtime-executables/www/ems-apps.ts', 'Bridge-Zuordnungen JSON');
must('src-ts/runtime-executables/www/mesh-microgrid.ts', 'renderLocalBridge');
must('www/mesh-microgrid.html', 'Lokale Bridge-Zuordnung');
mustNot('www/ems-apps.html', 'Mesh/Microgrid aktiv</span><select');
console.log('OK: Mesh/Microgrid Local Bridge Mapping ist TypeScript-first, app-center-konform und herstellerneutral abgesichert.');
