#!/usr/bin/env node
'use strict';
const fs = require('fs');
function read(p){ return fs.readFileSync(p,'utf8'); }
function must(file, text){ const s=read(file); if(!s.includes(text)){ console.error(`Missing in ${file}: ${text}`); process.exit(1); } }
function forbid(file, text){ const s=read(file); if(s.includes(text)){ console.error(`Forbidden in ${file}: ${text}`); process.exit(1); } }
const releasePkg = JSON.parse(read('package.json'));
const releaseIo = JSON.parse(read('io-package.json'));
if (!releasePkg.version || !releaseIo.common || releasePkg.version !== releaseIo.common.version) {
  console.error(`Version mismatch: package.json=${releasePkg.version || ''}, io-package.json=${releaseIo.common && releaseIo.common.version || ''}`);
  process.exit(1);
}
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','_zeroExportSinkPriorityPlan');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','localConsumption');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','chargingStations');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','flexLoads');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','storageCharge');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','inverterCurtailment');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts',"'localConsumption',\n            'chargingStations',\n            'flexLoads',\n            'storageCharge',\n            'meshMicrogrid',\n            'inverterCurtailment'");
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','gridConstraints.exportLimit.sinkPriorityPlanJson');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','sink_priority_command_ready');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','setForeignStateAsync(stateId');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','sinkCommandWriteStatus');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','_writeZeroExportSinkCommands');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','const requestedReductionW = requiredW;');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','diagnosticCurtailmentW');
must('src-ts/runtime-executables/www/ems-apps.ts','0‑Einspeise-Reihenfolge');
must('src-ts/runtime-executables/www/ems-apps.ts','zeroExportStorageChargeCommandStateId');
must('src-ts/runtime-executables/www/ems-apps.ts','zeroExportChargingCommandStateId');
must('src-ts/runtime-executables/www/ems-apps.ts','zeroExportFlexLoadCommandStateId');
must('src-ts/runtime-executables/www/ems-apps.ts','zeroExportMeshCommandStateId');
forbid('src-ts/runtime-executables/ems/modules/grid-constraints.ts','new ZeroExportController');
console.log('OK: 0-Einspeise Senkenreihenfolge ist Verbrauch → freigegebene Ladepunkte → flexible Verbraucher → Speicher → Mesh/Microgrid → WR-Abregelung und baut keine zweite Regelung.');
