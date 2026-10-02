#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-runtime-mirrors.js
 *
 * Zweck:
 * Prüft die großen JS→TS-Parallelspiegel unter `src-ts/runtime-mirrors/`.
 *
 * Zusammenhang:
 * Diese Prüfung verhindert, dass wir beim großen TypeScript-Umbau wieder unsynchronisierte
 * Zwischenstände erzeugen. Sie ist bewusst ohne TypeScript-Compiler lauffähig, damit
 * `npm run publish:check` auch ohne `node_modules/.bin/tsc` funktioniert.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const MIRROR_ROOT = path.join(ROOT, 'src-ts', 'runtime-mirrors');
let failed = false;

function fail(message) {
  console.error('[ts-runtime-mirrors] ERROR: ' + message);
  failed = true;
}

function sha256(text) {
  return crypto.createHash('sha256').update(String(text || ''), 'utf8').digest('hex');
}

function toPosix(p) {
  return String(p || '').replace(/\\/g, '/');
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, out);
    else if (entry.isFile()) out.push(abs);
  }
  return out;
}

/**
 * Code-Teil: sourceRelFromMirror
 *
 * Zweck:
 * Ermittelt aus dem TS-Spiegel den ursprünglichen JS-Pfad. Dieser Pfad steht im Header
 * und bildet den Vertrag zwischen produktiver JS-Datei und TS-Parallelkopie.
 */
function sourceRelFromMirror(text) {
  const m = String(text || '').match(/TypeScript-Parallelspiegel:\s+([^\n]+)/);
  return m ? m[1].trim() : '';
}

/**
 * Code-Teil: originalHashFromMirror
 *
 * Zweck:
 * Liest den gespeicherten Original-Hash aus dem TS-Spiegel. Damit erkennen wir, ob der
 * Spiegel zum aktuellen JS-Stand passt.
 */
function originalHashFromMirror(text) {
  const m = String(text || '').match(/Original-Hash:\s+([a-f0-9]{64})/i);
  return m ? m[1].toLowerCase() : '';
}

/**
 * Code-Teil: checkMirror
 *
 * Zweck:
 * Prüft eine einzelne Spiegeldatei auf Header, deutsche Kommentaranker und Hash-Sync.
 */
function checkMirror(file) {
  const text = fs.readFileSync(file, 'utf8');
  const rel = toPosix(path.relative(ROOT, file));
  if (!text.startsWith('// @ts-nocheck')) fail(`${rel}: @ts-nocheck fehlt als temporärer Migrationsanker.`);
  if (!text.includes('TypeScript-Parallelspiegel')) fail(`${rel}: Header fehlt.`);
  if (!text.includes('Code-Teil:')) fail(`${rel}: Es fehlen konkrete Code-Teil-Kommentare.`);
  const sourceRel = sourceRelFromMirror(text);
  if (!sourceRel) {
    fail(`${rel}: Original-JS-Pfad fehlt.`);
    return;
  }
  const sourceAbs = path.join(ROOT, sourceRel);
  if (!fs.existsSync(sourceAbs)) {
    fail(`${rel}: Original-JS-Datei fehlt: ${sourceRel}`);
    return;
  }
  const expected = sha256(fs.readFileSync(sourceAbs, 'utf8'));
  const actual = originalHashFromMirror(text);
  if (actual !== expected) fail(`${rel}: Hash passt nicht zur JS-Quelle ${sourceRel}. Bitte sync:ts-runtime-mirrors ausführen.`);
}

/**
 * Code-Teil: main
 *
 * Zweck:
 * Führt die Gesamtprüfung für die Runtime-Spiegel aus. Schlüsseldateien wie `main.js`,
 * `www/app.js` und `ems/modules/core-limits.js` müssen gespiegelt sein, weil sie später
 * zu den wichtigsten TS-Migrationskandidaten gehören.
 */
function main() {
  if (!fs.existsSync(MIRROR_ROOT)) fail('src-ts/runtime-mirrors fehlt.');
  const files = walk(MIRROR_ROOT).filter((f) => f.endsWith('.ts') || f.endsWith('.tsx')).sort();
  if (files.length < 100) fail(`Zu wenige Runtime-Spiegel gefunden: ${files.length}`);

  const required = [
    'src-ts/runtime-mirrors/main.ts',
    'src-ts/runtime-mirrors/www/app.ts',
    'src-ts/runtime-mirrors/www/ems-apps.ts',
    'src-ts/runtime-mirrors/ems/modules/core-limits.ts',
    'src-ts/runtime-mirrors/ems/modules/heating-rod-control.ts',
    'src-ts/runtime-mirrors/ems/modules/ai-advisor.ts',
  ];
  for (const rel of required) {
    if (!fs.existsSync(path.join(ROOT, rel))) fail(`Pflicht-Spiegel fehlt: ${rel}`);
  }

  for (const file of files) checkMirror(file);

  if (failed) process.exit(1);
  console.log(`[ts-runtime-mirrors] OK: ${files.length} Runtime-TS-/TSX-Parallelspiegel geprüft.`);
}

main();
