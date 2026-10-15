'use strict';
// Real helper + real enrollment validators with in-memory DB/file operations.
// Not native PostgreSQL, deployed HTTPS, signed release or Pi evidence.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const helper = require('../../runtime/bootstrap/upload-own-assets.cjs');
const own = require('../../runtime/bootstrap/own-adapter-enrollment.cjs');
const enrollment = require('../../runtime/bootstrap/enrollment.cjs');
const accounts = require('../../runtime/bootstrap/accounts.cjs');
const sha = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const clone = value => value === undefined ? null : structuredClone(value);
function appAt(root, specs) {
    const controller = path.join(root, 'node_modules/iobroker.js-controller'); fs.mkdirSync(controller, { recursive: true });
    fs.writeFileSync(path.join(controller, 'eos-test-profile.json'), JSON.stringify({ schemaVersion: 1,
        kind: 'eos-controller-test-profile', controllerVersion: '7.2.2',
        adapters: specs.map(spec => ({ package: 'iobroker.' + spec.name, version: spec.version, main: spec.main })) }));
    for (const spec of specs) {
        const directory = path.join(root, 'node_modules/iobroker.' + spec.name); fs.mkdirSync(directory);
        fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ name: 'iobroker.' + spec.name, version: spec.version, main: spec.main }));
        fs.writeFileSync(path.join(directory, 'io-package.json'), JSON.stringify({ common: { name: spec.name, version: spec.version,
            restartAdapters: ['nexowatt-ui'], ...(spec.name === 'nexowatt-ui' ? { wwwDontUpload: true } : {}) }, native: {} }));
        fs.mkdirSync(path.join(directory, 'admin'));
        fs.writeFileSync(path.join(directory, 'admin/jsonConfig.json'), JSON.stringify({ label: spec.name }));
        if (spec.name === 'nexowatt-ui' || spec.name === 'eebus') {
            fs.mkdirSync(path.join(directory, 'www')); fs.writeFileSync(path.join(directory, 'www/index.html'), '<p>asset</p>');
        }
    }
}
async function fixture(t) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-own-assets-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: false }));
    const sourceApp = path.join(directory, 'source'), app = path.join(directory, 'target');
    appAt(sourceApp, enrollment.SPECS); appAt(app, own.SPECS);
    // Deliberately inert test strings: configuration-shape validation is real;
    // no database connection is attempted or TLS success claimed by these tests.
    const config = { system: { hostname: 'own-assets-test', compact: false, allowShellCommands: false },
        plugins: { sentry: { enabled: false } }, multihostService: { enabled: false } };
    for (const domain of ['objects', 'states']) config[domain] = { type: 'postgresql', host: '127.0.0.1', port: 15432,
        database: 'eos', user: 'eos_' + domain, options: { ssl: { ca: 'test-ca-not-connected', cert: domain + '-test-cert', key: domain + '-test-key' } } };
    const userRows = [{ username: 'commissioner', role: 'installer' }, { username: 'customer', role: 'enduser' }];
    const passwordHash = 'pbkdf2$600000$' + 'a'.repeat(512) + '$' + 'b'.repeat(32);
    const docs = new Map([
        ['system.meta.eosTestBase', { native: { state: 'complete', profile: 'eos-core-only-bootstrap-v1', coreControllerVersion: '7.2.2', bootstrapPolicyVersion: 1, runtimeConfigSha256: sha(config) } }],
        ['system.config', { common: { diag: 'none', activeRepo: [], adapterAutoUpgrade: { defaultPolicy: 'none', repositories: {} } } }],
        ['system.repositories', { native: { repositories: {}, oldRepositories: {} } }],
        ['system.group.administrator', { _id: 'system.group.administrator', type: 'group', common: { members: ['system.user.admin'] } }],
        ['system.user.admin', { _id: 'system.user.admin', type: 'user', common: { enabled: true, password: passwordHash }, acl: { ...accounts.PRIVATE_ACL } }],
        [enrollment.MARKER, { _id: enrollment.MARKER, type: 'meta', native: { profile: enrollment.PROFILE, version: 2,
            state: 'complete', accountPolicyVersion: 1, accounts: accounts.inventory(userRows), runtimeConfigSha256: sha(config), physicalControlEnabled: false } }],
    ]);
    for (const row of userRows) { const doc = accounts.userDocument(row, passwordHash); docs.set(doc._id, doc); }
    for (const role of Object.keys(accounts.ROLES)) { const doc = accounts.groupDocument(role, userRows); docs.set(doc._id, doc); }
    for (const item of enrollment.pinnedAdapters(sourceApp)) {
        const doc = enrollment.instanceDocument(item, config.system.hostname); doc.common.enabled = true; docs.set(doc._id, doc);
    }
    const files = new Map(), stateDocs = new Map();
    const c = { directory, app, sourceApp, targetApp: app, config, docs, files, stateDocs, writes: [],
        ownerCheck: () => {}, mimeLookup: name => name.endsWith('.json') ? 'application/json' : 'text/html',
        sourceReleaseId: 'a'.repeat(64), targetReleaseId: 'b'.repeat(64), checkpoint: async () => {} };
    c.objects = {
        getObjectAsync: async id => clone(docs.get(id)),
        getObjectViewAsync: async (_design, type) => ({ rows: [...docs.values()].filter(doc => doc.type === type).map(value => ({ value: clone(value) })) }),
        setObjectAsync: async (id, value) => { c.writes.push(['object', id]); docs.set(id, clone(value)); },
        delObjectAsync: async () => { throw new Error('Deletion must never be called'); },
        writeFileAsync: async (id, name, bytes, options) => { c.writes.push(['file', id, name]); files.set(id + '/' + name, { file: Buffer.from(bytes), mimeType: options.mimeType }); },
        readFile: async (id, name) => files.get(id + '/' + name),
    };
    c.states = { getState: async id => stateDocs.has(id) ? clone(stateDocs.get(id)) : { val: false, ack: true } };
    c.plan = await own.planMigration(c); await own.applyMigration(c); c.writes.length = 0;
    return c;
}
test('actual helper uploads exactly six admin trees and allowed www with byte/MIME readback; no restart/instance writes', async t => {
    const c = await fixture(t), before = structuredClone([...c.docs]);
    c.files.set('eebus/userdata/customer.txt', { file: Buffer.from('customer'), mimeType: 'text/plain' });
    const result = await helper.uploadAssets(c);
    assert.equal(result.files, 7); assert.equal(result.adapters, 6); assert.equal(result.instancesAndMarkersUnchanged, true);
    for (const [id, value] of before) assert.deepEqual(c.docs.get(id), value, id);
    assert.equal(c.files.has('nexowatt-ui/index.html'), false, 'wwwDontUpload must be respected');
    assert.equal(c.files.get('eebus/userdata/customer.txt').file.toString(), 'customer');
    assert.ok(c.writes.every(([kind, id]) => kind === 'file' || ['eos-admin.admin', 'nexowatt-ui.admin', 'nexowatt-devices.admin', 'eebus.admin', 'eebus', 'ocpp21.admin', 'nexowatt-backup.admin'].includes(id)));
    // Idempotent retry does not even rewrite existing namespace metadata.
    c.writes.length = 0; await helper.uploadAssets(c); assert.ok(c.writes.every(([kind]) => kind === 'file'));
    c.objects.delObjectAsync = async id => c.docs.delete(id);
    await own.rollbackMigration(c);
    assert.equal((await enrollment.verify({ ...c, app: c.sourceApp })).adaptersEnabled, 2);
});
for (const [label, mutate, code] of [
    ['live controller', c => c.stateDocs.set('system.host.own-assets-test.alive', { val: true, ack: true }), 'OWN_ASSETS_RUNNING'],
    ['live adapter', c => c.stateDocs.set('system.adapter.eebus.0.alive', { val: true, ack: true }), 'OWN_ASSETS_RUNNING'],
    ['unacknowledged stop', c => c.stateDocs.set('system.adapter.eebus.0.alive', { val: false, ack: false }), 'OWN_ASSETS_RUNNING'],
    ['unknown instance', c => c.docs.set('system.adapter.javascript.0', { _id: 'system.adapter.javascript.0', type: 'instance' }), 'OWN_ASSETS_ADMISSION'],
    ['TLS downgrade', c => { c.config.objects.options.ssl.rejectUnauthorized = false; }, 'OWN_ASSETS_CONFIG'],
    ['namespace collision', c => c.docs.set('ocpp21.admin', { _id: 'ocpp21.admin', type: 'state' }), 'OWN_ASSETS_NAMESPACE'],
]) test(`refuses ${label} before any write`, async t => {
    const c = await fixture(t); mutate(c);
    await assert.rejects(helper.uploadAssets(c), error => error.code === code); assert.equal(c.writes.length, 0);
});
test('missing alive states are allowed only with already verified exact enrollment', async t => {
    const c = await fixture(t); c.states.getState = async () => null;
    assert.equal((await helper.uploadAssets(c)).ok, true);
});
test('source symlinks, hardlinks, unsafe permissions and oversized assets fail before writes', async t => {
    for (const change of [
        file => { fs.unlinkSync(file); fs.symlinkSync('../io-package.json', file); },
        file => fs.linkSync(file, file + '.hardlink'),
        file => fs.chmodSync(file, 0o666),
        file => fs.truncateSync(file, helper.LIMITS.fileBytes + 1),
    ]) {
        const c = await fixture(t); change(path.join(c.app, 'node_modules/iobroker.ocpp21/admin/jsonConfig.json'));
        await assert.rejects(helper.uploadAssets(c), error => ['OWN_ASSETS_SOURCE', 'OWN_ASSETS_LIMIT'].includes(error.code));
        assert.equal(c.writes.length, 0);
    }
});
test('missing admin is rejected; legitimately absent www is optional', async t => {
    const c = await fixture(t);
    fs.renameSync(path.join(c.app, 'node_modules/iobroker.ocpp21/admin'), path.join(c.app, 'node_modules/iobroker.ocpp21/not-admin'));
    await assert.rejects(helper.uploadAssets(c), { code: 'OWN_ASSETS_SOURCE' }); assert.equal(c.writes.length, 0);
});
test('default ownership check cannot be bypassed through upload options from CLI/environment', async t => {
    const c = await fixture(t); delete c.ownerCheck;
    await assert.rejects(helper.uploadAssets(c), { code: 'OWN_ASSETS_SOURCE' }); assert.equal(c.writes.length, 0);
    await assert.rejects(helper.main(['--app', c.app]), { code: 'OWN_ASSETS_USAGE' });
});
test('failed write is not swallowed, no arbitrary error/secret reaches error code, retry is possible', async t => {
    const c = await fixture(t), write = c.objects.writeFileAsync;
    c.objects.writeFileAsync = async () => { throw Object.assign(new Error('private credential content'), { code: 'private database content' }); };
    await assert.rejects(helper.uploadAssets(c), { message: 'OWN_ASSETS_FAILED', code: 'OWN_ASSETS_FAILED' });
    c.objects.writeFileAsync = write; assert.equal((await helper.uploadAssets(c)).ok, true);
});
for (const [label, alter] of [
    ['missing file', () => undefined], ['different bytes', row => ({ ...row, file: Buffer.from('corrupt') })],
    ['different MIME', row => ({ ...row, mimeType: 'text/plain' })],
]) test(`complete readback rejects ${label}`, async t => {
    const c = await fixture(t), read = c.objects.readFile;
    c.objects.readFile = async (...args) => alter(await read(...args));
    await assert.rejects(helper.uploadAssets(c), { code: 'OWN_ASSETS_READBACK' });
});
test('mutation of any instance or enrollment marker during upload fails rather than repairing it', async t => {
    for (const id of ['system.adapter.ocpp21.0', own.MARKER, enrollment.MARKER, 'system.meta.eosTestBase']) {
        const c = await fixture(t), write = c.objects.writeFileAsync;
        c.objects.writeFileAsync = async (...args) => { await write(...args); c.docs.get(id).unexpected = 'changed'; };
        await assert.rejects(helper.uploadAssets(c), { code: 'OWN_ASSETS_DOCUMENT_CHANGED' });
        assert.equal(c.docs.get(id).unexpected, 'changed');
    }
});
test('adapter start racing upload prevents a successful result', async t => {
    const c = await fixture(t), write = c.objects.writeFileAsync;
    c.objects.writeFileAsync = async (...args) => { await write(...args); c.stateDocs.set('system.adapter.ocpp21.0.alive', { val: true, ack: true }); };
    await assert.rejects(helper.uploadAssets(c), { code: 'OWN_ASSETS_RUNNING' });
});
test('source bytes changed after inventory are rejected without uploading changed content', async t => {
    const c = await fixture(t), get = c.objects.getObjectAsync;
    c.objects.getObjectAsync = async id => {
        if (id === 'ocpp21.admin') fs.writeFileSync(path.join(c.app, 'node_modules/iobroker.ocpp21/admin/jsonConfig.json'), 'changed');
        return get(id);
    };
    await assert.rejects(helper.uploadAssets(c), { code: 'OWN_ASSETS_SOURCE' });
    assert.equal(c.files.has('ocpp21.admin/jsonConfig.json'), false);
});
test('database connectors have a bounded wait and retain every client for cleanup', async () => {
    const clients = [];
    class NeverConnects { destroy() {} }
    await assert.rejects(helper.connect(NeverConnects, {}, clients, 5), { code: 'OWN_ASSETS_CONNECT_TIMEOUT' });
    assert.equal(clients.length, 1);
    class Connected { constructor(options) { options.connected(); } }
    assert.ok(await helper.connect(Connected, {}, [], 100) instanceof Connected);
    class Fails { constructor() { throw new Error('secret'); } }
    await assert.rejects(helper.connect(Fails, {}, [], 100), { code: 'OWN_ASSETS_DATABASE' });
});
test('failure formatter exposes only finite predefined codes', () => {
    assert.equal(helper.safeCode({ code: 'OWN_ASSETS_READBACK', message: 'private' }), 'OWN_ASSETS_READBACK');
    assert.equal(helper.safeCode({ code: 'TOKEN_SECRET' }), 'OWN_ASSETS_FAILED');
});
test('cleanup failure prevents success, all clients close, earlier failure is not replaced', async () => {
    const closed = [];
    const clients = [
        { destroy: () => { closed.push('one'); throw new Error('private synchronous failure'); } },
        { destroy: async () => { closed.push('two'); throw new Error('private rejection'); } },
        { destroy: async () => { closed.push('three'); } },
    ];
    await assert.rejects(helper.closeClients(clients), { code: 'OWN_ASSETS_DATABASE', message: 'OWN_ASSETS_DATABASE' });
    assert.deepEqual(closed, ['one', 'two', 'three']);
    const earlier = Object.assign(new Error('OWN_ASSETS_READBACK'), { code: 'OWN_ASSETS_READBACK' });
    await helper.closeClients(clients, earlier);
    assert.equal(earlier.code, 'OWN_ASSETS_READBACK');
    await helper.closeClients([{ destroy: async () => {} }]);
});
