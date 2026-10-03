'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const { inventory, sha256 } = require('../../runtime/release/bundle.cjs');
const { componentTreeDigest } = require('../../runtime/policy/admission.cjs');
const { applyToBuild } = require('../../runtime/controller-profile/transform.cjs');
const { transformedComponent } = require('../system/fixtures/sbom-transform.cjs');
const { checkRuntimeArchitecture } = require('../../tools/integration/check-runtime-architecture.cjs');
const { createTestArchive } = require('../../tools/integration/create-test-archive.cjs');

// A portable core-only release fixture exercises the real catalog, controller,
// SBOM and architecture gates. It is not the complete six-adapter product.
function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-payload-report-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const payload = path.join(root, 'payload'), app = path.join(payload, 'app');
    const write = (relative, value) => {
        const file = path.join(payload, relative);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value));
    };
    const pkg = 'iobroker.js-controller', cli = '@iobroker/js-controller-cli', version = '7.2.2';
    for (const name of [pkg, cli]) write(`app/node_modules/${name}/package.json`, { name, version });
    const originals = {
        'cjs-main': `${pkg}/build/cjs/main.js`, 'esm-main': `${pkg}/build/esm/main.js`,
        'cjs-setup': `${cli}/build/cjs/lib/setup.js`, 'esm-setup': `${cli}/build/esm/lib/setup.js`,
        'cjs-setupInstall': `${cli}/build/cjs/lib/setup/setupInstall.js`,
        'esm-setupInstall': `${cli}/build/esm/lib/setup/setupInstall.js`,
    };
    for (const [name, relative] of Object.entries(originals)) {
        write(`app/node_modules/${relative}`, fs.readFileSync(path.join(__dirname,
            '../system/controller-profile-fixtures', `${name}.original.txt`), 'utf8'));
    }
    const transformation = applyToBuild(app);
    write('app/package.json', { name: 'fixture', version: '1.0.0', dependencies: { [pkg]: version } });
    write('app/package-lock.json', { lockfileVersion: 3, packages: {
        '': { name: 'fixture', version: '1.0.0', dependencies: { [pkg]: version } },
        [`node_modules/${pkg}`]: { version }, [`node_modules/${cli}`]: { version },
    } });
    write('sbom.cdx.json', { bomFormat: 'CycloneDX', specVersion: '1.5',
        metadata: { component: { name: 'fixture', version: '1.0.0', 'bom-ref': 'fixture@1.0.0' }, properties: [
            { name: 'eos:sbom:scope', value: 'installed-test-runtime-npm-tree' },
            { name: 'eos:sbom:package-json-sha256', value: sha256(fs.readFileSync(path.join(app, 'package.json'))) },
            { name: 'eos:sbom:package-lock-sha256', value: sha256(fs.readFileSync(path.join(app, 'package-lock.json'))) },
        ] }, components: [pkg, cli].map(name => transformedComponent(name, version, transformation)),
        dependencies: [{ ref: 'fixture@1.0.0', dependsOn: [`${pkg}@${version}`] }],
    });
    const catalog = { schemaVersion: 1, kind: 'eos-adapter-admission', catalogRevision: 1, entries: [{
        id: 'js-controller', package: pkg, version,
        sha256: componentTreeDigest(inventory(path.join(app, 'node_modules', pkg))
            .map(({ path, size, sha256 }) => ({ path, size, sha256 }))),
        digestKind: 'tree-sha256-v1', kind: 'core', required: true,
        review: { status: 'approved-test', evidenceId: 'unit-test-fixture' },
        permissions: { capabilities: ['state.read', 'state.write'], protocols: ['eos-redis-tls13-v1'],
            network: 'declared-endpoints-and-discovery', shellExec: false, additionalNpmModules: [], arbitraryCode: false },
        communication: 'eos-redis-tls13-v1',
    }] };
    write('catalog.json', catalog);
    const metadata = { schemaVersion: 1, product: 'nexowatt-eos', releaseVersion: '0.1.0-test.1', sequence: 1,
        profile: 'test', nodeVersion: '24.21.0', platforms: ['linux-arm64'] };
    return { root, payload, app, metadata, catalog, write,
        manifest: () => ({ ...metadata, files: inventory(payload) }) };
}
function instrumentValidator() {
    const filename = path.resolve(__dirname, '../../tools/system/build-bundle.cjs');
    const loaded = new Module(filename, module), normalRequire = Module.createRequire(filename), calls = [];
    loaded.filename = filename; loaded.paths = Module._nodeModulePaths(path.dirname(filename));
    loaded.require = id => id === '../integration/check-runtime-architecture.cjs' ? {
        checkRuntimeArchitecture: options => {
            const report = checkRuntimeArchitecture(options);
            calls.push({ options, report });
            return report;
        },
    } : normalRequire(id);
    loaded._compile(fs.readFileSync(filename, 'utf8'), filename);
    return { ...loaded.exports, calls };
}

test('validator performs one real architecture scan and returns that same successful report', t => {
    const f = fixture(t), api = instrumentValidator(), result = api.validatePayload(f.payload, f.manifest());
    assert.equal(api.calls.length, 1);
    assert.equal(result.architectureReports.length, 1);
    assert.equal(result.architectureReports[0], api.calls[0].report);
    assert.equal(result.architectureReports[0].passed, true);
    assert.equal(result.architectureReports[0].platform, 'linux-arm64');
    assert.equal(result.architectureReports[0].target.nodeVersion, '24.21.0');
    assert.equal(result.architectureReports[0].packageLockSha256, sha256(fs.readFileSync(path.join(f.app, 'package-lock.json'))));
});
test('each advertised platform receives its own real mandatory scan', t => {
    const f = fixture(t), api = instrumentValidator(); f.metadata.platforms.push('linux-x64');
    const result = api.validatePayload(f.payload, f.manifest());
    assert.deepEqual(api.calls.map(row => row.options.platform), ['linux-arm64', 'linux-x64']);
    assert.deepEqual(result.architectureReports, api.calls.map(row => row.report));
});
test('unknown native input is rejected by the validator despite supplied extra skip/report arguments', t => {
    const f = fixture(t), api = instrumentValidator(); f.write('app/unreviewed.node', 'not a reviewed native library');
    assert.throws(() => api.validatePayload(f.payload, f.manifest(),
        { skipArchitecture: true, architectureReports: [{ passed: true }] }), { code: 'BUILD_ARCHITECTURE' });
    assert.equal(api.calls.length, 1);
    assert.equal(api.calls[0].report.passed, false);
});
test('catalog and SBOM failures still reject before the architecture gate', t => {
    const f = fixture(t), api = instrumentValidator();
    fs.appendFileSync(path.join(f.app, 'node_modules/iobroker.js-controller/package.json'), ' ');
    assert.throws(() => api.validatePayload(f.payload, f.manifest()), { code: 'BUILD_COMPONENT_DIGEST' });
    const g = fixture(t); const bom = JSON.parse(fs.readFileSync(path.join(g.payload, 'sbom.cdx.json')));
    delete bom.components[0].modified; g.write('sbom.cdx.json', bom);
    assert.throws(() => api.validatePayload(g.payload, g.manifest()), { code: 'SBOM_TRANSFORM_BINDING' });
    assert.equal(api.calls.length, 0);
});
test('public archive API signs a core fixture through all actual payload gates without validator injection', t => {
    const f = fixture(t), result = createTestArchive({ payloadDirectory: f.payload,
        archivePath: path.join(f.root, 'actual.tar.gz'), publicKeyPath: path.join(f.root, 'public.pem'), metadata: f.metadata });
    assert.equal(result.archiveReadbackVerified, true);
    assert.equal(result.privateKeyPersisted, false);
    assert.deepEqual(result.executablePaths, []);
});
