#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');const root=path.resolve(__dirname,'..');const read=r=>fs.readFileSync(path.join(root,r),'utf8');const j=r=>JSON.parse(read(r));const fail=m=>{console.error('[NexoWatt EOS role access] '+m);process.exit(1)};const must=(v,m)=>{if(!v)fail(m)};
const source=read('src/main.ts'),built=read('build/main.js'),role=read('adminWww/js/eos-role-ui.js'),boot=read('adminWww/js/eos-role-bootstrap.js'),index=read('adminWww/index.html'),io=j('io-package.json');
for(const code of [source,built]){
 for(const marker of ['system.group.installateur','system.group.endkunde','ensureEosRoleModel',"command === 'changePassword'",'password administration is Service-only'] )must(code.includes(marker),`backend marker missing: ${marker}`);
 must(/users:\s*\{\s*list:\s*true,\s*read:\s*true,\s*write:\s*false/.test(code),'restricted users ACL must remain read-only');
 must(code.includes('eosPasswordSetupRequired.has(userId)'),'pending personal-password setup must block normal socket commands');
}
must(role.includes("route !== 'tab-users'")&&role.includes('filterNativeUsersPage'),'native user/account administration is not blocked for restricted roles');
must(role.includes("v7109-clean-core-surfaces-rbac"),'authoritative role UI version missing');
must(/eos-account-management\.js\?[^"']*security=20260930/.test(index),'secured account provisioning UI required for disabled shared-password accounts');
must(boot.includes('NEXOWATT_EOS_STANDARD_PASSWORD_MODE')&&!boot.includes('installIntegratedFirstLogin(base);')&&/if\s*\(resolved\.mustChangePassword === true\)\s*\{\s*showFirstLoginPassword\(resolved, base\);\s*return resolved;/.test(boot),'authenticated password-setup gate missing or passwordless activation enabled');
must(io.native.eosRequireFirstLoginPassword===true,'individual-password setup must be required for provisioned accounts');
console.log('[NexoWatt EOS role access] OK (Admin full authority, Installer EMS access, restricted account administration, End User read-only datapoints)');
