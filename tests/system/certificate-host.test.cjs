'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { provision } = require('../../runtime/transport/redis-tls.cjs');
const { prepareRotation, rebindMarker } = require('../../runtime/transport/certificate-lifecycle.cjs');
const { runOperation, updateMarkers, rebindEnrollmentMarker, CONTROLLER, STORES } = require('../../tools/system/rotate-certificates.cjs');
const { provisionWeb } = require('../../runtime/transport/web-certificates.cjs');
const { credentialHashes, accountState, objectDatabase } = require('./fixtures/certificate-accounts.cjs');
let accountHashes;
test.before(async () => { accountHashes = await credentialHashes(); });
const root = fs.mkdtempSync('/root/eos-certificate-host-test-');
test.after(() => fs.rmSync(root, { recursive: true, force: true }));
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function fixture(t) {
    const target = fs.mkdtempSync(path.join(root, 'host-'));
    const etc = path.join(target, 'etc/nexowatt-eos'); fs.mkdirSync(etc, { recursive: true, mode: 0o755 });
    const data = path.join(target, 'var/lib/nexowatt-eos/redis'); fs.mkdirSync(data, { recursive: true, mode: 0o700 });
    const directory = path.join(etc, 'transport'); const configPath = path.join(etc, 'iobroker.json');
    provision({ directory, dataDirectory: data });
    const config = JSON.parse(fs.readFileSync(path.join(directory, 'credentials/iobroker-databases.json')));
    fs.writeFileSync(configPath, JSON.stringify(config), { mode: 0o640 });
    const marker = { _id: 'system.meta.eosTestBase', type: 'meta', native: { profile: 'eos-core-only-bootstrap-v1',
        coreControllerVersion: '7.2.2', bootstrapPolicyVersion: 1, creationAppLockSha256: 'a'.repeat(64), state: 'complete', runtimeConfigSha256: hash(config) } };
    const accountFixture = accountState(hash(config), accountHashes);
    const enrollment = accountFixture.marker;
    t.after(() => fs.rmSync(target, { recursive: true, force: true }));
    const calls = [], permits = [];
    const dependencies = { root: target, verifyHost: () => ({ release: path.join(target, 'release') }),
        exec: (command, args, options) => { calls.push({ command, args, options });
            return { status: 0, stdout: args.includes('--property=ActiveState') ? 'inactive\n' : args.includes('--property=MainPID') ? '0\n' : '', stderr: '', error: null }; },
        probe: async () => {}, rebind: async (oldConfig, newConfig) => { rebindMarker(marker, oldConfig, newConfig); },
        authorizeStart: (_directory, operation) => { permits.push(operation); }, blockStart: () => { permits.push('blocked'); } };
    return { target, etc, directory, configPath, config, marker, enrollment, accountDocs: accountFixture.docs, calls, permits, dependencies };
}
test('host status uses no service actions and releases common maintenance lock', async t => {
    const f = fixture(t); assert.equal((await runOperation('status', f.dependencies)).status, 'CERTIFICATES_VALID');
    assert.deepEqual(f.calls, []); assert.equal(fs.existsSync(path.join(f.etc, '.activation.lock')), false);
});
test('explicit host rotation uses only fixed bounded stop/start operations and resets start limits', async t => {
    const f = fixture(t); assert.equal((await runOperation('rotate', f.dependencies)).status, 'TRANSPORT_CERTIFICATES_ROTATED');
    assert.ok(f.calls.some(c => c.args[0] === 'stop' && c.args[1] === CONTROLLER));
    assert.ok(f.calls.some(c => c.args[0] === 'reset-failed' && c.args[1] === CONTROLLER));
    assert.ok(f.calls.some(c => c.args[0] === 'start' && c.args[1] === STORES[0]));
    assert.ok(f.calls.every(c => c.command === '/usr/bin/systemctl' && c.options.timeout === 90000));
    assert.deepEqual(f.permits, ['blocked', 'certificate-rotation', 'blocked']);
    assert.equal(fs.existsSync(path.join(f.etc, '.activation.lock')), false);
});
test('root privilege and installed release verification precede service actions', async t => {
    const f = fixture(t);
    await assert.rejects(runOperation('rotate', { ...f.dependencies, uid: 1000 }), /ROOT_OPERATOR_REQUIRED/);
    await assert.rejects(runOperation('rotate', { ...f.dependencies, verifyHost: () => { throw new Error('signature invalid'); } }), /signature invalid/);
    assert.deepEqual(f.calls, []);
});
test('release activation/enrollment lock blocks certificate maintenance', async t => {
    const f = fixture(t); fs.writeFileSync(path.join(f.etc, '.activation.lock'), JSON.stringify({ operation: 'enrollment', pid: process.pid }), { mode: 0o600 });
    await assert.rejects(runOperation('rotate', f.dependencies), /EOS_MAINTENANCE_IN_PROGRESS/);
    await assert.rejects(runOperation('recover', { ...f.dependencies, pidAlive: () => false }), /EOS_MAINTENANCE_LOCK_LIVE_OR_FOREIGN/);
    assert.deepEqual(f.calls, []);
});
test('live certificate process lock is not stolen by recovery', async t => {
    const f = fixture(t); fs.writeFileSync(path.join(f.etc, '.activation.lock'), JSON.stringify({ operation: 'certificate-rotation', pid: process.pid }), { mode: 0o600 });
    await assert.rejects(runOperation('recover', { ...f.dependencies, pidAlive: () => true }), /EOS_MAINTENANCE_LOCK_LIVE_OR_FOREIGN/);
    assert.deepEqual(f.calls, []);
});
test('explicit recovery can reclaim dead certificate operation and preserve old generation', async t => {
    const f = fixture(t); prepareRotation(f);
    fs.writeFileSync(path.join(f.etc, '.activation.lock'), JSON.stringify({ operation: 'certificate-rotation', pid: 12345 }), { mode: 0o600 });
    assert.equal((await runOperation('recover', { ...f.dependencies, pidAlive: () => false })).status, 'PREVIOUS_TRANSPORT_RESTORED');
    assert.deepEqual(JSON.parse(fs.readFileSync(f.configPath)), f.config);
    assert.equal(fs.existsSync(path.join(f.etc, '.activation.lock')), false);
});
test('a controller still running after stop prevents swap and retains recovery evidence', async t => {
    const f = fixture(t); const exec = f.dependencies.exec;
    f.dependencies.exec = (...args) => { const result = exec(...args); if (args[1].includes('--property=MainPID')) result.stdout = '123\n'; return result; };
    await assert.rejects(runOperation('rotate', f.dependencies), /ROTATION_FAILED_RECOVERY_REQUIRED/);
    assert.deepEqual(JSON.parse(fs.readFileSync(f.configPath)), f.config);
    assert.equal(fs.existsSync(path.join(f.etc, '.activation.lock')), true);
});
test('both marker hashes update; unrelated fields remain exact', async t => {
    const f = fixture(t); prepareRotation(f); const next = JSON.parse(fs.readFileSync(path.join(f.etc, '.eos-transport-rotation/next-config.json')));
    const docs = new Map([...f.accountDocs, [f.marker._id, f.marker]]);
    const db = objectDatabase(docs), before = structuredClone([...docs]);
    assert.equal((await updateMarkers(db, f.config, next)).enrollmentPresent, true);
    assert.equal(docs.get(f.enrollment._id).native.runtimeConfigSha256, hash(next));
    assert.deepEqual(docs.get(f.enrollment._id).common, f.enrollment.common);
    for (const [id, doc] of before) if (![f.marker._id, f.enrollment._id].includes(id)) assert.deepEqual(docs.get(id), doc);
    await updateMarkers(db, next, f.config); assert.deepEqual(docs.get(f.marker._id), f.marker); assert.deepEqual(docs.get(f.enrollment._id), f.enrollment);
});
test('invalid optional enrollment marker blocks both writes', async t => {
    const f = fixture(t); const bad = structuredClone(f.enrollment); bad.native.physicalControlEnabled = true; let writes = 0;
    const db = { getObjectAsync: async id => id === f.marker._id ? f.marker : bad, setObjectAsync: async () => { writes++; } };
    await assert.rejects(updateMarkers(db, f.config, f.config), /ENROLLMENT_MARKER_REBIND_REJECTED/); assert.equal(writes, 0);
    assert.equal(rebindEnrollmentMarker(null, f.config, f.config), null);
});
test('partial marker update can be reversed without accepting unrelated hashes', async t => {
    const f = fixture(t); prepareRotation(f); const next = JSON.parse(fs.readFileSync(path.join(f.etc, '.eos-transport-rotation/next-config.json')));
    const docs = new Map([...f.accountDocs, [f.marker._id, rebindMarker(f.marker, f.config, next)]]);
    const db = objectDatabase(docs);
    await updateMarkers(db, next, f.config); assert.deepEqual(docs.get(f.marker._id), f.marker); assert.deepEqual(docs.get(f.enrollment._id), f.enrollment);
});
test('version, service, role, ACL and password-setup drift all block both marker writes', async t => {
    const f = fixture(t);
    const cases = [
        [docs => { docs.get(f.enrollment._id).native.version = 1; }, 'ENROLLMENT_MARKER_REBIND_REJECTED'],
        [docs => { docs.get(f.enrollment._id).native.accountPolicyVersion = 2; }, 'ENROLLMENT_ACCOUNT_MARKER'],
        [docs => { docs.get(f.enrollment._id).native.accounts[0].role = 'service'; }, 'ENROLLMENT_ACCOUNT_MARKER'],
        [docs => { docs.get('system.user.admin').common.enabled = false; }, 'ENROLLMENT_ADMIN_DISABLED'],
        [docs => { docs.get('system.user.admin').acl.object = 0x664; }, 'ENROLLMENT_SERVICE_ACL'],
        [docs => { docs.get('system.user.admin').common.password = ''; }, 'ENROLLMENT_ADMIN_PASSWORD'],
        [docs => { docs.get('system.user.commissioning').acl.object = 0x664; }, 'ENROLLMENT_ACCOUNT_DRIFT'],
        [docs => { docs.get('system.user.commissioning').native.nexowattEosAccount.role = 'enduser'; }, 'ENROLLMENT_ACCOUNT_DRIFT'],
        [docs => { docs.get('system.user.commissioning').native.nexowattEosAccount.passwordInitialized = true; }, 'ENROLLMENT_ACCOUNT_STATE'],
        [docs => { docs.get('system.user.customer').native.nexowattEosAccount.passwordlessFirstLoginAllowed = true; }, 'ENROLLMENT_ACCOUNT_DRIFT'],
        [docs => { docs.get('system.group.installateur').common.acl.object.write = true; }, 'ENROLLMENT_GROUP_DRIFT'],
        [docs => { docs.get('system.group.endkunde').acl.object = 0x664; }, 'ENROLLMENT_GROUP_DRIFT'],
        [docs => { docs.get('system.group.administrator').common.members.push('system.user.commissioning'); }, 'ENROLLMENT_GROUP_DRIFT'],
        [docs => { docs.set('system.user.unenrolled', { _id: 'system.user.unenrolled', type: 'user' }); }, 'ENROLLMENT_UNEXPECTED_USER'],
    ];
    for (const [change, expected] of cases) {
        const docs = new Map(structuredClone([...f.accountDocs, [f.marker._id, f.marker]])); change(docs);
        const db = objectDatabase(docs); let writes = 0; db.setObjectAsync = async () => { writes++; };
        await assert.rejects(updateMarkers(db, f.config, f.config), error => error.code === expected);
        assert.equal(writes, 0, expected);
    }
});
test('account drift during marker commit is detected by post-write verification', async t => {
    const f = fixture(t), docs = new Map([...f.accountDocs, [f.marker._id, f.marker]]), db = objectDatabase(docs);
    const write = db.setObjectAsync; let writes = 0;
    db.setObjectAsync = async (id, doc) => {
        await write(id, doc); writes++;
        if (id === f.marker._id) docs.get('system.group.installateur').common.acl.users.write = true;
    };
    await assert.rejects(updateMarkers(db, f.config, f.config), /ENROLLMENT_GROUP_DRIFT/);
    assert.equal(writes, 2);
});
test('real second marker write interruption recovers v2 hashes without changing accounts', async t => {
    const f = fixture(t); prepareRotation(f); const next = JSON.parse(fs.readFileSync(path.join(f.etc, '.eos-transport-rotation/next-config.json')));
    const docs = new Map([...f.accountDocs, [f.marker._id, f.marker]]), before = structuredClone([...docs]), db = objectDatabase(docs);
    const write = db.setObjectAsync; let failed = false;
    db.setObjectAsync = async (id, doc) => {
        if (id === f.enrollment._id && !failed) { failed = true; throw Object.assign(new Error('FIXTURE_MARKER_WRITE'), { code: 'FIXTURE_MARKER_WRITE' }); }
        await write(id, doc);
    };
    await assert.rejects(updateMarkers(db, f.config, next), /FIXTURE_MARKER_WRITE/);
    assert.equal(docs.get(f.marker._id).native.runtimeConfigSha256, hash(next));
    assert.equal(docs.get(f.enrollment._id).native.runtimeConfigSha256, hash(f.config));
    await updateMarkers(db, next, f.config); assert.deepEqual([...docs], before);
});
test('core-only marker update remains valid with no enrollment/account lookup', async t => {
    const f = fixture(t), docs = new Map([[f.marker._id, f.marker]]), db = objectDatabase(docs);
    db.getObjectViewAsync = async () => { throw new Error('CORE_ONLY_ACCOUNT_QUERY'); };
    assert.equal((await updateMarkers(db, f.config, f.config)).enrollmentPresent, false);
});
test('status timer performs no rotation and systemd parses both units', t => {
    const dir = fs.mkdtempSync(path.join(root, 'units-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const unitRoot = path.resolve(__dirname, '../../system/test-base/systemd');
    const service = fs.readFileSync(path.join(unitRoot, 'nexowatt-eos-certificates.service'), 'utf8');
    assert.match(service, /rotate-certificates\.cjs status/); assert.doesNotMatch(service, /\.cjs rotate/);
    // This container has no /usr/bin/node. Substitute its actual Node binary
    // solely for systemd syntax/tool-existence verification, not product units.
    fs.writeFileSync(path.join(dir, 'nexowatt-eos-certificates.service'), service.replace('ExecStart=/usr/bin/node ', `ExecStart=${process.execPath} `));
    fs.copyFileSync(path.join(unitRoot, 'nexowatt-eos-certificates.timer'), path.join(dir, 'nexowatt-eos-certificates.timer'));
    const result = spawnSync('/usr/bin/systemd-analyze', ['verify', path.join(dir, 'nexowatt-eos-certificates.service'), path.join(dir, 'nexowatt-eos-certificates.timer')], { encoding: 'utf8', timeout: 10000 });
    assert.equal(result.status, 0, result.stderr);
});
test('status includes HTTPS expiry and rejects exposed CA signing key', async t => {
    const f = fixture(t); const directory = path.join(f.etc, 'web'); provisionWeb({ directory, hosts: ['eos.test'] });
    const result = await runOperation('status', f.dependencies); assert.equal(result.web.status, 'VALID'); assert.deepEqual(f.calls, []);
    fs.chmodSync(path.join(directory, 'authority/ca.key'), 0o640);
    await assert.rejects(runOperation('status', f.dependencies), /WEB_CERTIFICATE_CA_KEY_PERMISSIONS/);
});
test('explicit HTTPS renewal restarts controller and leaves Redis running', async t => {
    const f = fixture(t); provisionWeb({ directory: path.join(f.etc, 'web'), hosts: ['eos.test'] });
    f.dependencies.webProbe = async () => {};
    assert.equal((await runOperation('rotate-web', f.dependencies)).status, 'WEB_CERTIFICATES_RENEWED');
    assert.equal(f.calls.some(call => call.args.some(arg => STORES.includes(arg))), false);
    assert.deepEqual(f.permits, ['blocked', 'web-certificate-rotation', 'blocked']);
});
test('permit cleanup failure still attempts physical stop of controller and both Redis stores', async t => {
    const f = fixture(t); f.dependencies.blockStart = () => { throw new Error('fixture storage failure'); };
    await assert.rejects(runOperation('rotate', f.dependencies), /fixture storage failure/);
    assert.ok(f.calls.some(call => call.args[0] === 'stop' && call.args[1] === CONTROLLER));
    assert.ok(f.calls.some(call => call.args[0] === 'stop' && call.args[1] === STORES[0]));
    assert.deepEqual(JSON.parse(fs.readFileSync(f.configPath)), f.config);
    assert.equal(fs.existsSync(path.join(f.etc, '.activation.lock')), true);
});
