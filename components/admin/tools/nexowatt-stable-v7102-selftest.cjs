#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const json = relative => JSON.parse(read(relative));
const must = (value, message) => {
    if (!value) {
        console.error(`[NexoWatt EOS stable v7102] ${message}`);
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
const stable = read('adminWww/static/js/nexowatt-stable-v7101.js');
const auto = read('src/lib/eosAutoUpdate.ts');

must(pkg.version === '7.10.2' && io.version === '7.10.2' && io.common.version === '7.10.2' && info.version === '7.10.2', 'version drift');
must(io.native.eosRequireFirstLoginPassword === false && io.native.eosRequireFirstLoginPasswordChange === false, 'forced first password still enabled');
must(!index.includes('eos-account-management.js'), 'custom reset UI still loaded');
must(!boot.includes('installIntegratedFirstLogin(base);') && !boot.includes('showFirstLoginPassword(resolved, base);'), 'forced first-login UI still active');
must(main.includes('standardPasswordMode: true') && main.includes('nexowattPasswordChangeRequired: false'), 'account migration missing');
must(role.includes("route === 'tab-users'") && main.includes("command === 'changePassword'"), 'role-aware native password editing missing');
must(css.includes('persistent native overview scrolling') && stable.includes("overflow-y','scroll"), 'persistent scroll missing');
must(intro.includes('eos-overview-edit-controls') && bundle.includes('eos-overview-edit-controls'), 'edit control not in bottom grid');
must(!ems.includes('Vollständige EMS-Diagnose öffnen'), 'unsupported EMS link remains');
must(index.includes('eos-auto-update.js?v=7101') && auto.includes("const POLICY: NexoWattAutoUpdatePolicy = 'major'"), 'auto update missing');

// 7.10.2 hotfix acceptance: no native writes on the running instance, delayed
// startup reconciliation, cleanup on Web.close and complete backend package.
must(auto.includes("const ENABLED_STATE_ID = 'info.nexowattStableUpdatesEnabled'"), 'restart-safe enabled state missing');
must(auto.includes("const STATUS_STATE_ID = 'info.nexowattStableUpdatesState'"), 'restart-safe status state missing');
must(auto.includes('const STARTUP_RECONCILE_DELAY_MS = 30_000'), 'startup grace period missing');
must(!auto.includes('extendForeignObjectAsync(this.instanceId'), 'runtime still writes the running instance native configuration');
must(web.includes('this.nexowattStableUpdateManager?.stop();'), 'auto-update manager is not stopped with the web server');
must(fs.existsSync(path.join(root, 'build/lib/eosRequestSecurity.js')), 'eosRequestSecurity runtime module missing');

console.log('[NexoWatt EOS stable v7102] OK (v7101 UI baseline plus restart-loop and package-completeness hotfix)');
