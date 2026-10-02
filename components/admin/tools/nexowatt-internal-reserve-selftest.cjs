#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const json = rel => JSON.parse(read(rel));
let bad = false;
const fail = msg => { console.error(`[NexoWatt EOS internal reserve] ${msg}`); bad = true; };

const mainSource = read('src/main.ts');
const mainBuilt = read('build/main.js');
const webSource = read('src/lib/web.ts');
const webBuilt = read('build/lib/web.js');
const role = read('adminWww/js/eos-role-ui.js');
const boot = read('adminWww/js/eos-role-bootstrap.js');
const drawer = read('src-admin/src/components/Drawer.tsx');
const assist = read('adminWww/js/eos-assistant.js');
const io = json('io-package.json');

for (const code of [mainSource, mainBuilt]) {
  for (const marker of [
    "LEGACY_BACKUP_ADAPTER_NAME = 'backitup'", 'shouldHideLegacyBackupFromNonAdmins',
    'getLegacyBackupAclObjectIds', 'ensureLegacyBackupVisibleOnlyToAdmins',
    'EOS ACL guard restricted internal', '/^system\\.adapter\\.(?:admin|eos-admin|backitup|xterm)(?:\\.|$)/',
    '/^(?:admin|backitup|xterm)\\.\\d+(?:\\.|$)/', 'internal Service reserve is Admin/Service-only',
  ]) if (!code.includes(marker)) fail(`backend reserve marker missing: ${marker}`);
}
for (const code of [webSource, webBuilt]) {
  for (const marker of [
    "LEGACY_BACKUP_ADAPTER_NAME = 'backitup'", "CUSTOMER_BACKUP_ADAPTER_NAMES = ['nexowatt-backup', 'eos-backup']",
    'nexowattBackup: true', "internalBackupReserve: role === 'admin'", 'hideLegacyBackupFromNonAdmins',
    'legacyBackupAdapter', 'customerBackupAdapters',
  ]) if (!code.includes(marker)) fail(`web reserve marker missing: ${marker}`);
}
for (const marker of [
  'isOfficialAdminTab', 'isOfficialBackupTab', 'isOfficialReserveTab', 'isCustomerBackupTab',
  'system.adapter.backitup', 'tab-backitup', 'nexowatt-backup', 'eos-backup',
  'exact visible instance ID', 'data-eos-official-reserve-hidden', 'Reused virtual rows must be unhidden',
]) if (!role.includes(marker)) fail(`role UI reserve marker missing: ${marker}`);
for (const marker of ['isOfficialReserveTab', 'isCustomerBackupTab', 'backitup', 'nexowatt-backup']) {
  if (!boot.includes(marker)) fail(`bootstrap reserve marker missing: ${marker}`);
}
for (const marker of ['System-Notfallsicherung', 'NexoWatt Sicherung', '^tab-backitup', 'nexowatt-backup|eos-backup']) {
  if (!drawer.includes(marker)) fail(`Drawer reserve marker missing: ${marker}`);
}
if (!assist.includes('NEXOWATT_EOS_ASSIST_DISABLED')) fail('EOS Assist must remain disabled in the stable reserve test');
if (io.native?.eosHideLegacyBackupFromNonAdmins !== true) fail('eosHideLegacyBackupFromNonAdmins must default to true');
if (io.native?.nexowattHideLegacyBackupFromNonAdmins !== true) fail('nexowattHideLegacyBackupFromNonAdmins must default to true');
const reserve = (io.native?.eosProtectedAdapters || []).find(entry => entry.adapter === 'backitup');
if (!reserve?.enabled || !/Notfallreserve/i.test(String(reserve.note))) fail('backitup reserve is not clearly marked in the protected adapter defaults');
if (role.includes("/^tab-(?:admin|backitup|nexowatt-backup)/")) fail('customer backup must not be grouped with internal reserves');

if (bad) process.exit(1);
console.log('[NexoWatt EOS internal reserve] OK');
