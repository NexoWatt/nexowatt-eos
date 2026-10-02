'use strict';
// Focused laboratory regressions: actual local TLS/WebSocket plus deterministic
// ioBroker timer fixtures. No physical EEBUS/SHIP interoperability approval.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const Module = require('node:module');
const { EventEmitter, once } = require('node:events');
const { execFileSync } = require('node:child_process');
const { ShipEndpoint, SHIP_SECURITY_LIMITS } = require('../build/lib/shipEndpoint');
const { getConfig } = require('../build/lib/config');
const WebSocket = require('ws');

function adapterFixture() {
    const timers = new Map(); let next = 0;
    const adapter = { log: { info() {}, warn() {}, debug() {} },
        setTimeout(callback, milliseconds) { const handle = ++next; timers.set(handle, { callback, milliseconds }); return handle; },
        clearTimeout(handle) { timers.delete(handle); } };
    return { adapter, timers };
}
function endpointFixture(options = {}) {
    const timer = adapterFixture();
    const endpoint = new ShipEndpoint(timer.adapter,
        { ...getConfig({}), announceShipService: false, ...options.config }, options.identity || {},
        async () => {}, options.onNode || (async () => {}), async () => {}, async () => {}, async () => {}, async () => false);
    return { endpoint, ...timer };
}
class Socket extends EventEmitter {
    constructor() { super(); this.readyState = 1; this.terminated = false; }
    send() {}
    terminate() { this.terminated = true; this.readyState = 3; this.emit('close'); }
    close() { this.terminate(); }
}
function session(id, socket = new Socket()) { return { deviceId: id, socket, role: 'server', state: 'tls-connected',
    remoteSki: id, remoteFingerprint: id + 'fingerprint', remoteAddress: '127.0.0.1',
    protocolSelected: false, remoteHelloReady: false, localHelloReady: false, dataExchangeReady: false }; }
const flush = () => new Promise(resolve => setImmediate(resolve));

test('unpaired session has an enforced total pairing deadline that frees its slot', async () => {
    assert.equal(SHIP_SECURITY_LIMITS.pairingMs, 120000);
    const f = endpointFixture(); const pending = session('unpaired');
    f.endpoint.attachSession(pending);
    // attachSession is also used directly by existing security unit fixtures.
    // Arm the exact helper used before asynchronous incoming registration.
    if (!f.endpoint.pairingTimers.has(pending.socket)) f.endpoint.armPairingTimeout(pending.socket);
    assert.equal(f.endpoint.sessions.size, 1);
    const timeout = [...f.timers.values()].find(value => value.milliseconds === SHIP_SECURITY_LIMITS.pairingMs);
    assert.ok(timeout, 'pairing timeout must be registered through adapter timer API');
    timeout.callback(); await flush();
    assert.equal(pending.socket.terminated, true);
    assert.equal(f.endpoint.sessions.size, 0);
    assert.equal(f.endpoint.pairingTimers.size, 0);
    await f.endpoint.stop();
});

test('session limit rejects the 65th socket and stop force-closes every retained session', async () => {
    const f = endpointFixture(); const sessions = [];
    assert.equal(SHIP_SECURITY_LIMITS.maxConnections, 64);
    for (let index = 0; index < SHIP_SECURITY_LIMITS.maxConnections; index++) {
        const s = session(`peer-${index}`); f.endpoint.attachSession(s); sessions.push(s);
    }
    const overflow = session('overflow');
    assert.throws(() => f.endpoint.attachSession(overflow));
    assert.equal(overflow.socket.terminated || overflow.socket.readyState === 3, true);
    assert.equal(f.endpoint.sessions.size, 64);
    await f.endpoint.stop();
    assert.ok(sessions.every(s => s.socket.terminated)); assert.equal(f.endpoint.sessions.size, 0);
    assert.equal(f.endpoint.pendingConnections.size, 0); assert.equal(f.endpoint.registeringSockets.size, 0);
});

test('repeated discovery cannot create parallel outbound handshakes and stop resolves pending connect', async () => {
    const created = [];
    class PendingWebSocket extends Socket {
        constructor(_url, _protocol, options) { super(); this.readyState = 0; this.options = options; created.push(this); }
    }
    const original = Module._load;
    Module._load = function (request, parent, isMain) {
        if (request === 'ws' && /shipEndpoint\.js$/.test(parent?.filename || '')) return PendingWebSocket;
        return original.apply(this, arguments);
    };
    const f = endpointFixture({ config: { autoConnectEnabled: true }, identity: { shipId: 'local-fixture', localSki: 'B'.repeat(40) } });
    const node = { safeId: 'discovered', host: '127.0.0.1', port: 4712, path: '/ship/', ski: 'A'.repeat(40) };
    try {
        const first = f.endpoint.connectToNode(node); await flush();
        const second = f.endpoint.connectToNode(node); await flush();
        assert.equal(created.length, 1); assert.equal(f.endpoint.pendingConnections.size, 1);
        assert.equal(created[0].options.handshakeTimeout, SHIP_SECURITY_LIMITS.handshakeMs);
        await f.endpoint.stop();
        const results = await Promise.race([Promise.all([first, second]), new Promise((_, reject) => {
            const timer = setTimeout(() => reject(new Error('PENDING_CONNECT_NOT_SETTLED')), 1000); timer.unref();
        })]);
        assert.deepEqual(results, [false, false]); assert.equal(created[0].terminated, true);
        assert.equal(f.endpoint.pendingConnections.size, 0); assert.equal(f.endpoint.pairingTimers.size, 0);
    } finally { Module._load = original; await f.endpoint.stop(); }
});

test('late close from a dropped socket cannot delete a replacement session for the same peer', async () => {
    const f = endpointFixture();
    class DelayedCloseSocket extends Socket { terminate() { this.terminated = true; this.readyState = 3; } }
    const previous = session('same-peer', new DelayedCloseSocket());
    f.endpoint.attachSession(previous); f.endpoint.dropSocket(previous.socket);
    const replacement = session('same-peer'); f.endpoint.attachSession(replacement);
    previous.socket.emit('close'); await flush();
    assert.equal(f.endpoint.sessions.get('same-peer'), replacement);
    assert.equal(f.endpoint.sockets.get('same-peer'), replacement.socket);
    assert.equal(f.endpoint.sockets.get('same-peerfingerprint'), replacement.socket);
    await f.endpoint.stop();
});

test('actual TLS/WebSocket malformed frame during deferred onNode is contained and never creates a late session', { timeout: 15000 }, async t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-ship-resource-'));
    execFileSync('/usr/bin/openssl', ['req', '-new', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:P-256',
        '-nodes', '-subj', '/CN=localhost', '-sha256', '-days', '1', '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1',
        '-keyout', path.join(directory, 'key.pem'), '-out', path.join(directory, 'cert.pem')], { stdio: 'pipe', timeout: 5000 });
    const certificate = fs.readFileSync(path.join(directory, 'cert.pem'), 'utf8');
    const privateKey = fs.readFileSync(path.join(directory, 'key.pem'), 'utf8');
    let entered, release;
    const registrationEntered = new Promise(resolve => { entered = resolve; });
    const registrationRelease = new Promise(resolve => { release = resolve; });
    const f = endpointFixture({ config: { shipServerEnabled: true, shipPort: 0, shipPath: '/ship/' },
        identity: { certificate, privateKey }, onNode: async () => { entered(); await registrationRelease; } });
    let client;
    t.after(async () => { release(); client?.terminate(); await f.endpoint.stop(); fs.rmSync(directory, { recursive: true, force: true }); });
    assert.equal(await f.endpoint.start(), true);
    assert.equal(SHIP_SECURITY_LIMITS.handshakeMs, 5000);
    const port = f.endpoint.server.address().port;
    client = new WebSocket(`wss://127.0.0.1:${port}/ship/`, 'ship', { cert: certificate, key: privateKey,
        ca: certificate, servername: 'localhost', minVersion: 'TLSv1.3', maxVersion: 'TLSv1.3', handshakeTimeout: 3000 });
    client.on('error', () => {});
    await once(client, 'open'); await registrationEntered;
    assert.equal(f.endpoint.registeringSockets.size, 1); assert.equal(f.endpoint.sessions.size, 0);
    const closed = new Promise(resolve => client.once('close', resolve));
    // Masked frame using reserved opcode 3: ws emits a protocol error while
    // registration is deliberately blocked in an asynchronous callback.
    client._socket.write(Buffer.from([0x83, 0x80, 0, 0, 0, 0]));
    await closed; release(); await flush(); await flush();
    assert.equal(f.endpoint.sessions.size, 0); assert.equal(f.endpoint.registeringSockets.size, 0);
    assert.equal(f.endpoint.pairingTimers.size, 0);
});
