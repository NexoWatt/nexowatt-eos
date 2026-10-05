'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const enrollment = require('../../runtime/bootstrap/enrollment.cjs');
const accountsPolicy = require('../../runtime/bootstrap/accounts.cjs');
const accounts = { schemaVersion: 1, accounts: [{ username: 'commissioning', role: 'installer', password: crypto.randomBytes(24).toString('base64url') }, { username: 'customer', role: 'enduser', password: crypto.randomBytes(24).toString('base64url') }] };
let app, hashed;
const secret = crypto.randomBytes(24).toString('base64url');
before(async () => {
    app = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-enroll-test-'));
    const controller = path.join(app, 'node_modules/iobroker.js-controller'); fs.mkdirSync(controller, { recursive: true });
    fs.writeFileSync(path.join(controller, 'eos-test-profile.json'), JSON.stringify({ schemaVersion: 1, kind: 'eos-controller-test-profile', controllerVersion: '7.2.2', adapters: enrollment.SPECS.map(s => ({ package: `iobroker.${s.name}`, version: s.version, main: s.main })) }));
    for (const spec of enrollment.SPECS) {
        const root = path.join(app, 'node_modules', `iobroker.${spec.name}`); fs.mkdirSync(root);
        fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: `iobroker.${spec.name}`, version: spec.version, main: spec.main }));
        fs.writeFileSync(path.join(root, 'io-package.json'), JSON.stringify({ common: { name: spec.name, version: spec.version }, native: {} }));
    }
    hashed = await enrollment.passwordHash(secret);
});
after(() => fs.rmSync(app, { recursive: true, force: true }));
function fixture() {
    const config = { system: { hostname: 'test-host' }, objects: { options: { tls: {} } }, states: { options: { tls: {} } } };
    const configHash = crypto.createHash('sha256').update(JSON.stringify(config)).digest('hex');
    const docs = new Map([
        ['system.meta.eosTestBase', { native: { state: 'complete', profile: 'eos-core-only-bootstrap-v1', coreControllerVersion: '7.2.2', bootstrapPolicyVersion: 1, runtimeConfigSha256: configHash } }],
        ['system.config', { common: { diag: 'none', activeRepo: [], adapterAutoUpgrade: { defaultPolicy: 'none', repositories: {} } } }],
        ['system.repositories', { native: { repositories: {}, oldRepositories: {} } }],
        ['system.group.administrator', { _id: 'system.group.administrator', type: 'group', common: { members: ['system.user.admin'] } }],
        ['system.user.admin', { _id: 'system.user.admin', type: 'user', common: { enabled: false, password: '' } }],
    ]);
    const context = { app, config, docs, password: secret, accounts, writes: 0, fresh: 0, states: { getState: async () => ({ val: false }) },
        verifyFresh: async () => { context.fresh++; },
        objects: { getObjectAsync: async id => structuredClone(docs.get(id)),
            setObjectAsync: async (id, doc) => { context.writes++; docs.set(id, structuredClone(doc)); },
            getObjectViewAsync: async (_design, view) => ({ rows: [...docs.values()].filter(d => d.type === view).map(value => ({ id: value.common?.name || 'display name', value })) }) } };
    return context;
}
function complete() {
    const c = fixture();
    c.docs.get('system.user.admin').common = { enabled: true, password: hashed };
    c.docs.get('system.user.admin').acl = { ...accountsPolicy.PRIVATE_ACL };
    c.docs.set(enrollment.MARKER, { native: { profile: enrollment.PROFILE, version: 2, state: 'complete', accountPolicyVersion: 1, accounts: accountsPolicy.inventory(accounts.accounts),
        runtimeConfigSha256: c.docs.get('system.meta.eosTestBase').native.runtimeConfigSha256, physicalControlEnabled: false } });
    for (const row of accounts.accounts) { const doc = accountsPolicy.userDocument(row, hashed); c.docs.set(doc._id, doc); }
    for (const role of Object.keys(accountsPolicy.ROLES)) { const doc = accountsPolicy.groupDocument(role, accounts.accounts); c.docs.set(doc._id, doc); }
    for (const entry of enrollment.pinnedAdapters(app)) { const doc = enrollment.instanceDocument(entry, c.config.system.hostname); c.docs.set(doc._id, doc); }
    return c;
}
test('initial enrollment stores only hash and disabled fixed instances; verifies without writes', async () => {
    const c = fixture(); const result = await enrollment.enroll(c);
    assert.equal(result.status, 'INTEGRATED_UI_LAB_VERIFIED'); assert.equal(result.adaptersEnabled, 0);
    assert.equal(result.physicalControlEnabled, false); assert.equal(c.fresh, 1);
    assert.equal(c.docs.get('system.config').common.licenseConfirmed, true);
    assert.equal(c.docs.get('system.config').common.diag, 'none');
    const password = c.docs.get('system.user.admin').common.password;
    enrollment.strongHash(password); assert.ok(!JSON.stringify([...c.docs]).includes(secret));
    const [, iterations, key, salt] = password.split('$');
    const derived = await new Promise((resolve, reject) => crypto.pbkdf2(secret, salt, Number(iterations), 256, 'sha256', (error, value) => error ? reject(error) : resolve(value)));
    assert.equal(derived.toString('hex'), key);
    const writes = c.writes; await enrollment.verify(c); assert.equal(c.writes, writes);
    await assert.rejects(enrollment.enroll(c), /ENROLLMENT_ALREADY_ATTEMPTED/);
});
for (const value of ['', 'short', 'x'.repeat(129), 'a'.repeat(14), 'a'.repeat(20) + '\n', {}, null, '🌍'.repeat(100)]) {
    test(`password rejects bounded invalid input ${typeof value}:${typeof value === 'string' ? value.length : 0}`, () => assert.throws(() => enrollment.validatePassword(value), /ENROLLMENT_PASSWORD_POLICY/));
}
test('password allows long unicode passphrase without composition tricks', () => assert.equal(enrollment.validatePassword('Wörter mit Abstand und Bedeutung'), 'Wörter mit Abstand und Bedeutung'));
for (const [name, mutate, expected] of [
    ['marker pending', c => c.docs.get(enrollment.MARKER).native.state = 'pending', 'ENROLLMENT_MARKER'],
    ['config changed', c => c.config.objects.options.tls.rejectUnauthorized = false, 'ENROLLMENT_MARKER'],
    ['physical enabled', c => c.docs.get(enrollment.MARKER).native.physicalControlEnabled = true, 'ENROLLMENT_MARKER'],
    ['core binding', c => c.docs.get('system.meta.eosTestBase').native.bootstrapPolicyVersion = 2, 'ENROLLMENT_CORE_BINDING'],
    ['remote repo', c => c.docs.get('system.repositories').native.repositories.external = {}, 'ENROLLMENT_REPOSITORY_DRIFT'],
    ['automatic updates', c => c.docs.get('system.config').common.adapterAutoUpgrade.defaultPolicy = 'stable', 'ENROLLMENT_REPOSITORY_DRIFT'],
    ['disabled admin', c => c.docs.get('system.user.admin').common.enabled = false, 'ENROLLMENT_ADMIN_DISABLED'],
    ['world-readable service hash', c => c.docs.get('system.user.admin').acl.object = 0x664, 'ENROLLMENT_SERVICE_ACL'],
    ['weak password', c => c.docs.get('system.user.admin').common.password = hashed.replace('$600000$', '$10000$'), 'ENROLLMENT_ADMIN_PASSWORD'],
    ['extra executable', c => c.docs.set('unapproved', { _id: 'system.adapter.javascript.0', type: 'instance' }), 'ENROLLMENT_UNEXPECTED_INSTANCE'],
    ['node arguments', c => c.docs.get('system.adapter.eos-admin.0').common.nodeProcessParams = ['--inspect'], 'ENROLLMENT_INSTANCE_DRIFT'],
    ['remote host', c => c.docs.get('system.adapter.eos-admin.0').common.host = 'other', 'ENROLLMENT_INSTANCE_DRIFT'],
    ['admin plaintext', c => c.docs.get('system.adapter.eos-admin.0').native.secure = false, 'ENROLLMENT_ADMIN_DRIFT'],
    ['UI no auth', c => c.docs.get('system.adapter.nexowatt-ui.0').native.auth.enabled = false, 'ENROLLMENT_UI_DRIFT'],
    ['UI trusted header', c => c.docs.get('system.adapter.nexowatt-ui.0').native.accessControl.trustedHeaderEnabled = true, 'ENROLLMENT_UI_DRIFT'],
    ['UI path', c => c.docs.get('system.adapter.nexowatt-ui.0').native.eosTls.privateKeyPath = '/tmp/key', 'ENROLLMENT_UI_DRIFT'],
]) test(`rejects ${name} without repair`, async () => { const c = complete(); mutate(c); await assert.rejects(enrollment.verify(c), new RegExp(expected)); assert.equal(c.writes, 0); });
test('controller alive blocks first mutation', async () => {
    const c = fixture(); c.states.getState = async () => ({ val: true });
    await assert.rejects(enrollment.enroll(c), /ENROLLMENT_CONTROLLER_RUNNING/); assert.equal(c.writes, 0);
});
test('failed enrollment retains pending gate and never enables partially written instances', async () => {
    const c = fixture(); const write = c.objects.setObjectAsync;
    c.objects.setObjectAsync = async (id, doc) => { if (id === 'system.user.admin') throw new Error('offline'); return write(id, doc); };
    await assert.rejects(enrollment.enroll(c), /offline/);
    assert.equal(c.docs.get(enrollment.MARKER).native.state, 'pending');
    for (const doc of c.docs.values()) if (doc.type === 'instance') assert.equal(doc.common.enabled, false);
    await assert.rejects(enrollment.verify(c), /ENROLLMENT_MARKER/);
});
