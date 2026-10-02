#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-heating-rod-normal-diagnostics-cleanup.js
 *
 * Zweck:
 * Prüft 0.7.119: Die alte JS-Heizstabreferenz wird aus der normalen Diagnose
 * entfernt und nur noch als kompakte Debug-/Notfallbrücke geführt.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function must(rel, marker, label) {
  const text = read(rel);
  if (!text.includes(marker)) {
    console.error(`[heating-rod-normal-diagnostics-cleanup] ERROR: ${rel}: ${label || marker}`);
    process.exit(1);
  }
}
must('ems/modules/heating-rod-control.js', '_buildHeatingRodTsLegacyNormalDiagnosticsState', 'Normaldiagnose-Cleanup-Funktion fehlt');
must('ems/modules/heating-rod-control.js', 'heatingRod.summary.tsLegacyNormalDiagnosticsJson', 'neuer Normaldiagnose-Cleanup-State fehlt');
must('ems/modules/heating-rod-control.js', 'normalDiagnosticsRemoved', 'normalDiagnosticsRemoved Marker fehlt');
must('ems/modules/heating-rod-control.js', 'fullLegacyReferenceRemovedFromDebugJson', 'DebugJson-Full-Payload Marker fehlt');
must('ems/modules/heating-rod-control.js', 'legacy-reference-normal-diagnostics-removed', 'finaler Cleanup-Status fehlt');
must('ems/modules/heating-rod-control.js', 'heatingRodTsLegacyNormalDiagnostics.compactReference', 'Alias nutzt kompakten finalen Cleanup nicht');
must('www/ems-apps.js', 'JS-Normaldiagnose', 'App-Center zeigt Normaldiagnose-Cleanup nicht');
must('www/ems-apps.js', 'JS-Normaldiagnose entfernt', 'App-Center zeigt Entfernung nicht');
console.log('[heating-rod-normal-diagnostics-cleanup] OK: Alte JS-Heizstabreferenz ist aus Normaldiagnose/Cleanup weiter entfernt.');
