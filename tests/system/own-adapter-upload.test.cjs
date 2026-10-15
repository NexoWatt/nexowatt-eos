'use strict';
// Static unit/guard contracts. Actual asset storage and HTTPS visibility
// belong to the native six-adapter harness, not this source-level test.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { createGuard } = require('../../runtime/controller-profile/guard.cjs');
const own = require('../../runtime/bootstrap/own-adapter-enrollment.cjs');
const root = path.resolve(__dirname, '../..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const historical = read('system/postgresql-test/systemd/nexowatt-eos-upload.service');
const candidate = read('system/own-adapter-test/systemd/nexowatt-eos-upload.service');
const names = ['eos-admin', 'nexowatt-ui', 'nexowatt-devices', 'eebus', 'ocpp21', 'nexowatt-backup'];
const prefix = 'ExecStart=/usr/bin/node /opt/nexowatt/eos/current/app/node_modules/iobroker.js-controller/iobroker.js upload ';
const lines = value => value.split('\n');
const commands = value => lines(value).filter(line => line.startsWith('ExecStart='));

test('historical two-adapter upload unit remains byte-identical', () => {
    assert.equal(createHash('sha256').update(historical).digest('hex'), '8685af43580ec39a0bcdd12ec566345a8cafb1bae507a2792b1359882b342547');
    assert.deepEqual(commands(historical), names.slice(0, 2).map(name => prefix + name));
});

test('new TEST template invokes only the bounded asset helper, without CLI upload or arbitrary flags', () => {
    assert.deepEqual(commands(candidate), ['ExecStart=/usr/bin/node /opt/nexowatt/eos/current/runtime/bootstrap/upload-own-assets.cjs']);
    assert.deepEqual(own.SPECS.map(spec => spec.name), names);
    assert.ok(candidate.includes('Description=NexoWatt EOS signed six-own-adapter TEST asset upload\n'));
    assert.equal(lines(candidate).filter(line => line.startsWith('Type=')).join(), 'Type=oneshot');
    for (const command of commands(candidate)) assert.doesNotMatch(command, /(?:[*$;|&`]|\b(?:bash|sh|sudo|npm)\b|\supload(?:\s|$)| --)/);
});

test('new template preserves every historical sandbox, permission, bound, and preflight line', () => {
    const fixed = value => lines(value).filter(line => !line.startsWith('Description=') && !line.startsWith('ExecStart=')).join('\n');
    assert.equal(fixed(candidate), fixed(historical));
    assert.ok(candidate.includes('User=eos-runtime\nGroup=eos-runtime\n'));
    assert.ok(candidate.includes('NoNewPrivileges=yes\nCapabilityBoundingSet=\nAmbientCapabilities=\n'));
    assert.ok(candidate.includes('KillMode=control-group\n'));
});

test('unchanged controller guard retains package and shell restrictions; helper does not require wider execution admission', () => {
    const guard = createGuard(own.profileValue(), '/unused-build-tree');
    assert.equal(guard.blockCliCommand('upload'), false);
    for (const command of ['install', 'url', 'add', 'upgrade', 'restore', 'rebuild', 'delete', 'repo']) assert.equal(guard.blockCliCommand(command), true);
    for (const command of ['cmdExec', 'shell', 'rebuildAdapter', 'writeObjectsAsZip']) assert.equal(guard.blockHostCommand(command), true);
    for (const spec of own.SPECS) {
        const doc = { _id: `system.adapter.${spec.name}.0`, common: { name: spec.name, version: spec.version,
            main: spec.main, mode: 'daemon', nodeProcessParams: [], runAsCompactMode: false }, native: {} };
        assert.equal(guard.assertInstance(doc).package, `iobroker.${spec.name}`);
        doc.native.allowExec = true;
        assert.throws(() => guard.assertInstance(doc), /EOS_PROFILE_SHELL/);
    }
    assert.throws(() => guard.assertInstance({ _id: 'system.adapter.javascript.0', common: { name: 'javascript', version: '1.0.0' } }), /EOS_PROFILE_NOT_ADMITTED/);
});
