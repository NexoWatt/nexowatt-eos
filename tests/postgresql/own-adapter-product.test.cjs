'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const product = require('../../runtime/product/scope.cjs');
const guard = require('../../runtime/controller-profile/guard.cjs');
const catalog = scope => ({ entries: product.specsFor(scope).map(row => ({ ...row,
    required: row.execute, review: { status: row.execute ? 'approved-test' : 'pending' } })) });

test('legacy default admits precisely management; explicit new scope is fixed to six own adapters', () => {
    assert.equal(product.admittedAdapters().length, 2);
    const adapters = product.admittedAdapters(product.OWN_ADAPTER_TEST);
    assert.equal(adapters.length, 6);
    assert.deepEqual(adapters.map(row => row.package), product.SPECS.filter(row => row.source).map(row => row.package));
    assert.ok(!adapters.some(row => row.package === 'iobroker.javascript'));
    guard.validateProfile({ schemaVersion: 1, kind: 'eos-controller-test-profile', controllerVersion: '7.2.2', adapters });
    assert.equal(product.admittedAdapters().length, 2, 'new candidate must not mutate historical specifications');
});

test('all-adapter catalog is rejected by management scope; new scope rejects missing or extra entries', () => {
    const all = catalog(product.OWN_ADAPTER_TEST);
    assert.equal(product.assertCatalog(all, product.OWN_ADAPTER_TEST), all);
    assert.throws(() => product.assertCatalog(all), /PRODUCT_CATALOG_SCOPE/);
    assert.throws(() => product.assertCatalog(catalog(), product.OWN_ADAPTER_TEST), /PRODUCT_CATALOG_SCOPE/);
    for (const mutate of [value => value.entries.pop(), value => value.entries.push(value.entries[0]),
        value => { value.entries[3].version = '99.0.0'; }, value => { value.entries[3].required = false; },
        value => { value.entries[3].review.status = 'approved'; }]) {
        const value = catalog(product.OWN_ADAPTER_TEST); mutate(value);
        assert.throws(() => product.assertCatalog(value, product.OWN_ADAPTER_TEST), /PRODUCT_CATALOG_SCOPE/);
    }
});

test('source inventory reports candidate admission, never installation, activity or physical control', () => {
    const rows = product.inspectSources(path.resolve(__dirname, '../..'), product.OWN_ADAPTER_TEST);
    assert.equal(rows.length, 6);
    assert.ok(rows.every(row => row.executionAdmitted && row.acceptance === 'own-adapter-test-only'
        && !row.installed && !row.active && !row.configured && !row.physicalControlEnabled));
});

test('unknown scope is not a force or production switch', () => {
    for (const scope of ['production', 'all', true, null, {}, '']) {
        assert.throws(() => product.specsFor(scope), /PRODUCT_TEST_SCOPE/);
        assert.throws(() => product.admittedAdapters(scope), /PRODUCT_TEST_SCOPE/);
        assert.throws(() => product.assertCatalog(catalog(), scope), /PRODUCT_TEST_SCOPE/);
    }
});

test('only the exact new signed release context selects six-adapter execution', () => {
    const release = { product: 'nexowatt-eos', releaseVersion: '0.2.0-test.3', sequence: 13,
        profile: 'test', nodeVersion: '24.21.0', platforms: ['linux-arm64'] };
    assert.equal(product.releaseScope(release), product.OWN_ADAPTER_TEST);
    for (const sequence of [1, 11, 12, 14]) {
        assert.equal(product.releaseScope({ ...release, sequence }), product.MANAGEMENT_TEST);
    }
    for (const mutation of [{ product: 'other' }, { releaseVersion: '0.2.0-test.4' },
        { profile: 'production' }, { nodeVersion: '24.19.0' }, { platforms: ['linux-x64'] },
        { platforms: ['linux-arm64', 'linux-x64'] }, { platforms: undefined }]) {
        assert.throws(() => product.releaseScope({ ...release, ...mutation }), /PRODUCT_RELEASE_SCOPE/);
    }
});

test('generic fresh install and additive activation cannot bypass journaled own-adapter migration', () => {
    const { assertGenericDeployment } = require('../../tools/system/eos-base.cjs');
    const release = { product: 'nexowatt-eos', releaseVersion: '0.2.0-test.3', sequence: 13,
        profile: 'test', nodeVersion: '24.21.0', platforms: ['linux-arm64'] };
    assert.throws(() => assertGenericDeployment(release), { code: 'EOS_OWN_ADAPTER_UPDATE_ONLY' });
    assert.doesNotThrow(() => assertGenericDeployment({ ...release, sequence: 12 }));
});
