'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { validatePreparation, contentRows, sha, BASE_RELEASE_ID } = require('./fixture.cjs');
const { LeaseObserver } = require('./lease-observer.cjs');
const root = '/tmp/own-adapter-contract';
const good = { schemaVersion: 1, kind: 'unsigned-own-adapters-native-preparation', signed: false, unsignedFixture: true,
    sequence: 13, nodeVersion: '24.21.0', app: root + '/own-adapters-build/app', baselineApp: root + '/own-adapters-build/baseline',
    sourceCommit: 'a'.repeat(40), appContentSha256: 'b'.repeat(64), baselineContentSha256: 'c'.repeat(64),
    previousSignatureVerified: true, previousReleaseId: BASE_RELEASE_ID };
const names = ['nexowatt-ui', 'nexowatt-devices', 'eebus', 'ocpp21', 'nexowatt-backup'];
test('unsigned own-adapter preparation requires authenticated R9, both exact inventories and candidate scope', () => {
    assert.equal(validatePreparation(good, root), good);
    for (const patch of [{ signed: true }, { unsignedFixture: false }, { kind: 'signed-release' }, { sequence: 12 },
        { nodeVersion: '24.19.0' }, { app: root + '/r9/app' }, { baselineApp: '/tmp/other' }, { sourceCommit: 'main' },
        { previousSignatureVerified: false }, { baselineContentSha256: '' }, { previousReleaseId: 'd'.repeat(64) }])
        assert.throws(() => validatePreparation({ ...good, ...patch }, root), { code: 'OWN_NATIVE_PREPARATION' });
});
test('root path provision refuses ordinary/local context before any write', () => {
    const previous = process.env.EOS_DISPOSABLE_OWN_ADAPTERS_LAB;
    delete process.env.EOS_DISPOSABLE_OWN_ADAPTERS_LAB;
    try { assert.throws(() => require('./prepare-fixed-root.cjs').prepare('/tmp', '1001', '1001'), /OWN_NATIVE_ROOT_FIXTURE_REJECTED/); }
    finally { if (previous === undefined) delete process.env.EOS_DISPOSABLE_OWN_ADAPTERS_LAB; else process.env.EOS_DISPOSABLE_OWN_ADAPTERS_LAB = previous; }
});
test('content identity permits mode hardening only and detects actual content drift', t => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'own-adapter-inventory-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    fs.writeFileSync(path.join(dir, 'file'), 'source');
    const original = sha(JSON.stringify(contentRows(dir)));
    fs.chmodSync(path.join(dir, 'file'), 0o444);
    assert.equal(sha(JSON.stringify(contentRows(dir))), original);
    fs.chmodSync(path.join(dir, 'file'), 0o600); fs.writeFileSync(path.join(dir, 'file'), 'different');
    assert.notEqual(sha(JSON.stringify(contentRows(dir))), original);
});
function envelope(valid, edition) {
    return { from: 'system.adapter.eos-admin.0', command: 'eos.license.check', callback: { ack: true },
        message: { v: 1, nonce: 'e'.repeat(32), valid, code: valid ? 'LICENSE_VALID' : 'LICENSE_MISSING',
            edition, checkedAt: Date.now(), validUntil: Date.now() + 14000 } };
}
function observeAll(observer, valid, edition) {
    for (const name of names) observer.observe('messagebox.system.adapter.' + name + '.0', envelope(valid, edition));
}
test('passive observer requires all five consumers, correct central response and fresh phase', () => {
    const observer = new LeaseObserver(names);
    assert.equal(observer.matches(false, null), false);
    observeAll(observer, false, null); assert.equal(observer.matches(false, null), true);
    observer.reset(); assert.equal(observer.matches(false, null), false);
    observeAll(observer, true, 'home'); assert.equal(observer.matches(true, 'home'), true);
    assert.equal(observer.matches(true, 'pro'), false);
    assert.deepEqual(Object.keys(observer.seen.get('eebus')).sort(), ['edition', 'observedAt', 'valid']);
    observer.reset(); observeAll(observer, true, 'pro'); assert.equal(observer.matches(true, 'pro'), true);
});
test('observer rejects forged origin, wrong route, unacknowledged request, stale lease and missing consumer', () => {
    const patches = [{ from: 'system.adapter.other.0' }, { command: 'different' }, { callback: { ack: false } },
        { message: { ...envelope(true, 'home').message, nonce: 'secret' } },
        { message: { ...envelope(true, 'home').message, validUntil: Date.now() - 1 } },
        { message: { ...envelope(true, 'home').message, checkedAt: Date.now() - 60000 } }];
    for (const patch of patches) {
        const observer = new LeaseObserver(names);
        for (const name of names) observer.observe('messagebox.system.adapter.' + name + '.0', { ...envelope(true, 'home'), ...patch });
        assert.equal(observer.matches(true, 'home'), false);
    }
    const observer = new LeaseObserver(names);
    for (const name of names.slice(1)) observer.observe('messagebox.system.adapter.' + name + '.0', envelope(true, 'home'));
    assert.equal(observer.matches(true, 'home'), false);
    assert.throws(() => new LeaseObserver(['nexowatt-ui']), /OWN_NATIVE_LEASE_SCOPE/);
});
test('diagnostics never expose exception text or unknown data', () => {
    const { stageFailure } = require('./diagnostics.cjs');
    assert.equal(stageFailure({ code: 'OWN_NATIVE_ALL_ALIVE_DEADLINE', message: 'private' }), 'OWN_NATIVE_ALL_ALIVE_DEADLINE');
    assert.equal(stageFailure(new Error('private configuration')), 'MANAGEMENT_STAGE_FAILED');
    assert.equal(require('./prepare-fixed-root.cjs').failureLine({ reason: 'private token' }), 'OWN_NATIVE_ROOT_FIXTURE_REJECTED:UNEXPECTED\n');
});
test('historical R9 profile/harness remains separate and new evidence makes no release or hardware claim', () => {
    const source = fs.readFileSync(path.join(__dirname, 'management.integration.cjs'), 'utf8');
    assert.match(source, /unsignedFixture: true/); assert.match(source, /hardwareTested: false/);
    assert.match(source, /actualSystemdMountPolicy: false/); assert.match(source, /productionReleaseApproved: false/);
    assert.doesNotMatch(source, /noPhysicalAdapters = true/);
    assert.match(fs.readFileSync(path.join(__dirname, '../integration-r9/management.integration.cjs'), 'utf8'), /pids.length === 3/);
    assert.match(source, /pids.length === 7/);
});
