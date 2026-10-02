'use strict';

// These deterministic probes use the real Store implementation and explicit SQL
// response doubles. They do not claim PostgreSQL, RLS, TLS or hardware execution.
const test = require('node:test');
const assert = require('node:assert/strict');
const { Store, LIMITS } = require('../../runtime/postgresql/packages/store/index.cjs');
const tick = () => new Promise(resolve => setImmediate(resolve));
const connection = () => ({ host: 'db.example.invalid', database: 'eos', user: 'eos_states',
    options: { ssl: { ca: 'fixture-not-a-certificate', cert: 'fixture-not-a-certificate', key: 'fixture-not-a-key' } } });
function fixture() {
    const store = new Store(connection(), { domain: 'states' }); store.connected = true;
    const events = []; store.on('event', event => events.push(event.payload.toString()));
    return { store, events };
}
function event(payload) { return { rowCount: 1, rows: [{ channel: 'io.fixture', payload: Buffer.from(payload), expired: false }] }; }

test('notification queue preserves received order despite deferred first SQL response', async () => {
    const { store, events } = fixture(), queries = [];
    let resolveFirst;
    store._query = (_sql, params) => { queries.push(params[1]); return params[1] === '1' ? new Promise(resolve => { resolveFirst = resolve; }) : Promise.resolve(event('new')); };
    store._enqueue('1'); store._enqueue('2'); await tick();
    assert.deepEqual(queries, ['1'], 'second query must not overtake the first');
    resolveFirst(event('old')); await store.eventChain;
    assert.deepEqual(queries, ['1', '2']); assert.deepEqual(events, ['old', 'new']); assert.equal(store.pending, 0);
});

test('notification started before reconnect cannot deliver into new connection generation', async () => {
    const { store, events } = fixture(), queries = [];
    let resolveOld;
    store._query = (_sql, params) => { queries.push(params[1]); return params[1] === '1' ? new Promise(resolve => { resolveOld = resolve; }) : Promise.resolve(event('fresh')); };
    store._enqueue('1'); store._enqueue('2'); await tick();
    // Reproduce a completed loss/reconnect boundary without opening a socket.
    store.connected = false; store.generation++; store.connected = true; store.generation++; store.seen.clear();
    store._enqueue('3'); resolveOld(event('stale')); await store.eventChain;
    assert.deepEqual(events, ['fresh']); assert.deepEqual(queries, ['1', '3']); assert.equal(store.pending, 0);
});

test('duplicate and malformed notification IDs do not cause another read or delivery', async () => {
    const { store, events } = fixture(); let reads = 0;
    store._query = async () => { reads++; return event('one'); };
    for (const id of ['1', '1', '', '-1', '1; SELECT', '9'.repeat(21), null, 1]) store._enqueue(id);
    await store.eventChain; store._enqueue('1'); await store.eventChain;
    assert.equal(reads, 1); assert.deepEqual(events, ['one']); assert.equal(store.pending, 0);
});

test('notification backlog over limit disconnects and drains without delivering old events', async () => {
    const { store, events } = fixture(); let losses = 0, reads = 0;
    store._lost = () => { losses++; store.connected = false; store.generation++; };
    store._query = async () => { reads++; return event('must-not-deliver'); };
    for (let id = 1; id <= 257; id++) store._enqueue(String(id));
    await store.eventChain;
    assert.equal(losses, 1); assert.equal(reads, 0); assert.deepEqual(events, []); assert.equal(store.pending, 0);
});

test('missing retained event disconnects instead of silently treating stream as current', async () => {
    const { store, events } = fixture(); let losses = 0;
    store._lost = () => { losses++; store.connected = false; store.generation++; };
    store._query = async () => ({ rowCount: 0, rows: [] });
    store._enqueue('1'); await store.eventChain;
    assert.equal(losses, 1); assert.deepEqual(events, []); assert.equal(store.pending, 0);
});

test('all outer mutation kinds share domain lock and nested mutations reuse transaction', async () => {
    const { store } = fixture(), locks = [], commands = []; let acquired = 0, released = 0;
    store.pool = { connect: async () => { acquired++; return {
        query: async (sql, params) => { commands.push(sql); if (sql.includes('advisory_xact_lock')) locks.push(params); return {}; },
        release: () => { released++; }, end: async () => {},
    }; } };
    for (const lockKey of ['write', 'io.fixture', 'objects:acl-write', 'expiry']) {
        await store.transaction(() => store.transaction(async () => 'ok', { lockKey: 'another-key' }), { lockKey });
    }
    assert.equal(acquired, 4); assert.equal(released, 4);
    assert.deepEqual(locks, Array.from({ length: 4 }, () => ['states:mutation']));
    assert.equal(commands.filter(sql => sql === 'BEGIN').length, 4); assert.equal(commands.filter(sql => sql === 'COMMIT').length, 4);
});

test('actual pinned pg driver refuses password authentication despite inherited environment', async () => {
    const { Client } = require('pg');
    assert.equal(require('pg/package.json').version, '8.23.1');
    const oldPassword = process.env.PGPASSWORD, oldPassFile = process.env.PGPASSFILE;
    try {
        process.env.PGPASSWORD = 'fixture-value-not-an-actual-credential';
        process.env.PGPASSFILE = '/nonexistent-eos-review-fixture';
        const { store } = fixture(), client = new Client(store.config);
        assert.equal(typeof client.password, 'function');
        let authenticated = false;
        const rejected = new Promise(resolve => client.connection.once('error', resolve));
        // Exercise the real driver's password request branch without a socket.
        client._getPassword(() => { authenticated = true; });
        assert.equal((await rejected).code, 'EOS_PG_PASSWORD_AUTH_DISABLED');
        assert.equal(authenticated, false);
    } finally {
        if (oldPassword === undefined) delete process.env.PGPASSWORD; else process.env.PGPASSWORD = oldPassword;
        if (oldPassFile === undefined) delete process.env.PGPASSFILE; else process.env.PGPASSFILE = oldPassFile;
    }
});

test('transaction deadline rejects hung callback, closes connection and denies its late SQL', { timeout: 10000 }, async () => {
    const { store } = fixture(), commands = [], released = []; let ended = 0, resume, lateError;
    store.pool = { connect: async () => ({
        query: async sql => { commands.push(sql); return { rows: [] }; },
        release: destroyed => released.push(destroyed), end: async () => { ended++; },
    }) };
    const blocked = new Promise(resolve => { resume = resolve; });
    const started = performance.now();
    await assert.rejects(store.transaction(async () => {
        await blocked;
        try { return await store.get('io.late'); } catch (error) { lateError = error; throw error; }
    }), { code: 'EOS_PG_TRANSACTION_TIMEOUT' });
    assert.ok(performance.now() - started < LIMITS.transaction + 2000, 'deadline must settle the outer promise');
    assert.equal(ended, 1); assert.deepEqual(released, [true]);
    resume(); await tick();
    assert.equal(lateError?.code, 'EOS_PG_TRANSACTION_ABORTED');
    assert.equal(commands.some(sql => sql.startsWith('SELECT value') || sql === 'COMMIT'), false);
});

test('caught nested validation failure still aborts whole transaction without a partial commit', async () => {
    const { store } = fixture(), commands = [];
    store.pool = { connect: async () => ({ query: async sql => { commands.push(sql); return {}; }, release: () => {}, end: async () => {} }) };
    await assert.rejects(store.transaction(async () => {
        try {
            await store.transaction(async () => {
                await store._query('TEST_DOUBLE_WRITE');
                throw new Error('fixture validation failure');
            });
        } catch {}
        return 'outer attempted success';
    }), { code: 'EOS_PG_TRANSACTION_ABORTED' });
    assert.ok(commands.includes('TEST_DOUBLE_WRITE')); assert.ok(commands.includes('ROLLBACK'));
    assert.equal(commands.includes('COMMIT'), false);
});

test('repeated batch IDs cannot multiply allowed unique payload into an oversized result', async () => {
    const { store } = fixture(), value = Buffer.alloc(1024 * 1024);
    store._query = async () => ({ rowCount: 1, rows: [{ key: 'io.large', value, total_bytes: String(value.length) }] });
    assert.equal((await store.getMany(['io.large', 'io.large'])).length, 2);
    await assert.rejects(store.getMany(Array.from({ length: 17 }, () => 'io.large')), { code: 'EOS_PG_READ_LIMIT' });
});
