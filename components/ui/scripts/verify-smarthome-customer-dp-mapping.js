#!/usr/bin/env node
'use strict';

/**
 * Rollenvertrag ab 1.0.13 (historischer Testname bleibt kompatibel):
 * Einrichtung und DP-Zuordnung benötigen Installer/Admin, Lizenz bleibt Admin.
 * Kunden bedienen ausschließlich bereits konfigurierte Geräte.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const main = read('src-ts/runtime-executables/main.ts');
const ui = read('src-ts/runtime-executables/www/smarthome-config.ts');
const html = read('www/smarthome-config.html');
const logicHtml = read('www/logic.html');

assert.match(main, /const requireCustomerWorkspace = requireAuth;/);
assert.match(main, /const requireSmartHomeConfig = requireCapability\('smarthome\.configure'\);/);
assert.match(main, /const requireNexoLogicConfig = requireCapability\('nexologic\.configure'\);/);
assert.match(main, /const requireDpDiscovery = requireCapability\('mapping\.edit'\);/);
assert.match(main, /app\.get\(\['\/api\/object\/tree', '\/api\/smarthome\/object\/tree'\], requireDpDiscovery/);
assert.match(main, /app\.get\('\/api\/logic\/blocks', requireNexoLogicConfig/);
assert.match(main, /app\.get\('\/api\/logic\/editor', requireNexoLogicConfig/);
assert.match(main, /app\.post\('\/api\/logic\/editor', requireNexoLogicConfig/);
assert.match(main, /app\.post\('\/api\/smarthome\/config', requireSmartHomeConfig/);
assert.match(main, /app\.post\('\/api\/smarthome\/dpset', requireInstaller/);
assert.match(main, /requirePageAccessOrRenderLock\(req, res, 'appcenter\.open'/);
assert.match(main, /requirePageAccessOrRenderLock\(req, res, 'simulation\.open'/);
assert.match(main, /const requireAdmin = requireCapability\('license\.manage'\)/);

assert.match(html, /data-nw-required-capability="smarthome\.configure"/);
assert.doesNotMatch(html, /admin-guard\.js/);
assert.match(logicHtml, /data-nw-required-capability="nexologic\.configure"/);
assert.doesNotMatch(logicHtml, /admin-guard\.js/);
assert.match(ui, /\/api\/object\/tree/);
assert.match(ui, /hasCapability\('smarthome\.configure'\)/, 'raw test writes must remain expert-only');
assert.match(ui, /state\.treePrefix = nwDpParentPrefix\(state\.input\.value \|\| ''\)/, 'picker must reopen in the current datapoint folder');

console.log('[smarthome-customer-dp-mapping] OK: SmartHome/NexoLogic setup is restricted to Installer/Admin; normal customer control remains separate.');
