#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-live-dashboard-format-productive.js
 *
 * Zweck:
 * Prüft, dass das LIVE-Dashboard die TypeScript-Formatter produktiv lädt und die
 * alten JS-Formatter als Fallback behält.
 */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const root = path.resolve(__dirname, '..');

function fail(message) {
  console.error('[ts-live-dashboard-format-productive] ERROR: ' + message);
  process.exit(1);
}
function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) fail('Pflichtdatei fehlt: ' + rel);
  return fs.readFileSync(p, 'utf8');
}
function contains(rel, needle) {
  const text = read(rel);
  if (!text.includes(needle)) fail(rel + ' enthält erwarteten Marker nicht: ' + needle);
  return text;
}

(async () => {
  contains('src-ts/frontend/live-dashboard-format.ts', 'Code-Teil: formatDashboardPower');
  contains('src-ts/frontend/live-dashboard-format.ts', '0` ist ein gültiger Wert');
  contains('www/static/ts-mirrors/frontend/live-dashboard-format.mjs', 'AUTO-GENERATED FILE');
  contains('www/app.js', "import('./static/ts-mirrors/frontend/live-dashboard-format.mjs')");
  contains('www/app.js', "nxTryTsDashboardFormat('formatDashboardPower'");
  contains('www/app.js', "nxTryTsDashboardFormat('formatDashboardEnergyKwh'");
  contains('www/app.js', "nxTryTsDashboardFormat('formatDashboardPowerSigned'");
  contains('www/app.js', "nxTryTsDashboardFormat('formatDashboardFlowPower'");
  contains('package.json', 'test:live-dashboard-format-productive');

  const mod = await import(pathToFileURL(path.join(root, 'www/static/ts-mirrors/frontend/live-dashboard-format.mjs')).href);
  if (mod.formatDashboardPower(0, 'W') !== '0 W') fail('0 W wird nicht korrekt formatiert.');
  if (mod.formatDashboardPower(1500, 'kW') !== '1.50 kW') fail('kW-Format ist nicht kompatibel.');
  if (mod.formatDashboardPowerSigned(-120, 'W') !== '-120 W') fail('signiertes W-Format ist nicht kompatibel.');
  if (mod.formatDashboardEnergyKwh(1500) !== '1.50 MWh') fail('Energy-Format ist nicht kompatibel.');
  if (mod.formatDashboardFlowPower(1500, 1) !== '1.5 kW') fail('Flow-Power-Format ist nicht kompatibel.');
  console.log('[ts-live-dashboard-format-productive] OK: LIVE-Dashboard nutzt TS-Formatter produktiv mit JS-Fallback.');
})().catch((err) => fail(err && err.stack ? err.stack : String(err)));
