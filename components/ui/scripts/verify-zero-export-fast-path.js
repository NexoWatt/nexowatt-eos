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
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','this._zeroExportSinkRuntime');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','_zeroExportSinkAvailability');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','_classifyZeroExportSinkAck');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','not_per_tick');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','blocked-by-sink-availability');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','gridConstraints.exportLimit.fastPathReady');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','gridConstraints.exportLimit.sinkAvailabilityJson');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','gridConstraints.exportLimit.sinks.${sink}.usable');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts',"for (const sink of ['storage', 'charging', 'flexLoads', 'mesh', 'inverter'])");
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','Schreibtests laufen nur bei Inbetriebnahme/Änderung/Fehler');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','Verbrauch zuerst');
mustNot('src-ts/runtime-executables/ems/modules/grid-constraints.ts','writeTestBeforeEveryTick');
console.log('OK: 0-Einspeise Fast-Path nutzt gespeicherte Freigaben/ACKs und keinen Schreibtest pro Regel-Tick.');
