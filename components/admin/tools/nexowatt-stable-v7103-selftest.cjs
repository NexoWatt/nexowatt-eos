#!/usr/bin/env node
'use strict';
const assetCache = require('./nexowatt-browser-asset-version.cjs');

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const json = relative => JSON.parse(read(relative));
const must = (value, message) => {
    if (!value) {
        console.error(`[NexoWatt EOS stable v7103] ${message}`);
        process.exit(1);
    }
};

const pkg = json('package.json');
const io = json('io-package.json');
const info = json('NEXOWATT_EOS_BUILD_INFO.json');
const main = read('src/main.ts');
const web = read('src/lib/web.ts');
const boot = read('adminWww/js/eos-role-bootstrap.js');
const role = read('adminWww/js/eos-role-ui.js');
const css = read('adminWww/css/nexowatt-native-shell.css');
const index = read('adminWww/index.html');
const ems = read('adminWww/js/eos-ems-overview.js');
const intro = read('src-admin/src/tabs/Intro.tsx');
const bundle = read('adminWww/assets/Intro-DkwRiz1n-v84.js');
const stable = read(`adminWww/static/js/nexowatt-stable-v${String(info.shellCacheTag || info.shellCacheVersion)}.js`);
const autoBackend = read('src/lib/eosAutoUpdate.ts');
const autoUi = read('adminWww/js/eos-auto-update.js');
const autoCss = read('adminWww/css/eos-auto-update.css');
const autoTag = String(info.autoUpdateCacheTag || info.autoUpdateCacheVersion || info.shellCacheTag || info.shellCacheVersion);

must(/^\d+\.\d+\.\d+$/.test(pkg.version) && io.version === pkg.version && io.common.version === pkg.version && info.version === pkg.version, 'version drift');
must(io.native.eosRequireFirstLoginPassword === true, 'mandatory password setup disabled');
must(index.includes('eos-account-management.js'), 'unique credential provisioning UI missing');
must(!boot.includes('installIntegratedFirstLogin(base);') && boot.includes('showFirstLoginPassword(resolved, base);'), 'authenticated first-password UI missing or passwordless claim active');
must(main.includes('standardPasswordMode: false') && main.includes('disabledForCredentialMigration: true'), 'insecure credential migration missing');
must(role.includes("route !== 'tab-users'") && main.includes("command === 'changePassword'") && main.includes('password administration is Service-only'), 'non-admin account/password administration guard missing');
must(css.includes('persistent native overview scrolling') && stable.includes("overflow-y','scroll"), 'persistent scroll missing');
must(intro.includes('eos-overview-edit-controls') && bundle.includes('eos-overview-edit-controls'), 'edit control not in bottom grid');
must(!ems.includes('Vollständige EMS-Diagnose öffnen'), 'unsupported EMS link remains');

// 7.10.2 runtime and package hotfix baseline remains mandatory.
must(autoBackend.includes("const ENABLED_STATE_ID = 'info.nexowattStableUpdatesEnabled'"), 'restart-safe enabled state missing');
must(autoBackend.includes("const STATUS_STATE_ID = 'info.nexowattStableUpdatesState'"), 'restart-safe status state missing');
// 7.10.11 deliberately replaces the old automatic-update grace period with
// immediate fail-closed migration. Behavioral denial is covered by the manager test.
must(autoBackend.includes("await this.reconcile('startup-security-migration')"), 'unsafe update policies are not migrated before startup completes');
must(io.native.eosNexoWattAutoUpdate === false, 'unverified unattended upgrades enabled by default');
must(!autoBackend.includes('extendForeignObjectAsync(this.instanceId'), 'runtime still writes the running instance native configuration');
must(web.includes('this.nexowattStableUpdateManager?.stop();'), 'auto-update manager is not stopped with the web server');
must(fs.existsSync(path.join(root, 'build/lib/eosRequestSecurity.js')), 'eosRequestSecurity runtime module missing');

// 7.10.4 placement acceptance remains mandatory in 7.10.9: System Settings only.
must(index.includes(`eos-auto-update.js?eos=${assetCache}`), 'auto-update JavaScript cache key missing');
must(index.includes(`eos-auto-update.css?eos=${assetCache}`), 'auto-update CSS cache key missing');
must(autoUi.includes('[role="dialog"][aria-labelledby="system-settings-dialog-title"]'), 'System Settings selector missing');
must(autoUi.includes("root.dataset.context = 'system-settings'"), 'System Settings context missing');
must(autoUi.includes('mount.content.insertBefore(root, mount.appBar.nextSibling)'), 'card is not placed below System Settings header');
must(!autoUi.includes('introActive') && !autoUi.includes('eos-native-overview-hero') && !autoUi.includes('eos-ems-overview-runtime'), 'global overview/module placement remains');
must(autoCss.includes('visible only inside the System Settings dialog'), 'System Settings CSS ownership missing');

console.log('[NexoWatt EOS stable v7103] OK (v7102 crash/package baseline plus System Settings-only update control)');
