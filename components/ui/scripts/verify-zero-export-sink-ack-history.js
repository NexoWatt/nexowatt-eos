#!/usr/bin/env node
'use strict';
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
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','0.8.56');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','async _zeroExportSinkAvailability');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','_zeroExportSinkAckSummary');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','gridConstraints.exportLimit.sinkAckHistoryJson');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','gridConstraints.exportLimit.sinkAckSummaryJson');
must('ems/modules/grid-constraints.js','sinkAckHistoryJson');
must('ems/modules/grid-constraints.js','sinkAckSummaryJson');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','Kein Schreibtest pro Tick');
mustNot('src-ts/runtime-executables/ems/modules/grid-constraints.ts','beforeEveryCommandWriteTest');
console.log('OK: 0-Einspeise Senken-ACK-Verlauf/Feldprotokoll ist vorhanden und ohne Schreibtest pro Regel-Tick abgesichert.');
