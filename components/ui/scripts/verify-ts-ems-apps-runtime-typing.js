#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-ems-apps-runtime-typing.js
 *
 * Zweck:
 * Prüft den gezielten TypeScript-Migrationsschritt für das App-Center-Frontend
 * `src-ts/runtime-mirrors/www/ems-apps.ts`.
 *
 * Zusammenhang:
 * Die produktive Installer-/App-Center-Seite läuft weiterhin über `www/ems-apps.js`.
 * Dieser Check kompiliert nur den Vertragsbereich vor der Browser-Runtime. Dadurch
 * können wir Config-Patches, DP-Mapping, Heizstab-, KI-, Speicherfarm-, TS-Schaltmodus-
 * und Diagnose-Strukturen absichern, ohne die komplette DOM-Runtime in einem Schritt
 * streng zu typisieren.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');
const { spawnTypeScript, writeTypeScriptSpawnDiagnostics } = require('./typescript-invocation');

const repoRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(repoRoot, 'src-ts', 'runtime-mirrors', 'www', 'ems-apps.ts');

/**
 * Code-Teil: requireContains
 * Zweck: Bricht ab, wenn ein erwarteter Kommentar- oder Typanker fehlt.
 */
function requireContains(source, marker, label) {
  if (!source.includes(marker)) throw new Error(`[ts-ems-apps-runtime-typing] Missing ${label}: ${marker}`);
}

/**
 * Code-Teil: resolveTypeScriptBinary
 * Zweck: Nutzt bevorzugt den lokalen TypeScript-Compiler, fällt aber auf `tsc` aus PATH zurück.
 */

/**
 * Code-Teil: extractEmsAppsTypeBlock
 * Zweck: Extrahiert nur den Vertragsbereich vor der großen Browser-Runtime-IIFE.
 */
function extractEmsAppsTypeBlock(source) {
  const start = source.indexOf('type EmsAppsId');
  const end = source.indexOf('/**\n * EmsApps-Browser-Runtime-Abschnitt', start);
  if (start < 0 || end < 0) throw new Error('[ts-ems-apps-runtime-typing] Typblock konnte nicht extrahiert werden.');
  return source.slice(start, end);
}

/**
 * Code-Teil: buildTemporaryCheckFiles
 * Zweck: Baut einen kleinen TypeScript-Harness, der die neuen Verträge real verwendet.
 */
function buildTemporaryCheckFiles(source) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexowatt-emsapps-ts-'));
  const tempSource = path.join(tempDir, 'ems-apps-types-check.ts');
  const tempConfig = path.join(tempDir, 'tsconfig.json');
  const typeBlock = extractEmsAppsTypeBlock(source);
  const harness = `${typeBlock}\n\n` + `
const dpMap: EmsAppsDatapointMap = { pvPower: 'alias.0.pv.power', storageSoc: 'alias.0.storage.soc' };
const installer: EmsAppsInstallerConfig = { gridConnectionPower: 30000, schedulerIntervalMs: 1000 };
const app: EmsAppsFeatureDefinition = { id: 'aiAdvisor', enabled: true, installed: true, visible: true };
const storage: EmsAppsStorageConfig = { controlMode: 'targetPower', capacityKWh: 20, datapoints: { soc: 'alias.0.storage.soc' } };
const farm: EmsAppsStorageFarmConfig = { mode: 'pool', storages: [{ id: 'bat1', name: 'Speicher 1', enabled: true, socId: 'alias.0.bat1.soc' }] };
const stage: EmsAppsHeatingRodStageConfig = { id: 's1', label: 'Stufe 1', powerW: 1000, writeId: 'alias.0.hr.s1', enabled: true };
const heatingRod: EmsAppsHeatingRodConfig = { enabled: true, reserveW: 1000, devices: [{ id: 'hr1', name: 'Heizstab', enabled: true, stages: [stage] }] };
const ai: EmsAppsAiAdvisorConfig = { enabled: true, showOnLive: true, intervalSec: 60, categories: { peak: true, weather: true } };
const ts: EmsAppsTsMigrationConfig = { energyFlowMode: 'shadow', energyFlowProductionAllowed: false, energyFlowRequireStablePlant: true };
const cfg: EmsAppsConfigRoot = { installerConfig: installer, emsApps: { apps: { aiAdvisor: app } }, datapoints: dpMap, storage, storageFarm: farm, heatingRod, aiAdvisor: ai, tsMigration: ts };
const patch: EmsAppsConfigPatch = { datapoints: dpMap, heatingRod, aiAdvisor: { maxSuggestions: 6 } };
const response: EmsAppsInstallerConfigResponse = { ok: true, config: cfg, diagnostics: { shadow: 'ok' } };
const shadow: EmsAppsShadowDiagnosticCard = { status: 'ok', ok: true, mismatches: [], blockers: [], warnings: [] };
const runtime: EmsAppsRuntimeState = { currentConfig: cfg, dirty: false, statusTone: 'ok', shadowDiagnostics: { coreLimits: shadow } };
const refs: EmsAppsDomRefs = { status: null, save: null, gridConnectionPower: null };
void response; void patch; void runtime; void refs;
`;
  fs.writeFileSync(tempSource, harness, 'utf8');
  fs.writeFileSync(tempConfig, JSON.stringify({
    extends: path.join(repoRoot, 'tsconfig.base.json'),
    compilerOptions: { noEmit: true, strict: true, exactOptionalPropertyTypes: false, module: 'NodeNext', moduleResolution: 'nodenext', lib: ['ES2022', 'DOM'], types: [] },
    files: [tempSource]
  }, null, 2), 'utf8');
  return { tempDir, tempConfig };
}

function main() {
  const source = fs.readFileSync(sourcePath, 'utf8');
  requireContains(source, 'EmsApps Runtime-Migrationshinweis (DE)', 'Migrationskommentar');
  requireContains(source, 'type EmsAppsId', 'ID-Vertrag');
  requireContains(source, 'type EmsAppsEnergyFlowTsMode', 'TS-Schaltmodus-Vertrag');
  requireContains(source, 'interface EmsAppsDatapointBinding', 'DP-Bindung-Vertrag');
  requireContains(source, 'interface EmsAppsConfigRoot', 'ConfigRoot-Vertrag');
  requireContains(source, 'interface EmsAppsConfigPatch', 'ConfigPatch-Vertrag');
  requireContains(source, 'interface EmsAppsDomRefs', 'DOM-Vertrag');
  requireContains(source, 'interface EmsAppsRuntimeState', 'Runtime-State-Vertrag');
  requireContains(source, 'EmsApps-Browser-Runtime-Abschnitt', 'Runtime-Marker');
  const { tempDir, tempConfig } = buildTemporaryCheckFiles(source);
  const result = spawnTypeScript(repoRoot, ['-p', tempConfig, '--pretty', 'false'], { cwd: repoRoot, encoding: 'utf8' });
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (_e) {}
  if (result.status !== 0) {
    writeTypeScriptSpawnDiagnostics(result);
    throw new Error('[ts-ems-apps-runtime-typing] Vertragsbereich ist ohne @ts-nocheck noch nicht kompilierbar.');
  }
  console.log('[ts-ems-apps-runtime-typing] OK: App-Center-Spiegel ist gezielt typisiert und der Vertragsbereich ist kompilierbar.');
}

try { main(); } catch (err) { console.error(err && err.message ? err.message : err); process.exit(1); }
