'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { AsyncLocalStorage } = require('node:async_hooks');
const { Client } = require('../../runtime/postgresql/packages/db-objects-postgresql/index.cjs');
const { match } = require('../../runtime/postgresql/packages/db-objects-postgresql/facade.cjs');
const { applyView } = require('../../runtime/postgresql/packages/db-objects-postgresql/views.cjs');

// Contract fake only: these tests exercise the real 7.2.2 Objects domain class
// and the new facade/guards. They do NOT connect to PostgreSQL or test its TLS.
class FakeStore extends EventEmitter {
    constructor() { super(); this.rows = new Map(); this.events = []; this.context = new AsyncLocalStorage(); this.tail = Promise.resolve(); this.connected = false; }
    async connect() { this.connected = true; this.emit('connected'); }
    async close() { this.connected = false; }
    async get(key) { return this.rows.has(key) ? Buffer.from(this.rows.get(key)) : null; }
    async getMany(keys) { return Promise.all(keys.map(key => this.get(key))); }
    async keys(pattern) { return [...this.rows.keys()].filter(key => match(pattern, key)).sort(); }
    async set(key, value, options = {}) { this.rows.set(key, Buffer.from(value)); if (options.event) await this.publish(options.event.channel, options.event.payload); }
    async delete(keys, options = {}) { let count = 0; for (const key of [keys].flat()) if (this.rows.delete(key)) count++; if (options.event) await this.publish(options.event.channel, options.event.payload); return count; }
    async rename(from, to) { if (!this.rows.has(from)) throw new Error('not found'); this.rows.set(to, this.rows.get(from)); this.rows.delete(from); }
    async publish(channel, payload) {
        const event = { channel, payload: Buffer.from(payload), expired: false };
        if (this.context.getStore()) this.context.getStore().events.push(event);
        else { this.events.push(event); this.emit('event', event); }
    }
    async transaction(action) {
        if (this.context.getStore()) return action();
        const previous = this.tail;
        let release; this.tail = new Promise(resolve => { release = resolve; });
        await previous;
        const before = new Map(this.rows), context = { events: [] };
        try {
            const result = await this.context.run(context, action);
            for (const event of context.events) { this.events.push(event); this.emit('event', event); }
            return result;
        } catch (error) { this.rows = before; throw error; }
        finally { release(); }
    }
    leaseAcquire(key, owner) { return this.transaction(async () => { if (this.rows.has(key)) return 0; await this.set(key, owner); return 1; }); }
    leaseExtend(key, owner) { return this.transaction(async () => (await this.get(key))?.toString() === owner ? 1 : 0); }
    leaseRelease(key, owner) { return this.transaction(async () => { if ((await this.get(key))?.toString() !== owner) return 0; await this.delete(key); this.emit('event', { channel: key, payload: Buffer.from('null'), expired: true }); return 1; }); }
}

const OWNER_ACL = { owner: 'system.user.admin', ownerGroup: 'system.group.administrator', object: 0x600, state: 0x600 };
const object = (id, extra = {}) => ({ _id: id, type: 'state', common: { name: id, type: 'number', read: true, write: true }, native: {}, acl: { ...OWNER_ACL }, ...extra });
const logger = { silly() {}, debug() {}, info() {}, warn() {}, error() {} };
async function fixture(t, settings = {}) {
    const store = new FakeStore();
    const client = new Client({ connection: {}, autoConnect: false, logger, hostname: 'test-host', ...settings }, { store });
    await client.connectDb();
    t.after(() => client.destroy());
    return { store, client };
}
async function addUser(store, user, acl) {
    await store.set('cfg.o.' + user, JSON.stringify({ _id: user, type: 'user', common: { enabled: true }, acl: OWNER_ACL }));
    await store.set('cfg.o.system.group.test', JSON.stringify({ _id: 'system.group.test', type: 'group', common: { members: [user], acl }, acl: OWNER_ACL }));
}

test('Objects loads as client-only PostgreSQL backend and preserves CRUD callbacks', async t => {
    const { client } = await fixture(t);
    assert.deepEqual(client.getStatus(), { type: 'postgresql', server: false });
    assert.equal(require('../../runtime/postgresql/packages/db-objects-postgresql/index.cjs').Server, undefined);
    assert.deepEqual(await client.setObject('sensor.power', object('sensor.power')), { id: 'sensor.power' });
    assert.equal((await client.getObject('sensor.power')).common.name, 'sensor.power');
    await client.extendObject('sensor.power', { native: { revision: 2 } });
    const callbackValues = await new Promise((resolve, reject) => client.getObject('sensor.power', (error, value) => error ? reject(error) : resolve(value)));
    assert.equal(callbackValues.native.revision, 2);
    await client.delObject('sensor.power');
    assert.equal(await client.getObject('sensor.power'), null);
});

test('denied global write cannot mutate, publish or call callback twice (F01 regression)', async t => {
    const { client, store } = await fixture(t);
    await client.setObject('sensor.power', object('sensor.power'));
    await addUser(store, 'system.user.viewer', { object: { read: true, list: true, write: false, create: false } });
    const eventCount = store.events.length;
    let calls = 0;
    await new Promise(resolve => client.setObject('sensor.power', object('sensor.power', { native: { changed: true } }), { user: 'system.user.viewer' }, error => { calls++; assert.match(String(error), /permissionError/); resolve(); }));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls, 1);
    assert.deepEqual((await client.getObject('sensor.power')).native, {});
    assert.equal(store.events.length, eventCount);
});

test('per-object deny overrides global write and supplied forged ACL/groups', async t => {
    const { client, store } = await fixture(t);
    await client.setObject('sensor.power', object('sensor.power'));
    await addUser(store, 'system.user.writer', { object: { read: true, list: true, write: true, create: true, delete: true } });
    const forged = { user: 'system.user.writer', groups: ['system.group.administrator'], group: 'system.group.administrator', acl: { object: { write: true } }, checked: true };
    const before = store.events.length;
    await assert.rejects(client.setObject('sensor.power', object('sensor.power'), forged), /permissionError/);
    await assert.rejects(client.extendObject('sensor.power', { native: { changed: true } }, forged), /permissionError/);
    await assert.rejects(client.delObject('sensor.power', forged), /permissionError/);
    assert.equal(store.events.length, before);
});

test('current group rights and enabled flag are refreshed without stale upstream ACL cache', async t => {
    const { client, store } = await fixture(t);
    const id = 'sensor.owned', user = 'system.user.writer';
    await addUser(store, user, { object: { read: true, list: true, write: true, create: true } });
    const owned = object(id, { acl: { owner: user, ownerGroup: 'system.group.test', object: 0x600 } });
    await client.setObject(id, owned, { user });
    await store.set('cfg.o.system.group.test', JSON.stringify({ _id: 'system.group.test', type: 'group', common: { members: [user], acl: { object: { write: false, read: true } } } }));
    await assert.rejects(client.extendObject(id, { native: { changed: true } }, { user }), /permissionError/);
    await store.set('cfg.o.' + user, JSON.stringify({ _id: user, type: 'user', common: { enabled: false } }));
    await assert.rejects(client.getObject(id, { user }), /permissionError/);
});

test('owner cannot change object ACL to gain broader access or alter users without users rights', async t => {
    const { client, store } = await fixture(t);
    const user = 'system.user.writer', id = 'sensor.owned';
    await addUser(store, user, { object: { read: true, list: true, write: true, create: true } });
    await client.setObject(id, object(id, { acl: { owner: user, ownerGroup: 'system.group.test', object: 0x600 } }), { user });
    await assert.rejects(client.extendObject(id, { acl: { object: 0x777 } }, { user }), /permissionError/);
    await assert.rejects(client.setObject(user, { _id: user, type: 'user', common: { enabled: true } }, { user }), /permissionError/);
});

test('prototype-sensitive and cyclic object payloads fail before writes', async t => {
    const { client, store } = await fixture(t);
    const before = store.events.length;
    await assert.rejects(client.setObject('unsafe', JSON.parse('{"type":"state","native":{"__proto__":{"polluted":true}}}')), /UNSAFE_KEY/);
    const cyclic = object('cyclic'); cyclic.native.self = cyclic;
    await assert.rejects(client.setObject('cyclic', cyclic), /DOCUMENT_INVALID/);
    assert.equal(store.events.length, before);
    assert.equal({}.polluted, undefined);
});

test('exact reviewed built-in views work and appended executable map text fails closed', async t => {
    const { client } = await fixture(t);
    const map = "function(doc) { if (doc.type === 'state') emit(doc._id, doc) }";
    await client.setObject('_design/system', { _id: '_design/system', type: 'design', views: { state: { map } } });
    await client.setObject('sensor.power', object('sensor.power'));
    await client.setObject('sensor.other', object('sensor.other'));
    assert.deepEqual((await client.getObjectView('system', 'state', { startkey: 'sensor.power', endkey: 'sensor.power' })).rows.map(row => row.id), ['sensor.power']);
    await client.setObject('_design/system', { _id: '_design/system', type: 'design', views: { state: { map: map + '; globalThis.PG_VIEW_EXECUTED = true' } } });
    await assert.rejects(client.getObjectView('system', 'state', {}), /VIEW_UNSUPPORTED/);
    assert.equal(globalThis.PG_VIEW_EXECUTED, undefined);
});

test('built-in custom and instanceStats views preserve projected values', () => {
    const custom = "function(doc) { doc.type === 'state' && doc.common && doc.common.custom && emit(doc._id, doc.common.custom) }";
    assert.deepEqual(applyView({ map: custom }, [object('a', { common: { custom: { history: { enabled: true } } } })]).rows[0].value, { history: { enabled: true } });
    const map = "function(doc) { if (doc.type === 'instance') emit(doc._id, parseInt(doc._id.split('.').pop(), 10)) }";
    assert.deepEqual(applyView({ map, reduce: '_stats' }, [{ _id: 'system.adapter.demo.2', type: 'instance' }, { _id: 'system.adapter.demo.7', type: 'instance' }]), { rows: [{ id: '_stats', value: { max: 7 } }] });
    assert.throws(() => applyView({ map, reduce: '_sum' }, []), /VIEW_UNSUPPORTED/);
});

test('file binary and metadata remain readable through original file API', async t => {
    const { client } = await fixture(t);
    await client.setObject('eos.0', { _id: 'eos.0', type: 'meta', common: { name: 'files', type: 'meta.user' }, native: {}, acl: OWNER_ACL });
    const binary = Buffer.from([0, 1, 2, 255]);
    await client.writeFile('eos.0', 'sample.bin', binary);
    assert.deepEqual((await client.readFile('eos.0', 'sample.bin')).file, binary);
    assert.equal(await client.fileExists('eos.0', 'sample.bin'), true);
    await client.rename('eos.0', 'sample.bin', 'renamed.bin');
    assert.deepEqual((await client.readFile('eos.0', 'renamed.bin')).file, binary);
    await client.unlinkAsync('eos.0', 'renamed.bin');
    assert.equal(await client.fileExists('eos.0', 'renamed.bin'), false);
});

test('transaction rollback leaves no partial object or publish when publish fails', async t => {
    const { client, store } = await fixture(t);
    store.publish = async () => { throw new Error('synthetic-publish-failure'); };
    await assert.rejects(client.setObject('sensor.fail', object('sensor.fail')), /synthetic-publish-failure/);
    assert.equal(await store.get('cfg.o.sensor.fail'), null);
});

test('system subscriptions, owner lease and release notification use store APIs without Lua', async t => {
    const changes = []; let primaryLost = 0;
    const { client } = await fixture(t, { change: (id, value) => changes.push([id, value]), primaryHostLost: () => { primaryLost++; } });
    await client.subscribe('sensor.*');
    await client.setObject('sensor.power', object('sensor.power'));
    await client.eventQueue;
    assert.equal(changes.at(-1)[0], 'sensor.power');
    assert.equal(await client.setPrimaryHost(5000), 1);
    assert.equal(await client.setPrimaryHost(5000), 0);
    assert.equal(await client.getPrimaryHost(), 'test-host');
    assert.equal(await client.extendPrimaryHostLock(5000), 1);
    await client.subscribePrimaryHost(); await client.releasePrimaryHost(); await client.eventQueue;
    assert.equal(primaryLost, 1);
    await assert.rejects(client.loadLuaScripts(), /LUA_UNSUPPORTED/);
    await assert.rejects(client.activateSets(), /SETS_UNSUPPORTED/);
});

test('user subscriptions check fresh read ACL for every event', async t => {
    const changes = [];
    const { client, store } = await fixture(t, { changeUser: (id, value) => changes.push([id, value]) });
    const user = 'system.user.viewer';
    await addUser(store, user, { object: { read: true, list: true } });
    await client.subscribeUser('sensor.*', { user });
    await client.setObject('sensor.secret', object('sensor.secret'));
    await client.setObject('sensor.public', object('sensor.public', { acl: { ...OWNER_ACL, object: 0x644 } }));
    await client.eventQueue;
    assert.deepEqual(changes.map(row => row[0]), ['sensor.public']);
    await store.set('cfg.o.' + user, JSON.stringify({ _id: user, type: 'user', common: { enabled: false } }));
    await client.extendObject('sensor.public', { native: { changed: true } });
    await client.eventQueue;
    assert.equal(changes.length, 1);
});

test('system subscription path cannot bypass an explicit user context', async t => {
    const changes = [];
    const { client, store } = await fixture(t, { change: id => changes.push(id) });
    const user = 'system.user.viewer';
    await addUser(store, user, { object: { read: true, list: true } });
    await client.subscribe('sensor.*', { user });
    await client.setObject('sensor.secret', object('sensor.secret'));
    await client.setObject('sensor.public', object('sensor.public', { acl: { ...OWNER_ACL, object: 0x644 } }));
    await client.eventQueue;
    assert.deepEqual(changes, ['sensor.public']);
});

test('mutating ACL while a writer waits cannot bypass serialized fresh authorization', async t => {
    const { client, store } = await fixture(t);
    const user = 'system.user.writer', id = 'sensor.owned';
    await addUser(store, user, { object: { read: true, list: true, write: true, create: true } });
    await client.setObject(id, object(id, { acl: { owner: user, ownerGroup: 'system.group.test', object: 0x600 } }), { user });
    let release, entered;
    const enteredPromise = new Promise(resolve => { entered = resolve; });
    const hold = store.transaction(async () => { entered(); await new Promise(resolve => { release = resolve; }); await store.set('cfg.o.system.group.test', JSON.stringify({ _id: 'system.group.test', type: 'group', common: { members: [user], acl: { object: { write: false } } } })); });
    await enteredPromise;
    const attempt = client.extendObject(id, { native: { changed: true } }, { user });
    release(); await hold;
    await assert.rejects(attempt, /permissionError/);
    assert.deepEqual((await client.getObject(id)).native, {});
});

test('file bytes and metadata roll back together on metadata failure', async t => {
    const { client, store } = await fixture(t);
    await client.setObject('eos.0', { _id: 'eos.0', type: 'meta', common: { type: 'meta.user' }, native: {} });
    const original = store.set.bind(store);
    store.set = async (key, ...args) => { if (key.endsWith('$%$meta')) throw new Error('synthetic-metadata-failure'); return original(key, ...args); };
    await assert.rejects(client.writeFile('eos.0', 'sample.bin', Buffer.from([1, 2, 3])), /synthetic-metadata-failure/);
    assert.equal(await store.get('cfg.f.eos.0$%$sample.bin$%$data'), null);
    assert.equal(await store.get('cfg.f.eos.0$%$sample.bin$%$meta'), null);
});

test('readonly file user cannot force a write with supplied privilege metadata', async t => {
    const { client, store } = await fixture(t);
    await client.setObject('eos.0', { _id: 'eos.0', type: 'meta', common: { type: 'meta.user' }, native: {} });
    await client.writeFile('eos.0', 'sample.txt', 'original');
    await addUser(store, 'system.user.viewer', { file: { read: true, list: true, write: false } });
    await assert.rejects(client.writeFile('eos.0', 'sample.txt', 'forged', { user: 'system.user.viewer', acl: { file: { write: true } }, groups: ['system.group.administrator'] }), /permissionError/);
    assert.equal((await client.readFile('eos.0', 'sample.txt')).file, 'original');
});

test('unknown view and database wipe require explicit supported authority', async t => {
    const { client, store } = await fixture(t);
    await client.setObject('sensor.power', object('sensor.power'));
    await addUser(store, 'system.user.writer', { object: { read: true, list: true, write: true }, file: { write: true } });
    await assert.rejects(client.destroyDB({ user: 'system.user.writer' }), /permissionError/);
    assert.notEqual(await client.getObject('sensor.power'), null);
    await client.setObject('_design/unknown', { _id: '_design/unknown', views: { unsafe: { map: 'function(doc) { process.exit(1) }' } } });
    await assert.rejects(client.getObjectView('unknown', 'unsafe', {}), /VIEW_UNSUPPORTED/);
});

test('bulk reads and keys do not inherit the nonadministrator group bypass', async t => {
    const { client, store } = await fixture(t);
    const user = 'system.user.viewer';
    await addUser(store, user, { object: { read: true, list: true } });
    await client.setObject('sensor.secret', object('sensor.secret'));
    await client.setObject('sensor.public', object('sensor.public', { acl: { ...OWNER_ACL, object: 0x644 } }));
    assert.deepEqual(await client.getKeys('sensor.*', { user }), ['sensor.public']);
    const bulk = await client.getObjects(['sensor.secret', 'sensor.public'], { user });
    assert.deepEqual(bulk[0], { error: 'permissionError' });
    assert.equal(bulk[1]._id, 'sensor.public');
    assert.deepEqual((await client.getObjectList({ startkey: 'sensor.', endkey: 'sensor.\u9999' }, { user })).rows.map(row => row.id), ['sensor.public']);
    await assert.rejects(client.getObject('sensor.secret', { user }), /permissionError/);
});

test('nonadministrator file rename and recursive operations fail before protected target changes', async t => {
    const { client, store } = await fixture(t);
    await client.setObject('eos.0', { _id: 'eos.0', type: 'meta', common: { type: 'meta.user' }, native: {} });
    await client.writeFile('eos.0', 'protected.txt', 'protected');
    await addUser(store, 'system.user.writer', { file: { read: true, list: true, write: true, delete: true, create: true } });
    await assert.rejects(client.rename('eos.0', 'source.txt', 'protected.txt', { user: 'system.user.writer' }), /permissionError/);
    await assert.rejects(client.rm('eos.0', '*', { user: 'system.user.writer' }), /permissionError/);
    await assert.rejects(client.readDir('eos.0', '', { user: 'system.user.writer' }), /permissionError/);
    assert.equal((await client.readFile('eos.0', 'protected.txt')).file, 'protected');
});

test('protocol drift invalidates client so subsequent writes fail closed', async t => {
    const { client, store } = await fixture(t);
    store.emit('event', { channel: 'meta.objects.protocolVersion', payload: Buffer.from('999'), expired: false });
    await client.eventQueue;
    await assert.rejects(client.setObject('sensor.after-drift', object('sensor.after-drift')), /DB closed/);
    assert.equal(store.connected, false);
});

test('malformed event and excessive queued bytes invalidate the connection', async t => {
    const first = await fixture(t);
    first.store.emit('event', { channel: 'cfg.o.invalid', payload: Buffer.from('{'), expired: false });
    await first.client.eventQueue;
    assert.equal(first.client.stop, true);
    const second = await fixture(t);
    second.client.eventBytes = 16 * 1024 * 1024;
    second.store.emit('event', { channel: 'cfg.o.any', payload: Buffer.from('null'), expired: false });
    assert.equal(second.client.stop, true);
    assert.equal(second.store.connected, false);
});

test('qualified bulk-read compatibility flag and callback retain namespace contract', async t => {
    const { client } = await fixture(t);
    await client.setObject('sensor.power', object('sensor.power'));
    const keys = await new Promise((resolve, reject) => client.getKeys('sensor.*', {}, (error, value) => error ? reject(error) : resolve(value), true));
    assert.deepEqual(keys, ['cfg.o.sensor.power']);
    const values = await new Promise((resolve, reject) => client.getObjects(keys, {}, (error, value) => error ? reject(error) : resolve(value), true));
    assert.equal(values[0]._id, 'sensor.power');
});

test('empty and oversized subscription batches reject instead of leaving callbacks pending', async t => {
    const { client } = await fixture(t);
    await assert.rejects(client.subscribe([]), /SUBSCRIPTION_INVALID/);
    await assert.rejects(client.subscribeUser(new Array(1025).fill('*')), /SUBSCRIPTION_INVALID/);
    await assert.rejects(client.subscribe(undefined), /SUBSCRIPTION_INVALID/);
});

test('unlink and delFile cannot bypass recursive deletion guard through inherited helper', async t => {
    const { client, store } = await fixture(t);
    await client.setObject('eos.0', { _id: 'eos.0', type: 'meta', common: { type: 'meta.user' }, native: {} });
    await client.writeFile('eos.0', 'directory/protected.txt', 'protected');
    await addUser(store, 'system.user.writer', { file: { read: true, list: true, write: true, delete: true } });
    await assert.rejects(client.unlink('eos.0', 'directory', { user: 'system.user.writer' }), /permissionError/);
    await assert.rejects(client.delFile('eos.0', 'directory', { user: 'system.user.writer' }), /permissionError/);
    assert.equal((await client.readFile('eos.0', 'directory/protected.txt')).file, 'protected');
});

test('bounded wildcard matching preserves Redis classes, escapes and UTF-8 identifiers', () => {
    assert.equal(match('sensor.*', 'sensor.a'), true);
    assert.equal(match('sensor.?', 'sensor.aa'), false);
    assert.equal(match('a[0]', 'a0'), true);
    assert.equal(match('a\\[0\\]', 'a[0]'), true);
    assert.equal(match('a[^0]', 'a1'), true);
    assert.equal(match('sensor.🔋*', 'sensor.🔋power'), true);
    assert.equal(match('*a'.repeat(200) + 'b', 'a'.repeat(1000)), false);
    assert.throws(() => match('*'.repeat(1025), 'x'), /PATTERN_INVALID/);
});
