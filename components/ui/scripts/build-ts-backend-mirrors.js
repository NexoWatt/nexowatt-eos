#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/build-ts-backend-mirrors.js
 *
 * Zweck:
 * Baut erste backendnahe TypeScript-Helfer als CommonJS-Spiegeldateien.
 *
 * Zusammenhang:
 * - Quelle: `src-ts/backend/**`
 * - Build-Ausgabe: `build-ts/backend-mirrors/backend/**`
 * - eingecheckter Runtime-Spiegel: `lib/ts-mirrors/backend/**`
 *
 * Wichtig:
 * Diese Spiegel werden in 0.7.68 noch nicht produktiv von `main.js` geladen.
 * Sie bereiten nur den späteren kontrollierten Umbau von StateCache-, Lizenz-
 * und Feature-Sichtbarkeits-Helfern vor.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const checkOnly = process.argv.includes('--check');
const tsConfig = path.join(root, 'tsconfig.backend-mirrors.json');
const localTsc = path.join(root, 'node_modules', 'typescript', 'lib', 'tsc.js');

const mirrorSpecs = [
  {
    sourceRel: 'src-ts/backend/state-cache/state-cache.ts',
    builtRel: 'build-ts/backend-mirrors/backend/state-cache/state-cache.js',
    mirrorRel: 'lib/ts-mirrors/backend/state-cache/state-cache.js',
    publicName: 'state-cache',
  },
  {
    sourceRel: 'src-ts/backend/feature-visibility/feature-visibility.ts',
    builtRel: 'build-ts/backend-mirrors/backend/feature-visibility/feature-visibility.js',
    mirrorRel: 'lib/ts-mirrors/backend/feature-visibility/feature-visibility.js',
    publicName: 'feature-visibility',
  },
  {
    sourceRel: 'src-ts/backend/license/license-key-safety.ts',
    builtRel: 'build-ts/backend-mirrors/backend/license/license-key-safety.js',
    mirrorRel: 'lib/ts-mirrors/backend/license/license-key-safety.js',
    publicName: 'license-key-safety',
  },
  {
    sourceRel: 'src-ts/backend/main-helpers/state-cache-main.ts',
    builtRel: 'build-ts/backend-mirrors/backend/main-helpers/state-cache-main.js',
    mirrorRel: 'lib/ts-mirrors/backend/main-helpers/state-cache-main.js',
    publicName: 'main-state-cache',
  },
  {
    sourceRel: 'src-ts/backend/main-helpers/api-state-main.ts',
    builtRel: 'build-ts/backend-mirrors/backend/main-helpers/api-state-main.js',
    mirrorRel: 'lib/ts-mirrors/backend/main-helpers/api-state-main.js',
    publicName: 'main-api-state',
  },
  {
    sourceRel: 'src-ts/backend/main-helpers/settings-write-main.ts',
    builtRel: 'build-ts/backend-mirrors/backend/main-helpers/settings-write-main.js',
    mirrorRel: 'lib/ts-mirrors/backend/main-helpers/settings-write-main.js',
    publicName: 'main-settings-write',
  },
  {
    sourceRel: 'src-ts/backend/main-helpers/info-connection-main.ts',
    builtRel: 'build-ts/backend-mirrors/backend/main-helpers/info-connection-main.js',
    mirrorRel: 'lib/ts-mirrors/backend/main-helpers/info-connection-main.js',
    publicName: 'main-info-connection',
  },
  {
    sourceRel: 'src-ts/backend/main-helpers/license-key-main.ts',
    builtRel: 'build-ts/backend-mirrors/backend/main-helpers/license-key-main.js',
    mirrorRel: 'lib/ts-mirrors/backend/main-helpers/license-key-main.js',
    publicName: 'main-license-key',
  },
  {
    sourceRel: 'src-ts/backend/main-runtime/main-runtime-helpers.ts',
    builtRel: 'build-ts/backend-mirrors/backend/main-runtime/main-runtime-helpers.js',
    mirrorRel: 'lib/ts-mirrors/backend/main-runtime/main-runtime-helpers.js',
    publicName: 'main-runtime-helpers',
  },
  {
    sourceRel: 'src-ts/backend/api-state/api-state-envelope.ts',
    builtRel: 'build-ts/backend-mirrors/backend/api-state/api-state-envelope.js',
    mirrorRel: 'lib/ts-mirrors/backend/api-state/api-state-envelope.js',
    publicName: 'api-state-envelope',
  },
  {
    sourceRel: 'src-ts/backend/api-state/api-set-helpers.ts',
    builtRel: 'build-ts/backend-mirrors/backend/api-state/api-set-helpers.js',
    mirrorRel: 'lib/ts-mirrors/backend/api-state/api-set-helpers.js',
    publicName: 'api-set-helpers',
  },
  {
    sourceRel: 'src-ts/backend/connection/connection-state.ts',
    builtRel: 'build-ts/backend-mirrors/backend/connection/connection-state.js',
    mirrorRel: 'lib/ts-mirrors/backend/connection/connection-state.js',
    publicName: 'connection-state',
  },
];

/**
 * Code-Teil: fail
 * Zweck: Bricht Build/Check mit klarer Meldung ab, damit CI und Git nicht stillschweigend falsche Spiegel übernehmen.
 */
function fail(message, code = 1) {
  console.error(`[build-ts-backend-mirrors] ERROR: ${message}`);
  process.exit(code);
}

/**
 * Code-Teil: resolveTscCommand
 *
 * Zweck:
 * Findet den TypeScript-Compiler. In normaler Entwicklung wird die lokale Version
 * aus `node_modules` genutzt. In der Paketbau-Umgebung darf ein globales `tsc`
 * verwendet werden.
 *
 * Zusammenhang:
 * `publish:check` ruft dieses Skript nicht auf. Dadurch bleibt der schnelle Check
 * ohne TypeScript-Installation lauffähig.
 */
function resolveTscCommand() {
  if (fs.existsSync(localTsc)) return { command: process.execPath, argsPrefix: [localTsc] };
  return { command: process.platform === 'win32' ? 'tsc.cmd' : 'tsc', argsPrefix: [] };
}

/**
 * Code-Teil: normalizeNewlines
 * Zweck: Macht Hash- und Vergleichsberechnungen unter Windows/Linux stabil.
 */
function normalizeNewlines(text) {
  return String(text || '').replace(/\r\n/g, '\n');
}

/**
 * Code-Teil: readRequired
 * Zweck: Liest eine Pflichtdatei und bricht mit sprechender Meldung ab, wenn sie fehlt.
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
 * Berechnet einen Quell-Hash der TypeScript-Datei. Der Hash wird in den JS-Spiegel
 * geschrieben und später ohne TypeScript-Compiler geprüft.
 */
function sourceHash(sourceRel) {
  return crypto.createHash('sha256').update(readRequired(sourceRel)).digest('hex');
}

/**
 * Code-Teil: runTypescriptCompiler
 *
 * Zweck:
 * Kompiliert ausschließlich die freigegebenen backendnahen Helfer. Es wird bewusst
 * nicht das ganze Projekt gebaut, damit keine produktiven Runtime-Dateien berührt werden.
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
    fail('TypeScript-Build für Backend-Spiegel fehlgeschlagen. Falls tsc fehlt: npm install oder npm ci ausführen.', result.status || 1);
  }
}

/**
 * Code-Teil: generatedHeader
 *
 * Zweck:
 * Erzeugt den Kopf der JS-Spiegeldatei. Der Kommentar verhindert, dass Entwickler
 * später versehentlich die generierte Datei statt der TypeScript-Quelle bearbeiten.
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
    ' * Erzeugung: npm run sync:ts-backend-mirrors',
    ' *',
    ' * Zweck:',
    ' * Diese Datei ist ein CommonJS-Spiegel einer backendnahen TypeScript-Quelle.',
    ' * Sie wird in 0.7.68 noch nicht von main.js genutzt, legt aber die spätere',
    ' * sichere Migration für StateCache, Lizenz und Feature-Sichtbarkeit fest.',
    ' *',
    ' * Pflege-Regel:',
    ' * 1. Änderung zuerst in den passenden Dateien unter src-ts/backend/ vornehmen.',
    ' * 2. npm run sync:ts-backend-mirrors ausführen.',
    ' * 3. npm run test:backend-mirrors prüfen.',
    ' */',
    '',
  ].join('\n');
}

/**
 * Code-Teil: normalizeBuiltOutput
 *
 * Zweck:
 * Entfernt doppelte Strict-Header und setzt unseren erklärenden Generator-Kopf
 * davor. Fachliche Kommentare aus TypeScript bleiben im Spiegel erhalten.
 */
function normalizeBuiltOutput(spec) {
  const text = readRequired(spec.builtRel);
  const withoutStrict = text.replace(/^"use strict";\s*/g, '').replace(/^'use strict';\s*/g, '');
  return generatedHeader(spec) + withoutStrict.replace(/\s+$/g, '') + '\n';
}

/**
 * Code-Teil: buildAllMirrorTexts
 * Zweck: Führt den TypeScript-Build aus und erzeugt die erwarteten Spiegeltexte.
 */
function buildAllMirrorTexts() {
  runTypescriptCompiler();
  return mirrorSpecs.map((spec) => ({ spec, text: normalizeBuiltOutput(spec) }));
}

/**
 * Code-Teil: checkMirrorIsCurrent
 *
 * Zweck:
 * Vergleicht eingecheckten JS-Spiegel und aktuellen Build. So verhindern wir,
 * dass TypeScript-Quelle und Runtime-Spiegel auseinanderlaufen.
 */
function checkMirrorIsCurrent(spec, nextText) {
  const mirrorPath = path.join(root, spec.mirrorRel);
  const current = fs.existsSync(mirrorPath) ? normalizeNewlines(fs.readFileSync(mirrorPath, 'utf8')) : '';
  if (current !== nextText) {
    fail(`${spec.mirrorRel} ist nicht synchron. Bitte npm run sync:ts-backend-mirrors ausführen und committen.`);
  }
}

/**
 * Code-Teil: writeRuntimeMirror
 * Zweck: Schreibt den backendnahen CommonJS-Spiegel in den eingecheckten Mirror-Ordner.
 */
function writeRuntimeMirror(spec, nextText) {
  const mirrorPath = path.join(root, spec.mirrorRel);
  fs.mkdirSync(path.dirname(mirrorPath), { recursive: true });
  fs.writeFileSync(mirrorPath, nextText, 'utf8');
  console.log(`[build-ts-backend-mirrors] wrote ${spec.mirrorRel}`);
}

const mirrors = buildAllMirrorTexts();
if (checkOnly) {
  for (const { spec, text } of mirrors) checkMirrorIsCurrent(spec, text);
  console.log('[build-ts-backend-mirrors] OK: Backend-CJS-Spiegel sind synchron.');
} else {
  for (const { spec, text } of mirrors) writeRuntimeMirror(spec, text);
}
