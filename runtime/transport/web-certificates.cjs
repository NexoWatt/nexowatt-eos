'use strict';
// Device-specific HTTPS identity. Root CA key is retained root-only for local
// renewal; it is never copied into the runtime account, database or delivery ZIP.
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const tls = require('node:tls');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { rootOwned } = require('../release/installed-check.cjs');
const { readFileLimited } = require('../release/bundle.cjs');
const SCOPES = Object.freeze(['admin', 'ui']);
const fail = code => { throw Object.assign(new Error(code), { code }); };
function normalizeHosts(hosts, normalized = false) {
    // At most 24 caller hosts plus the three fixed loopback identities. Accept
    // the normalized 27-entry manifest again without rejecting our own output.
    if (!Array.isArray(hosts) || hosts.length < 1 || hosts.length > (normalized ? 27 : 24)) fail('WEB_CERTIFICATE_HOSTS');
    const values = new Set(['localhost', '127.0.0.1', '::1']);
    for (const value of hosts) {
        if (typeof value !== 'string' || value.length > 253 || value !== value.trim() ||
            !net.isIP(value) && !/^(?=.{1,253}$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(value)) fail('WEB_CERTIFICATE_HOSTS');
        values.add(value.toLowerCase());
    }
    if (values.size > 27) fail('WEB_CERTIFICATE_HOSTS');
    return [...values].sort();
}
function execute(args) {
    const result = spawnSync('/usr/bin/openssl', args, { shell: false, timeout: 15000, maxBuffer: 65536, stdio: ['ignore', 'pipe', 'pipe'] });
    if (result.error || result.status !== 0) fail('WEB_CERTIFICATE_OPENSSL');
}
function write(file, value, mode = 0o600) {
    const fd = fs.openSync(file, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, mode);
    try { fs.writeFileSync(fd, value); fs.fchmodSync(fd, mode); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function certificate(directory, scope, hosts) {
    const privateDirectory = path.join(directory, 'authority');
    const key = path.join(directory, `${scope}.key`), cert = path.join(directory, `${scope}.crt`);
    const request = path.join(privateDirectory, `${scope}.csr`), extensions = path.join(privateDirectory, `${scope}.ext`);
    write(extensions, `basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature\nextendedKeyUsage=serverAuth\nsubjectAltName=${hosts.map(host => `${net.isIP(host) ? 'IP' : 'DNS'}:${host}`).join(',')}\n`);
    execute(['genpkey', '-algorithm', 'EC', '-pkeyopt', 'ec_paramgen_curve:P-256', '-out', key]); fs.chmodSync(key, 0o600);
    execute(['req', '-new', '-key', key, '-subj', `/CN=EOS ${scope}`, '-out', request]);
    execute(['x509', '-req', '-in', request, '-CA', path.join(directory, 'ca.crt'), '-CAkey', path.join(privateDirectory, 'ca.key'),
        '-set_serial', `0x${crypto.randomBytes(16).toString('hex')}`, '-days', '90', '-sha256', '-extfile', extensions, '-out', cert]);
    fs.chmodSync(cert, 0o644); fs.unlinkSync(request); fs.unlinkSync(extensions);
    for (const file of [key, cert]) {
        const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
        try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    }
}
function inspectWeb({ directory, now = Date.now(), allowExpiredLeaves = false }) {
    if (!Number.isFinite(now) || typeof allowExpiredLeaves !== 'boolean') fail('WEB_CERTIFICATE_TIME');
    rootOwned(directory);
    rootOwned(path.join(directory, 'manifest.json'));
    const manifest = JSON.parse(readFileLimited(path.join(directory, 'manifest.json'), 16384).bytes);
    if (manifest.profile !== 'eos-web-tls13-v1' || manifest.version !== 1 ||
        JSON.stringify(normalizeHosts(manifest.hosts, true)) !== JSON.stringify(manifest.hosts)) fail('WEB_CERTIFICATE_MANIFEST');
    rootOwned(path.join(directory, 'ca.crt'));
    const ca = new crypto.X509Certificate(readFileLimited(path.join(directory, 'ca.crt'), 16384).bytes);
    if (!ca.ca || !ca.verify(ca.publicKey) || ca.publicKey.asymmetricKeyType !== 'ec' ||
        ca.publicKey.asymmetricKeyDetails?.namedCurve !== 'prime256v1' || now < Date.parse(ca.validFrom) || now >= Date.parse(ca.validTo)) fail('WEB_CERTIFICATE_CA');
    const authority = path.join(directory, 'authority'), privateFile = path.join(authority, 'ca.key');
    rootOwned(authority); rootOwned(privateFile);
    if ((fs.statSync(authority).mode & 0o077) || (fs.statSync(privateFile).mode & 0o077)) fail('WEB_CERTIFICATE_CA_KEY_PERMISSIONS');
    if (!ca.checkPrivateKey(crypto.createPrivateKey(readFileLimited(privateFile, 16384).bytes))) fail('WEB_CERTIFICATE_CA_KEY_MISMATCH');
    const expires = []; let leavesValid = true;
    for (const scope of SCOPES) {
        for (const extension of ['key', 'crt']) rootOwned(path.join(directory, `${scope}.${extension}`));
        const keyfile = readFileLimited(path.join(directory, `${scope}.key`), 16384);
        if (keyfile.mode & 0o037) fail('WEB_CERTIFICATE_KEY_PERMISSIONS');
        const key = crypto.createPrivateKey(keyfile.bytes);
        const cert = new crypto.X509Certificate(readFileLimited(path.join(directory, `${scope}.crt`), 16384).bytes);
        if (cert.ca || key.asymmetricKeyType !== 'ec' || key.asymmetricKeyDetails.namedCurve !== 'prime256v1' ||
            !cert.checkPrivateKey(key) || !cert.verify(ca.publicKey) || !cert.checkIssued(ca) || !cert.keyUsage?.includes('1.3.6.1.5.5.7.3.1')) fail('WEB_CERTIFICATE_INVALID');
        if (now < Date.parse(cert.validFrom) || now >= Date.parse(cert.validTo)) {
            leavesValid = false;
            if (!allowExpiredLeaves) fail('WEB_CERTIFICATE_INVALID');
        }
        for (const host of manifest.hosts) if (!(net.isIP(host) ? cert.checkIP(host) : cert.checkHost(host, { wildcards: false }))) fail('WEB_CERTIFICATE_SAN');
        expires.push({ scope, expiresAt: new Date(cert.validTo).toISOString(), daysRemaining: Math.floor((Date.parse(cert.validTo) - now) / 86400000), fingerprint256: cert.fingerprint256 });
    }
    const caDaysRemaining = Math.floor((Date.parse(ca.validTo) - now) / 86400000);
    return { profile: manifest.profile, status: !leavesValid ? 'INVALID' : caDaysRemaining <= 90 ? 'CA_RENEWAL_REQUIRED' : expires.some(row => row.daysRemaining <= 30) ? 'RENEWAL_REQUIRED' : 'VALID',
        caFingerprint256: ca.fingerprint256, caExpiresAt: new Date(ca.validTo).toISOString(), caDaysRemaining,
        hosts: manifest.hosts, certificates: expires };
}
function prepareWebRenewal({ directory, destination, now = Date.now() }) {
    if (process.getuid?.() !== 0) fail('WEB_CERTIFICATE_ROOT_REQUIRED');
    const previous = inspectWeb({ directory, now, allowExpiredLeaves: true });
    if (previous.caDaysRemaining <= 90) fail('WEB_CERTIFICATE_CA_ROTATION_REQUIRED');
    const authority = path.join(directory, 'authority'), caKey = path.join(authority, 'ca.key');
    rootOwned(authority); rootOwned(caKey);
    if ((fs.statSync(authority).mode & 0o077) || (fs.statSync(caKey).mode & 0o077)) fail('WEB_CERTIFICATE_CA_KEY_PERMISSIONS');
    const ca = new crypto.X509Certificate(readFileLimited(path.join(directory, 'ca.crt'), 16384).bytes);
    if (!ca.checkPrivateKey(crypto.createPrivateKey(readFileLimited(caKey, 16384).bytes))) fail('WEB_CERTIFICATE_CA_KEY_MISMATCH');
    if (typeof destination !== 'string' || !path.isAbsolute(destination) || path.resolve(destination) !== destination ||
        destination === directory || destination.startsWith(directory + path.sep)) fail('WEB_CERTIFICATE_PATH');
    rootOwned(path.dirname(destination)); fs.mkdirSync(destination, { mode: 0o700 });
    try {
        fs.mkdirSync(path.join(destination, 'authority'), { mode: 0o700 });
        write(path.join(destination, 'authority/ca.key'), readFileLimited(caKey, 16384).bytes);
        write(path.join(destination, 'ca.crt'), readFileLimited(path.join(directory, 'ca.crt'), 16384).bytes, 0o644);
        for (const scope of SCOPES) certificate(destination, scope, previous.hosts);
        const manifest = JSON.parse(readFileLimited(path.join(directory, 'manifest.json'), 16384).bytes);
        manifest.renewedAt = new Date().toISOString();
        write(path.join(destination, 'manifest.json'), JSON.stringify(manifest) + '\n', 0o644);
        for (const relative of ['', 'admin.key', 'ui.key', 'admin.crt', 'ui.crt', 'ca.crt', 'manifest.json']) {
            const st = fs.lstatSync(path.join(directory, relative));
            fs.chownSync(path.join(destination, relative), 0, st.gid); fs.chmodSync(path.join(destination, relative), st.mode & 0o777);
        }
        const result = inspectWeb({ directory: destination });
        for (const relative of ['authority', '']) {
            const fd = fs.openSync(path.join(destination, relative), fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
            try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
        }
        return { status: 'WEB_RENEWAL_PREPARED', caFingerprint256: result.caFingerprint256, trustAnchorPreserved: true };
    } catch (error) { fs.rmSync(destination, { recursive: true, force: true }); throw error; }
}
function provisionWeb({ directory, hosts }) {
    if (process.getuid?.() !== 0) fail('WEB_CERTIFICATE_ROOT_REQUIRED');
    hosts = normalizeHosts(hosts);
    if (typeof directory !== 'string' || !path.isAbsolute(directory) || path.resolve(directory) !== directory) fail('WEB_CERTIFICATE_PATH');
    rootOwned(path.dirname(directory)); fs.mkdirSync(directory, { mode: 0o700 });
    try {
        const authority = path.join(directory, 'authority'); fs.mkdirSync(authority, { mode: 0o700 });
        const caKey = path.join(authority, 'ca.key');
        execute(['genpkey', '-algorithm', 'EC', '-pkeyopt', 'ec_paramgen_curve:P-256', '-out', caKey]); fs.chmodSync(caKey, 0o600);
        execute(['req', '-new', '-x509', '-key', caKey, '-sha256', '-days', '3650', '-subj', '/CN=NexoWatt EOS local HTTPS CA',
            '-addext', 'basicConstraints=critical,CA:TRUE,pathlen:0', '-addext', 'keyUsage=critical,keyCertSign,cRLSign', '-out', path.join(directory, 'ca.crt')]);
        fs.chmodSync(path.join(directory, 'ca.crt'), 0o644);
        for (const scope of SCOPES) certificate(directory, scope, hosts);
        write(path.join(directory, 'manifest.json'), JSON.stringify({ profile: 'eos-web-tls13-v1', version: 1, hosts,
            createdAt: new Date().toISOString(), leafDays: 90, authorityPrivate: 'authority/ca.key' }) + '\n', 0o644);
        fs.chmodSync(directory, 0o755);
        return inspectWeb({ directory });
    } catch (error) { fs.rmSync(directory, { recursive: true, force: true }); fail(/^WEB_CERTIFICATE_[A-Z_]+$/.test(error.code || '') ? error.code : 'WEB_CERTIFICATE_FAILED'); }
}
async function probeWeb({ directory, ports = { admin: 8081, ui: 8188 } }) {
    const status = inspectWeb({ directory });
    if (!ports || Object.keys(ports).sort().join(',') !== 'admin,ui' ||
        SCOPES.some(scope => !Number.isInteger(ports[scope]) || ports[scope] < 1024 || ports[scope] > 65535)) fail('WEB_CERTIFICATE_PROBE_PORTS');
    const ca = readFileLimited(path.join(directory, 'ca.crt'), 16384).bytes;
    await Promise.all(SCOPES.map(scope => new Promise((resolve, reject) => {
        const expected = status.certificates.find(row => row.scope === scope).fingerprint256;
        const socket = tls.connect({ host: '127.0.0.1', port: ports[scope], ca, servername: 'localhost', rejectUnauthorized: true,
            minVersion: 'TLSv1.3', maxVersion: 'TLSv1.3' });
        let done = false;
        const finish = code => { if (done) return; done = true; clearTimeout(timer); socket.destroy(); code ? reject(Object.assign(new Error(code), { code })) : resolve(); };
        const timer = setTimeout(() => finish('WEB_CERTIFICATE_PROBE_TIMEOUT'), 5000);
        socket.once('error', () => finish('WEB_CERTIFICATE_PROBE_REJECTED'));
        socket.once('end', () => finish('WEB_CERTIFICATE_PROBE_REJECTED'));
        socket.once('secureConnect', () => finish(!socket.authorized || socket.getProtocol() !== 'TLSv1.3' ||
            socket.getPeerCertificate().fingerprint256 !== expected ? 'WEB_CERTIFICATE_PROBE_IDENTITY' : null));
    })));
    return { status: 'WEB_TLS_IDENTITIES_VERIFIED', peerVerified: true, tls: 'TLSv1.3' };
}
module.exports = { SCOPES, normalizeHosts, provisionWeb, inspectWeb, prepareWebRenewal, probeWeb };
