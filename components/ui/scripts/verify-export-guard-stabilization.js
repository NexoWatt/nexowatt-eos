#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function has(rel, token) {
  const txt = read(rel);
  assert(txt.includes(token), `${rel}: missing ${token}`);
}
const grid = 'src-ts/runtime-executables/ems/modules/grid-constraints.ts';
const apps = 'src-ts/runtime-executables/www/ems-apps.ts';
[
  '_getExportLimitRunMode',
  '_isExportLimitDiagnosticMode',
  'gridConstraints.exportLimit.runMode',
  'gridConstraints.exportLimit.diagnosticOnly',
  'gridConstraints.exportLimit.plannedAction',
  'gridConstraints.exportLimit.installerChecklistJson',
  'diagnostic_only',
  'Diagnose/Testmodus aktiv',
  'const sinkWriteResult = enabled && approved && !diagnosticOnly && sinkCommandReady',
  'if (cfg.zeroExportEnabled && exportGuardDiagnosticOnly)',
  "action: 'diagnostic_only'",
  'applied: false',
].forEach(t => has(grid, t));
[
  'gc.exportLimitRunMode',
  'Betriebsart Einspeisebegrenzung',
  'Diagnose/Testmodus – nur berechnen, nicht schreiben',
  'renderExportGuardRuntimeDiagnostics',
  'Export Guard Runtime-Diagnose',
  'Zum WR-Mapping springen',
  'Negative-Preis-Strategie',
].forEach(t => has(apps, t));
const npmignore = read('.npmignore');
assert(npmignore.includes('*.zip') && npmignore.includes('*.tgz'), '.npmignore must exclude generated archives/tarballs');
const packedFiles = ['NexoWatt-ui-0.8.29-export-guard-diagnostics.zip', 'iobroker.nexowatt-ui-0.8.29.tgz'];
for (const name of packedFiles) assert(!fs.existsSync(path.join(root, name)), `repo must not contain generated archive ${name}`);
console.log('[export-guard-stabilization] OK: Diagnosemodus, Installerdiagnose und Archiv-Ausschluss geprüft.');
