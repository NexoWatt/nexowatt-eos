#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const main = read('src-ts/runtime-executables/main.ts');
const smarthome = read('www/smarthome-config.html');
const logic = read('www/logic.html');
const apps = read('www/ems-apps.html');
const simulation = read('www/simulation.html');

assert.match(main, /const requireCustomerWorkspace = requireAuth;/);
assert.match(main, /const requireSmartHomeConfig = requireCapability\('smarthome\.configure'\);/);
assert.match(main, /const requireNexoLogicConfig = requireCapability\('nexologic\.configure'\);/);
assert.match(main, /app\.get\(\['\/smarthome-config\.html', '\/smarthome-config'\], async \(req, res\)/);
assert.match(main, /app\.get\(\['\/logic\.html','\/logic'\], async \(req, res\)/);
assert.match(smarthome, /data-nw-required-capability="smarthome\.configure"/);
assert.match(logic, /data-nw-required-capability="nexologic\.configure"/);
assert.doesNotMatch(smarthome, /admin-guard\.js/);
assert.doesNotMatch(logic, /admin-guard\.js/);

assert.match(apps, /data-nw-required-capability="appcenter\.open"/);
assert.match(simulation, /data-nw-admin-page="simulation"/);
assert.match(main, /requirePageAccessOrRenderLock\(req, res, 'simulation\.open'/);
assert.match(main, /const requireAdmin = requireCapability\('license\.manage'\)/);
assert.match(main, /app\.post\('\/api\/smarthome\/dpset', requireInstaller/);

console.log('[customer-workspace-access-rc44] OK: customer operation stays available; technical configuration and raw DP access require a privileged role.');
