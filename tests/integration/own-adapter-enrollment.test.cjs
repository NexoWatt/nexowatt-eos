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
        kind: 'eos-controller-test-profile', controllerVersion: '7.2.2',
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
async function planned() { const c = fixture(); c.plan = await own.planMigration(c); return c; }
async function applied() { const c = await planned(); await own.applyMigration(c); return c; }
function runtimeAdminAclProjection() {
    // Execute the shipped Admin method and constants; importing the whole
    // adapter would start a runtime process instead of this object-store test.
    const code = fs.readFileSync(path.join(__dirname, '../../components/admin/build/main.js'), 'utf8');
    const start = code.indexOf('async ensureEosRoleReadableAcl(id) {');
    const end = code.indexOf('async ensureEosSystemObjectAccess()', start);
    const constants = code.match(/^const (?:ADMIN_OWNER_USER|EOS_ROLE_READABLE_OBJECT_ACL) = .*;$/gm);
    assert.ok(start > 0 && end > start); assert.equal(constants?.length, 2);
    return vm.runInNewContext(`${constants.join('\n')}\n({ ${code.slice(start, end)} }).ensureEosRoleReadableAcl`);
}
test('exact six-entry profile and side-effect-free plan, no secrets or copied password hashes', async () => {
    const c = await planned();
    assert.equal(own.pinnedAdapters(targetApp).length, 6);
    assert.equal(c.writes, 0); assert.equal(c.deletes, 0);
    assert.equal(c.plan.documents.length, 4);
    assert.equal(JSON.stringify(c.plan).includes('pbkdf2$'), false);
    assert.equal(c.plan.sourceEnrollmentSha256, sha(c.docs.get(enrollment.MARKER)));
    assert.throws(() => enrollment.pinnedAdapters(targetApp), /ENROLLMENT_PROFILE_SCOPE/);
    assert.throws(() => own.pinnedAdapters(sourceApp), /OWN_ENROLLMENT_PROFILE_SCOPE/);
});
test('initial target configurations require deliberate device/station/backup commissioning', async () => {
    const { plan } = await planned();
    const config = name => plan.documents.find(doc => doc.common.name === name).native;
    assert.deepEqual(config('nexowatt-devices').devices, []); assert.equal(config('nexowatt-devices').devicesJson, '[]');
    for (const key of ['eosCommissioningEnabled', 'discoveryEnabled', 'shipServerEnabled', 'announceShipService', 'autoConnectEnabled', 'autoAcceptNewDevices',
        'allowCommandsToUntrustedDevices', 'nexowattBridgeEnabled', 'autoApplyClsLimits']) assert.equal(config('eebus')[key], false, key);
    assert.equal(config('eebus').commandDryRun, true);
    assert.equal(config('ocpp21').eosCommissioningEnabled, false); assert.deepEqual(config('ocpp21').chargePointInventory, []);
    for (const key of ['minimalEnabled', 'ccuEnabled', 'ftpEnabled', 'futureBackupEnabled', 'sudoMount', 'startAllRestore']) assert.equal(config('nexowatt-backup')[key], false, key);
    assert.equal(config('nexowatt-backup').expertMount, '');
    assert.ok(plan.documents.every(doc => doc.common.enabled === false));
});
test('apply journals first, preserves original enrollment/accounts and enables six fixed instances', async () => {
    const c = await planned(); const before = new Map([...c.docs].map(([key, value]) => [key, structuredClone(value)]));
    const result = await own.applyMigration(c);
    assert.equal(result.adaptersEnabled, 6); assert.equal(result.physicalDeviceAcceptance, 'NOT_PERFORMED');
    assert.equal(result.productionReleaseApproved, false); assert.equal(c.events[0], 'checkpoint'); assert.equal(c.checkpoints, 1);
    for (const [key, value] of before) assert.deepEqual(c.docs.get(key), value, key);
    assert.equal(c.docs.get(own.MARKER).native.state, 'complete');
    assert.equal((await enrollment.verify(c)).status, 'SIX_OWN_ADAPTER_TEST_ENROLLMENT_VERIFIED');
    await assert.rejects(own.applyMigration(c), /OWN_ENROLLMENT_ALREADY_ATTEMPTED/);
});
test('full and idempotent rollback remove only exact new instances and own marker', async () => {
    const c = await planned(); const before = new Map(structuredClone([...c.docs]));
    await own.applyMigration(c); await own.rollbackMigration(c);
    assert.deepEqual(c.docs, before); assert.equal(c.deletes, 5);
    const result = await own.rollbackMigration(c);
    assert.equal(result.originalManagementEnrollmentPreserved, true); assert.equal(c.deletes, 5);
    assert.equal((await enrollment.verify({ ...c, app: sourceApp })).status, 'INTEGRATED_UI_LAB_VERIFIED');
});
test('root initial Admin ACL matches actual startup projection without rewriting the rollback baseline', async () => {
    const c = await applied(), before = new Map(structuredClone([...c.docs]));
    const admin = c.docs.get('system.adapter.eos-admin.0');
    assert.equal(admin.native._nexowattEosRoleReadableAclManaged, true);
    assert.deepEqual(admin.acl, { owner: 'system.user.admin', ownerGroup: 'system.group.administrator', object: 0x664 });
    assert.equal(c.docs.get('system.adapter.nexowatt-ui.0').acl, undefined);
    assert.deepEqual(c.docs.get('system.user.admin').acl, accounts.PRIVATE_ACL);
    for (const spec of own.EXTRA_SPECS) assert.deepEqual(c.docs.get(`system.adapter.${spec.name}.0`).acl, accounts.PRIVATE_ACL);
    const project = runtimeAdminAclProjection();
    const adapter = { getForeignObjectAsync: c.objects.getObjectAsync,
        setForeignObjectAsync: async () => assert.fail('startup must not rewrite from/ts/user/ACL/native after planning') };
    assert.equal(await project.call(adapter, admin._id), false);
    assert.equal(await project.call(adapter, admin._id), false);
    assert.deepEqual(c.docs, before);
    await own.rollbackMigration(c);
    assert.deepEqual(c.docs.get(admin._id), admin);
    assert.equal((await enrollment.verify({ ...c, app: sourceApp })).adaptersEnabled, 2);
});
test('historical Admin normalized before migration retains its actual metadata through strict rollback', async () => {
    const c = fixture(), id = 'system.adapter.eos-admin.0';
    // Model the existing R9 instance before its first historical Admin startup.
    const original = c.docs.get(id); delete original.acl; delete original.native._nexowattEosRoleReadableAclManaged;
    const project = runtimeAdminAclProjection();
    assert.equal(await project.call({ getForeignObjectAsync: c.objects.getObjectAsync,
        setForeignObjectAsync: async (key, doc) => {
            // The pinned controller's _setForeignObject preserves from/ts and
            // adds user when absent; those actual bytes must remain bound.
            doc.user ||= 'system.user.admin'; await c.objects.setObjectAsync(key, doc);
        } }, id), true);
    const normalized = structuredClone(c.docs.get(id));
    assert.equal(normalized.from, original.from); assert.equal(normalized.ts, original.ts);
    c.plan = await own.planMigration(c);
    await own.applyMigration(c); await own.rollbackMigration(c);
    assert.deepEqual(c.docs.get(id), normalized);
});
test('legacy management verifier rejects six profile without new enrollment marker', async () => {
    const c = fixture(); await assert.rejects(enrollment.verify(c), /ENROLLMENT_PROFILE_SCOPE/);
    assert.equal((await enrollment.verify({ ...c, app: sourceApp })).status, 'INTEGRATED_UI_LAB_VERIFIED');
});
for (const [label, mutate, code] of [
    ['live controller', c => { c.states.getState = async () => ({ val: true }); }, 'OWN_ENROLLMENT_CONTROLLER_RUNNING'],
    ['unknown heartbeat', c => { c.states.getState = async () => ({ val: 'false' }); }, 'OWN_ENROLLMENT_CONTROLLER_RUNNING'],
    ['source marker changed', c => { c.docs.get(enrollment.MARKER).native.unexpected = 1; }, 'OWN_ENROLLMENT_BASELINE_CHANGED'],
    ['management instance changed', c => { c.docs.get('system.adapter.nexowatt-ui.0').native.note = 'foreign'; }, 'OWN_ENROLLMENT_BASELINE_CHANGED'],
    ['preexisting additional document', c => { c.docs.set('system.adapter.eebus.0', { type: 'meta' }); }, 'OWN_ENROLLMENT_EXISTING_INSTANCE'],
    ['unexpected instance', c => { c.docs.set('system.adapter.javascript.0', { _id: 'system.adapter.javascript.0', type: 'instance' }); }, 'OWN_ENROLLMENT_INSTANCE_SCOPE'],
    ['plan unsafe initial target', c => { c.plan.documents[0].native.devices = [{ address: '192.0.2.1' }]; }, 'OWN_ENROLLMENT_PLAN_BINDING'],
    ['plan forged marker', c => { c.plan.marker.native.productionReleaseApproved = true; }, 'OWN_ENROLLMENT_PLAN_BINDING'],
    ['missing journal callback', c => { c.checkpoint = undefined; }, 'OWN_ENROLLMENT_JOURNAL_REQUIRED'],
]) test(`apply rejects ${label} before writes`, async () => {
    const c = await planned(); mutate(c); await assert.rejects(own.applyMigration(c), new RegExp(code)); assert.equal(c.writes, 0);
});
test('failed durable journal callback causes no database mutation', async () => {
    const c = await planned(); c.checkpoint = async () => { throw new Error('journal offline'); };
    await assert.rejects(own.applyMigration(c), /journal offline/); assert.equal(c.writes, 0);
});
test('partial apply after every possible write can be rolled back without changing baseline', async () => {
    // pending marker + four disabled + four enabled + complete marker = 10 writes.
    for (let failure = 1; failure <= 10; failure++) {
        const c = await planned(); const before = new Map(structuredClone([...c.docs])); const set = c.objects.setObjectAsync;
        c.objects.setObjectAsync = async (key, doc) => { await set(key, doc); if (c.writes === failure) throw new Error('write acknowledgement lost'); };
        await assert.rejects(own.applyMigration(c), /write acknowledgement lost/);
        c.objects.setObjectAsync = set;
        await own.rollbackMigration(c); assert.deepEqual(c.docs, before, `failure after write ${failure}`);
    }
});
test('partial rollback after each deletion is safely resumable from the same protected plan', async () => {
    for (let failure = 1; failure <= 5; failure++) {
        const c = await applied(); const del = c.objects.delObjectAsync;
        c.objects.delObjectAsync = async key => { await del(key); if (c.deletes === failure) throw new Error('delete acknowledgement lost'); };
        await assert.rejects(own.rollbackMigration(c), /delete acknowledgement lost/);
        c.objects.delObjectAsync = del;
        await own.rollbackMigration(c);
        assert.equal(c.docs.has(own.MARKER), false); assert.equal(c.deletes, 5);
        assert.equal((await enrollment.verify({ ...c, app: sourceApp })).adaptersEnabled, 2);
    }
});
for (const [label, mutate, code] of [
    ['changed device configuration', c => { c.docs.get('system.adapter.nexowatt-devices.0').native.devices = [{ id: 'operator-device' }]; }, 'OWN_ENROLLMENT_INSTANCE_CHANGED'],
    ['changed marker', c => { c.docs.get(own.MARKER).native.operationId = 'd'.repeat(32); }, 'OWN_ENROLLMENT_MARKER_CHANGED'],
    ['missing marker with owned-looking docs', c => { c.docs.delete(own.MARKER); }, 'OWN_ENROLLMENT_INSTANCE_CHANGED'],
    ['changed baseline', c => { c.docs.get(enrollment.MARKER).native.note = 'foreign'; }, 'OWN_ENROLLMENT_BASELINE_CHANGED'],
    ['changed management configuration', c => { c.docs.get('system.adapter.eos-admin.0').native.note = 'foreign'; }, 'OWN_ENROLLMENT_BASELINE_CHANGED'],
    ['changed management ACL', c => { c.docs.get('system.adapter.eos-admin.0').acl.object = 0x666; }, 'OWN_ENROLLMENT_BASELINE_CHANGED'],
]) test(`rollback refuses ${label} before deleting any document`, async () => {
    const c = await applied(); mutate(c); await assert.rejects(own.rollbackMigration(c), new RegExp(code)); assert.equal(c.deletes, 0);
});
for (const [label, mutate, code] of [
    ['pending marker', c => { c.docs.get(own.MARKER).native.state = 'pending'; }, 'OWN_ENROLLMENT_MARKER'],
    ['forged marker ACL', c => { c.docs.get(own.MARKER).acl.object = 0x666; }, 'OWN_ENROLLMENT_MARKER'],
    ['extra JavaScript instance', c => { c.docs.set('system.adapter.javascript.0', { _id: 'system.adapter.javascript.0', type: 'instance' }); }, 'OWN_ENROLLMENT_INSTANCE_SCOPE'],
    ['unsafe Admin TLS', c => { c.docs.get('system.adapter.eos-admin.0').native.secure = false; }, 'ENROLLMENT_ADMIN_DRIFT'],
    ['UI trusted header', c => { c.docs.get('system.adapter.nexowatt-ui.0').native.accessControl.trustedHeaderEnabled = true; }, 'ENROLLMENT_UI_DRIFT'],
    ['weak service password', c => { c.docs.get('system.user.admin').common.password = 'weak'; }, 'ENROLLMENT_ADMIN_PASSWORD'],
    ['dynamic npm', c => { c.docs.get('system.adapter.eebus.0').native.additionalNpmModules = ['untrusted']; }, 'EOS_PROFILE_DYNAMIC_NPM'],
    ['extra node args', c => { c.docs.get('system.adapter.ocpp21.0').common.nodeProcessParams = ['--inspect']; }, 'OWN_ENROLLMENT_INSTANCE_DRIFT'],
    ['malformed EEBUS commissioning flag', c => { c.docs.get('system.adapter.eebus.0').native.eosCommissioningEnabled = 'false'; }, 'OWN_ENROLLMENT_COMMISSIONING_DRIFT'],
    ['missing OCPP commissioning flag', c => { delete c.docs.get('system.adapter.ocpp21.0').native.eosCommissioningEnabled; }, 'OWN_ENROLLMENT_COMMISSIONING_DRIFT'],
]) test(`six-adapter verification retains ${label} refusal`, async () => {
    const c = await applied(); mutate(c); await assert.rejects(enrollment.verify(c), new RegExp(code));
});
test('authorized device commissioning and password changes are not reverted by boot verifier', async () => {
    const c = await applied();
    c.docs.get('system.adapter.nexowatt-devices.0').native.devices = [{ id: 'commissioned-device', enabled: false }];
    c.docs.get('system.adapter.ocpp21.0').native.eosCommissioningEnabled = true;
    c.docs.get('system.adapter.eebus.0').native.eosCommissioningEnabled = true;
    c.docs.get('system.user.admin').common.password = `pbkdf2$600000$${crypto.randomBytes(256).toString('hex')}$${crypto.randomBytes(16).toString('hex')}`;
    assert.equal((await enrollment.verify(c)).adaptersEnabled, 6);
});
