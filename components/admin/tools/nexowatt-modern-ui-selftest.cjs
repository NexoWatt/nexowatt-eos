#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');const root=path.resolve(__dirname,'..');const read=r=>fs.readFileSync(path.join(root,r),'utf8');const fail=m=>{console.error('[NexoWatt EOS modern UI] '+m);process.exit(1)};const must=(v,m)=>{if(!v)fail(m)};
const info=JSON.parse(read('NEXOWATT_EOS_BUILD_INFO.json')),shellTag=String(info.shellCacheTag||info.shellCacheVersion);const css=read('adminWww/css/nexowatt-native-shell.css'),sourceCss=read('src-admin/public/css/nexowatt-native-shell.css'),index=read('adminWww/index.html'),boot=read('adminWww/js/eos-role-bootstrap.js'),shell=read('adminWww/js/nexowatt-native-shell.js'),role=read('adminWww/js/eos-role-ui.js'),assist=read('adminWww/js/eos-assistant.js');
must(css===sourceCss,'CSS source/build drift');
for(const marker of ['#app-paper','.MuiDialog-paper','.MuiButton-root',':focus-visible','persistent native overview scrolling','eos-overview-edit-controls'])must(css.includes(marker),`CSS marker missing: ${marker}`);
for(const marker of ['nexowatt-native-shell.css','eos-role-bootstrap.js','eos-auto-update.js',`nexowatt-stable-v${shellTag}.js`])must(index.includes(marker),`active asset missing: ${marker}`);
must(index.includes('eos-account-management.js'),'unique credential provisioning UI missing');
must(boot.includes('NEXOWATT_EOS_STANDARD_PASSWORD_MODE')&&!boot.includes('installIntegratedFirstLogin(base);'),'standard login mode missing');
must(shell.includes('ensureModernOverview'),'modern overview missing');
must(role.includes('never cover the real Admin Intro')&&role.includes('filterNativeUsersPage'),'role UI contract missing');
must(assist.includes('NEXOWATT_EOS_ASSIST_DISABLED'),'assist disable guard missing');
console.log('[NexoWatt EOS modern UI] OK');
