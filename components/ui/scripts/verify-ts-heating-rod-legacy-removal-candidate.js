#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-heating-rod-legacy-removal-candidate.js
 *
 * Zweck:
 * Prüft den 0.7.118-Schritt: Der alte JS-Heizstabpfad wird nach stabilem
 * TS-Normalpfad als konkreter Entfernungs-Kandidat markiert. Die harte Notbremse bleibt.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function must(rel, marker, label) {
  const text = read(rel);
  if (!text.includes(marker)) {
    console.error(`[heating-rod-legacy-removal-candidate] ERROR: ${rel}: ${label || marker}`);
    process.exit(1);
  }
}
must('ems/modules/heating-rod-control.js', '_buildHeatingRodTsLegacyRemovalCandidateState', 'Removal-Candidate Builder fehlt');
must('ems/modules/heating-rod-control.js', 'heatingRod.summary.tsLegacyRemovalCandidateJson', 'Removal-Candidate State fehlt');
must('ems/modules/heating-rod-control.js', 'heating-rod-legacy-js-removal-candidate-v1', 'Removal-Candidate Quelle fehlt');
must('ems/modules/heating-rod-control.js', 'legacy-js-path-removal-candidate', 'Status removal-candidate fehlt');
must('ems/modules/heating-rod-control.js', 'oldJsReferenceRemovalCandidate', 'Entfernungskandidat-Marker fehlt');
must('ems/modules/heating-rod-control.js', 'legacy-reference-normal-decision-gate', 'entfernbare JS-Entscheidungsbremse fehlt');
must('ems/modules/heating-rod-control.js', 'hard-safety-fallback', 'harte Notbremse muss erhalten bleiben');
must('src-ts/runtime-mirrors/ems/modules/heating-rod-control.ts', '_buildHeatingRodTsLegacyRemovalCandidateState', 'TS-Spiegel Builder fehlt');
must('www/ems-apps.js', 'JS-Entfernungskandidat', 'App-Center Entfernungskandidat-Zeile fehlt');
must('www/ems-apps.js', 'JS-Entfernungsphase', 'App-Center Entfernungsphase-Zeile fehlt');
console.log('[heating-rod-legacy-removal-candidate] OK: alter JS-Heizstabpfad ist als Entfernungs-Kandidat markiert.');
