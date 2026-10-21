'use strict';
// Object-store contract/fault-injection tests, not native controller/Pi evidence.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const vm = require('node:vm');
const enrollment = require('../../runtime/bootstrap/enrollment.cjs');
const own = require('../../runtime/bootstrap/own-adapter-enrollment.cjs');
const accounts = require('../../runtime/bootstrap/accounts.cjs');
const sha = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
let directory, sourceApp, targetApp;
function appAt(root, specs) {
    const controller = path.join(root, 'node_modules/iobroker.js-controller'); fs.mkdirSync(controller, { recursive: true });
    fs.writeFileSync(path.join(controller, 'eos-test-profile.json'), JSON.stringify({ schemaVersion: 1,
        kind: 'eos-controller-test-profile', controllerVersion: '7.2.5',
        adapters: specs.map(spec => ({ package: `iobroker.${spec.name}`, version: spec.version, main: spec.main })) }));
    for (const spec of specs) {
        const pkg = path.join(root, 'node_modules', `iobroker.${spec.name}`); fs.mkdirSync(pkg);
        fs.writeFileSync(path.join(pkg, 'package.json'), JSON.stringify({ name: `iobroker.${spec.name}`, version: spec.version, main: spec.main }));
        fs.writeFileSync(path.join(pkg, 'io-package.json'), JSON.stringify({ common: { name: spec.name, version: spec.version },
            native: spec.name === 'nexowatt-backup' ? { minimalEnabled: true, ftpEnabled: true, futureBackupEnabled: true, expertMount: 'historical command' } : {} }));
    }
}
before(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-own-enrollment-'));
    sourceApp = path.join(directory, 'source'); targetApp = path.join(directory, 'target');
    appAt(sourceApp, enrollment.SPECS); appAt(targetApp, own.SPECS);
});
after(() => fs.rmSync(directory, { recursive: true, force: true }));
function fixture() {
    const config = { system: { hostname: 'own-test' }, objects: { options: { tls: {} } }, states: { options: { tls: {} } } };
    const userRows = [{ username: 'commissioner', role: 'installer' }, { username: 'customer', role: 'enduser' }];
    const hash = `pbkdf2$600000$${crypto.randomBytes(256).toString('hex')}$${crypto.randomBytes(16).toString('hex')}`;
    const docs = new Map([
        ['system.meta.eosTestBase', { native: { state: 'complete', profile: 'eos-core-only-bootstrap-v1', coreControllerVersion: '7.2.5', bootstrapPolicyVersion: 1, runtimeConfigSha256: sha(config) } }],
        ['system.config', { common: { diag: 'none', activeRepo: [], adapterAutoUpgrade: { defaultPolicy: 'none', repositories: {} } } }],
        ['system.repositories', { native: { repositories: {}, oldRepositories: {} } }],
        ['system.group.administrator', { _id: 'system.group.administrator', type: 'group', common: { members: ['system.user.admin'] } }],
        ['system.user.admin', { _id: 'system.user.admin', type: 'user', common: { enabled: true, password: hash }, acl: { ...accounts.PRIVATE_ACL } }],
        [enrollment.MARKER, { _id: enrollment.MARKER, type: 'meta', native: { profile: enrollment.PROFILE, version: 2,
            state: 'complete', accountPolicyVersion: 1, accounts: accounts.inventory(userRows), runtimeConfigSha256: sha(config), physicalControlEnabled: false } }],
    ]);
    for (const row of userRows) { const doc = accounts.userDocument(row, hash); docs.set(doc._id, doc); }
    for (const role of Object.keys(accounts.ROLES)) { const doc = accounts.groupDocument(role, userRows); docs.set(doc._id, doc); }
    for (const item of enrollment.pinnedAdapters(sourceApp)) {
        const doc = enrollment.instanceDocument(item, config.system.hostname); doc.common.enabled = true; docs.set(doc._id, doc);
    }
    const c = { docs, config, sourceApp, targetApp, app: targetApp, sourceReleaseId: 'a'.repeat(64), targetReleaseId: 'b'.repeat(64),
        timestamp: 1792022400000, operationId: 'c'.repeat(32), events: [], writes: 0, deletes: 0, checkpoints: 0,
        states: { getState: async () => ({ val: false }) } };
    c.objects = {
        getObjectAsync: async key => structuredClone(docs.get(key)),
        setObjectAsync: async (key, doc) => { c.writes++; c.events.push(`write:${key}`); docs.set(key, structuredClone(doc)); },
        delObjectAsync: async key => { c.deletes++; c.events.push(`delete:${key}`); docs.delete(key); },
        getObjectViewAsync: async (_design, type) => ({ rows: [...docs.values()].filter(doc => doc.type === type).map(value => ({ value: structuredClone(value) })) }),
    };
    c.checkpoint = async plan => { c.checkpoints++; c.events.push('checkpoint'); assert.deepEqual(plan, c.plan); };
    return c;
}

function managedFixture(t) {
    const c = fixture();
    const folder = path.join(directory, 'system/managed-test'); fs.mkdirSync(folder, { recursive: true });
    const file = path.join(folder, 'profile.json');
    fs.writeFileSync(file, fs.readFileSync(path.join(__dirname, '../../system/managed-test/profile.json')));
    t.after(() => fs.rmSync(path.join(directory, 'system'), { recursive: true, force: true }));
    c.releaseId = 'e'.repeat(64); c.checkpoint = async record => {
        c.events.push('checkpoint'); assert.equal(record.releaseId, c.releaseId); assert.equal(record.instanceIds.length, 4);
        assert.ok(!JSON.stringify(record).includes('pbkdf2'));
    }; return c;
}
test('fresh six-adapter enrollment needs no historical release, preserves accounts and creates unconfigured adapters', async t => {
    const c = managedFixture(t), admin = structuredClone(c.docs.get('system.user.admin'));
    const result = await own.enrollFresh(c); assert.equal(result.adaptersEnabled, 6);
    assert.equal(c.docs.get(own.MARKER).native.schemaVersion, 2);
    assert.equal(c.docs.get(own.MARKER).native.sourceReleaseId, c.releaseId);
    assert.deepEqual(c.docs.get('system.user.admin'), admin);
    assert.equal(c.events[0], 'checkpoint');
    assert.equal(c.docs.get('system.adapter.ocpp21.0').native.eosCommissioningEnabled, false);
    assert.equal(c.docs.get('system.adapter.eebus.0').native.eosCommissioningEnabled, false);
    assert.deepEqual(c.docs.get('system.adapter.nexowatt-devices.0').native.devices, []);
    await assert.rejects(own.enrollFresh(c), /OWN_ENROLLMENT_EXISTING_INSTANCE/);
});
test('fresh enrollment rejects live controller and changed signed profile before writes', async t => {
    const c = managedFixture(t); c.states.getState = async () => ({ val: true });
    await assert.rejects(own.enrollFresh(c)); assert.equal(c.writes, 0);
});
test('interrupted fresh enrollment remains pending and cannot be replayed over partial objects', async t => {
    const c = managedFixture(t), write = c.objects.setObjectAsync;
    c.objects.setObjectAsync = async (id, doc) => { if (c.writes === 2) throw Error('injected-write'); await write(id, doc); };
    await assert.rejects(own.enrollFresh(c), /injected-write/);
    assert.equal(c.docs.get(own.MARKER).native.state, 'pending');
    await assert.rejects(own.verify(c)); await assert.rejects(own.enrollFresh(c));
});
