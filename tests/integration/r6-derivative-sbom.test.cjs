'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { inventory } = require('../../runtime/release/bundle.cjs');
const { bindDerivative } = require('../../tools/integration/bind-r6-derivative-sbom.cjs');
function fixture(t) {
    const app = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-r6-bom-'));
    t.after(() => fs.rmSync(app, { recursive: true, force: true }));
    fs.mkdirSync(path.join(app, 'node_modules/iobroker.eos-admin'), { recursive: true });
    for (const [name, data] of [['package.json', { name: 'eos', version: '1' }], ['package-lock.json', { lockfileVersion: 3 }],
        ['node_modules/iobroker.eos-admin/package.json', { name: 'iobroker.eos-admin', version: '7.10.11' }]])
        fs.writeFileSync(path.join(app, name), JSON.stringify(data));
    const code = path.join(app, 'node_modules/iobroker.eos-admin/index.js'); fs.writeFileSync(code, 'old');
    const previousManifest = { files: inventory(app).map(row => ({ ...row, path: 'app/' + row.path })) };
    const previousSbom = { bomFormat: 'CycloneDX', specVersion: '1.5', serialNumber: 'old-serial', version: 1,
        metadata: { timestamp: '2026-10-04T00:00:00Z', component: { name: 'eos', version: '1' }, properties: [] },
        components: [{ type: 'application', name: 'iobroker.eos-admin', version: '7.10.11',
            'bom-ref': 'admin', hashes: [{ alg: 'SHA-512', content: 'original-archive-hash' }] }], dependencies: [] };
    fs.writeFileSync(code, 'new');
    return { app, previousManifest, previousSbom, previousReleaseId: 'a'.repeat(64), sourceCommit: 'b'.repeat(40), timestamp: '2026-10-04T22:00:00Z' };
}
test('changed package archive hash moves to ancestry; actual derivative gets content binding', t => {
    const input = fixture(t), result = bindDerivative(input), component = result.bom.components[0];
    assert.equal(component.modified, true); assert.equal(component.hashes, undefined);
    assert.deepEqual(component.pedigree.ancestors[0].hashes, input.previousSbom.components[0].hashes);
    assert.equal(result.evidence.derivatives[0].package, 'iobroker.eos-admin');
    assert.equal(result.evidence.changed.length, 1); assert.equal(result.bom.serialNumber, undefined);
    assert.equal(result.evidence.vulnerabilityScanPerformed, false);
    assert.equal(result.evidence.operatingSystemInventoryIncluded, false);
    assert.equal(input.previousSbom.components[0].modified, undefined);
    assert.match(result.evidence.actualAppFileTableSha256, /^[a-f0-9]{64}$/);
});
test('dependency metadata changes cannot masquerade as a dependency-neutral derivative', t => {
    const input = fixture(t); fs.writeFileSync(path.join(input.app, 'package-lock.json'), '{}');
    assert.throws(() => bindDerivative(input), { code: 'R6_SBOM_DEPENDENCY_CHANGE' });
});
test('new package and nested npm-boundary changes are rejected', t => {
    const input = fixture(t);
    fs.mkdirSync(path.join(input.app, 'node_modules/iobroker.eos-admin/node_modules/undeclared'), { recursive: true });
    fs.writeFileSync(path.join(input.app, 'node_modules/iobroker.eos-admin/node_modules/undeclared/index.js'), 'code');
    assert.throws(() => bindDerivative(input), { code: 'R6_SBOM_OVERLAY_SCOPE' });
});
test('artifact and source identity inputs are mandatory', t => {
    const input = fixture(t);
    assert.throws(() => bindDerivative({ ...input, sourceCommit: 'main' }), { code: 'R6_SBOM_INPUT' });
    assert.throws(() => bindDerivative({ ...input, previousReleaseId: 'unknown' }), { code: 'R6_SBOM_INPUT' });
});
test('only the explicit Admin source-lock addition is permitted, with identical package contract', t => {
    const input = fixture(t), file = path.join(input.app, 'node_modules/iobroker.eos-admin/package-lock.json');
    const pkg = JSON.parse(fs.readFileSync(path.join(input.app, 'node_modules/iobroker.eos-admin/package.json')));
    const lock = { name: pkg.name, version: pkg.version, lockfileVersion: 3, packages: { '': pkg } };
    fs.writeFileSync(file, JSON.stringify(lock));
    assert.equal(bindDerivative(input).evidence.dependencyLockUnchanged, true);
    lock.packages[''].dependencies = { injected: '1.0.0' }; fs.writeFileSync(file, JSON.stringify(lock));
    assert.throws(() => bindDerivative(input), { code: 'R6_SBOM_SOURCE_LOCK_CONTRACT' });
});
test('installed package identities and unrelated package bytes remain immutable', t => {
    const input = fixture(t);
    fs.writeFileSync(path.join(input.app, 'node_modules/iobroker.eos-admin/package.json'), JSON.stringify({ name: 'iobroker.eos-admin', version: '7.10.11', dependencies: { unexpected: '1' } }));
    assert.throws(() => bindDerivative(input), { code: 'R6_SBOM_PACKAGE_SCOPE' });
});
test('Backup derivative is represented without a false original archive hash', t => {
    const input = fixture(t), dir = path.join(input.app, 'node_modules/iobroker.nexowatt-backup'); fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'iobroker.nexowatt-backup', version: '1.0.10' }));
    fs.writeFileSync(path.join(dir, 'index.js'), 'old');
    input.previousManifest = { files: inventory(input.app).map(row => ({ ...row, path: 'app/' + row.path })) };
    input.previousSbom.components.push({ type: 'application', name: 'iobroker.nexowatt-backup', version: '1.0.10', hashes: [{ alg: 'SHA-512', content: 'old' }] });
    fs.writeFileSync(path.join(dir, 'index.js'), 'current');
    const result = bindDerivative(input);
    assert.equal(result.evidence.derivatives[0].package, 'iobroker.nexowatt-backup');
    assert.equal(result.bom.components[1].hashes, undefined);
    assert.equal(result.bom.components[1].pedigree.ancestors[0].hashes[0].content, 'old');
});
