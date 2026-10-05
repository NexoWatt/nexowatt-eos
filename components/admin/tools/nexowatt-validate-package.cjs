#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const fail = msg => {
  console.error(`[NexoWatt EOS package validation] ${msg}`);
  process.exit(1);
};
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const readJson = file => JSON.parse(read(file));
const exists = file => fs.existsSync(path.join(root, file));
const canonicalPrepublishOnly = 'npm run sync:eos-version && npm run prepare:eos-release-defaults && npm run clean:eos-runtime && npm run check:eos-publish-channel && npm run check:eos-package && npm run check:eos-stability';
const canonicalPrepack = 'node tools/nexowatt-sync-release-version.cjs --quiet && node tools/nexowatt-ensure-release-defaults.cjs && node tools/nexowatt-clean-legacy-runtime.cjs --quiet && node tools/nexowatt-prebuilt-release-selftest.cjs';

const pkg = readJson('package.json');
const pkgLock = readJson('package-lock.json');
const io = readJson('io-package.json');
const srcPkg = readJson('src-admin/package.json');
const srcPkgLock = readJson('src-admin/package-lock.json');
const srcVersion = readJson('src-admin/src/version.json');
const buildInfo = readJson('NEXOWATT_EOS_BUILD_INFO.json');

if (pkg.name !== 'iobroker.eos-admin') fail(`package.json name must be iobroker.eos-admin, got ${pkg.name}`);
if (pkg.private !== false) fail('package.json private must be false for npm publishing');

const prerelease = pkg.version.includes('-');
if (pkg.publishConfig?.tag !== 'latest') fail(`package must publish through npm latest, got ${pkg.publishConfig?.tag || '<unset>'}`);
if (!exists('.npmrc') || !/^\s*tag\s*=\s*latest\s*$/m.test(read('.npmrc'))) fail('repository must contain .npmrc with tag=latest');
if (prerelease) {
  if (pkg.nexowattReleasePolicy?.distTag !== 'latest') fail('accepted prerelease must record distTag=latest');
  if (pkg.nexowattReleasePolicy?.acceptedPrerelease !== pkg.version) fail('acceptedPrerelease must match the exact package version');
} else if (pkg.nexowattReleasePolicy?.acceptedPrerelease) {
  fail(`stable package must remove stale acceptedPrerelease ${pkg.nexowattReleasePolicy.acceptedPrerelease}`);
}
if (pkg.scripts['prepare:eos-release-defaults'] !== 'node tools/nexowatt-ensure-release-defaults.cjs') fail('release-default preparation script is missing');
if (pkg.scripts['test:eos-release-defaults'] !== 'node tools/nexowatt-release-defaults-selftest.cjs') fail('release-default selftest script is missing');
if (pkg.scripts['check:eos-publish-channel'] !== 'node tools/nexowatt-publish-channel-guard.cjs') fail('publish channel guard script is missing');

if (pkg.scripts['sync:eos-version'] !== 'node tools/nexowatt-sync-release-version.cjs') fail('sync:eos-version script is missing or incorrect');
if (pkg.scripts['test:eos-version-sync'] !== 'node tools/nexowatt-version-sync-selftest.cjs') fail('version sync selftest script is missing or incorrect');
if (pkg.scripts['verify:eos-merge'] !== 'node tools/nexowatt-merge-update-selftest.cjs') fail('merge update selftest script is missing or incorrect');
if (!pkg.scripts['check:eos-stability']?.includes('nexowatt-version-sync-selftest.cjs')) fail('version sync selftest is not part of check:eos-stability');
if (!pkg.scripts['check:eos-stability']?.includes('nexowatt-merge-update-selftest.cjs')) fail('merge update selftest is not part of check:eos-stability');
if (pkg.scripts['check:eos-stable-v7103'] !== 'node tools/nexowatt-stable-v7103-selftest.cjs') fail('stable v7103 selftest script is missing or incorrect');
if (pkg.scripts['test:eos-auto-update-placement'] !== 'node tools/nexowatt-auto-update-placement-selftest.cjs') fail('auto-update placement selftest script is missing or incorrect');
if (pkg.scripts['test:eos-installer-ems'] !== 'node tools/nexowatt-installer-ems-selftest.cjs') fail('Installer EMS selftest script is missing or incorrect');
if (!pkg.scripts['check:eos-stability']?.includes('nexowatt-installer-ems-selftest.cjs')) fail('Installer EMS selftest is not part of check:eos-stability');
if (!pkg.scripts['check:eos-stability']?.includes('nexowatt-auto-update-placement-selftest.cjs')) fail('auto-update placement selftest is not part of check:eos-stability');
if (pkg.scripts.prepublishOnly !== canonicalPrepublishOnly) fail('prepublishOnly must use the dependency-free direct-publish workflow');
if (/\b(?:tsc|tsx)\b|build:(?:backend|frontend)|\bnpx\b|npm\s+(?:i|install|ci)\b/i.test(pkg.scripts.prepublishOnly || '')) fail('prepublishOnly must not require local development dependencies');
if (pkg.scripts['check:eos-prebuilt-release'] !== 'node tools/nexowatt-prebuilt-release-selftest.cjs') fail('prebuilt release selftest script is missing or incorrect');
if (pkg.scripts['seal:eos-prebuilt-release'] !== 'node tools/nexowatt-prebuilt-release-selftest.cjs --write') fail('prebuilt release sealing script is missing or incorrect');
const backendRuntimeSelftest = read('tools/nexowatt-backend-runtime-selftest.cjs');
if (!backendRuntimeSelftest.includes('dependency-free on Windows')) fail('backend runtime selftest is missing the cross-platform publish marker');
if (/const\s+npm\s*=\s*process\.platform|spawnSync\(\s*npm\s*,|['"]npm\.cmd['"]/.test(backendRuntimeSelftest)) fail('backend runtime selftest must not spawn a nested npm process');
if (!(pkg.files || []).some(value => String(value).replace(/\\/g, '/').replace(/\/+$/, '') === 'build')) fail('package.json files must include the complete build directory');
if (!pkg.scripts['check:eos-stability']?.includes('nexowatt-prebuilt-release-selftest.cjs')) fail('prebuilt release selftest is not part of check:eos-stability');
if (pkg.scripts['precheck:eos-package'] !== 'npm run sync:eos-version && npm run prepare:eos-release-defaults && npm run clean:eos-runtime') fail('precheck:eos-package must synchronize versions, normalize release defaults and clean stale runtime files');
if (pkg.scripts['precheck:eos-stability'] !== 'npm run sync:eos-version && npm run prepare:eos-release-defaults && npm run clean:eos-runtime') fail('precheck:eos-stability must synchronize versions, normalize release defaults and clean stale runtime files');
if (pkg.scripts['test:eos-publish-channel'] !== 'node tools/nexowatt-publish-channel-selftest.cjs') fail('publish channel selftest script is missing');
if (!pkg.scripts['check:eos-stability']?.includes('nexowatt-publish-channel-selftest.cjs')) fail('stability check must execute the publish channel selftest');
if (!pkg.scripts['check:eos-stability']?.includes('nexowatt-release-defaults-selftest.cjs')) fail('stability check must execute the release-default selftest');
if (!pkg.scripts['check:eos-stability']?.includes('nexowatt-password-write-selftest.cjs')) fail('password-write selftest is not part of check:eos-stability');
if (!pkg.scripts['check:eos-stability']?.includes('nexowatt-account-password-flow-selftest.cjs')) fail('account-password flow selftest is not part of check:eos-stability');
if (io.native?.auth !== true) fail('fresh sales installations must default to authenticated access');
if (io.native?.eosHideLegacyBackupFromNonAdmins !== true) fail('internal BackItUp reserve must default to Admin/Service visibility');
if (io.native?.nexowattHideLegacyBackupFromNonAdmins !== true) fail('NexoWatt backup visibility compatibility flag must default to true');
const instanceObjectIds = new Set((io.instanceObjects || []).map(object => object?._id));
if (!instanceObjectIds.has('info.nexowattStableUpdatesEnabled')) fail('restart-safe auto-update enabled state is missing');
if (!instanceObjectIds.has('info.nexowattStableUpdatesState')) fail('restart-safe auto-update runtime state is missing');
if (!instanceObjectIds.has('info.uiTabsVisible')) fail('restart-safe navigation state info.uiTabsVisible is missing');
for (const key of ['description', 'files', 'scripts', 'nexowattReleasePolicy']) {
  if (JSON.stringify(pkgLock.packages?.['']?.[key]) !== JSON.stringify(pkg[key])) {
    fail(`package-lock root ${key} must match package.json`);
  }
}
for (const [label, value] of [
  ['io-package common.version', io.common?.version],
  ['io-package top-level version', io.version],
  ['package-lock version', pkgLock.version],
  ['package-lock root version', pkgLock.packages?.['']?.version],
  ['src-admin package version', srcPkg.version],
  ['src-admin lock version', srcPkgLock.version],
  ['src-admin lock root version', srcPkgLock.packages?.['']?.version],
  ['src-admin source version', srcVersion.version],
  ['build-info version', buildInfo.version],
]) if (value !== pkg.version) fail(`${label} must match package.json (${pkg.version}), got ${value}`);

if (io.common?.name !== 'eos-admin') fail(`io-package common.name must be eos-admin, got ${io.common?.name}`);
if (io.common?.packetName !== 'iobroker.eos-admin') fail(`io-package common.packetName must be iobroker.eos-admin, got ${io.common?.packetName}`);
if (io.common?.npmPackage !== 'iobroker.eos-admin') fail(`io-package common.npmPackage must be iobroker.eos-admin, got ${io.common?.npmPackage}`);
if (io.native?.port !== 8081) fail(`EOS Admin default port must be 8081, got ${io.native?.port}`);
if (io.common?.stopBeforeUpdate !== false) fail('io-package common.stopBeforeUpdate must be false');
if (io.common?.dontDelete === true || io.common?.nondeletable === true) fail('adapter-level delete flags must not block updates');

const expectedBase = `https://unpkg.com/iobroker.eos-admin@${pkg.version}`;
for (const [field, expected] of Object.entries({
  extIcon: `${expectedBase}/admin/admin.svg`,
  readme: `${expectedBase}/README.md`,
  meta: `${expectedBase}/io-package.json`,
})) if (io.common?.[field] !== expected) fail(`io-package common.${field} must be ${expected}, got ${io.common?.[field]}`);

const releaseNo = String(pkg.version).match(/^7\.9\.(\d+)/)?.[1];
const repositoryEntryFile = buildInfo.repositoryEntry || `nexowatt-eos-admin-repository-entry-v${releaseNo}.json`;
const repositoryEntry = readJson(repositoryEntryFile)['eos-admin'];
if (!repositoryEntry) fail(`${repositoryEntryFile} is missing eos-admin`);
if (repositoryEntry.version !== pkg.version) fail(`repository entry version must be ${pkg.version}, got ${repositoryEntry.version}`);
for (const [field, expected] of Object.entries({
  meta: `${expectedBase}/io-package.json`,
  icon: `${expectedBase}/admin/admin.png`,
  extIcon: `${expectedBase}/admin/admin.svg`,
  readme: `${expectedBase}/README.md`,
})) if (repositoryEntry[field] !== expected) fail(`repository entry ${field} must be ${expected}, got ${repositoryEntry[field]}`);

for (const file of [
  'adminWww/index.html',
  'adminWww/js/eos-manual-write-policy.js',
  'adminWww/js/eos-role-bootstrap.js',
  'adminWww/js/eos-branding-sanitizer.js',
  'adminWww/js/eos-policy-client.js',
  'adminWww/js/nexowatt-native-shell.js',
  'adminWww/js/eos-native-security.js',
  'adminWww/js/eos-basic-settings.js',
  'adminWww/js/eos-role-ui.js',
  'adminWww/js/eos-account-management.js',
  'adminWww/js/eos-assistant.js',
  'adminWww/css/nexowatt-native-shell.css',
  'adminWww/img/eos/nexowatt-192.png',
  'src-admin/src/components/NexoWattNavIcon.tsx',
  'src-admin/src/components/Drawer.tsx',
  'src-admin/src/components/DrawerItem.tsx',
  'admin/admin.svg',
  'build/lib/eosRequestSecurity.js',
  'LICENSE',
  'NEXOWATT_PROPRIETARY_LICENSE.md',
  'THIRD_PARTY_NOTICES.md',
  'README_STABILITY_V7.10.7.md',
  'RELEASE_NOTES_V7.10.7.md',
  'PUBLISH_STABLE_V7.10.7.md',
  'INSTALL_TEST_V7.10.7.md',
  'RELEASE_ACCEPTANCE_V7.10.7.md',
  'MERGE_UPDATE.ps1',
  'MERGE_UPDATE.cmd',
  'MERGE_UPDATE_README_V7.10.7.md',
  'tools/nexowatt-patch-built-frontend.cjs',
  'tools/nexowatt-native-shell-selftest.cjs',
  'tools/nexowatt-clean-legacy-runtime.cjs',
  'tools/nexowatt-runtime-cleanup-selftest.cjs',
  'tools/nexowatt-esm-syntax-selftest.cjs',
  'tools/nexowatt-import-integrity-selftest.cjs',
  'tools/nexowatt-backend-runtime-selftest.cjs',
  'tools/nexowatt-prebuilt-release-selftest.cjs',
  'NEXOWATT_EOS_PREBUILT_MANIFEST.json',
  'tools/nexowatt-entrypoint-smoke-selftest.cjs',
  'tools/nexowatt-role-access-selftest.cjs',
  'tools/nexowatt-first-login-selftest.cjs',
  'tools/nexowatt-account-management-selftest.cjs',
  'tools/nexowatt-modern-ui-selftest.cjs',
  'tools/nexowatt-login-layout-selftest.cjs',
  'tools/nexowatt-internal-reserve-selftest.cjs',
  'tools/nexowatt-branding-selftest.cjs',
  'tools/nexowatt-sync-release-version.cjs',
  'tools/nexowatt-version-sync-selftest.cjs',
  'tools/nexowatt-merge-update-selftest.cjs',
  'tools/nexowatt-stable-v7103-selftest.cjs',
  'tools/nexowatt-password-write-selftest.cjs',
  'tools/nexowatt-account-password-flow-selftest.cjs',
  'tools/nexowatt-auto-update-placement-selftest.cjs',
  'adminWww/js/eos-auto-update.js',
  'adminWww/css/eos-auto-update.css',
  'src-admin/public/js/eos-auto-update.js',
  'src-admin/public/css/eos-auto-update.css',
  'tools/nexowatt-ems-overview-selftest.cjs',
  'tools/nexowatt-ui-overview-runtime-selftest.cjs',
  'adminWww/js/eos-ems-overview.js',
  'adminWww/css/eos-ems-overview.css',
  'adminWww/static/js/nexowatt-stable-v7109.js',
  'src-admin/src/components/Intro/NexoWattEmsOverview.tsx',
  'tools/nexowatt-publish-channel-guard.cjs',
  'tools/nexowatt-publish-channel-selftest.cjs',
  'tools/nexowatt-ensure-release-defaults.cjs',
  'tools/nexowatt-release-defaults-selftest.cjs',
  'tools/nexowatt-default-port-selftest.cjs',
  '.npmrc',
  repositoryEntryFile,
]) if (!exists(file)) fail(`missing required file: ${file}`);

for (const file of pkg.files || []) {
  const normalized = String(file).replace(/\\/g, '/').replace(/\/\*\*\/\*$/, '');
  if (!/[?*]/.test(normalized) && !exists(normalized.replace(/\/$/, ''))) fail(`package.json files entry does not exist: ${file}`);
}

const index = read('adminWww/index.html');
const refs = [...index.matchAll(/(?:src|href)="\.\/([^"?#]+)(?:\?[^"#]*)?"/g)].map(m => m[1]);
const missing = refs.filter(ref => !exists(path.join('adminWww', ref)));
if (missing.length) fail(`adminWww/index.html references missing files:\n${missing.join('\n')}`);

const runtime = buildInfo.runtimeEntry;
const runtimeNumber = Number(String(runtime).replace(/^v/, ''));
const shellCache = Number(buildInfo.shellCacheVersion ?? buildInfo.nativeShellVersion ?? runtimeNumber);
const shellTag = String(buildInfo.shellCacheTag || shellCache);
// Reviewed prebuilt hotfix namespace. The inherited v84/library and stable
// overlay identities stay unchanged; all affected product resources and the
// application import closure use the newer, explicitly required cache key.
const assetCache = require('./nexowatt-browser-asset-version.cjs');
if (!runtime || !Number.isFinite(runtimeNumber)) fail(`invalid runtimeEntry ${runtime}`);
if (!Number.isFinite(shellCache)) fail(`invalid shellCacheVersion ${buildInfo.shellCacheVersion}`);
for (const html of [index, read('src-admin/index.html')]) {
  if (!html.includes(`name="nexowatt-eos-asset-version" content="${assetCache}"`)) fail('reviewed EOS asset namespace missing');
}
for (const marker of [
  `hostInit-${runtime}.js?v=${runtimeNumber}`,
  `index-CQZugZ1z-${runtime}.js?eos=${assetCache}`,
  `eos-manual-write-policy.js?eos=${assetCache}`,
  `nexowatt-native-shell.css?eos=${assetCache}`,
  `eos-product-loader.css?eos=${assetCache}`,
  `nexowatt-native-shell.js?eos=${assetCache}`,
  `eos-native-security.js?eos=${assetCache}`,
]) if (!index.includes(marker)) fail(`adminWww/index.html missing ${marker}`);

if (!index.includes(`eos-role-bootstrap.js?eos=${assetCache}`)) fail('role bootstrap cache key mismatch');
if (!index.includes(`eos-branding-sanitizer.js?eos=${assetCache}`)) fail('branding sanitizer cache key mismatch');
if (!index.includes(`eos-policy-client.js?eos=${assetCache}`)) fail('policy client cache key mismatch');
if (!index.includes(`eos-role-ui.js?eos=${assetCache}`)) fail('role UI cache key mismatch');
// Security migration disables inherited shared-password accounts. The secured
// Admin account UI is required to provision individual temporary passwords.
if (!index.includes(`eos-account-management.js?eos=${assetCache}`)) fail('secured account-management runtime for credential migration must be loaded');
if (!read('adminWww/js/eos-account-management.js').includes('v98-account-management-real-password-write') ||
    read('adminWww/js/eos-account-management.js') !== read('src-admin/public/js/eos-account-management.js')) fail('secured account-management source/build drift');
if (!index.includes(`eos-auto-update.js?eos=${assetCache}`)) fail('auto-update JavaScript cache key mismatch');
if (!index.includes(`eos-auto-update.css?eos=${assetCache}`)) fail('auto-update CSS cache key mismatch');
if (!index.includes(`eos-assistant.js?eos=${assetCache}`)) fail('EOS Assist cache key mismatch');
if (!index.includes(`eos-ems-overview.js?eos=${assetCache}`)) fail('EMS overview cache key mismatch');
if (!index.includes(`eos-ems-overview.css?eos=${assetCache}`)) fail('EMS overview CSS cache key mismatch');
if (!index.includes(`nexowatt-stable-v${shellTag}.js?v=${shellTag}`)) fail('stable shell overlay cache key mismatch');
if (index.indexOf(`eos-manual-write-policy.js?eos=${assetCache}`) > index.indexOf(`hostInit-${runtime}.js?v=${runtimeNumber}`)) fail('manual-write policy must load before the React runtime');
if (!index.includes('class="eos-native-shell"')) fail('native NexoWatt shell class missing');
for (const legacy of ['eos-branding.js', 'eos-security-ui.js', 'eos-console-quiet.js', 'eos-objects-state-tools.js']) {
  if (index.includes(legacy)) fail(`legacy browser overlay still loaded: ${legacy}`);
}

const activeBootstrapFile = `adminWww/assets/bootstrap-COulQZax-${runtime}.js`;
for (const file of [
  `adminWww/assets/hostInit-${runtime}.js`,
  `adminWww/assets/index-CQZugZ1z-${runtime}.js`,
  activeBootstrapFile,
  `adminWww/assets/Objects-DPan0bzw-${runtime}.js`,
  `adminWww/assets/index-D2ymscJA-${runtime}.js`,
  `adminWww/remoteEntry-${runtime}.js`,
]) if (!exists(file)) fail(`missing active runtime file ${file}`);

const bootstrap = read(activeBootstrapFile);
if (!read(`adminWww/assets/index-CQZugZ1z-${runtime}.js`).includes(`bootstrap-COulQZax-${runtime}.js?eos=${assetCache}`)) fail('application entry must import the reviewed bootstrap cache namespace');
if (!bootstrap.includes('window.adapterName="eos-admin"')) fail('frontend bootstrap does not set window.adapterName="eos-admin"');
if (bootstrap.includes('window.adapterName="admin"')) fail('frontend bootstrap still contains window.adapterName="admin"');
for (const marker of ['NEXOWATT_TAB_ICON', 'nexowatt-native-nav-item', 'nexowatt-native-nav-icon', 'tabName:h.name', 'NexoWatt EOS', 'Zugänge & Rechte']) {
  if (!bootstrap.includes(marker)) fail(`active bootstrap missing native navigation marker ${marker}`);
}

const drawer = read('src-admin/src/components/Drawer.tsx');
const drawerItem = read('src-admin/src/components/DrawerItem.tsx');
const navIcon = read('src-admin/src/components/NexoWattNavIcon.tsx');
for (const marker of ['getNexoWattTabTitle', 'getNexoWattTabIcon', "'tab-intro': 'Übersicht'", "'tab-users': 'Zugänge & Rechte'", 'System-Notfallsicherung', 'NexoWatt Sicherung']) {
  if (!drawer.includes(marker)) fail(`Drawer source missing ${marker}`);
}
if (!drawerItem.includes('className="nexowatt-native-nav-item"') || !drawerItem.includes('data-eos-tab={tabName}')) fail('DrawerItem is not native-shell aware');
if (!navIcon.includes('eos-native-nav-icon-source') || !navIcon.includes('nexowatt-native-nav-icon')) fail('native SVG navigation icon component is incomplete');

const shell = read('adminWww/js/nexowatt-native-shell.js');
const shellCss = read('adminWww/css/nexowatt-native-shell.css');
const nativeSecurity = read('adminWww/js/eos-native-security.js');
const accountManagement = read('adminWww/js/eos-account-management.js');
if (!shell.includes(`const VERSION = 'v${shellCache}-nexowatt-native-shell`)) fail(`native shell version marker v${shellCache} missing`);
if (!shell.includes('Navigation labels and') || !shell.includes('rendered natively by Drawer.tsx')) fail('native shell ownership guard missing');
if (shell.includes('innerHTML = cfg.svg') || shell.includes('textNode.textContent = cfg.label')) fail('native shell still rewrites navigation icons or labels after render');
if (!shell.includes('NEXOWATT_EOS_DOM_COORDINATOR')) fail('native shell does not use the shared DOM coordinator');
if (!shellCss.includes('.nexowatt-native-nav-item') || !shellCss.includes('.eos-native-nav-icon') || !shellCss.includes('.nexowatt-native-nav-icon')) fail('native shell CSS lacks React navigation selectors');
if (!nativeSecurity.includes('shouldBlockInstanceDelete')) fail('minimal native security API missing instance protection');
if (/addEventListener\(['"]click['"]/.test(nativeSecurity)) fail('native security must not globally intercept clicks');
if (!accountManagement.includes('NEXOWATT_EOS_ACCOUNT_MANAGEMENT') || !accountManagement.includes('X-NexoWatt-EOS-Account-Reset') || !accountManagement.includes('ensureEntrySurface')) fail('account-management runtime is incomplete');
for (const marker of ['payload.temporaryPassword', "account.migrationDisabled && state.role === 'admin'", 'accountErrorText(payload.error)']) {
  if (!accountManagement.includes(marker)) fail(`secured account-management runtime missing ${marker}`);
}
if (accountManagement.includes("launcher.className = 'eos-account-management-launcher'")) fail('account management must not create a separate launcher');
if (accountManagement.includes('new MutationObserver')) fail('account-management runtime adds a second broad DOM observer');
if (read('src-admin/public/js/eos-account-management.js') !== accountManagement) fail('account-management source/build drift');
const roleBootstrap = read('adminWww/js/eos-role-bootstrap.js');
if (roleBootstrap.includes('installIntegratedFirstLogin(base);')) fail('passwordless first-login claim must remain disabled');
if (!/if\s*\(resolved\.mustChangePassword === true\)\s*\{\s*showFirstLoginPassword\(resolved, base\);\s*return resolved;/.test(roleBootstrap)) fail('authenticated temporary-password setup must block normal application launch');
if (/data-eos-account=|selector\.innerHTML/.test(roleBootstrap)) fail('login role buttons must not enlarge the normal login card');
if (!roleBootstrap.includes('nexowatt/account/passwordless-status') || !roleBootstrap.includes('eligibility.allowed')) fail('server-checked first-login eligibility is incomplete');
if (roleBootstrap.includes('installPasswordlessFirstLoginLauncher')) fail('old first-login launcher remains active');
const assistant = read('adminWww/js/eos-assistant.js');
if (!assistant.includes('NEXOWATT_EOS_ASSIST_DISABLED')) fail('EOS Assist must be disabled in stable');

const mf = read('adminWww/mf-manifest.json');
if (!mf.includes(`remoteEntry-${runtime}.js`) || !mf.includes(`index-D2ymscJA-${runtime}.js`)) fail('module federation manifest is not on the active runtime');

const webBuild = read('build/lib/web.js');
if (!webBuild.includes('refreshLifetime: 60 * 60 * 24 * 7')) fail('build/lib/web.js must keep upstream-compatible refresh lifetime');
if (!webBuild.includes('Follow upstream admin semantics again')) fail('build/lib/web.js lacks session compatibility fix');
if (!exists('build/lib/eosRequestSecurity.js')) fail('build/lib/eosRequestSecurity.js is missing');
const autoUpdateSource = read('src/lib/eosAutoUpdate.ts');
if (autoUpdateSource.includes('extendForeignObjectAsync(this.instanceId')) fail('auto-update runtime must not write the running instance native configuration');
if (!autoUpdateSource.includes("const ENABLED_STATE_ID = 'info.nexowattStableUpdatesEnabled'")) fail('restart-safe auto-update state storage is missing');
const mainBuild = read('build/main.js');
if (!mainBuild.includes('v37 BackItUp/runtime-adapter compatibility')) fail('build/main.js lacks BackItUp compatibility guard');

if (!pkg.scripts['nexowatt:patch-built-frontend']) fail('missing nexowatt:patch-built-frontend script');
if (pkg.scripts['check:eos-esm'] !== 'node tools/nexowatt-esm-syntax-selftest.cjs') fail('check:eos-esm script is missing or incorrect');
if (pkg.scripts['check:eos-imports'] !== 'node tools/nexowatt-import-integrity-selftest.cjs') fail('check:eos-imports script is missing or incorrect');
if (pkg.scripts['check:eos-backend-runtime'] !== 'node tools/nexowatt-backend-runtime-selftest.cjs') fail('check:eos-backend-runtime script is missing or incorrect');
if (pkg.scripts['check:eos-entry'] !== 'node tools/nexowatt-entrypoint-smoke-selftest.cjs') fail('check:eos-entry script is missing or incorrect');
if (!pkg.scripts['check:eos-stability']?.includes('nexowatt-esm-syntax-selftest.cjs')) fail('ESM syntax selftest is not part of check:eos-stability');
if (!pkg.scripts['check:eos-stability']?.includes('nexowatt-import-integrity-selftest.cjs')) fail('import integrity selftest is not part of check:eos-stability');
if (!pkg.scripts['check:eos-stability']?.includes('nexowatt-backend-runtime-selftest.cjs')) fail('backend runtime selftest is not part of check:eos-stability');
if (!pkg.scripts['check:eos-stability']?.includes('nexowatt-entrypoint-smoke-selftest.cjs')) fail('entrypoint smoke selftest is not part of check:eos-stability');
if (pkg.scripts['clean:eos-runtime'] !== 'node tools/nexowatt-clean-legacy-runtime.cjs') fail('clean:eos-runtime script is missing or incorrect');
if (pkg.scripts.prepack !== canonicalPrepack) fail('prepack must verify the sealed prebuilt artifact without tsc/tsx');
if (/\b(?:tsc|tsx)\b|build:(?:backend|frontend)|\bnpx\b|npm\s+(?:i|install|ci)\b/i.test(pkg.scripts.prepack || '')) fail('prepack must not require local development dependencies');
if (pkg.scripts.build !== 'npm run build:frontend && npm run build:backend && npm run clean:eos-runtime && npm run security:inventory && npm run seal:eos-prebuilt-release') fail('build must clean runtime, generate the reference inventory and seal after compilation');
if (!pkg.scripts['check:eos-stability']?.includes('nexowatt-role-access-selftest.cjs')) fail('role access selftest is not part of check:eos-stability');
if (!pkg.scripts['check:eos-stability']?.includes('nexowatt-account-password-flow-selftest.cjs')) fail('standard account-password flow selftest is not part of check:eos-stability');
if (!pkg.scripts['check:eos-stability']?.includes('nexowatt-account-password-flow-selftest.cjs')) fail('standard account-password management selftest is not part of check:eos-stability');
if (!pkg.scripts['check:eos-stability']?.includes('nexowatt-modern-ui-selftest.cjs')) fail('modern-UI selftest is not part of check:eos-stability');
if (pkg.scripts['test:eos-login-layout'] !== 'node tools/nexowatt-login-layout-selftest.cjs') fail('login-layout selftest script is missing or incorrect');
if (!pkg.scripts['check:eos-stability']?.includes('nexowatt-login-layout-selftest.cjs')) fail('login-layout selftest is not part of check:eos-stability');
if (!pkg.scripts['check:eos-stability']?.includes('nexowatt-internal-reserve-selftest.cjs')) fail('internal reserve selftest is not part of check:eos-stability');
if (!pkg.scripts['check:eos-stability']?.includes('nexowatt-branding-selftest.cjs')) fail('branding selftest is not part of check:eos-stability');
if (!pkg.scripts['check:eos-stability']?.includes('nexowatt-native-shell-selftest.cjs')) fail('native shell selftest is not part of check:eos-stability');
if (!pkg.scripts['check:eos-stability']?.includes('nexowatt-assistant-separation-selftest.cjs')) fail('assistant separation selftest is not part of check:eos-stability');
if (!exists('adminWww/img/eos/nexowatt-eos-brand-wide.png')) fail('new NexoWatt EOS brand logo asset missing');
if (!pkg.scripts['check:eos-stability']?.includes('nexowatt-runtime-cleanup-selftest.cjs')) fail('runtime cleanup selftest is not part of check:eos-stability');
if (!pkg.scripts['check:eos-stability']?.includes('nexowatt-ems-overview-selftest.cjs')) fail('EMS React overview selftest is not part of check:eos-stability');
if (!pkg.scripts['check:eos-stability']?.includes('nexowatt-ui-overview-runtime-selftest.cjs')) fail('EMS runtime selftest is not part of check:eos-stability');
if (!read('tasks.mts').includes('patchNexoWattBuiltFrontend')) fail('tasks.mts does not execute the EOS post-build frontend patch');

console.log('[NexoWatt EOS package validation] OK');
