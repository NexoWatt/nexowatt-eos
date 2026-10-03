'use strict';
// Uses the pinned upstream Objects client, with an explicit Store test double.
// NODE_PATH may point to the verified R4 application node_modules. No native DB.
const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const upstreamEntry = require.resolve('@iobroker/db-objects-redis');
const upstreamPackage = JSON.parse(fs.readFileSync(path.resolve(path.dirname(upstreamEntry), '../../package.json'), 'utf8'));
assert.equal(upstreamPackage.name, '@iobroker/db-objects-redis');
assert.equal(upstreamPackage.version, '7.2.2');
const { Client } = require(process.env.EOS_TEST_OBJECTS_MODULE || '../../runtime/postgresql/packages/db-objects-postgresql/index.cjs');
const tick = () => new Promise(resolve => setImmediate(resolve));
class FakeStore extends EventEmitter {
    constructor() { super(); this.connected = true; }
    async close() { this.connected = false; }
}
function fixture(t, user = 'system.user.admin') {
    const store = new FakeStore(), changes = [], lifecycle = [];
    const client = new Client({ autoConnect: false, change: (id, value) => changes.push({ id, value }),
        connected: () => lifecycle.push('connected'), disconnected: () => lifecycle.push('disconnected') }, { store });
    // Isolate event lifecycle from initialization SQL; upstream constructor is real.
    client.stop = false; client.client = {};
    client.systemSubscriptionContexts.set(client.objNamespace + '*', user);
    client._determineProtocolVersion = async () => {};
    t.after(() => client.destroy());
    const event = (id = 'meter.power') => ({ channel: client.objNamespace + id,
        payload: Buffer.from(JSON.stringify({ type: 'state', common: {}, native: {} })) });
    const disconnect = () => { store.connected = false; store.emit('disconnected'); };
    const reconnect = async () => { store.connected = true; store.emit('connected'); await tick(); };
    return { client, store, changes, lifecycle, event, disconnect, reconnect };
}
function delayedUser(store) {
    let resume, entered;
    const started = new Promise(resolve => { entered = resolve; });
    store.get = async () => { entered(); return new Promise(resolve => { resume = () => resolve(Buffer.from(JSON.stringify({ type: 'user', common: { enabled: true } }))); }); };
    store.keys = async () => ['test-group'];
    store.getMany = async () => [Buffer.from(JSON.stringify({ _id: 'system.group.administrator', type: 'group', common: { members: ['system.user.viewer'] } }))];
    return { started, resume: () => resume() };
}
test('queued object change is not delivered after database disconnect', async t => {
    const l = fixture(t); l.store.emit('event', l.event()); l.disconnect();
    await l.client.eventQueue; assert.deepEqual(l.changes, []);
});
test('late ACL result cannot deliver an object from the disconnected generation', async t => {
    const l = fixture(t, 'system.user.viewer'), gate = delayedUser(l.store);
    l.store.emit('event', l.event()); await gate.started; l.disconnect(); gate.resume();
    await l.client.eventQueue; assert.deepEqual(l.changes, []);
});
test('reconnect drops old queued changes and delivers only new changes', async t => {
    const l = fixture(t); l.store.emit('event', l.event('old')); l.disconnect(); await l.reconnect();
    l.store.emit('event', l.event('new')); await l.client.eventQueue;
    assert.deepEqual(l.changes.map(row => row.id), ['new']);
    assert.deepEqual(l.lifecycle, ['disconnected', 'connected']);
});
test('destroy invalidates an asynchronous ACL result', async t => {
    const l = fixture(t, 'system.user.viewer'), gate = delayedUser(l.store);
    l.store.emit('event', l.event()); await gate.started; await l.client.destroy(); gate.resume();
    await l.client.eventQueue; assert.deepEqual(l.changes, []);
});
test('late file ACL callback does not notify after disconnect', async t => {
    const l = fixture(t); l.client.systemSubscriptionContexts.clear();
    l.client.userSubscriptionContexts.set(l.client.fileNamespace + '*', 'system.user.admin');
    let resume, entered; const started = new Promise(resolve => { entered = resolve; });
    l.client.checkFileRights = (_id, _name, _options, _mode, callback) => { entered(); resume = () => callback(null); };
    l.client.settings.changeFileUser = (...args) => l.changes.push(args);
    l.store.emit('event', { channel: l.client.fileNamespace + 'test$%$asset.png$%$data', payload: Buffer.from('12') });
    await started; l.disconnect(); resume(); await l.client.eventQueue;
    assert.deepEqual(l.changes, []);
});
test('late protocol check cannot report an already disconnected client as connected', async t => {
    const l = fixture(t); l.disconnect(); let resume;
    l.client._determineProtocolVersion = () => new Promise(resolve => { resume = resolve; });
    l.store.connected = true; l.store.emit('connected'); l.disconnect(); resume(); await tick();
    assert.equal(l.lifecycle.includes('connected'), false);
});
