'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const bundle = require('../../runtime/release/bundle.cjs');

function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-bundle-test-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const source = path.join(root, 'source'), target = path.join(root, 'bundle');
    fs.mkdirSync(source); fs.mkdirSync(path.join(source, 'app'));
    fs.writeFileSync(path.join(source, 'app', 'index.cjs'), 'module.exports = 42;\n');
    fs.writeFileSync(path.join(source, 'catalog.json'), '{}\n');
    const pair = crypto.generateKeyPairSync('ed25519');
    const privateKey = pair.privateKey.export({ type: 'pkcs8', format: 'pem' });
    const publicKey = pair.publicKey.export({ type: 'spki', format: 'pem' });
    const metadata = { schemaVersion: 1, product: 'nexowatt-eos', releaseVersion: '0.1.0-test.1', sequence: 1,
        profile: 'test', nodeVersion: process.versions.node, platforms: [`${process.platform}-${process.arch}`] };
    const create = () => bundle.createBundle({ sourceDirectory: source, bundleDirectory: target, metadata, privateKey });
    const verify = extra => bundle.verifyBundle({ bundleDirectory: target, publicKey, ...extra });
    return { root, source, target, privateKey, publicKey, metadata, create, verify };
}
function code(expected) { return e => e instanceof bundle.BundleError && e.code === expected; }
test('signed offline bundle verifies and stages exactly the authenticated files', t => {
    const f = fixture(t), result = f.create();
    assert.equal(f.verify().releaseId, result.releaseId);
    const releases = path.join(f.root, 'releases'); fs.mkdirSync(releases);
    const staged = bundle.stageBundle({ bundleDirectory: f.target, publicKey: f.publicKey, releasesDirectory: releases });
    assert.equal(fs.readFileSync(path.join(staged.releasePath, 'app/index.cjs'), 'utf8'), 'module.exports = 42;\n');
    assert.equal(fs.statSync(path.join(staged.releasePath, 'app/index.cjs')).mode & 0o777, 0o644);
    assert.throws(() => bundle.stageBundle({ bundleDirectory: f.target, publicKey: f.publicKey, releasesDirectory: releases }), code('BUNDLE_EXISTS'));
});
test('wrong signer and modified signed manifest are rejected', t => {
    const f = fixture(t); f.create();
    const another = crypto.generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' });
    assert.throws(() => f.verify({ publicKey: another }), code('BUNDLE_SIGNATURE'));
    fs.appendFileSync(path.join(f.target, 'manifest.json'), ' ');
    assert.throws(() => f.verify(), code('BUNDLE_SIGNATURE'));
});
test('private signing key cannot be supplied as the public installation trust anchor', t => {
    const f = fixture(t); f.create();
    assert.throws(() => f.verify({ publicKey: f.privateKey }), code('BUNDLE_KEY'));
    assert.throws(() => bundle.validatePublicKey(f.privateKey), code('BUNDLE_KEY'));
});
test('tampered payload cannot be staged', t => {
    const f = fixture(t); f.create();
    fs.writeFileSync(path.join(f.target, 'payload/app/index.cjs'), 'module.exports = 13;\n');
    assert.throws(() => f.verify(), code('BUNDLE_CONTENT'));
});
test('unlisted payload, missing file, and unexpected bundle file are rejected', t => {
    const f = fixture(t); f.create();
    fs.writeFileSync(path.join(f.target, 'payload/extra.cjs'), 'x');
    assert.throws(() => f.verify(), code('BUNDLE_CONTENT'));
    fs.unlinkSync(path.join(f.target, 'payload/extra.cjs'));
    fs.unlinkSync(path.join(f.target, 'payload/catalog.json'));
    assert.throws(() => f.verify(), code('BUNDLE_CONTENT'));
    fs.writeFileSync(path.join(f.target, 'key.pem'), 'not trusted');
    assert.throws(() => f.verify(), code('BUNDLE_EXTRA_FILE'));
});
test('downgrade/replay, wrong platform and untested node are rejected', t => {
    const f = fixture(t); f.create();
    assert.throws(() => f.verify({ minimumSequence: 1 }), code('BUNDLE_ROLLBACK'));
    assert.throws(() => f.verify({ minimumSequence: 8 }), code('BUNDLE_ROLLBACK'));
    assert.throws(() => f.verify({ platform: 'windows-x64' }), code('BUNDLE_PLATFORM'));
    assert.throws(() => f.verify({ nodeVersion: '0.0.0' }), code('BUNDLE_NODE_VERSION'));
});
test('source and payload symlinks and hardlinks cannot introduce outside bytes', t => {
    const f = fixture(t);
    fs.symlinkSync('/etc/passwd', path.join(f.source, 'outside'));
    assert.throws(() => f.create(), code('BUNDLE_FILE'));
    fs.unlinkSync(path.join(f.source, 'outside'));
    fs.linkSync(path.join(f.source, 'app/index.cjs'), path.join(f.source, 'hardlink'));
    assert.throws(() => f.create(), code('BUNDLE_FILE'));
    fs.unlinkSync(path.join(f.source, 'hardlink')); f.create();
    fs.renameSync(path.join(f.target, 'payload/app'), path.join(f.root, 'relocated'));
    fs.symlinkSync(path.join(f.root, 'relocated'), path.join(f.target, 'payload/app'));
    assert.throws(() => f.verify(), code('BUNDLE_FILE'));
});
test('symlinked parent and setuid files are rejected', t => {
    const f = fixture(t);
    fs.symlinkSync(f.source, path.join(f.root, 'linked-source'));
    assert.throws(() => bundle.inventory(path.join(f.root, 'linked-source')), code('BUNDLE_DIRECTORY'));
    fs.chmodSync(path.join(f.source, 'app/index.cjs'), 0o4755);
    assert.throws(() => f.create(), code('BUNDLE_SIZE'));
});
test('path traversal, absolute/control/ambiguous paths are rejected', () => {
    for (const p of ['../x', '/x', 'a/../x', './a', 'a//b', 'a\\b', 'x\u0000', 'a:foo', '__proto__/x']) {
        assert.throws(() => bundle.safeRelative(p), code('BUNDLE_PATH'));
    }
});
test('manifest validates strict types, duplicate paths and finite bounds', t => {
    const f = fixture(t); f.create();
    const original = f.verify().manifest;
    for (const mutate of [m => { m.sequence = '1'; }, m => { m.files.push(m.files[0]); },
        m => { m.files[0].size = -1; }, m => { m.files[0].mode = 0o777; },
        m => { m.files[0].sha256 = 'g'.repeat(64); }, m => { m.files[0].unknown = true; },
        m => { m.profile = 'production'; }, m => { m.platforms.push(m.platforms[0]); },
        m => { m.releaseVersion = [m.releaseVersion]; }, m => { m.nodeVersion = [m.nodeVersion]; },
        m => { m.files[0].sha256 = [m.files[0].sha256]; }]) {
        const invalid = JSON.parse(JSON.stringify(original)); mutate(invalid);
        assert.throws(() => bundle.validateManifest(invalid), e => e instanceof bundle.BundleError);
    }
});
test('staging refuses a group/world writable release destination', t => {
    const f = fixture(t); f.create();
    const releases = path.join(f.root, 'releases'); fs.mkdirSync(releases); fs.chmodSync(releases, 0o777);
    assert.throws(() => bundle.stageBundle({ bundleDirectory: f.target, publicKey: f.publicKey, releasesDirectory: releases }), code('BUNDLE_UNTRUSTED_DESTINATION'));
});
test('signing never overwrites an earlier release or allows output inside source', t => {
    const f = fixture(t); f.create();
    assert.throws(() => f.create());
    assert.throws(() => bundle.createBundle({ sourceDirectory: f.source, bundleDirectory: path.join(f.source, 'output'),
        metadata: f.metadata, privateKey: f.privateKey }), code('BUNDLE_PATH'));
});
test('RSA signing keys are not silently accepted as Ed25519', t => {
    const f = fixture(t);
    const key = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem' });
    assert.throws(() => bundle.createBundle({ sourceDirectory: f.source, bundleDirectory: f.target,
        metadata: f.metadata, privateKey: key }), code('BUNDLE_KEY'));
});
