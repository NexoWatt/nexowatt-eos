#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-app-runtime-typing.js
 *
 * Zweck:
 * Prüft den gezielten TypeScript-Migrationsschritt für das Kunden-LIVE-Dashboard
 * `src-ts/runtime-mirrors/www/app.ts`.
 *
 * Zusammenhang:
 * Das Kundenfrontend läuft produktiv weiterhin über `www/app.js`. Dieser Check
 * kompiliert nur den Vertragsbereich vor der Browser-Runtime. Dadurch können
 * Energiefluss-Anzeige, KPI-Werte, Feature-Sichtbarkeit, Wetter, KI-Berater,
 * Modals und Schnellsteuerungen typisiert abgesichert werden, ohne das produktive
 * Kundencockpit schon umzuschalten.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');
const { spawnTypeScript, writeTypeScriptSpawnDiagnostics } = require('./typescript-invocation');

const repoRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(repoRoot, 'src-ts', 'runtime-mirrors', 'www', 'app.ts');

function requireContains(source, marker, label) {
  if (!source.includes(marker)) throw new Error(`[ts-app-runtime-typing] Missing ${label}: ${marker}`);
}


function extractAppTypeBlock(source) {
  const start = source.indexOf('type AppRuntimeDatapointKey');
  const end = source.indexOf('/**\n * App-Browser-Runtime-Abschnitt', start);
  if (start < 0 || end < 0) throw new Error('[ts-app-runtime-typing] App-Typblock konnte nicht extrahiert werden.');
  return source.slice(start, end);
}

function buildTemporaryCheckFiles(source) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexowatt-app-ts-'));
  const tempSource = path.join(tempDir, 'app-types-check.ts');
  const tempConfig = path.join(tempDir, 'tsconfig.json');
  const typeBlock = extractAppTypeBlock(source);
  const harness = `${typeBlock}\n\n` + `
const stateEntry: AppRuntimeStateEntry<number> = { value: 0, ts: Date.now(), ack: true };
const states: AppRuntimeStateCache = { storageChargePower: stateEntry, aiAdvisorEnabled: { value: false } };
const apiState: AppApiStateResponse = { states };
const features: AppFeatureVisibilityState = { hasEvcs: false, hasStorageFarm: false, hasSmartHome: true, hasWeather: true, hasAiAdvisor: false, hasTariff: true };
const config: AppConfigResponse = { featureVisibility: features as unknown as Partial<AppFeatureVisibilityState> & Record<string, unknown>, tsMigration: { energyFlowMode: 'shadow' } };
const storageCharge: AppEnergyFlowDisplayValue = { watt: 2800, unit: 'W', label: 'Speicher lädt', direction: 'charge', source: 'split' };
const storage: AppStorageDisplayState = { chargeW: 2800, dischargeW: 0, signedW: -2800, socPct: 44, source: 'split' };
const flow: AppEnergyFlowDisplaySnapshot = {
  pvW: 6500,
  buildingLoadW: 1700,
  gridImportW: 0,
  gridExportW: 2000,
  storageChargeW: 2800,
  storageDischargeW: 0,
  storageSocPct: 44,
  evcsW: 0,
  source: 'js-runtime',
  storageCharge,
};
const kpis: AppKpiDisplayState = { autarkyPct: 100, selfConsumptionPct: 69, storageSocPct: 44, gridImportW: 0, gridExportW: 2000 };
const weather: AppWeatherDisplayState = { enabled: true, temperatureC: 21, text: 'Sonnig' };
const ai: AppAiAdvisorDisplayState = { enabled: true, visible: false, suggestions: [] };
const tile: AppQuickTileState = { id: 'settings', kind: 'settings', visible: true, label: 'Einstellungen', title: 'Einstellungen' };
const quick: AppQuickControlContext = { id: 'quick1', title: 'Schnellzugriff' };
const cmd: AppRuntimeWriteRequest = { scope: 'settings', key: 'aiAdvisorEnabled', value: false };
const runtime: AppDashboardRuntimeState = { latestState: states, config, visibility: features, energyFlow: flow, kpi: kpis, weather, aiAdvisor: ai };
const refs: AppDomRefs = { liveDot: null, energyWebSvg: null, aiAdvisorCard: null, weatherTile: null, evcsCard: null, storageFarmTab: null };
void runtime; void tile; void quick; void cmd; void refs; void storage; void apiState;
`;  fs.writeFileSync(tempSource, harness, 'utf8');
  fs.writeFileSync(tempConfig, JSON.stringify({
    extends: path.join(repoRoot, 'tsconfig.base.json'),
    compilerOptions: { noEmit: true, strict: true, exactOptionalPropertyTypes: false, module: 'NodeNext', moduleResolution: 'nodenext', lib: ['ES2022', 'DOM'], types: [] },
    files: [tempSource]
  }, null, 2), 'utf8');
  return { tempDir, tempConfig };
}

function main() {
  const source = fs.readFileSync(sourcePath, 'utf8');
  requireContains(source, 'App Runtime-Migrationshinweis (DE)', 'deutscher App-Migrationskommentar');
  requireContains(source, 'type AppRuntimeDatapointKey', 'State-Key-Vertrag');
  requireContains(source, 'interface AppRuntimeStateEntry', 'StateEntry-Vertrag');
  requireContains(source, 'interface AppApiStateResponse', 'API-State-Vertrag');
  requireContains(source, 'interface AppFeatureVisibilityState', 'Feature-Sichtbarkeit-Vertrag');
  requireContains(source, 'interface AppConfigResponse', 'Config-Vertrag');
  requireContains(source, 'interface AppEnergyFlowDisplaySnapshot', 'Energiefluss-Anzeigevertrag');
  requireContains(source, 'type AppKpiDisplayState', 'KPI-Vertrag');
  requireContains(source, 'interface AppWeatherDisplayState', 'Wetter-Vertrag');
  requireContains(source, 'interface AppAiAdvisorDisplayState', 'KI-Berater-Vertrag');
  requireContains(source, 'interface AppDomRefs', 'DOM-Vertrag');
  requireContains(source, '0 W', 'kritische 0-W-Regel');
  requireContains(source, 'App-Browser-Runtime-Abschnitt', 'Runtime-Marker');
  const { tempDir, tempConfig } = buildTemporaryCheckFiles(source);
  const result = spawnTypeScript(repoRoot, ['-p', tempConfig, '--pretty', 'false'], { cwd: repoRoot, encoding: 'utf8' });
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (_e) {}
  if (result.status !== 0) {
    writeTypeScriptSpawnDiagnostics(result);
    throw new Error('[ts-app-runtime-typing] Vertragsbereich ist ohne @ts-nocheck noch nicht kompilierbar.');
  }
  console.log('[ts-app-runtime-typing] OK: LIVE-App-Spiegel ist gezielt typisiert und der Vertragsbereich ist kompilierbar.');
}

try { main(); } catch (err) { console.error(err && err.message ? err.message : err); process.exit(1); }
