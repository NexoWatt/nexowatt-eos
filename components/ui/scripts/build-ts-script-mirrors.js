#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/build-ts-script-mirrors.js
 *
 * Zweck:
 * Baut den ersten kontrollierten TypeScript-zu-JavaScript-Spiegel für unsere
 * Wartungs-/Publish-Skripte.
 *
 * Zusammenhang:
 * - Quelle: `src-ts/scripts/publish-check-rules.ts`
 * - Build-Ausgabe: `build-ts/script-mirrors/scripts/publish-check-rules.js`
 * - Laufzeit-Spiegel: `scripts/publish-check-rules.js`
 * - Nutzer: `scripts/verify-publish.js`
 *
 * Wichtig:
 * Dieses Skript betrifft nur Wartungs-/Publish-Prüfungen. Es verändert keine
 * EMS-, Energiefluss-, Heizstab-, KI- oder UI-Runtime. Dadurch ist es ein sicherer
 * erster Testfall für die spätere TS->JS-Buildstrategie.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const checkOnly = process.argv.includes('--check');
const tsConfig = path.join(root, 'tsconfig.scripts-mirror.json');
const localTsc = path.join(root, 'node_modules', 'typescript', 'lib', 'tsc.js');
const builtFile = path.join(root, 'build-ts', 'script-mirrors', 'scripts', 'publish-check-rules.js');
const runtimeMirror = path.join(root, 'scripts', 'publish-check-rules.js');
const sourceFile = path.join(root, 'src-ts', 'scripts', 'publish-check-rules.ts');

/**
 * Code-Teil: fail
 * Zweck: Beendet den Prozess mit klarer deutscher Fehlermeldung.
 */
function fail(message, code = 1) {
  console.error(`[build-ts-script-mirrors] ERROR: ${message}`);
  process.exit(code);
}

/**
 * Code-Teil: resolveTscCommand
 *
 * Zweck:
 * Ermittelt, welcher TypeScript-Compiler verwendet wird.
 *
 * Zusammenhang:
 * In GitHub/CI und bei normaler Entwicklung soll die lokale Projektversion aus
 * `node_modules` genutzt werden. In unserer Arbeitsumgebung kann für das Bauen
 * eines ZIPs ersatzweise ein global verfuegbares `tsc` genutzt werden. `publish:check`
 * selbst ruft dieses Skript nicht auf und bleibt deshalb ohne TypeScript lauffaehig.
 */
function resolveTscCommand() {
  if (fs.existsSync(localTsc)) return { command: process.execPath, argsPrefix: [localTsc], shell: false };
  return { command: process.platform === 'win32' ? 'tsc.cmd' : 'tsc', argsPrefix: [], shell: false };
}

/**
 * Code-Teil: sourceHash
 *
 * Zweck:
 * Berechnet einen stabilen Hash der TypeScript-Quelle. Dieser Hash wird in die
 * generierte JS-Datei geschrieben, damit Menschen und Prüfscripte erkennen können,
 * ob Quelle und Spiegel zusammengehoeren.
 */
function sourceHash() {
  const text = fs.readFileSync(sourceFile, 'utf8').replace(/\r\n/g, '\n');
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Code-Teil: runTypescriptCompiler
 *
 * Zweck:
 * Kompiliert nur die freigegebenen Wartungsscript-Quellen. Es wird bewusst nicht
 * das komplette Projekt gebaut, damit kein produktiver Adapterbereich nebenbei
 * ueberschrieben wird.
 */
function runTypescriptCompiler() {
  if (!fs.existsSync(tsConfig)) fail(`tsconfig fehlt: ${path.relative(root, tsConfig)}`);
  const tsc = resolveTscCommand();
  const result = spawnSync(tsc.command, [...tsc.argsPrefix, '-p', tsConfig], {
    cwd: root,
    stdio: 'inherit',
    shell: !!tsc.shell,
  });
  if (result.status !== 0) {
    fail('TypeScript-Build für Script-Spiegel fehlgeschlagen. Falls tsc fehlt: npm install oder npm ci ausführen.', result.status || 1);
  }
}

/**
 * Code-Teil: generatedHeader
 *
 * Zweck:
 * Erzeugt den Kopf der Runtime-Spiegeldatei. Der Kommentar macht sichtbar, dass
 * die Datei nicht manuell gepflegt werden soll.
 */
function generatedHeader(hash) {
  return [
    "'use strict';",
    '',
    '/**',
    ' * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.',
    ' *',
    ' * Quelle: src-ts/scripts/publish-check-rules.ts',
    ` * Quell-Hash: sha256:${hash}`,
    ' * Erzeugung: npm run sync:ts-scripts',
    ' *',
    ' * Zweck:',
    ' * Diese JavaScript-Datei ist der Runtime-Spiegel der TypeScript-Quelle.',
    ' * scripts/verify-publish.js lädt diese Datei direkt, damit npm run',
    ' * publish:check weiterhin ohne vorherigen TypeScript-Build läuft.',
    ' *',
    ' * Pflege-Regel:',
    ' * 1. Änderung zuerst in der TypeScript-Datei vornehmen.',
    ' * 2. npm run sync:ts-scripts ausführen.',
    ' * 3. npm run test:ts-script-mirrors prüfen.',
    ' */',
    '',
  ].join('\n');
}

/**
 * Code-Teil: normalizeBuiltOutput
 *
 * Zweck:
 * Entfernt den vom TypeScript-Compiler erzeugten zweiten Strict-Header und setzt
 * unseren erklärenden Generator-Kopf davor. Fachliche Kommentare aus der TS-
 * Quelle bleiben erhalten, damit auch der JS-Spiegel nachvollziehbar ist.
 */
function normalizeBuiltOutput(raw) {
  let text = String(raw || '').replace(/^"use strict";\s*/, '');
  text = text.replace(/^'use strict';\s*/, '');
  return generatedHeader(sourceHash()) + text.replace(/\s+$/g, '') + '\n';
}

/**
 * Code-Teil: buildMirrorText
 *
 * Zweck:
 * Führt den TypeScript-Build aus und erzeugt daraus den Text für die Runtime-
 * Spiegeldatei.
 */
function buildMirrorText() {
  runTypescriptCompiler();
  if (!fs.existsSync(builtFile)) {
    fail(`Erwartete Build-Datei fehlt: ${path.relative(root, builtFile)}`);
  }
  return normalizeBuiltOutput(fs.readFileSync(builtFile, 'utf8'));
}

/**
 * Code-Teil: checkMirrorIsCurrent
 *
 * Zweck:
 * Vergleicht die eingecheckte JS-Spiegeldatei mit dem aktuellen TS-Build. Dieser
 * Check verhindert, dass TypeScript-Quelle und Runtime-Spiegel auseinanderlaufen.
 */
function checkMirrorIsCurrent(nextText) {
  const current = fs.existsSync(runtimeMirror) ? fs.readFileSync(runtimeMirror, 'utf8') : '';
  if (current !== nextText) {
    fail('scripts/publish-check-rules.js ist nicht synchron. Bitte npm run sync:ts-scripts ausführen und die Änderung committen.');
  }
  console.log('[build-ts-script-mirrors] OK: JS-Spiegel ist synchron.');
}

/**
 * Code-Teil: writeRuntimeMirror
 *
 * Zweck:
 * Schreibt die generierte JS-Datei an den Ort, den Node.js und `verify-publish.js`
 * aktuell verwenden.
 */
function writeRuntimeMirror(nextText) {
  fs.writeFileSync(runtimeMirror, nextText, 'utf8');
  console.log(`[build-ts-script-mirrors] wrote ${path.relative(root, runtimeMirror)}`);
}

const nextText = buildMirrorText();
if (checkOnly) checkMirrorIsCurrent(nextText);
else writeRuntimeMirror(nextText);
