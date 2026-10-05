'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const builder = require('./build-revision.cjs');
const verifier = require('./verify-candidate.cjs');
const { inventory, sha256 } = require('../../../runtime/release/bundle.cjs');
function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-r9-overlay-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const app = path.join(root, 'app'); fs.mkdirSync(app);
    function write(relative, value, mode = 0o644) { const file = path.join(root, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, value); fs.chmodSync(file, mode); return file; }
    write('app/package-lock.json', '{"immutable":true}');
    write('app/node_modules/iobroker.nexowatt-ui/obsolete.js', 'legacy');
    write('app/node_modules/iobroker.nexowatt-ui/main.js', 'old');
    write('app/node_modules/iobroker.nexowatt-ui/node_modules/dependency/main.js', 'unchanged', 0o755);
    write('app/node_modules/third-party/main.js', 'unchanged');
    write('components/ui/main.js', 'new');
    const entries = [{ source: 'components/ui/main.js', target: 'node_modules/iobroker.nexowatt-ui/main.js', bytes: 3, sha256: sha256(Buffer.from('new')), mode: 0o644 }];
    return { root, app, write, entries, before: inventory(app) };
}
test('R9 has exact published R8 pins, sequence12, same six adapters and only two admitted', () => {
    assert.equal(builder.BASE.releaseId, 'eb3d1747c35988bdf8785e7a5cdfc786ab356fa87149054767d7c0ed211b7ea7');
    assert.equal(builder.BASE.bytes, 97504932); assert.equal(builder.METADATA.sequence, 12);
    assert.equal(builder.SPECS.length, 6); assert.equal(builder.SPECS.filter(spec => spec.execute).length, 2);
});
test('complete source file table removes obsolete own files but preserves nested and external dependencies byte and mode exact', t => {
    const f = fixture(t), applied = builder.overlaySource(f.app, f.before, f.entries, f.root);
    assert.equal(fs.existsSync(path.join(f.app, 'node_modules/iobroker.nexowatt-ui/obsolete.js')), false);
    assert.equal(fs.readFileSync(path.join(f.app, 'node_modules/iobroker.nexowatt-ui/main.js'), 'utf8'), 'new');
    assert.equal(applied.bindings.length, 2); assert.equal(applied.bindings.filter(row => !row.after).length, 1);
    for (const row of f.before.filter(row => !builder.ownSourcePath(row.path))) assert.deepEqual(applied.after.find(next => next.path === row.path), row);
    builder.assertOverlayDelta(f.before, applied.after, applied.bindings);
});
test('undeclared third-party/root lock changes and file mode changes are rejected', t => {
    const f = fixture(t), applied = builder.overlaySource(f.app, f.before, f.entries, f.root);
    for (const target of ['package-lock.json', 'node_modules/third-party/main.js', 'node_modules/iobroker.nexowatt-ui/node_modules/dependency/main.js']) {
        const after = structuredClone(applied.after); after.find(row => row.path === target).sha256 = '0'.repeat(64);
        assert.throws(() => builder.assertOverlayDelta(f.before, after, applied.bindings), /R9_UNDECLARED_APP_CHANGE/);
    }
    const after = structuredClone(applied.after); after.find(row => row.path.endsWith('node_modules/dependency/main.js')).mode = 0o644;
    assert.throws(() => builder.assertOverlayDelta(f.before, after, applied.bindings), /R9_UNDECLARED_APP_CHANGE/);
});
test('source drift, symlinks, unsafe namespace and duplicate target cannot become an overlay', t => {
    const f = fixture(t); f.write('components/ui/main.js', 'changed');
    assert.throws(() => builder.overlaySource(f.app, f.before, f.entries, f.root), /R9_SOURCE_CHANGED/);
    assert.throws(() => builder.overlaySource(f.app, f.before, [f.entries[0], f.entries[0]], f.root), /R9_SOURCE_SCOPE/);
    assert.throws(() => builder.overlaySource(f.app, f.before, [{ ...f.entries[0], target: 'node_modules/third-party/main.js' }], f.root), /R9_SOURCE_SCOPE/);
    fs.symlinkSync(path.join(f.root, 'components/ui/main.js'), path.join(f.root, 'components/ui/link.js'));
    assert.throws(() => builder.sourceFile(f.root, 'components/ui/link.js'), /R9_SOURCE_LINK/);
});
test('pack file table must contain package/main/central client, cannot include dependency files or stale size', t => {
    const f = fixture(t), spec = builder.SPECS.find(row => row.source === 'ui');
    const names = ['package.json', 'io-package.json', 'main.js', 'packages/eos-license-client/index.js', 'packages/eos-license-client/eos-platform.js', 'packages/eos-license-client/package.json'];
    const files = names.map(name => { f.write('components/ui/' + name, '{}'); return { path: name, size: 2, mode: 0o644 }; });
    const result = [{ name: spec.package, version: spec.version, files }];
    assert.equal(builder.validatePackTable(spec, result, f.root).length, 6);
    assert.throws(() => builder.validatePackTable(spec, [{ ...result[0], files: files.slice(0, -1) }], f.root), /R9_PACKAGE_REQUIRED_FILE/);
    assert.throws(() => builder.validatePackTable(spec, [{ ...result[0], files: [...files, { path: 'node_modules/evil/main.js' }] }], f.root), /R9_PACKAGE_PATH/);
    assert.throws(() => builder.validatePackTable(spec, [{ ...result[0], files: files.map(row => ({ ...row, size: 99 })) }], f.root), /R9_PACKAGE_TABLE_DRIFT/);
});
test('reports and reconstructed file table reject omissions and false target acceptance claims', () => {
    const delivery = { sha256: 'a'.repeat(64), signingPublicKeySha256: 'b'.repeat(64), physicalControlEnabled: false };
    const verification = { nativeTargetExecutionPerformed: false };
    const input = { delivery, reportDelivery: delivery, buildVerification: verification, expectedDelivery: delivery, expectedVerification: verification,
        checksumText: `${delivery.sha256}  ${builder.BASE.archive}\n${delivery.signingPublicKeySha256}  release-public.pem\n` };
    verifier.assertReports(input);
    assert.throws(() => verifier.assertReports({ ...input, buildVerification: { nativeTargetExecutionPerformed: true } }), /R9_TRUSTED_VERIFICATION_REJECTED/);
    assert.throws(() => verifier.assertReports({ ...input, checksumText: '' }), /R9_TRUSTED_VERIFICATION_REJECTED/);
    assert.throws(() => verifier.assertEqual([{ path: 'a' }], []), /R9_TRUSTED_VERIFICATION_REJECTED/);
});


test('signing CLI requires explicit absolute native evidence and rejects absent, duplicate or unknown options', () => {
    assert.deepEqual(builder.parseArgs(['--native-evidence', '/trusted/native']), { nativeEvidenceDirectory: '/trusted/native' });
    assert.deepEqual(builder.parseArgs(['--base-directory', '/trusted/r8', '--native-evidence', '/trusted/native']), { baseDirectory: '/trusted/r8', nativeEvidenceDirectory: '/trusted/native' });
    for (const args of [[], ['--base-directory', '/trusted/r8'], ['--native-evidence', 'relative'], ['--native-evidence', '/trusted/native', '--native-evidence', '/other'], ['--force', '/trusted/native']]) assert.throws(() => builder.parseArgs(args));
});
