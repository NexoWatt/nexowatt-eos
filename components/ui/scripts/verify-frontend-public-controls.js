#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-frontend-public-controls.js
 * Zweck: Statischer Release-Check für 0.8.75: Endkunden-Frontend-Bedienung bleibt ohne Admin-/Installer-Login möglich.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function fail(message) {
  console.error('[frontend-public-controls] ERROR: ' + message);
  process.exit(1);
}

function need(condition, message) {
  if (!condition) fail(message);
}

function includesAll(text, parts) {
  return parts.every((part) => text.includes(part));
}

const main = read('main.js');
const mainTs = read('src-ts/runtime-executables/main.ts');
const indexHtml = read('www/index.html');
const settingsHtml = read('www/settings.html');

for (const [label, text] of [['main.js', main], ['src-ts/runtime-executables/main.ts', mainTs]]) {
  need(text.includes('const attachOptionalAuth = async'), `${label}: optionaler Frontend-Auth-Helfer fehlt.`);
  need(text.includes("app.post('/api/set', attachOptionalAuth, async"), `${label}: /api/set muss für LIVE-/Kundenbedienung ohne Pflichtlogin laufen.`);
  need(!text.includes("app.post('/api/set', requireAuth, async"), `${label}: /api/set darf nicht mehr requireAuth verwenden.`);
  need(text.includes("app.get('/api/flow/qc/read', attachOptionalAuth, async"), `${label}: Energiefluss-Schnellsteuerung-Readback muss ohne Pflichtlogin laufen.`);
  need(includesAll(text, ["scope === 'installer' || scope === 'rfid'", 'getSetAccess()', '!s || !s.isInstaller']), `${label}: Installer-/RFID-Scopes müssen weiterhin explizit geschützt bleiben.`);
  need(includesAll(text, ["scope === 'storageFarm'", "res.status(403).json({ ok: false, error: 'forbidden' })"]), `${label}: Speicherfarm-Konfiguration muss im VIS weiterhin blockiert bleiben.`);
  need(text.includes("const requireInstaller = requireCapability('appcenter.open')"), `${label}: App-Center muss weiter rollenbasiert geschützt bleiben.`);
  need(text.includes("const requireAdmin = requireCapability('license.manage')"), `${label}: Lizenzverwaltung muss weiter Admin-geschützt bleiben.`);
}

need(!indexHtml.includes('/static/auth.js'), 'www/index.html darf keinen Auth-Header/Login für die Endkunden-LIVE-Seite laden.');
need(!settingsHtml.includes('/static/auth.js'), 'www/settings.html darf keinen Auth-Header/Login für Kundeneinstellungen laden.');

console.log('[frontend-public-controls] OK: LIVE-/Kundensteuerung öffentlich, Admin-/Installer-Schutz bleibt erhalten.');
