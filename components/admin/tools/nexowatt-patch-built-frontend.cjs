#!/usr/bin/env node
'use strict';

/**
 * Post-build invariant guard for the NexoWatt EOS ObjectBrowser.
 *
 * The shared ObjectBrowser comes from @iobroker/adapter-react-v5. A dependency
 * update must never silently remove EOS manual-write semantics. This guard
 * validates the generated runtime and deliberately fails the build when the
 * generated structure no longer contains the reviewed v7.9.79 integration.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const adminWww = path.join(root, 'adminWww');
const buildInfo = JSON.parse(fs.readFileSync(path.join(root, 'NEXOWATT_EOS_BUILD_INFO.json'), 'utf8'));
const runtime = buildInfo.runtimeEntry;
const fail = message => { throw new Error(`[NexoWatt EOS post-build guard] ${message}`); };
const read = file => fs.readFileSync(file, 'utf8');

// Normalize and verify every generated bootstrap before inspecting runtime
// invariants. This prevents a malformed manual/source patch such as
// `},const NEXOWATT_NATIVE_SHELL_VERSION` from ever reaching a browser.
const assetsDir = path.join(adminWww, 'assets');
for (const name of fs.readdirSync(assetsDir).filter(file => /^bootstrap-.*\.js$/.test(file))) {
    const file = path.join(assetsDir, name);
    const before = read(file);
    const after = before.replace(/},\s*const\s+NEXOWATT_NATIVE_SHELL_VERSION/g, '};const NEXOWATT_NATIVE_SHELL_VERSION');
    if (after !== before) fs.writeFileSync(file, after);
}

const syntaxTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexowatt-post-build-esm-'));
try {
    for (const name of fs.readdirSync(assetsDir).filter(file => file.endsWith('.js'))) {
        const source = path.join(assetsDir, name);
        const target = path.join(syntaxTemp, `${name}.mjs`);
        fs.copyFileSync(source, target);
        const checked = spawnSync(process.execPath, ['--check', target], { encoding: 'utf8' });
        if (checked.status !== 0) fail(`invalid generated ES module ${name}: ${(checked.stderr || checked.stdout || '').trim()}`);
    }
} finally {
    fs.rmSync(syntaxTemp, { recursive: true, force: true });
}

const manifestPath = path.join(adminWww, 'mf-manifest.json');
if (!fs.existsSync(manifestPath)) fail('mf-manifest.json is missing');
const manifest = JSON.parse(read(manifestPath));
const sharedEntry = (manifest.shared || []).find(entry => entry.name === '@iobroker/adapter-react-v5');
const sharedAsset = sharedEntry?.assets?.js?.sync?.[0];
if (!sharedAsset) fail('cannot locate @iobroker/adapter-react-v5 shared bundle');
const sharedPath = path.join(adminWww, sharedAsset);
if (!fs.existsSync(sharedPath)) fail(`shared bundle is missing: ${sharedAsset}`);
const shared = read(sharedPath);

const requiredShared = [
    'if(!i||i.type!=="state"||!this.states)return null', // Non-state objects never render values
    'NEXOWATT_EOS_GET_WRITE_BEHAVIOR',                  // common.write + safety policy
    'NEXOWATT_EOS_GET_DIRECT_WRITE_VALUE',              // type-aware fallback values
    'NEXOWATT_EOS_RESOLVE_DIRECT_WRITE_VALUE',           // fresh-state switch resolution
    'NEXOWATT_EOS_PREPARE_MANUAL_EDITOR',                // array/object/mixed editor normalization
    'NEXOWATT_EOS_WRITE_MANUAL_STATE',                   // queued socket writes
    '"data-eos-object-writable":y?"1":"0"',
    'onClick:async Y=>',                                 // one deterministic value-cell click path
    'Wert setzen …',                                     // write-only state placeholder
    'closest("[data-eos-object-value-cell]")',          // row selection guard
];
for (const marker of requiredShared) if (!shared.includes(marker)) fail(`shared ObjectBrowser missing invariant: ${marker}`);
if (shared.includes('onClickCapture:Y=>')) fail('duplicate capture-phase datapoint write handler detected');
if (/onMouseDown:Y=>\{[^}]*preventDefault/.test(shared)) fail('value-cell mousedown calls preventDefault and can suppress click');
if (!shared.includes('!["readonly","expert-only"].includes(window.NEXOWATT_EOS_GET_WRITE_BEHAVIOR')) fail('context-menu edit does not obey policy');

const objectCandidates = fs.readdirSync(path.join(adminWww, 'assets'))
    .filter(file => new RegExp(`^Objects-.*-${runtime}\\.js$`).test(file))
    .map(file => ({ file, size: fs.statSync(path.join(adminWww, 'assets', file)).size }))
    .sort((a, b) => b.size - a.size);
if (!objectCandidates.length) fail(`cannot locate ${runtime} Objects route`);
const objects = read(path.join(adminWww, 'assets', objectCandidates[0].file));
for (const marker of [
    'NEXOWATT_EOS_MANUAL_WRITE_POLICY',
    'NEXOWATT_EOS_PARSE_MANUAL_VALUE',
    'eos-object-value-dialog',
    'this.state.writing',
    'Please wait...',
]) if (!objects.includes(marker)) fail(`ObjectBrowserValue dialog missing invariant: ${marker}`);
if (!objects.includes('!!this.state.jsonError||this.state.writing')) fail('value dialog does not block invalid or concurrent writes');

const activeBootstrapPath = path.join(adminWww, `assets/bootstrap-COulQZax-${runtime}.js`);
if (!fs.existsSync(activeBootstrapPath)) fail(`active bootstrap is missing: ${path.basename(activeBootstrapPath)}`);
const activeBootstrap = read(activeBootstrapPath);
if (activeBootstrap.includes('this.state.connected&&this.socket&&this.state.disableMcp===!1?jsxRuntimeExports.jsx(ChatPanel')) {
    fail('upstream ioBroker ChatPanel/external AI binding was re-enabled by the frontend build');
}
if (!activeBootstrap.includes('NEXOWATT_EXTERNAL_IOBROKER_ASSISTANT_DISABLED=!0')) {
    fail('assistant separation marker missing from active bootstrap');
}
const accountManagementPath = path.join(adminWww, 'js', 'eos-account-management.js');
if (!fs.existsSync(accountManagementPath)) fail('account-management runtime is missing');
const accountManagement = read(accountManagementPath);
for (const marker of ['NEXOWATT_EOS_ACCOUNT_MANAGEMENT', 'X-NexoWatt-EOS-Account-Reset']) {
    if (!accountManagement.includes(marker)) fail(`account-management runtime missing marker ${marker}`);
}
if (accountManagement.includes('new MutationObserver')) fail('account-management runtime adds a second broad DOM observer');

const eosAssistPath = path.join(adminWww, 'js', 'eos-assistant.js');
const eosAssist = read(eosAssistPath);
for (const marker of ['eos-assist-root', 'EOS Assist', 'EOS Hilfe']) {
    if (!eosAssist.includes(marker)) fail(`custom EOS Assist missing marker ${marker}`);
}
if (eosAssist.includes('disabled-market-hotfix')) fail('custom EOS Assist is disabled');

const importCheck = spawnSync(process.execPath, [path.join(root, 'tools', 'nexowatt-import-integrity-selftest.cjs')], {
    cwd: root,
    encoding: 'utf8',
});
if (importCheck.status !== 0) fail(`generated import graph is invalid: ${(importCheck.stderr || importCheck.stdout || '').trim()}`);

// The RBAC layer is part of the production frontend, not just the TypeScript source.
// A future frontend rebuild must therefore fail immediately if it removes the
// administrator full-rights branch, the reversible expert-mode control, the
// End User read-only datapoint policy, or restart-safe navigation persistence.
const roleSecurityCheck = spawnSync(process.execPath, [path.join(root, 'tools', 'nexowatt-role-security-selftest.cjs')], {
    cwd: root,
    encoding: 'utf8',
});
if (roleSecurityCheck.status !== 0) {
    fail(`generated role-security runtime is invalid: ${(roleSecurityCheck.stderr || roleSecurityCheck.stdout || '').trim()}`);
}

console.log(`[NexoWatt EOS post-build guard] OK (${sharedAsset}, ${objectCandidates[0].file})`);
