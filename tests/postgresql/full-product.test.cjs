'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const product = require('../../runtime/product/scope.cjs');
const { validatePublicInput } = require('../../tools/system/prepare-onboarding.cjs');
const { installPostgresqlHost } = require('../../tools/system/install-postgresql-host.cjs');
const { publicContext } = require('../../tools/system/prepare-first-start-context.cjs');
const { normalizeUuid } = require('../../components/admin/src/lib/eosLicenseCore.js');
const { packageTest } = require('../../tools/integration/package-postgresql-test.cjs');
const REPO = path.resolve(__dirname, '../..');
function app(t) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-product-scope-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: false }));
    const write = (file, value) => { const target = path.join(directory, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, typeof value === 'string' ? value : JSON.stringify(value)); };
    const dependencies = Object.fromEntries(product.SPECS.map(row => [row.package, row.version]));
    const lock = { lockfileVersion: 3, packages: { '': { dependencies } } };
    for (const row of product.SPECS) {
        write(`node_modules/${row.package}/package.json`, { name: row.package, version: row.version, main: row.main });
        write(`node_modules/${row.package}/io-package.json`, { common: { name: row.package.slice('iobroker.'.length), version: row.version } });
        write(`node_modules/${row.package}/${row.main}`, '// inert fixture');
        lock.packages[`node_modules/${row.package}`] = { version: row.version };
    }
    write('package.json', { dependencies }); write('package-lock.json', lock);
    return { directory, write, lock };
}
function catalog() { return { entries: product.SPECS.map(row => ({ ...row, required: row.execute,
    review: { status: row.execute ? 'approved-test' : 'pending' } })) }; }
test('all six actual source manifests and executable entrypoints exist; source presence is not installation', () => {
    const rows = product.inspectSources(REPO);
    assert.equal(rows.length, 6);
    assert.ok(rows.every(row => row.sourcePresent && !row.installed && !row.active && !row.configured));
});
test('complete installed fixture has seven mandatory packages but only two executable adapters', t => {
    const f = app(t), rows = product.inspectApp(f.directory);
    assert.equal(rows.length, 7); assert.ok(rows.every(row => row.installed && !row.configured && !row.active && !row.physicalControlEnabled));
    assert.deepEqual(product.admittedAdapters().map(row => row.package), ['iobroker.eos-admin', 'iobroker.nexowatt-ui']);
});
test('test.2-sized product, missing entrypoint and changed root lock are rejected', t => {
    const f = app(t);
    fs.unlinkSync(path.join(f.directory, 'node_modules/iobroker.ocpp21/main.js'));
    assert.throws(() => product.inspectApp(f.directory));
    f.write('node_modules/iobroker.ocpp21/main.js', '// restored inert fixture');
    f.lock.packages['node_modules/iobroker.ocpp21'].version = '0.4.1';
    f.write('package-lock.json', f.lock);
    assert.throws(() => product.inspectApp(f.directory), /PRODUCT_LOCK_SCOPE/);
    assert.throws(() => product.assertCatalog({ entries: catalog().entries.slice(0, 3) }), /PRODUCT_CATALOG_SCOPE/);
});
test('product catalog cannot admit field adapters or silently omit required Management packages', () => {
    assert.equal(product.assertCatalog(catalog()).entries.length, 7);
    for (const id of ['nexowatt-devices', 'eebus', 'ocpp21', 'nexowatt-backup']) {
        const value = catalog(); value.entries.find(row => row.id === id).review.status = 'approved-test';
        assert.throws(() => product.assertCatalog(value), /PRODUCT_CATALOG_SCOPE/);
    }
    const value = catalog(); value.entries.find(row => row.id === 'eos-admin').required = false;
    assert.throws(() => product.assertCatalog(value), /PRODUCT_CATALOG_SCOPE/);
});
test('public setup inputs require matching HTTPS origin and an independently pinned public trust export', () => {
    const input = { schemaVersion: 1, hosts: ['eos.local'], origin: 'https://eos.local:8443', licenseTrustFile: path.resolve('public-trust.json'), licenseTrustSha256: 'a'.repeat(64) };
    assert.equal(validatePublicInput(input), input);
    for (const origin of ['http://eos.local:8443', 'https://evil.local:8443', 'https://eos.local:8443/', 'https://eos.local:8188', 'https://user:secret@eos.local:8443']) assert.throws(() => validatePublicInput({ ...input, origin }), /SETUP_INPUT_ORIGIN/);
    for (const changed of [{ password: 'must never be accepted' }, { licenseTrustSha256: null }, { licenseTrustFile: '../untrusted' }]) assert.throws(() => validatePublicInput({ ...input, ...changed }));
});
test('full-product host install rejects missing first-start security inputs before commands', () => {
    let called = false;
    assert.throws(() => installPostgresqlHost({ profile: 'test', releaseId: 'a'.repeat(64), publicKeySha256: 'b'.repeat(64),
        sequence: 4, expectedNodeVersion: '24.21.0', start: true, releaseVersion: '0.2.0-test.3' },
    { uid: 0, exec: () => { called = true; } }), /PG_SETUP_INPUT_REQUIRED/);
    assert.equal(called, false);
});
test('setup boot target excludes Controller; isolated frontend cannot read DB or user data', () => {
    const unit = name => fs.readFileSync(path.join(REPO, 'system/postgresql-test/systemd', name), 'utf8');
    assert.doesNotMatch(unit('nexowatt-eos-setup.target'), /controller|upload/);
    const setup = unit('nexowatt-eos-setup.service');
    assert.match(setup, /User=eos-setup/); assert.match(setup, /NoNewPrivileges=yes/);
    assert.match(setup, /InaccessiblePaths=.*iobroker\.json.*iobroker-data/);
    assert.match(setup, /ConditionPathExists=!\/etc\/nexowatt-eos\/first-start-complete\.json/);
    assert.match(setup, /^ExecStart=\/usr\/bin\/node \/opt\/nexowatt\/eos\/current\/runtime\/onboarding\/main\.cjs --config \/etc\/nexowatt-eos\/onboarding\.json$/m);
    assert.match(unit('nexowatt-eos-setup-finalize.path'), /PathExists=\/var\/lib\/nexowatt-eos\/onboarding\/handoff\.json/);
    const license = unit('nexowatt-eos-setup-license.service');
    assert.match(license, /^User=eos-runtime$/m);
    assert.match(license, /^Environment=IOBROKER_DATA_DIR=\/var\/lib\/nexowatt-eos\/iobroker-data$/m);
    assert.match(license, /^ExecStart=\/usr\/bin\/node \/opt\/nexowatt\/eos\/current\/runtime\/bootstrap\/first-start-configuration\.cjs --import-license$/m);
    assert.match(license, /^ReadWritePaths=\/var\/lib\/nexowatt-eos\/iobroker-data\/eos-admin\.0\/licensing$/m);
    assert.match(license, /^CapabilityBoundingSet=$/m);
    assert.match(license, /^RestrictAddressFamilies=AF_UNIX$/m);
    assert.doesNotMatch(license, /WantedBy|ExecStart=.*\$|ExecStart=.*%/);
});
test('public first-start context binds only the actual database UUID to fixed public trust', () => {
    const releaseId = 'a'.repeat(64), uuid = '11111111-2222-3333-4444-555555555555';
    const draft = { schemaVersion: 1, origin: 'https://eos.local:8443', bind: '0.0.0.0', port: 8443,
        stateDirectory: '/var/lib/nexowatt-eos/onboarding', completionFile: '/etc/nexowatt-eos/first-start-complete.json', releaseId,
        tls: { certificatePath: '/etc/nexowatt-eos/web/setup.crt', privateKeyPath: '/etc/nexowatt-eos/web/setup.key', caPath: '/etc/nexowatt-eos/web/ca.crt' } };
    const record = { _id: 'system.meta.uuid', type: 'meta', native: { uuid } };
    const result = publicContext({ draft, releaseId, record, normalizeUuid });
    assert.equal(result.schemaVersion, 2);
    assert.deepEqual(result.license, { uuid, trustFile: '/etc/nexowatt-eos/license-trust.json' });
    for (const bad of [null, { ...record, _id: 'browser.uuid' }, { ...record, type: 'state' }, { ...record, native: { uuid: 'untrusted' } }]) {
        assert.throws(() => publicContext({ draft, releaseId, record: bad, normalizeUuid }));
    }
    for (const changed of [{ uuid }, { releaseId: 'b'.repeat(64) }, { tls: { ...draft.tls, privateKeyPath: '/tmp/key' } }, { license: { uuid } }]) {
        assert.throws(() => publicContext({ draft: { ...draft, ...changed }, releaseId, record, normalizeUuid }));
    }
    assert.throws(() => publicContext({ draft, releaseId: 'b'.repeat(64), record, normalizeUuid }));
});
test('non-Linux signing host is rejected before generating any private key', { skip: process.platform === 'linux' }, () => {
    assert.throws(() => packageTest(path.join(os.tmpdir(), 'not-an-input-tree')), /PG_LINUX_SIGNING_HOST_REQUIRED/);
});
