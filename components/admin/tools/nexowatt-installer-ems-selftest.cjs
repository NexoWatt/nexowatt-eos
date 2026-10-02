#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const json = file => JSON.parse(read(file));

const pkg = json('package.json');
const sourceRole = read('src-admin/public/js/eos-role-ui.js');
const runtimeRole = read('adminWww/js/eos-role-ui.js');
const sourceWeb = read('src/lib/web.ts');
const runtimeWeb = read('build/lib/web.js');

assert.equal(pkg.version, '7.10.11', 'Installer EMS regression must run on security release 7.10.11');
assert.equal(runtimeRole, sourceRole, 'built and source role runtimes must be identical');

for (const code of [sourceRole, runtimeRole]) {
    assert.match(code, /const privilegedActionKind = element =>/, 'privileged action classifier missing');
    assert.match(code, /return 'ems';/, 'EMS action classification missing');
    assert.match(code, /return 'simulation';/, 'Simulation action classification missing');
    assert.match(code, /return 'license';/, 'License action classification missing');
    assert.match(code, /action === 'ems'/, 'EMS-specific access branch missing');
    assert.match(
        code,
        /state\.role === 'installer' && state\.policy\?\.capabilities\?\.emsAppCenter !== false/,
        'Installer is not allowed to open EMS App-Center',
    );
    assert.match(code, /return state\.role === 'admin';/, 'Simulation and License must remain Admin-only');
    assert.match(code, /!canUsePrivilegedAction\(element\)/, 'UI visibility does not use the role-aware action permission');
    assert.match(code, /\|\| canUsePrivilegedAction\(target\)\) return;/, 'click guard does not use the role-aware action permission');
    assert.match(code, /if \(state\.role !== 'enduser'\) return;/, 'port 8188 session scrubbing must apply only to End User');
}

for (const code of [sourceWeb, runtimeWeb]) {
    assert.match(code, /emsAppCenter: technical/, 'backend capability must grant EMS App-Center to Admin and Installer');
    assert.match(code, /simulation: role === 'admin'/, 'Simulation capability must remain Admin-only');
    assert.match(code, /licenseAdministration: role === 'admin'/, 'License capability must remain Admin-only');
}

console.log('[NexoWatt EOS installer EMS] OK (Installer may use EMS App-Center; Simulation/License remain Admin-only; End User remains blocked)');
