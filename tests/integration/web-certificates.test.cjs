'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const tls = require('node:tls');
const crypto = require('node:crypto');
const { normalizeHosts, provisionWeb, inspectWeb } = require('../../runtime/transport/web-certificates.cjs');
let root, directory;
before(() => { root = fs.mkdtempSync('/root/eos-web-fixture-'); directory = path.join(root, 'web'); provisionWeb({ directory, hosts: ['eos.test', '192.0.2.10'] }); });
after(() => fs.rmSync(root, { recursive: true, force: true }));
test('unique local CA and distinct per-listener keys verify SANs', () => {
    const report = inspectWeb({ directory }); assert.equal(report.status, 'VALID');
    assert.equal(report.certificates.length, 2);
    assert.notEqual(report.certificates[0].fingerprint256, report.certificates[1].fingerprint256);
    assert.equal(fs.statSync(path.join(directory, 'authority/ca.key')).mode & 0o777, 0o600);
    assert.equal(fs.statSync(path.join(directory, 'authority')).mode & 0o777, 0o700);
    assert.equal(fs.readdirSync(path.join(directory, 'authority')).join(','), 'ca.key');
});
for (const hosts of [[], ['a\nDNS:evil'], ['*.example.com'], ['bad/name'], ['-evil'], ['x'.repeat(254)], new Array(25).fill('eos.test'), ['  host'], [null]]) {
    test(`rejects invalid SAN input ${JSON.stringify(hosts).slice(0,24)}`, () => assert.throws(() => normalizeHosts(hosts), /WEB_CERTIFICATE_HOSTS/));
}
test('never overwrites an existing certificate installation', () => assert.throws(() => provisionWeb({ directory, hosts: ['eos.test'] }), /EEXIST/));
test('warning before expiry and rejection after expiry', () => {
    const cert = new crypto.X509Certificate(fs.readFileSync(path.join(directory, 'admin.crt')));
    assert.equal(inspectWeb({ directory, now: Date.parse(cert.validTo) - 20 * 86400000 }).status, 'RENEWAL_REQUIRED');
    assert.throws(() => inspectWeb({ directory, now: Date.parse(cert.validTo) + 1 }), /WEB_CERTIFICATE_INVALID/);
});
test('TLS1.3 with trusted SAN succeeds; TLS1.2 rejected over real socket', async () => {
    const server = tls.createServer({ cert: fs.readFileSync(path.join(directory, 'admin.crt')), key: fs.readFileSync(path.join(directory, 'admin.key')),
        minVersion: 'TLSv1.3', maxVersion: 'TLSv1.3' }, socket => socket.end());
    server.on('tlsClientError', () => {});
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const options = { port: server.address().port, host: '127.0.0.1', servername: 'eos.test', ca: fs.readFileSync(path.join(directory, 'ca.crt')) };
    async function connect(extra) { return new Promise((resolve, reject) => {
        const socket = tls.connect({ ...options, ...extra }); const timer = setTimeout(() => { socket.destroy(); reject(new Error('timeout')); }, 2000);
        socket.once('error', error => { clearTimeout(timer); socket.destroy(); reject(error); });
        socket.once('secureConnect', () => { clearTimeout(timer); const protocol = socket.getProtocol(); socket.destroy(); resolve(protocol); });
    }); }
    try { assert.equal(await connect({ minVersion: 'TLSv1.3' }), 'TLSv1.3'); await assert.rejects(connect({ maxVersion: 'TLSv1.2' })); await assert.rejects(connect({ servername: 'wrong.test' })); }
    finally { await new Promise(resolve => server.close(resolve)); }
});
test('world-readable private leaf key rejected', () => {
    const file = path.join(directory, 'ui.key'); fs.chmodSync(file, 0o644);
    try { assert.throws(() => inspectWeb({ directory }), /WEB_CERTIFICATE_KEY_PERMISSIONS/); } finally { fs.chmodSync(file, 0o600); }
});
