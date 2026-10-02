#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function must(rel, marker, label) {
  const txt = read(rel);
  if (!txt.includes(marker)) {
    console.error(`[heating-rod-legacy-pruned-debug] ERROR: ${rel}: ${label || marker}`);
    process.exit(1);
  }
}
must('ems/modules/heating-rod-control.js', '_buildHeatingRodTsLegacyPrunedState', 'Pruned-Debug Builder fehlt');
must('ems/modules/heating-rod-control.js', 'heatingRod.summary.tsLegacyPrunedJson', 'Pruned-Debug State fehlt');
must('ems/modules/heating-rod-control.js', 'fullReferencePayloadRemoved', 'vollständiger Referenzpayload wird nicht markiert');
must('ems/modules/heating-rod-control.js', 'removedFromNormalDebug', 'Cleanup-Liste für entfernte Details fehlt');
must('ems/modules/heating-rod-control.js', 'compactLegacyReference', 'kompakte Legacy-Referenz fehlt');
must('ems/modules/heating-rod-control.js', 'legacyReference: heatingRodTsLegacyFinalCleanup && heatingRodTsLegacyFinalCleanup.ready ?', 'debugJson nutzt kompakte/finale Referenz nicht');
must('www/ems-apps.js', 'JS-Pruning', 'App-Center Zeile JS-Pruning fehlt');
must('www/ems-apps.js', 'JS-Normaldiagnose entfernt', 'App-Center Zeile Normaldiagnose entfernt fehlt');
console.log('[heating-rod-legacy-pruned-debug] OK: alte JS-Referenzdetails sind in kompakte Debug-Brücke verschoben.');
