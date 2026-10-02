#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-heating-rod-legacy-final-cleanup.js
 *
 * Zweck:
 * Prüft den 0.7.119-Cleanup: Der alte JS-Heizstabreferenzbaum darf im stabilen
 * TS-Normalpfad nicht mehr als normale Diagnose mitlaufen. Stattdessen bleibt nur eine
 * kompakte Debug-/Notfallbrücke erhalten.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function must(rel, marker, label) {
  const text = read(rel);
  if (!text.includes(marker)) {
    console.error(`[heating-rod-legacy-final-cleanup] ERROR ${rel}: missing ${label}: ${marker}`);
    process.exit(1);
  }
}

must('ems/modules/heating-rod-control.js', '_buildHeatingRodTsLegacyFinalCleanupState', 'Final-Cleanup Builder');
must('ems/modules/heating-rod-control.js', 'heatingRod.summary.tsLegacyFinalCleanupJson', 'Final-Cleanup State');
must('ems/modules/heating-rod-control.js', 'legacyReferenceRemovedFromNormalDiagnostics', 'Normaldiagnose-Entfernung');
must('ems/modules/heating-rod-control.js', 'fullLegacyReferenceRemovedFromNormalDiagnostics', 'vollständige Legacy-Details entfernt');
must('ems/modules/heating-rod-control.js', 'normalDiagnosticsPayload', 'Normaldiagnose Payload-Modus');
must('ems/modules/heating-rod-control.js', 'compactDebugBridge', 'kompakte Debug-Brücke');
must('ems/modules/heating-rod-control.js', "legacyReference: heatingRodTsLegacyFinalCleanup", 'debugJson nutzt finalen Cleanup statt Vollreferenz');
must('www/ems-apps.js', 'JS-Final-Cleanup', 'App-Center Zeile Final Cleanup');
must('www/ems-apps.js', 'JS-Normaldiagnose', 'App-Center Zeile Normaldiagnose');
must('src-ts/runtime-mirrors/ems/modules/heating-rod-control.ts', '_buildHeatingRodTsLegacyFinalCleanupState', 'Runtime-Spiegel aktualisiert');
console.log('[heating-rod-legacy-final-cleanup] OK: alter JS-Referenzbaum ist aus der Normaldiagnose herausgelöst.');
