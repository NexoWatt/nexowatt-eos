'use strict';
// Object-store contract/fault-injection tests, not native controller/Pi evidence.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const migration = require('../../runtime/bootstrap/r8-managed-enrollment.cjs');
const enrollment = require('../../runtime/bootstrap/enrollment.cjs');
const own = require('../../runtime/bootstrap/own-adapter-enrollment.cjs');
const accounts = require('../../runtime/bootstrap/accounts.cjs');
const sha = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
let directory, sourceApp, targetApp;
function appAt(root, specs, version) {
    const controller = path.join(root, 'node_modules/iobroker.js-controller'); fs.mkdirSync(controller, { recursive: true });
    fs.writeFileSync(path.join(controller, 'eos-test-profile.json'), JSON.stringify({ schemaVersion: 1,
        kind: 'eos-controller-test-profile', controllerVersion: version,
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
    appAt(sourceApp, enrollment.SPECS, '7.2.2'); appAt(targetApp, own.SPECS, '7.2.5');
});
after(() => fs.rmSync(directory, { recursive: true, force: true }));
function fixture() {
    const config = { system: { hostname: 'own-test' }, objects: { options: { tls: {} } }, states: { options: { tls: {} } } };
    const userRows = [{ username: 'commissioner', role: 'installer' }, { username: 'customer', role: 'enduser' }];
    const hash = `pbkdf2$600000$${crypto.randomBytes(256).toString('hex')}$${crypto.randomBytes(16).toString('hex')}`;
    const docs = new Map([
        ['system.meta.eosTestBase', { native: { state: 'complete', profile: 'eos-core-only-bootstrap-v1', coreControllerVersion: '7.2.2', bootstrapPolicyVersion: 1, runtimeConfigSha256: sha(config) } }],
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
    const c = { docs, config, sourceApp, targetApp, app: targetApp, sourceReleaseId: migration.SOURCE_RELEASE_ID, targetReleaseId: 'b'.repeat(64),
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
async function planned() { const c = fixture(); c.plan = await migration.planMigration(c); return c; }
async function applied() { const c = await planned(); await migration.applyMigration(c); return c; }
test('direct R8 plan has hashes only, preserves two management instances and creates four passive configurations', async () => {
    const c = await planned();
    assert.equal(c.writes, 0); assert.equal(c.deletes, 0);
    assert.equal(c.plan.sourceReleaseId, migration.SOURCE_RELEASE_ID);
    assert.equal(c.plan.documents.length, 4);
    assert.equal(c.plan.marker.native.controllerProfileSha256, sha(own.profileValue('7.2.5')));
    assert.equal(JSON.stringify(c.plan).includes('pbkdf2$'), false);
    for (const doc of c.plan.documents) assert.equal(doc.common.enabled, false);
    assert.deepEqual(c.plan.documents.find(doc => doc.common.name === 'nexowatt-devices').native.devices, []);
    assert.equal(c.plan.documents.find(doc => doc.common.name === 'eebus').native.eosCommissioningEnabled, false);
    assert.equal(c.plan.documents.find(doc => doc.common.name === 'ocpp21').native.eosCommissioningEnabled, false);
    assert.equal(c.plan.documents.find(doc => doc.common.name === 'nexowatt-backup').native.ftpEnabled, false);
});
test('apply checkpoints first, updates only core version and adds six-adapter marker and passive instances', async () => {
    const c = await planned(), before = new Map(structuredClone([...c.docs]));
    const result = await migration.applyMigration(c);
    assert.equal(c.events[0], 'checkpoint'); assert.equal(c.checkpoints, 1);
    assert.equal(result.adaptersEnabled, 6);
    for (const [key, value] of before) {
        if (key === migration.CORE) value.native.coreControllerVersion = '7.2.5';
        assert.deepEqual(c.docs.get(key), value, key);
    }
    assert.equal(c.docs.get(own.MARKER).native.schemaVersion, 1);
    assert.equal(c.docs.get(own.MARKER).native.state, 'complete');
    assert.equal((await enrollment.verify(c)).status, 'SIX_OWN_ADAPTER_TEST_ENROLLMENT_VERIFIED');
});
test('rollback restores exact original core and all existing account, configuration and management documents', async () => {
    const c = await planned(), before = new Map(structuredClone([...c.docs]));
    await migration.applyMigration(c); await migration.rollbackMigration(c);
    assert.deepEqual(c.docs, before);
    await migration.rollbackMigration(c); assert.deepEqual(c.docs, before);
    assert.equal((await enrollment.verify({ ...c, app: sourceApp })).adaptersEnabled, 2);
});
test('every apply write acknowledgement failure, including core marker, can restore the original R8 store', async () => {
    for (let failure = 1; failure <= 11; failure++) {
        const c = await planned(), before = new Map(structuredClone([...c.docs])), set = c.objects.setObjectAsync;
        c.objects.setObjectAsync = async (key, doc) => { await set(key, doc); if (c.writes === failure) throw Error('lost write acknowledgement'); };
        await assert.rejects(migration.applyMigration(c), /lost write acknowledgement/);
        c.objects.setObjectAsync = set;
        await migration.rollbackMigration(c);
        assert.deepEqual(c.docs, before, `write ${failure}`);
    }
});
test('rollback resumes after each delete acknowledgement failure or core restoration acknowledgement failure', async () => {
    for (let failure = 1; failure <= 6; failure++) {
        const c = await planned(), before = new Map(structuredClone([...c.docs]));
        await migration.applyMigration(c);
        const del = c.objects.delObjectAsync, set = c.objects.setObjectAsync; let operations = 0;
        c.objects.delObjectAsync = async key => { await del(key); if (++operations === failure) throw Error('lost rollback acknowledgement'); };
        c.objects.setObjectAsync = async (key, doc) => { await set(key, doc); if (++operations === failure) throw Error('lost rollback acknowledgement'); };
        await assert.rejects(migration.rollbackMigration(c), /lost rollback acknowledgement/);
        c.objects.delObjectAsync = del; c.objects.setObjectAsync = set;
        await migration.rollbackMigration(c); assert.deepEqual(c.docs, before, `rollback ${failure}`);
    }
});
for (const [label, mutate, error] of [
    ['wrong R8 identity', c => { c.plan.sourceReleaseId = 'a'.repeat(64); }, 'R8_ENROLLMENT_PLAN'],
    ['core changed', c => { c.docs.get(migration.CORE).native.foreign = true; }, 'R8_ENROLLMENT_CORE_CHANGED'],
    ['management changed', c => { c.docs.get('system.adapter.eos-admin.0').native.foreign = true; }, 'R8_ENROLLMENT_BASELINE_CHANGED'],
    ['live controller', c => { c.states.getState = async () => ({ val: true }); }, 'R8_ENROLLMENT_CONTROLLER_RUNNING'],
    ['missing journal', c => { c.checkpoint = undefined; }, 'R8_ENROLLMENT_JOURNAL_REQUIRED'],
    ['unsafe target plan', c => { c.plan.documents[0].native.devices = [{ id: 'unexpected' }]; }, 'R8_ENROLLMENT_PLAN_BINDING'],
]) test(`refuses ${label} before any DB write`, async () => {
    const c = await planned(); mutate(c);
    await assert.rejects(migration.applyMigration(c), new RegExp(error)); assert.equal(c.writes, 0);
});
for (const [label, mutate, error] of [
    ['foreign core change', c => { c.docs.get(migration.CORE).native.foreign = true; }, 'R8_ENROLLMENT_CORE_CHANGED'],
    ['foreign target configuration', c => { c.docs.get('system.adapter.eebus.0').native.foreign = true; }, 'R8_ENROLLMENT_INSTANCE_CHANGED'],
    ['foreign marker', c => { c.docs.get(own.MARKER).native.operationId = 'd'.repeat(32); }, 'R8_ENROLLMENT_MARKER_CHANGED'],
    ['missing marker with migrated core', c => { c.docs.delete(own.MARKER); }, 'R8_ENROLLMENT_CORE_CHANGED'],
]) test(`rollback refuses ${label} without partial deletion`, async () => {
    const c = await applied(); mutate(c); const writes = c.writes;
    await assert.rejects(migration.rollbackMigration(c), new RegExp(error));
    assert.equal(c.deletes, 0); assert.equal(c.writes, writes);
});
test('failed durable checkpoint has zero database mutations', async () => {
    const c = await planned(); c.checkpoint = async () => { throw Error('journal failed'); };
    await assert.rejects(migration.applyMigration(c), /journal failed/); assert.equal(c.writes, 0);
});
test('incomplete historical Admin ACL projection is rejected before planning or mutation', async () => {
    for (const field of ['acl', 'flag']) {
        const c = fixture(), admin = c.docs.get('system.adapter.eos-admin.0');
        if (field === 'acl') delete admin.acl;
        else delete admin.native._nexowattEosRoleReadableAclManaged;
        await assert.rejects(migration.planMigration(c), /R8_ENROLLMENT_ADMIN_NOT_READY/);
        assert.equal(c.writes, 0);
    }
});
