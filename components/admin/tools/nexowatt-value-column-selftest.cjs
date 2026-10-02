#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const fail = message => { console.error(`[NexoWatt EOS value column] ${message}`); process.exit(1); };
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const src = read('src-admin/public/css/nexowatt-native-shell.css');
const built = read('adminWww/css/nexowatt-native-shell.css');
if (src !== built) fail('source and delivered native shell CSS differ');
for (const marker of [
    '.eos-object-value-cell[data-eos-object-writable="1"]',
    '.eos-object-value-cell[data-eos-direct-control="1"] *',
    '.eos-object-value-dialog',
]) if (!src.includes(marker)) fail(`value-cell marker missing: ${marker}`);
if (src.includes('.eos-object-value-cell {\n    width: 100% !important')) fail('native value-column width is overridden');
const buildInfo = JSON.parse(read('NEXOWATT_EOS_BUILD_INFO.json'));
const shellVersion = String(buildInfo.shellCacheTag || buildInfo.shellCacheVersion || buildInfo.brandingCacheVersion);
const index = read('adminWww/index.html');
if (!index.includes(`css/nexowatt-native-shell.css?v=${shellVersion}`)) fail(`native shell CSS cache key is not ${shellVersion}`);
if (!index.includes(`js/nexowatt-native-shell.js?v=${shellVersion}`)) fail(`native shell JS cache key is not ${shellVersion}`);
console.log('[NexoWatt EOS value column] OK');
