#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/build-ts-shadow-bridges.js
 *
 * Zweck:
 * Baut die ersten TypeScript-Shadow-Bridges als CommonJS-Spiegeldateien.
 *
 * Zusammenhang:
 * Shadow-Bridges sind die Vorstufe zur produktiven Migration: Die alte JavaScript-
 * Runtime bleibt aktiv, während die TypeScript-Logik parallel dasselbe Ergebnis berechnet
 * und Abweichungen diagnostiziert. In 0.7.73 wird noch keine produktive Runtime geändert.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const checkOnly = process.argv.includes('--check');
const tsConfig = path.join(root, 'tsconfig.shadow-bridges.json');
const localTsc = path.join(root, 'node_modules', 'typescript', 'lib', 'tsc.js');

const mirrorSpecs = [
  {
    sourceRel: 'src-ts/bridges/feature-visibility-shadow.ts',
    builtRel: 'build-ts/shadow-bridges/bridges/feature-visibility-shadow.js',
    mirrorRel: 'lib/ts-mirrors/bridges/feature-visibility-shadow.js',
  },
];

/** Code-Teil: fail — bricht Build/Check mit klarer Fehlermeldung ab. */
function fail(message, code = 1) {
  console.error(`[build-ts-shadow-bridges] ERROR: ${message}`);
  process.exit(code);
}

/**
 * Code-Teil: resolveTscCommand
 *
 * Zweck:
 * Nutzt bevorzugt die lokale TypeScript-Version aus `node_modules`. Wenn lokal noch kein
 * `npm install` gelaufen ist, darf für diese Entwicklungsprüfung ein globales `tsc`
 * verwendet werden.
 */
function resolveTscCommand() {
  if (fs.existsSync(localTsc)) return { command: process.execPath, argsPrefix: [localTsc] };
  return { command: process.platform === 'win32' ? 'tsc.cmd' : 'tsc', argsPrefix: [] };
}

/** Code-Teil: normalizeNewlines — macht Vergleiche unter Windows/Linux stabil. */
function normalizeNewlines(text) {
  return String(text || '').replace(/\r\n/g, '\n');
}

/** Code-Teil: readRequired — liest Pflichtdateien und meldet fehlende Dateien sofort. */
function readRequired(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) fail(`Pflichtdatei fehlt: ${rel}`);
  return normalizeNewlines(fs.readFileSync(file, 'utf8'));
}

/** Code-Teil: sourceHash — berechnet den Hash der TypeScript-Quelle für Synchronitätschecks. */
function sourceHash(sourceRel) {
  return crypto.createHash('sha256').update(readRequired(sourceRel)).digest('hex');
}

/**
 * Code-Teil: runTypescriptCompiler
 *
 * Zweck:
 * Kompiliert ausschließlich die Shadow-Bridge. Es wird bewusst nicht das ganze Projekt
 * produktiv gebaut, damit keine Laufzeitdateien versehentlich überschrieben werden.
 */
function runTypescriptCompiler() {
  if (!fs.existsSync(tsConfig)) fail(`tsconfig fehlt: ${path.relative(root, tsConfig)}`);
  const tsc = resolveTscCommand();
  const result = spawnSync(tsc.command, [...tsc.argsPrefix, '-p', tsConfig], {
    cwd: root,
    stdio: 'inherit',
    shell: false,
  });
  if (result.status !== 0) fail('TypeScript-Build für Shadow-Bridges fehlgeschlagen.', result.status || 1);
}

/** Code-Teil: generatedHeader — schreibt klar in den JS-Spiegel, dass die TS-Datei Quelle ist. */
function generatedHeader(spec) {
  return [
    "'use strict';",
    '',
    '/**',
    ' * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.',
    ' *',
    ` * Quelle: ${spec.sourceRel}`,
    ` * Quell-Hash: sha256:${sourceHash(spec.sourceRel)}`,
    ' * Erzeugung: npm run sync:ts-shadow-bridges',
    ' *',
    ' * Zweck:',
    ' * CommonJS-Spiegel der TypeScript-Shadow-Bridge. Diese Datei ist vorbereitet,',
    ' * wird aber in 0.7.73 noch nicht produktiv von main.js/www/app.js genutzt.',
    ' */',
    '',
  ].join('\n');
}

/** Code-Teil: normalizeBuiltOutput — entfernt doppelte Strict-Header und setzt unseren Generator-Kopf. */
function normalizeBuiltOutput(spec) {
  const built = readRequired(spec.builtRel);
  const withoutStrict = built.replace(/^"use strict";\s*/g, '').replace(/^'use strict';\s*/g, '');
  return generatedHeader(spec) + withoutStrict.replace(/\s+$/g, '') + '\n';
}

/** Code-Teil: checkMirrorIsCurrent — verhindert auseinanderlaufende TS-Quelle und JS-Spiegel. */
function checkMirrorIsCurrent(spec, nextText) {
  const file = path.join(root, spec.mirrorRel);
  const current = fs.existsSync(file) ? normalizeNewlines(fs.readFileSync(file, 'utf8')) : '';
  if (current !== nextText) fail(`${spec.mirrorRel} ist nicht synchron. Bitte npm run sync:ts-shadow-bridges ausführen.`);
}

/** Code-Teil: writeMirror — schreibt den eingecheckten Shadow-Bridge-Spiegel. */
function writeMirror(spec, text) {
  const file = path.join(root, spec.mirrorRel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, 'utf8');
  console.log(`[build-ts-shadow-bridges] wrote ${spec.mirrorRel}`);
}

runTypescriptCompiler();
const mirrors = mirrorSpecs.map((spec) => ({ spec, text: normalizeBuiltOutput(spec) }));
if (checkOnly) {
  for (const { spec, text } of mirrors) checkMirrorIsCurrent(spec, text);
  console.log('[build-ts-shadow-bridges] OK: Shadow-Bridge-Spiegel sind synchron.');
} else {
  for (const { spec, text } of mirrors) writeMirror(spec, text);
}
