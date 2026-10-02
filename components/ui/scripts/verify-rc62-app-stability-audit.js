#!/usr/bin/env node
'use strict';

/**
 * RC62 release gate: checks the runtime areas where the cross-app audit found
 * real ReferenceErrors or silent diagnostic failures. It also strips the
 * temporary @ts-nocheck header from every executable TypeScript source and
 * rejects unresolved identifiers (TS2304/TS2552) before publishing.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const runtimeRoot = path.join(root, 'src-ts', 'runtime-executables');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function section(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  assert.ok(start >= 0, `Abschnitt fehlt: ${startNeedle}`);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  assert.ok(end > start, `Abschnittsende fehlt: ${endNeedle}`);
  return source.slice(start, end);
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, out);
    else if (entry.isFile() && /\.tsx?$/.test(entry.name)) out.push(abs);
  }
  return out;
}

const charging = read('src-ts/runtime-executables/ems/modules/charging-management.ts');
const tsNormalSource = section(
  charging,
  'async _publishChargingTsNormalSourceState(',
  '/** Code-Teil: _executeChargingSetpointEntries',
);
assert.doesNotMatch(tsNormalSource, /_publishChargingEvcsJavascriptRemovalState\(payload,\s*input\s*\)/, 'TS-Normalquelle darf kein undefiniertes input verwenden');
assert.match(tsNormalSource, /_publishChargingEvcsJavascriptRemovalState\(payload,\s*\{[\s\S]*context:[\s\S]*control:[\s\S]*budget:[\s\S]*allocation:[\s\S]*writePlan:/, 'TS-Normalquelle muss einen expliziten Diagnosevertrag übergeben');

const main = read('src-ts/runtime-executables/main.ts');
const receiveRoute = section(main, "app.post('/api/mesh/command/receive'", "app.post('/api/mesh/peer/fieldtest'");
assert.match(receiveRoute, /allowedPeerNodeIds:\s*cfg\.allowedPeerNodeIds\s*\|\|\s*\[\]/, 'Mesh-Receiver-Summary muss die lokale Receiver-Konfiguration verwenden');
assert.doesNotMatch(receiveRoute, /allowedPeerNodeIds:\s*receiver\./, 'Mesh-Command-Receive darf kein undefiniertes receiver verwenden');
const fieldtestPost = section(main, "app.post('/api/mesh/peer/fieldtest'", "app.get('/api/mesh/peer/fieldtest'");
assert.match(fieldtestPost, /const receiver = _nwMeshReceiverCfg\(\);/, 'Mesh-Feldtest POST muss den Receiver explizit laden');
assert.match(fieldtestPost, /allowedPeerNodeIds:\s*receiver\.allowedPeerNodeIds\s*\|\|\s*\[\]/, 'Mesh-Feldtest POST muss die Allowlist aus dem geladenen Receiver veröffentlichen');
assert.match(fieldtestPost, /roundtripLevel:/, 'Mesh-Feldtest muss Roundtrip-Level getrennt vom Status veröffentlichen');
const fieldtestResult = section(fieldtestPost, "const result = {\n      ok: okPeerCount > 0", "await _nwMeshWriteState('meshMicrogrid.fieldTest.status'");
assert.strictEqual((fieldtestResult.match(/\n\s*roundtripStatus:/g) || []).length, 1, 'Mesh-Feldtestresultat darf roundtripStatus nicht doppelt definieren');
const fieldtestGet = section(main, "app.get('/api/mesh/peer/fieldtest'", "app.get('/api/mesh/microgrid.csv'");
assert.match(fieldtestGet, /const receiver = _nwMeshReceiverCfg\(\);/, 'Mesh-Feldtest GET muss den Receiver explizit laden');

const meshUi = read('src-ts/runtime-executables/www/mesh-microgrid.ts');
const renderLimits = section(meshUi, 'function renderLimits(payload)', 'function renderCommandGuard(payload)');
assert.doesNotMatch(renderLimits, /\bfairness\b/, 'Mesh-Limitansicht darf keine fremde fairness-Variable verwenden');
assert.doesNotMatch(renderLimits, /\bg\./, 'Mesh-Limitansicht darf keine fremde Gruppenvariable verwenden');
assert.match(renderLimits, /const boundaryW =/, 'Mesh-Limitansicht muss ihre Grenzleistung aus der aktuellen Zeile ableiten');

const apps = read('src-ts/runtime-executables/www/ems-apps.ts');
assert.match(apps, /function setDirty\(\)/, 'AppCenter benötigt eine definierte Dirty-Funktion');
assert.match(apps, /function clearDirty\(\)/, 'AppCenter benötigt eine definierte Clear-Dirty-Funktion');
assert.ok((apps.match(/\bsetDirty\(\)/g) || []).length > 20, 'AppCenter-Felder müssen Änderungen als ungespeichert markieren');
assert.ok((apps.match(/\bclearDirty\(\)/g) || []).length >= 3, 'AppCenter muss Dirty nach Laden und Speichern zurücksetzen');

const smarthomeConfig = read('src-ts/runtime-executables/www/smarthome-config.ts');
assert.doesNotMatch(smarthomeConfig, /\bnwShTypeLabel\b/, 'SmartHome-Konfiguration darf den entfernten Typhelfer nicht aufrufen');
assert.doesNotMatch(smarthomeConfig, /\bnwRunValidatorSoon\b/, 'SmartHome-Konfiguration darf den entfernten Validatorhelfer nicht aufrufen');
assert.match(smarthomeConfig, /function nwGetTypeLabel\(/, 'SmartHome-Konfiguration benötigt den aktuellen Typhelfer');
assert.match(smarthomeConfig, /function nwScheduleValidation\(/, 'SmartHome-Konfiguration benötigt den aktuellen Validator-Scheduler');

const smarthome = read('src-ts/runtime-executables/www/smarthome.ts');
assert.match(smarthome, /const NW_SH_TYPE_ICONS = \{/, 'SmartHome-Gruppierung benötigt die Typ-Icon-Tabelle');
assert.doesNotMatch(smarthome, /\bNW_SH_TYPE_ICON\b/, 'SmartHome darf die nicht definierte singular Typ-Icon-Variable nicht verwenden');
assert.match(smarthome, /function nwRefreshDevicesSoon\(/, 'SmartHome-Player benötigt den debouncten Geräte-Refresh');
assert.match(smarthome, /nwReloadDevices\(\{ force: true \}\)/, 'SmartHome-Refresh muss einen aktuellen Gerätesnapshot laden');

// Semantic undefined-name scan for all executable TS sources. Only Node's
// runtime-provided __dirname is ignored when local @types/node is unavailable.
const roots = walk(runtimeRoot).sort();
const options = {
  noEmit: true,
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.CommonJS,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  skipLibCheck: true,
  esModuleInterop: true,
  allowSyntheticDefaultImports: true,
  strict: false,
  noImplicitAny: false,
  lib: ['lib.es2020.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
};
const host = ts.createCompilerHost(options);
const readOriginal = host.readFile.bind(host);
host.readFile = (fileName) => {
  const text = readOriginal(fileName);
  if (text === undefined) return text;
  if (path.resolve(fileName).startsWith(runtimeRoot)) return text.replace(/^\/\/\s*@ts-nocheck\s*\r?\n/, '');
  return text;
};
host.getSourceFile = (fileName, languageVersion) => {
  const text = host.readFile(fileName);
  if (text === undefined) return undefined;
  return ts.createSourceFile(fileName, text, languageVersion, true, fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
};
const program = ts.createProgram(roots, options, host);
const unresolved = ts.getPreEmitDiagnostics(program)
  .filter((diagnostic) => diagnostic.code === 2304 || diagnostic.code === 2552)
  .map((diagnostic) => {
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    const pos = diagnostic.file && typeof diagnostic.start === 'number'
      ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
      : null;
    return {
      file: diagnostic.file ? path.relative(root, diagnostic.file.fileName).replace(/\\/g, '/') : '',
      line: pos ? pos.line + 1 : 0,
      column: pos ? pos.character + 1 : 0,
      code: diagnostic.code,
      message,
    };
  })
  .filter((entry) => !/^Cannot find name '__dirname'\.$/.test(entry.message));
assert.deepStrictEqual(unresolved, [], `Ungelöste Runtime-Bezeichner:\n${unresolved.map((entry) => `${entry.file}:${entry.line}:${entry.column} TS${entry.code} ${entry.message}`).join('\n')}`);

console.log(`[rc62-app-stability-audit] OK: Cross-App-ReferenceErrors behoben; ${roots.length} Runtime-Quellen ohne ungelöste TS2304/TS2552-Bezeichner.`);
