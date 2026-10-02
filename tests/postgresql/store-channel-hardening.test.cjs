'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Store, verifyStream } = require('../../runtime/postgresql/packages/store/index.cjs');
const fixture = () => new Store({ host: 'localhost', database: 'eos', user: 'eos_states', options: { ssl: { ca: 'test-ca', cert: 'test-cert', key: 'test-key' } } }, { domain: 'states' });
test('working connection verifier requires encryption, authorization and actual TLS1.3', () => {
    verifyStream({ connection: { stream: { encrypted: true, authorized: true, getProtocol: () => 'TLSv1.3' } } });
    for (const stream of [undefined, {}, { encrypted: true, authorized: false, getProtocol: () => 'TLSv1.3' },
        { encrypted: true, authorized: true, getProtocol: () => 'TLSv1.2' }, { authorized: true, getProtocol: () => 'TLSv1.3' }]) {
        assert.throws(() => verifyStream({ connection: { stream } }), /TLS_NEGOTIATED/);
    }
});
test('pre-reconnect watermark rejects retained event IDs and alternate numeric encodings', async () => {
    const s = fixture(); s.connected = true; s.eventFloor = 100n; s.lastDelivered = 100n; const queries = [], events = [];
    s._query = async (_sql, args) => { queries.push(args[1]); return { rowCount: 1, rows: [{ channel: 'io.x', payload: Buffer.from('1') }] }; };
    s.on('event', e => events.push(e));
    for (const id of ['1', '100', '0101', '+101', '0', '9223372036854775808', '101']) s._enqueue(id);
    await s.eventChain; assert.deepEqual(queries, ['101']); assert.equal(events.length, 1);
});
test('replay remains rejected after duplicate cache eviction', async () => {
    const s = fixture(); s.connected = true; let delivered = 0;
    s._query = async () => ({ rowCount: 1, rows: [{ channel: 'io.x', payload: Buffer.from('1') }] });
    s.on('event', () => delivered++);
    for (let i = 1; i <= 4100; i++) { s._enqueue(String(i)); await s.eventChain; }
    assert.equal(s.seen.has('1'), false); s._enqueue('1'); await s.eventChain; assert.equal(delivered, 4100);
});
test('queued lower sequence cannot be delivered after newer committed notification', async () => {
    const s = fixture(); s.connected = true; const seen = [];
    s._query = async (_sql, args) => { seen.push(args[1]); return { rowCount: 1, rows: [{ channel: 'io.x', payload: Buffer.from('1') }] }; };
    s._enqueue('2'); s._enqueue('1'); await s.eventChain; assert.deepEqual(seen, ['2']);
});
