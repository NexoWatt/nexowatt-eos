#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/build-ts-frontend-mirrors.js
 *
 * Zweck:
 * Baut die ersten browsernahen TypeScript-Frontend-Helfer als JavaScript-Modulspiegel.
 *
 * Zusammenhang:
 * - Quelle: `src-ts/frontend/*.ts`
 * - Build-Ausgabe: `build-ts/frontend-mirrors/frontend/*.js`
 * - eingecheckter Browser-Spiegel: `www/static/ts-mirrors/frontend/*.mjs`
 *
 * Wichtig:
 * Diese Spiegel werden in 0.7.67 noch nicht vom produktiven Dashboard geladen.
 * Sie sind die sichere Vorstufe, damit wir später einzelne Frontend-Helfer aus
 * `www/app.js` und `www/history.js` kontrolliert auf TypeScript umstellen können.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const checkOnly = process.argv.includes('--check');
const tsConfig = path.join(root, 'tsconfig.frontend-mirrors.json');
const localTsc = path.join(root, 'node_modules', 'typescript', 'lib', 'tsc.js');

const mirrorSpecs = [
  {
    sourceRel: 'src-ts/frontend/display-format.ts',
    builtRel: 'build-ts/frontend-mirrors/frontend/display-format.js',
    mirrorRel: 'www/static/ts-mirrors/frontend/display-format.mjs',
    publicName: 'display-format',
  },
  {
    sourceRel: 'src-ts/frontend/live-dashboard-format.ts',
    builtRel: 'build-ts/frontend-mirrors/frontend/live-dashboard-format.js',
    mirrorRel: 'www/static/ts-mirrors/frontend/live-dashboard-format.mjs',
    publicName: 'live-dashboard-format',
  },
  {
    sourceRel: 'src-ts/frontend/display-format-canary.ts',
    builtRel: 'build-ts/frontend-mirrors/frontend/display-format-canary.js',
    mirrorRel: 'www/static/ts-mirrors/frontend/display-format-canary.mjs',
    publicName: 'display-format-canary',
  },
  {
    sourceRel: 'src-ts/frontend/customer-feature-visibility.ts',
    builtRel: 'build-ts/frontend-mirrors/frontend/customer-feature-visibility.js',
    mirrorRel: 'www/static/ts-mirrors/frontend/customer-feature-visibility.mjs',
    publicName: 'customer-feature-visibility',
  },
  {
    sourceRel: 'src-ts/frontend/feature-visibility-diagnostics.ts',
    builtRel: 'build-ts/frontend-mirrors/frontend/feature-visibility-diagnostics.js',
    mirrorRel: 'www/static/ts-mirrors/frontend/feature-visibility-diagnostics.mjs',
    publicName: 'feature-visibility-diagnostics',
  },
  {
    sourceRel: 'src-ts/frontend/history-controls.ts',
    builtRel: 'build-ts/frontend-mirrors/frontend/history-controls.js',
    mirrorRel: 'www/static/ts-mirrors/frontend/history-controls.mjs',
    publicName: 'history-controls',
  },
  {
    sourceRel: 'src-ts/frontend/runtime-shadow.ts',
    builtRel: 'build-ts/frontend-mirrors/frontend/runtime-shadow.js',
    mirrorRel: 'www/static/ts-mirrors/frontend/runtime-shadow.mjs',
    publicName: 'runtime-shadow',
  },
  {
    sourceRel: 'src-ts/frontend/feature-visibility-shadow-compare.ts',
    builtRel: 'build-ts/frontend-mirrors/frontend/feature-visibility-shadow-compare.js',
    mirrorRel: 'www/static/ts-mirrors/frontend/feature-visibility-shadow-compare.mjs',
    publicName: 'feature-visibility-shadow-compare',
  },
];

/**
 * Code-Teil: fail
 * Zweck: Bricht den Build mit klarer Fehlermeldung ab, damit CI/Git nicht stillschweigend falsche Spiegel übernimmt.
 */
function fail(message, code = 1) {
  console.error(`[build-ts-frontend-mirrors] ERROR: ${message}`);
  process.exit(code);
}

/**
 * Code-Teil: resolveTscCommand
 *
 * Zweck:
 * Sucht den TypeScript-Compiler. In normalen Projektumgebungen wird die lokale
 * Version aus `node_modules` genutzt. In der Build-Umgebung darf ersatzweise ein
 * globales `tsc` verwendet werden.
 *
 * Zusammenhang:
 * `publish:check` ruft dieses Skript nicht auf. Dadurch bleibt der schnelle
 * Paketcheck weiterhin ohne TypeScript-Installation nutzbar.
 */
function resolveTscCommand() {
  if (fs.existsSync(localTsc)) return { command: process.execPath, argsPrefix: [localTsc] };
  return { command: process.platform === 'win32' ? 'tsc.cmd' : 'tsc', argsPrefix: [] };
}

/**
 * Code-Teil: normalizeNewlines
 * Zweck: Vereinheitlicht Zeilenenden, damit Hashes unter Windows und Linux gleich bleiben.
 */
function normalizeNewlines(text) {
  return String(text || '').replace(/\r\n/g, '\n');
}

/**
 * Code-Teil: sourceHash
 *
 * Zweck:
 * Berechnet den Hash einer TypeScript-Quelle. Der Hash wird in den MJS-Spiegel
 * geschrieben und später ohne TypeScript-Compiler geprüft.
 */
function sourceHash(sourceRel) {
  const text = normalizeNewlines(fs.readFileSync(path.join(root, sourceRel), 'utf8'));
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Code-Teil: runTypescriptCompiler
 *
 * Zweck:
 * Kompiliert nur die freigegebenen Frontend-Helfer. Es wird bewusst nicht das
 * komplette Projekt gebaut, damit keine produktiven Runtime-Dateien überschrieben werden.
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
    fail('TypeScript-Build für Frontend-Spiegel fehlgeschlagen. Falls tsc fehlt: npm install oder npm ci ausführen.', result.status || 1);
  }
}

/**
 * Code-Teil: generatedHeader
 *
 * Zweck:
 * Erzeugt den Kopf der MJS-Spiegeldatei. Der Kommentar macht sichtbar, dass die
 * Datei nicht manuell gepflegt werden soll.
 */
function generatedHeader(spec) {
  return [
    '/**',
    ' * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.',
    ' *',
    ` * Quelle: ${spec.sourceRel}`,
    ` * Quell-Hash: sha256:${sourceHash(spec.sourceRel)}`,
    ' * Erzeugung: npm run sync:ts-frontend-mirrors',
    ' *',
    ' * Zweck:',
    ' * Diese Datei ist ein browsernaher JavaScript-Modulspiegel der TypeScript-Quelle.',
    ' * Diese Datei kann produktiv importiert werden, wenn der zugehörige Browsercode',
    ' * bereits auf den jeweiligen TS-Helfer umgestellt wurde.',
    ' *',
    ' * Pflege-Regel:',
    ' * 1. Änderung zuerst in src-ts/frontend/*.ts vornehmen.',
    ' * 2. npm run sync:ts-frontend-mirrors ausführen.',
    ' * 3. npm run test:ts-frontend-mirrors prüfen.',
    ' */',
    '',
  ].join('\n');
}

/**
 * Code-Teil: normalizeBuiltOutput
 *
 * Zweck:
 * Entfernt überflüssigen Compiler-Header und setzt unseren erklärenden Generator-
 * Kopf davor. Fachliche Kommentare aus TypeScript bleiben im MJS-Spiegel erhalten.
 */
function normalizeBuiltOutput(spec) {
  const builtPath = path.join(root, spec.builtRel);
  if (!fs.existsSync(builtPath)) fail(`Erwartete Build-Datei fehlt: ${spec.builtRel}`);
  let text = normalizeNewlines(fs.readFileSync(builtPath, 'utf8'));
  text = text.replace(/^"use strict";\s*/g, '').replace(/^'use strict';\s*/g, '');
  /**
   * Code-Teil: MJS-Importpfade normalisieren
   *
   * Zweck:
   * TypeScript erzeugt für Bundler/NodeNext teilweise extension-lose relative Imports.
   * Browser-/Node-MJS-Spiegel unter `www/static` brauchen jedoch eine echte `.mjs`-
   * Endung, sonst schlägt `import()` in den Verifikationschecks fehl.
   */
  text = text.replace(/from\s+['"](\.\/[^'"]+?)(?<!\.mjs)(?<!\.js)['"]/g, (match, rel) => `from '${rel}.mjs'`);
  text = text.replace(/import\(\s*['"](\.\/[^'"]+?)(?<!\.mjs)(?<!\.js)['"]\s*\)/g, (match, rel) => `import('${rel}.mjs')`);
  return generatedHeader(spec) + text.replace(/\s+$/g, '') + '\n';
}

/**
 * Code-Teil: buildAllMirrorTexts
 * Zweck: Führt den TS-Build aus und baut daraus alle MJS-Spiegeltexte.
 */
function buildAllMirrorTexts() {
  runTypescriptCompiler();
  return mirrorSpecs.map((spec) => ({ spec, text: normalizeBuiltOutput(spec) }));
}

/**
 * Code-Teil: checkMirrorIsCurrent
 *
 * Zweck:
 * Vergleicht einen eingecheckten MJS-Spiegel mit dem aktuellen TypeScript-Build.
 * Wenn Quelle und Spiegel auseinanderlaufen, muss der Entwickler synchronisieren.
 */
function checkMirrorIsCurrent(spec, text) {
  const mirrorPath = path.join(root, spec.mirrorRel);
  const current = fs.existsSync(mirrorPath) ? normalizeNewlines(fs.readFileSync(mirrorPath, 'utf8')) : '';
  if (current !== text) {
    fail(`${spec.mirrorRel} ist nicht synchron. Bitte npm run sync:ts-frontend-mirrors ausführen und committen.`);
  }
}

/**
 * Code-Teil: writeRuntimeMirror
 * Zweck: Schreibt einen MJS-Spiegel in den statischen www-Bereich.
 */
function writeRuntimeMirror(spec, text) {
  const mirrorPath = path.join(root, spec.mirrorRel);
  fs.mkdirSync(path.dirname(mirrorPath), { recursive: true });
  fs.writeFileSync(mirrorPath, text, 'utf8');
  console.log(`[build-ts-frontend-mirrors] wrote ${spec.mirrorRel}`);
}

const mirrors = buildAllMirrorTexts();
if (checkOnly) {
  for (const { spec, text } of mirrors) checkMirrorIsCurrent(spec, text);
  console.log('[build-ts-frontend-mirrors] OK: Frontend-MJS-Spiegel sind synchron.');
} else {
  for (const { spec, text } of mirrors) writeRuntimeMirror(spec, text);
}
