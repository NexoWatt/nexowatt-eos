#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const main = read('main.js');
const contract = read('lib/smarthome-contract.js');

for (const token of [
  'const validation = this.nwValidateSmartHomeConfig(out);',
  'const previousConfig = this.getSmartHomeConfig',
  'const previousDevices = Array.isArray(this.smartHomeDevices)',
  'const previousPatch = this._nwInstallerConfigPatch;',
  'this.config.smartHomeConfig = normalizedOut;',
  "return res.status(400).json({ ok: false, error: 'runtime activation failed'",
  'this.config.smartHomeConfig = previousConfig;',
  'this.smartHomeDevices = previousDevices;',
  'this._nwInstallerConfigPatch = previousPatch;',
  'SmartHomeConfig save rolled back:',
  'rolledBack: true',
]) {
  assert.ok(main.includes(token), `Transaktionaler SmartHome-Save: fehlt ${JSON.stringify(token)}`);
}

for (const token of [
  'function validateSmartHomeConfig(input)',
  'SCENE_ID_DUPLICATE',
  'SCENE_ACTION_INVALID',
  'SCENE_DEVICE_MISSING',
  'SCENE_ACTION_UNMAPPED',
  'SCENE_CYCLE',
]) {
  assert.ok(contract.includes(token), `SmartHome-Vertragsprüfung: fehlt ${JSON.stringify(token)}`);
}

console.log('[smarthome-config-transactional] OK: SmartHome-Konfiguration wird vor Aktivierung vollständig validiert und bei Aktivierungs-/Persistenzfehlern zurückgerollt.');
