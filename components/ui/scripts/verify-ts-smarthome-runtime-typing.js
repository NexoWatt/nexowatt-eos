#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-smarthome-runtime-typing.js
 *
 * Zweck:
 * Prüft den gezielten TypeScript-Migrationsschritt für den SmartHome-Spiegel
 * `src-ts/runtime-mirrors/www/smarthome.ts`.
 *
 * Zusammenhang:
 * Die produktive Kundenansicht läuft weiter über `www/smarthome.js`. Dieser Check
 * extrahiert nur den neuen Vertragsbereich und kompiliert ihn ohne `@ts-nocheck`.
 * Dadurch prüfen wir die Datenmodelle, ohne die große DOM-/Popover-Runtime in einem
 * einzigen Schritt streng zu typisieren.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');
const { spawnTypeScript, writeTypeScriptSpawnDiagnostics } = require('./typescript-invocation');

const repoRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(repoRoot, 'src-ts', 'runtime-mirrors', 'www', 'smarthome.ts');

/**
 * Code-Teil: requireContains
 *
 * Zweck:
 * Stellt sicher, dass die fachlichen SmartHome-Verträge und Migrationskommentare nicht
 * versehentlich durch einen rohen Spiegel-Sync überschrieben wurden.
 */
function requireContains(source, marker, label) {
  if (!source.includes(marker)) {
    throw new Error(`[ts-smarthome-runtime-typing] Missing ${label}: ${marker}`);
  }
}

/**
 * Code-Teil: resolveTypeScriptBinary
 *
 * Zweck:
 * Nutzt bevorzugt den lokalen TypeScript-Compiler. Der Check gehört zur Migration und
 * ändert keine produktive Adapter-Runtime.
 */

/**
 * Code-Teil: extractSmartHomeTypeBlock
 *
 * Zweck:
 * Extrahiert nur den neuen Typvertragsbereich vor der bestehenden Browser-Runtime.
 * Damit prüfen wir genau die Migrationsverträge, ohne die komplette Legacy-DOM-Datei
 * sofort streng typisieren zu müssen.
 */
function extractSmartHomeTypeBlock(source) {
  const start = source.indexOf('type SmartHomeDeviceType');
  const end = source.indexOf('/**\n * SmartHome-Browser-Runtime-Abschnitt', start);
  if (start < 0 || end < 0) {
    throw new Error('[ts-smarthome-runtime-typing] SmartHome-Typblock konnte nicht extrahiert werden.');
  }
  return source.slice(start, end);
}

/**
 * Code-Teil: buildTemporaryCheckFiles
 *
 * Zweck:
 * Baut einen temporären TypeScript-Harness, der die SmartHome-Verträge mit Beispielwerten
 * nutzt. Dadurch erkennt TypeScript, ob die neuen Interfaces und Union-Typen konsistent sind.
 */
function buildTemporaryCheckFiles(source) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexowatt-smarthome-ts-'));
  const tempSource = path.join(tempDir, 'smarthome-types-check.ts');
  const tempConfig = path.join(tempDir, 'tsconfig.json');
  const typeBlock = extractSmartHomeTypeBlock(source);
  const harness = `${typeBlock}\n\n` + `
const device: SmartHomeDeviceView = {
  id: 'light-1',
  name: 'Küche Licht',
  type: 'dimmer',
  roomId: 'room-kitchen',
  floorId: 'floor-ground',
  state: { on: true, level: 0 },
  io: { level: { id: 'alias.0.light.level', min: 0, max: 100, step: 1 } },
  ui: { unit: '%', precision: 0 },
  behavior: { canWrite: true, allowTimer: true },
  timer: { enabled: false },
};
const room: SmartHomeRoomMeta = { id: 'room-kitchen', name: 'Küche', floorId: 'floor-ground' };
const floor: SmartHomeFloorMeta = { id: 'floor-ground', name: 'Erdgeschoss', roomIds: [room.id] };
const structure: SmartHomeStructureMeta = { floorsById: { [floor.id]: floor }, roomsById: { [room.id]: room }, roomIdByName: { [room.name]: room.id } };
const group: SmartHomeGroup = { id: 'g1', title: 'Küche', roomId: room.id, devices: [device] };
const view: SmartHomeViewState = { mode: 'rooms', activeRoomId: room.id };
const filters: SmartHomeFilterState = { roomId: room.id, favoritesOnly: false, type: 'dimmer' };
const options: SmartHomeTileOptions = { showRoom: true, source: 'room' };
const popover: SmartHomePopoverContext = { device, anchor: null, openedAtMs: Date.now() };
const response: SmartHomeApiDevicesResponse = { ok: true, devices: [device] };
const cmd: SmartHomeCommandRequest = { deviceId: device.id, command: 'level', value: 0, source: 'popover' };
void structure;
void group;
void view;
void filters;
void options;
void popover;
void response;
void cmd;
`;
  fs.writeFileSync(tempSource, harness, 'utf8');
  fs.writeFileSync(tempConfig, JSON.stringify({
    extends: path.join(repoRoot, 'tsconfig.base.json'),
    compilerOptions: {
      noEmit: true,
      strict: true,
      module: 'NodeNext',
      moduleResolution: 'nodenext',
      lib: ['ES2022', 'DOM'],
      types: []
    },
    files: [tempSource]
  }, null, 2), 'utf8');
  return { tempDir, tempConfig };
}

function main() {
  const source = fs.readFileSync(sourcePath, 'utf8');
  requireContains(source, 'SmartHome Runtime-Migrationshinweis (DE)', 'deutscher SmartHome-Migrationskommentar');
  requireContains(source, 'type SmartHomeDeviceType', 'SmartHomeDeviceType-Vertrag');
  requireContains(source, 'interface SmartHomeDeviceState', 'SmartHomeDeviceState-Vertrag');
  requireContains(source, 'interface SmartHomeDeviceView', 'SmartHomeDeviceView-Vertrag');
  requireContains(source, 'interface SmartHomeRoomMeta', 'SmartHomeRoomMeta-Vertrag');
  requireContains(source, 'interface SmartHomeFloorMeta', 'SmartHomeFloorMeta-Vertrag');
  requireContains(source, 'interface SmartHomeStructureMeta', 'SmartHomeStructureMeta-Vertrag');
  requireContains(source, 'interface SmartHomeGroup', 'SmartHomeGroup-Vertrag');
  requireContains(source, 'interface SmartHomeTileOptions', 'SmartHomeTileOptions-Vertrag');
  requireContains(source, 'interface SmartHomePopoverContext', 'SmartHomePopoverContext-Vertrag');
  requireContains(source, 'interface SmartHomeApiDevicesResponse', 'API-Antwort-Vertrag');
  requireContains(source, 'SmartHome-Browser-Runtime-Abschnitt', 'Runtime-Migrationsmarker');

  const { tempDir, tempConfig } = buildTemporaryCheckFiles(source);
  const result = spawnTypeScript(repoRoot, ['-p', tempConfig, '--pretty', 'false'], { cwd: repoRoot, encoding: 'utf8' });
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (_e) {}
  if (result.status !== 0) {
    writeTypeScriptSpawnDiagnostics(result);
    throw new Error('[ts-smarthome-runtime-typing] SmartHome-Vertragsbereich ist ohne @ts-nocheck noch nicht kompilierbar.');
  }
  console.log('[ts-smarthome-runtime-typing] OK: SmartHome-Spiegel ist gezielt typisiert und der Vertragsbereich ist kompilierbar.');
}

try { main(); } catch (err) { console.error(err && err.message ? err.message : err); process.exit(1); }
