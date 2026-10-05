#!/usr/bin/env node
'use strict';
const assetCache = require('./nexowatt-browser-asset-version.cjs');
const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'..');const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');const json=rel=>JSON.parse(read(rel));let bad=false;const fail=msg=>{console.error(`[NexoWatt EOS account management] ${msg}`);bad=true;};
const mainSource=read('src/main.ts'),mainBuilt=read('build/main.js'),webSource=read('src/lib/web.ts'),webBuilt=read('build/lib/web.js'),sourceUi=read('src-admin/public/js/eos-account-management.js'),builtUi=read('adminWww/js/eos-account-management.js'),roleUi=read('adminWww/js/eos-role-ui.js'),css=read('adminWww/css/nexowatt-native-shell.css'),index=read('adminWww/index.html'),info=json('NEXOWATT_EOS_BUILD_INFO.json'),shellTag=String(info.shellCacheTag||info.shellCacheVersion);
for(const code of [mainSource,mainBuilt])for(const marker of ['system.user.installer','system.user.guest','ensureEosDefaultRoleUsers','unique credential provisioning by Admin required','eosPasswordSetupRequired','account disabled or password change required'])if(!code.includes(marker))fail(`main marker missing: ${marker}`);
for(const code of [webSource,webBuilt]){
 for(const marker of ['getEosManagedAccounts','sendEosAccountManagement','resetEosAccountPassword','/nexowatt/account/manage','/nexowatt/account/reset','x-nexowatt-eos-account-reset','canResetInstaller','canResetEndUser',"targetUserId === 'system.user.admin'",'targetUserId === access.userId',"access.role === 'installer' && explicitlyManagedRole !== 'enduser'",'passwordResetAt','passwordResetBy',"passwordResetMode = 'unique-temporary-password'","setEosUserPassword(targetUserId, temporaryPassword)",'passwordlessFirstLoginAllowed = false','initialPasswordRequired: true','accountDisabled','getEosPasswordUserName','setPasswordAsync(userName, password','checkPasswordAsync(userName, password','updateEosAccountMetadata','extendForeignObjectAsync','invalidRequestOrigin'])if(!code.includes(marker))fail(`web marker missing: ${marker}`);
 if(!code.includes('const explicitInstaller = targetAccess.groups.some')||!code.includes('const explicitEndUser = targetAccess.groups.some'))fail('explicit managed-group guard missing');
 const reset=code.slice(code.indexOf('resetEosAccountPassword'),code.indexOf('getEosHistoryInstances'));
 if(reset.includes('setForeignObjectAsync(targetUserId'))fail('reset replaces the complete user object after password write');
}
for(const marker of ['v98-account-management-real-password-write',"['admin', 'installer']",'nexowatt/account/manage','nexowatt/account/reset','X-NexoWatt-EOS-Account-Reset','data.canResetInstaller === true',"account.role === 'enduser'",'zufällige Startpasswort','accountErrorText','invalidRequestOrigin','credentials: \'include\'','NEXOWATT_EOS_ACCOUNT_MANAGEMENT','ensureEntrySurface',"currentRoute() !== 'tab-users'",'eos-account-management-entry'])if(!sourceUi.includes(marker))fail(`account UI marker missing: ${marker}`);
if(sourceUi.includes("launcher.className = 'eos-account-management-launcher'"))fail('standalone account launcher remains');
if(sourceUi.includes('new MutationObserver'))fail('account management adds a second broad MutationObserver');
if(sourceUi!==builtUi)fail('account UI source/build drift');
if(!roleUi.includes("route !== 'tab-users'"))fail('native account page must remain Admin-only');
if(!index.includes(`eos-account-management.js?eos=${assetCache}`))fail('account asset cache tag mismatch');
for(const marker of ['.eos-account-management-entry','.eos-account-management-overlay','.eos-account-management-dialog','.eos-account-row','.eos-account-reset'])if(!css.includes(marker))fail(`account CSS missing: ${marker}`);
if(bad)process.exit(1);console.log('[NexoWatt EOS account management] OK');
