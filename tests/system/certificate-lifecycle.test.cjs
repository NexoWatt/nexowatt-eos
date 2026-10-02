'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const tls = require('node:tls');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { provision, probe } = require('../../runtime/transport/redis-tls.cjs');
const { inspect, prepareRotation, activateRotation, recoverRotation, rebindMarker } = require('../../runtime/transport/certificate-lifecycle.cjs');
const DAY = 86400000;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
// Root-owned test directories have the same ancestor constraints as /etc. No
// host services/accounts/files outside this disposable fixture are changed.
const root = fs.mkdtempSync('/root/eos-certificate-lifecycle-test-');
test.after(() => fs.rmSync(root, { recursive: true, force: true }));
function fixture(t) {
    const dir = fs.mkdtempSync(path.join(root, 'case-'));
    const directory = path.join(dir, 'transport'); const configPath = path.join(dir, 'iobroker.json');
    const dataDirectory = path.join(dir, 'redis-data');
    fs.mkdirSync(dataDirectory, { mode: 0o700 });
    for (const scope of ['objects', 'states']) fs.mkdirSync(path.join(dataDirectory, scope), { mode: 0o700 });
    provision({ directory, dataDirectory });
    const config = JSON.parse(fs.readFileSync(path.join(directory, 'credentials/iobroker-databases.json')));
    config.system = { hostname: 'test-host', compact: false, allowShellCommands: false };
    fs.writeFileSync(configPath, JSON.stringify(config), { mode: 0o640 });
    const marker = { _id: 'system.meta.eosTestBase', type: 'meta', common: { name: 'EOS core bootstrap' },
        native: { profile: 'eos-core-only-bootstrap-v1', coreControllerVersion: '7.2.2', bootstrapPolicyVersion: 1,
            runtimeConfigSha256: sha(JSON.stringify(config)), creationAppLockSha256: 'a'.repeat(64), state: 'complete' } };
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    return { directory, configPath, config, marker, dataDirectory, work: path.join(dir, '.eos-transport-rotation') };
}
function hooksFor(f, extra = {}) {
    const calls = []; let marker = structuredClone(f.marker);
    const hooks = {
        stop: async () => { calls.push('stop'); }, startStores: async () => { calls.push('stores'); },
        probe: async () => { calls.push('probe'); }, startController: async () => { calls.push('controller'); },
        rebindMarker: async (oldConfig, newConfig) => { marker = rebindMarker(marker, oldConfig, newConfig); calls.push('marker'); },
        ...extra,
    };
    return { hooks, calls, marker: () => marker };
}
test('actual generated certificates: status contains fingerprints and dates but no credentials or private material', t => {
    const f = fixture(t); const result = inspect(f);
    assert.equal(result.status, 'CERTIFICATES_VALID'); assert.equal(result.transportReady, true);
    assert.equal(JSON.stringify(result).includes(f.config.objects.options.auth_pass), false);
    assert.equal(JSON.stringify(result).includes('PRIVATE KEY'), false);
    assert.equal(result.onlineSigningKey, false);
});
test('pre-expiry, expired and not-yet-valid statuses use certificate validity rather than manifest lifetime', t => {
    const f = fixture(t); const before = inspect(f);
    const validTo = Date.parse(before.certificates.objects.validTo);
    assert.equal(inspect({ ...f, nowMs: validTo - 29 * DAY }).status, 'RENEWAL_DUE');
    assert.equal(inspect({ ...f, nowMs: validTo }).status, 'CERTIFICATES_INVALID');
    assert.equal(inspect({ ...f, nowMs: Date.parse(before.certificates.objects.validFrom) - 1 }).transportReady, false);
});
test('wrong certificate key and broadened permissions are rejected', t => {
    const f = fixture(t); const key = path.join(f.directory, 'certs/objects.key');
    fs.chmodSync(key, 0o644); assert.throws(() => inspect(f), /SECRET_FILE_PERMISSIONS_REJECTED/);
    fs.chmodSync(key, 0o600); fs.copyFileSync(path.join(f.directory, 'certs/states.key'), key);
    assert.throws(() => inspect(f), /CERTIFICATE_IDENTITY_REJECTED/);
});
test('symlink and duplicate unsafe Redis TLS directive are rejected', t => {
    const f = fixture(t); const cert = path.join(f.directory, 'certs/objects.crt');
    fs.renameSync(cert, cert + '.real'); fs.symlinkSync(cert + '.real', cert);
    assert.throws(() => inspect(f), /UNTRUSTED_CERTIFICATE_PATH/);
    fs.unlinkSync(cert); fs.renameSync(cert + '.real', cert);
    fs.appendFileSync(path.join(f.directory, 'redis/objects.conf'), 'port 6379\n');
    assert.throws(() => inspect(f), /REDIS_CERTIFICATE_POLICY_DRIFT/);
});
test('CA or credential configuration drift is rejected before preparation', t => {
    const f = fixture(t); const config = structuredClone(f.config); config.objects.options.auth_pass = 'b'.repeat(64);
    fs.writeFileSync(f.configPath, JSON.stringify(config));
    assert.throws(() => prepareRotation(f), /TRANSPORT_CONFIGURATION_MISMATCH/);
    assert.equal(fs.existsSync(f.work), false);
});
test('prepare is exclusive, preserves live bytes and credentials and generates independent trust', t => {
    const f = fixture(t); const beforeConfig = fs.readFileSync(f.configPath); const before = inspect(f);
    assert.equal(prepareRotation(f).status, 'ROTATION_PREPARED');
    assert.deepEqual(fs.readFileSync(f.configPath), beforeConfig);
    assert.equal(inspect(f).certificates.ca.fingerprintSha256, before.certificates.ca.fingerprintSha256);
    const next = JSON.parse(fs.readFileSync(path.join(f.work, 'next-config.json')));
    assert.notEqual(next.objects.options.tls.ca, f.config.objects.options.tls.ca);
    assert.equal(next.objects.options.auth_pass, f.config.objects.options.auth_pass);
    assert.equal(next.states.options.auth_pass, f.config.states.options.auth_pass);
    assert.equal(fs.existsSync(path.join(f.work, 'next/authority')), false);
    assert.equal(fs.statSync(path.join(f.work, 'next-config.json')).mode & 0o777, 0o640);
    assert.throws(() => prepareRotation(f), /ROTATION_ALREADY_PENDING/);
});
test('activation preserves config, ACL, key permissions and data; rebinds only config hash', async t => {
    const f = fixture(t); const before = inspect(f);
    const external = f.dataDirectory; fs.writeFileSync(path.join(external, 'objects/persisted.fixture'), 'data');
    const expectedRedis = fs.readFileSync(path.join(f.directory, 'redis/objects.conf'));
    prepareRotation(f); const h = hooksFor(f);
    assert.equal((await activateRotation(f, h.hooks)).status, 'TRANSPORT_CERTIFICATES_ROTATED');
    const current = JSON.parse(fs.readFileSync(f.configPath));
    assert.notEqual(inspect(f).certificates.ca.fingerprintSha256, before.certificates.ca.fingerprintSha256);
    assert.equal(current.objects.options.auth_pass, f.config.objects.options.auth_pass);
    assert.equal(h.marker().native.runtimeConfigSha256, sha(JSON.stringify(current)));
    assert.equal(fs.readFileSync(path.join(external, 'objects/persisted.fixture'), 'utf8'), 'data');
    assert.deepEqual(fs.readFileSync(path.join(f.directory, 'redis/objects.conf')), expectedRedis);
    assert.equal(fs.statSync(f.configPath).mode & 0o777, 0o640);
    assert.equal(fs.existsSync(f.work), false);
    assert.deepEqual(h.calls, ['stop', 'stores', 'probe', 'marker', 'controller', 'probe']);
});
test('actual TLS 1.3 handshake: new trust succeeds and old CA cannot authenticate new server', async t => {
    const f = fixture(t); prepareRotation(f); await activateRotation(f, hooksFor(f).hooks);
    const sockets = new Set();
    const server = tls.createServer({ key: fs.readFileSync(path.join(f.directory, 'certs/objects.key')),
        cert: fs.readFileSync(path.join(f.directory, 'certs/objects.crt')), minVersion: 'TLSv1.3', maxVersion: 'TLSv1.3' }, socket => {
        socket.on('data', data => socket.write(data.includes(Buffer.from('AUTH')) ? '+OK\r\n' : '+PONG\r\n'));
    });
    server.on('tlsClientError', () => {}); server.on('connection', socket => { sockets.add(socket); socket.on('error', () => {}); });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(async () => { for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve)); });
    const config = JSON.parse(fs.readFileSync(f.configPath));
    const connection = { ...config.objects, port: server.address().port };
    assert.equal((await probe({ connection })).peerVerified, true);
    const previous = structuredClone(f.config.objects); previous.port = server.address().port;
    await assert.rejects(probe({ connection: previous }), /TLS_OR_CONNECTION_REJECTED/);
});
test('changed staged file is rejected before any service stop', async t => {
    const f = fixture(t); prepareRotation(f); fs.appendFileSync(path.join(f.work, 'next/redis/objects.conf'), '\n');
    const h = hooksFor(f); await assert.rejects(activateRotation(f, h.hooks), /ROTATION_PREPARED_STATE_CHANGED/);
    assert.deepEqual(h.calls, []);
});
test('failed controller trial restores old files, old trust and old marker then restarts', async t => {
    const f = fixture(t); const before = inspect(f); let starts = 0;
    prepareRotation(f); const h = hooksFor(f, { startController: async () => { if (++starts === 1) throw new Error('fixture failure'); } });
    await assert.rejects(activateRotation(f, h.hooks), /ROTATION_FAILED_PREVIOUS_TRANSPORT_RESTORED/);
    assert.equal(inspect(f).certificates.ca.fingerprintSha256, before.certificates.ca.fingerprintSha256);
    assert.deepEqual(h.marker(), f.marker); assert.equal(starts, 2); assert.equal(fs.existsSync(f.work), false);
});
for (const point of ['prepared', 'old-renamed', 'new-renamed', 'config-switched']) {
    test(`interrupted ${point} transaction is recoverable with retained journal`, async t => {
        const f = fixture(t); prepareRotation(f);
        if (point !== 'prepared') fs.renameSync(f.directory, path.join(f.work, 'previous'));
        if (point === 'new-renamed' || point === 'config-switched') fs.renameSync(path.join(f.work, 'next'), f.directory);
        if (point === 'config-switched') fs.copyFileSync(path.join(f.work, 'next-config.json'), f.configPath);
        const h = hooksFor(f); const recovered = await recoverRotation(f, h.hooks);
        assert.equal(recovered.status, 'PREVIOUS_TRANSPORT_RESTORED');
        assert.deepEqual(JSON.parse(fs.readFileSync(f.configPath)), f.config);
        assert.equal(inspect(f).status, 'CERTIFICATES_VALID'); assert.equal(fs.existsSync(f.work), false);
    });
}
test('expired rollback leaves all services stopped and transaction evidence retained', async t => {
    const f = fixture(t); prepareRotation(f); const h = hooksFor(f);
    await assert.rejects(recoverRotation({ ...f, nowMs: Date.now() + 91 * DAY }, h.hooks), /EXPIRED_PREVIOUS_CERTIFICATES_SERVICES_STOPPED/);
    assert.deepEqual(h.calls, ['stop']); assert.equal(fs.existsSync(f.work), true);
});
test('crash after committed rotation keeps new generation instead of restoring old trust', async t => {
    const f = fixture(t); prepareRotation(f);
    const nextConfig = JSON.parse(fs.readFileSync(path.join(f.work, 'next-config.json')));
    fs.renameSync(f.directory, path.join(f.work, 'previous')); fs.renameSync(path.join(f.work, 'next'), f.directory);
    fs.copyFileSync(path.join(f.work, 'next-config.json'), f.configPath);
    const journalPath = path.join(f.work, 'journal.json'), journal = JSON.parse(fs.readFileSync(journalPath));
    journal.state = 'complete'; fs.writeFileSync(journalPath, JSON.stringify(journal));
    const beforeRecovery = inspect(f).certificates.ca.fingerprintSha256;
    const h = hooksFor(f); assert.equal((await recoverRotation(f, h.hooks)).status, 'COMMITTED_TRANSPORT_CONFIRMED');
    assert.equal(inspect(f).certificates.ca.fingerprintSha256, beforeRecovery);
    assert.deepEqual(JSON.parse(fs.readFileSync(f.configPath)), nextConfig);
    assert.equal(h.marker().native.runtimeConfigSha256, sha(JSON.stringify(nextConfig)));
});
test('marker rebind refuses pending marker or unrelated config mutation and is idempotent for recovery', t => {
    const f = fixture(t); const changed = structuredClone(f.config); changed.system.allowShellCommands = true;
    assert.throws(() => rebindMarker(f.marker, f.config, changed), /MARKER_CONFIG_CHANGE_REJECTED/);
    const marker = structuredClone(f.marker); marker.native.state = 'pending';
    assert.throws(() => rebindMarker(marker, f.config, f.config), /BOOTSTRAP_MARKER_REBIND_REJECTED/);
    assert.deepEqual(rebindMarker(f.marker, f.config, f.config), f.marker);
});
test('CLI status emits valid JSON; invalid options never expose filesystem or secret details', t => {
    const f = fixture(t); const script = path.resolve(__dirname, '../../runtime/transport/certificate-lifecycle.cjs');
    const result = spawnSync(process.execPath, [script, 'status', '--directory', f.directory, '--config', f.configPath], { encoding: 'utf8' });
    assert.equal(result.status, 0); assert.equal(JSON.parse(result.stdout).status, 'CERTIFICATES_VALID');
    const bad = spawnSync(process.execPath, [script, 'status', '--directory', f.directory, '--directory', f.directory], { encoding: 'utf8' });
    assert.equal(bad.status, 1); assert.deepEqual(JSON.parse(bad.stdout), { status: 'REJECTED', code: 'USAGE' });
    assert.equal(bad.stderr, '');
});
