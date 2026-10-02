#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const json = relative => JSON.parse(read(relative));
const fail = message => {
    console.error(`[NexoWatt EOS auto-update placement] ${message}`);
    process.exit(1);
};
const must = (value, message) => value || fail(message);

const sourceJs = read('src-admin/public/js/eos-auto-update.js');
const builtJs = read('adminWww/js/eos-auto-update.js');
const sourceCss = read('src-admin/public/css/eos-auto-update.css');
const builtCss = read('adminWww/css/eos-auto-update.css');
const index = read('adminWww/index.html');
const info = json('NEXOWATT_EOS_BUILD_INFO.json');
const cacheTag = String(info.autoUpdateCacheTag || info.autoUpdateCacheVersion || info.shellCacheTag || info.shellCacheVersion);

must(sourceJs === builtJs, 'JavaScript source/build drift');
must(sourceCss === builtCss, 'CSS source/build drift');
must(sourceJs.includes("const VERSION = 'v7103-system-settings-only'"), 'v7103 placement marker missing');
must(sourceJs.includes('[role="dialog"][aria-labelledby="system-settings-dialog-title"]'), 'System Settings dialog selector missing');
must(sourceJs.includes("root.dataset.context = 'system-settings'"), 'System Settings context marker missing');
must(sourceJs.includes("root.setAttribute('data-eos-system-settings-only', 'true')"), 'system-settings-only marker missing');
must(sourceJs.includes('mount.content.insertBefore(root, mount.appBar.nextSibling)'), 'card is not inserted below the System Settings app bar');
must(sourceJs.includes("location: 'system-settings'"), 'public UI location contract missing');

for (const forbidden of [
    'introActive',
    'eos-native-overview-hero',
    'eos-ems-overview-runtime',
    "document.getElementById('app-paper')",
]) {
    must(!sourceJs.includes(forbidden), `global page placement remains active: ${forbidden}`);
}

must(index.includes(`eos-auto-update.js?v=${cacheTag}`), `auto-update JavaScript cache key ${cacheTag} missing`);
must(index.includes(`eos-auto-update.css?v=${cacheTag}`), `auto-update CSS cache key ${cacheTag} missing`);
must(sourceCss.includes('visible only inside the System Settings dialog'), 'CSS ownership comment missing');
must(sourceCss.includes('[data-context="system-settings"]'), 'System Settings CSS scope marker missing');

console.log('[NexoWatt EOS auto-update placement] OK (System Settings only; no Overview/Modules injection)');
