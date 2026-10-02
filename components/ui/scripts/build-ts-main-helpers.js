#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/build-ts-main-helpers.js
 *
 * Zweck:
 * Baut die ersten echten TypeScript-Helfer für spätere main.js-Auslagerungen als
 * CommonJS-Spiegel unter `lib/ts-mirrors/main/`.
 *
 * Zusammenhang:
 * - Quelle: `src-ts/main/*.ts`
 * - temporärer TypeScript-Build: `build-ts/main-helpers/main/*.js`
 * - eingecheckter Runtime-Spiegel: `lib/ts-mirrors/main/*.js`
 *
 * Wichtig:
 * main.js nutzt diese Helfer in 0.7.98 noch nicht produktiv. Der Schritt stellt nur
 * sicher, dass die Helfer real kompilierbar und später kontrolliert importierbar sind.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const checkOnly = process.argv.includes('--check');
const tsConfig = path.join(root, 'tsconfig.main-helpers.json');
const localTsc = path.join(root, 'node_modules', 'typescript', 'lib', 'tsc.js');

const mirrorSpecs = [
  'state-cache',
  'api-state',
  'api-set',
  'api-shadow',
  'info-connection',
  'license-key',
  'index',
].map((name) => ({
  name,
  sourceRel: `src-ts/main/${name}.ts`,
  builtRel: `build-ts/main-helpers/main/${name}.js`,
  mirrorRel: `lib/ts-mirrors/main/${name}.js`,
}));

/** Code-Teil: fail. Zweck: Beendet Build/Check mit einer klaren CI-fähigen Fehlermeldung. */
function fail(message, code = 1) {
  console.error(`[build-ts-main-helpers] ERROR: ${message}`);
  process.exit(code);
}

/**
 * Code-Teil: resolveTscCommand
 *
 * Zweck:
 * Nutzt bevorzugt den lokalen TypeScript-Compiler aus `node_modules`. Wenn die Umgebung
 * nur einen globalen `tsc` bereitstellt, wird dieser für reine Build-/Testläufe verwendet.
 */
function resolveTscCommand() {
  if (fs.existsSync(localTsc)) return { command: process.execPath, argsPrefix: [localTsc] };
  return { command: process.platform === 'win32' ? 'tsc.cmd' : 'tsc', argsPrefix: [] };
}

/** Code-Teil: normalizeNewlines. Zweck: Macht Datei-Vergleiche zwischen Windows/Linux stabil. */
function normalizeNewlines(text) {
  return String(text || '').replace(/\r\n/g, '\n');
}

/** Code-Teil: readRequired. Zweck: Liest eine Pflichtdatei oder bricht verständlich ab. */
function readRequired(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) fail(`Pflichtdatei fehlt: ${rel}`);
  return normalizeNewlines(fs.readFileSync(file, 'utf8'));
}

/**
 * Code-Teil: sourceHash
 *
 * Zweck:
 * Berechnet den Hash der TypeScript-Quelle. Der Hash wird in den JS-Spiegel geschrieben,
 * damit wir später ohne TypeScript-Compiler erkennen, ob ein Spiegel veraltet ist.
 */
function sourceHash(sourceRel) {
  return crypto.createHash('sha256').update(readRequired(sourceRel)).digest('hex');
}

/**
 * Code-Teil: runTypescriptCompiler
 *
 * Zweck:
 * Kompiliert nur die Main-Helfer. Dadurch werden keine produktiven JS-Dateien erzeugt
 * oder überschrieben.
 */
function runTypescriptCompiler() {
  if (!fs.existsSync(tsConfig)) fail('tsconfig.main-helpers.json fehlt.');
  const tsc = resolveTscCommand();
  const result = spawnSync(tsc.command, [...tsc.argsPrefix, '-p', tsConfig], {
    cwd: root,
    stdio: 'inherit',
    shell: false,
  });
  if (result.status !== 0) fail('TypeScript-Build für Main-Helfer fehlgeschlagen. Falls tsc fehlt: npm install oder npm ci ausführen.', result.status || 1);
}

/**
 * Code-Teil: generatedHeader
 *
 * Zweck:
 * Kennzeichnet JS-Spiegel eindeutig als generierte Dateien. Änderungen müssen zuerst in
 * `src-ts/main/*.ts` erfolgen.
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
    ' * Erzeugung: npm run sync:ts-main-helpers',
    ' *',
    ' * Zweck:',
    ' * Diese Datei ist ein CommonJS-Spiegel eines echten TypeScript-Helfers für main.js.',
    ' * main.js nutzt diese Helfer in 0.7.98 noch nicht produktiv; sie bilden die sichere',
    ' * Grundlage für die spätere schrittweise Auslagerung.',
    ' */',
    '',
  ].join('\n');
}

/** Code-Teil: normalizeBuiltOutput. Zweck: Kombiniert Generator-Kopf und TypeScript-Build-Ausgabe. */
function normalizeBuiltOutput(spec) {
  const built = readRequired(spec.builtRel);
  const withoutStrict = built.replace(/^"use strict";\s*/g, '').replace(/^'use strict';\s*/g, '');
  return generatedHeader(spec) + withoutStrict.replace(/\s+$/g, '') + '\n';
}

/** Code-Teil: buildMirrorTexts. Zweck: Baut alle erwarteten Spiegeltexte. */
function buildMirrorTexts() {
  runTypescriptCompiler();
  return mirrorSpecs.map((spec) => ({ spec, text: normalizeBuiltOutput(spec) }));
}

/** Code-Teil: checkMirrorIsCurrent. Zweck: Verhindert veraltete eingecheckte JS-Spiegel. */
function checkMirrorIsCurrent(spec, nextText) {
  const mirrorPath = path.join(root, spec.mirrorRel);
  const current = fs.existsSync(mirrorPath) ? normalizeNewlines(fs.readFileSync(mirrorPath, 'utf8')) : '';
  if (current !== nextText) fail(`${spec.mirrorRel} ist nicht synchron. Bitte npm run sync:ts-main-helpers ausführen und committen.`);
}

/** Code-Teil: writeMirror. Zweck: Schreibt den CommonJS-Spiegel in den eingecheckten Mirror-Ordner. */
function writeMirror(spec, text) {
  const mirrorPath = path.join(root, spec.mirrorRel);
  fs.mkdirSync(path.dirname(mirrorPath), { recursive: true });
  fs.writeFileSync(mirrorPath, text, 'utf8');
  console.log(`[build-ts-main-helpers] wrote ${spec.mirrorRel}`);
}

const mirrors = buildMirrorTexts();
if (checkOnly) {
  for (const { spec, text } of mirrors) checkMirrorIsCurrent(spec, text);
  console.log('[build-ts-main-helpers] OK: Main-Helfer-Spiegel sind synchron.');
} else {
  for (const { spec, text } of mirrors) writeMirror(spec, text);
}
