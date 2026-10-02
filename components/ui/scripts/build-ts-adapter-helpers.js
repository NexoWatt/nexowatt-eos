#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/build-ts-adapter-helpers.js
 *
 * Zweck:
 * Baut die ersten echten TypeScript-Helfer für `main.js` als CommonJS-Spiegel.
 *
 * Zusammenhang:
 * - Quelle: `src-ts/adapter/**`
 * - Build-Ausgabe: `build-ts/adapter-helpers/adapter/**`
 * - Runtime-Spiegel: `lib/ts-mirrors/adapter/**`
 *
 * Wichtig:
 * Diese Helfer sind bewusst klein und risikoarm. Sie werden in `main.js` nur
 * mit Fallback geladen, damit der Adapter nie wegen eines fehlenden TS-Spiegels
 * ausfällt.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const checkOnly = process.argv.includes('--check');
const tsConfig = path.join(root, 'tsconfig.adapter-helpers.json');
const localTsc = path.join(root, 'node_modules', 'typescript', 'lib', 'tsc.js');

const mirrorSpecs = [
  { sourceRel: 'src-ts/adapter/connection-state.ts', builtRel: 'build-ts/adapter-helpers/adapter/connection-state.js', mirrorRel: 'lib/ts-mirrors/adapter/connection-state.js', publicName: 'connection-state' },
  { sourceRel: 'src-ts/adapter/settings-writes.ts', builtRel: 'build-ts/adapter-helpers/adapter/settings-writes.js', mirrorRel: 'lib/ts-mirrors/adapter/settings-writes.js', publicName: 'settings-writes' },
  { sourceRel: 'src-ts/adapter/state-cache.ts', builtRel: 'build-ts/adapter-helpers/adapter/state-cache.js', mirrorRel: 'lib/ts-mirrors/adapter/state-cache.js', publicName: 'state-cache' },
  { sourceRel: 'src-ts/adapter/api-set.ts', builtRel: 'build-ts/adapter-helpers/adapter/api-set.js', mirrorRel: 'lib/ts-mirrors/adapter/api-set.js', publicName: 'api-set' },
  { sourceRel: 'src-ts/adapter/api-state.ts', builtRel: 'build-ts/adapter-helpers/adapter/api-state.js', mirrorRel: 'lib/ts-mirrors/adapter/api-state.js', publicName: 'api-state' },
  { sourceRel: 'src-ts/adapter/index.ts', builtRel: 'build-ts/adapter-helpers/adapter/index.js', mirrorRel: 'lib/ts-mirrors/adapter/index.js', publicName: 'index' },
];

/** Code-Teil: fail. Zweck: Bricht Build/Check mit klarer Meldung ab. */
function fail(message, code = 1) {
  console.error(`[build-ts-adapter-helpers] ERROR: ${message}`);
  process.exit(code);
}

/**
 * Code-Teil: resolveTscCommand
 * Zweck: Nutzt bevorzugt die lokale TypeScript-Version und fällt nur in Werkzeugumgebungen auf globales `tsc` zurück.
 */
function resolveTscCommand() {
  if (fs.existsSync(localTsc)) return { command: process.execPath, argsPrefix: [localTsc] };
  return { command: process.platform === 'win32' ? 'tsc.cmd' : 'tsc', argsPrefix: [] };
}

/** Code-Teil: normalizeNewlines. Zweck: Stabiler Vergleich unter Windows/Linux. */
function normalizeNewlines(text) {
  return String(text || '').replace(/\r\n/g, '\n');
}

/** Code-Teil: readRequired. Zweck: Liest Pflichtdateien mit sprechender Fehlermeldung. */
function readRequired(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) fail(`Pflichtdatei fehlt: ${rel}`);
  return normalizeNewlines(fs.readFileSync(file, 'utf8'));
}

/** Code-Teil: sourceHash. Zweck: Hash der TS-Quelle für späteren Synchronitätscheck. */
function sourceHash(sourceRel) {
  return crypto.createHash('sha256').update(readRequired(sourceRel)).digest('hex');
}

/**
 * Code-Teil: runTypescriptCompiler
 * Zweck: Kompiliert nur die adapter-nahen Helfer, nicht das gesamte Projekt.
 */
function runTypescriptCompiler() {
  if (!fs.existsSync(tsConfig)) fail(`tsconfig fehlt: ${path.relative(root, tsConfig)}`);
  const tsc = resolveTscCommand();
  const result = spawnSync(tsc.command, [...tsc.argsPrefix, '-p', tsConfig], {
    cwd: root,
    stdio: 'inherit',
    shell: false,
  });
  if (result.status !== 0) {
    fail('TypeScript-Build für Adapter-Helfer fehlgeschlagen. Falls tsc fehlt: npm install oder npm ci ausführen.', result.status || 1);
  }
}

/**
 * Code-Teil: generatedHeader
 * Zweck: Kennzeichnet Runtime-Spiegel als generiert und verweist auf die TS-Quelle.
 */
function generatedHeader(spec) {
  return [
    "'use strict';",
    '',
    '/**',
    ' * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.',
    ' *',
    ` * Quelle: ${spec.sourceRel}`,
    ` * Quell-Hash: sha256:${sourceHash(spec.sourceRel)}`,
    ' * Erzeugung: npm run sync:ts-adapter-helpers',
    ' *',
    ' * Zweck:',
    ' * Diese Datei ist der CommonJS-Spiegel eines adapter-nahen TypeScript-Helfers.',
    ' * main.js darf diese Datei nur mit Fallback laden, damit die produktive Runtime',
    ' * nicht von einem Migrationsartefakt abhängig wird.',
    ' */',
    '',
  ].join('\n');
}

/** Code-Teil: normalizeBuiltOutput. Zweck: Setzt Generator-Kopf vor kompilierten JS-Code. */
function normalizeBuiltOutput(spec) {
  const text = readRequired(spec.builtRel);
  const withoutStrict = text.replace(/^"use strict";\s*/g, '').replace(/^'use strict';\s*/g, '');
  return generatedHeader(spec) + withoutStrict.replace(/\s+$/g, '') + '\n';
}

/** Code-Teil: buildAllMirrorTexts. Zweck: Erzeugt erwartete Runtime-Spiegeltexte. */
function buildAllMirrorTexts() {
  runTypescriptCompiler();
  return mirrorSpecs.map((spec) => ({ spec, text: normalizeBuiltOutput(spec) }));
}

/** Code-Teil: checkMirrorIsCurrent. Zweck: Verhindert veraltete eingecheckte Spiegel. */
function checkMirrorIsCurrent(spec, nextText) {
  const mirrorPath = path.join(root, spec.mirrorRel);
  const current = fs.existsSync(mirrorPath) ? normalizeNewlines(fs.readFileSync(mirrorPath, 'utf8')) : '';
  if (current !== nextText) {
    fail(`${spec.mirrorRel} ist nicht synchron. Bitte npm run sync:ts-adapter-helpers ausführen und committen.`);
  }
}

/** Code-Teil: writeRuntimeMirror. Zweck: Schreibt einen Adapter-Helfer-Spiegel. */
function writeRuntimeMirror(spec, nextText) {
  const mirrorPath = path.join(root, spec.mirrorRel);
  fs.mkdirSync(path.dirname(mirrorPath), { recursive: true });
  fs.writeFileSync(mirrorPath, nextText, 'utf8');
  console.log(`[build-ts-adapter-helpers] wrote ${spec.mirrorRel}`);
}

const mirrors = buildAllMirrorTexts();
if (checkOnly) {
  for (const { spec, text } of mirrors) checkMirrorIsCurrent(spec, text);
  console.log('[build-ts-adapter-helpers] OK: Adapter-Helfer-Spiegel sind synchron.');
} else {
  for (const { spec, text } of mirrors) writeRuntimeMirror(spec, text);
}
