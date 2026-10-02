#!/usr/bin/env node
'use strict';
/**
 * Datei: scripts/verify-installer-back-link.js
 * Zweck: Regressionstest für den Rücksprung vom App-Center zum ioBroker-/EOS-Admin.
 * Hintergrund: Das App-Center läuft auf dem Adapter-Runtime-Port. Ein relativer
 * Link auf `tab.html` landet deshalb auf dem falschen Port und erzeugt im Browser
 * die Meldung „Datei /tab.html konnte nicht abgerufen werden“. Der Rücksprung muss
 * stattdessen zum Admin-Hash `/#tab-nexowatt-ui-<instanz>` führen.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const ts = fs.readFileSync(path.join(root, 'src-ts', 'runtime-executables', 'www', 'ems-apps.ts'), 'utf8');
const js = fs.readFileSync(path.join(root, 'www', 'ems-apps.js'), 'utf8');
const installerTsx = fs.readFileSync(path.join(root, 'src-admin-tab', 'src', 'pages', 'InstallerPage.tsx'), 'utf8');
const redirectTsx = fs.readFileSync(path.join(root, 'src-admin-tab', 'src', 'pages', 'RedirectPage.tsx'), 'utf8');
function fail(message) { console.error('[installer-back-link] ERROR: ' + message); process.exit(1); }
function has(text, needle, label) { if (!text.includes(needle)) fail(label + ' fehlt: ' + needle); }
function notHas(text, needle, label) { if (text.includes(needle)) fail(label + ' enthält verbotenen Rest: ' + needle); }
for (const [label, text] of [['TS', ts], ['Runtime', js]]) {
  has(text, '#tab-nexowatt-ui-', label);
  has(text, 'adminPort', label);
  has(text, 'window.top.location.href', label);
  notHas(text, "return 'tab.html'", label);
  notHas(text, 'return "tab.html"', label);
}
has(installerTsx, 'adminBackQuery', 'InstallerPage');
has(installerTsx, 'adminPort', 'InstallerPage');
has(installerTsx, 'instance=', 'InstallerPage');
has(redirectTsx, 'appendAdminBackQuery', 'RedirectPage');
has(redirectTsx, 'adminPort', 'RedirectPage');
console.log('[installer-back-link] OK: App-Center springt zum Admin-Hash statt auf tab.html am Runtime-Port.');
