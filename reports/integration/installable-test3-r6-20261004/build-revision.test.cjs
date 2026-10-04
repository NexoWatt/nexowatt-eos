'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const { sha256 } = require('../../../runtime/release/bundle.cjs');
const { BASE, R4, NEXT, WORK, COMMONJS, sourceTarget, sourceEntries, assertOverlayDelta } = require('./build-revision.cjs');
const { exactSourceBindings } = require('./verify-candidate.cjs');
const ROOT = path.resolve(__dirname, '../../..');
function tracked(file) {
    // Sparse local checkout and normal CI checkout verify the same Git blob.
    return cp.execFileSync('git', ['show', 'HEAD:' + file], { cwd: ROOT, timeout: 10000, maxBuffer: 4 * 1024 * 1024 });
}
test('R5 baseline pins match retained immutable delivery metadata and public key', () => {
    const meta = JSON.parse(tracked(BASE.directory + '/delivery.json'));
    for (const [a, b] of [['releaseId', 'releaseId'], ['sha256', 'sha256'], ['bytes', 'bytes'], ['keySha256', 'signingPublicKeySha256']]) assert.equal(BASE[a], meta[b]);
    assert.equal(BASE.keySha256, sha256(tracked(BASE.directory + '/release-public.pem')));
    assert.equal(meta.deliveryRevision, 5); assert.equal(meta.releaseSequence, 8);
    assert.equal(NEXT, 'delivery/test-pi-0.2.0-test.3-r6'); assert.equal(WORK, '.work/runtime-test3-r6-20261004');
});
test('direct R4 and R5 update pins exactly match authenticated historical delivery identities', () => {
    const { BASES } = require('../../../tools/system/update-test-to-r6.cjs');
    for (const [base, sequence] of [[R4, 7], [BASE, 8]]) {
        const meta = JSON.parse(tracked(base.directory + '/delivery.json'));
        assert.equal(meta.releaseId, base.releaseId); assert.equal(meta.sha256, base.sha256); assert.equal(meta.bytes, base.bytes);
        assert.equal(sha256(tracked(base.directory + '/release-public.pem')), base.keySha256);
        assert.deepEqual(BASES.find(row => row.sequence === sequence), { releaseId: base.releaseId,
            publicKeySha256: base.keySha256, sequence, nodeVersion: '24.21.0', profile: 'test' });
    }
});
test('complete Admin source seal, runtime, metadata and Backup branding are mapped', () => {
    const entries = sourceEntries(), names = new Set(entries.map(row => row.source));
    const seal = JSON.parse(fs.readFileSync(path.join(ROOT, 'components/admin/NEXOWATT_EOS_PREBUILT_MANIFEST.json')));
    for (const file of Object.keys(seal.files)) assert.ok(names.has('components/admin/' + file), file);
    for (const file of ['components/admin/src-admin/index.html', 'components/backitup/admin/tab_m.html', 'components/backitup/admin/eos-product-loader.css', 'components/backitup/release-manifest.json', 'components/backitup/io-package.json']) assert.ok(names.has(file), file);
    assert.equal(sourceTarget('components/admin/src/lib/eosSessionSecurity.js'), 'node_modules/iobroker.eos-admin/src/lib/eosSessionSecurity.js');
    assert.equal(sourceTarget('components/devices/main.js'), null);
    assert.equal(sourceTarget('components/backitup/admin/custom/old.js'), null);
    assert.equal(sourceTarget('components/backitup/admin/assets/old.js.map'), null);
    for (const file of ['/etc/passwd', 'components/admin/../secret', 'components\\admin\\foo', 'components/admin//foo']) assert.throws(() => sourceTarget(file), { code: 'R6_SOURCE_PATH' });
});
test('plain CommonJS security modules match reviewed source and executable bytes', () => {
    assert.equal(COMMONJS.length, 4);
    for (const name of COMMONJS) {
        const source = fs.readFileSync(path.join(ROOT, 'components/admin/src/lib', name));
        assert.deepEqual(fs.readFileSync(path.join(ROOT, 'components/admin/build/lib', name)), source);
        assert.ok(!source.toString().includes('sourceMappingURL='));
    }
});
test('exact delta rejects hidden changes, duplicates, missing overlays and removals', () => {
    const before = [{ path: 'a', size: 1, sha256: 'old' }, { path: 'b', size: 1, sha256: 'same' }];
    const after = [{ path: 'a', size: 2, sha256: 'new' }, { path: 'b', size: 1, sha256: 'same' }];
    const changes = [{ target: 'a', bytes: 2, sha256: 'new', previousSha256: 'old' }];
    assertOverlayDelta(before, after, changes);
    assert.throws(() => assertOverlayDelta(before, [{ ...after[0], sha256: 'wrong' }, after[1]], changes), { code: 'R6_OVERLAY_BINDING' });
    assert.throws(() => assertOverlayDelta(before, [after[0], { ...after[1], sha256: 'wrong' }], changes), { code: 'R6_UNDECLARED_APP_CHANGE' });
    assert.throws(() => assertOverlayDelta(before, [after[0]], changes), { code: 'R6_APP_FILE_REMOVAL_OR_MISSING_OVERLAY' });
    assert.throws(() => assertOverlayDelta(before, after, [...changes, ...changes]), { code: 'R6_OVERLAY_DUPLICATE' });
    assert.throws(() => assertOverlayDelta(before, [...after, { path: 'extra', size: 1, sha256: 'extra' }], changes), { code: 'R6_UNDECLARED_APP_CHANGE' });
});
test('trusted publication rechecks complete source coverage and mandatory updater bytes', t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-r6-source-')); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const updater = 'tools/system/update-test-to-r6.cjs', src = 'components/admin/main.js', target = 'app/node_modules/iobroker.eos-admin/main.js';
    for (const file of [updater, src]) { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), 'reviewed'); }
    const hash = sha256(Buffer.from('reviewed'));
    const input = { root, entries: [{ source: src, target: target.slice(4) }], manifest: { files: [{ path: target, size: 8, sha256: hash }, { path: updater, size: 8, sha256: hash }] },
        binding: { sourceCoverage: [{ source: src, target, bytes: 8, sha256: hash }], hostFiles: [{ source: updater, target: updater, bytes: 8, sha256: hash }] } };
    exactSourceBindings(input);
    for (const mutate of [x => x.binding.sourceCoverage.pop(), x => x.binding.hostFiles.pop(), x => x.binding.sourceCoverage[0].sha256 = 'a'.repeat(64), x => x.manifest.files[0].sha256 = 'a'.repeat(64), x => x.binding.sourceCoverage.push(x.binding.sourceCoverage[0])]) {
        const broken = structuredClone(input); mutate(broken); assert.throws(() => exactSourceBindings(broken), { code: 'R6_TRUSTED_VERIFICATION_REJECTED' });
    }
    fs.writeFileSync(path.join(root, updater), 'unreviewed'); assert.throws(() => exactSourceBindings(input), { code: 'R6_TRUSTED_VERIFICATION_REJECTED' });
});
test('trusted full payload comparison rejects missing host files, policy/SBOM/license substitution and changed native modes', () => {
    const { assertFullPayload } = require('./verify-candidate.cjs');
    const expected = ['runtime/a.cjs', 'system/policy.json', 'catalog.json', 'sbom.cdx.json', 'LICENSE', 'app/native'].map(name => ({ path: name, size: 1, sha256: 'a'.repeat(64), mode: 0o644 }));
    assertFullPayload(expected, structuredClone(expected));
    assert.throws(() => assertFullPayload(expected, expected.slice(1)), { code: 'R6_TRUSTED_VERIFICATION_REJECTED' });
    for (let i = 0; i < expected.length; i++) {
        const actual = structuredClone(expected); actual[i].sha256 = 'b'.repeat(64);
        assert.throws(() => assertFullPayload(expected, actual), { code: 'R6_TRUSTED_VERIFICATION_REJECTED' });
    }
    const executable = structuredClone(expected); executable.at(-1).mode = 0o755;
    assert.throws(() => assertFullPayload(expected, executable), { code: 'R6_TRUSTED_VERIFICATION_REJECTED' });
    assert.throws(() => assertFullPayload(expected, [...expected, { path: 'injected' }]), { code: 'R6_TRUSTED_VERIFICATION_REJECTED' });
});
