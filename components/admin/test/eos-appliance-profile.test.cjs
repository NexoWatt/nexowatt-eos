'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const https = require('node:https');
const { spawnSync } = require('node:child_process');
const { pbkdf2Sync } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const runtime = process.env.EOS_TEST_RUNTIME === 'build' ? 'build' : 'src';
const policy = require(path.join(root, runtime, 'lib/eosApplianceProfile.js'));
const old = { _id: 'system.adapter.nexowatt-ui.0', type: 'instance',
    common: { enabled: true, name: 'nexowatt-ui', version: '1.0.21', main: 'main.js', mode: 'daemon' }, native: { port: 8188 } };
const objects = { [old._id]: old };

test('integrated package has no optional telemetry/plugin declarations regardless of CI environment', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'io-package.json'), 'utf8'));
    assert.equal(Object.hasOwn(manifest.common, 'plugins'), false);
});

test('immutable appliance profile rejects configuration opt-outs and keeps all-interface TLS binding', () => {
    const result = policy.applyProfile({ auth: false, secure: false, port: 80, bind: '127.0.0.1',
        autoUpdate: 24, noBasicAuth: false, tmpPathAllow: true, eosAutoAssignDefaultRoleUsers: true, eosPasswordlessFirstLogin: true });
    assert.equal(result.auth, true); assert.equal(result.secure, true); assert.equal(result.port, 8081);
    assert.equal(result.bind, '0.0.0.0'); assert.equal(result.noBasicAuth, true); assert.equal(result.autoUpdate, 0);
    assert.equal(result.tmpPathAllow, false); assert.equal(result.eosAutoAssignDefaultRoleUsers, false);
    assert.equal(result.eosPasswordlessFirstLogin, false); assert.ok(Object.isFrozen(policy.PROFILE));
});
test('all browser package/file/shell routes are denied, including alias routes', () => {
    for (const command of ['cmdExec', 'writeFile', 'writeFile64', 'renameFile', 'deleteFolder', 'unlink',
        'httpGet', 'upload', 'updateLicenses']) assert.equal(policy.socketCommandAllowed(command, []), false, command);
    for (const command of ['cmdExec', 'upgradeController', 'getRepository', 'readObjectsAsZip', 'writeDirAsZip']) {
        assert.equal(policy.socketCommandAllowed('sendToHost', ['host', command, {}]), false, command);
    }
    assert.equal(policy.socketCommandAllowed('sendToHost', ['host', 'getHostInfo', {}]), true);
    assert.equal(policy.socketCommandAllowed('sendToHost', []), false);
});
test('existing instance configuration remains editable without permitting new executable identity or package creation', () => {
    assert.equal(policy.socketCommandAllowed('extendObject', [old._id, { native: { port: 8190 } }], objects), true);
    assert.equal(policy.socketCommandAllowed('setObject', [old._id, { ...old, native: { port: 8190 }, ts: 1 }], objects), true);
    assert.equal(policy.socketCommandAllowed('extendObject', [old._id, { common: { enabled: false } }], objects), true);
    for (const key of ['main', 'version', 'mode', 'nodeProcessParams']) {
        assert.equal(policy.socketCommandAllowed('extendObject', [old._id, { common: { [key]: 'changed' } }], objects), false, key);
    }
    assert.equal(policy.socketCommandAllowed('setObject', ['system.adapter.unreviewed.0', old], objects), false);
    assert.equal(policy.socketCommandAllowed('extendObject', ['system.adapter.nexowatt-ui', { common: {} }], objects), false);
});
test('native execution/npm flags are denied recursively while ordinary bounded device data remains possible', () => {
    for (const key of ['exec', 'additionalNpmModules', 'additionalNpmPackages', 'allowShellCommands', 'nodeProcessParams']) {
        assert.equal(policy.socketCommandAllowed('extendObject', [old._id, { native: { nested: { [key]: true } } }], objects), false, key);
    }
    assert.equal(policy.socketCommandAllowed('extendObject', [old._id, { native: JSON.parse('{"__proto__":{}}') }], objects), false);
    assert.equal(policy.socketCommandAllowed('extendObject', [old._id, { native: { measurements: [0, 1, 2], enabled: true } }], objects), true);
});
test('repository, certificate, host, identity and recursive deletion changes require privileged maintenance', () => {
    for (const id of ['system.repositories', 'system.certificates', 'system.host.local', 'system.meta.uuid', old._id]) {
        assert.equal(policy.socketCommandAllowed('delObjects', [id, { recursive: true }], objects), false, id);
    }
    assert.equal(policy.socketCommandAllowed('delObjects', ['system', {}], objects), false);
    assert.equal(policy.socketCommandAllowed('delObject', ['0_userdata.0.obsolete', {}], objects), true);
    assert.equal(policy.socketCommandAllowed('setState', ['system.host.local.messagebox', {}], objects), false);
    assert.equal(policy.socketCommandAllowed('setState', ['nexowatt-ui.0.normal-data', {}], objects), false);
});
test('setup profile denies direct plant commands and activation even to an authenticated Service socket', () => {
    for (const command of ['setState', 'setBinaryState', 'createState', 'delState']) {
        assert.equal(policy.socketCommandAllowed(command, ['ocpp21.0.station.start', { val: true }]), false);
    }
    assert.equal(policy.socketCommandAllowed('sendTo', ['ocpp21.0', 'startTransaction', {}]), false);
    assert.equal(policy.socketCommandAllowed('sendTo', ['eos-admin.0', 'eos.license.check', {}]), true);
    const physical = { ...old, _id: 'system.adapter.ocpp21.0', common: { ...old.common, enabled: false } };
    assert.equal(policy.socketCommandAllowed('extendObject', [physical._id, { common: { enabled: true } }], { [physical._id]: physical }), false);
    assert.equal(policy.socketCommandAllowed('extendObject', [physical._id, { common: { enabled: false } }], { [physical._id]: physical }), true);
});
test('raw account edits are denied even when the old password hash is preserved', () => {
    const id = 'system.user.operator'; const value = { type: 'user', common: { enabled: true, password: 'existing-test-hash' } };
    assert.equal(policy.socketCommandAllowed('setObject', [id, value], { [id]: value }), false);
    assert.equal(policy.socketCommandAllowed('extendObject', [id, { common: { password: 'weak-test-hash' } }], { [id]: value }), false);
});
test('dispatch boundary validates full payload before lossy upstream guard and blocks revoked own-password calls', () => {
    let called = 0; let current = true;
    const dispatcher = { commands: { extendObject() { called++; }, changePassword() { called++; }, sendToHost() { called++; } } };
    policy.installSocketBoundary(dispatcher, () => current, () => objects);
    dispatcher.commands.extendObject({}, old._id, { native: { port: 8190 } }, () => {});
    assert.equal(called, 1);
    let code;
    dispatcher.commands.extendObject({}, old._id, { common: { main: 'injected.js' } }, value => { code = value; });
    assert.equal(code, policy.ERROR); assert.equal(called, 1);
    current = false;
    dispatcher.commands.changePassword({ _acl: { user: 'system.user.admin' } }, 'system.user.admin', 'unused-test-password', value => { code = value; });
    assert.equal(code, policy.ERROR); assert.equal(called, 1);
});
test('upload rejection ends before any parser or filesystem write', () => {
    let status, value;
    policy.blockUnsignedUpload({}, { status(v) { status = v; return this; }, json(v) { value = v; } });
    assert.equal(status, 403); assert.equal(value.error, policy.ERROR);
});
test('protected certificate reader rejects writable parent chains and relative paths', { skip: process.platform !== 'linux' ? 'Linux UID/mode boundary requires target Linux host' : false }, () => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-admin-profile-'));
    try {
        const file = path.join(temporary, 'fixture'); fs.writeFileSync(file, 'non-secret-test-data', { mode: 0o600 });
        // /tmp itself is writable, regardless of this file's owner.
        assert.throws(() => policy.readProtectedFile(file), /EOS_TLS_PERMISSIONS/);
        assert.throws(() => policy.readProtectedFile('relative'), /EOS_TLS_PATH/);
    } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
});
test('password policy rejects weak/oversized input before database access', async () => {
    let reads = 0; const adapter = { async getForeignObjectAsync() { reads++; } };
    policy.installPasswordPolicy(adapter);
    for (const password of ['', 'short', 'x'.repeat(129), '界'.repeat(100)]) {
        await assert.rejects(adapter.setPasswordAsync('operator', password), /EOS_PASSWORD_POLICY/);
    }
    assert.equal(reads, 0);
});
test('password changes use supported stronger hash, preserve caller ACL options and revoke prior sessions', async () => {
    let record, revoked = 0; const options = { user: 'system.user.admin' };
    const adapter = { eosSessionSecurity: { revoke() { revoked++; } },
        async getForeignObjectAsync(id, opts) { assert.equal(id, 'system.user.operator'); assert.equal(opts, options); return { type: 'user' }; },
        async extendForeignObjectAsync(id, value, opts) { assert.equal(opts, options); record = value; } };
    policy.installPasswordPolicy(adapter);
    const password = 'ephemeral test passphrase';
    await adapter.setPasswordAsync('operator', password, options);
    const [kind, iterations, key, salt] = record.common.password.split('$');
    assert.equal(kind, 'pbkdf2'); assert.equal(iterations, '600000'); assert.equal(salt.length, 32); assert.equal(key.length, 512);
    assert.equal(pbkdf2Sync(password, salt, 600000, 256, 'sha256').toString('hex'), key); assert.equal(revoked, 1);
});
test('source and built integration both enforce fixed profile, fixed trust and real dispatch guard', () => {
    for (const directory of ['src', 'build']) {
        const main = fs.readFileSync(path.join(root, directory, directory === 'src' ? 'main.ts' : 'main.js'), 'utf8');
        const web = fs.readFileSync(path.join(root, directory, 'lib', directory === 'src' ? 'web.ts' : 'web.js'), 'utf8');
        assert.match(main, /installSocketBoundary/); assert.match(main, /installPasswordPolicy/);
        assert.match(main, /trustFile:.*PROFILE\.licenseTrust/); assert.match(web, /createApplianceHttpsServer/);
        assert.match(web, /blockUnsignedUpload/);
        const service = fs.readFileSync(path.join(root, directory, 'lib/eosLicenseService.js'), 'utf8');
        assert.doesNotMatch(service, /process\.env\.NEXOWATT_LICENSE_TRUST_FILE/);
    }
});
test('real HTTPS accepts verified TLS1.3 and rejects TLS1.2 and untrusted certificate', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-admin-tls-test-'));
    let server;
    try {
        const result = spawnSync('openssl', ['req', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:prime256v1',
            '-nodes', '-keyout', path.join(dir, 'key'), '-out', path.join(dir, 'cert'), '-days', '1', '-subj', '/CN=localhost',
            '-addext', 'subjectAltName=DNS:localhost', '-addext', 'basicConstraints=critical,CA:FALSE'], { stdio: 'ignore' });
        assert.equal(result.status, 0);
        const cert = fs.readFileSync(path.join(dir, 'cert')); const key = fs.readFileSync(path.join(dir, 'key'));
        assert.throws(() => policy.validateTlsMaterial(cert, key, 0), /EOS_TLS_CERTIFICATE/);
        assert.throws(() => policy.validateTlsMaterial(cert, Buffer.from('invalid')), /EOS_TLS_CERTIFICATE/);
        server = https.createServer(policy.validateTlsMaterial(cert, key), (_req, res) => res.end('ok'));
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        const request = extra => new Promise((resolve, reject) => {
            const req = https.get({ host: '127.0.0.1', servername: 'localhost', port: server.address().port,
                minVersion: 'TLSv1.3', rejectUnauthorized: true, ca: cert, agent: false, ...extra }, res => {
                res.resume(); res.once('end', () => resolve({ status: res.statusCode, protocol: res.socket.getProtocol() }));
            });
            req.setTimeout(2000, () => req.destroy(new Error('timeout'))); req.on('error', reject);
        });
        assert.deepEqual(await request({}), { status: 200, protocol: 'TLSv1.3' });
        await assert.rejects(request({ minVersion: 'TLSv1.2', maxVersion: 'TLSv1.2' }));
        await assert.rejects(request({ ca: undefined }));
    } finally { if (server) await new Promise(resolve => server.close(resolve)); fs.rmSync(dir, { recursive: true, force: true }); }
});
