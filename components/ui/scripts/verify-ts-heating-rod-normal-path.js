#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-heating-rod-normal-path.js
 *
 * Zweck:
 * Prüft 0.7.110: Der Heizstab-TS-Pfad wird nach stabiler Runtime-Auswertung als
 * Normalpfad vorbereitet. JavaScript bleibt weiterhin Notfallback bei harten Blockern.
 */

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function fail(msg) { console.error('[ts-heating-rod-normal-path] ERROR: ' + msg); process.exit(1); }
function must(file, marker) { if (!read(file).includes(marker)) fail(file + ' fehlt Marker: ' + marker); }

must('ems/modules/heating-rod-control.js', '_updateHeatingRodTsNormalSourceState');
must('ems/modules/heating-rod-control.js', 'heatingRod.summary.tsNormalSourceJson');
must('ems/modules/heating-rod-control.js', 'ts-heating-rod-normal');
must('ems/modules/heating-rod-control.js', 'JavaScript bleibt nur Notfallback');
must('main.js', 'heatingRodTsNormalSourceJson');
must('www/ems-apps.js', 'TS-Normalpfad');
must('www/ems-apps.js', 'TS-Normal Ticks');

console.log('[ts-heating-rod-normal-path] OK: Heizstab-TS-Normalpfad ist vorbereitet und diagnostisch sichtbar.');
