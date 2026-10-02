'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { validateConfig, readConfig } = require('../../security/verify-runtime-tls.cjs');

let temporary;
let ca;
const script = path.resolve(__dirname, '../../security/verify-runtime-tls.cjs');
const TEST_PASSWORD = 'TEST_ONLY_0123456789_abcdefghijklm_NONPRODUCTION';

before(() => {
    temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-tls-config-test-'));
    // Temporary test CA/key only; never saved in the repository or included in output.
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '2',
        '-subj', '/CN=EOS temporary test CA', '-addext', 'basicConstraints=critical,CA:TRUE',
        '-keyout', path.join(temporary, 'test.key'), '-out', path.join(temporary, 'test.crt')],
    { stdio: 'ignore', timeout: 20000 });
    ca = fs.readFileSync(path.join(temporary, 'test.crt'), 'utf8');
    fs.unlinkSync(path.join(temporary, 'test.key'));
});
after(() => fs.rmSync(temporary, { recursive: true, force: true }));

function fixture() {
    const db = number => ({ type: 'redis', host: '127.0.0.1', port: 6380, options: {
        auth_pass: TEST_PASSWORD, db: number, family: 0,
        tls: { minVersion: 'TLSv1.3', rejectUnauthorized: true, servername: 'eos-redis.internal', ca },
    } });
    return { system: {}, objects: db(0), states: db(1), log: {} };
}

function rejected(mutate, expectedCode) {
    const config = fixture();
    mutate(config);
    const result = validateConfig(config);
    assert.equal(result.configurationMatchesProfile, false);
    assert.ok(result.errors.some(error => error.code === expectedCode), JSON.stringify(result));
    assert.equal(JSON.stringify(result).includes(TEST_PASSWORD), false);
    assert.equal(JSON.stringify(result).includes('BEGIN CERTIFICATE'), false);
}

test('valid profile is only a static match with open release gates', () => {
    const result = validateConfig(fixture());
    assert.equal(result.configurationMatchesProfile, true);
    assert.equal(result.networkVerified, false);
    assert.equal(result.credentialUniquenessVerified, false);
    assert.equal(result.trustAnchorProvenanceVerified, false);
    assert.equal(result.adapterIsolationVerified, false);
    assert.match(result.releaseGate, /^OPEN_/);
});

test('null, arrays and primitive roots are rejected without throwing', () => {
    for (const value of [null, [], true, 1, 'config']) {
        assert.equal(validateConfig(value).configurationMatchesProfile, false);
    }
});

test('both database sections and nested objects are required', () => {
    for (const side of ['objects', 'states']) {
        for (const value of [null, [], 'redis']) {
            rejected(c => { c[side] = value; }, 'DATABASE_NOT_OBJECT');
            rejected(c => { c[side].options = value; }, 'OPTIONS_NOT_OBJECT');
            rejected(c => { c[side].options.tls = value; }, 'TLS_OPTIONS_NOT_OBJECT');
        }
    }
});

test('JSONL, file and missing backends cannot pass as encrypted Redis', () => {
    for (const type of ['jsonl', 'file', undefined]) {
        rejected(c => { c.states.type = type; }, 'EXTERNAL_REDIS_REQUIRED');
    }
    rejected(c => { c.objects.secure = true; }, 'UNSUPPORTED_DATABASE_OPTION');
});

test('single TCP endpoint required; sentinel, URLs and unix sockets rejected', () => {
    for (const host of [['127.0.0.1'], 'redis://secret@localhost', '/tmp/redis.sock', '', null]) {
        rejected(c => { c.states.host = host; }, 'SINGLE_HOST_REQUIRED');
    }
    for (const port of [0, -1, 65536, '6380', null, 3.5]) {
        rejected(c => { c.states.port = port; }, 'VALID_TCP_PORT_REQUIRED');
    }
});

test('TLS 1.3 and explicit certificate verification cannot be weakened', () => {
    for (const value of [false, undefined, 'true', 1]) {
        rejected(c => { c.objects.options.tls.rejectUnauthorized = value; }, 'EXPLICIT_PEER_VERIFICATION_REQUIRED');
    }
    rejected(c => { c.objects.options.tls.minVersion = 'TLSv1.2'; }, 'TLS13_ONLY_REQUIRED');
    rejected(c => { c.objects.options.tls.maxVersion = 'TLSv1.2'; }, 'TLS13_ONLY_REQUIRED');
});

test('explicit DNS server identity and valid current CA required', () => {
    for (const value of ['', null, [], '127.0.0.1', 'https://redis.internal', '*.internal']) {
        rejected(c => { c.objects.options.tls.servername = value; }, 'EXPLICIT_DNS_SERVERNAME_REQUIRED');
    }
    for (const value of ['', null, [], '/path/to/ca.pem', 'not a certificate', `${ca}\nprivate extra data`]) {
        rejected(c => { c.objects.options.tls.ca = value; }, 'VALID_CURRENT_CA_PEM_REQUIRED');
    }
    assert.equal(validateConfig(fixture(), { now: 0 }).configurationMatchesProfile, false);
    assert.equal(validateConfig(fixture(), { now: Date.now() + 7 * 86400000 }).configurationMatchesProfile, false);
});

test('short or malformed auth_pass and legacy password fallback rejected', () => {
    for (const value of [undefined, null, 123, 'short', `${TEST_PASSWORD}\n`]) {
        rejected(c => { c.objects.options.auth_pass = value; }, 'AUTH_PASS_32_TO_1024_NONSPACE_CHARACTERS_REQUIRED');
    }
    rejected(c => { c.objects.pass = TEST_PASSWORD; }, 'UNSUPPORTED_DATABASE_OPTION');
    rejected(c => { c.objects.options.password = TEST_PASSWORD; }, 'UNSUPPORTED_CLIENT_OPTION');
});

test('TLS client private keys and transport overrides forbidden', () => {
    for (const field of ['key', 'pfx', 'cert', 'passphrase', 'checkServerIdentity', 'host', 'port', 'path', 'secureProtocol']) {
        rejected(c => { c.objects.options.tls[field] = 'TEST_ONLY'; }, 'UNSUPPORTED_TLS_OPTION_OR_CLIENT_KEY');
    }
    for (const field of ['path', 'host', 'port', 'sentinels', 'fallback']) {
        rejected(c => { c.objects.options[field] = 'TEST_ONLY'; }, 'UNSUPPORTED_CLIENT_OPTION');
    }
});

test('client options with invalid types cannot disguise their runtime semantics', () => {
    rejected(c => { c.objects.options.username = 'user\n'; }, 'INVALID_ACL_USERNAME');
    rejected(c => { c.objects.options.family = '4'; }, 'INVALID_ADDRESS_FAMILY');
    rejected(c => { c.objects.options.db = '0'; }, 'INVALID_NUMERIC_CLIENT_OPTION');
    rejected(c => { c.objects.options.maxRetriesPerRequest = null; }, 'INVALID_RETRY_LIMIT');
    rejected(c => { c.objects.options.enableOfflineQueue = 'false'; }, 'INVALID_OFFLINE_QUEUE_OPTION');
    rejected(c => { c.objects.enhancedLogging = true; }, 'ENHANCED_DB_LOGGING_FORBIDDEN');
});

test('Admin 8.0.14-style options reconstruction is caught after saving', () => {
    rejected(c => { c.objects.options = { auth_pass: TEST_PASSWORD, db: 0, family: 0,
        retry_max_count: 19, retry_max_delay: 5000 }; }, 'TLS_OPTIONS_NOT_OBJECT');
});

test('CLI reads explicit file without modifying it and emits no credential or CA', () => {
    const filename = path.join(temporary, 'valid.json');
    const contents = JSON.stringify(fixture());
    fs.writeFileSync(filename, contents, { mode: 0o600 });
    const result = spawnSync(process.execPath, [script, filename], { encoding: 'utf8', timeout: 10000 });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).networkVerified, false);
    assert.equal(result.stdout.includes(TEST_PASSWORD), false);
    assert.equal(result.stdout.includes('BEGIN CERTIFICATE'), false);
    assert.equal(fs.readFileSync(filename, 'utf8'), contents);
});

test('CLI rejects invalid JSON, unreadable path and unsafe profile without leaking input', () => {
    const filename = path.join(temporary, 'invalid.json');
    fs.writeFileSync(filename, `{"password":"${TEST_PASSWORD}" MALFORMED`);
    for (const file of [filename, path.join(temporary, `missing-${TEST_PASSWORD}`)]) {
        const result = spawnSync(process.execPath, [script, file], { encoding: 'utf8', timeout: 10000 });
        assert.equal(result.status, 2);
        assert.equal((result.stdout + result.stderr).includes(TEST_PASSWORD), false);
    }
    fs.writeFileSync(filename, JSON.stringify({ objects: [], states: null }));
    assert.equal(spawnSync(process.execPath, [script, filename]).status, 1);
    assert.equal(spawnSync(process.execPath, [script, '--unsupported']).status, 64);
});

test('reader bounds file size and rejects final symlinks where supported', () => {
    const big = path.join(temporary, 'too-large.json');
    fs.writeFileSync(big, ' '.repeat(2 * 1024 * 1024 + 1));
    assert.throws(() => readConfig(big));
    assert.throws(() => readConfig(temporary));
    if (fs.constants.O_NOFOLLOW) {
        const small = path.join(temporary, 'symlink-target.json');
        fs.writeFileSync(small, '{}');
        const link = path.join(temporary, 'symlink.json');
        fs.symlinkSync(small, link);
        assert.throws(() => readConfig(link));
    }
});
