#!/usr/bin/env node
'use strict';

/**
 * Code-Teil: Heizstab Runtime-Typisierungscheck
 *
 * Zweck:
 * Prüft den gezielten TypeScript-Migrationsschritt für
 * `src-ts/runtime-mirrors/ems/modules/heating-rod-control.ts`.
 *
 * Zusammenhang:
 * Die produktive Heizstab-Regelung läuft weiterhin über `ems/modules/heating-rod-control.js`.
 * Diese Prüfung nimmt den TS-Spiegel, entfernt temporär `@ts-nocheck` und kompiliert ihn
 * in einem gelockerten Migrationsmodus. Dadurch sehen wir, ob Adapter-, Geräte-, Stufen-
 * und Speicherreserve-Verträge tragfähig sind, ohne die Runtime umzuschalten.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');
const { spawnTypeScript, writeTypeScriptSpawnDiagnostics } = require('./typescript-invocation');

const repoRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(repoRoot, 'src-ts', 'runtime-mirrors', 'ems', 'modules', 'heating-rod-control.ts');

function requireContains(source, marker, label) {
  if (!source.includes(marker)) {
    throw new Error(`[ts-heating-rod-runtime-typing] Missing ${label}: ${marker}`);
  }
}


function buildTemporaryCheckFiles(source) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexowatt-heating-rod-ts-'));
  const tempSource = path.join(tempDir, 'heating-rod-typed-check.ts');
  const tempConfig = path.join(tempDir, 'tsconfig.json');
  const stripped = source.replace(/^\/\/ @ts-nocheck\r?\n/, '');
  fs.writeFileSync(tempSource, stripped, 'utf8');
  fs.writeFileSync(tempConfig, JSON.stringify({
    extends: path.join(repoRoot, 'tsconfig.base.json'),
    compilerOptions: {
      noEmit: true,
      strict: false,
      noImplicitAny: false,
      noImplicitReturns: false,
      noImplicitOverride: false,
      noUncheckedIndexedAccess: false,
      exactOptionalPropertyTypes: false,
      module: 'NodeNext',
      moduleResolution: 'nodenext',
      allowUnreachableCode: true,
      allowUnusedLabels: true,
      types: []
    },
    files: [tempSource]
  }, null, 2), 'utf8');
  return { tempDir, tempConfig };
}

function main() {
  const source = fs.readFileSync(sourcePath, 'utf8');
  requireContains(source, 'Heating-Rod Runtime-Migrationshinweis (DE)', 'deutscher Heizstab-Migrationskommentar');
  requireContains(source, 'type HeatingRodAdapterLike', 'Adapter-Vertrag');
  requireContains(source, 'type HeatingRodRuntimeDevice', 'Geräte-Vertrag');
  requireContains(source, 'type HeatingRodStageControlState', 'Stufensteuerungs-Vertrag');
  requireContains(source, 'type HeatingRodBudgetProtectState', 'Budgetschutz-Vertrag');
  requireContains(source, 'adapter: HeatingRodAdapterLike;', 'typisiertes Adapter-Feld');
  requireContains(source, '_devices: HeatingRodRuntimeDevice[];', 'typisierte Geräteliste');
  requireContains(source, '_stageCtl: Map<string, HeatingRodStageControlState>;', 'typisierte Stufensteuerung');
  requireContains(source, '_budgetProtect: HeatingRodBudgetProtectState;', 'typisierter Budgetschutz');
  requireContains(source, 'async _applyStageState(d, targetStage, feedback, options: HeatingRodApplyStageOptions = {})', 'typisierte Apply-Stage-Optionen');
  const { tempDir, tempConfig } = buildTemporaryCheckFiles(source);
  const result = spawnTypeScript(repoRoot, ['-p', tempConfig, '--pretty', 'false'], { cwd: repoRoot, encoding: 'utf8' });
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (_e) {}
  if (result.status !== 0) {
    writeTypeScriptSpawnDiagnostics(result);
    throw new Error('[ts-heating-rod-runtime-typing] Heizstab-TS-Spiegel ist ohne @ts-nocheck noch nicht kompilierbar.');
  }
  console.log('[ts-heating-rod-runtime-typing] OK: Heizstab-Spiegel ist gezielt typisiert und in gelockertem Migrationsmodus kompilierbar.');
}

try { main(); } catch (err) { console.error(err && err.message ? err.message : err); process.exit(1); }
