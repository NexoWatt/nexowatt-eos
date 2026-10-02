#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');const root=path.resolve(__dirname,'..');const read=r=>fs.readFileSync(path.join(root,r),'utf8');const j=r=>JSON.parse(read(r));const must=(v,m)=>{if(!v){console.error('[NexoWatt EOS stable v7101] '+m);process.exit(1)}};
const p=j('package.json'),io=j('io-package.json'),info=j('NEXOWATT_EOS_BUILD_INFO.json'),main=read('src/main.ts'),boot=read('adminWww/js/eos-role-bootstrap.js'),role=read('adminWww/js/eos-role-ui.js'),css=read('adminWww/css/nexowatt-native-shell.css'),index=read('adminWww/index.html'),ems=read('adminWww/js/eos-ems-overview.js'),intro=read('src-admin/src/tabs/Intro.tsx'),bundle=read('adminWww/assets/Intro-DkwRiz1n-v84.js'),stable=read('adminWww/static/js/nexowatt-stable-v7101.js'),auto=read('src/lib/eosAutoUpdate.ts');
must(p.version==='7.10.1'&&io.version==='7.10.1'&&io.common.version==='7.10.1'&&info.version==='7.10.1','version drift');
must(io.native.eosRequireFirstLoginPassword===false&&io.native.eosRequireFirstLoginPasswordChange===false,'forced first password still enabled');
must(!index.includes('eos-account-management.js'),'custom reset UI still loaded');
must(!boot.includes('installIntegratedFirstLogin(base);')&&!boot.includes('showFirstLoginPassword(resolved, base);'),'forced first-login UI still active');
must(main.includes('standardPasswordMode: true')&&main.includes('nexowattPasswordChangeRequired: false'),'account migration missing');
must(role.includes("route === 'tab-users'")&&main.includes("command === 'changePassword'"),'role-aware native password editing missing');
must(css.includes('persistent native overview scrolling')&&stable.includes("overflow-y','scroll"),'persistent scroll missing');
must(intro.includes('eos-overview-edit-controls')&&bundle.includes('eos-overview-edit-controls'),'edit control not in bottom grid');
must(!ems.includes('Vollständige EMS-Diagnose öffnen'),'unsupported EMS link remains');
must(index.includes('eos-auto-update.js?v=7101')&&auto.includes("const POLICY: NexoWattAutoUpdatePolicy = 'major'"),'auto update missing');
console.log('[NexoWatt EOS stable v7101] OK');
