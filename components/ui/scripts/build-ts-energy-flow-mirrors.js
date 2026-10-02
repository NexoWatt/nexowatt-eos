#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/build-ts-energy-flow-mirrors.js
 *
 * Zweck:
 * Baut die TypeScript-Energiefluss-Helfer und den produktionsnahen Resolver als
 * CommonJS-Spiegel in `lib/ts-mirrors/energy-flow/**`.
 *
 * Zusammenhang:
 * - Quelle: `src-ts/utils/energy-flow.ts`, `src-ts/utils/number.ts`,
 *   `src-ts/resolvers/energy-flow-resolver.ts`
 * - Build-Ausgabe: `build-ts/energy-flow-mirrors/**`
 * - eingecheckter Spiegel: `lib/ts-mirrors/energy-flow/**`
 *
 * Wichtig:
 * Diese Spiegel werden in 0.7.69 noch nicht von der produktiven Adapter-Runtime
 * geladen. Sie sind die sichere Vorstufe für einen späteren Shadow-Vergleich:
 * alte JS-Energieflusslogik gegen neue TS-Resolverlogik, ohne die Anzeige zu ändern.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const checkOnly = process.argv.includes('--check');
const tsConfig = path.join(root, 'tsconfig.energy-flow-mirrors.json');
const localTsc = path.join(root, 'node_modules', 'typescript', 'lib', 'tsc.js');

const mirrorSpecs = [
  {
    sourceRel: 'src-ts/utils/number.ts',
    builtRel: 'build-ts/energy-flow-mirrors/utils/number.js',
    mirrorRel: 'lib/ts-mirrors/energy-flow/utils/number.js',
    purpose: 'Zahlenhelfer für Watt/Prozent/0-Werte',
  },
  {
    sourceRel: 'src-ts/utils/energy-flow.ts',
    builtRel: 'build-ts/energy-flow-mirrors/utils/energy-flow.js',
    mirrorRel: 'lib/ts-mirrors/energy-flow/utils/energy-flow.js',
    purpose: 'Energiefluss-Helfer für signed/split/Fallback',
  },
  {
    sourceRel: 'src-ts/resolvers/energy-flow-resolver.ts',
    builtRel: 'build-ts/energy-flow-mirrors/resolvers/energy-flow-resolver.js',
    mirrorRel: 'lib/ts-mirrors/energy-flow/resolvers/energy-flow-resolver.js',
    purpose: 'Produktionsnaher Energiefluss-Resolver für spätere Shadow-Vergleiche',
  },
];

/**
 * Code-Teil: fail
 * Zweck: Beendet Build/Check mit einer eindeutigen Fehlermeldung.
 */
function fail(message, code = 1) {
  console.error(`[build-ts-energy-flow-mirrors] ERROR: ${message}`);
  process.exit(code);
}

/**
 * Code-Teil: normalizeNewlines
 * Zweck: Macht Dateivergleiche unter Windows/Linux stabil.
 */
function normalizeNewlines(text) {
  return String(text || '').replace(/\r\n/g, '\n');
}

/**
 * Code-Teil: resolveTscCommand
 *
 * Zweck:
 * Findet den TypeScript-Compiler. Lokal wird bevorzugt `node_modules` genutzt;
 * falls nur ein globales `tsc` existiert, wird dieses verwendet.
 *
 * Zusammenhang:
 * `publish:check` ruft dieses Skript nicht direkt auf. Dadurch bleibt der schnelle
 * lokale Check weiterhin ohne vorheriges `npm install` möglich.
 */
function resolveTscCommand() {
  if (fs.existsSync(localTsc)) return { command: process.execPath, argsPrefix: [localTsc] };
  return { command: process.platform === 'win32' ? 'tsc.cmd' : 'tsc', argsPrefix: [] };
}

/**
 * Code-Teil: readRequired
 * Zweck: Liest Pflichtdateien und bricht bei fehlenden Dateien sofort ab.
 */
function readRequired(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) fail(`Pflichtdatei fehlt: ${rel}`);
  return normalizeNewlines(fs.readFileSync(file, 'utf8'));
}

/**
 * Code-Teil: sourceHash
 *
 * Zweck:
 * Berechnet den Hash der TypeScript-Quelle. Der Hash landet im JS-Spiegel und
 * ermöglicht spätere Synchronitätsprüfungen ohne TypeScript-Compiler.
 */
function sourceHash(sourceRel) {
  return crypto.createHash('sha256').update(readRequired(sourceRel)).digest('hex');
}

/**
 * Code-Teil: runTypescriptCompiler
 *
 * Zweck:
 * Kompiliert ausschließlich die Energiefluss-Spiegelquellen. Es wird bewusst nicht
 * das gesamte Projekt gebaut und keine produktive Runtime-Datei überschrieben.
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
    fail('TypeScript-Build für Energiefluss-Spiegel fehlgeschlagen. Falls tsc fehlt: npm install oder npm ci ausführen.', result.status || 1);
  }
}

/**
 * Code-Teil: generatedHeader
 *
 * Zweck:
 * Erzeugt den Kopf der generierten Spiegeldatei. Der Kommentar verhindert, dass
 * die generierte Datei später versehentlich manuell gepflegt wird.
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
    ' * Erzeugung: npm run sync:ts-energy-flow-mirrors',
    ' *',
    ' * Zweck:',
    ` * ${spec.purpose}.`,
    ' *',
    ' * Zusammenhang:',
    ' * Dieser Spiegel ist die spätere Brücke für Shadow-Vergleiche zwischen alter',
    ' * JavaScript-Runtime und neuer TypeScript-Energieflusslogik. In 0.7.69 wird',
    ' * er noch nicht produktiv von main.js/www/app.js genutzt.',
    ' *',
    ' * Pflege-Regel:',
    ' * 1. Änderung zuerst in der TypeScript-Quelle unter src-ts/ vornehmen.',
    ' * 2. npm run sync:ts-energy-flow-mirrors ausführen.',
    ' * 3. npm run test:energy-flow-mirrors prüfen.',
    ' */',
    '',
  ].join('\n');
}

/**
 * Code-Teil: rewriteRelativeRequires
 *
 * Zweck:
 * Der TypeScript-Build erzeugt relative Requires passend zu `src-ts/**`.
 * Unser Spiegel liegt aber unter `lib/ts-mirrors/energy-flow/**`. Diese Funktion
 * passt nur die wenigen bekannten internen Pfade an, ohne Fachlogik zu verändern.
 */
function rewriteRelativeRequires(spec, text) {
  if (spec.mirrorRel.endsWith('utils/energy-flow.js')) {
    return text.replace(/require\("\.\/number"\)/g, 'require("./number")');
  }
  if (spec.mirrorRel.endsWith('resolvers/energy-flow-resolver.js')) {
    return text
      .replace(/require\("\.\.\/utils\/energy-flow"\)/g, 'require("../utils/energy-flow")')
      .replace(/require\("\.\.\/utils\/number"\)/g, 'require("../utils/number")');
  }
  return text;
}

/**
 * Code-Teil: normalizeBuiltOutput
 *
 * Zweck:
 * Entfernt Compiler-Strict-Header, setzt unseren Generator-Kopf und passt bekannte
 * relative Requires an die Mirror-Ordnerstruktur an.
 */
function normalizeBuiltOutput(spec) {
  let text = readRequired(spec.builtRel);
  text = text.replace(/^"use strict";\s*/g, '').replace(/^'use strict';\s*/g, '');
  text = rewriteRelativeRequires(spec, text);
  return generatedHeader(spec) + text.replace(/\s+$/g, '') + '\n';
}

/**
 * Code-Teil: buildAllMirrorTexts
 * Zweck: Kompiliert TypeScript und baut die erwarteten JS-Spiegeltexte.
 */
function buildAllMirrorTexts() {
  runTypescriptCompiler();
  return mirrorSpecs.map((spec) => ({ spec, text: normalizeBuiltOutput(spec) }));
}

/**
 * Code-Teil: checkMirrorIsCurrent
 * Zweck: Prüft, ob der eingecheckte Spiegel exakt zum aktuellen TS-Build passt.
 */
function checkMirrorIsCurrent(spec, nextText) {
  const mirrorPath = path.join(root, spec.mirrorRel);
  const current = fs.existsSync(mirrorPath) ? normalizeNewlines(fs.readFileSync(mirrorPath, 'utf8')) : '';
  if (current !== nextText) {
    fail(`${spec.mirrorRel} ist nicht synchron. Bitte npm run sync:ts-energy-flow-mirrors ausführen und committen.`);
  }
}

/**
 * Code-Teil: writeRuntimeMirror
 * Zweck: Schreibt die generierte JS-Spiegeldatei in den eingecheckten Mirror-Bereich.
 */
function writeRuntimeMirror(spec, nextText) {
  const mirrorPath = path.join(root, spec.mirrorRel);
  fs.mkdirSync(path.dirname(mirrorPath), { recursive: true });
  fs.writeFileSync(mirrorPath, nextText, 'utf8');
  console.log(`[build-ts-energy-flow-mirrors] wrote ${spec.mirrorRel}`);
}

const mirrors = buildAllMirrorTexts();
if (checkOnly) {
  for (const { spec, text } of mirrors) checkMirrorIsCurrent(spec, text);
  console.log('[build-ts-energy-flow-mirrors] OK: Energiefluss-CJS-Spiegel sind synchron.');
} else {
  for (const { spec, text } of mirrors) writeRuntimeMirror(spec, text);
}
