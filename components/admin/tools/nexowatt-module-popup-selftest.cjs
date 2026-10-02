#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const fail = msg => { console.error(`[NexoWatt EOS module popup selftest] ${msg}`); process.exit(1); };
const source = read('src-admin/src/components/CustomSelectButton.tsx');
const runtime = JSON.parse(read('NEXOWATT_EOS_BUILD_INFO.json')).runtimeEntry;
const runtimeBuilt = `adminWww/assets/sentry-B7YeoTAx-${runtime}.js`;
const builtPath = fs.existsSync(path.join(root, runtimeBuilt)) ? runtimeBuilt : 'adminWww/assets/sentry-B7YeoTAx.js';
const built = read(builtPath);
const css = read('adminWww/css/nexowatt-native-shell.css');
const shell = read('adminWww/js/nexowatt-native-shell.js');
const index = read('adminWww/index.html');
if (/\bkeepMounted\b/.test(source)) fail('CustomSelectButton still keep-mounts closed menus');
if (/anchorEl:c,keepMounted:!0/.test(built)) fail('built CustomSelectButton still keep-mounts closed menus');
for (const marker of ['eos-module-filter-menu','anchorOrigin','transformOrigin','disableScrollLock']) {
  if (!source.includes(marker) || !built.includes(marker)) fail(`missing ${marker} in source or built module`);
}
if (/\.MuiMenu-paper,[\s\S]{0,350}visibility:\s*visible\s*!important/.test(css)) fail('generic Menu paper visibility override remains');
if (/\.MuiMenuItem-root\s*\{[\s\S]{0,200}visibility:\s*visible\s*!important/.test(css)) fail('generic MenuItem visibility override remains');
if (shell.includes('ensurePopupCompatibility') || shell.includes('MuiModal-hidden')) fail('native shell must not rewrite MUI popup lifecycle');
if (index.includes('eos-branding.js')) fail('legacy popup DOM patch is still loaded');
console.log('[NexoWatt EOS module popup selftest] OK');
