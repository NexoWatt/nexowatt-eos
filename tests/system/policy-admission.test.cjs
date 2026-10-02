'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { AdmissionError, parseCatalog, parseBoundedJson, validateCatalog, planAdmission,
    componentTreeDigest } = require('../../runtime/policy/admission.cjs');

// Invented package names/data only: no test fixture is a product approval.
const digest = crypto.createHash('sha256').update('synthetic-tree').digest('hex');
function component(id, required = false) {
    return { id, package: `eos-test-${id}`, version: '1.2.3', sha256: digest,
        digestKind: 'tree-sha256-v1', kind: required ? 'core' : 'adapter', required,
        review: { status: 'approved-test', evidenceId: 'synthetic-evidence' },
        permissions: { capabilities: ['state.read', 'state.write', 'device.tcp'],
            protocols: ['eos-redis-tls13-v1', 'modbus-tcp'], network: 'declared-endpoints-and-discovery',
            shellExec: false, additionalNpmModules: [], arbitraryCode: false },
        communication: 'eos-redis-tls13-v1' };
}
function catalog() { return { schemaVersion: 1, kind: 'eos-adapter-admission', catalogRevision: 1,
    entries: [component('controller', true), component('meter')] }; }
function request() { return { profile: 'test', requested: [], installed: [], active: [] }; }
const ref = id => ({ id, version: '1.2.3' });
const installed = id => ({ ...ref(id), sha256: digest });
function code(expected, fn) { assert.throws(fn, error => error instanceof AdmissionError && error.code === expected); }

test('approved required core is selected; optional is not installed implicitly', () => {
    const result = planAdmission(catalog(), request());
    assert.equal(result.selected.length, 1);
    assert.equal(result.selected[0].id, 'controller');
    assert.equal(result.selected[0].installed, false);
    assert.equal(result.selected[0].active, false);
    assert.equal(result.selected[0].nextAction, 'install');
    assert.equal(result.productionReleaseApproved, false);
});
test('PostgreSQL transport is declared and channel cannot skip pending host isolation', () => {
    const c = catalog(); c.entries[1].communication = 'eos-postgresql-mtls13-v1';
    c.entries[1].permissions.protocols = ['eos-postgresql-mtls13-v1'];
    assert.equal(validateCatalog(c).entries[1].communication, 'eos-postgresql-mtls13-v1');
    c.entries[1].communication = 'eos-channel-mtls13-v1'; c.entries[1].permissions.protocols = ['eos-channel-mtls13-v1'];
    code('E_CHANNEL_HOST_PENDING', () => validateCatalog(c));
    c.entries[1].review = { status: 'pending', evidenceId: null };
    assert.equal(validateCatalog(c).entries[1].review.status, 'pending');
});
test('optional exact version follows requested -> installed -> active without confusing states', () => {
    const r = request(); r.requested.push(ref('meter')); r.installed.push(installed('meter'));
    assert.equal(planAdmission(catalog(), r).selected.find(x => x.id === 'meter').nextAction, 'activate');
    r.active.push(ref('meter'));
    assert.equal(planAdmission(catalog(), r).selected.find(x => x.id === 'meter').nextAction, 'none');
});
test('catalogue approval does not fabricate package bytes or installed status', () => {
    const r = request(); r.installed.push({ ...installed('controller'), sha256: crypto.randomBytes(32).toString('hex') });
    const result = planAdmission(catalog(), r);
    assert.equal(result.selected[0].installed, false);
    assert.equal(result.quarantine[0].id, 'controller');
    r.active.push(ref('controller'));
    code('E_ACTIVE_NOT_INSTALLED', () => planAdmission(catalog(), r));
});
test('unselected/unknown installed items are quarantined, never automatically activated', () => {
    const r = request(); r.installed.push(installed('meter'), installed('unknown'));
    const result = planAdmission(catalog(), r);
    assert.equal(result.quarantine.length, 2);
    r.active.push(ref('meter'));
    code('E_ACTIVE_NOT_APPROVED', () => planAdmission(catalog(), r));
});
test('production profile rejects test review; test profile accepts production review', () => {
    const c = catalog(), r = request(); r.profile = 'production';
    code('E_NOT_APPROVED', () => planAdmission(c, r));
    c.entries.forEach(e => e.review.status = 'approved-production');
    assert.equal(planAdmission(c, r).productionReleaseApproved, false);
    r.profile = 'test'; assert.equal(planAdmission(c, r).selected.length, 1);
});
test('pending and rejected optional entries can be inventoried but never selected or active', () => {
    for (const status of ['pending', 'rejected']) {
        const c = catalog(); c.entries[1].review = { status, evidenceId: null };
        c.entries[1].communication = 'legacy-unintegrated';
        assert.equal(validateCatalog(c).entries[1].review.status, status);
        const r = request(); r.requested.push(ref('meter'));
        code('E_NOT_APPROVED', () => planAdmission(c, r));
        r.requested = []; r.installed.push(installed('meter')); r.active.push(ref('meter'));
        code('E_ACTIVE_NOT_APPROVED', () => planAdmission(c, r));
    }
});
test('a pending required component blocks the whole requested baseline', () => {
    const c = catalog(); c.entries[0].review.status = 'pending';
    code('E_NOT_APPROVED', () => planAdmission(c, request()));
});
test('catalogue URL/tags/ranges and request version aliases are rejected', () => {
    for (const version of ['^1.2.3', '~1.2.3', '*', 'stable', 'latest', '1.2', '01.2.3', '1.2.3+build',
        '1.2.3-01', 'https://registry.npmjs.org/example.tgz', 'file:../x']) {
        const c = catalog(); c.entries[0].version = version;
        code('E_EXACT_VERSION', () => validateCatalog(c));
        const r = request(); r.requested.push({ id: 'meter', version });
        code('E_EXACT_VERSION', () => planAdmission(catalog(), r));
    }
});
test('valid exact prereleases are allowed only under explicit review', () => {
    const c = catalog(); c.entries[0].version = '1.2.3-rc.1';
    assert.equal(planAdmission(c, request()).selected[0].version, '1.2.3-rc.1');
});
test('a different exact version is not treated as implicitly upgradeable', () => {
    const r = request(); r.requested.push({ id: 'meter', version: '1.2.4' });
    code('E_NOT_IN_CATALOG', () => planAdmission(catalog(), r));
});
test('unsigned approval metadata is a declaration, not release approval', () => {
    const c = catalog(); c.entries[0].review.status = 'approved-production';
    assert.equal(planAdmission(c, { ...request(), profile: 'production' }).enforcement, 'trusted-host-installer-required');
    c.entries[0].review.evidenceId = null;
    code('E_REVIEW_EVIDENCE', () => validateCatalog(c));
});
test('unknown fields at every trust boundary are rejected', () => {
    for (const location of ['root', 'entry', 'review', 'permissions']) {
        const c = catalog();
        const target = { root: c, entry: c.entries[0], review: c.entries[0].review, permissions: c.entries[0].permissions }[location];
        target.installUrl = 'https://invalid.example'; code('E_FIELDS', () => validateCatalog(c));
    }
    for (const field of ['requested', 'installed', 'active']) {
        const r = request(); r[field].push({ ...(field === 'installed' ? installed('meter') : ref('meter')), installUrl: 'secret' });
        code('E_FIELDS', () => planAdmission(catalog(), r));
    }
});
test('package URL and path injection have no accepted catalogue representation', () => {
    for (const name of ['https://evil.invalid/a', 'git+ssh://x/y', '../x', 'file:x', 'x;id', 'UPPER']) {
        const c = catalog(); c.entries[0].package = name; code('E_PACKAGE', () => validateCatalog(c));
    }
});
test('additional modules, shell exec and arbitrary javascript cannot be approved', () => {
    const c = catalog(); c.entries[0].permissions.additionalNpmModules.push('evil-package');
    code('E_ARRAY', () => validateCatalog(c));
    for (const permission of ['shellExec', 'arbitraryCode']) {
        const c = catalog(); c.entries[0].permissions[permission] = true;
        code('E_UNSAFE_EXECUTION', () => validateCatalog(c));
    }
    const js = catalog(); js.entries[1].package = 'iobroker.javascript';
    code('E_UNSAFE_EXECUTION', () => validateCatalog(js));
});
test('internal plaintext is blocked; field Modbus legacy is explicitly declared', () => {
    assert.ok(validateCatalog(catalog()).entries[0].permissions.protocols.includes('modbus-tcp'));
    const c = catalog(); c.entries[0].communication = 'legacy-unintegrated';
    code('E_INTERNAL_TRANSPORT', () => validateCatalog(c));
    c.entries[0].communication = 'eos-redis-tls13-v1'; c.entries[0].permissions.protocols = ['modbus-tcp'];
    code('E_INTERNAL_TRANSPORT', () => validateCatalog(c));
});
test('network claims cannot contradict declared TCP/discovery operations', () => {
    const c = catalog(); c.entries[1].review.status = 'pending'; c.entries[1].permissions.network = 'none';
    code('E_NETWORK_CONFLICT', () => validateCatalog(c));
});
test('duplicate IDs/packages/references/protocols are rejected', () => {
    let c = catalog(); c.entries.push(component('meter')); code('E_DUPLICATE_COMPONENT', () => validateCatalog(c));
    c = catalog(); c.entries[1].package = c.entries[0].package; code('E_DUPLICATE_COMPONENT', () => validateCatalog(c));
    c = catalog(); c.entries[0].permissions.protocols.push('modbus-tcp'); code('E_DUPLICATE', () => validateCatalog(c));
    for (const field of ['requested', 'installed', 'active']) {
        const r = request(); const row = field === 'installed' ? installed('meter') : ref('meter');
        r[field].push(row, row); code('E_DUPLICATE_COMPONENT', () => planAdmission(catalog(), r));
    }
});
test('duplicate JSON keys including escaped spelling cannot change review', () => {
    code('E_DUPLICATE_KEY', () => parseBoundedJson('{"status":"pending","sta\\u0074us":"approved-test"}'));
});
test('prototype pollution keys and inherited objects are rejected without mutation', () => {
    for (const key of ['__proto__', 'constructor', 'prototype']) {
        code('E_FORBIDDEN_KEY', () => parseBoundedJson(`{"${key}":{}}`));
        const c = catalog(); Object.defineProperty(c, key, { value: {}, enumerable: true });
        code('E_FORBIDDEN_KEY', () => validateCatalog(c));
    }
    code('E_OBJECT_PROTOTYPE', () => validateCatalog(Object.create(catalog())));
    assert.equal(Object.prototype.polluted, undefined);
});
test('object API does not call getters, toJSON, or accept hidden/symbol fields', () => {
    let ran = false; const c = catalog();
    Object.defineProperty(c, 'entries', { enumerable: true, get() { ran = true; return []; } });
    code('E_DATA_PROPERTY', () => validateCatalog(c)); assert.equal(ran, false);
    const toJSON = catalog(); toJSON.toJSON = () => { ran = true; return catalog(); };
    code('E_DATA_TYPE', () => validateCatalog(toJSON)); assert.equal(ran, false);
    const hidden = catalog(); Object.defineProperty(hidden, 'secret', { value: true });
    code('E_DATA_PROPERTY', () => validateCatalog(hidden));
    const symbol = catalog(); symbol[Symbol('secret')] = true;
    code('E_DATA_PROPERTY', () => validateCatalog(symbol));
});
test('parser rejects invalid syntax, Unicode, unsafe numbers and excessive nesting/bytes', () => {
    for (const value of ['{"x":1,}', '[1,]', '', '{"x":NaN}', '{}garbage', '{"x":01}', '{"x":"\\x41"}'])
        assert.throws(() => parseBoundedJson(value), AdmissionError);
    code('E_UNICODE', () => parseBoundedJson('"\\ud800"'));
    code('E_JSON_NUMBER', () => parseBoundedJson('1e999'));
    code('E_JSON_NUMBER', () => parseBoundedJson('9007199254740993'));
    code('E_INPUT_COMPLEXITY', () => parseBoundedJson('['.repeat(22) + '0' + ']'.repeat(22)));
    code('E_INPUT_SIZE', () => parseBoundedJson(' '.repeat(1048577)));
});
test('cyclic and sparse arrays are rejected; valid parsed output is deeply immutable', () => {
    const c = catalog(); c.entries.push(c); code('E_INPUT_COMPLEXITY', () => validateCatalog(c));
    const sparse = catalog(); sparse.entries.length = 10; code('E_DATA_PROPERTY', () => validateCatalog(sparse));
    const parsed = parseCatalog(JSON.stringify(catalog()));
    assert.equal(Object.isFrozen(parsed.entries[0].permissions), true);
    assert.throws(() => parsed.entries[0].version = '9.0.0', TypeError);
});
test('strict real data types and missing keys are not coerced', () => {
    for (const value of ['true', 1, null]) {
        const c = catalog(); c.entries[0].required = value; code('E_ENTRY_KIND', () => validateCatalog(c));
    }
    const c = catalog(); delete c.entries[0].permissions;
    code('E_FIELDS', () => validateCatalog(c));
    code('E_PROFILE', () => planAdmission(catalog(), { ...request(), profile: 'development' }));
});
test('tree digest canonicalizes file order and binds path, size and content hash', () => {
    const rows = [{ path: 'z/file.txt', size: 7, sha256: digest }, { path: 'package.json', size: 1, sha256: digest }];
    const expected = crypto.createHash('sha256').update(JSON.stringify([rows[1], rows[0]])).digest('hex');
    assert.equal(componentTreeDigest(rows), expected);
    assert.equal(componentTreeDigest(rows.slice().reverse()), expected);
    for (const field of ['path', 'size', 'sha256']) {
        const changed = structuredClone(rows); changed[0][field] = field === 'path' ? 'other/file.txt' : field === 'size' ? 8 : crypto.randomBytes(32).toString('hex');
        assert.notEqual(componentTreeDigest(changed), expected);
    }
});
test('tree metadata rejects traversal, duplicate paths, sparse/accessor rows, unsafe sizes', () => {
    for (const path of ['../a', '/a', 'a/../b', 'a//b', 'a/./b', 'a\\b', 'a\u0000b'])
        code('E_TREE_PATH', () => componentTreeDigest([{ path, size: 1, sha256: digest }]));
    const row = { path: 'a', size: 1, sha256: digest };
    code('E_TREE_DUPLICATE', () => componentTreeDigest([row, row]));
    code('E_TREE_SIZE', () => componentTreeDigest([{ ...row, size: -1 }]));
    code('E_DATA_PROPERTY', () => componentTreeDigest(new Array(1)));
    const getter = [row]; Object.defineProperty(getter, 0, { enumerable: true, get() { throw new Error('must not call'); } });
    code('E_DATA_PROPERTY', () => componentTreeDigest(getter));
});
test('CLI returns bounded JSON, handles invalid UTF8 and never leaks paths/input into errors', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-policy-'));
    const cli = path.resolve(__dirname, '../../runtime/policy/cli.cjs');
    const c = path.join(dir, 'catalog.json'), r = path.join(dir, 'request.json');
    try {
        fs.writeFileSync(c, JSON.stringify(catalog())); fs.writeFileSync(r, JSON.stringify(request()));
        const run = () => spawnSync(process.execPath, [cli, '--catalog', c, '--request', r], { encoding: 'utf8', timeout: 3000 });
        let result = run(); assert.equal(result.status, 0); assert.equal(JSON.parse(result.stdout).plan.selected.length, 1);
        fs.writeFileSync(c, '{"private":"do-not-log-this"}'); result = run();
        assert.equal(result.status, 1); assert.deepEqual(JSON.parse(result.stdout), { ok: false, code: 'E_FIELDS' });
        assert.equal(result.stderr, ''); assert.equal(result.stdout.includes(dir), false);
        fs.writeFileSync(c, Buffer.from([0xc0, 0xaf])); result = run();
        assert.equal(JSON.parse(result.stdout).code, 'E_INPUT_ENCODING');
        fs.unlinkSync(c); fs.symlinkSync(r, c); result = run();
        assert.equal(JSON.parse(result.stdout).code, 'E_INPUT_IO');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
