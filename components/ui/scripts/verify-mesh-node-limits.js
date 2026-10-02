#!/usr/bin/env node
'use strict';
/**
 * Regressionstest 0.8.48: Mesh/Microgrid Leistungsgrenzen je Knoten.
 * Schützt die Produktgrenze: Limits begrenzen nur neutrale Command-Intents und
 * erzeugen keine direkten OCPP/Modbus/MQTT/Hersteller-Schreibpfade.
 */
const fs = require('fs');
function read(p){ return fs.readFileSync(p,'utf8'); }
function must(file, text){ const s=read(file); if(!s.includes(text)){ console.error(`Missing in ${file}: ${text}`); process.exit(1); } }
function mustNot(file, text){ const s=read(file); if(s.includes(text)){ console.error(`Forbidden in ${file}: ${text}`); process.exit(1); } }
const releasePkg = JSON.parse(read('package.json'));
const releaseIo = JSON.parse(read('io-package.json'));
if (!releasePkg.version || !releaseIo.common || releasePkg.version !== releaseIo.common.version) {
  console.error(`Version mismatch: package.json=${releasePkg.version || ''}, io-package.json=${releaseIo.common && releaseIo.common.version || ''}`);
  process.exit(1);
}
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'nexowatt.mesh-microgrid-target-group-fairness.v1');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'buildCommandLimitDiagnostics');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'maxImportW');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'meshMicrogrid.limits.blockedCommandsJson');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'power_limit_blocked');
must('src-ts/runtime-executables/www/ems-apps.ts', 'data-mesh-field="maxChargeW"');
must('src-ts/runtime-executables/www/ems-apps.ts', 'readMeshPowerLimit');
must('src-ts/runtime-executables/www/mesh-microgrid.ts', 'renderLimits');
must('www/mesh-microgrid.html', 'Leistungsgrenzen');
must('src-ts/runtime-executables/main.ts', 'payload.limits');
must('src-ts/runtime-executables/main.ts', 'Limited');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'directHardwareWrite: false');
mustNot('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'ocpp.');
mustNot('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'modbus.');
console.log('OK: Mesh/Microgrid Leistungsgrenzen sind im CommandGuard, UI und API sichtbar und bleiben herstellerneutral.');
