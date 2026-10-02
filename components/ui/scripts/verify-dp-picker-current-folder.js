#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const logic = read('www/logic.js');
const smartHome = read('www/smarthome-config.js');
const appCenter = read('www/ems-apps.js');

assert.ok(logic.includes('function nwDpParentPrefix(id)'), 'NexoLogic: Parent-Prefix-Helfer fehlt.');
assert.ok(logic.includes('let treePrefix = nwDpParentPrefix(initialQuery);'), 'NexoLogic: Picker startet nicht im Ordner des bestehenden DPs.');
assert.ok(logic.includes('nwRenderDpBreadcrumb(treePrefix, openPrefix);'), 'NexoLogic: Breadcrumb wird nicht auf den aktuellen Ordner gesetzt.');

assert.ok(smartHome.includes('function nwDpParentPrefix(id)'), 'SmartHome: Parent-Prefix-Helfer fehlt.');
assert.ok(smartHome.includes("state.treePrefix = nwDpParentPrefix(state.input.value || '');"), 'SmartHome: Picker startet nicht im Ordner des bestehenden DPs.');
assert.ok(smartHome.includes("nwRenderDpBreadcrumb(state.treePrefix || '', state.breadcrumb, nwOpenDpDialogPrefix);"), 'SmartHome: Breadcrumb wird nicht auf den aktuellen Ordner gesetzt.');

assert.ok(appCenter.includes("const currentInput = targetInputId ? document.getElementById(targetInputId) : null;"), 'AppCenter: aktuelles DP-Eingabefeld wird nicht gelesen.');
assert.ok(appCenter.includes("treePrefix = currentParts.length > 1 ? currentParts.slice(0, -1).join('.') : '';"), 'AppCenter: Picker startet nicht im Ordner des bestehenden DPs.');
assert.ok(appCenter.includes('refreshTree().catch(() => {});'), 'AppCenter: aktueller Ordner wird beim Öffnen nicht geladen.');

console.log('[dp-picker-current-folder] OK: NexoLogic, SmartHome und AppCenter öffnen die DP-Auswahl bei Änderungen wieder im aktuellen Objektordner.');
