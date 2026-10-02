#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/build-ts-runtime-executables.js
 *
 * Zweck:
 * Synchronisiert die produktiven Adapter-/EMS-/Frontend-JavaScript-Dateien aus den neuen
 * ausführbaren TypeScript-Quellen unter `src-ts/runtime-executables/`.
 *
 * Zusammenhang:
 * Node.js/ioBroker und Browser führen weiterhin JavaScript-Dateien aus. Ab 0.7.131
 * sind diese Runtime-Dateien aber Build-Artefakte: Die editierbare Quelle liegt in
 * TypeScript. Der Sync ist bewusst textstabil, weil die Runtime-Executable-TS-Dateien
 * als JS-kompatibles TypeScript geführt werden. Dieser Check verhindert, dass wieder direkt in `main.js`, `ems/**`,
 * `www/**` gearbeitet wird.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'src-ts', 'runtime-executables');
const checkOnly = process.argv.includes('--check');
const obsoleteRuntimePaths = [
  '.nwcore',
  path.join('src-ts', 'runtime-executables', 'nwcore'),
  path.join('src-ts', 'runtime-mirrors', 'nwcore'),
];

function toPosix(value) {
  return String(value || '').replace(/\\/g, '/');
}

function sha256(text) {
  return crypto.createHash('sha256').update(String(text || ''), 'utf8').digest('hex');
}

function fail(message, code = 1) {
  console.error(`[ts-runtime-executables] ERROR: ${message}`);
  process.exit(code);
}

function normalizeNewlines(text) {
  return String(text || '').replace(/\r\n/g, '\n');
}

function readRequired(absOrRel) {
  const file = path.isAbsolute(absOrRel) ? absOrRel : path.join(root, absOrRel);
  if (!fs.existsSync(file)) fail(`Pflichtdatei fehlt: ${toPosix(path.relative(root, file))}`);
  return normalizeNewlines(fs.readFileSync(file, 'utf8'));
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, out);
    else if (entry.isFile() && (/\.(ts|tsx)$/).test(entry.name)) out.push(abs);
  }
  return out;
}

function runtimeRelForSource(sourceAbs) {
  const rel = toPosix(path.relative(sourceRoot, sourceAbs));
  const jsRel = rel.replace(/\.tsx?$/, '.js');
  return jsRel;
}

function builtRelForSource(sourceAbs) {
  const rel = toPosix(path.relative(sourceRoot, sourceAbs)).replace(/\.tsx?$/, '.js');
  return rel;
}

function stripSourceOnlyHeader(text) {
  let out = normalizeNewlines(text).replace(/^\uFEFF/, '');
  let shebang = '';
  if (out.startsWith('#!')) {
    const nl = out.indexOf('\n');
    if (nl >= 0) {
      shebang = out.slice(0, nl + 1);
      out = out.slice(nl + 1);
    }
  }
  out = out.replace(/^\/\/ @ts-nocheck\n/, '');
  out = out.replace(/^\/\*\*\n \* Executable TypeScript source:[\s\S]*?\n \*\/\n\n/, '');
  return { shebang, body: out.replace(/\s+$/g, '') + '\n' };
}

const RUNTIME_TRANSPILE_MARKER = '// @runtime-transpile';

function formatDiagnostic(diagnostic) {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
  if (!diagnostic.file || typeof diagnostic.start !== 'number') return message;
  const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
  const file = toPosix(path.relative(root, diagnostic.file.fileName));
  return `${file}:${position.line + 1}:${position.character + 1} ${message}`;
}

/**
 * Transpiliert ausschließlich explizit markierte Runtime-Quellen. Alle übrigen
 * Dateien bleiben textstabil, damit die bestehenden Mirror-/Hash-Prüfungen ihre
 * bisherige Aussagekraft behalten.
 */
function transpileMarkedRuntimeSource(sourceAbs, body) {
  const input = normalizeNewlines(body).replace(/^\/\/ @runtime-transpile\n/, '');
  const result = ts.transpileModule(input, {
    fileName: sourceAbs,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      removeComments: false,
      sourceMap: false,
      inlineSourceMap: false,
      inlineSources: false,
      newLine: ts.NewLineKind.LineFeed,
    },
  });
  const errors = (result.diagnostics || []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
  if (errors.length) {
    fail(`TypeScript-Transpilierung fehlgeschlagen für ${toPosix(path.relative(root, sourceAbs))}:\n${errors.map(formatDiagnostic).join('\n')}`);
  }
  return normalizeNewlines(result.outputText).replace(/\s+$/g, '') + '\n';
}

function generatedHeader(sourceRel, runtimeRel, sourceText) {
  return [
    '/**',
    ' * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.',
    ' *',
    ` * Quelle: ${sourceRel}`,
    ` * Quell-Hash: sha256:${sha256(sourceText)}`,
    ' * Erzeugung: npm run sync:ts-runtime-executables',
    ' *',
    ' * Zweck:',
    ` * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ${runtimeRel}.`,
    ' * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.',
    ' * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.',
    ' *',
    ' * Pflege-Regel:',
    ' * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.',
    ' * 2. npm run sync:ts-runtime-executables ausführen.',
    ' * 3. npm run test:runtime-executables prüfen.',
    ' */',
    '',
  ].join('\n');
}

function normalizeBuiltOutput(sourceAbs) {
  const sourceRel = toPosix(path.relative(root, sourceAbs));
  const runtimeRel = runtimeRelForSource(sourceAbs);
  const sourceText = readRequired(sourceAbs);
  const stripped = stripSourceOnlyHeader(sourceText);
  const header = generatedHeader(sourceRel, runtimeRel, sourceText);
  const shouldTranspile = stripped.body.startsWith(`${RUNTIME_TRANSPILE_MARKER}\n`);
  const body = shouldTranspile
    ? transpileMarkedRuntimeSource(sourceAbs, stripped.body)
    : stripped.body;
  return stripped.shebang + header + body;
}

function buildExpectedOutputs() {
  if (!fs.existsSync(sourceRoot)) fail('src-ts/runtime-executables fehlt.');
  const sources = walk(sourceRoot).sort((a, b) => toPosix(a).localeCompare(toPosix(b)));
  if (!sources.length) fail('keine ausführbaren Runtime-TS-Quellen gefunden.');
  return sources.map((sourceAbs) => ({
    sourceAbs,
    runtimeRel: runtimeRelForSource(sourceAbs),
    text: normalizeBuiltOutput(sourceAbs),
  }));
}


function assertObsoleteRuntimePathsRemoved() {
  for (const rel of obsoleteRuntimePaths) {
    const abs = path.join(root, rel);
    if (fs.existsSync(abs)) {
      fail(`Obsoleter JS-/Mirror-Baum ist noch vorhanden und darf nicht mehr ausgeliefert werden: ${toPosix(rel)}`);
    }
  }
}


function checkRuntimeFilesAgainstSourceHeaders() {
  if (!fs.existsSync(sourceRoot)) fail('src-ts/runtime-executables fehlt.');
  const sources = walk(sourceRoot).sort((a, b) => toPosix(a).localeCompare(toPosix(b)));
  if (!sources.length) fail('keine ausführbaren Runtime-TS-Quellen gefunden.');
  let checked = 0;
  for (const sourceAbs of sources) {
    const sourceRel = toPosix(path.relative(root, sourceAbs));
    const runtimeRel = runtimeRelForSource(sourceAbs);
    const runtimeAbs = path.join(root, runtimeRel);
    if (!fs.existsSync(runtimeAbs)) fail(`Runtime-Datei fehlt: ${runtimeRel}`);
    const sourceText = readRequired(sourceAbs);
    const runtimeText = readRequired(runtimeAbs);
    const expectedHash = sha256(sourceText);
    if (!runtimeText.includes('AUTO-GENERATED RUNTIME FILE')) {
      fail(`${runtimeRel} enthält keinen Runtime-Generator-Hinweis.`);
    }
    if (!runtimeText.includes(`Quelle: ${sourceRel}`)) {
      fail(`${runtimeRel} enthält keinen Quellenhinweis auf ${sourceRel}.`);
    }
    if (!runtimeText.includes(`Quell-Hash: sha256:${expectedHash}`)) {
      fail(`${runtimeRel} hat einen veralteten Quell-Hash.`);
    }
    if (!runtimeText.includes('Erzeugung: npm run sync:ts-runtime-executables')) {
      fail(`${runtimeRel} enthält keine Runtime-Sync-Regel.`);
    }
    checked += 1;
  }
  console.log(`[ts-runtime-executables] OK: ${checked} produktive Runtime-Dateien geprüft; TS ist die kanonische Runtime-Quelle.`);
}

assertObsoleteRuntimePathsRemoved();

let changed = false;
const outputs = buildExpectedOutputs();
for (const item of outputs) {
  const runtimeAbs = path.join(root, item.runtimeRel);
  if (checkOnly) {
    if (!fs.existsSync(runtimeAbs)) fail(`Runtime-Datei fehlt: ${item.runtimeRel}`);
    const current = readRequired(runtimeAbs);
    if (current !== item.text) {
      console.error(`[ts-runtime-executables] OUTDATED: ${item.runtimeRel}`);
      changed = true;
    }
  } else {
    fs.mkdirSync(path.dirname(runtimeAbs), { recursive: true });
    const current = fs.existsSync(runtimeAbs) ? readRequired(runtimeAbs) : '';
    if (current !== item.text) {
      fs.writeFileSync(runtimeAbs, item.text, 'utf8');
      changed = true;
    }
  }
}

if (checkOnly && changed) {
  fail('Runtime-JavaScript ist nicht aus src-ts/runtime-executables gebaut. Bitte npm run sync:ts-runtime-executables ausführen.');
}

const mode = checkOnly ? 'geprüft' : (changed ? 'aktualisiert' : 'bereits aktuell');
console.log(`[ts-runtime-executables] OK: ${outputs.length} produktive Runtime-Dateien ${mode}; TS ist die kanonische Runtime-Quelle.`);
