'use strict';

// The real Store with controlled SQL clients. These are lifecycle regressions,
// not PostgreSQL/TLS/RLS or Raspberry Pi execution evidence.
const test = require('node:test');
const assert = require('node:assert/strict');
const { Store, LIMITS } = require('../../runtime/postgresql/packages/store/index.cjs');
const tick = () => new Promise(resolve => setImmediate(resolve));
const gate = () => {
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    return { promise, resolve };
};
function fixture() {
    const store = new Store({ host: 'db.example.invalid', database: 'eos', user: 'eos_states',
        options: { ssl: { ca: 'fixture-not-a-certificate', cert: 'fixture-not-a-certificate', key: 'fixture-not-a-key' } } }, { domain: 'states' });
    store.connected = true;
    const commands = [], releases = [];
    const client = { query: async sql => { commands.push(sql); return { rows: [] }; },
        release: discard => releases.push(discard === true), end: async () => {} };
    store.pool = { connect: async () => client };
    return { store, client, commands, releases };
}
function reconnect(store) {
    store.connected = false; store.generation++;
    store.connected = true; store.generation++;
}

test('transaction queued before a disconnect cannot start after reconnect', async () => {
    const { store, client, commands, releases } = fixture(), admitted = gate();
    store.pool.connect = () => admitted.promise;
    let mutations = 0;
    const pending = store.transaction(async () => { mutations++; });
    const rejected = assert.rejects(pending, { code: 'EOS_PG_UNAVAILABLE' });
    reconnect(store); admitted.resolve(client); await rejected;
    assert.equal(mutations, 0); assert.deepEqual(commands, []); assert.equal(releases.length, 1);
});

test('active transaction cannot continue SQL across a reconnect generation', async () => {
    const { store, commands } = fixture(), entered = gate(), resume = gate();
    const pending = store.transaction(async () => {
        entered.resolve(); await resume.promise; await store.get('io.stale');
    });
    const rejected = assert.rejects(pending, { code: 'EOS_PG_TRANSACTION_ABORTED' });
    await entered.promise; reconnect(store); resume.resolve(); await rejected;
    assert.equal(commands.some(sql => sql.startsWith('SELECT value') || sql === 'COMMIT'), false);
    assert.equal(commands.at(-1), 'ROLLBACK');
});

test('reconnect during callback prevents commit even when callback performs no more SQL', async () => {
    const { store, commands } = fixture(), entered = gate(), resume = gate();
    const pending = store.transaction(async () => { entered.resolve(); await resume.promise; return 'not-current'; });
    const rejected = assert.rejects(pending, { code: 'EOS_PG_TRANSACTION_ABORTED' });
    await entered.promise; reconnect(store); resume.resolve(); await rejected;
    assert.equal(commands.includes('COMMIT'), false); assert.equal(commands.at(-1), 'ROLLBACK');
});

test('detached transaction continuation cannot query a released client after commit', async () => {
    const { store, commands, releases } = fixture(), resume = gate(); let continuation;
    await store.transaction(async () => {
        continuation = (async () => { await resume.promise; return store.get('io.after-release'); })();
        return 'committed';
    });
    assert.equal(commands.at(-1), 'COMMIT'); assert.equal(releases.length, 1);
    const rejected = assert.rejects(continuation, { code: 'EOS_PG_TRANSACTION_ABORTED' });
    resume.resolve(); await rejected;
    assert.equal(commands.some(sql => sql.startsWith('SELECT value')), false);
});

test('failed rollback discards the connection instead of returning unknown transaction state to the pool', async () => {
    const { store, client, commands, releases } = fixture();
    client.query = async sql => { commands.push(sql); if (sql === 'ROLLBACK') throw new Error('fixture-private-driver-failure'); return {}; };
    await assert.rejects(store.transaction(async () => { throw new Error('fixture-private-operation-failure'); }),
        { code: 'EOS_PG_TRANSACTION_FAILED' });
    assert.equal(commands.at(-1), 'ROLLBACK'); assert.deepEqual(releases, [true]);
});

test('successful transaction still commits once and returns a reusable client', async () => {
    const { store, commands, releases } = fixture();
    assert.equal(await store.transaction(async () => 'ok'), 'ok');
    assert.equal(commands.filter(sql => sql === 'COMMIT').length, 1); assert.deepEqual(releases, [false]);
    await tick();
});

test('transaction deadline also bounds rollback cleanup when the driver never settles it', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const { store, client, releases } = fixture(), entered = gate(), rollback = gate();
    let ended = 0, result;
    client.end = async () => { ended++; };
    client.query = async sql => {
        if (sql === 'ROLLBACK') { entered.resolve(); return rollback.promise; }
        return {};
    };
    const pending = store.transaction(async () => { throw new Error('fixture-private-operation-failure'); })
        .then(() => { result = 'unexpected-success'; }, error => { result = error.code; });
    await entered.promise;
    t.mock.timers.tick(LIMITS.transaction); await tick();
    try {
        assert.equal(result, 'EOS_PG_TRANSACTION_FAILED');
        assert.equal(ended, 1); assert.deepEqual(releases, [true]);
    } finally {
        rollback.resolve(); await pending;
    }
});
