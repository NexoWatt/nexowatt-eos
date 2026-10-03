'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const https = require('node:https');
const { execFileSync } = require('node:child_process');
const storage = require('../../runtime/onboarding/state.cjs');
const policy = require('../../runtime/onboarding/policy.cjs');
const { createSetupServer, validateTls, SESSION_TTL } = require('../../runtime/onboarding/server.cjs');
const releaseId = 'a'.repeat(64), origin = 'https://localhost:8443';
const hashed = `pbkdf2$600000$${'ab'.repeat(256)}$${'12'.repeat(16)}`;
const { settings, license, configuredSettings } = require('./fixtures.cjs');
const licenseContext = {uuid:'12345678-1234-1234-1234-123456789abc', publicKeys:{}, core:require('../../components/admin/src/lib/eosLicenseCore.js')};
const password = 'Individuelles Testpasswort 2026!';
let root, tls;
before(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-onboarding-test-'));
    const exe = process.platform === 'win32' ? 'C:\\Program Files\\Git\\usr\\bin\\openssl.exe' : 'openssl';
    const run = args => execFileSync(exe, args, { cwd: root, stdio: 'ignore', timeout: 15000 });
    run(['req', '-new', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:P-256', '-nodes', '-days', '2',
        '-keyout', 'ca.key', '-out', 'ca.crt', '-subj', '/CN=EOS setup test CA', '-addext', 'basicConstraints=critical,CA:TRUE']);
    run(['req', '-new', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:P-256', '-nodes', '-keyout', 'server.key', '-out', 'server.csr', '-subj', '/CN=localhost']);
    fs.writeFileSync(path.join(root, 'extensions'), 'basicConstraints=critical,CA:FALSE\nkeyUsage=digitalSignature\nextendedKeyUsage=serverAuth\nsubjectAltName=DNS:localhost,IP:127.0.0.1\n');
    run(['x509', '-req', '-in', 'server.csr', '-CA', 'ca.crt', '-CAkey', 'ca.key', '-set_serial', '1', '-days', '2', '-extfile', 'extensions', '-out', 'server.crt']);
    tls = { ca: fs.readFileSync(path.join(root, 'ca.crt')), cert: fs.readFileSync(path.join(root, 'server.crt')), key: fs.readFileSync(path.join(root, 'server.key')) };
});
after(() => { if (root) fs.rmSync(root, { recursive: true, force: true }); });
async function fixture(t, options = {}) {
    const directory = fs.mkdtempSync(path.join(root, 'state-')); fs.chmodSync(directory, 0o700);
    let clock = Date.now();
    const issued = storage.prepare({ directory, releaseId, origin, now: clock });
    const completionFile = path.join(root, path.basename(directory) + '-complete.json');
    const config = { stateDirectory: directory, releaseId, origin, completionFile, tls, licenseContext: options.licenseContext || licenseContext, now: () => clock,
        hashPassword: options.realHash ? undefined : options.hashPassword || (async () => hashed) };
    let server = createSetupServer(config);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
    async function request(url, body, headers = {}, client = {}) {
        return new Promise((resolve, reject) => {
            const bytes = body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body);
            const req = https.request({ host: '127.0.0.1', port: server.address().port, servername: 'localhost', ca: tls.ca,
                rejectUnauthorized: true, minVersion: 'TLSv1.3', maxVersion: 'TLSv1.3', path: url, method: bytes === undefined ? 'GET' : 'POST',
                agent: false, headers: { host: 'localhost:8443', ...(bytes === undefined ? {} : {
                    origin, 'content-type': 'application/json', 'x-eos-setup': '1' }), ...headers }, ...client }, response => {
                const chunks = [];
                response.on('data', chunk => chunks.push(chunk)); response.on('error', reject);
                response.on('end', () => {
                    const text = Buffer.concat(chunks).toString(); let data; try { data = JSON.parse(text); } catch { data = text; }
                    resolve({ status: response.statusCode, headers: response.headers, data, protocol: response.socket?.getProtocol() });
                });
            }); req.on('error', reject); req.end(bytes);
        });
    }
    async function claim() {
        const result = await request('/api/claim', { code: issued.code }); assert.equal(result.status, 200);
        return { cookie: result.headers['set-cookie'][0].split(';')[0], 'x-eos-csrf': result.data.csrf };
    }
    async function restart() {
        server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
        server = createSetupServer(config); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    }
    return { directory, issued, request, claim, completionFile, restart, now: () => clock, advance: ms => { clock += ms; } };
}
test('verified TLS only; endpoint validates CA, hostname, expiry and trust', async t => {
    const f = await fixture(t);
    assert.equal((await f.request('/')).status, 200);
    await assert.rejects(f.request('/', undefined, {}, { ca: undefined }), /certificate|verify|issuer/i);
    await assert.rejects(f.request('/', undefined, {}, { servername: 'wrong.test' }), /hostname|altnames/i);
    await assert.rejects(f.request('/', undefined, {}, { minVersion: 'TLSv1.2', maxVersion: 'TLSv1.2' }), /protocol|alert/i);
    assert.throws(() => validateTls(tls, 'https://wrong.test:8443'), /SETUP_TLS/);
    assert.throws(() => validateTls(tls, origin, Date.now() + 3 * 86400000), /SETUP_TLS/);
});
function signedLicense(now, overrides = {}, key) {
    const crypto = require('node:crypto'); const issuer = key || crypto.generateKeyPairSync('ed25519');
    const claims = { v: 2, kid: 'fixture', licenseId: 'fixture-only', uuid: licenseContext.uuid, edition: 'home',
        issuedAt: now - 1000, notBefore: now - 1000, expiresAt: now + 60000,
        adapters: ['nexowatt-ui', 'nexowatt-devices'], limits: { chargePoints: 3, batteries: 2 }, ...overrides };
    const message = 'NWL2.' + Buffer.from(JSON.stringify(claims)).toString('base64url');
    return { token: message + '.' + crypto.sign(null, Buffer.from(message), issuer.privateKey).toString('base64url'),
        context: { ...licenseContext, publicKeys: { fixture: issuer.publicKey.export({ type: 'spki', format: 'pem' }).toString() } }, issuer };
}
test('catalog UUID licenses this device before password setup and stays private to the live claimed session', async t => {
    const crypto = require('node:crypto');
    const issuer = crypto.generateKeyPairSync('ed25519');
    const context = { ...licenseContext, uuid: 'nw' + licenseContext.uuid,
        publicKeys: { fixture: issuer.publicKey.export({ type: 'spki', format: 'pem' }).toString() } };
    let passwordDerivations = 0;
    const f = await fixture(t, { licenseContext: context, hashPassword: async () => { passwordDerivations++; return hashed; } });
    const anonymous = await f.request('/api/catalog');
    assert.equal(anonymous.status, 403); assert.deepEqual(anonymous.data, { code: 'SETUP_SESSION' });
    assert.equal(JSON.stringify(anonymous.data).includes(context.uuid), false);

    const auth = await f.claim();
    const catalog = await f.request('/api/catalog', undefined, { cookie: auth.cookie });
    assert.equal(catalog.status, 200); assert.equal(catalog.data.uuid, context.uuid);
    assert.equal(catalog.headers['cache-control'], 'no-store');
    // Construct the first submitted token from the UUID actually returned over
    // authenticated HTTPS. No password, finish request or DB account is needed.
    const issued = signedLicense(f.now(), { uuid: catalog.data.uuid }, issuer);
    const verified = await f.request('/api/license/verify', { token: issued.token }, auth);
    assert.equal(verified.status, 200); assert.equal(verified.data.valid, true);
    assert.equal(verified.data.uuid, catalog.data.uuid);
    assert.equal(JSON.stringify(verified.data).includes(issued.token), false);
    // The vendor prefix is part of the identity, not a display-only decoration.
    const otherDevice = signedLicense(f.now(), { uuid: licenseContext.uuid }, issuer);
    const rejected = await f.request('/api/license/verify', { token: otherDevice.token }, auth);
    assert.equal(rejected.status, 400); assert.deepEqual(rejected.data, { code: 'SETUP_INPUT_REJECTED' });

    f.advance(SESSION_TTL + 1);
    const expired = await f.request('/api/catalog', undefined, { cookie: auth.cookie });
    assert.equal(expired.status, 403); assert.deepEqual(expired.data, { code: 'SETUP_SESSION' });
    assert.equal(JSON.stringify(expired.data).includes(context.uuid), false);
    assert.equal(passwordDerivations, 0); assert.equal(storage.readState(f.directory).state, 'claimed');
    assert.equal(fs.existsSync(path.join(f.directory, 'handoff.json')), false);
    assert.equal(fs.existsSync(path.join(f.directory, 'commit.lock')), false);
});
test('HTTPS configuration and signed license are checked against installed identity/trust before one private handoff', async t => {
    const signed = signedLicense(Date.now()); const f = await fixture(t, { licenseContext: signed.context });
    assert.equal((await f.request('/api/catalog')).status, 403);
    assert.equal((await f.request('/api/license/verify', { token: signed.token })).status, 403);
    const auth = await f.claim();
    const catalog = await f.request('/api/catalog', undefined, { cookie: auth.cookie });
    assert.equal(catalog.data.uuid, licenseContext.uuid); assert.equal(catalog.data.templates.length, 195);
    const verified = await f.request('/api/license/verify', { token: signed.token }, auth);
    assert.equal(verified.status, 200); assert.equal(verified.data.edition, 'home');
    assert.equal(JSON.stringify(verified.data).includes(signed.token), false);
    for (const attack of [{ token: signed.token, publicKeys: signed.context.publicKeys },
        { token: signed.token, uuid: licenseContext.uuid }, { token: signed.token.slice(0, -8) + 'tampered' }])
        assert.equal((await f.request('/api/license/verify', attack, auth)).status, 400);
    const candidate = { settings: { ...configuredSettings, licenseMode: 'verified' }, license: { mode: 'activate', token: signed.token } };
    const checked = await f.request('/api/configuration/check', candidate, auth);
    assert.equal(checked.status, 200); assert.equal(checked.data.plantConfigurationComplete, true);
    assert.equal(checked.data.liveMeasurementsVerified, false); assert.equal(checked.data.physicalControlEnabled, false);
    assert.equal(storage.readState(f.directory).state, 'claimed'); assert.equal(fs.existsSync(path.join(f.directory, 'handoff.json')), false);
    assert.equal((await f.request('/api/finish', { ...candidate, password, passwordRepeat: password }, auth)).status, 202);
    const handoff = storage.readHandoff(f.directory, releaseId); assert.equal(handoff.schemaVersion, 2);
    assert.deepEqual(handoff.settings, candidate.settings); assert.equal(handoff.license.token, signed.token);
    assert.equal(JSON.stringify(handoff.settings).includes(signed.token), false);
    assert.equal(fs.readFileSync(path.join(f.directory, 'state.json'), 'utf8').includes(signed.token), false);
});
test('license rechecked at finish rejects expiry, wrong device, unknown issuer, and inadequate capacity before KDF', async t => {
    const signed = signedLicense(Date.now()); let hashes = 0;
    const f = await fixture(t, { licenseContext: signed.context, hashPassword: async () => { hashes++; return hashed; } }); const auth = await f.claim();
    const valid = { settings: { ...configuredSettings, licenseMode: 'verified' }, license: { mode: 'activate', token: signed.token }, password, passwordRepeat: password };
    for (const candidate of [signedLicense(f.now(), { uuid: '87654321-1234-1234-1234-123456789abc' }, signed.issuer),
        signedLicense(f.now()), signedLicense(f.now(), { limits: { chargePoints: 3, batteries: 0 } }, signed.issuer),
        signedLicense(f.now(), { adapters: ['nexowatt-ui'] }, signed.issuer)]) {
        assert.equal((await f.request('/api/finish', { ...valid, license: { mode: 'activate', token: candidate.token } }, auth)).status, 400);
    }
    assert.equal((await f.request('/api/license/verify', { token: signed.token }, auth)).status, 200);
    f.advance(60001);
    assert.equal((await f.request('/api/finish', valid, auth)).status, 400);
    assert.equal(hashes, 0); assert.equal(storage.readState(f.directory).state, 'claimed');
});
test('possession is required; wrong, expired, reused and missing codes fail', async t => {
    const f = await fixture(t);
    assert.equal((await f.request('/api/claim', {})).status, 400);
    assert.equal((await f.request('/api/claim', { code: 'x'.repeat(32) })).status, 403);
    const auth = await f.claim();
    assert.match(auth.cookie, /^__Host-eos-setup=/);
    assert.equal((await f.request('/api/claim', { code: f.issued.code })).status, 403);
    const other = await fixture(t); other.advance(storage.CODE_TTL + 1);
    assert.equal((await other.request('/api/claim', { code: other.issued.code })).status, 403);
});
test('persistent attempt limit survives reboot', async t => {
    const f = await fixture(t);
    for (let i = 0; i < 8; i++) assert.equal((await f.request('/api/claim', { code: 'x'.repeat(32) })).status, 403);
    await f.restart(); assert.equal((await f.request('/api/claim', { code: f.issued.code })).status, 403);
    assert.equal(storage.readState(f.directory).attempts, 8);
});
test('real HTTPS frontend password becomes a verified PBKDF2 credential with one bounded derivation', async t => {
    const crypto = require('node:crypto');
    const { promisify } = require('node:util');
    const f = await fixture(t, { realHash: true });
    const auth = await f.claim();
    assert.equal((await f.request('/api/finish', { password, passwordRepeat: password, settings, license }, auth)).status, 202);
    const value = storage.readHandoff(f.directory, releaseId).passwordHash;
    const [, iterations, key, salt] = value.split('$');
    assert.equal(iterations, '600000');
    const verified = await promisify(crypto.pbkdf2)(password, salt, Number(iterations), 256, 'sha256');
    assert.equal(verified.toString('hex'), key);
    assert.notEqual(value, hashed);
});
test('host, origin, CSRF, proxy, URL and role manipulation are rejected', async t => {
    const f = await fixture(t);
    for (const headers of [{ host: 'attacker.test:8443' }, { 'x-forwarded-host': 'localhost:8443' }]) {
        assert.equal((await f.request('/api/claim', { code: f.issued.code }, headers)).status, 421);
    }
    for (const headers of [{ origin: 'https://attacker.test' }, { origin: '' }, { 'x-eos-setup': '' }, { 'sec-fetch-site': 'cross-site' }]) {
        assert.equal((await f.request('/api/claim', { code: f.issued.code }, headers)).status, 403);
    }
    assert.equal((await f.request('/?code=' + f.issued.code)).status, 421);
    const auth = await f.claim();
    const valid = { password, passwordRepeat: password, settings, license };
    assert.equal((await f.request('/api/finish', valid, { cookie: auth.cookie })).status, 403);
    assert.equal((await f.request('/api/finish', valid, { 'x-eos-csrf': auth['x-eos-csrf'] })).status, 403);
    assert.equal((await f.request('/api/finish', { ...valid, role: 'administrator' }, auth)).status, 400);
    assert.equal((await f.request('/api/finish', { ...valid, settings: { ...settings, deviceMode: 'active' } }, auth)).status, 400);
    assert.equal((await f.request('/api/finish', { ...valid, settings: { ...settings, licenseTrust: {} } }, auth)).status, 400);
});
test('session cookie, cache and content policy are restrictive; password hash handoff contains no secrets', async t => {
    const f = await fixture(t);
    const claim = await f.request('/api/claim', { code: f.issued.code });
    assert.match(claim.headers['set-cookie'][0], /Secure; HttpOnly; SameSite=Strict; Max-Age=900/);
    const auth = { cookie: claim.headers['set-cookie'][0].split(';')[0], 'x-eos-csrf': claim.data.csrf };
    const result = await f.request('/api/finish', { password, passwordRepeat: password, settings, license }, auth);
    assert.equal(result.status, 202); assert.equal(result.headers['cache-control'], 'no-store');
    assert.match(result.headers['content-security-policy'], /frame-ancestors 'none'/);
    const handoff = storage.readHandoff(f.directory, releaseId);
    assert.equal(handoff.passwordHash, hashed); assert.deepEqual(handoff.settings, settings);
    const persisted = fs.readdirSync(f.directory).filter(name => name.endsWith('.json')).map(name => fs.readFileSync(path.join(f.directory, name), 'utf8')).join('');
    for (const secret of [password, f.issued.code, auth.cookie.split('=')[1], auth['x-eos-csrf']]) assert.equal(persisted.includes(secret), false);
    assert.equal((await f.request('/api/finish', { password, passwordRepeat: password, settings, license }, auth)).status, 403);
    fs.writeFileSync(f.completionFile, JSON.stringify({ schemaVersion: 1 }));
    assert.equal((await f.request('/')).status, 410);
    assert.equal((await f.request('/api/claim', { code: f.issued.code })).status, 410);
    assert.throws(() => storage.readHandoff(f.directory, 'b'.repeat(64)), /SETUP_HANDOFF/);
});
test('parallel finalization derives once and only one handoff wins', async t => {
    let count = 0;
    const f = await fixture(t, { hashPassword: async () => { count++; await new Promise(resolve => setTimeout(resolve, 80)); return hashed; } });
    const auth = await f.claim(); const input = { password, passwordRepeat: password, settings, license };
    const results = await Promise.all([f.request('/api/finish', input, auth), f.request('/api/finish', input, auth)]);
    assert.deepEqual(results.map(r => r.status).sort(), [202, 409]); assert.equal(count, 1);
});
test('abort during commit and restart retain closed state with no handoff or administrative access', async t => {
    const f = await fixture(t, { hashPassword: async () => { throw new Error('synthetic failure with secrets'); } });
    const auth = await f.claim(); const input = { password, passwordRepeat: password, settings, license };
    const failed = await f.request('/api/finish', input, auth);
    assert.equal(failed.status, 503); assert.deepEqual(failed.data, { code: 'SETUP_UNAVAILABLE' });
    assert.equal(storage.readState(f.directory).state, 'committing');
    assert.equal(fs.existsSync(path.join(f.directory, 'handoff.json')), false);
    await f.restart(); assert.equal((await f.request('/api/finish', input, auth)).status, 403);
    assert.throws(() => storage.reissue({ directory: f.directory, releaseId, origin }), /SETUP_REISSUE_BLOCKED/);
});
test('expired or restarted claimed session cannot finish; trusted local reissue revokes old cookie and code', async t => {
    const f = await fixture(t); const auth = await f.claim(); const input = { password, passwordRepeat: password, settings, license };
    f.advance(SESSION_TTL + 1); assert.equal((await f.request('/api/finish', input, auth)).status, 403);
    await f.restart(); assert.equal((await f.request('/api/finish', input, auth)).status, 403);
    const next = storage.reissue({ directory: f.directory, releaseId, origin, now: f.now() });
    assert.notEqual(next.setupId, f.issued.setupId);
    assert.equal((await f.request('/api/claim', { code: f.issued.code })).status, 403);
    assert.equal((await f.request('/api/claim', { code: next.code })).status, 200);
    assert.equal((await f.request('/api/finish', input, auth)).status, 403);
});
test('local reissue immediately revokes a still-valid live session and rollback does not extend it', async t => {
    const f = await fixture(t); const auth = await f.claim();
    assert.equal((await f.request('/api/session', undefined, { cookie: auth.cookie })).data.authenticated, true);
    const renewed = storage.reissue({ directory: f.directory, releaseId, origin, now: f.now() });
    assert.equal((await f.request('/api/session', undefined, { cookie: auth.cookie })).data.authenticated, false);
    const second = await f.request('/api/claim', { code: renewed.code }); assert.equal(second.status, 200);
    const cookie = second.headers['set-cookie'][0].split(';')[0];
    f.advance(-1000);
    assert.equal((await f.request('/api/session', undefined, { cookie })).data.authenticated, false);
});
test('body, request rate and settings bounds fail closed', async t => {
    const f = await fixture(t);
    assert.equal((await f.request('/api/claim', { code: 'x'.repeat(70000) })).status, 400);
    assert.equal((await f.request('/api/claim', '{invalid-json')).status, 400);
    for (let i = 0; i < 92; i++) await f.request('/api/session');
    assert.equal((await f.request('/api/session')).status, 429);
    for (const change of [{ siteName: '' }, { siteName: 'a'.repeat(121) }, { timeZone: 'Invalid/Nowhere' }, { safetyAcknowledged: false }, { language: 'xx' }]) {
        assert.throws(() => policy.validateSettings({ ...settings, ...change }));
    }
});
test('storage rejects replacement preparation, hardlinks, tampering and pending mutation locks', async t => {
    const f = await fixture(t);
    assert.throws(() => storage.prepare({ directory: f.directory, releaseId, origin }), /SETUP_ALREADY_PREPARED/);
    const unlock = storage.lock(f.directory);
    assert.throws(() => storage.reissue({ directory: f.directory, releaseId, origin })); unlock();
    const original = path.join(f.directory, 'state.json'); const link = path.join(f.directory, 'linked.json');
    fs.linkSync(original, link); assert.throws(() => storage.readState(f.directory), /SETUP_STORAGE/); fs.unlinkSync(link);
    storage.write(f.directory, 'state.json', { ...storage.readState(f.directory), state: 'open' });
    assert.equal((await f.request('/api/session')).status, 503);
});
