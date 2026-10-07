'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { validatePreparation, contentRows, sha, BASE_RELEASE_ID } = require('./fixture.cjs');
const root = '/tmp/r9-fixture-contract';
const good = { schemaVersion: 1, kind: 'unsigned-r9-native-preparation', signed: false, unsignedFixture: true, sequence: 12, nodeVersion: '24.21.0',
    app: root + '/r9-build/app', sourceCommit: 'a'.repeat(40), appContentSha256: 'b'.repeat(64), previousSignatureVerified: true, previousReleaseId: BASE_RELEASE_ID };
test('R9 preparation admits only exact unsigned current app identity and authenticated baseline', () => {
    assert.equal(validatePreparation(good, root), good);
    for (const patch of [{ signed: true }, { kind: 'signed-r9' }, { sequence: 11 }, { nodeVersion: '24.19.0' },
        { app: root + '/r7/app' }, { sourceCommit: 'main' }, { previousSignatureVerified: false }, { appContentSha256: '' }, { previousReleaseId: 'c'.repeat(64) }]) {
        assert.throws(() => validatePreparation({ ...good, ...patch }, root), { code: 'R9_NATIVE_PREPARATION' });
    }
});
test('fixed root fixture refuses outside explicitly authorized disposable GitHub hosts before touching paths', () => {
    const previous = process.env.EOS_DISPOSABLE_R9_LAB;
    delete process.env.EOS_DISPOSABLE_R9_LAB;
    try { assert.throws(() => require('./prepare-fixed-root.cjs').prepare('/tmp', '1001', '1001'), /R9_NATIVE_ROOT_FIXTURE_REJECTED/); }
    finally { if (previous === undefined) delete process.env.EOS_DISPOSABLE_R9_LAB; else process.env.EOS_DISPOSABLE_R9_LAB = previous; }
});
test('content hash equals a canonical signed-manifest projection and ignores only read-only mode tightening', t => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r9-content-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    fs.mkdirSync(path.join(dir, 'a')); fs.writeFileSync(path.join(dir, 'a/x'), 'inner'); fs.writeFileSync(path.join(dir, 'a.txt'), 'outer');
    const first = contentRows(dir);
    assert.deepEqual(first.map(row => row.path), ['a.txt', 'a/x']);
    const signatureProjection = require('../../runtime/release/bundle.cjs').inventory(dir).map(row => ({ path: row.path, size: row.size, sha256: row.sha256 }));
    assert.equal(sha(JSON.stringify(first)), sha(JSON.stringify(signatureProjection)));
    fs.chmodSync(path.join(dir, 'a.txt'), 0o444); assert.deepEqual(contentRows(dir), first);
    fs.writeFileSync(path.join(dir, 'a/x'), 'changed'); assert.notEqual(sha(JSON.stringify(contentRows(dir))), sha(JSON.stringify(first)));
});
test('R9 diagnostics preserve only explicit fixed codes', () => {
    const { stageFailure } = require('./diagnostics.cjs');
    assert.equal(stageFailure({ code: 'R9_LICENSE_UI_COOKIE', message: 'private' }), 'R9_LICENSE_UI_COOKIE');
    assert.equal(stageFailure({ code: 'R9_LICENSE_PRIVATE_SECRET', message: 'private' }), 'MANAGEMENT_STAGE_FAILED');
});
test('root fixture diagnostics expose only allowlisted guard reasons, never exception text or paths', () => {
    const { failureLine } = require('./prepare-fixed-root.cjs');
    for (const reason of ['ROOT_UID', 'CI_CONTEXT', 'NODE_VERSION', 'LAB_OWNER', 'LAB_MODE', 'OPT_OWNER', 'OPT_MODE', 'PREPARATION_FILE']) {
        assert.equal(failureLine({ reason, message: 'private-path-and-token' }), `R9_NATIVE_ROOT_FIXTURE_REJECTED:${reason}\n`);
    }
    for (const error of [null, new Error('private-path-and-token'), { reason: 'private-path-and-token' }, { code: 'OPT_MODE' }]) {
        assert.equal(failureLine(error), 'R9_NATIVE_ROOT_FIXTURE_REJECTED:UNEXPECTED\n');
    }
});
