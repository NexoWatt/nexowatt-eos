'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const https = require('node:https');
const http = require('node:http');
const { randomUUID } = require('node:crypto');
const { createGateway } = require('../../runtime/adapter-channel/server.cjs');
const { ChannelClient } = require('../../runtime/adapter-channel/client.cjs');
const { compilePolicy } = require('../../runtime/adapter-channel/policy.cjs');
const { certificates, tlsFor, policy } = require('./helpers.cjs');
let fixture;
test.before(() => { fixture = certificates(); });
test.after(() => fixture.close());
async function lab(t, overrides = {}) {
    const states = new Map([['sensor.0.power', { val: 123, ack: true, ts: Date.now(), lc: Date.now(), q: 0, internalSecret: 'must-not-leave-server' }]]), writes = [];
    const backend = { getState: async id => states.get(id) ?? null, setState: async (id, value, { check }) => { check(); writes.push({ id, value }); states.set(id, value); }, ...overrides };
    const gateway = createGateway({ tls: tlsFor(fixture.material.server), policy: policy(fixture.material), backend });
    await new Promise((resolve, reject) => { gateway.server.once('error', reject); gateway.server.listen(0, '127.0.0.1', resolve); });
    const port = gateway.server.address().port, clients = [];
    const client = name => { const c = new ChannelClient({ host: '127.0.0.1', port, tls: tlsFor(fixture.material[name]) }); clients.push(c); return c; };
    t.after(async () => { clients.forEach(c => c.close()); gateway.server.closeAllConnections(); await new Promise(resolve => gateway.server.close(resolve)); });
    return { gateway, states, writes, port, client };
}
function raw(port, name, envelope, changes = {}) {
    return new Promise((resolve, reject) => {
        const { rawBody, ...options } = changes;
        const body = rawBody ?? (envelope === undefined ? null : JSON.stringify(envelope));
        const request = https.request({ host: '127.0.0.1', port, path: body ? '/v1/rpc' : '/v1/session', method: body ? 'POST' : 'GET',
            ...tlsFor(fixture.material[name]), minVersion: 'TLSv1.3', maxVersion: 'TLSv1.3', agent: false,
            headers: body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {}, ...options }, response => {
            const chunks = []; response.on('data', data => chunks.push(data)); response.on('end', () => {
                try { resolve({ status: response.statusCode, body: JSON.parse(Buffer.concat(chunks)), protocol: response.socket?.getProtocol?.() }); } catch (e) { reject(e); }
            }); response.on('error', reject);
        });
        const timer = setTimeout(() => request.destroy(new Error('TEST_DEADLINE')), 6500);
        request.on('error', reject); request.on('close', () => clearTimeout(timer)); request.end(body);
    });
}
const envelope = (epoch, op, payload, ttl = 5000) => ({ v: 1, epoch, id: randomUUID(), issuedAt: Date.now(), expiresAt: Date.now() + ttl, op, payload });

test('real TLS1.3 mutual channel reads only public state fields', async t => {
    const l = await lab(t), c = l.client('javascript.0');
    const value = await c.readState('sensor.0.power'); assert.equal(value.val, 123); assert.deepEqual(Object.keys(value), ['val', 'ack', 'ts', 'lc', 'q']);
    const session = await raw(l.port, 'javascript.0'); assert.equal(session.status, 200); assert.equal(session.body.peer, 'javascript.0');
});
test('separate certificates send/receive authenticated messages, with no sender spoofing', async t => {
    const l = await lab(t), sender = l.client('sensor.0'), receiver = l.client('javascript.0');
    assert.deepEqual(await sender.send('javascript.0', 'sample', { watts: 123 }), { queued: true, executed: false });
    const messages = await receiver.receive(); assert.equal(messages.length, 1); assert.equal(messages[0].from, 'sensor.0'); assert.deepEqual(messages[0].data, { watts: 123 });
    assert.deepEqual(await receiver.receive(), []);
});
test('telemetry writes force ack=true and server-derived sender identity', async t => {
    const l = await lab(t); await l.client('sensor.0').writeState('sensor.0.power', 444);
    assert.deepEqual(l.writes, [{ id: 'sensor.0.power', value: { val: 444, ack: true, from: 'system.adapter.sensor.0' } }]);
});
test('logic writes only a bounded request namespace, ack=false', async t => {
    const l = await lab(t), c = l.client('javascript.0'); await c.writeState('eos.requests.javascript.0.setpoint', 4200);
    assert.equal(l.writes[0].value.ack, false);
    await assert.rejects(c.writeState('sensor.0.power', 0), /DENIED/);
    await assert.rejects(c.writeState('system.adapter.admin.0', 1), /DENIED/);
});
for (const value of [-1, 4201, '100', null, { val: 100 }]) test(`invalid control value ${JSON.stringify(value)} is denied before backend`, async t => {
    const l = await lab(t); await assert.rejects(l.client('javascript.0').writeState('eos.requests.javascript.0.setpoint', value), /VALUE/); assert.equal(l.writes.length, 0);
});
test('private data, unknown message commands and host messages are denied', async t => {
    const l = await lab(t), c = l.client('sensor.0');
    await assert.rejects(c.readState('session.admin'), /DENIED/);
    await assert.rejects(c.send('javascript.0', 'exec', {}), /DENIED/);
    await assert.rejects(c.send('system.host.pi', 'cmdExec', {}), /DENIED/);
});
test('additional identity fields cannot replace authenticated sender', async t => {
    const l = await lab(t), c = l.client('sensor.0');
    await assert.rejects(c.call('message.send', { to: 'javascript.0', command: 'sample', data: {}, from: 'admin.0' }), /REQUEST/);
});
test('valid CA certificate without policy pin is denied', async t => {
    const l = await lab(t); await assert.rejects(l.client('unknown.0').receive(), /PEER/);
});
test('expired certificate cannot authenticate', async t => {
    const l = await lab(t); await assert.rejects(l.client('expired.0').receive(), /CONNECTION/);
});
test('no client certificate cannot authenticate', async t => {
    const l = await lab(t); await assert.rejects(raw(l.port, 'sensor.0', undefined, { key: undefined, cert: undefined }));
});
test('wrong server name fails certificate verification', async t => {
    const l = await lab(t); await assert.rejects(raw(l.port, 'sensor.0', undefined, { servername: 'wrong.example.invalid' }));
});
test('wrong trust anchor fails certificate verification', async t => {
    const l = await lab(t); await assert.rejects(raw(l.port, 'sensor.0', undefined, { ca: fixture.material['unknown.0'].cert }));
});
test('TLS1.2 is rejected instead of downgraded', async t => {
    const l = await lab(t); await assert.rejects(raw(l.port, 'sensor.0', undefined, { minVersion: 'TLSv1.2', maxVersion: 'TLSv1.2' }));
});
test('plaintext HTTP is refused', async t => {
    const l = await lab(t);
    await assert.rejects(new Promise((resolve, reject) => { const r = http.get({ host: '127.0.0.1', port: l.port, path: '/v1/session', timeout: 1000 }, resolve); r.on('error', reject); r.on('timeout', () => r.destroy(new Error('TIMEOUT'))); }));
});
test('replayed RPC identifier cannot perform a second write', async t => {
    const l = await lab(t), session = (await raw(l.port, 'sensor.0')).body;
    const message = envelope(session.epoch, 'state.write', { id: 'sensor.0.power', value: 10 });
    assert.equal((await raw(l.port, 'sensor.0', message)).body.ok, true);
    assert.equal((await raw(l.port, 'sensor.0', message)).body.code, 'EOS_CHANNEL_REPLAY'); assert.equal(l.writes.length, 1);
});
test('expired or future-dated requests never reach backend', async t => {
    const l = await lab(t), session = (await raw(l.port, 'sensor.0')).body;
    for (const shift of [-10000, 10000]) { const e = envelope(session.epoch, 'state.write', { id: 'sensor.0.power', value: 10 }); e.issuedAt += shift; e.expiresAt += shift;
        assert.equal((await raw(l.port, 'sensor.0', e)).body.code, 'EOS_CHANNEL_DEADLINE'); }
    assert.equal(l.writes.length, 0);
});
test('expired queued messages are discarded before delivery', async t => {
    const l = await lab(t), session = (await raw(l.port, 'sensor.0')).body;
    assert.equal((await raw(l.port, 'sensor.0', envelope(session.epoch, 'message.send', { to: 'javascript.0', command: 'sample', data: 123 }, 100))).body.ok, true);
    await new Promise(resolve => setTimeout(resolve, 150)); assert.deepEqual(await l.client('javascript.0').receive(), []);
});
test('bounded mailbox rejects overflow and does not silently replace messages', async t => {
    const l = await lab(t), c = l.client('sensor.0');
    for (let i = 0; i < 32; i++) await c.send('javascript.0', 'sample', i);
    await assert.rejects(c.send('javascript.0', 'sample', 33), /BUSY/);
    const r = l.client('javascript.0'), messages = [...await r.receive(), ...await r.receive()]; assert.deepEqual(messages.map(m => m.data), Array.from({ length: 32 }, (_, i) => i));
});
test('policy revocation also invalidates live sessions and queued commands', async t => {
    const l = await lab(t), c = l.client('sensor.0'); await c.send('javascript.0', 'sample', 1);
    const next = policy(fixture.material); next.revision++; next.peers = next.peers.filter(p => p.id !== 'sensor.0');
    l.gateway.replacePolicy(next); await assert.rejects(c.readState('eos.requests.javascript.0.setpoint'), /PEER/);
    assert.deepEqual(await l.client('javascript.0').receive(), []);
});
test('policy changes during asynchronous work deny its late completion', async t => {
    let resume, entered; const started = new Promise(resolve => { entered = resolve; }); let committed = false;
    const l = await lab(t, { setState: async (_id, _value, { check }) => { entered(); await new Promise(resolve => { resume = resolve; }); check(); committed = true; } });
    const pending = assert.rejects(l.client('sensor.0').writeState('sensor.0.power', 1), /REVOKED|SESSION/);
    await started; const next = policy(fixture.material); next.revision++; next.peers[0].write = []; l.gateway.replacePolicy(next); resume(); await pending; assert.equal(committed, false);
});
test('unknown operations and oversized requests are rejected', async t => {
    const l = await lab(t), c = l.client('sensor.0'); await assert.rejects(c.call('object.read', { id: 'system.config' }), /OPERATION/);
    await assert.rejects(c.send('javascript.0', 'sample', 'x'.repeat(20000)), /SIZE/);
});
test('malformed backend values fail closed and backend error content is hidden', async t => {
    const l = await lab(t, { getState: async () => { throw new Error('password=DO_NOT_DISCLOSE'); } });
    await assert.rejects(l.client('javascript.0').readState('sensor.0.power'), /^Error: EOS_CHANNEL_BACKEND_UNAVAILABLE$/);
});
test('client budgets the full session plus RPC to five seconds and does not retry', { timeout: 9000 }, async t => {
    let count = 0, resume, entered; const started = new Promise(resolve => { entered = resolve; }); let committed = false;
    const l = await lab(t, { setState: async (_id, _value, { check }) => { count++; entered(); await new Promise(resolve => { resume = resolve; }); check(); committed = true; } });
    const before = performance.now(), pending = assert.rejects(l.client('sensor.0').writeState('sensor.0.power', 1), /DEADLINE|CONNECTION|RESPONSE/);
    await started; await pending; assert.ok(performance.now() - before < 6500); resume(); await new Promise(resolve => setImmediate(resolve));
    assert.equal(committed, false); assert.equal(count, 1);
});
test('closed clients cannot create another socket', async t => {
    const l = await lab(t), c = l.client('sensor.0'); c.close(); await assert.rejects(c.receive(), /CLOSED/);
});
test('policy cannot authorize arbitrary foreign writes, secrets, duplicate pins or unbounded numbers', () => {
    const mutations = [p => { p.peers[0].write[0].id = 'admin.0.x'; }, p => { p.peers[0].read.push('system.config'); },
        p => { p.peers[0].write[0].max = Infinity; }, p => { p.peers[1].fingerprint256 = p.peers[0].fingerprint256; },
        p => { p.peers[0].extra = true; }, p => { p.peers[0].read = ['*']; }];
    for (const mutate of mutations) { const p = policy(fixture.material); mutate(p); assert.throws(() => compilePolicy(p), /POLICY/); }
});
test('strict request parser rejects duplicate keys, non-finite numbers and excess nesting', async t => {
    const l = await lab(t), session = (await raw(l.port, 'sensor.0')).body;
    const e = JSON.stringify(envelope(session.epoch, 'state.write', { id: 'sensor.0.power', value: 1 }));
    for (const rawBody of [e.replace('"v":1', '"v":1,"v":1'), e.replace('"value":1', '"value":1e999'), '['.repeat(25) + '1' + ']'.repeat(25)]) {
        assert.equal((await raw(l.port, 'sensor.0', undefined, { rawBody })).body.code, 'EOS_CHANNEL_REQUEST');
    }
    assert.equal(l.writes.length, 0);
});
test('new gateway epoch rejects a request from an earlier service instance', async t => {
    const first = await lab(t), old = (await raw(first.port, 'sensor.0')).body;
    const second = await lab(t), e = envelope(old.epoch, 'state.write', { id: 'sensor.0.power', value: 1 });
    assert.equal((await raw(second.port, 'sensor.0', e)).body.code, 'EOS_CHANNEL_SESSION'); assert.equal(second.writes.length, 0);
});
test('null state remains null and is not reinterpreted as a zero reading', async t => {
    const l = await lab(t); l.states.get('sensor.0.power').val = null;
    assert.equal((await l.client('javascript.0').readState('sensor.0.power')).val, null);
});
test('rate limiting bounds authenticated requests', async t => {
    const l = await lab(t), results = [];
    for (let i = 0; i < 80; i++) results.push((await raw(l.port, 'sensor.0')).body);
    assert.ok(results.some(r => r.code === 'EOS_CHANNEL_RATE')); assert.ok(results.some(r => r.ok === true));
});
test('client concurrent calls are bounded and cancelled on close', async t => {
    let resume, started; const entered = new Promise(resolve => { started = resolve; });
    const l = await lab(t, { getState: async () => { started(); await new Promise(resolve => { resume = resolve; }); return null; } });
    const c = l.client('javascript.0'); c.active = 2; await assert.rejects(c.readState('sensor.0.power'), /BUSY/); c.active = 0;
    const pending = assert.rejects(c.readState('sensor.0.power'), /CONNECTION|RESPONSE/); await entered; c.close(); await pending; resume();
});
test('pin cannot authenticate a different certificate subject', async t => {
    const l = await lab(t), next = policy(fixture.material); next.revision++; next.peers[0].fingerprint256 = fixture.material['unknown.0'].fingerprint256;
    l.gateway.replacePolicy(next); await assert.rejects(l.client('unknown.0').receive(), /PEER/);
});
