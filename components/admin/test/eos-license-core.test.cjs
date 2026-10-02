'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { normalizeUuid, validatePublicKeys, verifyLicense, EncryptedLicenseStore } = require('../src/lib/eosLicenseCore.js');

// Ephemeral test-only keys, generated in memory; never written to this repository.
const issuer = crypto.generateKeyPairSync('ed25519');
const otherIssuer = crypto.generateKeyPairSync('ed25519');
const publicKeys = { 'test-issuer': issuer.publicKey.export({ format: 'pem', type: 'spki' }).toString() };
const uuid = '550e8400-e29b-41d4-a716-446655440000';
const otherUuid = '550e8400-e29b-41d4-a716-446655440001';
const now = 1790784000000;

function claims(overrides = {}) {
    return {
        v: 2, kid: 'test-issuer', licenseId: 'test-license', uuid, edition: 'home',
        issuedAt: now - 1000, notBefore: now - 1000, expiresAt: now + 60000,
        adapters: ['nexowatt-ui', 'nexowatt-devices'], limits: { chargePoints: 3, batteries: 2 },
        ...overrides,
    };
}

function sign(payload = claims(), key = issuer.privateKey) {
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const message = `NWL2.${encoded}`;
    return `${message}.${crypto.sign(null, Buffer.from(message, 'ascii'), key).toString('base64url')}`;
}

function verify(token = sign(), options = {}) {
    return verifyLicense(token, { uuid, publicKeys, now, ...options });
}

function throwsCode(fn, code) {
    assert.throws(fn, error => error.code === code && error.message === code);
}

async function rejectsCode(promise, code) {
    await assert.rejects(promise, error => error.code === code && error.message === code);
}

async function fixture(t) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'eos-license-test-'));
    t.after(() => fs.rm(root, { recursive: true, force: true }));
    const directory = path.join(root, 'licensing');
    const store = new EncryptedLicenseStore({ directory, uuid });
    return { root, directory, store, token: sign(), keyPath: path.join(directory, 'storage.key'), licensePath: path.join(directory, 'license.enc') };
}

test('UUID normalizes case/space while preserving canonical and direct vendor-prefix identity', () => {
    assert.equal(normalizeUuid(`  ${uuid.toUpperCase()}  `), uuid);
    assert.equal(normalizeUuid(`NW${uuid}`), `nw${uuid}`);
    for (const invalid of ['', null, 0, 'random-uuid', `nw-${uuid}`, `${uuid}.`, uuid.replace('-', ''), 'x'.repeat(129)]) {
        throwsCode(() => normalizeUuid(invalid), 'LICENSE_UUID_INVALID');
    }
    throwsCode(() => verify(sign(claims({ uuid: `nw${uuid}` }))), 'LICENSE_UUID_MISMATCH');
});

test('Home license authenticates UUID, explicit adapters, limits and immutable derived features', () => {
    const result = verify();
    assert.equal(result.edition, 'home');
    assert.deepEqual(result.limits, { chargePoints: 3, batteries: 2 });
    assert.deepEqual(result.features, ['energy', 'wallet', 'smartHome', 'microgridSlave']);
    assert.deepEqual(result.adapters, ['nexowatt-ui', 'nexowatt-devices']);
    assert.ok(Object.isFrozen(result) && Object.isFrozen(result.limits) && Object.isFrozen(result.features) && Object.isFrozen(result.adapters));
    assert.throws(() => { result.limits.batteries = 10; }, TypeError);
});

test('Pro license enables Pro features only from signed edition and caps 10 batteries', () => {
    const result = verify(sign(claims({ edition: 'pro', expiresAt: null, limits: { chargePoints: 1000, batteries: 10 } })));
    assert.equal(result.edition, 'pro');
    assert.equal(result.expiresAt, null);
    for (const feature of ['microgridMaster', 'multisite', 'billing']) assert.ok(result.features.includes(feature));
    throwsCode(() => verify(sign(claims({ edition: 'pro', limits: { chargePoints: 1001, batteries: 10 } }))), 'LICENSE_CLAIMS_INVALID');
    throwsCode(() => verify(sign(claims({ edition: 'pro', limits: { chargePoints: 99, batteries: 11 } }))), 'LICENSE_CLAIMS_INVALID');
});

test('expiry and notBefore use exact millisecond boundaries without coercion or grace', () => {
    const token = sign();
    assert.equal(verify(token, { now: now + 59999 }).edition, 'home');
    throwsCode(() => verify(token, { now: now + 60000 }), 'LICENSE_EXPIRED');
    throwsCode(() => verify(token, { now: now - 1001 }), 'LICENSE_NOT_YET_VALID');
    for (const invalid of [NaN, Infinity, -1, '1', 1.5, null]) {
        throwsCode(() => verify(token, { now: invalid }), 'LICENSE_TIME_INVALID');
    }
    throwsCode(() => verify(token, { uuid: otherUuid }), 'LICENSE_UUID_MISMATCH');
});

test('forged or edited signature, foreign signing key, unknown kid and legacy format fail closed', () => {
    const token = sign();
    const [prefix, payload, signature] = token.split('.');
    const edited = JSON.parse(Buffer.from(payload, 'base64url').toString());
    edited.edition = 'pro';
    throwsCode(() => verify(`${prefix}.${Buffer.from(JSON.stringify(edited)).toString('base64url')}.${signature}`), 'LICENSE_SIGNATURE_INVALID');
    throwsCode(() => verify(sign(claims(), otherIssuer.privateKey)), 'LICENSE_SIGNATURE_INVALID');
    throwsCode(() => verify(sign(claims({ kid: 'unknown' }))), 'LICENSE_KEY_UNKNOWN');
    throwsCode(() => verify(`NWL1.${payload}.${signature}`), 'LICENSE_FORMAT_INVALID');
    throwsCode(() => verify('HOME-secret-legacy-hmac'), 'LICENSE_FORMAT_INVALID');
});

test('trust accepts only bounded explicit Ed25519 public SPKI keys', () => {
    assert.ok(Object.isFrozen(validatePublicKeys(publicKeys)));
    const privatePem = issuer.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
    const rsa = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const rsaPem = rsa.publicKey.export({ format: 'pem', type: 'spki' }).toString();
    for (const invalid of [null, {}, [], { x: privatePem }, { x: rsaPem }, { '*': publicKeys['test-issuer'] }, { x: 'x'.repeat(1025) }, { x: issuer.publicKey }, { x: `${publicKeys['test-issuer']}${privatePem}` }]) {
        throwsCode(() => validatePublicKeys(invalid), 'TRUST_INVALID');
    }
    throwsCode(() => verify(sign(), { publicKeys: {} }), 'TRUST_INVALID');
});

test('schema rejects wildcard adapters, duplicate adapters, unsafe limits and unknown signed fields', () => {
    const invalid = [
        { v: 1 }, { edition: 'enterprise' }, { edition: 'HOME' }, { licenseId: '' },
        { adapters: ['*'] }, { adapters: ['nexowatt-ui.0'] }, { adapters: ['nexowatt-ui', 'nexowatt-ui'] },
        { adapters: [] }, { adapters: Array(65).fill('nexowatt-ui') }, { adapters: [null] },
        { limits: { chargePoints: 4, batteries: 2 } }, { limits: { chargePoints: 3, batteries: 3 } },
        { limits: { chargePoints: 0, batteries: 0 } }, { limits: { chargePoints: '3', batteries: 2 } },
        { limits: { chargePoints: 3, batteries: -1 } }, { limits: { chargePoints: 3, batteries: 2.5 } },
        { limits: { chargePoints: 3, batteries: 2, unsafe: true } },
        { issuedAt: '123' }, { notBefore: now - 1001 }, { expiresAt: now - 1000 },
        { features: ['microgridMaster'] }, { licenseId: '../path' }, { uuid: null },
    ];
    for (const overrides of invalid) {
        assert.throws(() => verify(sign(claims(overrides))), error => ['LICENSE_CLAIMS_INVALID', 'LICENSE_UUID_INVALID'].includes(error.code), JSON.stringify(overrides));
    }
});

test('malformed/oversized tokens and noncanonical base64 cannot reach successful verification', () => {
    const token = sign();
    const [prefix, payload, signature] = token.split('.');
    for (const malformed of [null, {}, '', ` ${token}`, `${token} `, `${token}.extra`, 'NWL2.'.padEnd(20000, 'x'), `${prefix}.${payload}=.${signature}`, `${prefix}.${payload}.${signature.slice(1)}`, 'NWL2._w.' + signature, 'NWL2.e30.' + signature]) {
        assert.throws(() => verify(malformed), error => ['LICENSE_FORMAT_INVALID', 'LICENSE_CLAIMS_INVALID'].includes(error.code));
    }
});

test('encrypted storage roundtrips across restart with fresh nonce and no plaintext on disk', async t => {
    const f = await fixture(t);
    assert.equal(await f.store.load(), null);
    assert.equal(await fs.stat(f.keyPath).catch(() => null), null);
    await f.store.save({ token: f.token, highWaterMark: now });
    const first = await fs.readFile(f.licensePath, 'utf8');
    assert.ok(!first.includes(f.token) && !first.includes('test-license') && !first.includes('highWaterMark') && !first.includes(uuid));
    assert.deepEqual(await new EncryptedLicenseStore({ directory: f.directory, uuid }).load(), { token: f.token, highWaterMark: now });
    await f.store.save({ token: f.token, highWaterMark: now + 1 });
    const second = await fs.readFile(f.licensePath, 'utf8');
    assert.notEqual(JSON.parse(first).iv, JSON.parse(second).iv);
    assert.notEqual(JSON.parse(first).ciphertext, JSON.parse(second).ciphertext);
    assert.equal((await fs.readFile(f.keyPath)).length, 32);
    if (process.platform !== 'win32') {
        assert.equal((await fs.stat(f.directory)).mode & 0o777, 0o700);
        assert.equal((await fs.stat(f.keyPath)).mode & 0o777, 0o600);
        assert.equal((await fs.stat(f.licensePath)).mode & 0o777, 0o600);
    }
    assert.deepEqual((await fs.readdir(f.directory)).sort(), ['license.enc', 'storage.key']);
});

test('GCM binds UUID and fails after ciphertext/tag/nonce corruption', async t => {
    const f = await fixture(t);
    await f.store.save({ token: f.token, highWaterMark: now });
    const original = await fs.readFile(f.licensePath, 'utf8');
    await rejectsCode(new EncryptedLicenseStore({ directory: f.directory, uuid: otherUuid }).load(), 'STORAGE_AUTH_FAILED');
    for (const field of ['iv', 'ciphertext', 'tag']) {
        const envelope = JSON.parse(original);
        const bytes = Buffer.from(envelope[field], 'base64url');
        bytes[0] ^= 1;
        envelope[field] = bytes.toString('base64url');
        await fs.writeFile(f.licensePath, JSON.stringify(envelope));
        await rejectsCode(f.store.load(), 'STORAGE_AUTH_FAILED');
        await rejectsCode(f.store.save({ token: f.token, highWaterMark: now + 1 }), 'STORAGE_AUTH_FAILED');
    }
});

test('missing/wrong/short storage key never silently regenerates existing encrypted license', async t => {
    const f = await fixture(t);
    await f.store.save({ token: f.token, highWaterMark: now });
    const key = await fs.readFile(f.keyPath);
    await fs.unlink(f.keyPath);
    await rejectsCode(f.store.load(), 'STORAGE_KEY_MISSING');
    await rejectsCode(f.store.save({ token: f.token, highWaterMark: now }), 'STORAGE_KEY_MISSING');
    assert.equal(await fs.stat(f.keyPath).catch(() => null), null);
    await fs.writeFile(f.keyPath, crypto.randomBytes(32), { mode: 0o600 });
    await rejectsCode(f.store.load(), 'STORAGE_AUTH_FAILED');
    await fs.writeFile(f.keyPath, key.subarray(0, 12));
    await rejectsCode(f.store.load(), 'STORAGE_KEY_INVALID');
});

test('storage high water mark cannot decrease; serialized operations preserve monotonic value', async t => {
    const f = await fixture(t);
    await f.store.save({ token: f.token, highWaterMark: now });
    await rejectsCode(f.store.save({ token: f.token, highWaterMark: now - 1 }), 'STORAGE_CLOCK_ROLLBACK');
    await Promise.all([f.store.save({ token: f.token, highWaterMark: now + 1 }), f.store.save({ token: f.token, highWaterMark: now + 2 })]);
    assert.equal((await f.store.load()).highWaterMark, now + 2);
    const pending = { token: f.token, highWaterMark: now + 3 };
    const write = f.store.save(pending);
    pending.highWaterMark = 0;
    await write;
    assert.equal((await f.store.load()).highWaterMark, now + 3);
});

test('clear removes only license, keeps device encryption key and permits fresh install', async t => {
    const f = await fixture(t);
    await f.store.save({ token: f.token, highWaterMark: now });
    const originalKey = await fs.readFile(f.keyPath);
    await f.store.clear();
    assert.equal(await f.store.load(), null);
    assert.deepEqual(await fs.readFile(f.keyPath), originalKey);
    await f.store.clear();
    await f.store.save({ token: f.token, highWaterMark: now });
    assert.equal((await f.store.load()).token, f.token);
});

test('storage rejects symlink files, symlink directory/ancestor and hard linked secrets', { skip: process.platform === 'win32' }, async t => {
    const f = await fixture(t);
    await f.store.save({ token: f.token, highWaterMark: now });
    const outside = path.join(f.root, 'outside');
    await fs.writeFile(outside, 'untouched', { mode: 0o600 });
    await fs.unlink(f.licensePath);
    await fs.symlink(outside, f.licensePath);
    await rejectsCode(f.store.load(), 'STORAGE_UNSAFE_PATH');
    await rejectsCode(f.store.save({ token: f.token, highWaterMark: now }), 'STORAGE_UNSAFE_PATH');
    await rejectsCode(f.store.clear(), 'STORAGE_UNSAFE_PATH');
    assert.equal(await fs.readFile(outside, 'utf8'), 'untouched');
    await fs.unlink(f.licensePath);
    await fs.link(f.keyPath, path.join(f.root, 'hardlink'));
    await rejectsCode(f.store.save({ token: f.token, highWaterMark: now }), 'STORAGE_UNSAFE_PATH');
    const linkDirectory = path.join(f.root, 'linked');
    await fs.symlink(f.directory, linkDirectory);
    await rejectsCode(new EncryptedLicenseStore({ directory: linkDirectory, uuid }).load(), 'STORAGE_UNSAFE_PATH');
    await rejectsCode(new EncryptedLicenseStore({ directory: path.join(linkDirectory, 'child'), uuid }).load(), 'STORAGE_UNSAFE_PATH');
    assert.equal(await fs.stat(path.join(f.directory, 'child')).catch(() => null), null);
});

test('storage rejects permissive POSIX modes and unsafe directory roots', { skip: process.platform === 'win32' }, async t => {
    const f = await fixture(t);
    await f.store.save({ token: f.token, highWaterMark: now });
    await fs.chmod(f.keyPath, 0o644);
    await rejectsCode(f.store.load(), 'STORAGE_UNSAFE_PATH');
    await fs.chmod(f.keyPath, 0o600);
    await fs.chmod(f.licensePath, 0o644);
    await rejectsCode(f.store.load(), 'STORAGE_UNSAFE_PATH');
    await fs.chmod(f.licensePath, 0o600);
    await fs.chmod(f.directory, 0o755);
    await rejectsCode(f.store.load(), 'STORAGE_UNSAFE_PATH');
    throwsCode(() => new EncryptedLicenseStore({ directory: 'relative', uuid }), 'STORAGE_DIRECTORY_INVALID');
    throwsCode(() => new EncryptedLicenseStore({ directory: '/', uuid }), 'STORAGE_DIRECTORY_INVALID');
});

test('storage bounds files and rejects malformed data/envelopes without destructive overwrite', async t => {
    const f = await fixture(t);
    for (const data of [{}, { token: 'legacy', highWaterMark: now }, { token: f.token, highWaterMark: -1 }, { token: f.token, highWaterMark: '123' }, { token: f.token, highWaterMark: now, extra: true }]) {
        await rejectsCode(f.store.save(data), 'STORAGE_DATA_INVALID');
    }
    await f.store.save({ token: f.token, highWaterMark: now });
    await fs.writeFile(f.licensePath, Buffer.alloc(32769));
    await rejectsCode(f.store.load(), 'STORAGE_SIZE_INVALID');
    await fs.writeFile(f.licensePath, '{}');
    await rejectsCode(f.store.load(), 'STORAGE_FORMAT_INVALID');
    await fs.writeFile(f.licensePath, '{');
    await rejectsCode(f.store.load(), 'STORAGE_FORMAT_INVALID');
    await fs.writeFile(f.licensePath, JSON.stringify({ v: 1, alg: 'A256GCM', iv: 'a', ciphertext: 'a', tag: 'a' }));
    await rejectsCode(f.store.load(), 'STORAGE_FORMAT_INVALID');
});
