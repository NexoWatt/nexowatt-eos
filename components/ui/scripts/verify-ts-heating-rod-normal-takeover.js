#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-heating-rod-normal-takeover.js
 *
 * Zweck:
 * Prüft 0.7.111: Der Heizstab-TS-Normalpfad darf nach stabiler Phase die alte
 * JS-Referenz als Normalquelle übernehmen. JS bleibt nur bei harten Sicherheitsblockern
 * als Notfallback aktiv.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function fail(msg) { console.error('[heating-rod-normal-takeover] ERROR: ' + msg); process.exit(1); }
function must(text, marker, label) { if (!text.includes(marker)) fail(`${label} fehlt: ${marker}`); }
const js = read('ems/modules/heating-rod-control.js');
const tsMirror = read('src-ts/runtime-mirrors/ems/modules/heating-rod-control.ts');

// Produktive Runtime muss die 0.7.111-Normalpfad-Übernahme wirklich enthalten.
for (const [marker, label] of [
  ['_isHeatingRodTsNormalPathReady', 'Normalpfad-Bereitschaft'],
  ['_isHeatingRodTsHardSafetyBlock', 'harte Sicherheitsblocker'],
  ["source: normalPathReady ? 'ts-heating-rod-normal'", 'TS-Normalquelle wird übernommen'],
  ['jsReferenceReduced', 'JS-Referenzabbau wird dokumentiert'],
  ['normalPathTakenOver', 'Übernahmestatus wird gespeichert'],
  ['hard-blockers-only', 'JS-Fallback nur noch harte Blocker'],
]) must(js, marker, 'runtime: ' + label);

// Der TS-Spiegel bleibt ein manuell typisierter Migrationsspiegel. Die produktive Logik
// liegt weiterhin in ems/modules/heating-rod-control.js; wichtig ist, dass der Spiegel
// nicht durch einen rohen Sync überschrieben wurde.
must(tsMirror, 'Heating-Rod Runtime-Migrationshinweis (DE)', 'runtime mirror: Migrationskommentar');
must(tsMirror, 'type HeatingRodAdapterLike', 'runtime mirror: Adapter-Vertrag');
must(tsMirror, 'class HeatingRodControlModule extends BaseModule', 'runtime mirror: Klassenanker');

if (js.includes("label: 'Heizstab',\n                    label: 'Heizstab',")) fail('runtime: doppeltes Label in Budgetreservierung gefunden.');
console.log('[heating-rod-normal-takeover] OK: Heizstab-TS-Normalpfad übernimmt, JS bleibt Notfallback.');
