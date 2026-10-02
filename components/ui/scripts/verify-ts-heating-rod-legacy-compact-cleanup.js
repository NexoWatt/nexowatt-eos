#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-heating-rod-legacy-compact-cleanup.js
 * Zweck: Prüft, dass die alte Heizstab-JS-Referenz im TS-Normalpfad nur noch kompakte
 * Diagnose/Cleanup-Daten mitführt und nicht mehr als großer Entscheidungsblock wirkt.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function fail(msg) { console.error('[heating-rod-legacy-compact-cleanup] ERROR: ' + msg); process.exit(1); }
function must(rel, marker, label) { if (!read(rel).includes(marker)) fail(`${label} fehlt: ${marker}`); }
must('ems/modules/heating-rod-control.js', 'heating-rod-legacy-js-reference-cleanup-v3', 'Legacy-Referenzdiagnose v2');
must('ems/modules/heating-rod-control.js', 'diagnosticPayloadMode', 'kompakter Payload-Modus');
must('ems/modules/heating-rod-control.js', 'legacyReferenceDetailsSuppressed', 'Detailunterdrückung');
must('ems/modules/heating-rod-control.js', 'referenceMismatchSample', 'kleine Referenzmismatch-Probe');
must('ems/modules/heating-rod-control.js', 'referenceMismatches: diagnosticOnly ? []', 'vollständige Listen im Normalpfad geleert');
must('ems/modules/heating-rod-control.js', 'cleanupRemovalCandidate', 'Cleanup-Entfernungskandidat');
must('ems/modules/heating-rod-control.js', 'oldJsReferenceRemovalStage', 'JS-Referenz-Entfernungsstufe');
must('www/ems-apps.js', 'JS-Diagnosedaten', 'App-Center Payload-Zeile');
must('www/ems-apps.js', 'JS-Cleanup-Kandidat', 'App-Center Cleanup-Kandidat-Zeile');
console.log('[heating-rod-legacy-compact-cleanup] OK: Heizstab Legacy-JS-Referenzdiagnose ist kompakt und cleanupfähig.');
