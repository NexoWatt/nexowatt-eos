'use strict';
// The installed controller checks instance names literally. An upstream
// "admin" dependency cannot be satisfied by the EOS instance "eos-admin".
// This is a metadata regression, not a native six-process startup result.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { SPECS } = require('../../runtime/product/scope.cjs');
const root = path.resolve(__dirname, '../..');
const semver = createRequire(path.join(root, 'components/ocpp21/package.json'))('semver');

function assertClosedDependencies(common, available) {
    for (const key of ['dependencies', 'globalDependencies']) {
        const rows = common[key] || [];
        assert.ok(Array.isArray(rows), key + ' must use the reviewed manifest array');
        for (const row of rows) {
            assert.ok(row && !Array.isArray(row) && typeof row === 'object');
            for (const [name, range] of Object.entries(row)) {
                assert.ok(available.has(name), 'EOS_DEPENDENCY_NOT_INSTALLED: ' + name);
                assert.equal(semver.satisfies(available.get(name), range), true, 'EOS_DEPENDENCY_VERSION: ' + name);
            }
        }
    }
}

const installed = new Map(SPECS.map(spec => [spec.package.slice('iobroker.'.length), spec.version]));
for (const spec of SPECS.filter(spec => spec.source)) {
    test(spec.id + ' dependencies resolve inside the exact EOS package set', () => {
        const io = JSON.parse(fs.readFileSync(path.join(root, 'components', spec.source, 'io-package.json')));
        assertClosedDependencies(io.common, installed);
    });
}

test('upstream admin name and incompatible versions are not silently accepted', () => {
    assert.throws(() => assertClosedDependencies({ globalDependencies: [{ admin: '>=7.0.0' }] }, installed), /EOS_DEPENDENCY_NOT_INSTALLED/);
    assert.throws(() => assertClosedDependencies({ globalDependencies: [{ 'eos-admin': '>=8.0.0' }] }, installed), /EOS_DEPENDENCY_VERSION/);
    assert.throws(() => assertClosedDependencies({ globalDependencies: [{ javascript: '*' }] }, installed), /EOS_DEPENDENCY_NOT_INSTALLED/);
});
