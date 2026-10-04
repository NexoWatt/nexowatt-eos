'use strict';
// The real pinned controller host-object generator, Objects client and Store
// transaction code run here. SQL/transport are deliberately test doubles: this
// is a JavaScript compatibility regression, NOT PostgreSQL/Pi acceptance.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { getHostObject } = require('@iobroker/js-controller-common-db/tools');
const { Client } = require(process.env.EOS_TEST_OBJECTS_MODULE || '../../runtime/postgresql/packages/db-objects-postgresql/index.cjs');
const { Store } = require('../../runtime/postgresql/packages/store/index.cjs');
const { validateDocument } = require('../../runtime/postgresql/packages/db-objects-postgresql/auth.cjs');
const entry = require.resolve('@iobroker/db-objects-redis');
assert.equal(JSON.parse(fs.readFileSync(path.resolve(path.dirname(entry), '../../package.json'))).version, '7.2.2');
const logger = Object.fromEntries(['silly', 'debug', 'info', 'warn', 'error'].map(name => [name, () => {}]));
function hostObject() {
    // The sandbox cannot enumerate interfaces. This unrelated OS read is the
    // only generator dependency stubbed; process.env stays the real Node object.
    const original = os.networkInterfaces;
    try { os.networkInterfaces = () => ({}); return getHostObject(); }
    finally { os.networkInterfaces = original; }
}
async function fixture(t) {
    const rows = new Map(), events = [], commands = [];
    let snapshot;
    const query = async (sql, params = []) => {
        commands.push(sql);
        if (sql === 'BEGIN') snapshot = new Map(rows);
        else if (sql === 'ROLLBACK') { rows.clear(); for (const [id, value] of snapshot) rows.set(id, value); }
        else if (sql.startsWith('SELECT value FROM eos_store.kv')) return { rows: rows.has(params[1]) ? [{ value: rows.get(params[1]) }] : [] };
        else if (sql.startsWith('INSERT INTO eos_store.kv')) rows.set(params[1], Buffer.from(params[2]));
        else if (sql.startsWith('INSERT INTO eos_store.events')) { events.push(params); return { rows: [{ id: String(events.length) }] }; }
        else if (sql !== 'COMMIT' && !sql.startsWith('SELECT pg_catalog.pg_advisory_xact_lock') && !sql.startsWith('SELECT pg_catalog.pg_notify')) throw Error('UNEXPECTED_TEST_SQL');
        return { rows: [], rowCount: 0 };
    };
    const store = new Store({ host: 'localhost', database: 'eos_lab', user: 'eos_objects', options: { ssl: { ca: 'fixture', cert: 'fixture', key: 'fixture' } } }, { domain: 'objects' });
    const connection = { query, release() {}, async end() {} };
    store.pool = { query, async connect() { return connection; }, async end() {} };
    store.connect = async () => { store.connected = true; store.emit('connected'); };
    const document = hostObject();
    const client = new Client({ autoConnect: false, logger, hostname: document.common.hostname }, { store });
    await client.connectDb();
    t.after(() => client.destroy());
    const initialRows = new Map(rows);
    events.length = 0; commands.length = 0;
    return { client, store, document, rows, events, commands, initialRows };
}

test('upstream host metadata contains the real exotic process.env object', () => {
    const document = hostObject();
    assert.equal(document.native.process.env, process.env);
    assert.notEqual(Object.getPrototypeOf(process.env), Object.prototype);
    assert.throws(() => validateDocument(document), /EOS_PG_DOCUMENT_INVALID/);
});

test('own trusted host writes commit without copying process environment into storage or event', async t => {
    const { client, document, rows, events, commands } = await fixture(t);
    assert.deepEqual(await client.setObject(document._id, document), { id: document._id });
    const written = JSON.parse(rows.get(client.objNamespace + document._id));
    assert.deepEqual(written.native.process.env, {});
    assert.deepEqual(JSON.parse(events.at(-1)[2]).native.process.env, {});
    assert.equal(written.common.installedVersion, '7.2.2');
    assert.equal(written.native.os.arch, process.arch);
    assert.equal(document.native.process.env, process.env, 'caller data remains unchanged');
    assert.equal(commands.at(-1), 'COMMIT');
});

test('subsequent host network metadata update preserves the stored host and callbacks', async t => {
    const { client, document, rows, events } = await fixture(t);
    await client.setObject(document._id, document);
    const stored = await client.getObject(document._id);
    stored.native.hardware.networkInterfaces = { lo: [{ address: '127.0.0.1', internal: true }] };
    let calls = 0;
    await new Promise((resolve, reject) => client.setObject(document._id, stored, (error, result) => {
        calls++; if (error) reject(error); else { assert.deepEqual(result, { id: document._id }); resolve(); }
    }));
    assert.equal(calls, 1);
    assert.deepEqual(JSON.parse(rows.get(client.objNamespace + document._id)).native.hardware.networkInterfaces, stored.native.hardware.networkInterfaces);
    assert.deepEqual(JSON.parse(events.at(-1)[2]).native.process.env, {});
});

test('unrelated object and foreign host retain strict exotic-prototype rejection', async t => {
    const { client, document, rows, events, commands, initialRows } = await fixture(t);
    const envLookalike = Object.assign(Object.create(Object.getPrototypeOf(process.env)), { EOS_TEST_PLACEHOLDER: 'not-a-secret' });
    const exoticHost = Object.assign(Object.create({ marker: true }), document);
    const exoticNative = Object.assign(Object.create({ marker: true }), document.native);
    const exoticProcess = Object.assign(Object.create({ marker: true }), document.native.process);
    for (const [id, object] of [
        ['sensor.test', { type: 'state', common: {}, native: { data: process.env } }],
        ['system.host.foreign', { ...document, _id: 'system.host.foreign' }],
        [document._id, { ...document, native: { ...document.native, unexpected: new Date() } }],
        [document._id, { ...document, native: { ...document.native, process: { ...document.native.process, env: envLookalike } } }],
        [document._id, exoticHost],
        [document._id, { ...document, native: exoticNative }],
        [document._id, { ...document, native: { ...document.native, process: exoticProcess } }]
    ]) {
        await assert.rejects(client.setObject(id, object), { code: 'EOS_PG_DOCUMENT_INVALID' });
        assert.equal(commands.at(-1), 'ROLLBACK');
    }
    assert.deepEqual(rows, initialRows);
    assert.equal(events.length, 0);
});

test('forged administrator options do not admit controller environment metadata', async t => {
    const { client, document, rows, events, commands, initialRows } = await fixture(t);
    await assert.rejects(client.setObject(document._id, document, { user: 'system.user.unrecognized', groups: ['system.group.administrator'], checked: true }));
    assert.deepEqual(rows, initialRows);
    assert.equal(events.length, 0);
    assert.equal(commands.at(-1), 'ROLLBACK');
});

test('known nonadministrator writer cannot use the trusted host normalization', async t => {
    const { client, document, rows, events, commands } = await fixture(t);
    rows.set(client.objNamespace + 'system.user.writer', Buffer.from(JSON.stringify({ type: 'user', common: { enabled: true } })));
    const group = { _id: 'system.group.writer', type: 'group', common: { members: ['system.user.writer'], acl: { object: { read: true, list: true, create: true, write: true } } } };
    // Bound group enumeration is unrelated to the host payload compatibility.
    const originalKeys = client.store.keys;
    client.store.keys = async pattern => pattern === client.objNamespace + 'system.group.*' ? [client.objNamespace + group._id] : originalKeys.call(client.store, pattern);
    client.store.getMany = async () => [Buffer.from(JSON.stringify(group))];
    const before = new Map(rows);
    await assert.rejects(client.setObject(document._id, document, { user: 'system.user.writer' }), { code: 'EOS_PG_DOCUMENT_INVALID' });
    assert.deepEqual(rows, before); assert.equal(events.length, 0); assert.equal(commands.at(-1), 'ROLLBACK');
});

test('ordinary document errors retain safe diagnostic codes through the actual transaction boundary', async t => {
    const { client, rows, events, initialRows } = await fixture(t);
    for (const native of [{ bad: Infinity }, { bad: new Date() }]) {
        await assert.rejects(client.setObject('sensor.invalid', { type: 'state', common: {}, native }), { code: 'EOS_PG_DOCUMENT_INVALID' });
    }
    const native = Object.fromEntries([['constructor', {}]]);
    await assert.rejects(client.setObject('sensor.invalid', { type: 'state', common: {}, native }), { code: 'EOS_PG_DOCUMENT_UNSAFE_KEY' });
    const nested = {}; let next = nested;
    for (let depth = 0; depth < 65; depth++) next = next.child = {};
    await assert.rejects(client.setObject('sensor.invalid', { type: 'state', common: {}, native: nested }), { code: 'EOS_PG_DOCUMENT_LIMIT' });
    assert.deepEqual(rows, initialRows); assert.equal(events.length, 0);
});
