#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-smarthome-config-runtime-typing.js
 *
 * Zweck:
 * Prüft den gezielten TypeScript-Migrationsschritt für den SmartHome-Installer-Spiegel
 * `src-ts/runtime-mirrors/www/smarthome-config.ts`.
 *
 * Zusammenhang:
 * Die produktive Installer-Konfiguration läuft weiterhin über `www/smarthome-config.js`.
 * Dieser Check kompiliert nur den Vertragsbereich vor der DOM-/Builder-Runtime. Dadurch
 * können wir Gebäude, Räume, Geräte, Funktionen, Timer, Logik-Uhren und Auto-Erkennung
 * absichern, ohne die komplette UI-Runtime in einem Schritt streng zu typisieren.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');
const { spawnTypeScript, writeTypeScriptSpawnDiagnostics } = require('./typescript-invocation');

const repoRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(repoRoot, 'src-ts', 'runtime-mirrors', 'www', 'smarthome-config.ts');

/**
 * Code-Teil: requireContains
 * Zweck: Bricht ab, wenn ein erwarteter Vertragsanker fehlt.
 */
function requireContains(source, marker, label) {
  if (!source.includes(marker)) throw new Error(`[ts-smarthome-config-runtime-typing] Missing ${label}: ${marker}`);
}

/**
 * Code-Teil: resolveTypeScriptBinary
 * Zweck: Nutzt bevorzugt den lokalen TypeScript-Compiler aus `node_modules`.
 */

/**
 * Code-Teil: extractSmartHomeConfigTypeBlock
 * Zweck: Extrahiert nur den Vertragsbereich vor der Browser-Runtime.
 */
function extractSmartHomeConfigTypeBlock(source) {
  const start = source.indexOf('type SmartHomeConfigId');
  const end = source.indexOf('/**\n * SmartHome-Config-Browser-Runtime-Abschnitt', start);
  if (start < 0 || end < 0) throw new Error('[ts-smarthome-config-runtime-typing] Typblock konnte nicht extrahiert werden.');
  return source.slice(start, end);
}

/**
 * Code-Teil: buildTemporaryCheckFiles
 * Zweck: Baut einen kleinen TypeScript-Harness, der die neuen Verträge real verwendet.
 */
function buildTemporaryCheckFiles(source) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexowatt-smarthome-config-ts-'));
  const tempSource = path.join(tempDir, 'smarthome-config-types-check.ts');
  const tempConfig = path.join(tempDir, 'tsconfig.json');
  const typeBlock = extractSmartHomeConfigTypeBlock(source);
  const harness = `${typeBlock}\n\n` + `
const dp: SmartHomeConfigDatapointBinding = { id: 'alias.0.light.level', type: 'number', unit: '%', min: 0, max: 100, step: 1, invert: false, write: true };
const fn: SmartHomeConfigFunction = { id: 'fn-dimmer', name: 'Dimmer', type: 'dimmer', datapointId: 'alias.0.light.level', unit: '%', min: 0, max: 100 };
const floor: SmartHomeConfigFloor = { id: 'floor-ground', name: 'Erdgeschoss', roomIds: ['room-kitchen'] };
const room: SmartHomeConfigRoom = { id: 'room-kitchen', name: 'Küche', floorId: floor.id, visible: true };
const device: SmartHomeConfigDevice = { id: 'dev-light-1', name: 'Küche Licht', type: 'dimmer', roomId: room.id, floorId: floor.id, functionId: fn.id, enabled: false, io: { level: dp }, ui: { unit: '%', precision: 0, size: 'm' }, behavior: { canWrite: true, allowTimer: true } };
const scene: SmartHomeConfigScene = { id: 'scene-off', name: 'Alles aus', actions: [{ deviceId: device.id, command: 'level', value: 0 }] };
const page: SmartHomeConfigPage = { id: 'home', title: 'Start', roomIds: [room.id], deviceIds: [device.id] };
const timer: SmartHomeConfigTimer = { id: 'timer-1', deviceId: device.id, enabled: false, time: '07:00', command: 'level', value: 0 };
const clock: SmartHomeLogicClock = { id: 'clock-1', name: 'Tagbetrieb', enabled: true, start: '06:00', end: '22:00' };
const suggestion: SmartHomeDetectorSuggestion = { id: 'alias.0.light.level', name: 'Licht erkannt', confidence: 0, alreadyConfigured: false };
const detector: SmartHomeDetectorState = { loaded: true, loading: false, error: '', filterText: '', showConfigured: false, scannedAt: 0, results: [suggestion], assignments: {} };
const doc: SmartHomeConfigDocument = { rooms: [room], functions: [fn], devices: [device], scenes: [scene], pages: [page], floors: [floor], meta: { version: 1 } };
const validation: SmartHomeConfigValidationResult = { ok: true, issues: [] };
const response: SmartHomeConfigApiResponse = { ok: true, config: doc, validation };
const save: SmartHomeConfigSaveRequest = { config: doc, source: 'installer' };
const state: SmartHomeConfigStateShape = { config: doc, originalJson: JSON.stringify(doc), dirty: false, validation, pagesJsonText: '[]', pagesJsonValid: true, pagesDraft: [page], pagesUi: { tab: 'builder', selectedId: page.id, isNew: false, idManuallyEdited: false }, ui: null, timers: { loaded: true, loading: false, dirty: false, devices: [device], config: { version: 1, updatedAt: 0, timers: [timer] }, map: { [timer.id]: [timer] } }, logicClocks: { loaded: true, loading: false, dirty: false, config: { version: 1, updatedAt: 0, clocks: [clock] }, map: { [clock.id]: clock } }, detector };
void response; void save; void state;
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
  requireContains(source, 'SmartHomeConfig Runtime-Migrationshinweis (DE)', 'Migrationskommentar');
  requireContains(source, 'type SmartHomeConfigId', 'ID-Vertrag');
  requireContains(source, 'type SmartHomeConfigDeviceType', 'Gerätetyp-Vertrag');
  requireContains(source, 'interface SmartHomeConfigDatapointBinding', 'DP-Bindung-Vertrag');
  requireContains(source, 'interface SmartHomeConfigDevice', 'Geräte-Vertrag');
  requireContains(source, 'interface SmartHomeConfigRoom', 'Raum-Vertrag');
  requireContains(source, 'interface SmartHomeConfigFloor', 'Etagen-Vertrag');
  requireContains(source, 'interface SmartHomeConfigPage', 'Seiten-Vertrag');
  requireContains(source, 'interface SmartHomeDetectorSuggestion', 'Auto-Erkennung-Vertrag');
  requireContains(source, 'interface SmartHomeConfigStateShape', 'Runtime-State-Vertrag');
  requireContains(source, 'SmartHome-Config-Browser-Runtime-Abschnitt', 'Runtime-Marker');
  const { tempDir, tempConfig } = buildTemporaryCheckFiles(source);
  const result = spawnTypeScript(repoRoot, ['-p', tempConfig, '--pretty', 'false'], { cwd: repoRoot, encoding: 'utf8' });
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (_e) {}
  if (result.status !== 0) {
    writeTypeScriptSpawnDiagnostics(result);
    throw new Error('[ts-smarthome-config-runtime-typing] Vertragsbereich ist ohne @ts-nocheck noch nicht kompilierbar.');
  }
  console.log('[ts-smarthome-config-runtime-typing] OK: SmartHome-Config-Spiegel ist gezielt typisiert und der Vertragsbereich ist kompilierbar.');
}

try { main(); } catch (err) { console.error(err && err.message ? err.message : err); process.exit(1); }
