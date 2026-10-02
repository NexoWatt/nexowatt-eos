#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-heating-rod-legacy-removal-plan.js
 *
 * Zweck:
 * Prüft 0.7.115: Der alte Heizstab-JS-Referenzpfad wird als konkreter
 * Entfernungs-/Cleanup-Plan vorbereitet. TS bleibt Normalpfad; JS bleibt nur
 * Notfallback/Debug-Brücke.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function fail(msg) { console.error('[heating-rod-legacy-removal-plan] ERROR: ' + msg); process.exit(1); }
function must(file, marker, label) { if (!read(file).includes(marker)) fail(`${file}: fehlt ${label || marker}`); }

must('ems/modules/heating-rod-control.js', '_buildHeatingRodTsLegacyRemovalPlanState', 'Legacy-Removal-Plan Builder');
must('ems/modules/heating-rod-control.js', 'heatingRod.summary.tsLegacyRemovalPlanJson', 'Legacy-Removal-Plan State');
must('ems/modules/heating-rod-control.js', 'legacy-js-reference-removal-prepared', 'Removal prepared Status');
must('ems/modules/heating-rod-control.js', 'removableParts', 'removableParts Diagnose');
must('ems/modules/heating-rod-control.js', 'keepParts', 'keepParts Notfallback');
must('ems/modules/heating-rod-control.js', 'hard-safety-fallback', 'harter Notfallback bleibt erhalten');
must('ems/modules/heating-rod-control.js', 'legacyRemovalPlan', 'Removal-Plan wird an Diagnoseobjekte gehängt');
must('www/ems-apps.js', 'JS-Entfernung', 'App-Center zeigt JS-Entfernung');
console.log('[heating-rod-legacy-removal-plan] OK: Alter JS-Heizstabpfad ist als Cleanup-/Removal-Plan vorbereitet.');
