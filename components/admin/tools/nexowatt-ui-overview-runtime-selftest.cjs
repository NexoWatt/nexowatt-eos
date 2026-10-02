#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const path=require('node:path');const root=path.resolve(__dirname,'..');const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');const fail=msg=>{console.error(`[NexoWatt EOS UI overview runtime] ${msg}`);process.exit(1)};
const info=JSON.parse(read('NEXOWATT_EOS_BUILD_INFO.json')),shellTag=String(info.shellCacheTag||info.shellCacheVersion);const runtime=read('adminWww/js/eos-ems-overview.js');const source=read('src-admin/public/js/eos-ems-overview.js');const css=read('adminWww/css/eos-ems-overview.css');const index=read('adminWww/index.html');const role=read('adminWww/js/eos-role-ui.js');const shell=read('adminWww/js/nexowatt-native-shell.js');const intro=read('src-admin/src/tabs/Intro.tsx');const introBundle=read('adminWww/assets/Intro-DkwRiz1n-v84.js');const bootstrap=read('adminWww/assets/bootstrap-COulQZax-v84.js');const generic=read('adminWww/assets/index-D2ymscJA-v84.js');
if(runtime!==source)fail('runtime source/build drift');
if(runtime.includes('Vollständige EMS-Diagnose öffnen'))fail('unsupported EMS link remains');
for(const marker of ['nexowatt-ems-overview-v1','nexowatt-ui.*.info.adminOverview.*','system.adapter.nexowatt-ui.*.alive','POLL_MS = 5000','STALE_MS = 20000',"REQUIRED_UI_VERSION = '0.8.198'",'getForeignStates','Keine Kachel besitzt Schreibhoheit','currentDecisions','§14a-Fallback','nexowatt-eos-admin-socket-ready','readUiAdapterInfo','socketFromReact'])if(!runtime.includes(marker))fail(`runtime marker missing: ${marker}`);
for(const forbidden of ['setForeignState','setState(','sendToHost','writeFile','extendObject'])if(runtime.includes(forbidden))fail(`read-only runtime contains ${forbidden}`);
for(const marker of [`eos-ems-overview.css?v=${shellTag}`,`eos-ems-overview.js?v=${shellTag}`,`nexowatt-stable-v${shellTag}.js?v=${shellTag}`])if(!index.includes(marker))fail(`index marker missing: ${marker}`);
if(!css.includes('#eos-ems-overview-runtime')||!css.includes('.eos-ems-overview-metrics')||!css.includes('startup and compatibility messages stay compact'))fail('EMS card CSS incomplete');
if(role.includes('overview.innerHTML = `')||!role.includes('never cover the real Admin Intro'))fail('obsolete role overview still active');
if(!shell.includes("label: 'Installateur'")||!shell.includes("label: 'Endkunde'")||!shell.includes('eosNativeReactOverview'))fail('native overview role bridge incomplete');
if(!intro.includes('NEXOWATT_EOS_ADMIN_SOCKET')||!intro.includes('nexowatt-eos-admin-socket-ready'))fail('source Intro socket bridge missing');
if(!introBundle.includes('NEXOWATT_EOS_ADMIN_SOCKET')||!introBundle.includes('nexowatt-eos-admin-socket-ready'))fail('productive Intro socket bridge missing');
if(!bootstrap.includes('window.NEXOWATT_EOS_ADMIN_SOCKET=window.NEXOWATT_EOS_SOCKET=new AdminConnection'))fail('productive main AdminConnection exposure missing');
if(generic.includes('this.socket=window.NEXOWATT_EOS_ADMIN_SOCKET=new M({'))fail('generic adapter helper still overwrites main AdminConnection');
console.log('[NexoWatt EOS UI overview runtime] OK');
