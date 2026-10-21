'use strict';
// Synthetic, real-file SBOM contracts plus isolated build-gate orchestration.
// No signed delivery, native controller, advisory scan or Pi execution is claimed.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { inventory, sha256 } = require('../../runtime/release/bundle.cjs');
const { verifySbomBinding, EMBEDDED } = require('../../runtime/release/sbom-binding.cjs');
const product = require('../../runtime/product/scope.cjs');
const backupState = require('../../runtime/controller-profile/backup-state.cjs');
const shutdown = require('../../runtime/controller-profile/adapter-shutdown.cjs');
const OWN_ASSEMBLY = 'authenticated-r9-tree-with-six-own-adapters-backup-state-and-adapter-shutdown-transforms';
const NETWORK_ASSEMBLY = 'authenticated-r9-app-reconstruction-with-r10-network-transition';
const R9_ASSEMBLY = 'authenticated-r8-tree-with-six-own-adapter-source-overlays';
const PREVIOUS = '97780e881765e2c9854e81ac7187b3ed120eccc8cc0dea0821492c9a54e23000';
const R10_RELEASE = '9073b20a1c9f54eb4870b3b37a4a8ef59c6916feb379234aa6d14986a3fc26f0';
const CLI = '@iobroker/js-controller-cli';
const SHUTDOWN_SOURCE = 'runtime/controller-profile/adapter-shutdown.cjs';
const OWNERS = product.SPECS.filter(spec => spec.source);
const properties = value => Object.entries(value).map(([name, value]) => ({ name, value }));
const digest = rows => sha256(Buffer.from(JSON.stringify(rows)));
const content = rows => rows.map(({ path, size, sha256 }) => ({ path, size, sha256 }));
function changeProperty(object, name, value) {
    object.properties = object.properties.filter(row => row.name !== name);
    if (value !== undefined) object.properties.push({ name, value });
}

function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-own-sbom-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const write = (relative, value) => {
        const file = path.join(root, relative);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value));
    };
    const packages = [...OWNERS.map(spec => ({ name: spec.package, version: spec.version })), { name: CLI, version: '7.2.2' }, { name: shutdown.PACKAGE, version: '7.2.2' }];
    const app = { name: 'own-sbom-fixture', version: '1.0.0', dependencies: Object.fromEntries(packages.map(pkg => [pkg.name, pkg.version])) };
    const lock = { lockfileVersion: 3, packages: { '': app } };
    for (const pkg of packages) {
        write(`app/node_modules/${pkg.name}/package.json`, pkg);
        lock.packages[`node_modules/${pkg.name}`] = { version: pkg.version };
    }
    write('app/package.json', app); write('app/package-lock.json', lock);
    const clientPaths = Object.entries(EMBEDDED).filter(([, name]) => name === '@nexowatt/eos-license-client').map(([relative]) => relative);
    for (const relative of clientPaths) {
        write(`app/${relative}/package.json`, { name: '@nexowatt/eos-license-client', version: '1.0.2' });
        write(`app/${relative}/index.js`, 'synthetic identical client fixture\n');
    }
    const paths = [`node_modules/${CLI}/build/cjs/lib/setup.js`, ...[...backupState.FILES, ...shutdown.FILES].map(row => row.relativePath)];
    for (const relative of paths) write(`app/${relative}`, `synthetic transformed fixture ${relative}\n`);
    write(SHUTDOWN_SOURCE, 'synthetic committed transform source\n');
    const files = inventory(root), appRows = files.filter(row => row.path.startsWith('app/')).map(row => ({ ...row, path: row.path.slice(4) }));
    const profile = { schemaVersion: 1, kind: 'eos-controller-profile-verification', controllerVersion: '7.2.2', productionApproved: false,
        files: paths.map(relativePath => ({ relativePath, sha256: appRows.find(row => row.path === relativePath).sha256 })) };
    const components = packages.map(pkg => ({ name: pkg.name, version: pkg.version, 'bom-ref': pkg.name,
        modified: true, pedigree: { ancestors: [{ name: pkg.name, version: pkg.version }] }, properties: [] }));
    for (const spec of [...OWNERS, { package: shutdown.PACKAGE }]) {
        const relative = `node_modules/${spec.package}`, tree = appRows.filter(row => row.path.startsWith(relative + '/'));
        const component = components.find(row => row.name === spec.package);
        component.properties = properties({ 'eos:derivative:installed-path': relative,
            'eos:derivative:tree-sha256': digest(content(tree)), 'eos:derivative:mode-tree-sha256': digest(tree) });
        if (spec.package === shutdown.PACKAGE) component.properties.push(...properties({
            'eos:transform:source-path': SHUTDOWN_SOURCE,
            'eos:transform:source-sha256': files.find(row => row.path === SHUTDOWN_SOURCE).sha256 }));
    }
    const cli = components.find(row => row.name === CLI);
    for (const name of [CLI, shutdown.PACKAGE]) {
        const table = profile.files.filter(row => row.relativePath.startsWith('node_modules/' + name + '/')).sort((a, b) => a.relativePath < b.relativePath ? -1 : 1);
        components.find(row => row.name === name).properties.push(...properties({ 'eos:transform:file-table-sha256': digest(table) }));
    }
    const dependencies = [{ ref: `${app.name}@${app.version}`, dependsOn: packages.map(pkg => pkg.name) },
        ...packages.map(pkg => ({ ref: pkg.name, dependsOn: [] }))];
    for (const relative of clientPaths) {
        const prefix = relative + '/', tree = appRows.filter(row => row.path.startsWith(prefix))
            .map(row => ({ path: row.path.slice(prefix.length), size: row.size, sha256: row.sha256 }));
        const ref = `eos-embedded:${relative}`;
        components.push({ name: '@nexowatt/eos-license-client', version: '1.0.2', 'bom-ref': ref,
            properties: properties({ 'eos:scope': 'embedded-package-files-observed-in-runtime-tree', 'eos:installed-path': relative,
                'eos:manifest-sha256': tree.find(row => row.path === 'package.json').sha256, 'eos:tree-sha256': digest(tree) }) });
        dependencies.find(row => row.ref === relative.split('/')[1]).dependsOn.push(ref);
        dependencies.push({ ref, dependsOn: [] });
    }
    const bom = { bomFormat: 'CycloneDX', specVersion: '1.5', metadata: {
        component: { name: app.name, version: app.version, 'bom-ref': `${app.name}@${app.version}` },
        properties: properties({ 'eos:sbom:scope': 'installed-test-runtime-npm-tree',
            'eos:sbom:package-json-sha256': files.find(row => row.path === 'app/package.json').sha256,
            'eos:sbom:package-lock-sha256': files.find(row => row.path === 'app/package-lock.json').sha256,
            'eos:sbom:assembly': OWN_ASSEMBLY, 'eos:sbom:previous-release-id': PREVIOUS,
            'eos:sbom:execution-scope': product.OWN_ADAPTER_TEST,
            'eos:sbom:actual-app-file-table-sha256': digest(content(appRows)), 'eos:sbom:actual-app-mode-table-sha256': digest(appRows),
            'eos:sbom:application-unchanged': 'false', 'eos:sbom:fresh-npm-resolution': 'false', 'eos:sbom:fresh-vulnerability-scan': 'false' }) },
    components, dependencies };
    const check = (release, selectedProfile) => {
        write('sbom.cdx.json', bom);
        return verifySbomBinding(root, inventory(root), selectedProfile, release);
    };
    return { root, bom, profile, cli, adapter: components.find(row => row.name === shutdown.PACKAGE), write, check };
}

function networkFixture(t) {
    const f = fixture(t);
    for (const [name, value] of Object.entries({ 'eos:sbom:assembly': NETWORK_ASSEMBLY,
        'eos:sbom:base-release-id': PREVIOUS, 'eos:sbom:previous-release-id': R10_RELEASE,
        'eos:sbom:target-sequence': '14' })) changeProperty(f.bom.metadata, name, value);
    return f;
}

test('managed assembly binds independent fresh/follow-up sequence, reconstructed base and current bytes', t => {
    for (const sequence of [15, 16, 23]) {
        const f = networkFixture(t);
        changeProperty(f.bom.metadata, 'eos:sbom:assembly', 'authenticated-r9-app-reconstruction-with-managed-updates');
        changeProperty(f.bom.metadata, 'eos:sbom:target-sequence', String(sequence));
        assert.equal(f.check({ sequence }, f.profile).embeddedPackages, 6);
        assert.throws(() => f.check({ sequence: sequence + 1 }, f.profile), { code: 'SBOM_DERIVATIVE_BINDING' });
        changeProperty(f.bom.metadata, 'eos:sbom:base-release-id', '0'.repeat(64));
        assert.throws(() => f.check({ sequence }, f.profile), { code: 'SBOM_DERIVATIVE_BINDING' });
    }
});

test('own assembly binds six own adapters, six identical clients and exact CLI/core transforms', t => {
    const f = fixture(t);
    assert.deepEqual(f.check({ sequence: 13 }, f.profile), { installedPackages: 8, uniqueNpmComponents: 8, embeddedPackages: 6,
        scope: 'npm-and-explicit-vendored-packages', fullOperatingSystemInventory: false });
    assert.equal(f.check(undefined, f.profile).embeddedPackages, 6, 'standalone own marker triggers same derivative checks');
    for (const row of backupState.FILES) assert.ok(f.profile.files.some(file => file.relativePath === row.relativePath));
});

test('verified sequence 13 requires own assembly even if its marker is removed or replaced with R9', t => {
    for (const assembly of [undefined, R9_ASSEMBLY, 'invented']) {
        const f = fixture(t); changeProperty(f.bom.metadata, 'eos:sbom:assembly', assembly);
        assert.throws(() => f.check({ sequence: 13 }, f.profile), { code: 'SBOM_DERIVATIVE_BINDING' });
    }
});

test('own assembly cannot be relabeled as sequence12 or other signed release context', t => {
    for (const sequence of [1, 11, 12, 14]) {
        const f = fixture(t);
        assert.throws(() => f.check({ sequence }, f.profile), { code: 'SBOM_DERIVATIVE_BINDING' });
    }
});

test('network assembly binds sequence14 to distinct R9 reconstruction and R10 transition pins', t => {
    const f = networkFixture(t);
    assert.deepEqual(f.check({ sequence: 14 }, f.profile), { installedPackages: 8, uniqueNpmComponents: 8, embeddedPackages: 6,
        scope: 'npm-and-explicit-vendored-packages', fullOperatingSystemInventory: false });
});

test('sequence14 requires the new network marker and rejects missing, old or invented markers', t => {
    for (const assembly of [undefined, OWN_ASSEMBLY, R9_ASSEMBLY, 'invented']) {
        const f = networkFixture(t); changeProperty(f.bom.metadata, 'eos:sbom:assembly', assembly);
        assert.throws(() => f.check({ sequence: 14 }, f.profile), { code: 'SBOM_DERIVATIVE_BINDING' });
    }
});

test('network marker rejects missing signed context, downgrade and later sequence reuse', t => {
    for (const release of [undefined, { sequence: 1 }, { sequence: 12 }, { sequence: 13 }, { sequence: 15 }]) {
        const f = networkFixture(t);
        assert.throws(() => f.check(release, f.profile), { code: 'SBOM_DERIVATIVE_BINDING' });
    }
});

test('network profile requires exact reconstruction, predecessor, target and execution scope', t => {
    for (const [name, invalid] of [['eos:sbom:base-release-id', R10_RELEASE],
        ['eos:sbom:previous-release-id', PREVIOUS], ['eos:sbom:target-sequence', '13'],
        ['eos:sbom:execution-scope', 'production']]) {
        for (const value of [undefined, invalid]) {
            const f = networkFixture(t); changeProperty(f.bom.metadata, name, value);
            assert.throws(() => f.check({ sequence: 14 }, f.profile), { code: 'SBOM_DERIVATIVE_BINDING' }, name);
        }
    }
});

test('network profile retains app, owner, mode, scan and exact transform binding gates', t => {
    for (const mutate of [
        f => changeProperty(f.bom.metadata, 'eos:sbom:actual-app-file-table-sha256', '0'.repeat(64)),
        f => changeProperty(f.bom.metadata, 'eos:sbom:actual-app-mode-table-sha256', '0'.repeat(64)),
        f => changeProperty(f.bom.metadata, 'eos:sbom:application-unchanged', 'true'),
        f => changeProperty(f.bom.metadata, 'eos:sbom:fresh-npm-resolution', 'true'),
        f => changeProperty(f.bom.metadata, 'eos:sbom:fresh-vulnerability-scan', 'true'),
        f => changeProperty(f.bom.components[0], 'eos:derivative:tree-sha256', '0'.repeat(64)),
        f => changeProperty(f.bom.components[0], 'eos:derivative:mode-tree-sha256', '0'.repeat(64)),
        f => { f.bom.components[0].hashes = []; },
        f => changeProperty(f.adapter, 'eos:transform:source-sha256', '0'.repeat(64)),
        f => changeProperty(f.adapter, 'eos:transform:file-table-sha256', '0'.repeat(64)),
        f => { f.profile.files = f.profile.files.filter(row => row.relativePath !== shutdown.FILES[0].relativePath); },
    ]) {
        const f = networkFixture(t); mutate(f);
        assert.throws(() => f.check({ sequence: 14 }, f.profile));
    }
});

test('new standalone marker requires exact predecessor, test scope and truthful scan/resolution claims', t => {
    for (const [name, value] of [['eos:sbom:previous-release-id', 'a'.repeat(64)],
        ['eos:sbom:previous-release-id', undefined], ['eos:sbom:execution-scope', 'production'],
        ['eos:sbom:execution-scope', undefined], ['eos:sbom:application-unchanged', 'true'],
        ['eos:sbom:fresh-npm-resolution', 'true'], ['eos:sbom:fresh-vulnerability-scan', 'true']]) {
        const f = fixture(t); changeProperty(f.bom.metadata, name, value);
        assert.throws(() => f.check(undefined, f.profile), { code: 'SBOM_DERIVATIVE_BINDING' }, name);
    }
});

test('own derivative rejects stale content/mode digests, duplicate claims and misleading package archive hashes', t => {
    for (const mutate of [f => changeProperty(f.bom.metadata, 'eos:sbom:actual-app-file-table-sha256', '0'.repeat(64)),
        f => changeProperty(f.bom.metadata, 'eos:sbom:actual-app-mode-table-sha256', '0'.repeat(64)),
        f => { f.bom.components[0].hashes = []; }, f => { delete f.bom.components[0].modified; }]) {
        const f = fixture(t); mutate(f);
        assert.throws(() => f.check({ sequence: 13 }, f.profile), { code: 'SBOM_DERIVATIVE_BINDING' });
    }
    const f = fixture(t); f.bom.metadata.properties.push({ name: 'eos:sbom:assembly', value: R9_ASSEMBLY });
    assert.throws(() => f.check({ sequence: 13 }, f.profile), { code: 'SBOM_PROPERTIES' });
});

test('new CLI transform files require updated exact pedigree table, not old hash or upstream archive identity', t => {
    for (const mutate of [f => changeProperty(f.cli, 'eos:transform:file-table-sha256', digest(f.profile.files.slice(0, 1))),
        f => { f.cli.hashes = [{ alg: 'SHA-512', content: 'a'.repeat(128) }]; },
        f => { f.cli.pedigree.ancestors[0].version = '7.2.1'; }]) {
        const f = fixture(t); mutate(f);
        assert.throws(() => f.check({ sequence: 13 }, f.profile), { code: 'SBOM_TRANSFORM_BINDING' });
    }
    const f = fixture(t); f.profile.files[1].sha256 = '0'.repeat(64);
    assert.throws(() => f.check({ sequence: 13 }, f.profile), { code: 'SBOM_TRANSFORM_PROFILE' });
});

function payloadGate(scope) {
    // Exercise the real coordinator, replacing individual heavy verification
    // boundaries. This proves ordering/arguments, not their cryptographic result.
    const filename = path.resolve(__dirname, '../../tools/system/build-bundle.cjs');
    const localRequire = createRequire(filename), module = { exports: {} }, calls = [];
    const specs = product.specsFor(scope), hash = 'a'.repeat(64);
    const catalog = { entries: specs.map(spec => ({ id: spec.id, package: spec.package, version: spec.version,
        kind: spec.kind, required: spec.execute, review: { status: spec.execute ? 'approved-test' : 'pending' },
        communication: 'eos-postgresql-mtls13-v1', sha256: hash })) };
    const pg = ['@iobroker/db-objects-postgresql', '@iobroker/db-states-postgresql', '@nexowatt/eos-postgresql-store'];
    const app = { dependencies: Object.fromEntries(specs.map(spec => [spec.package, spec.version])) };
    const lock = { lockfileVersion: 3, packages: { '': app } };
    const data = new Map([['catalog.json', catalog], ['app/package.json', app], ['app/package-lock.json', lock]]);
    for (const spec of specs) {
        const pkg = { name: spec.package, version: spec.version };
        if (spec.id === 'js-controller') pkg.dependencies = Object.fromEntries(pg.map(name => [name, '0.1.0-dev.2']));
        data.set(`app/node_modules/${spec.package}/package.json`, pkg);
        lock.packages[`node_modules/${spec.package}`] = pkg;
    }
    for (const name of pg) {
        const pkg = { name, version: '0.1.0-dev.2' };
        data.set(`app/node_modules/${name}/package.json`, pkg); lock.packages[`node_modules/${name}`] = pkg;
    }
    const profile = { files: [{ relativePath: `node_modules/${CLI}/build/cjs/lib/setup.js`, sha256: hash }] };
    const mocks = {
        '../../runtime/release/bundle.cjs': { sha256: () => hash, readFileLimited(file) {
            assert.ok(file.startsWith('/synthetic/')); const value = data.get(file.slice('/synthetic/'.length));
            assert.notEqual(value, undefined, file); return { bytes: Buffer.from(JSON.stringify(value)) };
        } },
        '../../runtime/policy/admission.cjs': { parseCatalog: JSON.parse, componentTreeDigest: () => hash,
            planAdmission: () => ({ quarantine: [], selected: [] }) },
        '../../runtime/controller-profile/transform.cjs': { verifyBuildProfile: () => structuredClone(profile) },
        '../../runtime/controller-profile/backup-state.cjs': { verifyBuild(app) { calls.push(['backup', app]); return { files: backupState.FILES }; } },
        '../../runtime/controller-profile/adapter-shutdown.cjs': { verifyBuild(app) { calls.push(['shutdown', app]); return { files: shutdown.FILES }; } },
        '../../runtime/release/sbom-binding.cjs': { verifySbomBinding(...args) { calls.push(['sbom', args]); return {}; } },
        '../integration/check-runtime-architecture.cjs': { checkRuntimeArchitecture: () => ({ passed: true }) },
        '../../runtime/product/scope.cjs': { ...product, inspectApp: () => [] },
    };
    vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { module, exports: module.exports, Buffer, process,
        __dirname: path.dirname(filename), require: name => Object.hasOwn(mocks, name) ? mocks[name] : localRequire(name) }, { filename });
    const manifest = { product: 'nexowatt-eos', releaseVersion: '0.2.0-test.3', profile: 'test', nodeVersion: '24.21.0',
        sequence: scope === product.OWN_ADAPTER_TEST ? 13 : 12, platforms: ['linux-arm64'], files: [] };
    module.exports.validatePayload('/synthetic', manifest);
    return calls;
}

test('real payload coordinator appends all independently verified backup and shutdown transforms before SBOM validation only in own scope', () => {
    const calls = payloadGate(product.OWN_ADAPTER_TEST);
    assert.equal(calls[0][0], 'backup'); assert.equal(calls[0][1], '/synthetic/app');
    assert.equal(calls[1][0], 'shutdown'); assert.equal(calls[1][1], '/synthetic/app'); assert.equal(calls[2][0], 'sbom');
    const [, , profile, release] = calls[2][1];
    assert.equal(release.sequence, 13);
    for (const row of [...backupState.FILES, ...shutdown.FILES]) assert.equal(profile.files.filter(file => file.relativePath === row.relativePath && file.sha256 === row.sha256).length, 1);
    const legacy = payloadGate(product.MANAGEMENT_TEST);
    assert.equal(legacy.length, 1); assert.equal(legacy[0][0], 'sbom');
    assert.equal(legacy[0][1][2].files.some(file => [...backupState.FILES, ...shutdown.FILES].some(row => row.relativePath === file.relativePath)), false);
});

test('shutdown derivative source and exact two-file transform profile cannot be removed or widened', t => {
    for (const mutate of [f => changeProperty(f.adapter, 'eos:transform:source-sha256', 'f'.repeat(64)),
        f => changeProperty(f.adapter, 'eos:transform:source-path', 'runtime/arbitrary.cjs'),
        f => changeProperty(f.adapter, 'eos:transform:file-table-sha256', 'f'.repeat(64)),
        f => { f.adapter.hashes = [{ alg: 'SHA-256', content: 'f'.repeat(64) }]; },
        f => { f.profile.files = f.profile.files.filter(row => row.relativePath !== shutdown.FILES[0].relativePath); },
        f => { const relativePath = 'node_modules/' + shutdown.PACKAGE + '/build/cjs/lib/arbitrary.js';
            f.write('app/' + relativePath, 'unreviewed'); f.profile.files.push({ relativePath, sha256: sha256(Buffer.from('unreviewed')) }); }]) {
        const f = fixture(t); mutate(f); assert.throws(() => f.check({ sequence: 13 }, f.profile));
    }
});
