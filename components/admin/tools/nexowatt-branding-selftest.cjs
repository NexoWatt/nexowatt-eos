#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
let bad = false;
const fail = msg => { console.error(`[NexoWatt EOS branding] ${msg}`); bad = true; };
const index = read('adminWww/index.html');
const sanitizer = read('adminWww/js/eos-branding-sanitizer.js');
const manifest = JSON.parse(read('adminWww/manifest.json'));
const license = read('adminWww/js/license.js');
const login = read('src-admin/src/login/Login.tsx');
const manual = read('adminWww/js/eos-manual-write-policy.js');
const io = JSON.parse(read('io-package.json'));

if (!index.includes('eos-branding-sanitizer.js')) fail('branding sanitizer is not loaded');
if (!index.includes('<title>NexoWatt EOS - Energy Operation System</title>')) fail('browser title is not NexoWatt EOS');
if (!index.includes("window.loginTitle = 'NexoWatt EOS'")) fail('login title is not fixed to NexoWatt EOS');
if (!sanitizer.includes("document.title = 'NexoWatt EOS – Energy Operation System'")) fail('runtime title hardening missing');
for (const marker of ["['ioBroker.admin', 'NexoWatt EOS Admin']", "['ioBroker Admin', 'NexoWatt EOS Admin']", 'data-eos-preserve-attribution', 'NEXOWATT_EOS_DOM_COORDINATOR']) {
  if (!sanitizer.includes(marker)) fail(`runtime replacement missing: ${marker}`);
}
if (sanitizer.includes('replace(/ioBroker/gi')) fail('branding must not rewrite arbitrary technical or legal content');
if (read('src-admin/public/js/eos-branding-sanitizer.js') !== sanitizer) fail('branding source/build drift');
if ((sanitizer.match(/new MutationObserver/g) || []).length) fail('branding layer must use the shared DOM observer');
if (manifest.short_name !== 'NexoWatt EOS' || !String(manifest.name).startsWith('NexoWatt EOS')) fail('manifest branding is inconsistent');
if (/ioBroker/i.test(license)) fail('browser-visible license dialog still names the upstream platform');
if (/^\s*ioBroker\s*$/m.test(login)) fail('login footer still displays the upstream brand');
if (/ioBroker socket is not ready/i.test(manual)) fail('customer-visible connection error still names the upstream platform');
const updates = (io.notifications || []).flatMap(scope => scope.categories || []).find(cat => cat.category === 'adapterUpdates');
if (updates && Object.values(updates.description || {}).some(text => /ioBroker/i.test(String(text)))) fail('update notification still displays the upstream brand');
// Technical package IDs, compatibility routes and third-party legal notices intentionally remain unchanged.

const accountManagement = read('adminWww/js/eos-account-management.js');
if (!accountManagement.includes('NexoWatt EOS') || accountManagement.includes('ioBroker')) fail('account management visible branding is not NexoWatt-only');
if (read('src-admin/public/js/eos-account-management.js') !== accountManagement) fail('account management source/build drift');
if (bad) process.exit(1);
console.log('[NexoWatt EOS branding] OK');
