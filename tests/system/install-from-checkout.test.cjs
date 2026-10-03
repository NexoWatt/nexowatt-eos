'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { DELIVERY_DIRECTORY, DELIVERY_REVISION, RELEASE_SEQUENCE, parse, digestArchive, deliveryIdentity } = require('../../tools/system/install-from-checkout.cjs');
const { releaseMetadata } = require('../../tools/integration/package-postgresql-test.cjs');
const { sha256 } = require('../../runtime/release/bundle.cjs');
const { probeNativeForInstallation, withDeploymentUmask } = require('../../tools/system/eos-base.cjs');
function input() { return ['install', '--origin', 'https://eos.test:8443', '--release-public-key-sha256', 'a'.repeat(64),
    '--hosts-file', path.resolve('hosts.json'), '--license-trust', path.resolve('public-trust.json'), '--license-trust-sha256', 'b'.repeat(64)]; }
test('checkout install requires explicit public inputs and independent trust hashes, never password arguments', () => {
    assert.equal(parse(['preflight']).action, 'preflight');
    const good = input(); assert.equal(parse(good).action, 'install');
    for (const args of [[], ['install'], ['preflight', '--start', 'yes'], good.slice(0, -2), [...good, '--password', 'no'],
        good.map(x => x === '--origin' ? '--license-trust' : x), good.map(x => x === 'a'.repeat(64) ? 'latest' : x),
        good.map(x => x === path.resolve('hosts.json') ? '../hosts.json' : x)]) assert.throws(() => parse(args), /CHECKOUT_/);
});
test('delivery selection binds test3 revision2, sequence5, platform, archive basename and independent public key digest', () => {
    const keys = crypto.generateKeyPairSync('ed25519');
    const key = keys.publicKey.export({ type: 'spki', format: 'pem' });
    const pin = sha256(key);
    const data = { runtimeVersion: '0.2.0-test.3', deliveryRevision: 2, releaseSequence: 5,
        platform: 'linux-arm64', archive: 'eos-0.2.0-test.3-linux-arm64.tar.gz',
        releaseId: 'a'.repeat(64), sha256: 'b'.repeat(64), signingPublicKeySha256: pin, productionReleaseApproved: false };
    assert.equal(deliveryIdentity(data, key, pin, 'linux-arm64'), data);
    assert.equal(DELIVERY_DIRECTORY, 'delivery/test-pi-0.2.0-test.3-r2');
    assert.equal(DELIVERY_REVISION, data.deliveryRevision);
    assert.equal(RELEASE_SEQUENCE, data.releaseSequence);
    const manifest = releaseMetadata('linux-arm64');
    assert.equal(manifest.sequence, data.releaseSequence); assert.equal(manifest.releaseVersion, data.runtimeVersion);
    assert.equal(manifest.profile, 'test'); assert.equal(manifest.nodeVersion, '24.21.0');
    assert.deepEqual(manifest.platforms, [data.platform]);
    assert.throws(() => releaseMetadata('win32-arm64'), /PG_PRODUCT_ASSEMBLY_REQUIRED/);
    for (const override of [{ archive: '../untrusted.tar.gz' }, { runtimeVersion: '0.2.0-test.2' },
        { deliveryRevision: undefined }, { deliveryRevision: 1 }, { deliveryRevision: 3 },
        { releaseSequence: undefined }, { releaseSequence: 4 }, { releaseSequence: 6 },
        { platform: 'linux-x64' }, { productionReleaseApproved: true }, { signingPublicKeySha256: 'c'.repeat(64) },
        { releaseId: '' }, { sha256: '' }]) assert.throws(() => deliveryIdentity({ ...data, ...override }, key, pin, 'linux-arm64'));
    assert.throws(() => deliveryIdentity(data, key, 'd'.repeat(64), 'linux-arm64'), /TRUST/);
    assert.throws(() => deliveryIdentity(data, keys.privateKey.export({ type: 'pkcs8', format: 'pem' }), pin, 'linux-arm64'), /BUNDLE_KEY/);
});
test('archive digest streams exact bytes and rejects hardlinks, directories and missing files', t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-checkout-input-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const archive = path.join(root, 'test.tar.gz'), bytes = Buffer.alloc(2 * 1024 * 1024 + 13, 71);
    fs.writeFileSync(archive, bytes); assert.equal(digestArchive(archive), sha256(bytes));
    assert.throws(() => digestArchive(root)); assert.throws(() => digestArchive(path.join(root, 'absent')));
    fs.linkSync(archive, path.join(root, 'duplicate')); assert.throws(() => digestArchive(archive), /CHECKOUT_ARCHIVE/);
});
test('target native probe requires successful fixed child, matching host and no device I/O before installation', () => {
    const payload = path.resolve('verified-payload'), calls = [];
    const report = { kind: 'eos-serialport-native-target-probe', passed: true, platform: 'linux-arm64', node: '24.21.0',
        deviceIoPerformed: false, hardwareAccepted: false, bindings: [{ version: '12.0.1' }, { version: '13.0.0' }] };
    const exec = (file, args, options) => { calls.push({ file, args, options }); return { status: 0, stdout: JSON.stringify(report) }; };
    assert.deepEqual(probeNativeForInstallation(payload, 'linux-arm64', exec), report);
    assert.equal(calls[0].file, '/usr/bin/node');
    assert.deepEqual(calls[0].args, [path.join(payload, 'runtime/native/serialport-acceptance.cjs'), '--app', path.join(payload, 'app')]);
    assert.equal(calls[0].options.timeout, 20000);
    for (const override of [{ passed: false }, { platform: 'linux-x64' }, { node: '22.0.0' },
        { deviceIoPerformed: true }, { hardwareAccepted: true }, { bindings: [] }])
        assert.throws(() => probeNativeForInstallation(payload, 'linux-arm64', () => ({ status: 0, stdout: JSON.stringify({ ...report, ...override }) })), /EOS_NATIVE_TARGET_REJECTED/);
    for (const result of [{ status: 1, stdout: JSON.stringify(report) }, { status: 0, stdout: '{}' },
        { status: 0, stdout: 'not JSON' }, { status: null, error: 'ETIMEDOUT', stdout: JSON.stringify(report) }])
        assert.throws(() => probeNativeForInstallation(payload, 'linux-arm64', () => result), /EOS_NATIVE_TARGET_REJECTED/);
});
test('deployment restores the operator umask on failure (process API fixture; POSIX filesystem acceptance remains open)', t => {
    let mask = 0o077;
    t.mock.method(process, 'umask', value => { const previous = mask; if (value !== undefined) mask = value; return previous; });
        assert.equal(withDeploymentUmask(() => process.umask()), 0o022);
        assert.equal(process.umask(), 0o077);
        assert.throws(() => withDeploymentUmask(() => { assert.equal(process.umask(), 0o022); throw new Error('fixture failure'); }), /fixture failure/);
        assert.equal(process.umask(), 0o077);
});
