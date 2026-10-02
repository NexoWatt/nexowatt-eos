#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const fail = msg => { console.error(`[NexoWatt EOS native shell] ${msg}`); process.exit(1); };
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const info = JSON.parse(read('NEXOWATT_EOS_BUILD_INFO.json'));
const runtime = info.runtimeEntry;
const shellCache = Number(info.shellCacheVersion ?? info.nativeShellVersion);
const shellTag = String(info.shellCacheTag || shellCache);
const index = read('adminWww/index.html');
const shell = read('adminWww/js/nexowatt-native-shell.js');
const css = read('adminWww/css/nexowatt-native-shell.css');
const drawer = read('src-admin/src/components/Drawer.tsx');
const drawerItem = read('src-admin/src/components/DrawerItem.tsx');
const navIcon = read('src-admin/src/components/NexoWattNavIcon.tsx');
const bootstrap = read(`adminWww/assets/bootstrap-COulQZax-${runtime}.js`);

for (const marker of [
  'class="eos-native-shell"',
  `nexowatt-native-shell.css?v=${shellTag}`,
  `nexowatt-native-shell.js?v=${shellTag}`,
  `eos-native-security.js?v=${shellTag}`,
]) if (!index.includes(marker)) fail(`index missing ${marker}`);

for (const legacy of ['eos-branding.js', 'eos-security-ui.js', 'eos-console-quiet.js', 'eos-objects-state-tools.js']) {
  if (index.includes(legacy)) fail(`legacy overlay loaded: ${legacy}`);
}

for (const marker of [
  'NexoWattNavIcon', 'getNexoWattTabIcon', 'getNexoWattTabTitle',
  "'tab-intro': 'Übersicht'", "'tab-adapters': 'Module'", "'tab-instances': 'Dienste'",
  "'tab-objects': 'Datenpunkte'", "'tab-logs': 'Systemlogs'", "'tab-users': 'Zugänge & Rechte'",
]) if (!drawer.includes(marker)) fail(`Drawer source missing ${marker}`);

for (const marker of ['nexowatt-native-nav-item', 'data-eos-tab={tabName}', 'nexowatt-native-nav-icon-slot']) {
  if (!drawerItem.includes(marker)) fail(`DrawerItem source missing ${marker}`);
}
if (!navIcon.includes('eos-native-nav-icon-source') || !navIcon.includes('nexowatt-native-nav-icon')) fail('native icon component marker missing');

for (const marker of ['NEXOWATT_TAB_ICON', 'nexowatt-native-nav-item', 'nexowatt-native-nav-icon', 'tabName:h.name', 'NexoWatt EOS', 'Zugänge & Rechte']) {
  if (!bootstrap.includes(marker)) fail(`active bootstrap missing ${marker}`);
}

if (shell.includes('textNode.textContent = cfg.label') || shell.includes('innerHTML = cfg.svg')) fail('shell still rewrites native navigation content');
if (!shell.includes('rendered natively by Drawer.tsx')) fail('shell native ownership comment missing');
if (!shell.includes('ensureNavigationContainer')) fail('shell navigation container setup missing');
if (!shell.includes('ensureModernOverview') || !shell.includes("label: 'Installateur'") || !shell.includes("label: 'Endkunde'")) fail('role-aware native overview setup missing');
const overviewBridge = shell.slice(shell.indexOf('const ensureModernOverview'), shell.indexOf('const apply'));
for (const marker of ['eosNativeReactOverview', 'eosRuntimeOverviewHero', 'bundled Admin-7 runtime predates the React hero']) if (!overviewBridge.includes(marker)) fail(`overview ownership marker missing: ${marker}`);
if (overviewBridge.indexOf('eosNativeReactOverview') > overviewBridge.indexOf('hero.innerHTML')) fail('React-owned overview is rewritten before ownership is checked');
if (!css.includes('.nexowatt-native-nav-item') || !css.includes('.eos-native-nav-icon') || !css.includes('.nexowatt-native-nav-icon')) fail('shell CSS lacks native navigation styles');

console.log('[NexoWatt EOS native shell] OK');
