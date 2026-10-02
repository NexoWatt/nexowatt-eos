#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-heating-rod-legacy-cleanup.js
 *
 * Zweck:
 * Prüft 0.7.113: Die alte JavaScript-Heizstabreferenz ist nach TS-Normalpfad-Übernahme
 * aus dem normalen Entscheidungsweg herausgelöst und als Diagnose-/Cleanup-Block geführt.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function fail(msg) { console.error('[heating-rod-legacy-cleanup] ERROR: ' + msg); process.exit(1); }
function must(file, marker, label) { if (!read(file).includes(marker)) fail(`${file}: fehlt ${label || marker}`); }

must('ems/modules/heating-rod-control.js', '_buildHeatingRodLegacyReferenceDiagnostic', 'Legacy-Referenzdiagnose');
must('ems/modules/heating-rod-control.js', '_buildHeatingRodTsLegacyCleanupState', 'Legacy-Cleanup-State Builder');
must('ems/modules/heating-rod-control.js', 'heatingRod.summary.tsLegacyReferenceJson', 'Legacy-Referenz-State');
must('ems/modules/heating-rod-control.js', 'heatingRod.summary.tsLegacyCleanupJson', 'Legacy-Cleanup-State');
must('ems/modules/heating-rod-control.js', 'legacy-reference-compact-diagnostic-only', 'kompakte Cleanup-Stage');
must('ems/modules/heating-rod-control.js', 'decisionImpact', 'Entscheidungseinfluss-Feld');
must('ems/modules/heating-rod-control.js', 'diagnostic-and-emergency-fallback', 'JS-Rolle Diagnose und Notfallback');
must('ems/modules/heating-rod-control.js', 'legacyJsReferenceUsedForDecision', 'Referenzpfad Entscheidungsmarker');
must('www/ems-apps.js', 'JS-Referenz Cleanup', 'App-Center zeigt Cleanup');
must('www/ems-apps.js', 'JS-Entscheidungseinfluss', 'App-Center zeigt Entscheidungseinfluss');
console.log('[heating-rod-legacy-cleanup] OK: JS-Heizstabreferenz ist als kompakter Diagnose/Cleanup-Pfad vorbereitet.');
