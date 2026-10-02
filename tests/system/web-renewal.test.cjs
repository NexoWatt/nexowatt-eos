'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const tls = require('node:tls');
const { provisionWeb, inspectWeb, prepareWebRenewal, probeWeb } = require('../../runtime/transport/web-certificates.cjs');
const { prepareRenewal, activateRenewal, recoverRenewal } = require('../../runtime/transport/web-renewal.cjs');
const root = fs.mkdtempSync('/root/eos-web-renewal-test-');
test.after(() => fs.rmSync(root, { recursive: true, force: true }));
function fixture(t, hosts = ['eos.test']) {
    const parent = fs.mkdtempSync(path.join(root, 'case-')); const directory = path.join(parent, 'web');
    provisionWeb({ directory, hosts });
    t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
    return { directory, parent, work: path.join(parent, '.eos-web-renewal') };
}
function hooksFor(extra = {}) { const calls = []; return { calls, hooks: {
    stop: async () => calls.push('stop'), start: async () => calls.push('start'), probe: async () => calls.push('probe'), ...extra,
} }; }
test('24 caller SANs plus three default loopbacks can be inspected and renewed', t => {
    const f = fixture(t, Array.from({ length: 24 }, (_, i) => `eos-${i}.test`));
    const before = inspectWeb(f); assert.equal(before.hosts.length, 27);
    const destination = path.join(f.parent, 'new'); prepareWebRenewal({ ...f, destination });
    assert.deepEqual(inspectWeb({ directory: destination }).hosts, before.hosts);
});
test('CA directory and key exposure are rejected; CA key must match public certificate', t => {
    const f = fixture(t); const authority = path.join(f.directory, 'authority'), file = path.join(authority, 'ca.key');
    fs.chmodSync(authority, 0o750); assert.throws(() => inspectWeb(f), /WEB_CERTIFICATE_CA_KEY_PERMISSIONS/); fs.chmodSync(authority, 0o700);
    fs.chmodSync(file, 0o640); assert.throws(() => inspectWeb(f), /WEB_CERTIFICATE_CA_KEY_PERMISSIONS/); fs.chmodSync(file, 0o600);
    fs.copyFileSync(path.join(f.directory, 'ui.key'), file); assert.throws(() => inspectWeb(f), /WEB_CERTIFICATE_CA_KEY_MISMATCH/);
});
test('leaf renewal retains exact browser trust and SANs while replacing leaf keys', async t => {
    const f = fixture(t); const before = inspectWeb(f); const originalCa = fs.readFileSync(path.join(f.directory, 'ca.crt'));
    const originalKey = fs.readFileSync(path.join(f.directory, 'admin.key')); const h = hooksFor();
    prepareRenewal(f); assert.equal(inspectWeb(f).certificates[0].fingerprint256, before.certificates[0].fingerprint256);
    const result = await activateRenewal(f, h.hooks); assert.equal(result.status, 'WEB_CERTIFICATES_RENEWED');
    assert.deepEqual(fs.readFileSync(path.join(f.directory, 'ca.crt')), originalCa);
    assert.notDeepEqual(fs.readFileSync(path.join(f.directory, 'admin.key')), originalKey);
    assert.deepEqual(inspectWeb(f).hosts, before.hosts); assert.deepEqual(h.calls, ['stop', 'start', 'probe']);
    assert.equal(fs.existsSync(f.work), false);
});
test('renewal can replace expired leaves without relaxing public inspection', t => {
    const f = fixture(t); const now = Date.now() + 91 * 86400000;
    assert.throws(() => inspectWeb({ ...f, now }), /WEB_CERTIFICATE_INVALID/);
    const destination = path.join(f.parent, 'fresh');
    assert.equal(prepareWebRenewal({ ...f, now, destination }).status, 'WEB_RENEWAL_PREPARED');
    assert.equal(inspectWeb({ directory: destination }).status, 'VALID');
});
test('renewal refuses CA with insufficient remaining lifetime', t => {
    const f = fixture(t); const status = inspectWeb(f); const now = Date.parse(status.caExpiresAt) - 89 * 86400000;
    assert.throws(() => prepareWebRenewal({ ...f, now, destination: path.join(f.parent, 'fresh') }), /WEB_CERTIFICATE_CA_ROTATION_REQUIRED/);
});
test('tampered stage fails before stopping any service', async t => {
    const f = fixture(t); prepareRenewal(f); fs.appendFileSync(path.join(f.work, 'next/manifest.json'), ' ');
    const h = hooksFor(); await assert.rejects(activateRenewal(f, h.hooks), /WEB_RENEWAL_PREPARED_CHANGED/); assert.deepEqual(h.calls, []);
});
test('failed new listener probe restores previous HTTPS leaf', async t => {
    const f = fixture(t); const before = inspectWeb(f); let probes = 0;
    prepareRenewal(f); const h = hooksFor({ probe: async () => { if (++probes === 1) throw new Error('fixture'); } });
    await assert.rejects(activateRenewal(f, h.hooks), /WEB_RENEWAL_FAILED_PREVIOUS_RESTORED/);
    assert.equal(inspectWeb(f).certificates[0].fingerprint256, before.certificates[0].fingerprint256);
    assert.equal(probes, 2); assert.equal(fs.existsSync(f.work), false);
});
for (const point of ['prepared', 'old-renamed', 'new-renamed']) test(`web interrupted ${point} is recoverable`, async t => {
    const f = fixture(t); const before = inspectWeb(f); prepareRenewal(f);
    if (point !== 'prepared') fs.renameSync(f.directory, path.join(f.work, 'previous'));
    if (point === 'new-renamed') fs.renameSync(path.join(f.work, 'next'), f.directory);
    assert.equal((await recoverRenewal(f, hooksFor().hooks)).status, 'PREVIOUS_WEB_CERTIFICATES_RESTORED');
    assert.equal(inspectWeb(f).certificates[0].fingerprint256, before.certificates[0].fingerprint256);
});
test('actual HTTPS TLS probe checks both exact deployed leaf identities after renewal', async t => {
    const f = fixture(t); prepareRenewal(f); await activateRenewal(f, hooksFor().hooks);
    const ports = {}; const servers = []; const sockets = new Set();
    for (const scope of ['admin', 'ui']) {
        const server = tls.createServer({ key: fs.readFileSync(path.join(f.directory, `${scope}.key`)),
            cert: fs.readFileSync(path.join(f.directory, `${scope}.crt`)), minVersion: 'TLSv1.3', maxVersion: 'TLSv1.3' }, socket => socket.resume());
        server.on('connection', socket => { sockets.add(socket); socket.on('error', () => {}); }); server.on('tlsClientError', () => {});
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); servers.push(server); ports[scope] = server.address().port;
    }
    t.after(async () => { for (const socket of sockets) socket.destroy(); await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve)))); });
    assert.equal((await probeWeb({ ...f, ports })).peerVerified, true);
    prepareRenewal(f); await activateRenewal(f, hooksFor().hooks);
    // Both old listener certs remain valid under the same CA, but they must not
    // be accepted as evidence that the new files were actually loaded.
    await assert.rejects(probeWeb({ ...f, ports }), /WEB_CERTIFICATE_PROBE_IDENTITY/);
});
test('web crash after durable commit confirms new leaf and never restores old leaf', async t => {
    const f = fixture(t); prepareRenewal(f);
    fs.renameSync(f.directory, path.join(f.work, 'previous')); fs.renameSync(path.join(f.work, 'next'), f.directory);
    const file = path.join(f.work, 'journal.json'), journal = JSON.parse(fs.readFileSync(file));
    journal.state = 'complete'; fs.writeFileSync(file, JSON.stringify(journal));
    const current = inspectWeb(f).certificates[0].fingerprint256;
    assert.equal((await recoverRenewal(f, hooksFor().hooks)).status, 'COMMITTED_WEB_CERTIFICATES_CONFIRMED');
    assert.equal(inspectWeb(f).certificates[0].fingerprint256, current);
});
