'use strict';
// Execute the unchanged, whole-file-hash-bound upstream _getSession methods.
// Database storage and scheduling helpers are fixtures; no native PG or browser
// login is claimed by this narrow adapter/database contract test.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { EventEmitter } = require('node:events');
const sourceFile = path.resolve(__dirname, '../../runtime/postgresql/packages/db-states-postgresql/index.cjs');
const { Client } = require(sourceFile);
const fixtures = path.resolve(__dirname, '../system/controller-profile-fixtures');
const profiles = {
    '7.2.2': require('../../runtime/controller-profile/adapter-shutdown.cjs'),
    '7.2.5': require('../../runtime/controller-profile/v7.2.5/adapter-shutdown.cjs'),
};
const identity = version => ({ name: '@iobroker/js-controller-adapter', version });
class SessionStore extends EventEmitter {
    constructor() { super(); this.values = new Map(); this.connected = false; this.now = 0; this.error = false; }
    async connect() { this.connected = true; }
    async close() { this.connected = false; }
    async get(key) {
        if (this.error) throw new Error('EOS_PG_SESSION_FIXTURE_UNAVAILABLE');
        const item = this.values.get(key);
        return !item || item.expires !== null && item.expires <= this.now ? null : item.value;
    }
    async set(key, value, options = {}) {
        this.values.set(key, { value: Buffer.from(value), expires: options.ttlMs == null ? null : this.now + options.ttlMs });
    }
    async update(key, operation) {
        const change = await operation(await this.get(key));
        await this.set(key, change.value, { ttlMs: change.ttlMs }); return change.result;
    }
    async delete(keys) { for (const key of Array.isArray(keys) ? keys : [keys]) this.values.delete(key); }
}
async function fixture(t, version) {
    const store = new SessionStore();
    const client = new Client({ autoConnect: false }, { store, controllerAdapter: identity(version) });
    await client.connectDb(); t.after(() => client.destroy()); return { client, store };
}
function upstreamAdapter(version, flavor, states, { transformed = false } = {}) {
    const spec = profiles[version].FILES.find(row => row.flavor === flavor);
    let bytes = fs.readFileSync(path.join(fixtures, version === '7.2.2' ? '' : version, `${flavor}-adapter.original.txt`));
    if (version === '7.2.2' && flavor === 'esm') bytes = bytes.subarray(0, -1); // Historical fixture LF only.
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), spec.originalSha256);
    const source = transformed ? profiles[version].transformFile(spec.relativePath, bytes).content : bytes.toString('utf8');
    const indent = flavor === 'cjs' ? '  ' : '    ';
    const start = source.indexOf(`${indent}_getSession(options) {`);
    const end = source.indexOf(`\n${indent}// unknown implementation guards`, start);
    assert.ok(start > 0 && end > start);
    const tools = { maybeCallback(callback, value) { setImmediate(callback, value); },
        maybeCallbackWithError(callback, error) { setImmediate(callback, error); }, ERRORS: { ERROR_DB_CLOSED: 'ERROR_DB_CLOSED' } };
    const errors = [], logs = [];
    const adapter = vm.runInNewContext(`class ContractAdapter {
        #states;
        constructor() { this.#states = states; this._logger = logger; this.namespaceLog = 'contract.0'; }
        ${source.slice(start, end)}
    }; new ContractAdapter();`, { states, tools, import_js_controller_common: { tools },
        logger: { info() {}, error(message) { errors.push('SESSION_READ_FAILED'); logs.push(message); } } }, { timeout: 1000 });
    return { get(id) { return new Promise(resolve => adapter._getSession({ id, callback: resolve })); }, errors, logs };
}
for (const version of ['7.2.2', '7.2.5']) {
    test(`${version}: backend callback, Promise, expiry and destroy contract`, async t => {
        const { client, store } = await fixture(t, version), session = { user: 'review', aExp: 123 };
        await client.setSession('fixture-session', 1, session);
        assert.deepEqual(await client.getSession('fixture-session'), session);
        let synchronous = true;
        const result = new Promise(resolve => client.getSession('fixture-session', (...args) => { assert.equal(synchronous, false); resolve(args); }));
        synchronous = false;
        assert.deepEqual(await result, version === '7.2.2' ? [session] : [null, session]);
        store.now = 1000;
        assert.deepEqual(await new Promise(resolve => client.getSession('fixture-session', (...args) => resolve(args))), version === '7.2.2' ? [null] : [null, null]);
        await client.setSession('fixture-session', 1, session); await client.destroySession('fixture-session');
        assert.equal(await client.getSession('fixture-session'), null);
        store.error = true;
        const args = await new Promise(resolve => client.getSession('fixture-session', (...values) => resolve(values)));
        assert.equal(args.length, 1); assert.match(args[0].message, /SESSION_FIXTURE_UNAVAILABLE/);
        await assert.rejects(client.getSession('fixture-session'), /SESSION_FIXTURE_UNAVAILABLE/);
    });
    for (const flavor of ['cjs', 'esm']) test(`${version}/${flavor}: actual upstream bridge returns a session and rejects a missing session`, async t => {
        const { client, store } = await fixture(t, version), upstream = upstreamAdapter(version, flavor, client);
        const session = { user: 'review', aExp: 123, rExp: 456 };
        await client.setSession('fixture-session', 1, session);
        assert.deepEqual(await upstream.get('fixture-session'), session);
        assert.equal(await upstream.get('absent'), null);
        store.now = 1000; assert.equal(await upstream.get('fixture-session'), null);
        assert.deepEqual(upstream.errors, []);
        if (version === '7.2.5') {
            store.error = true; assert.equal(await upstream.get('fixture-session'), null);
            assert.deepEqual(upstream.errors, ['SESSION_READ_FAILED']);
        }
    });
}
for (const flavor of ['cjs', 'esm']) test(`7.2.5/${flavor}: actual upstream bridge detects the prior callback incompatibility`, async t => {
    const { client } = await fixture(t, '7.2.2'), upstream = upstreamAdapter('7.2.5', flavor, client);
    await client.setSession('fixture-session', 1, { user: 'review' });
    assert.equal(await upstream.get('fixture-session'), null);
    assert.deepEqual(upstream.errors, ['SESSION_READ_FAILED']);
});
for (const flavor of ['cjs', 'esm']) test(`7.2.5/${flavor}: transformed read failures disclose no session capability or database detail`, async t => {
    const { client, store } = await fixture(t, '7.2.5'); store.error = true;
    const id = 'a:synthetic-session-capability-marker';
    const original = upstreamAdapter('7.2.5', flavor, client);
    assert.equal(await original.get(id), null);
    assert.ok(original.logs[0].includes(id), 'unchanged upstream branch exposes the synthetic identifier');
    assert.ok(original.logs[0].includes('SESSION_FIXTURE_UNAVAILABLE'));
    const transformed = upstreamAdapter('7.2.5', flavor, client, { transformed: true });
    assert.equal(await transformed.get(id), null);
    assert.deepEqual(transformed.logs, ['EOS_SESSION_DATABASE_READ_FAILED']);
});
test('installed package metadata controls the contract; settings cannot select legacy semantics', async t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-session-contract-')); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const backend = path.join(root, 'node_modules/@iobroker/db-states-postgresql/index.cjs');
    const packageFile = path.join(root, 'node_modules/@iobroker/js-controller-adapter/package.json');
    fs.mkdirSync(path.dirname(backend), { recursive: true }); fs.copyFileSync(sourceFile, backend);
    fs.mkdirSync(path.dirname(packageFile)); fs.writeFileSync(packageFile, JSON.stringify(identity('7.2.5')));
    const InstalledClient = require(backend).Client, store = new SessionStore();
    const client = new InstalledClient({ autoConnect: false, controllerVersion: '7.2.2', legacySessionCallback: true }, { store });
    t.after(() => client.destroy()); await client.connectDb();
    assert.deepEqual(await new Promise(resolve => client.getSession('missing', (...args) => resolve(args))), [null, null]);
});
test('unreviewed controller identity fails before storage is opened', () => {
    for (const controllerAdapter of [identity('7.2.3'), identity('8.0.0'), identity('7.2.5-custom'), { name: 'other', version: '7.2.5' }]) {
        const store = new SessionStore();
        assert.throws(() => new Client({}, { store, controllerAdapter }), /CONTROLLER_IDENTITY/);
        assert.equal(store.connected, false); assert.equal(store.listenerCount('event'), 0);
    }
});
