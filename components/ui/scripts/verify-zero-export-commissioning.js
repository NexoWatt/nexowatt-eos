#!/usr/bin/env node
'use strict';
const fs = require('fs');
function read(p){return fs.readFileSync(p,'utf8');}
function must(file, needle){const s=read(file); if(!s.includes(needle)){console.error(`Missing in ${file}: ${needle}`); process.exit(1);}}
function mustNot(file, needle){const s=read(file); if(s.includes(needle)){console.error(`Forbidden in ${file}: ${needle}`); process.exit(1);}}
const releasePkg = JSON.parse(read('package.json'));
const releaseIo = JSON.parse(read('io-package.json'));
if (!releasePkg.version || !releaseIo.common || releasePkg.version !== releaseIo.common.version) {
  console.error(`Version mismatch: package.json=${releasePkg.version || ''}, io-package.json=${releaseIo.common && releaseIo.common.version || ''}`);
  process.exit(1);
}
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','_buildZeroExportCommissioningAssistant');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','gridConstraints.exportLimit.commissioning.checklistJson');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','gridConstraints.exportLimit.commissioning.writeTestPreviewJson');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','Verbrauch → freigegebene Ladepunkte → flexible Verbraucher → Speicher');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','keine zweite Regelung');
must('src-ts/runtime-executables/www/ems-apps.ts','commissioning.reportJson');
must('src-ts/runtime-executables/www/ems-apps.ts','0‑Einspeise Inbetriebnahme-Checkliste');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','directHardwareWrite: false');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','neutralCommandOnly: true');
mustNot('src-ts/runtime-executables/ems/modules/grid-constraints.ts','new ZeroExport');
console.log('OK: 0-Einspeise Inbetriebnahme-Assistent ist diagnostisch, nicht doppelt geregelt und app-center-konform vorbereitet.');
