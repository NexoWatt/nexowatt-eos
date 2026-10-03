'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { REUSED_ENTRYPOINTS, reusedEntrypointBinding, legacyBackendMetadata } = require('../../../tools/integration/deliver-postgresql-test.cjs');
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
test('legacy Windows line endings are admitted only for exact signed backend metadata bytes', () => {
    const packages = { store: '@nexowatt/eos-postgresql-store',
        'db-objects-postgresql': '@iobroker/db-objects-postgresql',
        'db-states-postgresql': '@iobroker/db-states-postgresql' };
    for (const [name, pkg] of Object.entries(packages)) for (const file of ['package.json', 'LICENSE']) {
        const source = `runtime/postgresql/packages/${name}/${file}`, target = `app/node_modules/${pkg}/${file}`;
        const lf = Buffer.from('reviewed metadata\nsecond line\n'), crlf = Buffer.from('reviewed metadata\r\nsecond line\r\n');
        const row = { size: crlf.length, sha256: crypto.createHash('sha256').update(crlf).digest('hex') };
        assert.deepEqual(legacyBackendMetadata(source, target, lf, row), crlf);
        for (const args of [[source, target, Buffer.from('changed metadata\nsecond line\n'), row],
            [source, target, lf, { ...row, size: row.size + 1 }],
            [source, target, lf, { ...row, sha256: '0'.repeat(64) }],
            [source, target, crlf, row], [source, target, Buffer.from([255]), row],
            [source, target + '.other', lf, row], [source + '.other', target, lf, row],
            [source.replace(file, 'index.cjs'), target, lf, row]])
            assert.throws(() => legacyBackendMetadata(...args), /SOURCE_LEGACY_METADATA_MISMATCH/);
    }
});
