'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { inventory, sha256 } = require('../../runtime/release/bundle.cjs');
const { verifySbomBinding } = require('../../runtime/release/sbom-binding.cjs');
function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-sbom-binding-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const write = (file, data) => { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), JSON.stringify(data)); };
    write('app/package.json', { name: 'fixture', version: '1.0.0', dependencies: { alias: '1.2.3' } });
    const lock = { lockfileVersion: 3, packages: { '': { name: 'fixture', version: '1.0.0' },
        'node_modules/alias': { name: '@example/real', version: '1.2.3' },
        'node_modules/optional': { version: '2.0.0', optional: true } } };
    write('app/package-lock.json', lock);
    write('app/node_modules/alias/package.json', { name: '@example/real', version: '1.2.3' });
    const bom = { bomFormat: 'CycloneDX', specVersion: '1.5', metadata: {
        component: { name: 'fixture', version: '1.0.0', 'bom-ref': 'fixture@1.0.0' }, properties: [
            { name: 'eos:sbom:scope', value: 'installed-test-runtime-npm-tree' },
            ...['json', 'lock'].map(kind => ({ name: `eos:sbom:package-${kind}-sha256`,
                value: sha256(fs.readFileSync(path.join(root, kind === 'json' ? 'app/package.json' : 'app/package-lock.json'))) }))] },
        components: [{ name: '@example/real', version: '1.2.3', 'bom-ref': '@example/real@1.2.3' }],
        dependencies: [{ ref: 'fixture@1.0.0', dependsOn: ['@example/real@1.2.3'] }] };
    const check = profile => { write('sbom.cdx.json', bom); return verifySbomBinding(root, inventory(root), profile); };
    return { root, write, bom, lock, check };
}
test('actual aliased installed tree and omitted optional package bind', t => {
    assert.deepEqual(fixture(t).check(), { installedPackages: 1, uniqueNpmComponents: 1, embeddedPackages: 0,
        scope: 'npm-and-explicit-vendored-packages', fullOperatingSystemInventory: false });
});
test('stale or conflicting root digest is refused', t => {
    const f = fixture(t); f.bom.metadata.properties[1].value = '0'.repeat(64);
    assert.throws(f.check, { code: 'SBOM_ROOT_BINDING' });
    f.bom.metadata.properties.push({ ...f.bom.metadata.properties[1] });
    assert.throws(f.check, { code: 'SBOM_PROPERTIES' });
});
test('changed installed identity and unlisted package are refused', t => {
    const f = fixture(t);
    f.write('app/node_modules/alias/package.json', { name: '@example/real', version: '9.9.9' });
    assert.throws(f.check, { code: 'SBOM_PACKAGE_IDENTITY' });
    f.write('app/node_modules/alias/package.json', { name: '@example/real', version: '1.2.3' });
    f.write('app/node_modules/extra/package.json', { name: 'extra', version: '1.0.0' });
    assert.throws(f.check, { code: 'SBOM_UNLISTED_PACKAGE' });
});
test('npm boundaries inside package subdirectories cannot hide manifestless dependencies', t => {
    const f = fixture(t);
    f.write('app/node_modules/alias/lib/node_modules/unlisted/index.js', 'module.exports=1');
    assert.throws(f.check, { code: 'SBOM_UNLISTED_PACKAGE' });
});
test('missing required package, phantom component and dangling dependency are refused', t => {
    const f = fixture(t);
    fs.rmSync(path.join(f.root, 'app/node_modules/alias/package.json'));
    assert.throws(f.check, { code: 'SBOM_PACKAGE_MISSING' });
    f.write('app/node_modules/alias/package.json', { name: '@example/real', version: '1.2.3' });
    f.bom.components.push({ name: 'phantom', version: '1', 'bom-ref': 'phantom@1' });
    assert.throws(f.check, { code: 'SBOM_COMPONENT_NOT_INSTALLED' });
    f.bom.components.pop(); f.bom.dependencies[0].dependsOn.push('missing');
    assert.throws(f.check, { code: 'SBOM_GRAPH' });
});
test('manifestless packages and manifestless known vendored code cannot evade inventory', t => {
    const f = fixture(t);
    f.write('app/node_modules/hidden/index.js', 'module.exports = 1');
    assert.throws(f.check, { code: 'SBOM_UNLISTED_PACKAGE' });
    fs.rmSync(path.join(f.root, 'app/node_modules/hidden'), { recursive: true });
    f.write('app/node_modules/hidden.js', 'module.exports = 1');
    assert.throws(f.check, { code: 'SBOM_UNLISTED_PACKAGE' });
    fs.rmSync(path.join(f.root, 'app/node_modules/hidden.js'));
    // Put the embedded path under a declared, manifested parent as in a real app.
    f.lock.packages['node_modules/iobroker.eos-admin'] = { version: '7.10.11' };
    f.write('app/package-lock.json', f.lock);
    f.bom.metadata.properties[2].value = sha256(fs.readFileSync(path.join(f.root, 'app/package-lock.json')));
    f.write('app/node_modules/iobroker.eos-admin/package.json', { name: 'iobroker.eos-admin', version: '7.10.11' });
    f.bom.components.push({ name: 'iobroker.eos-admin', version: '7.10.11', 'bom-ref': 'admin' });
    f.write('app/node_modules/iobroker.eos-admin/packages/eos-license-client/index.js', 'module.exports = 1');
    assert.throws(f.check, { code: 'SBOM_EMBEDDED' });
});
test('known vendored files must be present and bound by exact tree hash', t => {
    const f = fixture(t), relative = 'node_modules/iobroker.eos-admin/packages/eos-license-client';
    f.lock.packages['node_modules/iobroker.eos-admin'] = { version: '7.10.11' };
    f.write('app/package-lock.json', f.lock);
    f.bom.metadata.properties[2].value = sha256(fs.readFileSync(path.join(f.root, 'app/package-lock.json')));
    f.write('app/node_modules/iobroker.eos-admin/package.json', { name: 'iobroker.eos-admin', version: '7.10.11' });
    f.bom.components.push({ name: 'iobroker.eos-admin', version: '7.10.11', 'bom-ref': 'admin' });
    f.write(`app/${relative}/package.json`, { name: '@nexowatt/eos-license-client', version: '1.0.0' });
    assert.throws(f.check, { code: 'SBOM_EMBEDDED' });
    const rows = inventory(f.root).filter(row => row.path.startsWith(`app/${relative}/`))
        .map(row => ({ path: row.path.slice(relative.length + 5), size: row.size, sha256: row.sha256 }));
    const component = { name: '@nexowatt/eos-license-client', version: '1.0.0', 'bom-ref': `eos-embedded:${relative}`,
        properties: Object.entries({ 'eos:scope': 'embedded-package-files-observed-in-runtime-tree', 'eos:installed-path': relative,
            'eos:manifest-sha256': rows[0].sha256, 'eos:tree-sha256': sha256(Buffer.from(JSON.stringify(rows))) }).map(([name, value]) => ({ name, value })) };
    f.bom.components.push(component);
    f.bom.dependencies.push({ ref: 'admin', dependsOn: [component['bom-ref']] }, { ref: component['bom-ref'], dependsOn: [] });
    assert.equal(f.check().embeddedPackages, 1);
    f.write(`app/${relative}/extra.js`, 'changed');
    assert.throws(f.check, { code: 'SBOM_EMBEDDED' });
});
function transformFixture(t) {
    const f = fixture(t), name = 'iobroker.js-controller', version = '7.2.2';
    f.lock.packages[`node_modules/${name}`] = { version };
    f.write('app/package-lock.json', f.lock);
    f.bom.metadata.properties.find(row => row.name === 'eos:sbom:package-lock-sha256').value =
        sha256(fs.readFileSync(path.join(f.root, 'app/package-lock.json')));
    f.write(`app/node_modules/${name}/package.json`, { name, version });
    const profile = { schemaVersion: 1, kind: 'eos-controller-profile-verification', controllerVersion: '7.2.2', productionApproved: false,
        files: ['z.cjs', 'a.cjs'].map(file => {
            const relativePath = `node_modules/${name}/${file}`;
            f.write(`app/${relativePath}`, 'fixture transformed bytes');
            return { relativePath, sha256: sha256(fs.readFileSync(path.join(f.root, 'app', relativePath))) };
        }) };
    const { transformedComponent } = require('./fixtures/sbom-transform.cjs');
    const component = transformedComponent(name, version, profile); f.bom.components.push(component);
    return { ...f, profile, component };
}
test('modified component binds sorted exact transform rows and ancestor identity', t => {
    const f = transformFixture(t);
    assert.equal(f.check(f.profile).installedPackages, 2);
    f.profile.files.reverse(); assert.equal(f.check(f.profile).installedPackages, 2);
});
test('pre-transform identity, stale table, misleading archive hashes and wrong ancestor fail', t => {
    for (const mutate of [c => { delete c.modified; }, c => { c.modified = false; },
        c => { c.properties[0].value = '0'.repeat(64); }, c => { c.hashes = []; },
        c => { c.pedigree.ancestors[0].version = '7.2.1'; }, c => { c.pedigree.ancestors = []; }]) {
        const f = transformFixture(t); mutate(f.component);
        assert.throws(() => f.check(f.profile), { code: 'SBOM_TRANSFORM_BINDING' });
    }
});
test('changed actual transform rows and duplicated or unrecognized profile records fail', t => {
    const f = transformFixture(t);
    f.profile.files[0].sha256 = '0'.repeat(64);
    assert.throws(() => f.check(f.profile), { code: 'SBOM_TRANSFORM_PROFILE' });
    const g = transformFixture(t); g.profile.files.push(g.profile.files[0]);
    assert.throws(() => g.check(g.profile), { code: 'SBOM_TRANSFORM_PROFILE' });
    const h = transformFixture(t); h.profile.files[0].relativePath = 'node_modules/alias/package.json';
    assert.throws(() => h.check(h.profile), { code: 'SBOM_TRANSFORM_PROFILE' });
    const k = transformFixture(t); k.bom.components.push({ ...k.component, 'bom-ref': 'duplicate' });
    assert.throws(() => k.check(k.profile), { code: 'SBOM_TRANSFORM_COMPONENT' });
});
