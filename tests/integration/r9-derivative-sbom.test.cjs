'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { inventory, sha256 } = require('../../runtime/release/bundle.cjs');
const { verifySbomBinding, EMBEDDED } = require('../../runtime/release/sbom-binding.cjs');
const { bindDerivative, OWNERS, R8_EEBUS_SOURCE_LOCK } = require('../../tools/integration/bind-r9-derivative-sbom.cjs');
const clientPaths = Object.keys(EMBEDDED).filter(name => EMBEDDED[name] === '@nexowatt/eos-license-client');
const props = object => Object.fromEntries((object.properties || []).map(row => [row.name, row.value]));
function fixture(t) {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-r9-bom-'));
    t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
    const previousApp = path.join(temp, 'base'), payload = path.join(temp, 'payload'), app = path.join(payload, 'app');
    const write = (root, relative, value) => { const file = path.join(root, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value)); };
    const pkg = { name: 'fixture-eos', version: '1.0.0', dependencies: Object.fromEntries(OWNERS.map(spec => [spec.package, spec.version])) };
    pkg.dependencies.external = '1.0.0';
    const lock = { lockfileVersion: 3, packages: { '': pkg, 'node_modules/external': { version: '1.0.0' } } };
    const components = [], dependencies = [{ ref: 'fixture-eos@1.0.0', dependsOn: [...OWNERS.map(spec => spec.package), 'external'] }];
    for (const spec of OWNERS) {
        const relative = `node_modules/${spec.package}`;
        const manifest = { name: spec.package, version: spec.version, main: spec.main, dependencies: { external: '1.0.0' },
            devDependencies: { compiler: '1.0.0' }, engines: { node: ['iobroker.eebus', 'iobroker.ocpp21'].includes(spec.package) ? '>=20' : '>=22' }, files: ['old.js'], scripts: { test: 'node old.js' } };
        write(previousApp, relative + '/package.json', manifest);
        write(previousApp, relative + '/' + spec.main, 'old source');
        write(previousApp, relative + '/package-lock.json', { name: spec.package, version: spec.version, lockfileVersion: 3, packages: { '': manifest, 'node_modules/mocha': { version: '11.8.0' } } });
        lock.packages[relative] = { version: spec.version };
        components.push({ type: 'application', name: spec.package, version: spec.version, 'bom-ref': spec.package, hashes: [{ alg: 'SHA-512', content: 'a'.repeat(128) }] });
        dependencies.push({ ref: spec.package, dependsOn: ['external'] });
    }
    write(previousApp, 'package.json', pkg); write(previousApp, 'package-lock.json', lock);
    write(previousApp, 'node_modules/external/package.json', { name: 'external', version: '1.0.0' });
    write(previousApp, 'node_modules/external/index.js', 'unchanged library');
    components.push({ type: 'library', name: 'external', version: '1.0.0', 'bom-ref': 'external' });
    dependencies.push({ ref: 'external', dependsOn: [] });
    for (const relative of clientPaths.slice(0, 2)) {
        write(previousApp, relative + '/package.json', { name: '@nexowatt/eos-license-client', version: '1.0.1' });
        write(previousApp, relative + '/index.js', 'old client');
        const rows = inventory(previousApp).filter(row => row.path.startsWith(relative + '/')).map(row => ({ path: row.path.slice(relative.length + 1), size: row.size, sha256: row.sha256 }));
        const ref = 'eos-embedded:' + relative;
        components.push({ type: 'library', name: '@nexowatt/eos-license-client', version: '1.0.1', 'bom-ref': ref,
            properties: Object.entries({ 'eos:scope': 'embedded-package-files-observed-in-runtime-tree', 'eos:installed-path': relative,
                'eos:manifest-sha256': rows.find(row => row.path === 'package.json').sha256, 'eos:tree-sha256': sha256(Buffer.from(JSON.stringify(rows))) }).map(([name, value]) => ({ name, value })) });
        dependencies.find(row => row.ref === relative.split('/')[1]).dependsOn.push(ref);
        dependencies.push({ ref, dependsOn: [] });
    }
    const previousManifest = { sequence: 11, files: inventory(previousApp).map(row => ({ ...row, path: 'app/' + row.path })) };
    const previousSbom = { bomFormat: 'CycloneDX', specVersion: '1.5', serialNumber: 'urn:uuid:11111111-1111-1111-1111-111111111111', version: 1,
        metadata: { timestamp: '2026-10-05T00:00:00Z', component: { type: 'application', name: pkg.name, version: pkg.version, 'bom-ref': 'fixture-eos@1.0.0' },
            properties: [{ name: 'eos:sbom:scope', value: 'installed-test-runtime-npm-tree' },
                { name: 'eos:sbom:package-json-sha256', value: sha256(fs.readFileSync(path.join(previousApp, 'package.json'))) },
                { name: 'eos:sbom:package-lock-sha256', value: sha256(fs.readFileSync(path.join(previousApp, 'package-lock.json'))) }] }, components, dependencies };
    write(temp, 'sbom.cdx.json', previousSbom);
    const sbomBytes = fs.readFileSync(path.join(temp, 'sbom.cdx.json'));
    previousManifest.files.push({ path: 'sbom.cdx.json', size: sbomBytes.length, sha256: sha256(sbomBytes), mode: 0o644 });
    fs.mkdirSync(payload); fs.cpSync(previousApp, app, { recursive: true });
    for (const relative of clientPaths) {
        write(app, relative + '/package.json', { name: '@nexowatt/eos-license-client', version: '1.0.2' });
        write(app, relative + '/index.js', 'new identical local client');
    }
    const input = { app, previousApp, previousManifest, previousSbom, previousReleaseId: 'a'.repeat(64), sourceCommit: 'b'.repeat(40), timestamp: '2026-10-05T12:00:00Z' };
    const update = (relative, modify) => { const value = JSON.parse(fs.readFileSync(path.join(app, relative))); modify(value); write(app, relative, value); };
    const check = (bom, release) => { write(payload, 'sbom.cdx.json', bom); return verifySbomBinding(payload, inventory(payload), undefined, release); };
    return { input, write, update, check, payload };
}
test('all six owned derivatives and six distinct embedded instances bind the real tree and modes', t => {
    const f = fixture(t), original = structuredClone(f.input.previousSbom), result = bindDerivative(f.input);
    assert.equal(result.evidence.derivatives.length, 6);
    assert.equal(result.evidence.embeddedPackages.length, 6);
    assert.equal(result.evidence.thirdPartyInstalledBytesAndModesUnchanged, true);
    assert.equal(result.evidence.npmResolutionPerformed, false); assert.equal(result.evidence.vulnerabilityScanPerformed, false);
    assert.equal(result.bom.serialNumber, undefined); assert.deepEqual(f.input.previousSbom, original);
    for (const spec of OWNERS) {
        const component = result.bom.components.find(row => row.name === spec.package);
        assert.equal(component.modified, true); assert.equal(component.hashes, undefined);
        assert.deepEqual(component.pedigree.ancestors[0].hashes, original.components.find(row => row.name === spec.package).hashes);
        assert.match(props(component)['eos:derivative:tree-sha256'], /^[a-f0-9]{64}$/);
        assert.match(props(component)['eos:derivative:mode-tree-sha256'], /^[a-f0-9]{64}$/);
    }
    assert.equal(f.check(result.bom).embeddedPackages, 6);
    for (const relative of clientPaths) {
        const ref = 'eos-embedded:' + relative, owner = relative.split('/')[1];
        assert.ok(result.bom.dependencies.find(row => row.ref === owner).dependsOn.includes(ref));
        assert.deepEqual(result.bom.dependencies.find(row => row.ref === ref).dependsOn, []);
    }
});
test('source files and scripts metadata can change without resolving installed dependencies', t => {
    const f = fixture(t);
    f.update('node_modules/iobroker.nexowatt-ui/package.json', pkg => { pkg.files.push('packages/'); pkg.scripts.test = 'node check.cjs'; });
    assert.equal(bindDerivative(f.input).evidence.dependencyLockUnchanged, true);
});
test('identity, main, prod/optional/peer dependencies, overrides and unapproved metadata are immutable', t => {
    for (const [key, value] of [['name', 'other'], ['version', '99.0.0'], ['main', 'other.js'], ['dependencies', { external: '2' }],
        ['optionalDependencies', { injected: '1' }], ['peerDependencies', { injected: '1' }], ['overrides', { external: '2' }], ['description', 'unapproved']]) {
        const f = fixture(t); f.update('node_modules/iobroker.eebus/package.json', pkg => { pkg[key] = value; });
        assert.throws(() => bindDerivative(f.input), error => ['R9_SBOM_COMPONENT_IDENTITY', 'R9_SBOM_PACKAGE_CONTRACT'].includes(error.code), key);
    }
});
test('only exact reviewed protocol engine narrowing and pre-existing source-lock mocha declaration are allowed', t => {
    const f = fixture(t);
    for (const name of ['iobroker.eebus', 'iobroker.ocpp21']) {
        f.update(`node_modules/${name}/package.json`, pkg => { pkg.engines.node = '>=22.0.0 <23 || >=24.0.0 <25'; });
    }
    f.update('node_modules/iobroker.eebus/package.json', pkg => { pkg.devDependencies.mocha = '11.8.0'; });
    const result = bindDerivative(f.input);
    assert.equal(result.evidence.derivatives.find(row => row.package === 'iobroker.eebus').metadataExceptions.length, 2);
    f.update('node_modules/iobroker.eebus/package.json', pkg => { pkg.engines.node = '>=18'; });
    assert.throws(() => bindDerivative(f.input), { code: 'R9_SBOM_ENGINE_CHANGE' });
    const g = fixture(t); g.update('node_modules/iobroker.eebus/package.json', pkg => { pkg.devDependencies.mocha = '11.9.0'; });
    assert.throws(() => bindDerivative(g.input), { code: 'R9_SBOM_PACKAGE_CONTRACT' });
});
test('root lock, unrelated package bytes/modes and nested npm boundaries cannot be changed', t => {
    const f = fixture(t); f.write(f.input.app, 'package-lock.json', '{}');
    assert.throws(() => bindDerivative(f.input), { code: 'R9_SBOM_DEPENDENCY_CHANGE' });
    const g = fixture(t); f.write(g.input.app, 'node_modules/external/index.js', 'modified');
    assert.throws(() => bindDerivative(g.input), { code: 'R9_SBOM_PACKAGE_SCOPE' });
    const h = fixture(t); fs.chmodSync(path.join(h.input.app, 'node_modules/external/index.js'), 0o755);
    assert.throws(() => bindDerivative(h.input), { code: 'R9_SBOM_PACKAGE_SCOPE' });
    const k = fixture(t); k.write(k.input.app, 'node_modules/iobroker.eebus/lib/node_modules/hidden/index.js', 'code');
    assert.throws(() => bindDerivative(k.input), { code: 'R9_SBOM_NESTED_DEPENDENCY_CHANGE' });
});
test('an unshipped EEBUS source lock requires the exact separately pinned source evidence', t => {
    const f = fixture(t), relative = 'node_modules/iobroker.eebus/package-lock.json';
    for (const root of [f.input.previousApp, f.input.app]) fs.rmSync(path.join(root, relative));
    f.input.previousManifest.files = f.input.previousManifest.files.filter(row => row.path !== 'app/' + relative);
    f.input.previousSbom.metadata.properties.push({ name: 'eos:sbom:source-commit', value: R8_EEBUS_SOURCE_LOCK.sourceCommit });
    const oldSbom = path.join(path.dirname(f.input.previousApp), 'sbom.cdx.json');
    fs.writeFileSync(oldSbom, JSON.stringify(f.input.previousSbom));
    const bytes = fs.readFileSync(oldSbom), row = f.input.previousManifest.files.find(row => row.path === 'sbom.cdx.json');
    Object.assign(row, { size: bytes.length, sha256: sha256(bytes) });
    f.update('node_modules/iobroker.eebus/package.json', pkg => { pkg.devDependencies.mocha = '11.8.0'; });
    assert.throws(() => bindDerivative(f.input), { code: 'R9_SBOM_SOURCE_LOCK_EVIDENCE' });
    // Correct-looking Mocha metadata cannot substitute for the pinned Git blob.
    const forged = Buffer.from(JSON.stringify({ packages: { 'node_modules/mocha': { version: '11.8.0' } } }));
    assert.throws(() => bindDerivative({ ...f.input, previousEebusSourceLock: forged }), { code: 'R9_SBOM_SOURCE_LOCK_EVIDENCE' });
});
test('embedded third-party files, old metadata tampering and source-lock contract drift are refused', t => {
    const f = fixture(t); f.write(f.input.app, 'node_modules/iobroker.eos-admin/adminWww/lib/js/crypto-js/index.js', 'modified');
    assert.throws(() => bindDerivative(f.input), { code: 'R9_SBOM_THIRD_PARTY_CHANGE' });
    const g = fixture(t); g.write(g.input.previousApp, 'node_modules/iobroker.eebus/package.json', '{}');
    assert.throws(() => bindDerivative(g.input), { code: 'R9_SBOM_BASE_CHANGED' });
    const h = fixture(t); h.update('node_modules/iobroker.eebus/package-lock.json', lock => { lock.packages[''].dependencies = { injected: '1' }; });
    assert.throws(() => bindDerivative(h.input), { code: 'R9_SBOM_SOURCE_LOCK_CONTRACT' });
});
test('all six client copies require 1.0.2, identical bytes and no unbound dependencies', t => {
    const f = fixture(t); f.update(clientPaths[2] + '/package.json', pkg => { pkg.version = '1.0.1'; });
    assert.throws(() => bindDerivative(f.input), { code: 'R9_SBOM_EMBEDDED_IDENTITY' });
    const g = fixture(t); g.write(g.input.app, clientPaths[2] + '/index.js', 'drift');
    assert.throws(() => bindDerivative(g.input), { code: 'R9_SBOM_CLIENT_COPY_DRIFT' });
    const h = fixture(t); h.update(clientPaths[2] + '/package.json', pkg => { pkg.peerDependencies = { injected: '1' }; });
    assert.throws(() => bindDerivative(h.input), { code: 'R9_SBOM_EMBEDDED_IDENTITY' });
});
test('offline gate rejects stale derivative hashes, false scan claims and missing embedded parent relations', t => {
    const f = fixture(t), result = bindDerivative(f.input);
    const owner = result.bom.components.find(row => row.name === OWNERS[0].package);
    owner.properties.find(row => row.name === 'eos:derivative:tree-sha256').value = '0'.repeat(64);
    assert.throws(() => f.check(result.bom), { code: 'SBOM_DERIVATIVE_BINDING' });
    const g = fixture(t), correct = bindDerivative(g.input).bom;
    correct.metadata.properties.find(row => row.name === 'eos:sbom:fresh-vulnerability-scan').value = 'true';
    assert.throws(() => g.check(correct), { code: 'SBOM_DERIVATIVE_BINDING' });
    const h = fixture(t), bom = bindDerivative(h.input).bom;
    bom.dependencies.find(row => row.ref === OWNERS[0].package).dependsOn = ['external'];
    assert.throws(() => h.check(bom), { code: 'SBOM_EMBEDDED_PARENT' });
    const k = fixture(t), wrongParent = bindDerivative(k.input).bom;
    wrongParent.dependencies.find(row => row.ref === OWNERS[1].package).dependsOn.push('eos-embedded:' + clientPaths[0]);
    assert.throws(() => k.check(wrongParent), { code: 'SBOM_EMBEDDED_PARENT' });
});
test('authenticated predecessor, sequence and source identities are mandatory', t => {
    const f = fixture(t);
    for (const mutation of [{ previousApp: undefined }, { sourceCommit: 'main' }, { previousReleaseId: 'unknown' }, { previousManifest: { ...f.input.previousManifest, sequence: 10 } }]) {
        assert.throws(() => bindDerivative({ ...f.input, ...mutation }), { code: 'R9_SBOM_INPUT' });
    }
    const wrong = structuredClone(f.input.previousSbom); wrong.components[0].version = '99.0.0';
    assert.throws(() => bindDerivative({ ...f.input, previousSbom: wrong }), { code: 'R9_SBOM_BASE_CHANGED' });
});
test('removing the self-declared R9 marker cannot bypass actual-file or verified-sequence checks', t => {
    const f = fixture(t), bom = bindDerivative(f.input).bom;
    bom.metadata.properties = bom.metadata.properties.filter(row => row.name !== 'eos:sbom:assembly');
    for (const component of bom.components.filter(row => OWNERS.some(spec => spec.package === row.name))) {
        delete component.modified; delete component.pedigree;
        component.properties = component.properties.filter(row => !row.name.startsWith('eos:derivative:'));
        component.hashes = [{ alg: 'SHA-512', content: 'f'.repeat(128) }];
    }
    assert.throws(() => f.check(bom), { code: 'SBOM_DERIVATIVE_BINDING' });
    // Even dropping every new embedded copy cannot downgrade a sequence-12
    // release to the historical two-client checks.
    for (const relative of clientPaths.slice(2)) {
        fs.rmSync(path.join(f.input.app, relative), { recursive: true });
        const ref = 'eos-embedded:' + relative;
        bom.components = bom.components.filter(row => row['bom-ref'] !== ref);
        bom.dependencies = bom.dependencies.filter(row => row.ref !== ref);
        for (const dep of bom.dependencies) dep.dependsOn = dep.dependsOn.filter(child => child !== ref);
    }
    assert.throws(() => f.check(bom, { sequence: 12 }), { code: 'SBOM_DERIVATIVE_BINDING' });
});
