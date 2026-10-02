'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { Client, Server, getDefaultPort } = require('../../runtime/postgresql/packages/db-states-postgresql/index.cjs');
const tick = () => new Promise(resolve => setImmediate(resolve));

// This explicit Store test double exercises the States contract only. It is not a
// PostgreSQL/TLS/RLS test and deliberately has no networking or host mutations.
class FakeStore extends EventEmitter {
    constructor(shared = { values: new Map(), clients: new Set(), locks: new Map(), now: 0 }) {
        super(); this.shared = shared; this.connected = false; this.operations = []; shared.clients.add(this);
    }
    async connect() { this.connected = true; this.emit('connected'); }
    async close() { this.connected = false; this.shared.clients.delete(this); }
    async get(key) {
        const value = this.shared.values.get(key);
        if (!value || value.expiry !== null && value.expiry <= this.shared.now) return null;
        return Buffer.from(value.value);
    }
    async getMany(keys) { return Promise.all(keys.map(key => this.get(key))); }
    async keys(pattern) {
        const regex = new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*')}$`);
        const keys = [];
        for (const key of this.shared.values.keys()) if (regex.test(key) && await this.get(key) !== null) keys.push(key);
        return keys;
    }
    async set(key, value, options = {}) {
        this.operations.push({ method: 'set', key });
        this.shared.values.set(key, { value: Buffer.from(value), expiry: options.ttlMs == null ? null : this.shared.now + options.ttlMs });
        if (options.event) await this.publish(options.event.channel, options.event.payload);
    }
    async delete(keys, options = {}) {
        let count = 0;
        for (const key of Array.isArray(keys) ? keys : [keys]) if (this.shared.values.delete(key)) count++;
        if (options.event) await this.publish(options.event.channel, options.event.payload);
        return count;
    }
    async publish(channel, payload) {
        for (const client of this.shared.clients) if (client.connected) client.emit('event', { channel, payload: Buffer.from(payload), expired: false });
    }
    async update(key, operation) {
        this.operations.push({ method: 'update', key });
        const previous = this.shared.locks.get(key) || Promise.resolve();
        let release; const completed = new Promise(resolve => { release = resolve; });
        this.shared.locks.set(key, completed); await previous;
        try {
            const change = await operation(await this.get(key));
            await this.set(key, change.value, { ttlMs: change.ttlMs, event: change.event }); return change.result;
        } finally { release(); }
    }
    async expire(ms) {
        this.shared.now += ms;
        for (const [key, value] of this.shared.values) if (value.expiry !== null && value.expiry <= this.shared.now) {
            this.shared.values.delete(key);
            for (const client of this.shared.clients) if (client.connected) client.emit('event', { channel: key, payload: Buffer.from('null'), expired: true });
        }
    }
}
async function fixture(t, settings = {}, shared) {
    const store = new FakeStore(shared); const client = new Client({ autoConnect: false, ...settings }, { store });
    await client.connectDb(); t.after(() => client.destroy()); return { client, store };
}

test('plugin exports native backend identity and complete inspected 7.2.2 API', async t => {
    const { client } = await fixture(t);
    assert.equal(Server, null); assert.equal(getDefaultPort(), 5432);
    assert.deepEqual(client.getStatus(), { type: 'postgresql', server: false });
    for (const method of ['connectDb', 'getStatus', 'setState', 'setStateAsync', 'setRawState', 'getState', 'getStateAsync', 'getStates', '_destroyDBHelper', 'destroyDB', 'destroy', 'delState', 'getKeys', 'subscribe', 'subscribeUser', 'unsubscribe', 'unsubscribeUser', 'pushMessage', 'subscribeMessage', 'unsubscribeMessage', 'pushLog', 'subscribeLog', 'unsubscribeLog', 'getSession', 'setSession', 'destroySession', 'getProtocolVersion', 'setProtocolVersion', '_determineProtocolVersion']) assert.equal(typeof client[method], 'function', method);
    assert.equal(await client.getProtocolVersion(), '4');
});

test('setState matches metadata, seconds conversion, comment and deep equality semantics without mutating input', async t => {
    const { client, store } = await fixture(t);
    const state = { val: { watts: 4200 }, ack: true, ts: 1700000000, c: 'x'.repeat(600), from: 'system.adapter.test.0', user: 'system.user.installer', expire: 5 };
    assert.equal(await client.setState('test.power', state), 'test.power');
    assert.equal(state.expire, 5);
    const first = await client.getState('test.power');
    assert.deepEqual(first, { val: { watts: 4200 }, ack: true, ts: 1700000000000, q: 0, c: 'x'.repeat(512), from: state.from, user: state.user, lc: 1700000000000 });
    await client.setState('test.power', { val: { watts: 4200 }, ack: null, ts: 1700000010000 });
    const second = await client.getState('test.power');
    assert.equal(second.ack, true); assert.equal(second.lc, first.lc);
    assert.equal(store.shared.values.get('io.test.power').expiry, null, 'rewrite without expire removes old TTL');
    await client.setState('test.power', { ts: 1700000020000 });
    assert.equal((await client.getState('test.power')).ack, false);
    assert.deepEqual((await client.getState('test.power')).val, { watts: 4200 });
    assert.ok(store.operations.some(row => row.method === 'update' && row.key === 'io.test.power'));
});

test('primitive values, explicit lc/q and Async aliases preserve contract', async t => {
    const { client } = await fixture(t);
    await client.setStateAsync('primitive', false); assert.equal((await client.getStateAsync('primitive')).val, false);
    await client.setState('primitive', { val: null, ts: 1700000000000, lc: 123, q: 64 });
    assert.equal((await client.getState('primitive')).lc, 123); assert.equal((await client.getState('primitive')).q, 64);
});

test('ordered batch reads preserve duplicates and null missing values; qualified keys are namespace bound', async t => {
    const { client } = await fixture(t);
    await client.setState('a', 1); await client.setState('b', 2);
    assert.deepEqual((await client.getStates(['b', 'absent', 'a', 'b'])).map(row => row?.val ?? null), [2, null, 1, 2]);
    assert.deepEqual((await client.getStates(['io.a'], undefined, true)).map(row => row.val), [1]);
    await assert.rejects(client.getStates(['session.private'], undefined, true), /NAMESPACE_DENIED/);
    assert.deepEqual(await client.getStates([]), []);
    assert.deepEqual((await client.getKeys('*')).sort(), ['a', 'b']);
    assert.deepEqual((await client.getKeys('*', undefined, true)).sort(), ['io.a', 'io.b']);
});

test('raw restore keeps exact JSON and emits no event', async t => {
    const events = []; const { client } = await fixture(t, { change: (id, value) => events.push({ id, value }) });
    await client.subscribe('*'); await client.setRawState('restored', { val: 'keep', ts: 12, lc: 11, ack: true, extra: 'restore' }); await tick();
    assert.deepEqual(await client.getState('restored'), { val: 'keep', ts: 12, lc: 11, ack: true, extra: 'restore' });
    assert.deepEqual(events, []);
});

test('system/user subscription isolation, wildcards and unsubscribe', async t => {
    const system = [], user = []; const { client } = await fixture(t, { change: (id, value) => system.push({ id, value }), changeUser: (id, value) => user.push({ id, value }) });
    await client.subscribe('meter.[0-2].?'); await client.subscribeUser('meter.1.*');
    await client.setState('meter.1.p', 5); await client.setState('meter.3.p', 7); await tick();
    assert.deepEqual(system.map(event => event.id), ['meter.1.p']); assert.deepEqual(user.map(event => event.id), ['meter.1.p']);
    await client.unsubscribe('meter.[0-2].?'); await client.unsubscribeUser('meter.1.*');
    await client.setState('meter.1.p', 6); await tick(); assert.equal(system.length, 1); assert.equal(user.length, 1);
});

test('escaped glob literals and negated classes do not become regular-expression expressions', async t => {
    const events = []; const { client } = await fixture(t, { change: id => events.push(id) });
    await client.subscribe('literal.\\*.x'); await client.subscribe('class.[^ab]');
    await client.setState('literal.*.x', 1); await client.setState('literal.A.x', 1);
    await client.setState('class.a', 1); await client.setState('class.c', 1); await tick();
    assert.deepEqual(events, ['literal.*.x', 'class.c']);
});

test('state deletion and TTL expiration emit null; reads exclude expired values', async t => {
    const events = []; const { client, store } = await fixture(t, { change: (id, value) => events.push({ id, value }) });
    await client.subscribe('ttl.*'); await client.setState('ttl.expires', { val: 1, expire: 1 });
    await store.expire(1000); await tick(); assert.equal(await client.getState('ttl.expires'), null);
    assert.ok(events.some(event => event.id === 'ttl.expires' && event.value === null));
    await client.setState('ttl.deleted', 2); assert.equal(await client.delState('ttl.deleted'), 'ttl.deleted'); await tick();
    assert.ok(events.some(event => event.id === 'ttl.deleted' && event.value === null));
});

test('sessions expire, can be destroyed, and retain upstream one-argument success callback', async t => {
    const { client, store } = await fixture(t);
    await client.setSession('s', 2, { role: 'installer' });
    assert.deepEqual(await client.getSession('s'), { role: 'installer' });
    const args = await new Promise(resolve => client.getSession('s', (...values) => resolve(values)));
    assert.deepEqual(args, [{ role: 'installer' }]);
    await store.expire(2000); assert.equal(await client.getSession('s'), null);
    await client.setSession('s', 2, { role: 'user' }); await client.destroySession('s'); assert.equal(await client.getSession('s'), null);
    await assert.rejects(client.setSession('s', 0, {}), /INVALID_EXPIRY/);
});

test('messages/logs preserve prefixed channels and event buffers, without storing/replaying commands', async t => {
    const events = []; const { client, store } = await fixture(t, { change: (id, value) => events.push({ id, value }) });
    await client.subscribeMessage('.system.adapter.reader.0'); await client.subscribeLog('reader');
    const message = { command: 'read', from: 'system.adapter.writer.0', message: Buffer.from([0, 255, 7]) };
    await client.pushMessage('system.adapter.reader.0', message);
    const log = { severity: 'info', message: 'fixture', ts: 1700000000000 };
    assert.equal(await client.pushLog('reader', log), 'reader'); await tick();
    assert.equal(events[0].id, 'messagebox.system.adapter.reader.0'); assert.ok(Buffer.isBuffer(events[0].value.message));
    assert.deepEqual([...events[0].value.message], [0, 255, 7]); assert.equal(events[1].id, 'log.reader');
    assert.equal(message._id, undefined); assert.equal(log._id, undefined);
    assert.equal([...store.shared.values.keys()].some(key => key.startsWith('messagebox.') || key.startsWith('log.')), false);
    await client.unsubscribeMessage('system.adapter.reader.0'); await client.unsubscribeLog('reader');
    await client.pushMessage('system.adapter.reader.0', message); await client.pushLog('reader', log); await tick(); assert.equal(events.length, 2);
});

test('Buffer state read matches upstream JSON shape while change event revives Buffer', async t => {
    const events = []; const { client } = await fixture(t, { change: (_id, value) => events.push(value) });
    await client.subscribe('binary'); await client.setState('binary', { val: Buffer.from([10, 20]) }); await tick();
    assert.deepEqual((await client.getState('binary')).val, { type: 'Buffer', data: [10, 20] });
    assert.ok(Buffer.isBuffer(events[0].val));
});

test('callbacks are asynchronous and return id/error in their existing slots', async t => {
    const { client } = await fixture(t); let synchronous = true;
    const result = new Promise((resolve, reject) => client.setState('callback', 3, (error, id) => {
        try { assert.equal(synchronous, false); assert.equal(error, null); assert.equal(id, 'callback'); resolve(); } catch (e) { reject(e); }
    })); synchronous = false; await result;
    const args = await new Promise(resolve => client.getState('', (...values) => resolve(values)));
    assert.match(args[0].message, /INVALID_KEY/); assert.equal(args.length, 1);
});

test('destroyDB is limited to state namespace and leaves sessions/protocol intact', async t => {
    const { client } = await fixture(t); await client.setState('a', 1); await client.setSession('s', 10, {});
    await client.destroyDB(); assert.equal(await client.getState('a'), null); assert.deepEqual(await client.getSession('s'), {}); assert.equal(await client.getProtocolVersion(), '4');
    await assert.rejects(client._destroyDBHelper(['session.s']), /NAMESPACE_DENIED/);
});

test('disconnect fails writes closed and reconnect resumes live subscriptions without replay', async t => {
    const changes = [], lifecycle = []; const { client, store } = await fixture(t, { connected: () => lifecycle.push('connected'), disconnected: () => lifecycle.push('disconnected'), change: (id, value) => changes.push({ id, value }) });
    await client.subscribe('power'); await tick(); store.connected = false; store.emit('disconnected'); await tick();
    await assert.rejects(client.setState('power', 3), /DB_UNAVAILABLE/);
    store.connected = true; store.emit('connected'); await tick(); await tick();
    await client.setState('power', 4); await tick();
    assert.deepEqual(lifecycle, ['connected', 'disconnected', 'connected']); assert.deepEqual(changes.map(event => event.value.val), [4]);
});

test('unexpected protocol version disconnects and prevents writes', async t => {
    const { client, store } = await fixture(t); await assert.rejects(client.setProtocolVersion(5), /PROTOCOL_UNSUPPORTED/);
    await store.set('meta.states.protocolVersion', '5', { event: { channel: 'meta.states.protocolVersion', payload: '5' } });
    await assert.rejects(client.setState('power', 5), /DB_UNAVAILABLE/);
    await assert.rejects(client.connectDb(), /PROTOCOL_UNSUPPORTED/);
});

test('autoConnect failure is caught and emits only fixed diagnostic; explicit retry can report error', async t => {
    const diagnostics = []; const store = new FakeStore(); store.connect = async () => { throw new Error('fixture private connection text'); };
    const client = new Client({ logger: { warn: message => diagnostics.push(message) } }, { store }); t.after(() => client.destroy());
    await tick(); assert.deepEqual(diagnostics, ['EOS_PG_STATES_CONNECT_FAILED']); await assert.rejects(client.connectDb(), /fixture private connection text/);
});

test('invalid input, invalid JSON, nonfinite numbers and unsupported TTL are rejected before writing', async t => {
    const { client } = await fixture(t);
    for (const id of ['', null, 'x\u0000y', 'x'.repeat(1024)]) await assert.rejects(client.setState(id, 1), /INVALID_KEY/);
    for (const val of [Infinity, NaN, 1n, () => 1]) await assert.rejects(client.setState('bad', { val }), /INVALID_JSON/);
    const circular = {}; circular.self = circular; await assert.rejects(client.setState('bad', { val: circular }), /INVALID_JSON/);
    for (const expire of [-1, 0.5, '2', Infinity]) await assert.rejects(client.setState('bad', { val: 1, expire }), /INVALID_EXPIRY/);
    assert.equal(await client.getState('bad'), null);
});

test('bounded events reject oversized writes and preserve previous value', async t => {
    const { client } = await fixture(t); await client.setState('bounded', 1);
    await assert.rejects(client.setState('bounded', 'x'.repeat(1024 * 1024)), /VALUE_TOO_LARGE/);
    await assert.rejects(client.pushMessage('reader', { message: 'x'.repeat(1024 * 1024) }), /VALUE_TOO_LARGE/);
    assert.equal((await client.getState('bounded')).val, 1);
});

test('malformed stored JSON and malformed buffer event fail closed without raw diagnostics', async t => {
    const events = [], warnings = []; const { client, store } = await fixture(t, { change: value => events.push(value), logger: { warn: code => warnings.push(code) } });
    await store.set('io.invalid', '{private'); await assert.rejects(client.getState('invalid'), /INVALID_STORED_JSON/);
    await client.subscribe('invalid'); await store.publish('io.invalid', JSON.stringify({ val: { type: 'Buffer', data: [999] } })); await tick();
    assert.deepEqual(events, []); assert.deepEqual(warnings, ['EOS_PG_STATES_EVENT_INVALID']);
    await assert.rejects(client.setState('blocked-after-malformed-event', 1), /DB_UNAVAILABLE/);
});

test('simultaneous updates preserve latest value when later metadata-only write follows', async t => {
    const { client, store } = await fixture(t); const second = await fixture(t, {}, store.shared);
    await Promise.all([client.setState('concurrent', { val: 42, ts: 1700000000000 }), second.client.setState('concurrent', { ack: true, ts: 1700000001000 })]);
    const value = await client.getState('concurrent'); assert.equal(value.val, 42); assert.equal(value.ack, true); assert.equal(value.lc, 1700000000000);
});

test('closed client cannot reopen, read, publish or write', async t => {
    const { client } = await fixture(t); await client.destroy();
    await assert.rejects(client.connectDb(), /DB_UNAVAILABLE/); await assert.rejects(client.getState('a'), /DB_UNAVAILABLE/);
    await assert.rejects(client.pushMessage('a', {}), /DB_UNAVAILABLE/); await assert.rejects(client.setState('a', 1), /DB_UNAVAILABLE/);
});

test('overlapping subscriptions preserve normal duplicate delivery but expiry delivers once', async t => {
    const events = []; const { client, store } = await fixture(t, { change: (id, value) => events.push({ id, value }) });
    await client.subscribe('ttl.*'); await client.subscribe('ttl.x');
    await client.setState('ttl.x', { val: 1, expire: 1 }); await tick(); assert.equal(events.length, 2);
    await store.expire(1000); await tick(); assert.equal(events.length, 3); assert.equal(events[2].value, null);
});

test('queued events are discarded across disconnect rather than executing stale commands', async t => {
    const events = []; const { client, store } = await fixture(t, { change: (id, value) => events.push({ id, value }) });
    await client.subscribeMessage('reader'); await client.pushMessage('reader', { command: 'fixture' });
    store.connected = false; store.emit('disconnected'); await tick(); assert.deepEqual(events, []);
});

test('event fanout and subscription count are bounded and overload disconnects visibly', async t => {
    const warnings = []; const { client, store } = await fixture(t, { change: () => {}, logger: { warn: message => warnings.push(message) } });
    for (let i = 0; i < 1024; i++) await client.subscribe(`fanout.${i}`);
    await assert.rejects(client.subscribe('fanout.more'), /SUBSCRIPTION_LIMIT/);
    await client.unsubscribe('fanout.1023'); await client.subscribe('fanout.*');
    for (let i = 0; i < 513; i++) store.emit('event', { channel: 'io.fanout.0', payload: Buffer.from('null'), expired: false });
    await assert.rejects(client.setState('unavailable', 1), /DB_UNAVAILABLE/);
    assert.ok(warnings.includes('EOS_PG_STATES_EVENT_LIMIT')); await tick();
});

test('malformed UTF-8 stored data is rejected rather than normalized silently', async t => {
    const { client, store } = await fixture(t);
    await store.set('io.invalid', Buffer.from([0x22, 0xff, 0x22]));
    await assert.rejects(client.getState('invalid'), /INVALID_STORED_JSON/);
});

test('namespace globs and overlapping domains are rejected before opening a store', () => {
    assert.throws(() => new Client({ redisNamespace: '*' }, { store: new FakeStore() }), /INVALID_NAMESPACE/);
    assert.throws(() => new Client({ namespaceMsg: 'io.messagebox' }, { store: new FakeStore() }), /NAMESPACE_COLLISION/);
});

test('quote-shaped state ids remain literal data at the Store boundary', async t => {
    const { client, store } = await fixture(t); const id = "device.';DROP TABLE kv;--";
    await client.setState(id, 17); assert.equal((await client.getState(id)).val, 17);
    assert.ok(store.shared.values.has(`io.${id}`));
});

test('non-ASCII ids and Redis byte-wise question-mark globs remain compatible', async t => {
    const events = []; const { client } = await fixture(t, { change: id => events.push(id) });
    await client.subscribe('meter.🔋'); await client.subscribe('meter.????');
    await client.setState('meter.🔋', 19); await tick(); assert.deepEqual(events, ['meter.🔋', 'meter.🔋']);
    assert.equal((await client.getState('meter.🔋')).val, 19);
});

test('aggregate complex-glob work is bounded per incoming event', async t => {
    const warnings = []; const { client, store } = await fixture(t, { change: () => {}, logger: { warn: code => warnings.push(code) } });
    for (let i = 0; i < 8; i++) await client.subscribe(`${'?x'.repeat(490)}${i}`);
    store.emit('event', { channel: `io.${'x'.repeat(1000)}`, payload: Buffer.from('null'), expired: false });
    await assert.rejects(client.setState('unavailable', 1), /DB_UNAVAILABLE/);
    assert.ok(warnings.includes('EOS_PG_STATES_MATCH_LIMIT'));
});
