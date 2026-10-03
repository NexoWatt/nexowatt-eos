'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { sha256, readFileLimited } = require('../../runtime/release/bundle.cjs');
const { DELIVERY_DIRECTORY } = require('../../tools/system/install-from-checkout.cjs');
const { parseBootstrap, validateLicenseTrust, selectIPv4, openPossessionTty, main, safeFailure,
    formatSuccess, formatFailure } = require('../../tools/bootstrap/first-start.cjs');
const row = (address, extra = {}) => ({ address, family: 'IPv4', internal: false, ...extra });
const secretCode = 'ExamplePossessionCode_1234567890';
let certificateRoot, certificate;
before(() => {
    certificateRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-bootstrap-ca-'));
    const openssl = process.platform === 'win32' ? 'C:\\Program Files\\Git\\usr\\bin\\openssl.exe' : '/usr/bin/openssl';
    const result = spawnSync(openssl, ['req', '-new', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:P-256',
        '-nodes', '-days', '2', '-keyout', path.join(certificateRoot, 'ca.key'), '-out', path.join(certificateRoot, 'ca.crt'),
        '-subj', '/CN=Bootstrap fixture CA', '-addext', 'basicConstraints=critical,CA:TRUE'], { encoding: 'utf8', timeout: 15000, windowsHide: true });
    assert.equal(result.status, 0);
    certificate = fs.readFileSync(path.join(certificateRoot, 'ca.crt'));
});
after(() => fs.rmSync(certificateRoot, { recursive: true, force: true }));
function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-bootstrap-kit-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const pair = crypto.generateKeyPairSync('ed25519');
    const publicKey = pair.publicKey.export({ type: 'spki', format: 'pem' });
    const trust = Buffer.from(JSON.stringify({ fixture: publicKey }));
    const config = { schemaVersion: 1, releasePublicKeySha256: sha256(publicKey), licenseTrustSha256: sha256(trust) };
    fs.writeFileSync(path.join(root, 'bootstrap.json'), JSON.stringify(config));
    fs.writeFileSync(path.join(root, 'license-public-trust.json'), trust);
    fs.mkdirSync(path.join(root, DELIVERY_DIRECTORY), { recursive: true });
    fs.writeFileSync(path.join(root, DELIVERY_DIRECTORY, 'release-public.pem'), publicKey);
    const calls = [], ttyWrites = [], owned = []; let closed = 0;
    const dependencies = { root, platform: 'linux', uid: 0,
        // Explicit ownership/host fixtures: Windows is not a POSIX/TTY proof.
        ownerCheck: file => { owned.push(file); }, interfaces: { ethernet: [row('192.168.10.12')] }, sshConnection: '',
        openTty: () => { calls.push('tty-open'); return { write: text => ttyWrites.push(text), close: () => { closed++; } }; },
        read: (file, limit) => file === '/etc/nexowatt-eos/web/ca.crt' ? { bytes: Buffer.from(certificate), mode: 0o644 } :
            file === '/etc/nexowatt-eos/setup-code.txt' ? { bytes: Buffer.from(secretCode + '\n'), mode: 0o600 } : readFileLimited(file, limit),
        install: argv => { calls.push(argv); return { ok: true, installed: true, phase: 'HTTPS_FIRST_START_READY',
            setupOrigin: 'https://192.168.10.12:8443', physicalControlEnabled: false, releaseId: 'a'.repeat(64),
            secretFieldThatMustNeverEscape: secretCode }; },
    };
    return { root, config, pair, publicKey, trust, calls, ttyWrites, owned, dependencies, closed: () => closed,
        run: () => main([], dependencies) };
}
test('IP selection prefers a validated SSH local destination only when present on an active noninternal interface', () => {
    const interfaces = { ethernet: [row('192.168.1.2')], wifi: [row('10.0.0.3')] };
    assert.equal(selectIPv4(interfaces, '203.0.113.4 44000 10.0.0.3 22'), '10.0.0.3');
    assert.equal(selectIPv4(interfaces, '2001:db8::1 44000 192.168.1.2 22'), '192.168.1.2');
    for (const ssh of ['', '203.0.113.4 0 10.0.0.3 22', '203.0.113.4 44000 10.0.0.99 22',
        'untrusted 44000 10.0.0.3 22', '203.0.113.4 44000 10.0.0.3 65536', '203.0.113.4 44000 10.0.0.3 22 extra']) {
        assert.throws(() => selectIPv4(interfaces, ssh), { code: 'BOOTSTRAP_IPV4_AMBIGUOUS' });
    }
});
test('one distinct IPv4 is automatic; loopback, link-local, unspecified, multicast and IPv6 are ineligible', () => {
    assert.equal(selectIPv4({ a: [row('192.168.1.2')], b: [row('192.168.1.2')] }), '192.168.1.2');
    const excluded = ['0.0.0.0', '0.2.3.4', '127.0.0.1', '169.254.3.4', '224.0.0.1', '255.255.255.255', '::1'];
    assert.throws(() => selectIPv4({ a: excluded.map(address => row(address)), b: [row('10.0.0.3', { internal: true })] }),
        { code: 'BOOTSTRAP_IPV4_REQUIRED' });
});
test('bootstrap configuration accepts only exact pin fields and valid schema, never custom paths or secrets', () => {
    const good = { schemaVersion: 1, releasePublicKeySha256: 'a'.repeat(64), licenseTrustSha256: 'b'.repeat(64) };
    assert.deepEqual(parseBootstrap(Buffer.from(JSON.stringify(good))), good);
    for (const change of [{ schemaVersion: 2 }, { password: 'private fixture' }, { origin: 'https://attacker:8443' },
        { licenseTrustFile: '/tmp/key' }, { releasePublicKeySha256: 'latest' }, { licenseTrustSha256: 'B'.repeat(64) }])
        assert.throws(() => parseBootstrap(Buffer.from(JSON.stringify({ ...good, ...change }))), { code: 'BOOTSTRAP_CONFIG' });
    for (const input of ['null', '[]', '{', '{"password":"PRIVATE KEY"}', Buffer.from([0xff])])
        assert.throws(() => parseBootstrap(Buffer.from(input)), { code: 'BOOTSTRAP_CONFIG' });
});
test('license trust requires authentic pinned public Ed25519 keys and rejects private keys even with matching hash', t => {
    const f = fixture(t); validateLicenseTrust(f.trust, f.config.licenseTrustSha256);
    assert.throws(() => validateLicenseTrust(f.trust, '0'.repeat(64)), { code: 'BOOTSTRAP_LICENSE_TRUST' });
    for (const value of [{}, [], { private: f.pair.privateKey.export({ type: 'pkcs8', format: 'pem' }) },
        { bad: 'not a key' }, { 'bad.key.id': f.publicKey }]) {
        const bytes = Buffer.from(JSON.stringify(value));
        assert.throws(() => validateLicenseTrust(bytes, sha256(bytes)), { code: 'BOOTSTRAP_LICENSE_TRUST' });
    }
});
test('TTY must be an actual character terminal before it can receive any possession code', () => {
    for (const [character, interactive] of [[false, true], [true, false]]) {
        const calls = [], fileSystem = { openSync: (...args) => { calls.push(args); return 19; },
            fstatSync: () => ({ isCharacterDevice: () => character }), closeSync: fd => calls.push(['close', fd]) };
        assert.throws(() => openPossessionTty({ fileSystem, isatty: () => interactive }), { code: 'BOOTSTRAP_TTY_REQUIRED' });
        assert.equal(calls[0][0], '/dev/tty'); assert.deepEqual(calls[1], ['close', 19]);
    }
    let closed = false, output = '';
    const channel = openPossessionTty({ fileSystem: { openSync: () => 20,
        fstatSync: () => ({ isCharacterDevice: () => true }), closeSync: () => { closed = true; },
        writeSync: (_fd, bytes, offset, length) => { const amount = Math.min(3, length); output += bytes.subarray(offset, offset + amount); return amount; },
    }, isatty: () => true });
    channel.write('code fixture'); channel.close(); assert.equal(output, 'code fixture'); assert.equal(closed, true);
});
test('successful runner uses all existing installer flags and emits possession only through opened TTY', t => {
    const f = fixture(t), result = f.run();
    assert.equal(f.calls[0], 'tty-open');
    assert.deepEqual(f.calls[1], ['install', '--release-public-key-sha256', f.config.releasePublicKeySha256,
        '--origin', 'https://192.168.10.12:8443', '--hosts-file', path.join(f.root, 'inputs/hosts.json'),
        '--license-trust', path.join(f.root, 'license-public-trust.json'), '--license-trust-sha256', f.config.licenseTrustSha256]);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.root, 'inputs/hosts.json'))), ['192.168.10.12']);
    assert.equal(JSON.parse(fs.readFileSync(path.join(f.root, 'inputs/setup.json'))).origin, result.setupUrl);
    assert.equal(result.browserTrustRequired, true); assert.equal(result.hardwareAcceptance, 'OPEN');
    assert.equal(result.caFingerprint256, new crypto.X509Certificate(certificate).fingerprint256);
    assert.equal(JSON.stringify(result).includes(secretCode), false);
    assert.equal(f.ttyWrites.length, 1); assert.equal(f.ttyWrites[0].includes(secretCode), true); assert.equal(f.closed(), 1);
    assert.equal(f.owned.includes('/etc/nexowatt-eos/setup-code.txt'), true);
    if (process.platform !== 'win32') {
        assert.equal(fs.statSync(path.join(f.root, 'inputs')).mode & 0o777, 0o700);
        for (const file of ['hosts.json', 'setup.json']) assert.equal(fs.statSync(path.join(f.root, 'inputs', file)).mode & 0o777, 0o600);
    }
});
test('missing TTY, ambiguous IP and changed pins fail before host installation or input creation', t => {
    for (const mutation of [
        f => { f.dependencies.openTty = () => { throw Object.assign(new Error('tty unavailable'), { code: 'BOOTSTRAP_TTY_REQUIRED' }); }; },
        f => { f.dependencies.interfaces.second = [row('10.0.0.5')]; },
        f => { fs.appendFileSync(path.join(f.root, 'license-public-trust.json'), ' '); },
        f => { fs.writeFileSync(path.join(f.root, 'bootstrap.json'), JSON.stringify({ ...f.config, releasePublicKeySha256: '0'.repeat(64) })); },
    ]) {
        const f = fixture(t); mutation(f); assert.throws(f.run);
        assert.equal(f.calls.some(Array.isArray), false); assert.equal(f.ttyWrites.length, 0);
        assert.equal(fs.existsSync(path.join(f.root, 'inputs')), false);
    }
});
test('installer failures never read or output code and sanitized error excludes downstream secret messages', t => {
    for (const throws of [false, true]) {
        const f = fixture(t), reads = [], read = f.dependencies.read;
        f.dependencies.read = (...args) => { reads.push(args[0]); return read(...args); };
        f.dependencies.install = () => { if (throws) throw new Error(secretCode); return { ok: false, diagnostic: secretCode }; };
        let failure; try { f.run(); } catch (error) { failure = safeFailure(error); }
        assert.ok(failure); assert.equal(JSON.stringify(failure).includes(secretCode), false);
        assert.equal(reads.includes('/etc/nexowatt-eos/setup-code.txt'), false);
        assert.equal(f.ttyWrites.length, 0); assert.equal(f.closed(), 1);
    }
});
test('unsafe code permissions and existing input directory fail closed without TTY disclosure', t => {
    const f = fixture(t), read = f.dependencies.read;
    f.dependencies.read = (...args) => { const result = read(...args); if (args[0].endsWith('setup-code.txt')) result.mode = 0o644; return result; };
    assert.throws(f.run, { code: 'BOOTSTRAP_CODE_INVALID' }); assert.equal(f.ttyWrites.length, 0); assert.equal(f.closed(), 1);
    const g = fixture(t); fs.mkdirSync(path.join(g.root, 'inputs'));
    assert.throws(g.run); assert.equal(g.calls.some(Array.isArray), false); assert.equal(g.ttyWrites.length, 0); assert.equal(g.closed(), 1);
});
test('CLI cannot select paths or weaken host requirements; errors contain no arbitrary properties', t => {
    const f = fixture(t);
    assert.throws(() => main(['--origin', 'http://host'], f.dependencies), { code: 'BOOTSTRAP_USAGE' });
    assert.throws(() => main([], { ...f.dependencies, platform: 'win32' }), { code: 'BOOTSTRAP_LINUX_ROOT_REQUIRED' });
    assert.throws(() => main([], { ...f.dependencies, uid: 1000 }), { code: 'BOOTSTRAP_LINUX_ROOT_REQUIRED' });
    assert.deepEqual(Object.keys(safeFailure({ code: 'BAD ' + secretCode, message: secretCode, token: secretCode })).sort(), ['code', 'message', 'ok']);
});
test('TTY is revalidated immediately before disclosure and cannot degrade into an ordinary output file', () => {
    let isCharacter = true, writes = 0, closed = false;
    const channel = openPossessionTty({ fileSystem: { openSync: () => 21,
        fstatSync: () => ({ isCharacterDevice: () => isCharacter }),
        writeSync: () => { writes++; return 1; }, closeSync: () => { closed = true; },
    }, isatty: () => true });
    isCharacter = false;
    assert.throws(() => channel.write(secretCode), { code: 'BOOTSTRAP_TTY_REQUIRED' });
    channel.close(); assert.equal(writes, 0); assert.equal(closed, true);
});
test('ambiguous address errors give a bounded corrective message without addresses or secrets', () => {
    let error;
    try { selectIPv4({ a: [row('10.1.2.3')], b: [row('192.168.1.2')] }, secretCode); }
    catch (failure) { error = failure; }
    const publicFailure = safeFailure(error);
    assert.equal(publicFailure.code, 'BOOTSTRAP_IPV4_AMBIGUOUS');
    assert.match(publicFailure.message, /SSH/);
    for (const privateValue of [secretCode, '10.1.2.3', '192.168.1.2']) assert.equal(JSON.stringify(publicFailure).includes(privateValue), false);
});
test('terminal success is readable and includes public browser trust instructions without arbitrary result properties', t => {
    const f = fixture(t), result = f.run();
    const message = formatSuccess({ ...result, secret: secretCode });
    assert.match(message, /EOS: Geschuetzter Erststart ist bereit/);
    assert.ok(message.includes('https://192.168.10.12:8443'));
    assert.ok(message.includes(result.caFingerprint256));
    assert.match(message, /Zertifikatswarnungen nicht uebergehen/);
    assert.match(message, /Hardwareabnahme: OFFEN/);
    assert.equal(message.includes(secretCode), false);
    assert.equal(message.includes('"ok"'), false);
});
test('preflight refusal preserves its fixed error code and known failed check IDs but never diagnostic detail or secrets', t => {
    const f = fixture(t);
    f.dependencies.install = () => ({ ok: false, code: 'CHECKOUT_HOST_PREFLIGHT_REJECTED',
        preflight: { kind: 'eos-postgresql-test-host-preflight', checks: [
            { id: 'ports-free', status: 'fail', detail: secretCode },
            { id: 'postgresql:postgres', status: 'fail', stdout: secretCode, stderr: secretCode },
            { id: 'tool:/usr/bin/node', status: 'pass', detail: secretCode },
            { id: secretCode, status: 'fail' }, { id: 'ports-free', status: 'fail' },
        ] } });
    let failure; try { f.run(); } catch (error) { failure = error; }
    assert.equal(failure.code, 'CHECKOUT_HOST_PREFLIGHT_REJECTED');
    assert.deepEqual(safeFailure(failure).failedChecks, ['ports-free', 'postgresql:postgres']);
    const message = formatFailure(failure);
    assert.match(message, /CHECKOUT_HOST_PREFLIGHT_REJECTED/);
    assert.match(message, /ports-free, postgresql:postgres/);
    assert.equal(message.includes(secretCode), false); assert.equal(f.ttyWrites.length, 0);
});

test('host failure preserves fixed installation phase through the real runner without disclosure or retries', t => {
    for (const phase of ['accounts', 'directories', 'certificates', 'first-start-security', 'initdb', 'release-state',
        'units', 'schema', 'live-database-gate', 'controller', 'first-start-identity-context']) {
        const f = fixture(t), reads = [], read = f.dependencies.read;
        let installs = 0;
        f.dependencies.read = (...args) => { reads.push(args[0]); return read(...args); };
        f.dependencies.install = () => {
            installs++;
            throw Object.assign(new Error(secretCode), { code: 'PG_HOST_COMMAND_FAILED', phase,
                stdout: secretCode, stderr: secretCode, command: ['/private/' + secretCode], token: secretCode });
        };
        let failure;
        try { f.run(); } catch (error) { failure = error; }
        assert.ok(failure);
        const result = safeFailure(failure), message = formatFailure(failure);
        assert.equal(result.code, 'PG_HOST_COMMAND_FAILED');
        assert.equal(result.phase, phase);
        assert.deepEqual(Object.keys(result).sort(), ['code', 'message', 'ok', 'phase']);
        assert.ok(message.includes(`Installationsphase: ${phase}\n`));
        assert.equal(JSON.stringify(result).includes(secretCode), false);
        assert.equal(message.includes(secretCode), false);
        assert.equal(installs, 1); assert.equal(f.closed(), 1); assert.equal(f.ttyWrites.length, 0);
        assert.equal(reads.includes('/etc/nexowatt-eos/setup-code.txt'), false);
    }
});
test('unknown or malformed installation phases are omitted while existing code and preflight checks remain', () => {
    for (const phase of [undefined, null, [], {}, 1, secretCode, '../accounts', 'accounts\n' + secretCode,
        'ACCOUNTS', 'accounts\u001b[2J', 'accounts-private', 'x'.repeat(4096)]) {
        const failure = { code: 'CHECKOUT_HOST_PREFLIGHT_REJECTED', phase, message: secretCode,
            failedChecks: ['ports-free', secretCode, 'ports-free'] };
        assert.deepEqual(safeFailure(failure), { ok: false, code: 'CHECKOUT_HOST_PREFLIGHT_REJECTED',
            message: 'Installation angehalten; bestehende Daten und Fehlernachweise erhalten.', failedChecks: ['ports-free'] });
        const message = formatFailure(failure);
        assert.equal(message.includes('Installationsphase:'), false);
        assert.equal(message.includes(secretCode), false);
        assert.match(message, /Nicht erfuellte Pruefungen: ports-free/);
    }
});
