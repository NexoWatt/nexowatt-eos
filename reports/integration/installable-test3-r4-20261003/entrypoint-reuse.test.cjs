'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { REUSED_ENTRYPOINTS, reusedEntrypointBinding } = require('../../../tools/integration/deliver-postgresql-test.cjs');
test('only the two byte-pinned historical entrypoints can be reused', () => {
    assert.equal(Object.keys(REUSED_ENTRYPOINTS).length, 2);
    for (const [source, pin] of Object.entries(REUSED_ENTRYPOINTS)) {
        const row = { sha256: pin.sha256, size: pin.bytes };
        const result = reusedEntrypointBinding(source, pin.target, row, pin.sourceSha256);
        assert.equal(result.rebuiltInThisRevision, false);
        assert.equal(result.transformation, 'unchanged-compiled-entrypoint-from-signed-r3-app');
        for (const args of [[source, pin.target, { ...row, sha256: '0'.repeat(64) }, pin.sourceSha256],
            [source, pin.target, { ...row, size: pin.bytes + 1 }, pin.sourceSha256],
            [source, pin.target, row, '0'.repeat(64)], [source, pin.target + '.other', row, pin.sourceSha256],
            [source + '.other', pin.target, row, pin.sourceSha256], [source, pin.target, undefined, pin.sourceSha256]])
            assert.throws(() => reusedEntrypointBinding(...args), /SOURCE_REUSED_ENTRYPOINT_MISMATCH/);
    }
});
