#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-heating-rod-runtime-evaluation.js
 *
 * Zweck:
 * Prüft den 0.7.109-Schritt: Heizstab-TS wird auf echter Anlage beobachtet und
 * Fallbacks werden auswertbar gemacht.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function fail(msg) { console.error('[heating-rod-runtime-evaluation] ERROR: ' + msg); process.exit(1); }
function must(file, marker) { if (!read(file).includes(marker)) fail(`${file}: fehlt ${marker}`); }

must('ems/modules/heating-rod-control.js', '_buildHeatingRodTsRuntimeSample');
must('ems/modules/heating-rod-control.js', '_summarizeHeatingRodTsRuntimeSamples');
must('ems/modules/heating-rod-control.js', '_updateHeatingRodTsRuntimeEvaluation');
must('ems/modules/heating-rod-control.js', 'heatingRod.summary.tsRuntimeEvaluationJson');
must('main.js', 'heatingRodTsRuntimeEvaluationJson');
must('www/ems-apps.js', '_renderHeatingRodTsRuntimeEvaluationCard');
must('www/ems-apps.js', 'Heizstab TS‑Runtime-Auswertung');

console.log('[heating-rod-runtime-evaluation] OK: Heizstab-TS Runtime-Auswertung und Fallback-Diagnose sind vorhanden.');
