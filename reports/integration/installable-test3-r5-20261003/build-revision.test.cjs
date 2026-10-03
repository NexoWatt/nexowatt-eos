'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { sha256 } = require('../../../runtime/release/bundle.cjs');
const { BASE, NEXT, COMMONJS, OVERLAYS, assertOverlayDelta } = require('./build-revision.cjs');
const ROOT = path.resolve(__dirname, '../../..');
test('R4 baseline pins match retained published metadata and public key exactly', () => {
    const dir = path.join(ROOT, BASE.directory), meta = JSON.parse(fs.readFileSync(path.join(dir, 'delivery.json')));
    assert.equal(BASE.releaseId, meta.releaseId); assert.equal(BASE.sha256, meta.sha256); assert.equal(BASE.bytes, meta.bytes);
    assert.equal(BASE.keySha256, meta.signingPublicKeySha256);
    assert.equal(BASE.keySha256, sha256(fs.readFileSync(path.join(dir, 'release-public.pem'))));
    assert.equal(NEXT, 'delivery/test-pi-0.2.0-test.3-r5');
});
test('four executable overlays use exact tracked plain CommonJS source/build bytes', () => {
    assert.equal(COMMONJS.length, 4); assert.equal(OVERLAYS.length, 6);
    for (const name of COMMONJS) {
        const src = fs.readFileSync(path.join(ROOT, 'components/admin/src/lib', name));
        assert.deepEqual(fs.readFileSync(path.join(ROOT, 'components/admin/build/lib', name)), src);
        assert.ok(!src.toString().includes('sourceMappingURL='));
    }
});
test('overlay inventory rejects undeclared byte edits, missing files and removed files', () => {
    const before = [{ path: 'a', size: 1, sha256: 'old' }, { path: 'b', size: 1, sha256: 'same' }];
    const after = [{ path: 'a', size: 2, sha256: 'new' }, { path: 'b', size: 1, sha256: 'same' }];
    const bindings = [{ target: 'a', bytes: 2, sha256: 'new', previousSha256: 'old' }];
    assertOverlayDelta(before, after, bindings);
    assert.throws(() => assertOverlayDelta(before, [{ ...after[0], sha256: 'wrong' }, after[1]], bindings), { code: 'R5_OVERLAY_BINDING' });
    assert.throws(() => assertOverlayDelta(before, [after[0], { ...after[1], sha256: 'wrong' }], bindings), { code: 'R5_UNDECLARED_APP_CHANGE' });
    assert.throws(() => assertOverlayDelta(before, [after[0]], bindings), { code: 'R5_APP_FILE_REMOVAL_OR_MISSING_OVERLAY' });
});
