'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { provision } = require('../../runtime/transport/redis-tls.cjs');
const { initialize, assertRuntimeConfig, waitController, MARKER } = require('../../runtime/bootstrap/initialize.cjs');
let temp, base;
before(() => {
    temp = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-bootstrap-test-'));
    provision({ directory: path.join(temp, 'transport') });
    base = JSON.parse(fs.readFileSync(path.join(temp, 'transport/credentials/iobroker-databases.json')));
    Object.assign(base, { system: { hostname: 'eos-test', compact: false, allowShellCommands: false }, plugins: { sentry: { enabled: false } }, multihostService: { enabled: false } });
});
after(() => fs.rmSync(temp, { recursive: true, force: true }));
function fixture() {
    const docs = new Map([
        ['system.config', { type: 'config', common: { diag: 'extended', activeRepo: ['stable'] }, native: { secret: crypto.randomBytes(24).toString('hex') } }],
        ['system.repositories', { type: 'config', common: {}, native: { repositories: { stable: { link: 'https://example.invalid/repository' } } } }],
        ['system.user.admin', { type: 'user', common: { enabled: true, password: crypto.randomBytes(32).toString('hex') }, native: {} }],
        ['system.meta.uuid', { type: 'meta', common: {}, native: { uuid: crypto.randomUUID() } }],
        ['system.host.eos-test', { type: 'host', common: {}, native: {} }],
    ].map(([id, doc]) => [id, { _id: id, ...doc }]));
    const stateDocs = new Map();
    const context = {
        docs, stateDocs, writes: 0, defaults: ['system.config', 'system.repositories'],
        appLockSha256: 'a'.repeat(64), config: structuredClone(base),
        objects: {
            async getObjectListAsync() { return { rows: [...docs].map(([id, doc]) => ({ id, doc: structuredClone(doc) })) }; },
            async getObjectAsync(id) { return docs.get(id); },
            async setObjectAsync(id, doc) { context.writes++; docs.set(id, structuredClone(doc)); },
        },
        states: {
            async getKeys() { return [...stateDocs.keys()].filter(k => k.endsWith('.alive')); },
            async getState(id) { return stateDocs.get(id); },
            async setState(id, state) { context.writes++; stateDocs.set(id, structuredClone(state)); },
        },
    };
    return context;
}
test('fresh ordinary setup hardened and secret/design metadata preserved', async () => {
    const c = fixture(); const previousSecret = c.docs.get('system.config').native.secret;
    assert.equal((await initialize(c)).status, 'CORE_INITIALIZED');
    assert.equal(c.docs.get('system.config').common.diag, 'none');
    assert.deepEqual(c.docs.get('system.config').common.activeRepo, []);
    assert.equal(c.docs.get('system.config').native.secret, previousSecret);
    assert.deepEqual(c.docs.get('system.repositories').native.repositories, {});
    assert.equal(c.docs.get('system.user.admin').common.enabled, false);
    assert.equal(c.docs.get('system.user.admin').common.password, '');
    assert.equal(c.docs.get(MARKER).native.state, 'complete');
    assert.equal(c.stateDocs.get('system.host.eos-test.plugins.sentry.enabled').val, false);
});
test('complete marker idempotent validation performs no writes', async () => {
    const c = fixture(); await initialize(c); const count = c.writes;
    assert.equal((await initialize(c)).status, 'CORE_POLICY_VERIFIED'); assert.equal(c.writes, count);
});
test('verify-only refuses uninitialized DB without changes', async () => {
    const c = fixture(); await assert.rejects(initialize({ ...c, verifyOnly: true }), /BOOTSTRAP_NOT_COMPLETE/); assert.equal(c.writes, 0);
});
test('matching pending marker resumes after interrupted write', async () => {
    const c = fixture(); const write = c.objects.setObjectAsync;
    c.objects.setObjectAsync = async (id, doc) => { if (id === 'system.repositories') throw new Error('DB unavailable'); await write(id, doc); };
    await assert.rejects(initialize(c)); assert.equal(c.docs.get(MARKER).native.state, 'pending');
    c.objects.setObjectAsync = write; assert.equal((await initialize(c)).status, 'CORE_INITIALIZED');
});
for (const id of ['system.adapter.admin.0', 'custom.energy.value', 'system.user.other']) {
    test(`refuses existing installation content ${id}`, async () => {
        const c = fixture(); c.docs.set(id, { _id: id, type: id.includes('.adapter.') ? 'instance' : 'state', common: { enabled: false }, native: {} });
        await assert.rejects(initialize(c), /EXISTING_RUNTIME_OR_ADAPTERS_FORBIDDEN/); assert.equal(c.writes, 0);
    });
}
test('running controller blocks initial mutations', async () => {
    const c = fixture(); c.stateDocs.set('system.host.eos-test.alive', { val: true });
    await assert.rejects(initialize(c), /CONTROLLER_MUST_BE_STOPPED/); assert.equal(c.writes, 0);
});
test('foreign marker refuses configuration migration', async () => {
    const c = fixture(); await initialize(c); c.config.objects.options.auth_pass = crypto.randomBytes(32).toString('hex');
    await assert.rejects(initialize(c), /BOOTSTRAP_MARKER_MISMATCH/);
});
for (const [name, change, code] of [
    ['diagnostics', c => c.docs.get('system.config').common.diag = 'extended', 'SYSTEM_POLICY_DRIFT'],
    ['repositories', c => c.docs.get('system.repositories').native.repositories.external = {}, 'REPOSITORY_POLICY_DRIFT'],
    ['admin activation', c => c.docs.get('system.user.admin').common.enabled = true, 'ADMIN_ACCOUNT_POLICY_DRIFT'],
    ['admin password', c => c.docs.get('system.user.admin').common.password = crypto.randomBytes(16).toString('hex'), 'ADMIN_ACCOUNT_POLICY_DRIFT'],
    ['plugin telemetry', c => c.stateDocs.get('system.host.eos-test.plugins.sentry.enabled').val = true, 'PLUGIN_STATE_DRIFT'],
]) {
    test(`drift ${name} fails closed without silent repair`, async () => {
        const c = fixture(); await initialize(c); const count = c.writes; change(c);
        await assert.rejects(initialize(c), new RegExp(code)); assert.equal(c.writes, count);
    });
}
for (const [name, change, code] of [
    ['TLS verification', c => c.objects.options.tls.rejectUnauthorized = false, 'TLS_CONFIG_REJECTED'],
    ['multihost', c => c.multihostService.enabled = true, 'MULTIHOST_MUST_BE_DISABLED'],
    ['plugin', c => c.plugins.extra = { enabled: true }, 'PLUGINS_MUST_BE_DISABLED'],
    ['hostname', c => c.system.hostname = '../bad', 'EXPLICIT_SAFE_HOSTNAME_REQUIRED'],
    ['remote database', c => c.objects.host = '192.0.2.1', 'LOCAL_SEPARATE_STORES_REQUIRED'],
]) {
    test(`rejects runtime config ${name}`, () => { const c = structuredClone(base); change(c); assert.throws(() => assertRuntimeConfig(c), new RegExp(code)); });
}
test('failed final read never writes complete marker', async () => {
    const c = fixture(); const read = c.objects.getObjectListAsync; let calls = 0;
    c.objects.getObjectListAsync = async () => { if (++calls > 1) throw new Error('offline'); return read(); };
    await assert.rejects(initialize(c)); assert.equal(c.docs.get(MARKER).native.state, 'pending');
});

test('readiness proves live heartbeat, expected PID and controller version', async () => {
    const c = fixture();
    c.docs.get('system.host.eos-test').common.installedVersion = '7.2.2';
    c.stateDocs.set('system.host.eos-test.alive', { val: true, ack: true, ts: Date.now() });
    c.stateDocs.set('system.host.eos-test.pid', { val: 4321, ack: true });
    assert.equal((await waitController({ ...c, controllerPid: 4321, timeoutMs: 30, pollMs: 1 })).status, 'CONTROLLER_READY');
});
for (const [name, adjust] of [
    ['stale heartbeat', c => c.stateDocs.get('system.host.eos-test.alive').ts = Date.now() - 60000],
    ['unacknowledged heartbeat', c => c.stateDocs.get('system.host.eos-test.alive').ack = false],
    ['wrong process', c => c.stateDocs.get('system.host.eos-test.pid').val = 4322],
    ['wrong version', c => c.docs.get('system.host.eos-test').common.installedVersion = '7.1.0'],
]) {
    test(`readiness refuses ${name}`, async () => {
        const c = fixture(); c.docs.get('system.host.eos-test').common.installedVersion = '7.2.2';
        c.stateDocs.set('system.host.eos-test.alive', { val: true, ack: true, ts: Date.now() });
        c.stateDocs.set('system.host.eos-test.pid', { val: 4321, ack: true }); adjust(c);
        await assert.rejects(waitController({ ...c, controllerPid: 4321, timeoutMs: 10, pollMs: 1 }), /CONTROLLER_NOT_READY/);
    });
}

for (const field of ['compact', 'allowShellCommands']) {
    for (const value of [true, 'false', undefined]) {
        test(`rejects system ${field}=${String(value)} unless strictly false`, () => {
            const config = structuredClone(base); config.system[field] = value;
            assert.throws(() => assertRuntimeConfig(config), /UNSUPPORTED_SYSTEM_OPTION/);
        });
    }
}
for (const [key, value] of [['connectTimeout', 6000], ['commandTimeout', 6000], ['maxRetriesPerRequest', 3], ['enableOfflineQueue', true]]) {
    test(`rejects unbounded database option ${key}`, () => {
        const config = structuredClone(base); config.objects.options[key] = value;
        assert.throws(() => assertRuntimeConfig(config), /UNBOUNDED_DATABASE_OPTIONS/);
    });
}

test('additive signed release lock does not migrate or rewrite data policy', async () => {
    const c = fixture(); await initialize(c); const count = c.writes;
    c.appLockSha256 = 'b'.repeat(64);
    assert.equal((await initialize(c)).status, 'CORE_POLICY_VERIFIED');
    assert.equal(c.writes, count);
    assert.equal(c.docs.get(MARKER).native.creationAppLockSha256, 'a'.repeat(64));
});
test('changed controller remains forbidden even with new release lock', async () => {
    const c = fixture(); await initialize(c);
    await assert.rejects(initialize({ ...c, appLockSha256: 'b'.repeat(64), controllerVersion: '7.2.3' }), /CONTROLLER_VERSION_MISMATCH/);
});
for (const [name, change] of [
    ['policy version', c => c.docs.get(MARKER).native.bootstrapPolicyVersion = 2],
    ['core controller', c => c.docs.get(MARKER).native.coreControllerVersion = '7.2.3'],
    ['legacy marker', c => { delete c.docs.get(MARKER).native.bootstrapPolicyVersion; c.docs.get(MARKER).native.appLockSha256 = 'a'.repeat(64); }],
]) {
    test(`rejects incompatible marker ${name}`, async () => {
        const c = fixture(); await initialize(c); change(c);
        await assert.rejects(initialize(c), /BOOTSTRAP_MARKER_MISMATCH/);
    });
}

test('plugin state cleanup accepted only under verified EOS no-plugin profile', async () => {
    const c = fixture(); await initialize(c); c.stateDocs.delete('system.host.eos-test.plugins.sentry.enabled');
    await assert.rejects(initialize(c), /PLUGIN_STATE_DRIFT/);
    assert.equal((await initialize({ ...c, pluginRegistrationDisabled: true })).status, 'CORE_POLICY_VERIFIED');
});
test('null plugin state accepted under verified profile after controller cleanup', async () => {
    const c = fixture(); await initialize(c); c.stateDocs.set('system.host.eos-test.plugins.sentry.enabled', null);
    assert.equal((await initialize({ ...c, pluginRegistrationDisabled: true })).status, 'CORE_POLICY_VERIFIED');
});
for (const value of [true, 'false', null, 0]) {
    test(`EOS profile rejects existing malformed or enabled plugin value ${String(value)}`, async () => {
        const c = fixture(); await initialize(c); c.stateDocs.set('system.host.eos-test.plugins.sentry.enabled', { val: value });
        await assert.rejects(initialize({ ...c, pluginRegistrationDisabled: true }), /PLUGIN_STATE_DRIFT/);
    });
}
