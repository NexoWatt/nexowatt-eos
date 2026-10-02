#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const path=require('node:path');const root=path.resolve(__dirname,'..');const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');const must=(ok,msg)=>{if(!ok){console.error(`[NexoWatt EOS stable v97] ${msg}`);process.exit(1)}};
const pkg=JSON.parse(read('package.json'));const cleanup=read('tools/nexowatt-clean-legacy-runtime.cjs');const io=JSON.parse(read('io-package.json'));const info=JSON.parse(read('NEXOWATT_EOS_BUILD_INFO.json'));const css=read('adminWww/css/nexowatt-native-shell.css');const stable=read('adminWww/static/js/nexowatt-stable-v97.js');const login=read('adminWww/static/js/nexowatt-stable-login.js');const index=read('adminWww/index.html');const intro=read('src-admin/src/tabs/Intro.tsx');const introBundle=read('adminWww/assets/Intro-DkwRiz1n-v84.js');const bootstrap=read('adminWww/assets/bootstrap-COulQZax-v84.js');const generic=read('adminWww/assets/index-D2ymscJA-v84.js');const runtime=read('adminWww/js/eos-ems-overview.js');
must(pkg.version==='7.9.97'&&io.version==='7.9.97'&&io.common.version==='7.9.97'&&info.version==='7.9.97','version drift');
must(info.shellCacheVersion===97&&info.shellCacheTag==='97','shell cache is not v97');
must(css.includes('width: min(380px')&&css.includes('min-height: 510px')&&!css.includes('width: min(460px'),'compact login contract missing');
must(!login.includes('data-nw-login-card')&&!login.includes('min-height:590px')&&!stable.includes('width:min(460px'),'runtime still mutates login geometry');
must(stable.includes("VERSION = 'v97-compact-login-ems-connection'"),'stable v97 runtime incomplete');
must(index.includes('nexowatt-stable-v97.js?v=97')&&index.includes('nexowatt-native-shell.css?v=97'),'v97 assets not loaded');
must(intro.includes('NEXOWATT_EOS_ADMIN_SOCKET')&&introBundle.includes('nexowatt-eos-admin-socket-ready'),'Intro socket bridge missing');
must(bootstrap.includes('window.NEXOWATT_EOS_ADMIN_SOCKET=window.NEXOWATT_EOS_SOCKET=new AdminConnection'),'productive main socket exposure missing');
must(!generic.includes('this.socket=window.NEXOWATT_EOS_ADMIN_SOCKET=new M({'),'generic socket overwrite remains');
must(cleanup.includes('activeShell')&&cleanup.includes('nexowatt-stable-v')&&cleanup.includes("path.join(root, 'src-admin', 'public')"),'stale stable overlay cleanup missing');
must(runtime.includes('readUiAdapterInfo')&&runtime.includes('socketFromReact')&&runtime.includes("REQUIRED_UI_VERSION = '0.8.198'"),'EMS connection recovery missing');
console.log('[NexoWatt EOS stable v97] OK');
