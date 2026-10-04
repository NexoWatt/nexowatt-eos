#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const json = relative => JSON.parse(read(relative));

const pkg = json('package.json');
const sourceRole = read('src-admin/public/js/eos-role-ui.js');
const runtimeRole = read('adminWww/js/eos-role-ui.js');
const sourceBoot = read('src-admin/public/js/eos-role-bootstrap.js');
const runtimeBoot = read('adminWww/js/eos-role-bootstrap.js');
const sourceShell = read('src-admin/public/js/nexowatt-native-shell.js');
const runtimeShell = read('adminWww/js/nexowatt-native-shell.js');
const sourceCss = read('src-admin/public/css/nexowatt-native-shell.css');
const runtimeCss = read('adminWww/css/nexowatt-native-shell.css');
const drawer = read('src-admin/src/components/Drawer.tsx');
const index = read('adminWww/index.html');

assert.equal(pkg.version, '7.10.11', 'retained 7.10.9 clean-core regression must run on security release 7.10.11');
assert.equal(sourceRole, runtimeRole, 'role source/runtime drift');
assert.equal(sourceBoot, runtimeBoot, 'bootstrap source/runtime drift');
assert.equal(sourceShell, runtimeShell, 'shell source/runtime drift');
assert.equal(sourceCss, runtimeCss, 'shell CSS source/runtime drift');

for (const code of [sourceRole, runtimeRole]) {
    assert.match(code, /const isGloballyHiddenTab = tab => normalize\(tab\) === 'tab-enums'/, 'global Structure hide missing');
    assert.match(code, /if \(route === 'easy' \|\| isGloballyHiddenTab\(route\)\) return false;/, 'direct Structure route is not denied');
    assert.match(code, /const isHeaderSystemSettingsButton = button =>/, 'header-only System Settings classifier missing');
    assert.match(code, /clickedButton && isHeaderSystemSettingsButton\(clickedButton\)/, 'service-row wrench/arrow can still be intercepted');
    assert.doesNotMatch(code, /clickedButton && isSystemSettingsButton\(clickedButton\)/, 'broad BuildIcon click interception remains');
    assert.doesNotMatch(code, /\['Struktur'.*tab-enums/s, 'Structure remains in role action definitions');
}
for (const code of [sourceBoot, runtimeBoot]) {
    assert.match(code, /!isGloballyHiddenTab\(route\)/, 'bootstrap does not deny Structure globally');
    assert.doesNotMatch(code, /route === 'tab-enums'/, 'End User bootstrap still releases Structure');
}
for (const code of [sourceShell, runtimeShell]) {
    assert.match(code, /const TECHNICAL_SURFACE_KEYS = new Set\(\['instances', 'objects', 'logs'\]\)/, 'technical route set missing');
    assert.match(code, /ensureTechnicalSurface\(\)/, 'technical surface styling is not applied');
    assert.match(code, /classifyTechnicalRows\(paper, surface\)/, 'technical row classification missing');
    assert.match(code, /eos-log-row-error/, 'log severity decoration missing');
    assert.doesNotMatch(code, /Live-Protokoll für Adapter/, 'redundant System Logs information remains');
    assert.doesNotMatch(code, /Messwerte, Status und freigegebene Steuerwerte/, 'redundant Datapoints information remains');
    assert.doesNotMatch(code, /Laufzeit, Status, Ressourcen und Konfiguration/, 'redundant Services information remains');
    assert.doesNotMatch(code, /header\.innerHTML/, 'technical page info header is still generated');
}
for (const css of [sourceCss, runtimeCss]) {
    for (const marker of [
        'html.eos-route-instances',
        'html.eos-route-objects',
        'html.eos-route-logs',
        '.eos-log-row-error',
    ]) assert.ok(css.includes(marker), `missing modern CSS marker ${marker}`);
    assert.ok(!css.includes('.eos-technical-surface-header'), 'unused technical information header CSS remains');
}
assert.doesNotMatch(drawer, /'tab-users',\s*'tab-enums'/, 'Structure is still part of readyToUse');
assert.match(drawer, /tab\.name !== 'tab-enums'/, 'Drawer does not hard-filter Structure');
assert.match(index, /nexowatt-native-shell\.css\?eos=20261004/, 'current EOS CSS cache key missing');
assert.match(index, /eos-role-ui\.js\?eos=20261004/, 'current EOS role cache key missing');
assert.match(index, /nexowatt-stable-v7109\.js\?v=7109/, '7.10.9 stable runtime missing');

console.log('[NexoWatt EOS v7109 clean core] OK (modern Services/Datapoints/Logs without redundant page information; Structure hidden; Installer controls native)');
