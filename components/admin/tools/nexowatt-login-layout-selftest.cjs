#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');const root=path.resolve(__dirname,'..');const read=r=>fs.readFileSync(path.join(root,r),'utf8');const fail=m=>{console.error('[NexoWatt EOS login layout] '+m);process.exit(1)};const must=(v,m)=>{if(!v)fail(m)};
const info=JSON.parse(read('NEXOWATT_EOS_BUILD_INFO.json')),shellTag=String(info.shellCacheTag||info.shellCacheVersion);const css=read('adminWww/css/nexowatt-native-shell.css'),source=read('src-admin/public/css/nexowatt-native-shell.css'),login=read('src-admin/src/login/Login.tsx'),stableLogin=read('adminWww/static/js/nexowatt-stable-login.js'),stable=read(`adminWww/static/js/nexowatt-stable-v${shellTag}.js`),index=read('adminWww/index.html');
must(css===source,'CSS mirror drift');
for(const marker of ['NexoWatt EOS 7.9.98 – stable scrolling','width: min(456px','width: min(400px','overflow: visible !important'])must(css.includes(marker),`base stable login marker missing: ${marker}`);
must(login.includes('placeholder={`${I18n.t(\'enterLogin\')} *`}')&&login.includes('placeholder={`${I18n.t(\'enterPassword\')} *`}'),'clean placeholder login missing');
must(!/data-nw-login-card|createElement\(['"]style/.test(stableLogin),'stable login runtime mutates geometry');
must(stable.includes(`VERSION = 'v${shellTag}-scroll-standard-password'`)&&!stable.includes('first-password'),'stable shell runtime incorrect');
must(index.includes(`nexowatt-stable-v${shellTag}.js?v=${shellTag}`),'current stable login runtime not active');
console.log('[NexoWatt EOS login layout] OK');
