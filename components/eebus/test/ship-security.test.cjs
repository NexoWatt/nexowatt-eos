'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { X509Certificate } = require('node:crypto');
const { ShipEndpoint } = require('../build/lib/shipEndpoint');
const { certificateIdentity, peerIdentity, matchesDiscoveredIdentity } = require('../build/lib/shipSecurity');
const { getConfig } = require('../build/lib/config');
const { ClsControlParser } = require('../build/lib/clsControlParser');
const { decodeShipFrame } = require('../build/lib/shipFrames');

function fixture(trusted = true) {
    const received = [], entered = [], states = [];
    let approved = trusted;
    const endpoint = new ShipEndpoint({ setTimeout, clearTimeout, log: { info() {}, warn() {}, debug() {} } }, getConfig({}), {},
        async (id, data) => received.push(data), async () => {}, async (...state) => states.push(state),
        async id => entered.push(id), async () => {}, async () => approved);
    const socket = Object.assign(new EventEmitter(), { readyState: 1, sent: [], closed: [],
        send(data) { this.sent.push(data); }, close(code) { this.closed.push(code); this.readyState = 3; } });
    const session = { deviceId: 'peer', socket, role: 'server', state: 'tls-connected', remoteSki: 'peer',
        remoteFingerprint: 'fingerprint', remoteAddress: '127.0.0.1', protocolSelected: false,
        remoteHelloReady: false, localHelloReady: false, dataExchangeReady: false };
    return { endpoint, session, socket, received, entered, states, revoke() { approved = false; } };
}

test('data before completed handshake never reaches message/CLS handlers', async () => {
    const f = fixture();
    await f.endpoint.handleFrame(f.session, { type: 'data', value: { limit: 999 } });
    assert.deepEqual(f.received, []);
    assert.deepEqual(f.socket.closed, [1008]);
});

test('unsolicited PIN state and input cannot skip trusted hello and protocol selection', async () => {
    for (const value of [{ connectionPinState: { pinState: 'none' } }, { connectionPinInput: { pin: '' } }]) {
        const f = fixture();
        await f.endpoint.handleControl(f.session, value);
        assert.equal(f.session.dataExchangeReady, false);
        assert.deepEqual(f.entered, []);
        assert.equal(f.socket.closed[0], 1008);
    }
});

test('protocol selection is rejected before mutual hello', async () => {
    const f = fixture();
    await f.endpoint.handleControl(f.session, { messageProtocolHandshake: { handshakeType: 'select' } });
    assert.equal(f.session.protocolSelected, false);
    assert.deepEqual(f.entered, []);
    assert.equal(f.socket.closed[0], 1008);
});

test('complete trusted hello and protocol selection permit data', async () => {
    const f = fixture();
    f.session.localHelloReady = f.session.remoteHelloReady = true;
    await f.endpoint.handleControl(f.session, { messageProtocolHandshake: { handshakeType: 'select' } });
    assert.equal(f.session.dataExchangeReady, true);
    await f.endpoint.handleFrame(f.session, { type: 'data', value: { valid: true } });
    assert.deepEqual(f.received, [{ valid: true }]);
});

test('trust revocation blocks the next data frame and outbound reuse', async () => {
    const f = fixture();
    f.session.localHelloReady = f.session.remoteHelloReady = f.session.protocolSelected = true;
    await f.endpoint.enterDataExchange(f.session);
    f.endpoint.attachSession(f.session);
    f.revoke();
    await f.endpoint.handleFrame(f.session, { type: 'data', value: { invalid: true } });
    assert.deepEqual(f.received, []);
    assert.equal(f.endpoint.sendSpine('peer', { limit: 999 }), false);
});

test('local revoke/disconnect immediately removes outbound permission', () => {
    const f = fixture();
    f.session.dataExchangeReady = true;
    f.endpoint.attachSession(f.session);
    f.endpoint.rejectDevice('peer');
    assert.equal(f.session.dataExchangeReady, false);
    assert.equal(f.endpoint.sendSpine('peer', {}), false);
});

test('second peer session cannot replace the existing one', () => {
    const f = fixture();
    f.endpoint.attachSession(f.session);
    const other = fixture();
    assert.throws(() => f.endpoint.attachSession(other.session), /SHIP_DUPLICATE_SESSION/);
    assert.equal(f.endpoint.sessions.get('peer'), f.session);
    assert.equal(other.socket.closed[0], 1008);
});

test('peer certificate is mandatory before an incoming session is registered', async () => {
    const f = fixture();
    await assert.rejects(f.endpoint.registerSocket(f.socket, { socket: { getPeerCertificate: () => ({}) } }, 'server'),
        /SHIP_PEER_CERTIFICATE_REQUIRED/);
    assert.equal(f.endpoint.sessions.size, 0);
});

test('frame queue is bounded during asynchronous trust checks', async () => {
    const f = fixture();
    f.endpoint.attachSession(f.session);
    for (let n = 0; n < 33; n++) f.socket.emit('message', Buffer.from([0, 0]));
    assert.equal(f.socket.closed[0], 1008);
    await new Promise(resolve => setImmediate(resolve));
});

test('TLS public key identity matches OpenSSL SKI and cannot be replaced by discovery values', () => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-ship-test-'));
    try {
        execFileSync('openssl', ['req', '-new', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:P-256',
            '-nodes', '-subj', '/CN=eos-test', '-sha256', '-days', '1', '-addext', 'subjectKeyIdentifier=hash',
            '-keyout', path.join(temporary, 'key.pem'), '-out', path.join(temporary, 'cert.pem')], { stdio: 'pipe', timeout: 5000 });
        const pem = fs.readFileSync(path.join(temporary, 'cert.pem'));
        const peer = certificateIdentity(pem);
        const skiOutput = execFileSync('openssl', ['x509', '-in', path.join(temporary, 'cert.pem'), '-noout', '-ext', 'subjectKeyIdentifier'],
            { encoding: 'utf8', timeout: 5000 });
        const ski = skiOutput.match(/([A-F0-9]{2}:){19}[A-F0-9]{2}/)[0].replace(/:/g, '');
        assert.equal(peer.ski, ski);
        assert.equal(matchesDiscoveredIdentity(peer, { ski }), true);
        assert.equal(matchesDiscoveredIdentity(peer, { ski: '0'.repeat(40) }), false);
        assert.equal(matchesDiscoveredIdentity(peer, { ski, fingerprint: '0'.repeat(64) }), false);
        assert.equal(matchesDiscoveredIdentity(peer, { ski, fingerprint: peer.fingerprint }), true);
        assert.deepEqual(peerIdentity({ getPeerCertificate: () => ({ raw: new X509Certificate(pem).raw }) }).ski, ski);
    } finally { fs.rmSync(temporary, { force: true, recursive: true }); }
});

function validClsDatagram() {
    return { datagram: { header: { specificationVersion: '1.3.0', msgCounter: 1, cmdClassifier: 'write' },
        payload: { cmd: [{ loadControlLimitListData: { loadControlLimitData: [{
            limitId: 1, limitType: 'consumptionActivePower', isLimitActive: true, value: { number: 4200, scale: 0 },
        }] } }] } } };
}

test('untrusted control and bare JSON cannot tunnel a valid SPINE command into the CLS parser', async () => {
    const datagram = validClsDatagram();
    const parser = new ClsControlParser();
    const context = { deviceId: 'peer', receivedAtMs: Date.now() };
    // The exploit payload is deliberately valid for the actual recursive downstream parser.
    assert.equal(parser.parse({ unhandledControl: datagram }, context)[0]?.limitW, 4200);
    for (const type of ['control', 'json']) {
        const f = fixture(false);
        await f.endpoint.handleFrame(f.session, { type, value: datagram });
        const events = f.received.flatMap(value => parser.parse(value, context));
        assert.deepEqual(events, [], `${type} crossed the SHIP/CLS trust boundary`);
        assert.deepEqual(f.received, []);
        assert.equal(f.socket.closed[0], 1008);
    }
});

test('trusted-but-unfinished control and JSON frames cannot tunnel a CLS command either', async () => {
    for (const type of ['control', 'json']) {
        const f = fixture(true);
        f.session.localHelloReady = f.session.remoteHelloReady = true;
        await f.endpoint.handleFrame(f.session, { type, value: validClsDatagram() });
        assert.deepEqual(f.received, []);
        assert.equal(f.socket.closed[0], 1008);
    }
});

test('even a completed trusted session accepts SPINE only through the data channel', async () => {
    for (const type of ['control', 'json']) {
        const f = fixture(true);
        f.session.localHelloReady = f.session.remoteHelloReady = f.session.protocolSelected = f.session.dataExchangeReady = true;
        await f.endpoint.handleFrame(f.session, { type, value: validClsDatagram() });
        assert.deepEqual(f.received, []);
        assert.equal(f.socket.closed[0], 1008);
    }
    const f = fixture(true);
    f.session.localHelloReady = f.session.remoteHelloReady = f.session.protocolSelected = f.session.dataExchangeReady = true;
    await f.endpoint.handleFrame(f.session, { type: 'data', value: validClsDatagram() });
    const events = new ClsControlParser().parse(f.received[0], { deviceId: 'peer', receivedAtMs: Date.now() });
    assert.equal(events[0]?.limitW, 4200);
});

test('PIN requests cannot disclose configured PIN before trusted completed protocol selection', async () => {
    for (const trusted of [false, true]) for (const pinState of ['required', 'optional']) {
        const f = fixture(trusted);
        f.endpoint.config.pairingPin = 'TEST-PIN';
        await f.endpoint.handleFrame(f.session, { type: 'control', value: { connectionPinState: { pinState, inputPermission: 'ok' } } });
        assert.deepEqual(f.socket.sent, [], `PIN was sent before the trusted protocol boundary (${trusted}/${pinState})`);
        assert.deepEqual(f.received, []);
        assert.equal(f.socket.closed[0], 1008);
    }
});

test('legitimate PIN request after trusted hello and protocol selection retains pairing flow', async () => {
    for (const pinState of ['required', 'optional']) {
        const f = fixture(true);
        f.endpoint.config.pairingPin = 'TEST-PIN';
        f.session.localHelloReady = f.session.remoteHelloReady = f.session.protocolSelected = true;
        await f.endpoint.handleFrame(f.session, { type: 'control', value: { connectionPinState: { pinState, inputPermission: 'ok' } } });
        assert.equal(f.socket.closed.length, 0);
        assert.equal(f.socket.sent.length, 1);
        assert.equal(decodeShipFrame(f.socket.sent[0]).value.connectionPinInput.pin, 'TEST-PIN');
    }
});

test('revoked session cannot request PIN after previously completed protocol selection', async () => {
    const f = fixture(true);
    f.endpoint.config.pairingPin = 'TEST-PIN';
    f.session.localHelloReady = f.session.remoteHelloReady = f.session.protocolSelected = f.session.dataExchangeReady = true;
    f.revoke();
    await f.endpoint.handleFrame(f.session, { type: 'control', value: { connectionPinState: { pinState: 'required' } } });
    assert.deepEqual(f.socket.sent, []);
    assert.deepEqual(f.received, []);
    assert.equal(f.socket.closed[0], 1008);
});
