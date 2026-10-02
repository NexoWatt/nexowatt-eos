#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/build-ts-adapter-mirrors.js
 *
 * Zweck:
 * Baut erste adapternahe TypeScript-Helfer aus `src-ts/adapter/**` als CommonJS-
 * Spiegel unter `lib/ts-mirrors/adapter/**`.
 *
 * Zusammenhang:
 * Diese Spiegel sind die nächste sichere Brücke für die schrittweise Auslagerung aus
 * `main.js`: StateCache, `/api/state`, `/api/set`, Kundeneinstellungen und
 * `info.connection`. Produktiv wird in 0.7.98 noch nichts auf diese Spiegel umgestellt.
 *
 * Wichtig:
 * Änderungen immer zuerst in `src-ts/adapter/**` vornehmen und danach
 * `npm run sync:ts-adapter-mirrors` ausführen. Der JS-Spiegel ist generiert.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const checkOnly = process.argv.includes('--check');
const tsConfig = path.join(root, 'tsconfig.adapter-mirrors.json');
const localTsc = path.join(root, 'node_modules', 'typescript', 'lib', 'tsc.js');

const mirrorSpecs = [
  {
    sourceRel: 'src-ts/adapter/state-cache.ts',
    builtRel: 'build-ts/adapter-mirrors/adapter/state-cache.js',
    mirrorRel: 'lib/ts-mirrors/adapter/state-cache.js',
    purpose: 'StateCache-Normalisierung und robuste 0/false-Wertlogik für spätere main.js-Auslagerung',
  },
  {
    sourceRel: 'src-ts/adapter/api-state.ts',
    builtRel: 'build-ts/adapter-mirrors/adapter/api-state.js',
    mirrorRel: 'lib/ts-mirrors/adapter/api-state.js',
    purpose: '/api/state-Antwortaufbau für spätere main.js-Auslagerung',
  },
  {
    sourceRel: 'src-ts/adapter/api-set.ts',
    builtRel: 'build-ts/adapter-mirrors/adapter/api-set.js',
    mirrorRel: 'lib/ts-mirrors/adapter/api-set.js',
    purpose: '/api/set-Settings-Schreibplan für spätere main.js-Auslagerung',
  },
  {
    sourceRel: 'src-ts/adapter/connection-state.ts',
    builtRel: 'build-ts/adapter-mirrors/adapter/connection-state.js',
    mirrorRel: 'lib/ts-mirrors/adapter/connection-state.js',
    purpose: 'info.connection-Schreibplan für spätere zentrale Verbindungslogik',
  },
  {
    sourceRel: 'src-ts/adapter/settings-writes.ts',
    builtRel: 'build-ts/adapter-mirrors/adapter/settings-writes.js',
    mirrorRel: 'lib/ts-mirrors/adapter/settings-writes.js',
    purpose: 'Kundeneinstellungs-Whitelist und Wertnormalisierung für settings.*',
  },
  {
    sourceRel: 'src-ts/adapter/index.ts',
    builtRel: 'build-ts/adapter-mirrors/adapter/index.js',
    mirrorRel: 'lib/ts-mirrors/adapter/index.js',
    purpose: 'Zentraler Exportpunkt für adapternahe TS-Spiegel',
  },
];

/**
 * Code-Teil: fail
 * Zweck: Beendet Build/Check mit sprechender Meldung, damit CI und Git fehlerhafte Spiegel stoppen.
 */
function fail(message, code = 1) {
  console.error(`[build-ts-adapter-mirrors] ERROR: ${message}`);
  process.exit(code);
}

/**
 * Code-Teil: normalizeNewlines
 * Zweck: Macht Datei- und Hashvergleiche unter Windows/Linux stabil.
 */
function normalizeNewlines(text) {
  return String(text || '').replace(/\r\n/g, '\n');
}

/**
 * Code-Teil: resolveTscCommand
 *
 * Zweck:
 * Nutzt bevorzugt den lokalen TypeScript-Compiler. Falls `node_modules` noch nicht
 * vorhanden ist, darf für Entwicklungsumgebungen ein globales `tsc` verwendet werden.
 *
 * Zusammenhang:
 * `publish:check` ruft nur die Verify-Skripte auf. Dieses Build-Skript läuft nur bei
 * bewusstem Sync/Build der TypeScript-Spiegel.
 */
function resolveTscCommand() {
  if (fs.existsSync(localTsc)) return { command: process.execPath, argsPrefix: [localTsc] };
  return { command: process.platform === 'win32' ? 'tsc.cmd' : 'tsc', argsPrefix: [] };
}

/**
 * Code-Teil: readRequired
 * Zweck: Liest eine Pflichtdatei und liefert klare Fehler, falls Quelle oder Build fehlt.
 */
function readRequired(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) fail(`Pflichtdatei fehlt: ${rel}`);
  return normalizeNewlines(fs.readFileSync(file, 'utf8'));
}

/**
 * Code-Teil: sourceHash
 * Zweck: Bildet einen Quellhash, damit Verify-Skripte ohne TypeScript-Build Synchronität prüfen können.
 */
function sourceHash(sourceRel) {
  return crypto.createHash('sha256').update(readRequired(sourceRel)).digest('hex');
}

/**
 * Code-Teil: runTypescriptCompiler
 *
 * Zweck:
 * Kompiliert ausschließlich die adapter-nahen Helfer. Produktive Dateien wie `main.js`
 * werden dadurch nicht berührt.
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
    fail('TypeScript-Build für Adapter-Spiegel fehlgeschlagen. Falls tsc fehlt: npm install oder npm ci ausführen.', result.status || 1);
  }
}

/**
 * Code-Teil: generatedHeader
 *
 * Zweck:
 * Schreibt einen eindeutigen Generator-Kopf in jeden JS-Spiegel. Dadurch ist klar:
 * Der JS-Spiegel wird nicht manuell gepflegt, sondern aus TypeScript erzeugt.
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
    ' * Erzeugung: npm run sync:ts-adapter-mirrors',
    ' *',
    ' * Zweck:',
    ` * ${spec.purpose}.`,
    ' *',
    ' * Zusammenhang:',
    ' * Dieser Spiegel ist ein vorbereiteter CommonJS-Helfer für die spätere Auslagerung',
    ' * kleiner main.js-Bereiche. In 0.7.98 bleibt main.js produktiv führend.',
    ' */',
    '',
  ].join('\n');
}

/**
 * Code-Teil: normalizeBuiltOutput
 * Zweck: Entfernt doppelte Strict-Header und setzt unseren erklärenden Generator-Kopf davor.
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
 * Zweck: Prüft, ob der eingecheckte JS-Spiegel zum aktuellen TypeScript-Quellstand passt.
 */
function checkMirrorIsCurrent(spec, nextText) {
  const mirrorPath = path.join(root, spec.mirrorRel);
  const current = fs.existsSync(mirrorPath) ? normalizeNewlines(fs.readFileSync(mirrorPath, 'utf8')) : '';
  if (current !== nextText) {
    fail(`${spec.mirrorRel} ist nicht synchron. Bitte npm run sync:ts-adapter-mirrors ausführen und committen.`);
  }
}

/**
 * Code-Teil: writeRuntimeMirror
 * Zweck: Schreibt den CommonJS-Spiegel in `lib/ts-mirrors/adapter/**`.
 */
function writeRuntimeMirror(spec, nextText) {
  const mirrorPath = path.join(root, spec.mirrorRel);
  fs.mkdirSync(path.dirname(mirrorPath), { recursive: true });
  fs.writeFileSync(mirrorPath, nextText, 'utf8');
  console.log(`[build-ts-adapter-mirrors] wrote ${spec.mirrorRel}`);
}

const mirrors = buildAllMirrorTexts();
if (checkOnly) {
  for (const { spec, text } of mirrors) checkMirrorIsCurrent(spec, text);
  console.log('[build-ts-adapter-mirrors] OK: Adapter-CJS-Spiegel sind synchron.');
} else {
  for (const { spec, text } of mirrors) writeRuntimeMirror(spec, text);
}
