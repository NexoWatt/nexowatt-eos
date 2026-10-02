'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const tls = require('node:tls');
const net = require('node:net');
const { execFileSync } = require('node:child_process');
const { provision, probe, probeConfig } = require('../../runtime/transport/redis-tls.cjs');
const { validateConfig } = require('../../security/verify-runtime-tls.cjs');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-transport-test-'));
const a = path.join(temp, 'installation-a');
const b = path.join(temp, 'installation-b');
test.after(() => fs.rmSync(temp, { recursive: true, force: true }));
provision({ directory: a });
provision({ directory: b });
const config = JSON.parse(fs.readFileSync(path.join(a, 'credentials/iobroker-databases.json')));
const foreign = JSON.parse(fs.readFileSync(path.join(b, 'credentials/iobroker-databases.json')));

async function fixture(t, { handler, protocol = 'TLSv1.3', plain = false, serverCertificate } = {}) {
    const sockets = new Set();
    const listener = socket => {
        sockets.add(socket); socket.on('error', () => {}); socket.on('close', () => sockets.delete(socket));
        if (handler) handler(socket);
        else socket.on('data', chunk => socket.write(chunk.includes(Buffer.from('AUTH')) ? '+OK\r\n' : '+PONG\r\n'));
    };
    const server = plain ? net.createServer(listener) : tls.createServer({
        key: fs.readFileSync(path.join(a, 'certs/objects.key')), cert: serverCertificate || fs.readFileSync(path.join(a, 'certs/objects.crt')),
        minVersion: protocol, maxVersion: protocol }, listener);
    server.on('tlsClientError', () => {});
    server.on('connection', socket => { sockets.add(socket); socket.on('error', () => {}); });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(async () => { for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve)); });
    const connection = structuredClone(config.objects); connection.port = server.address().port;
    return { connection, sockets };
}

test('fresh installations have independent CA, server key and per-store random credentials', () => {
    assert.notEqual(config.objects.options.auth_pass, config.states.options.auth_pass);
    assert.notEqual(config.objects.options.auth_pass, foreign.objects.options.auth_pass);
    assert.notEqual(config.objects.options.tls.ca, foreign.objects.options.tls.ca);
    for (const dir of [a, b]) {
        assert.equal(fs.statSync(dir).mode & 0o777, 0o700);
        assert.equal(fs.statSync(path.join(dir, 'credentials/iobroker-databases.json')).mode & 0o777, 0o600);
        assert.equal(fs.statSync(path.join(dir, 'certs/objects.key')).mode & 0o777, 0o600);
        assert.equal(fs.existsSync(path.join(dir, 'authority')), false);
        const redis = fs.readFileSync(path.join(dir, 'redis/objects.conf'), 'utf8');
        assert.match(redis, /^port 0$/m); assert.match(redis, /^tls-protocols "TLSv1.3"$/m);
        assert.match(redis, /^user default off$/m); assert.match(redis, /-@dangerous/);
        assert.equal(redis.includes(config.objects.options.auth_pass), false);
    }
    assert.equal(validateConfig(config).configurationMatchesProfile, true);
});
test('provision never overwrites existing installation', () => {
    const before = fs.readFileSync(path.join(a, 'manifest.json'));
    assert.throws(() => provision({ directory: a }));
    assert.deepEqual(fs.readFileSync(path.join(a, 'manifest.json')), before);
});
test('path injection, symbolic-link parent and duplicate ports rejected', () => {
    assert.throws(() => provision({ directory: path.join(temp, 'bad\npath') }), /INVALID_PATH/);
    assert.throws(() => provision({ directory: path.join(temp, 'unused'), ports: { objects: 16379, states: 16379 } }), /DUPLICATE_PORT/);
    fs.symlinkSync(a, path.join(temp, 'link'));
    assert.throws(() => provision({ directory: path.join(temp, 'link/child') }), /SYMLINK_PARENT_FORBIDDEN/);
});
test('real TLS socket: authenticated TLS1.3 RESP fixture succeeds', async t => {
    const { connection } = await fixture(t);
    assert.deepEqual(await probe({ connection }), { status: 'AUTHENTICATED_TLS_PING_OK', tls: 'TLSv1.3', peerVerified: true });
});
test('real TLS socket: foreign CA rejected', async t => {
    const { connection } = await fixture(t); connection.options.tls.ca = foreign.objects.options.tls.ca;
    await assert.rejects(probe({ connection }), /TLS_OR_CONNECTION_REJECTED/);
});
test('real TLS socket: wrong SAN rejected', async t => {
    const { connection } = await fixture(t); connection.options.tls.servername = 'unexpected.internal';
    await assert.rejects(probe({ connection }), /TLS_OR_CONNECTION_REJECTED/);
});
test('real TLS socket: expired server certificate with trusted current CA rejected', async t => {
    const caKey = path.join(temp, 'fixture-ca.key'); const ca = path.join(temp, 'fixture-ca.crt');
    const request = path.join(temp, 'expired.csr'); const cert = path.join(temp, 'expired.crt');
    const ext = path.join(temp, 'expired.ext');
    const openssl = args => execFileSync('/usr/bin/openssl', args, { stdio: 'ignore', timeout: 5000 });
    openssl(['genpkey', '-algorithm', 'EC', '-pkeyopt', 'ec_paramgen_curve:P-256', '-out', caKey]);
    openssl(['req', '-new', '-x509', '-key', caKey, '-days', '1', '-subj', '/CN=temporary test CA', '-addext', 'basicConstraints=critical,CA:TRUE', '-out', ca]);
    openssl(['req', '-new', '-key', path.join(a, 'certs/objects.key'), '-subj', '/CN=eos-objects.internal', '-out', request]);
    fs.writeFileSync(ext, 'subjectAltName=DNS:eos-objects.internal\nextendedKeyUsage=serverAuth\nbasicConstraints=CA:FALSE\n', { mode: 0o600 });
    openssl(['x509', '-req', '-in', request, '-CA', ca, '-CAkey', caKey, '-set_serial', '1', '-days', '-1', '-extfile', ext, '-out', cert]);
    const { connection } = await fixture(t, { serverCertificate: fs.readFileSync(cert) });
    connection.options.tls.ca = fs.readFileSync(ca, 'utf8');
    await assert.rejects(probe({ connection }), /TLS_OR_CONNECTION_REJECTED/);
});
test('real TLS socket: TLS1.2-only peer rejected', async t => {
    const { connection } = await fixture(t, { protocol: 'TLSv1.2' });
    await assert.rejects(probe({ connection }), /TLS_OR_CONNECTION_REJECTED/);
});
test('plaintext RESP peer rejected', async t => {
    const { connection } = await fixture(t, { plain: true });
    await assert.rejects(probe({ connection }), /TLS_OR_CONNECTION_REJECTED/);
});
test('authentication failure never treated as healthy', async t => {
    const { connection } = await fixture(t, { handler: socket => socket.on('data', () => socket.write('-WRONGPASS rejected\r\n')) });
    await assert.rejects(probe({ connection }), /AUTHENTICATION_REJECTED/);
});
test('TLS verification cannot be disabled through configuration', async () => {
    const connection = structuredClone(config.objects); connection.options.tls.rejectUnauthorized = false;
    await assert.rejects(probe({ connection }), /CONNECTION_PROFILE_REJECTED/);
    await assert.rejects(probeConfig({ objects: connection, states: config.states }), /CONNECTION_PROFILE_REJECTED/);
});
test('hung peer deadline closes network socket', async t => {
    let closed;
    const closedPromise = new Promise(resolve => { closed = resolve; });
    const { connection } = await fixture(t, { handler: socket => { socket.on('close', closed); socket.resume(); } });
    await assert.rejects(probe({ connection, timeoutMs: 100 }), /TRANSPORT_TIMEOUT/);
    await Promise.race([closedPromise, new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('socket remained open')), 500); timer.unref(); })]);
});
test('response size is bounded', async t => {
    const { connection } = await fixture(t, { handler: socket => socket.on('data', () => socket.write(Buffer.alloc(32769, 65))) });
    await assert.rejects(probe({ connection }), /RESPONSE_TOO_LARGE/);
});
