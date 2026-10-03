'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const core = require('../../components/admin/src/lib/eosLicenseCore.js');
const { validateLicenseSelection, persistLicense, assertTransferStat, main, STORE } = require('../../runtime/bootstrap/first-start-configuration.cjs');
const issuer = crypto.generateKeyPairSync('ed25519');
const publicKeys = { firstStartTest: issuer.publicKey.export({ format: 'pem', type: 'spki' }).toString() };
const uuid = '550e8400-e29b-41d4-a716-446655440000';
const otherUuid = '550e8400-e29b-41d4-a716-446655440001';
const now = 1790985600000;
function token(overrides = {}, key = issuer.privateKey) {
    const claims = { v: 2, kid: 'firstStartTest', licenseId: 'ephemeral-test-license', uuid, edition: 'home',
        issuedAt: now - 1000, notBefore: now - 1000, expiresAt: now + 60000,
        adapters: ['nexowatt-ui', 'nexowatt-devices'], limits: { chargePoints: 3, batteries: 2 }, ...overrides };
    const message = 'NWL2.' + Buffer.from(JSON.stringify(claims)).toString('base64url');
    return message + '.' + crypto.sign(null, Buffer.from(message, 'ascii'), key).toString('base64url');
}
const options = { uuid, publicKeys, core, now };
const selected = value => ({ mode: 'activate', token: value ?? token() });
async function fixture(t) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'eos-first-start-license-'));
    t.after(() => fs.rm(root, { recursive: true, force: true }));
    return path.join(root, 'licensing');
}

test('signed license uses real Admin core and exposes only non-secret status fields', () => {
    const selection = selected(), result = validateLicenseSelection(selection, options);
    assert.equal(result.valid, true); assert.equal(result.code, 'LICENSE_VALID');
    assert.equal(result.uuid, uuid); assert.equal(result.edition, 'home');
    assert.deepEqual(result.limits, { chargePoints: 3, batteries: 2 });
    assert.ok(Object.isFrozen(result) && Object.isFrozen(result.limits) && Object.isFrozen(result.adapters));
    assert.equal(JSON.stringify(result).includes(selection.token), false);
    assert.equal(JSON.stringify(result).includes('ephemeral-test-license'), false);
    assert.equal(Object.hasOwn(result, 'token'), false);
});

test('explicit unlicensed choice is valid setup input and grants no license rights or files', async t => {
    const directory = await fixture(t);
    const result = await persistLicense({ mode: 'unlicensed', token: '' }, { ...options, directory });
    assert.equal(result.valid, false); assert.equal(result.code, 'LICENSE_MISSING');
    assert.deepEqual(result.features, []); assert.deepEqual(result.adapters, []);
    await assert.rejects(fs.stat(directory), { code: 'ENOENT' });
});

test('selection rejects unknown modes, browser trust fields, embedded paths and oversize tokens', () => {
    for (const selection of [null, [], {}, { mode: 'later', token: '' }, { mode: 'unlicensed', token: token() },
        { mode: 'activate', token: '' }, { mode: 'activate', token: 'x'.repeat(16385) },
        { ...selected(), publicKeys }, { ...selected(), uuid: otherUuid }, { ...selected(), directory: '/tmp' }]) {
        assert.throws(() => validateLicenseSelection(selection, options), { code: 'FIRST_START_LICENSE_SELECTION' });
    }
});

test('signature, UUID, expiry and not-before are rechecked before any persistence', async t => {
    const directory = await fixture(t);
    const impostor = crypto.generateKeyPairSync('ed25519');
    const invalid = [token({ uuid: otherUuid }), token({ expiresAt: now }), token({ notBefore: now + 1 }),
        token({}, impostor.privateKey), token({ kid: 'unknown' })];
    for (const value of invalid) await assert.rejects(persistLicense(selected(value), { ...options, directory }));
    await assert.rejects(fs.stat(directory), { code: 'ENOENT' });
    assert.throws(() => validateLicenseSelection(selected(), { ...options, publicKeys: {
        firstStartTest: issuer.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
    } }));
});

test('actual encrypted store survives reload with UUID binding and never stores plaintext token', async t => {
    const directory = await fixture(t), selection = selected();
    assert.equal((await persistLicense(selection, { ...options, directory })).valid, true);
    assert.deepEqual((await fs.readdir(directory)).sort(), ['license.enc', 'storage.key']);
    const envelope = await fs.readFile(path.join(directory, 'license.enc'), 'utf8');
    assert.equal(envelope.includes(selection.token), false); assert.equal(envelope.includes('ephemeral-test-license'), false);
    const loaded = await new core.EncryptedLicenseStore({ directory, uuid }).load();
    assert.deepEqual(loaded, { token: selection.token, highWaterMark: now });
    await assert.rejects(new core.EncryptedLicenseStore({ directory, uuid: otherUuid }).load());
    if (process.platform !== 'win32') {
        for (const name of ['storage.key', 'license.enc']) assert.equal((await fs.stat(path.join(directory, name))).mode & 0o777, 0o600);
        assert.equal((await fs.stat(directory)).mode & 0o777, 0o700);
    }
});

test('repeated import preserves store anti-rollback and corrupted encrypted readback fails closed', async t => {
    const directory = await fixture(t), selection = selected();
    await persistLicense(selection, { ...options, directory });
    await persistLicense(selection, { ...options, now: now + 1, directory });
    await assert.rejects(persistLicense(selection, { ...options, directory }), { code: 'STORAGE_CLOCK_ROLLBACK' });
    await fs.writeFile(path.join(directory, 'license.enc'), '{"v":1}');
    await assert.rejects(persistLicense(selection, { ...options, now: now + 2, directory }));
});

test('write boundary rejects wrong owner, group, mode, links and oversized transfer before truncate', () => {
    const stat = { uid: 0, gid: 971, mode: 0o100640, nlink: 1, size: 0, isFile: () => true, isSymbolicLink: () => false };
    assert.doesNotThrow(() => assertTransferStat(stat, 971));
    for (const override of [{ uid: 1000 }, { gid: 972 }, { mode: 0o100644 }, { mode: 0o104640 },
        { nlink: 2 }, { size: 20001 }, { isFile: () => false }, { isSymbolicLink: () => true }]) {
        assert.throws(() => assertTransferStat({ ...stat, ...override }, 971), { code: 'FIRST_START_LICENSE_TRANSFER' });
    }
});

test('privileged and runtime entry points accept no caller-selected path, user or command', async () => {
    assert.equal(STORE, '/var/lib/nexowatt-eos/iobroker-data/eos-admin.0/licensing');
    for (const argv of [[], ['--import-license', '/tmp/untrusted'], ['--directory', '/tmp'], ['--uuid', uuid]]) {
        await assert.rejects(main(argv), { code: 'FIRST_START_LICENSE_USAGE' });
    }
});

test('actual root writer checks the opened inode before truncating and syncs the same descriptor', async () => {
    const filename = path.resolve(__dirname, '../../runtime/bootstrap/first-start-configuration.cjs');
    const source = await fs.readFile(filename, 'utf8'), realRequire = createRequire(filename);
    function evaluate(changedInode) {
        const calls = [], writes = [];
        const stat = { uid: 0, gid: 971, mode: 0o100640, nlink: 1, size: 0, dev: 4, ino: 5,
            isFile: () => true, isSymbolicLink: () => false };
        const fakeFs = { constants: { O_WRONLY: 1, O_NOFOLLOW: 131072 },
            readFileSync: name => name === '/etc/passwd' ? 'eos-runtime:x:970:971::/var/lib/nexowatt-eos/home:/usr/sbin/nologin\n' : 'eos-runtime:x:971:\n',
            lstatSync: name => { calls.push(['lstat', name]); return stat; },
            openSync: (name, flags) => { calls.push(['open', name, flags]); return 17; },
            fstatSync: fd => { calls.push(['fstat', fd]); return { ...stat, ino: changedInode ? 6 : 5 }; },
            ftruncateSync: (fd, size) => calls.push(['truncate', fd, size]),
            writeFileSync: (fd, bytes) => { calls.push(['write', fd]); writes.push(Buffer.from(bytes)); },
            fsyncSync: fd => calls.push(['fsync', fd]), closeSync: fd => calls.push(['close', fd]),
        };
        const sandbox = { Buffer, __dirname: path.dirname(filename), module: { exports: {} },
            process: { platform: 'linux', getuid: () => 0 }, require: name => name === 'node:fs' ? fakeFs :
                name === '../release/installed-check.cjs' ? { rootOwned: name => calls.push(['rootOwned', name]) } : realRequire(name) };
        vm.runInNewContext(source, sandbox, { filename });
        return { writer: sandbox.module.exports.writeLicenseTransfer, calls, writes };
    }
    const changed = evaluate(true);
    assert.throws(() => changed.writer(selected(), uuid), { code: 'FIRST_START_LICENSE_TRANSFER' });
    assert.equal(changed.calls.some(call => call[0] === 'truncate'), false);
    assert.deepEqual(changed.calls.at(-1), ['close', 17]);
    const stable = evaluate(false), selection = selected(); stable.writer(selection, uuid);
    assert.deepEqual(stable.calls.map(call => call[0]), ['rootOwned', 'lstat', 'open', 'fstat', 'truncate', 'write', 'fsync', 'close']);
    assert.equal(stable.calls[2][1], '/etc/nexowatt-eos/first-start-license.json');
    assert.equal(stable.calls[2][2], 131073);
    assert.deepEqual(JSON.parse(stable.writes[0]), { schemaVersion: 1, uuid, license: selection });
    assert.ok(stable.calls.slice(3).every(call => call[1] === 17));
});
