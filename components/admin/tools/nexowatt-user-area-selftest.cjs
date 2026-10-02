#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const sourceWeb = read('src/lib/web.ts');
const builtWeb = read('build/lib/web.js');
const sourceRole = read('src-admin/public/js/eos-role-ui.js');
const runtimeRole = read('adminWww/js/eos-role-ui.js');
const sourceMain = read('src/main.ts');
const builtMain = read('build/main.js');

assert.equal(pkg.version, '7.10.11', 'security release must use its new npm version');
for (const web of [sourceWeb, builtWeb]) {
    assert.match(web, /nexowatt\/readonly\/system-info/, 'read-only system information endpoint missing');
    assert.match(web, /sendEosReadonlySystemInfo/, 'read-only system information handler missing');
    assert.match(web, /readSystemInfo/, 'bounded cached system information missing');
}
for (const helper of ['src/lib/eosWebResources.js', 'build/lib/eosWebResources.js']) {
    const code = read(helper);
    for (const field of ['platform', 'ramMb', 'nodejs', 'npm']) {
        assert.ok(code.includes(`${field}:`), `system information field missing: ${field}`);
    }
}
for (const role of [sourceRole, runtimeRole]) {
    assert.match(role, /state\.role !== 'enduser' \|\| currentRoute\(\) !== 'tab-intro'/, 'system-card correction must be End User-only');
    assert.match(role, /applyReadonlySystemInfoCard/, 'End User system-card correction missing');
    assert.match(role, /data-eos-enduser-action-hidden/, 'End User action-column suppression missing');
    assert.match(role, /Edit.*Delete.*Settings.*Tune.*Build/s, 'edit/delete/settings icon suppression missing');
    assert.match(role, /const readonly = state\.role === 'enduser' && currentRoute\(\) === 'tab-objects'/, 'datapoint restriction must be End User-only');
}
for (const main of [sourceMain, builtMain]) {
    assert.match(main, /if \(role === 'admin'\)/, 'Admin full-rights bypass missing');
    assert.match(main, /end-user datapoints are read-only in EOS Admin/, 'backend End User write denial missing');
}
console.log('[NexoWatt EOS user area] OK (End User read-only actions and system info; Admin unchanged)');
