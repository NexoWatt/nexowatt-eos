'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { keygen, main, parseArgs } = require('../../tools/system/eos-base.cjs');
const { createBundle, inventory, stageBundle, sha256: hash } = require('../../runtime/release/bundle.cjs');
const { componentTreeDigest } = require('../../runtime/policy/admission.cjs');
const { validatePayload, copyDirectory } = require('../../tools/system/build-bundle.cjs');
const { checkInstalled } = require('../../runtime/release/installed-check.cjs');
const { applyToBuild } = require('../../runtime/controller-profile/transform.cjs');
const { prepareCatalog } = require('../../tools/system/prepare-catalog.cjs');
const { transformedComponent } = require('./fixtures/sbom-transform.cjs');
function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-release-cli-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const keys = path.join(root, 'keys'); keygen(keys);
    const payload = path.join(root, 'payload'); fs.mkdirSync(payload);
    fs.mkdirSync(path.join(payload, 'app/node_modules/iobroker.js-controller'), { recursive: true });
    const pkg = 'iobroker.js-controller', version = '7.2.2';
    fs.writeFileSync(path.join(payload, 'app/node_modules', pkg, 'package.json'), JSON.stringify({ name: pkg, version }));
    fs.mkdirSync(path.join(payload, 'app/node_modules/@iobroker/js-controller-cli'), { recursive: true });
    fs.writeFileSync(path.join(payload, 'app/node_modules/@iobroker/js-controller-cli/package.json'), JSON.stringify({ name: '@iobroker/js-controller-cli', version }));
    const originals = {
        'cjs-main': 'iobroker.js-controller/build/cjs/main.js', 'esm-main': 'iobroker.js-controller/build/esm/main.js',
        'cjs-setup': '@iobroker/js-controller-cli/build/cjs/lib/setup.js', 'esm-setup': '@iobroker/js-controller-cli/build/esm/lib/setup.js',
        'cjs-setupInstall': '@iobroker/js-controller-cli/build/cjs/lib/setup/setupInstall.js',
        'esm-setupInstall': '@iobroker/js-controller-cli/build/esm/lib/setup/setupInstall.js'
    };
    for (const [fixtureName, relative] of Object.entries(originals)) {
        const destination = path.join(payload, 'app/node_modules', relative);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.copyFileSync(path.join(__dirname, 'controller-profile-fixtures', `${fixtureName}.original.txt`), destination);
    }
    const transformation = applyToBuild(path.join(payload, 'app'));
    fs.writeFileSync(path.join(payload, 'app/package.json'), JSON.stringify({ name: 'fixture', version: '1.0.0', dependencies: { [pkg]: version } }));
    fs.writeFileSync(path.join(payload, 'app/package-lock.json'), JSON.stringify({ lockfileVersion: 3, packages: {
        '': { name: 'fixture', version: '1.0.0', dependencies: { [pkg]: version } },
        'node_modules/iobroker.js-controller': { version }, 'node_modules/@iobroker/js-controller-cli': { version } } }));
    fs.writeFileSync(path.join(payload, 'sbom.cdx.json'), JSON.stringify({ bomFormat: 'CycloneDX', specVersion: '1.5',
        metadata: { component: { name: 'fixture', version: '1.0.0', 'bom-ref': 'fixture@1.0.0' }, properties: [
            { name: 'eos:sbom:scope', value: 'installed-test-runtime-npm-tree' },
            { name: 'eos:sbom:package-json-sha256', value: hash(fs.readFileSync(path.join(payload, 'app/package.json'))) },
            { name: 'eos:sbom:package-lock-sha256', value: hash(fs.readFileSync(path.join(payload, 'app/package-lock.json'))) }] },
        components: [pkg, '@iobroker/js-controller-cli'].map(name => transformedComponent(name, version, transformation)),
        dependencies: [{ ref: 'fixture@1.0.0', dependsOn: [`${pkg}@${version}`] }] }));
    const sha256 = componentTreeDigest(inventory(path.join(payload, 'app/node_modules', pkg)).map(({path, size, sha256}) => ({ path, size, sha256 })));
    const catalog = { schemaVersion: 1, kind: 'eos-adapter-admission', catalogRevision: 1, entries: [{
        id: 'js-controller', package: pkg, version, sha256, digestKind: 'tree-sha256-v1', kind: 'core', required: true,
        review: { status: 'approved-test', evidenceId: 'unit-test-fixture' },
        permissions: { capabilities: ['state.read', 'state.write'], protocols: ['eos-redis-tls13-v1'],
            network: 'declared-endpoints-and-discovery', shellExec: false, additionalNpmModules: [], arbitraryCode: false },
        communication: 'eos-redis-tls13-v1' }] };
    fs.writeFileSync(path.join(payload, 'catalog.json'), JSON.stringify(catalog));
    const metadata = { schemaVersion: 1, product: 'nexowatt-eos', releaseVersion: '0.1.0-test.1', sequence: 1,
        profile: 'test', nodeVersion: process.versions.node, platforms: [`${process.platform}-${process.arch}`] };
    const bundle = path.join(root, 'bundle'), publicKey = fs.readFileSync(path.join(keys, 'release-public.pem'));
    const sign = () => createBundle({ sourceDirectory: payload, bundleDirectory: bundle, metadata,
        privateKey: fs.readFileSync(path.join(keys, 'release-private.pem')) });
    return { root, keys, payload, catalog, metadata, bundle, publicKey, sign };
}
test('key generator refuses overwrite and protects private material', t => {
    const f = fixture(t);
    assert.equal(fs.statSync(path.join(f.keys, 'release-private.pem')).mode & 0o777, 0o600);
    assert.throws(() => keygen(f.keys));
});
test('verify checks signed package identity, digest, policy and exact runtime', t => {
    const f = fixture(t); f.sign();
    const result = main(['verify', '--bundle', f.bundle, '--public-key', path.join(f.keys, 'release-public.pem')]);
    assert.equal(result.ok, true); assert.equal(result.selected[0].id, 'js-controller');
    assert.equal(result.productionReleaseApproved, false);
});
test('signed stale upstream SBOM cannot describe locally transformed runtime', t => {
    const f = fixture(t), file = path.join(f.payload, 'sbom.cdx.json');
    const bom = JSON.parse(fs.readFileSync(file));
    delete bom.components[0].modified;
    fs.writeFileSync(file, JSON.stringify(bom)); f.sign();
    assert.throws(() => main(['verify', '--bundle', f.bundle, '--public-key', path.join(f.keys, 'release-public.pem')]),
        { code: 'SBOM_TRANSFORM_BINDING' });
});
test('inventory generation never turns installed code into an approved adapter', t => {
    const f = fixture(t);
    const result = prepareCatalog(path.join(f.payload, 'app'));
    assert.equal(result.entries.length, 1);
    assert.equal(result.entries[0].sha256, f.catalog.entries[0].sha256);
    assert.equal(result.entries[0].review.status, 'pending');
    assert.equal(result.entries[0].review.evidenceId, null);
    assert.equal(result.entries[0].communication, 'legacy-unintegrated');
});
test('changed package tree and pending catalog do not become approved by signing', t => {
    const f = fixture(t);
    const manifest = () => ({ ...f.metadata, files: inventory(f.payload) });
    const file = path.join(f.payload, 'app/node_modules/iobroker.js-controller/package.json');
    fs.appendFileSync(file, ' ');
    assert.throws(() => validatePayload(f.payload, manifest()), e => e.code === 'BUILD_COMPONENT_DIGEST');
    fs.writeFileSync(file, JSON.stringify({ name: 'iobroker.js-controller', version: '7.2.2' }));
    f.catalog.entries[0].review = { status: 'pending', evidenceId: null };
    fs.writeFileSync(path.join(f.payload, 'catalog.json'), JSON.stringify(f.catalog));
    assert.throws(() => validatePayload(f.payload, manifest()), e => e.code === 'E_NOT_APPROVED');
});
test('URL/range root dependencies and lifecycle scripts are rejected', t => {
    const f = fixture(t), file = path.join(f.payload, 'app/package.json');
    for (const bad of [ { dependencies: { 'iobroker.js-controller': '^7.2.2' } },
        { dependencies: { 'iobroker.js-controller': '7.2.2' }, scripts: { postinstall: 'anything' } } ]) {
        fs.writeFileSync(file, JSON.stringify(bad));
        assert.throws(() => validatePayload(f.payload, { ...f.metadata, files: inventory(f.payload) }));
    }
});
test('installed check validates retained signature and detects changed release bytes', t => {
    const f = fixture(t); f.sign();
    const releases = path.join(f.root, 'releases'); fs.mkdirSync(releases);
    const staged = stageBundle({ bundleDirectory: f.bundle, publicKey: f.publicKey, releasesDirectory: releases });
    const evidencePath = path.join(f.root, 'verified', staged.releaseId); fs.mkdirSync(evidencePath, { recursive: true });
    for (const name of ['manifest.json', 'manifest.sig']) fs.copyFileSync(path.join(f.bundle, name), path.join(evidencePath, name));
    fs.writeFileSync(path.join(evidencePath, 'release-public.pem'), f.publicKey);
    const opts = { releasePath: staged.releasePath, evidencePath, ownerCheck: () => {} };
    assert.equal(checkInstalled(opts).ok, true);
    fs.appendFileSync(path.join(staged.releasePath, 'catalog.json'), ' ');
    assert.throws(() => checkInstalled(opts), e => e.code === 'INSTALLED_CONTENT');
});
test('bundle preparation removes npm executable links and rejects other symlinks', t => {
    const f = fixture(t), source = path.join(f.root, 'copy-source'); fs.mkdirSync(source);
    fs.mkdirSync(path.join(source, '.bin')); fs.symlinkSync('/etc/passwd', path.join(source, '.bin/unused'));
    fs.writeFileSync(path.join(source, 'regular'), 'ok');
    copyDirectory(source, path.join(f.root, 'copy-target'), true);
    assert.equal(fs.existsSync(path.join(f.root, 'copy-target/.bin')), false);
    fs.symlinkSync('/etc/passwd', path.join(source, 'bad'));
    assert.throws(() => copyDirectory(source, path.join(f.root, 'copy-target-bad'), true), e => e.code === 'BUILD_LINK_OR_SPECIAL_FILE');
});
test('CLI rejects duplicate, missing and extra options before work', () => {
    for (const args of [[], ['--bundle'], ['--bundle', 'x', '--bundle', 'y'], ['--bad', 'x', '--public-key', 'y']]) {
        assert.throws(() => parseArgs(args, ['--bundle', '--public-key']), e => e.code === 'EOS_USAGE');
    }
    assert.throws(() => main(['install', '--bundle', 'x', '--public-key', 'y', '--start', 'maybe']), e => e.code === 'EXPLICIT_START_FLAG_REQUIRED');
});
