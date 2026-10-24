'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { signChannel } = require('../../tools/bootstrap/sign-managed-channel.cjs');
const { installManagedUpdates, UNIT } = require('../../tools/system/install-managed-updates.cjs');
const { verifyFeed } = require('../../runtime/updates/channel.cjs');
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
test('fresh checkout installer accepts only its new ARM64 baseline and independent trust pin', () => {
    const installer = require('../../tools/system/install-managed-from-checkout.cjs');
    const key = crypto.generateKeyPairSync('ed25519').publicKey.export({ format: 'pem', type: 'spki' });
    const delivery = { runtimeVersion: '0.2.0-test.3', deliveryRevision: 13, releaseSequence: 16,
        platform: 'linux-arm64', archive: 'eos-linux-arm64.tar.gz', releaseId: 'a'.repeat(64), sha256: 'b'.repeat(64),
        productionReleaseApproved: false, signingPublicKeySha256: hash(key) };
    assert.equal(installer.deliveryIdentity(delivery, key, hash(key), 'linux-arm64'), delivery);
    for (const changed of [{ releaseSequence: 15 }, { releaseSequence: 17 }, { deliveryRevision: 12 }, { productionReleaseApproved: true }, { archive: '../archive' }])
        assert.throws(() => installer.deliveryIdentity({ ...delivery, ...changed }, key, hash(key), 'linux-arm64'), /CHECKOUT_DELIVERY/);
    assert.throws(() => installer.deliveryIdentity(delivery, key, '0'.repeat(64), 'linux-arm64'), /CHECKOUT_RELEASE_TRUST_MISMATCH/);
    assert.throws(() => installer.deliveryIdentity(delivery, key, hash(key), 'linux-x64'), /CHECKOUT_DELIVERY/);
});
function fixture(t) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-managed-trust-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const pair = crypto.generateKeyPairSync('ed25519');
    const publicKey = pair.publicKey.export({ format: 'pem', type: 'spki' });
    const key = path.join(directory, 'private.pem'), input = path.join(directory, 'input.json'), output = path.join(directory, 'channel.json');
    fs.writeFileSync(key, pair.privateKey.export({ format: 'pem', type: 'pkcs8' }), { mode: 0o600 });
    fs.writeFileSync(input, JSON.stringify({ schemaVersion: 1, channel: 'eos-managed-test-v1',
        issuedAt: new Date(Date.now() - 1000).toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString(), releases: [] }));
    return { directory, publicKey, key, input, output, options: { input, output, privateKeyFile: key, expectedPublicKeySha256: hash(publicKey) } };
}
test('publisher signs a valid receiver envelope without claiming publication or exposing the key', t => {
    const f = fixture(t), result = signChannel(f.options);
    assert.equal(result.published, false); assert.equal(result.remoteReadbackPerformed, false);
    assert.deepEqual(verifyFeed(fs.readFileSync(f.output), f.publicKey).releases, []);
    assert.ok(!fs.readFileSync(f.output, 'utf8').includes('PRIVATE KEY'));
    assert.throws(() => signChannel(f.options), /EEXIST/);
});
test('publisher rejects wrong trust, weak key permissions, linked keys and invalid documents before output', t => {
    const f = fixture(t);
    assert.throws(() => signChannel({ ...f.options, expectedPublicKeySha256: '0'.repeat(64) }), /UPDATE_SIGN_TRUST/);
    fs.chmodSync(f.key, 0o644); assert.throws(() => signChannel(f.options), /UPDATE_SIGN_PRIVATE_MODE/);
    fs.chmodSync(f.key, 0o600); const link = path.join(f.directory, 'link.pem'); fs.symlinkSync(f.key, link);
    assert.throws(() => signChannel({ ...f.options, privateKeyFile: link }), /UPDATE_SIGN_PRIVATE_MODE/);
    fs.writeFileSync(f.input, '{}'); assert.throws(() => signChannel(f.options), /UPDATE_FEED/);
    assert.equal(fs.existsSync(f.output), false);
});
test('fresh installer pins immutable service paths and public trust, never starts service; mismatched keys and overwrite fail', { skip: process.getuid?.() !== 0 ? 'root-owned file integration requires uid 0' : false }, t => {
    const f = fixture(t), id = 'a'.repeat(64), at = p => path.join(f.directory, p);
    for (const p of [`/opt/nexowatt/eos/releases/${id}/system/managed-test`, `/opt/nexowatt/eos/verified/${id}`, '/etc/nexowatt-eos', '/etc/systemd/system', '/var/lib']) fs.mkdirSync(at(p), { recursive: true });
    fs.writeFileSync(at(`/opt/nexowatt/eos/verified/${id}/release-public.pem`), f.publicKey);
    // Materialize a fresh root-owned staged file, as the actual bundle staging
    // writer does; copying a runner-owned checkout is not installed evidence.
    fs.writeFileSync(at(`/opt/nexowatt/eos/releases/${id}/system/managed-test/${UNIT}`),
        fs.readFileSync(path.resolve(__dirname, '../../system/managed-test', UNIT)), { mode: 0o644, flag: 'wx' });
    // Scratch parent /tmp is intentionally writable; assert every fixture path
    // below its private boundary while retaining real file ownership/mode checks.
    const owner = p => { const s = fs.lstatSync(p); assert.equal(s.uid, 0); assert.equal(s.isSymbolicLink(), false); assert.equal(s.mode & 0o022, 0); };
    assert.throws(() => installManagedUpdates({ releaseId: id, publicKeySha256: '0'.repeat(64) }, { root: f.directory, owner }), /UPDATE_TRUST/);
    assert.equal(fs.existsSync(at('/etc/nexowatt-eos/update-trust.pem')), false);
    const options = { releaseId: id, publicKeySha256: hash(f.publicKey) };
    assert.deepEqual(installManagedUpdates(options, { root: f.directory, owner }), { installed: true, started: false, unit: UNIT });
    assert.equal(fs.readFileSync(at('/etc/nexowatt-eos/update-trust.pem'), 'utf8'), f.publicKey);
    const unit = fs.readFileSync(at('/etc/systemd/system/' + UNIT), 'utf8');
    assert.equal(unit.includes('@RELEASE_ID@'), false); assert.equal(unit.split(id).length, 3);
    assert.equal(fs.statSync(at('/var/lib/nexowatt-eos-updates/jobs')).mode & 0o777, 0o700);
    assert.throws(() => installManagedUpdates(options, { root: f.directory, owner }), /UPDATE_INSTALL_EXISTS/);
});
