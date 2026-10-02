#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-heating-rod-emergency-fallback.js
 *
 * Zweck:
 * Prüft 0.7.112: Der alte Heizstab-JS-Pfad ist im stabilen TS-Normalpfad nur noch
 * Notfallback bei harten Sicherheitsblockern. Alte JS/TS-Referenzabweichungen bleiben
 * Diagnose und blockieren den TS-Normalpfad nicht mehr.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function fail(msg) { console.error('[heating-rod-emergency-fallback] ERROR: ' + msg); process.exit(1); }
function must(text, marker, label) { if (!text.includes(marker)) fail(`${label} fehlt: ${marker}`); }
const js = read('ems/modules/heating-rod-control.js');
const ui = read('www/ems-apps.js');
const mirror = read('src-ts/runtime-mirrors/ems/modules/heating-rod-control.ts');

for (const [marker, label] of [
  ['_isHeatingRodHardFallbackReason', 'harte Fallback-Klassifizierung'],
  ['_getHeatingRodTsFallbackPolicy', 'Fallback-Policy'],
  ['referenceMismatches', 'getrennte JS-Referenzmismatches'],
  ['legacyJsPathRole', 'Rolle des alten JS-Pfads'],
  ['emergency-fallback-only', 'JS nur noch Notfallback'],
  ['jsReferenceDecisionMode', 'JS-Referenz-Entscheidungsmodus'],
  ['diagnostic-only', 'JS-Referenz nur Diagnose'],
  ['previous.ready === true && !emergencyFallback', 'Normalpfad bleibt bereit ohne harten Fallback'],
  ['jsReferenceBlockingCount', 'blockierende JS-Referenzzählung'],
  ['jsFallbackLimitedToHardBlockers', 'Normalpfad begrenzt JS-Fallback auf harte Blocker'],
]) must(js, marker, 'runtime');

for (const [marker, label] of [
  ['JS-Fallback-Modus', 'UI zeigt JS-Fallback-Modus'],
  ['JS-Pfad Rolle', 'UI zeigt JS-Pfad-Rolle'],
  ['JS-Referenz', 'UI zeigt JS-Referenzmodus'],
]) must(ui, marker, 'ui');

must(mirror, 'Heating-Rod Runtime-Migrationshinweis (DE)', 'mirror: Migrationskommentar');
if (js.includes("if (mismatches.length && normalPathReady)")) {
  fail('JS/TS-Mismatch darf im TS-Normalpfad keinen eigenen Fallbackzweig mehr haben.');
}
console.log('[heating-rod-emergency-fallback] OK: Heizstab-JS-Pfad ist auf Notfallback begrenzt.');
