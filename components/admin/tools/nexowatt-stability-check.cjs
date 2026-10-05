#!/usr/bin/env node
'use strict';
const assetCache = require('./nexowatt-browser-asset-version.cjs');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const { cleanLegacyRuntime } = require('./nexowatt-clean-legacy-runtime.cjs');
try {
  cleanLegacyRuntime({ root, quiet: true });
} catch (error) {
  console.error(`[NexoWatt EOS stability] runtime cleanup failed: ${error?.message || error}`);
  process.exit(1);
}
let bad = false;
const fail = m => { console.error(`[NexoWatt EOS stability] ${m}`); bad = true; };
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const json = f => JSON.parse(read(f));
const exists = f => fs.existsSync(path.join(root, f));

const version = json('package.json').version;
const info = json('NEXOWATT_EOS_BUILD_INFO.json');
const runtime = info.runtimeEntry;
const runtimeNo = Number(String(runtime).replace(/^v/, ''));
const shellNo = Number(info.shellCacheVersion ?? info.brandingCacheVersion);
const shellTag = String(info.shellCacheTag || shellNo);
const autoUpdateTag = String(info.autoUpdateCacheTag || info.autoUpdateCacheVersion || shellTag);
if (!/^7\.10\.11(?:-rc\.\d+)?$/.test(version)) fail(`unexpected version ${version}`);
if (!Number.isFinite(runtimeNo) || !Number.isFinite(shellNo)) fail('invalid runtime/shell version');
for (const [name, value] of [
  ['build info', info.version],
  ['io common', json('io-package.json').common.version],
  ['io top-level', json('io-package.json').version],
  ['root lock', json('package-lock.json').version],
  ['root lock package', json('package-lock.json').packages?.['']?.version],
  ['src package', json('src-admin/package.json').version],
  ['src lock', json('src-admin/package-lock.json').version],
  ['src lock package', json('src-admin/package-lock.json').packages?.['']?.version],
  ['src version', json('src-admin/src/version.json').version],
]) if (value !== version) fail(`${name}=${value}, expected ${version}`);

const index = read('adminWww/index.html');
for (const marker of [
  `hostInit-${runtime}.js?v=${runtimeNo}`,
  `index-CQZugZ1z-${runtime}.js?eos=${assetCache}`,
  `eos-manual-write-policy.js?eos=${assetCache}`,
  `eos-role-bootstrap.js?eos=${assetCache}`,
  `eos-policy-client.js?eos=${assetCache}`,
  `nexowatt-native-shell.js?eos=${assetCache}`,
  `eos-native-security.js?eos=${assetCache}`,
  `eos-role-ui.js?eos=${assetCache}`,
  `eos-auto-update.js?eos=${assetCache}`,
  `eos-auto-update.css?eos=${assetCache}`,
  `eos-assistant.js?eos=${assetCache}`,
  `nexowatt-native-shell.css?eos=${assetCache}`,
  `nexowatt-stable-v${shellTag}.js?v=${shellTag}`,
]) if (!index.includes(marker)) fail(`index missing ${marker}`);
for (const old of ['eos-branding.js','eos-branding.css','eos-security-ui.js','eos-console-quiet.js','eos-objects-state-tools.js']) {
  if (index.includes(old)) fail(`legacy overlay active: ${old}`);
}

for (const file of [
  `adminWww/assets/hostInit-${runtime}.js`,
  `adminWww/assets/index-CQZugZ1z-${runtime}.js`,
  `adminWww/assets/bootstrap-COulQZax-${runtime}.js`,
  `adminWww/assets/Objects-DPan0bzw-${runtime}.js`,
  `adminWww/assets/index-D2ymscJA-${runtime}.js`,
  `adminWww/remoteEntry-${runtime}.js`,
]) if (!exists(file)) fail(`missing ${file}`);
if (!read('adminWww/mf-manifest.json').includes(`remoteEntry-${runtime}.js`)) fail('mf-manifest runtime mismatch');

const oldAssets = fs.readdirSync(path.join(root, 'adminWww/assets')).filter(f => {
  const m = f.match(/-v(\d+)\.js$/); return m && Number(m[1]) < runtimeNo;
});
const oldRemote = fs.readdirSync(path.join(root, 'adminWww')).filter(f => {
  const m = f.match(/^remoteEntry-v(\d+)\.js$/); return m && Number(m[1]) < runtimeNo;
});
if (oldAssets.length || oldRemote.length) fail(`legacy runtime files remain: ${oldAssets.length + oldRemote.length}`);

const scripts = ['eos-policy-client.js','eos-branding-sanitizer.js','nexowatt-native-shell.js','eos-native-security.js','eos-basic-settings.js','eos-role-ui.js','eos-account-management.js','eos-auto-update.js','eos-assistant.js'];
const observerCount = scripts.reduce((n, f) => n + (read(`adminWww/js/${f}`).match(/new MutationObserver/g) || []).length, 0);
if (observerCount < 2 || observerCount > 4) fail(`unexpected EOS observer count ${observerCount}`);
if (!read('adminWww/js/eos-role-ui.js').includes('state.reserveObserver.observe(paper')) fail('scoped reserve-row observer missing');
const shell = read('adminWww/js/nexowatt-native-shell.js');
if (!shell.includes('ensureNavigationContainer') || !shell.includes('rendered natively by Drawer.tsx')) fail('native shell container implementation missing');
if (shell.includes('textNode.textContent = cfg.label') || shell.includes('innerHTML = cfg.svg')) fail('native shell still rewrites navigation content');
if (shell.includes('createTreeWalker')) fail('broad text walker detected');
const bootstrap = read(`adminWww/assets/bootstrap-COulQZax-${runtime}.js`);
for (const marker of ['NEXOWATT_TAB_ICON', 'nexowatt-native-nav-item', 'tabName:h.name', 'NexoWatt EOS', 'Zugänge & Rechte']) {
  if (!bootstrap.includes(marker)) fail(`native bootstrap marker missing: ${marker}`);
}
const sec = read('adminWww/js/eos-native-security.js');
if (sec.includes('querySelectorAll') || sec.includes('MutationObserver') || /addEventListener\(['"]click/.test(sec)) fail('security bridge touches DOM');
if (!read('adminWww/js/eos-policy-client.js').includes('never downgrade an admin to enduser')) fail('policy transient guard missing');

for (const rel of ['js/eos-role-bootstrap.js','js/eos-policy-client.js','js/eos-branding-sanitizer.js','js/nexowatt-native-shell.js','js/eos-native-security.js','js/eos-basic-settings.js','js/eos-role-ui.js','js/eos-account-management.js','js/eos-auto-update.js','css/eos-auto-update.css','js/eos-assistant.js','js/eos-manual-write-policy.js','css/nexowatt-native-shell.css']) {
  if (read(`src-admin/public/${rel}`) !== read(`adminWww/${rel}`)) fail(`source/build drift: ${rel}`);
}

const objects = read(`adminWww/assets/index-D2ymscJA-${runtime}.js`);
if (!objects.includes('NEXOWATT_EOS_MANUAL_WRITE_POLICY')) fail('ObjectBrowser manual-write integration missing');
if (!objects.includes('common.write!==!1') && !objects.includes('common.write===!1')) fail('common.write semantics missing');
for (const marker of ['restoreObjectAclManagedByEos','protected object change:']) if (!read('build/main.js').includes(marker)) fail(`backend marker missing: ${marker}`);
for (const marker of ["role: 'unknown'",'EOS security context temporarily unavailable','mf-manifest.json']) if (!read('build/lib/web.js').includes(marker)) fail(`web marker missing: ${marker}`);
for (const marker of ['getEosFirstLoginPasswordState','/nexowatt/account/first-password','/nexowatt/account/passwordless-claim','/nexowatt/account/reset','passwordSetupVersion','logoutRequired']) if (!read('build/lib/web.js').includes(marker)) fail(`first-login web marker missing: ${marker}`);
for (const marker of ['ensureEosRoleModel','system.group.installateur','system.group.endkunde','system.user.guest','eosPasswordSetupRequired','ensureEosSystemObjectAccess','ensureEosSmartHomeEnumAccess']) if (!read('build/main.js').includes(marker)) fail(`role backend marker missing: ${marker}`);
if (/async getEosRequestAccess\([^)]*\)[\s\S]{0,240}this\.getEosRequestAccess\(/.test(read('build/lib/web.js'))) fail('web role resolver is recursive');
if (!read('adminWww/js/eos-branding-sanitizer.js').includes("document.title = 'NexoWatt EOS – Energy Operation System'")) fail('branding sanitizer title guard missing');
if (!exists('tools/nexowatt-patch-built-frontend.cjs') || !read('tasks.mts').includes('patchNexoWattBuiltFrontend')) fail('post-build guard missing');

if (bad) process.exit(1);
console.log('[NexoWatt EOS stability] OK');
