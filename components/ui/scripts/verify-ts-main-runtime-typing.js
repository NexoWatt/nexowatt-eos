#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-main-runtime-typing.js
 *
 * Zweck:
 * Prüft den gezielten TypeScript-Migrationsschritt für den Adapter-Haupteinstieg
 * `src-ts/runtime-mirrors/main.ts`.
 *
 * Zusammenhang:
 * Die produktive Runtime läuft weiterhin über `main.js`. Dieser Check kompiliert nur
 * den neuen Vertragsbereich vor der großen Adapterklasse. Dadurch können Webserver,
 * API-Routen, StateCache, Lizenz, Feature-Sichtbarkeit, SSE und `info.connection`
 * typisiert vorbereitet werden, ohne den laufenden Adapter umzuschalten.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');
const { spawnTypeScript, writeTypeScriptSpawnDiagnostics } = require('./typescript-invocation');

const repoRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(repoRoot, 'src-ts', 'runtime-mirrors', 'main.ts');

function requireContains(source, marker, label) {
  if (!source.includes(marker)) throw new Error(`[ts-main-runtime-typing] Missing ${label}: ${marker}`);
}
function extractMainTypeBlock(source) {
  const start = source.indexOf('type MainRuntimeJsonPrimitive');
  const end = source.indexOf('const utils = require', start);
  if (start < 0 || end < 0) throw new Error('[ts-main-runtime-typing] Main-Typblock konnte nicht extrahiert werden.');
  return source.slice(start, end);
}
function buildTemporaryCheckFiles(source) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexowatt-main-ts-'));
  const tempSource = path.join(tempDir, 'main-types-check.ts');
  const tempConfig = path.join(tempDir, 'tsconfig.json');
  const typeBlock = extractMainTypeBlock(source);
  const harness = `${typeBlock}\n\n` + `
const stateValue: MainAdapterStateValue<number> = { value: 0, ts: Date.now(), ack: true };
const stateCache: MainStateCache = { storageChargePower: stateValue, evcsAvailable: { value: false } };
const binding: MainDatapointBinding = { key: 'storageSoc', id: 'system.adapter.example.storage.soc', enabled: true };
const config: MainAdapterConfig = { port: 8188, bind: '0.0.0.0', licenseKey: '', datapoints: { storageSoc: binding }, installerConfig: { gridConnectionPower: 30000 }, tsMigration: { energyFlowMode: 'shadow', energyFlowProductionAllowed: false } };
const adapter: MainAdapterLike = { config, stateCache, log: { info: (_message: string) => {}, warn: (_message: string) => {}, error: (_message: string) => {} } };
const apiState: MainApiStateResponse = { states: stateCache, config, ts: Date.now() };
const cfgResponse: MainConfigResponse = { ok: true, featureVisibility: { hasEvcs: false, hasStorageFarm: false, hasSmartHome: true, hasWeather: true, hasAiAdvisor: false }, tsMigration: config.tsMigration };
const setRequest: MainApiSetRequest<boolean> = { scope: 'settings', key: 'aiAdvisorEnabled', value: false };
const setResult: MainApiSetResult<boolean> = { ok: true, key: 'aiAdvisorEnabled', stateId: 'settings.aiAdvisorEnabled', value: false };
const sse: MainSseClient = { res: { write: (_chunk: string) => undefined } };
const web: MainWebServerState = { sockets: new Set(), sseClients: new Set([sse]), closing: false, port: 8188, bind: '0.0.0.0' };
const connection: MainConnectionUpdate = { online: true, reason: 'server-listening', ts: Date.now() };
const license: MainLicenseRuntimeState = { ok: false, status: 'missing', keyPresent: false, keyMasked: false };
const switchDecision: MainEnergyFlowSwitchDecision = { requestedMode: 'shadow', effectiveSource: 'js-runtime', useTs: false, productionAllowed: false, shadowOk: true, candidateOk: false, plantGateOk: false, blockers: [], warnings: [], reason: 'shadow-only' };
const patch: MainInstallerConfigPatch = { tsMigration: config.tsMigration, datapoints: config.datapoints };
const internals: MainRuntimeInternals = { stateCache, _nwRawValueCache: {}, sseClients: new Set([sse]), _serverSockets: new Set(), _serverClosing: false, _nwShuttingDown: false, _nwShutdownStartedAt: 0, _nwConnectionOnline: true, _nwLicenseOk: true, _nwSystemUuid: 'system', emsEngine: null, logicEngine: null };
void adapter; void apiState; void cfgResponse; void setRequest; void setResult; void web; void connection; void license; void switchDecision; void patch; void internals;
`;
  fs.writeFileSync(tempSource, harness, 'utf8');
  fs.writeFileSync(tempConfig, JSON.stringify({
    extends: path.join(repoRoot, 'tsconfig.base.json'),
    compilerOptions: { noEmit: true, strict: true, exactOptionalPropertyTypes: false, module: 'NodeNext', moduleResolution: 'nodenext', lib: ['ES2022'], types: [] },
    files: [tempSource]
  }, null, 2), 'utf8');
  return { tempDir, tempConfig };
}
function main() {
  const source = fs.readFileSync(sourcePath, 'utf8');
  requireContains(source, 'Main Runtime-Migrationshinweis (DE)', 'deutscher Main-Migrationskommentar');
  requireContains(source, 'type MainRuntimeJsonPrimitive', 'JSON-Vertrag');
  requireContains(source, 'interface MainAdapterStateValue', 'StateValue-Vertrag');
  requireContains(source, 'type MainStateCache', 'StateCache-Vertrag');
  requireContains(source, 'interface MainAdapterConfig', 'AdapterConfig-Vertrag');
  requireContains(source, 'interface MainAdapterLike', 'AdapterLike-Vertrag');
  requireContains(source, 'interface MainApiStateResponse', 'API-State-Vertrag');
  requireContains(source, 'interface MainConfigResponse', 'Config-Response-Vertrag');
  requireContains(source, 'interface MainApiSetRequest', 'API-Set-Vertrag');
  requireContains(source, 'interface MainSseClient', 'SSE-Vertrag');
  requireContains(source, 'interface MainWebServerState', 'Webserver-Vertrag');
  requireContains(source, 'interface MainConnectionUpdate', 'info.connection-Vertrag');
  requireContains(source, 'interface MainLicenseRuntimeState', 'Lizenz-Vertrag');
  requireContains(source, 'interface MainEnergyFlowSwitchDecision', 'TS-Energiefluss-Schaltvertrag');
  requireContains(source, 'interface MainInstallerConfigPatch', 'Installer-Patch-Vertrag');
  requireContains(source, 'interface MainRuntimeInternals', 'Runtime-Internals-Vertrag');
  requireContains(source, '0, false und leere Arrays', 'kritische 0/false-Regel');
  requireContains(source, 'API-Antworten sind Verträge', 'API-Vertragskommentar');
  requireContains(source, 'class NexoWattVis extends utils.Adapter', 'Adapter-Klasse');
  const { tempDir, tempConfig } = buildTemporaryCheckFiles(source);
  const result = spawnTypeScript(repoRoot, ['-p', tempConfig, '--pretty', 'false'], { cwd: repoRoot, encoding: 'utf8' });
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (_e) {}
  if (result.status !== 0) {
    writeTypeScriptSpawnDiagnostics(result);
    throw new Error('[ts-main-runtime-typing] Vertragsbereich ist ohne @ts-nocheck noch nicht kompilierbar.');
  }
  console.log('[ts-main-runtime-typing] OK: Main-Spiegel ist gezielt typisiert und der Vertragsbereich ist kompilierbar.');
}
try { main(); } catch (err) { console.error(err && err.message ? err.message : err); process.exit(1); }
