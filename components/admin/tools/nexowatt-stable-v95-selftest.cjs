const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function readJson(name){return JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));}
function must(ok,msg){if(!ok){console.error(`[NexoWatt EOS stable v95] ${msg}`);process.exit(1);}}
const pkg=readJson('package.json');
const io=readJson('io-package.json');
must(pkg.version==='7.9.95','package version must be 7.9.95');
must(io.common.version==='7.9.95','io-package version must be 7.9.95');
must(pkg.author==='NexoWatt' && pkg.publisher==='NexoWatt','visible author and publisher must be NexoWatt');
must(io.native.port===8081,'EOS default port must be 8081');
must(io.native.auth===true,'authentication must be enabled');
must(io.native.eosAllowPasswordlessFirstLogin===false,'passwordless first login must be disabled');
must(io.native.eosRequireFirstLoginPasswordChange===true,'mandatory first password change must be enabled');
must(io.native.disableMcp===true && io.native.eosAssistantEnabled===false,'EOS Assist must be disabled in stable');
const main=fs.readFileSync(path.join(root,'build/main.js'),'utf8');
must(main.includes("EOS_STABLE_INITIAL_PASSWORD = 'nexowatt'"),'stable initial password bootstrap is missing');
must(main.includes("{ user: 'installer', role: 'installer' }") && main.includes("{ user: 'guest', role: 'customer' }") && main.includes("{ user: 'user', role: 'customer' }"),'managed accounts are incomplete');
must(main.includes('nexowattPasswordChangeRequired: true'),'mandatory password-change marker is missing');
const overlay=fs.readFileSync(path.join(root,'adminWww/static/js/nexowatt-stable-login.js'),'utf8');
must(overlay.includes('min-height:540px') && overlay.includes('overflow:visible'), 'login card sizing/overflow guard is missing');
must(overlay.includes("MANAGED_USERS.has(name) && !pass"),'blank-password login guard is missing');
must(overlay.includes('ASSIST_TEXT'),'EOS Assist visibility guard is missing');
const html=fs.readFileSync(path.join(root,'adminWww/index.html'),'utf8');
must(html.includes('nexowatt-stable-login.js?v=95'),'stable v95 runtime overlay is not loaded');
const bad=[];
for(const rel of ['io-package.json','admin/jsonConfig.json','admin/jsonConfig.json5']){
 const f=path.join(root,rel); if(fs.existsSync(f)){const s=fs.readFileSync(f,'utf8'); if(/[ÃÂ]|â€|â€“|â€”/.test(s))bad.push(rel);}
}
must(!bad.length,`mojibake remains in ${bad.join(', ')}`);
console.log('[NexoWatt EOS stable v95] OK');

const web=fs.readFileSync(path.join(root,'build/lib/web.js'),'utf8');
must(web.includes("passwordResetMode = 'initial-password'") && web.includes("setEosUserPassword(targetUserId, 'nexowatt')"),'account reset does not restore the fixed initial-password flow');
must(web.includes('native.nexowattPasswordChangeRequired = true') && web.includes('stableForced'),'web first-login state is not connected to stable account flags');
const mergeScript=fs.readFileSync(path.join(root,'MERGE_UPDATE.ps1'),'utf8');
must(mergeScript.includes('nexowatt-sync-release-version.cjs') && mergeScript.includes('check:eos-package') && mergeScript.includes('check:eos-stability'),'merge update helper is incomplete');
const packageJson=readJson('package.json');
must(packageJson.scripts['sync:eos-version']==='node tools/nexowatt-sync-release-version.cjs','version sync script is missing');
console.log('[NexoWatt EOS stable v95 merge packaging] OK');
