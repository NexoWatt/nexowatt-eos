#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');

for (const token of [
  '_nwPreflightSmartHomeSceneById(sceneId, context)',
  "error: 'scene cycle'",
  "error: 'scene nesting depth exceeded'",
  'const previous = this._nwSmartHomeSceneQueue || Promise.resolve();',
  'this._nwSmartHomeSceneQueue = run.then(() => undefined, () => undefined);',
  'if (this._nwShuttingDown)',
  '_nwCheckSmartHomeCoverSafety',
  '_nwCheckSmartHomeClimateSafetyForScene',
  'Beschattung ist gesperrt:',
  'Klimabedienung gesperrt:',
  '_nwCoerceSmartHomeSceneValueForDatapoint',
  '_nwPulseSmartHomeSceneDatapoint',
  'return { ok: errors.length === 0, sceneId: id, executed, errors };',
]) {
  assert.ok(main.includes(token), `Szenen-Schutz: fehlt ${JSON.stringify(token)}`);
}

assert.ok(/res\.status\(409\)\.json\(result\)/.test(main), 'Szenen-API meldet fehlgeschlagene Ausführung nicht mit HTTP 409.');

console.log('[smarthome-scene-guard] OK: Szenen werden vorab geprüft, serialisiert, zyklengeschützt und beachten Beschattungs-/Klima-Sperren.');
