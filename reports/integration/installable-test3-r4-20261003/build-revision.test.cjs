'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { PREVIOUS, ARCHIVE, assertPreviousDelivery, appRows, assertSameContent } = require('./build-revision.cjs');
const previous = () => ({ runtimeVersion: '0.2.0-test.3', deliveryRevision: 3, releaseSequence: 6,
    platform: 'linux-arm64', archive: ARCHIVE, sha256: PREVIOUS.archiveSha256, bytes: PREVIOUS.archiveBytes,
    releaseId: PREVIOUS.releaseId, signingPublicKeySha256: PREVIOUS.publicKeySha256,
    productionReleaseApproved: false, physicalControlEnabled: false });
test('accepts only the fixed published R3 identity', () => {
    assert.doesNotThrow(() => assertPreviousDelivery(previous(), PREVIOUS.publicKeySha256));
    for (const [key, value] of Object.entries({ runtimeVersion: '0.2.0-test.2', deliveryRevision: 2, releaseSequence: 5,
        platform: 'linux-x64', archive: 'replacement.tar.gz', sha256: '0'.repeat(64), bytes: 1,
        releaseId: '0'.repeat(64), signingPublicKeySha256: '0'.repeat(64),
        productionReleaseApproved: true, physicalControlEnabled: true })) {
        assert.throws(() => assertPreviousDelivery({ ...previous(), [key]: value }, PREVIOUS.publicKeySha256),
            /REVISION_PREVIOUS_DELIVERY/, key);
    }
    assert.throws(() => assertPreviousDelivery(previous(), '0'.repeat(64)), /REVISION_PREVIOUS_DELIVERY/);
});
test('app comparison ignores other payload areas but detects every file difference', () => {
    const expected = [{ path: 'package.json', size: 2, sha256: '1'.repeat(64) }];
    const observed = appRows({ files: [{ path: 'app/package.json', size: 2, sha256: '1'.repeat(64), mode: 0o644 },
        { path: 'runtime/onboarding/frontend.cjs', size: 3, sha256: '2'.repeat(64), mode: 0o644 }] });
    assert.deepEqual(observed, expected);
    assert.doesNotThrow(() => assertSameContent(expected, observed));
    for (const changed of [[], [...expected, { path: 'extra', size: 0, sha256: '3'.repeat(64) }],
        [{ ...expected[0], size: 3 }], [{ ...expected[0], path: 'renamed' }], [{ ...expected[0], sha256: '4'.repeat(64) }]])
        assert.throws(() => assertSameContent(expected, changed), /REVISION_APP_CONTENT_MISMATCH/);
    assert.throws(() => appRows({ files: [] }), /REVISION_PREVIOUS_APP_EMPTY/);
});
