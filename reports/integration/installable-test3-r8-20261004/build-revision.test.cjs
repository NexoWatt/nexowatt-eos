'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const { LIMITS, sha256, inventory } = require('../../../runtime/release/bundle.cjs');
const { BASE, R4, NEXT, METADATA, REQUIRED_RECOVERY, HISTORICAL_RECOVERY, READINESS_TOOL, sourceEntries, historicalInventory, assertUnchangedApp, assertHostChangeScope, retainedR7Evidence, transitionEvidence, deliveryMetadata, verificationMetadata, main } = require('./build-revision.cjs');
const { exactSourceBindings, assertFullPayload, assertReports } = require('./verify-candidate.cjs');
const { bindDerivative } = require('../../../tools/integration/bind-r8-derivative-sbom.cjs');
const ROOT = path.resolve(__dirname, '../../..');
function temp(t) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-r8-test-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true })); return directory;
}
function write(root, name, bytes) { fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true }); fs.writeFileSync(path.join(root, name), bytes); }
test('separate historical archives can exceed one payload ceiling while the actual payload limit still rejects them', t => {
    const root = temp(t);
    // Sparse fixtures reproduce the real aggregate overflow without storing
    // another GiB of release artifacts in the repository or CI artifact.
    for (let i = 0; i < 8; i++) {
        const file = path.join(root, `release-${i}.tar.gz`), fd = fs.openSync(file, 'wx');
        try { fs.ftruncateSync(fd, LIMITS.fileBytes); } finally { fs.closeSync(fd); }
    }
    write(root, 'release-8.txt', 'x');
    assert.equal(LIMITS.bytes, 1024 * 1024 * 1024);
    assert.equal(LIMITS.fileBytes, 128 * 1024 * 1024);
    assert.throws(() => inventory(root), { code: 'BUNDLE_SIZE' });
    const historical = historicalInventory(root);
    assert.equal(historical.length, 9);
    assert.equal(historical.reduce((sum, row) => sum + row.size, 0), LIMITS.bytes + 1);
    const emptyArchiveHash = sha256(Buffer.alloc(LIMITS.fileBytes));
    for (const row of historical.slice(0, 8)) assert.equal(row.sha256, emptyArchiveHash);
    assert.equal(historical[8].sha256, sha256(Buffer.from('x')));
});
test('historical inventory preserves ordinary sorted file hashes, sizes and executable modes', t => {
    const root = temp(t);
    write(root, 'z/readme.txt', 'history'); write(root, 'a/entry.sh', '#!/bin/sh\n'); write(root, 'top.txt', 'root');
    fs.chmodSync(path.join(root, 'a/entry.sh'), 0o755);
    assert.deepEqual(historicalInventory(root), inventory(root));
});
test('historical inventory retains bounded regular files and rejects links, unsafe paths and privileged modes', t => {
    for (const [prepare, code] of [
        [root => fs.symlinkSync('/etc/passwd', path.join(root, 'linked-file')), 'R8_HISTORY_FILE'],
        [root => fs.symlinkSync('/tmp', path.join(root, 'linked-directory')), 'R8_HISTORY_FILE'],
        [root => { write(root, 'one', 'x'); fs.linkSync(path.join(root, 'one'), path.join(root, 'two')); }, 'BUNDLE_FILE'],
        [root => { write(root, 'privileged', 'x'); fs.chmodSync(path.join(root, 'privileged'), 0o4644); }, 'R8_HISTORY_MODE'],
        [root => { const fd = fs.openSync(path.join(root, 'oversized'), 'wx'); try { fs.ftruncateSync(fd, LIMITS.fileBytes + 1); } finally { fs.closeSync(fd); } }, 'BUNDLE_FILE'],
        [root => write(root, 'unsafe:name', 'x'), 'BUNDLE_PATH'],
        [root => write(root, Array(49).fill('deep').join('/') + '/file', 'x'), 'BUNDLE_PATH'],
    ]) {
        const root = temp(t); prepare(root); assert.throws(() => historicalInventory(root), { code });
    }
    const parent = temp(t); fs.mkdirSync(path.join(parent, 'actual')); fs.symlinkSync(path.join(parent, 'actual'), path.join(parent, 'redirect'));
    assert.throws(() => historicalInventory(path.join(parent, 'redirect')), { code: 'BUNDLE_DIRECTORY' });
});
test('R7 baseline is exactly pinned to historical metadata/key; R8 uses a fresh sequence and path', () => {
    const tracked = file => cp.execFileSync('git', ['show', 'HEAD:' + BASE.directory + '/' + file], { cwd: ROOT, timeout: 10000 });
    const metadata = JSON.parse(tracked('delivery.json'));
    for (const [a, b] of [['releaseId', 'releaseId'], ['sha256', 'sha256'], ['bytes', 'bytes'], ['keySha256', 'signingPublicKeySha256']]) assert.equal(BASE[a], metadata[b]);
    assert.equal(BASE.keySha256, sha256(tracked('release-public.pem')));
    assert.equal(BASE.deliverySha256, sha256(tracked('delivery.json')));
    assert.equal(metadata.releaseSequence, 10); assert.equal(metadata.deliveryRevision, 7);
    assert.equal(NEXT, 'delivery/test-pi-0.2.0-test.3-r8'); assert.equal(METADATA.sequence, 11);
    assert.deepEqual(METADATA.platforms, ['linux-arm64']); assert.equal(METADATA.profile, 'test');
});
test('all executable backend sources are explicitly mapped to the actual installed npm copies', () => {
    const entries = sourceEntries(); assert.equal(entries.length, 6);
    const objects = entries.filter(row => row.target.startsWith('node_modules/@iobroker/db-objects-postgresql/'));
    assert.deepEqual(objects.map(row => path.basename(row.target)).sort(), ['auth.cjs', 'facade.cjs', 'index.cjs', 'views.cjs']);
    for (const entry of entries) {
        assert.ok(entry.source.startsWith('runtime/postgresql/packages/')); assert.ok(entry.target.endsWith('.cjs'));
        assert.ok(fs.readFileSync(path.join(ROOT, entry.source)).length > 0);
    }
});
test('recovery transition pins identify actual retained R4 sequence 7 and public key', () => {
    const tracked = file => cp.execFileSync('git', ['show', 'HEAD:' + R4.directory + '/' + file], { cwd: ROOT, timeout: 10000 });
    const metadata = JSON.parse(tracked('delivery.json'));
    assert.equal(metadata.releaseId, R4.releaseId); assert.equal(metadata.sha256, R4.sha256); assert.equal(metadata.bytes, R4.bytes);
    assert.equal(sha256(tracked('release-public.pem')), R4.keySha256); assert.equal(metadata.releaseSequence, 7);
    const { BASES } = require('../../../tools/system/recover-r4-restored-r7-to-r8.cjs');
    assert.deepEqual(BASES, [{ releaseId: R4.releaseId, publicKeySha256: R4.keySha256, sequence: 7, nodeVersion: '24.21.0', profile: 'test' }]);
});
test('R4 transition proof checks actual schema versions, admission and protected files without authorizing migration', () => {
    const schema = { path: 'runtime/postgresql/schema.sql', size: 2, mode: 0o644, sha256: 'a'.repeat(64) };
    const previous = { releaseId: R4.releaseId, manifest: { ...METADATA, sequence: 7, files: [schema] },
        catalog: { schemaVersion: 1, catalogRevision: 3, entries: [{ id: 'js-controller', version: '7.2.2', sha256: 'old', review: { status: 'approved-test' } }] } };
    const next = { releaseId: 'b'.repeat(64), manifest: { ...METADATA, files: [schema] },
        catalog: { schemaVersion: 1, catalogRevision: 7, entries: [{ id: 'js-controller', version: '7.2.2', sha256: 'new', review: { status: 'approved-test' } }] } };
    const result = transitionEvidence(previous, next);
    assert.equal(result.previousSequence, 7); assert.equal(result.targetSequence, 11);
    assert.equal(result.previousCatalogRevision, 3); assert.equal(result.targetCatalogRevision, 7);
    assert.equal(result.postgresqlSchemaFileUnchanged, true); assert.equal(result.targetExecutionPerformed, false);
    for (const mutate of [x => x.manifest.sequence = 9, x => x.manifest.schemaVersion = 2, x => x.catalog.schemaVersion = 2,
        x => x.manifest.files[0].sha256 = 'c'.repeat(64), x => x.catalog.entries[0].review.status = 'approved-production']) {
        const changed = structuredClone(next); mutate(changed); assert.throws(() => transitionEvidence(previous, changed));
    }
});
test('manufacturer builder rejects unsupported argument and target-repair interfaces', () => {
    for (const args of [['--force'], ['--base-directory', 'relative'], ['--target-root', '/tmp'], ['--publish'], ['--private-key', '/tmp/key']])
        assert.throws(() => main(args), { code: 'R8_BUILD_HOST' });
});
test('whole R7 app identity rejects changed bytes, modes, additions, omissions and duplicate rows', () => {
    const before = [{ path: 'a', size: 1, sha256: 'old', mode: 0o644 }, { path: 'b', size: 1, sha256: 'same', mode: 0o755 }];
    assertUnchangedApp(before, structuredClone(before));
    for (const after of [[{ ...before[0], sha256: 'changed' }, before[1]], [{ ...before[0], mode: 0o755 }, before[1]],
        before.slice(1), [...before, { path: 'new', size: 1, sha256: 'new', mode: 0o644 }], [...before, before[0]]])
        assert.throws(() => assertUnchangedApp(before, after), { code: 'R8_APP_CHANGE_NOT_AUTHORIZED' });
});
test('independent source binding requires both runtime and app copies plus exact host declarations', t => {
    const root = temp(t), source = 'runtime/postgresql/packages/db-objects-postgresql/index.cjs';
    const target = 'node_modules/@iobroker/db-objects-postgresql/index.cjs', profile = 'runtime/controller-profile/pid-state.cjs';
    for (const file of [source, profile, REQUIRED_RECOVERY, HISTORICAL_RECOVERY, READINESS_TOOL]) write(root, file, 'reviewed');
    const hash = sha256(Buffer.from('reviewed'));
    const host = [source, profile, REQUIRED_RECOVERY, HISTORICAL_RECOVERY, READINESS_TOOL].map(file => ({ source: file, target: file, bytes: 8, sha256: hash }));
    const input = { root, entries: [{ source, target }], manifest: { files: ['app/' + target, source, profile, REQUIRED_RECOVERY, HISTORICAL_RECOVERY, READINESS_TOOL].map(file => ({ path: file, size: 8, sha256: hash })) },
        binding: { sourceCoverage: [{ source, target, bytes: 8, sha256: hash }], hostFiles: host } };
    exactSourceBindings(input);
    for (const mutate of [x => x.binding.sourceCoverage.pop(), x => x.binding.hostFiles.pop(), x => x.binding.sourceCoverage[0].sha256 = '0'.repeat(64),
        x => x.manifest.files[0].sha256 = '0'.repeat(64), x => x.manifest.files[1].sha256 = '0'.repeat(64), x => x.binding.sourceCoverage.push(x.binding.sourceCoverage[0])]) {
        const changed = structuredClone(input); mutate(changed); assert.throws(() => exactSourceBindings(changed), { code: 'R8_TRUSTED_VERIFICATION_REJECTED' });
    }
    const withoutRecovery = structuredClone(input);
    withoutRecovery.manifest.files = withoutRecovery.manifest.files.filter(row => row.path !== REQUIRED_RECOVERY);
    withoutRecovery.binding.hostFiles = withoutRecovery.binding.hostFiles.filter(row => row.target !== REQUIRED_RECOVERY);
    assert.throws(() => exactSourceBindings(withoutRecovery), { code: 'R8_TRUSTED_VERIFICATION_REJECTED' });
    write(root, profile, 'unreviewed'); assert.throws(() => exactSourceBindings(input), { code: 'R8_TRUSTED_VERIFICATION_REJECTED' });
});
test('complete payload comparison rejects altered executable modes, policy, inventory, SBOM and licenses', () => {
    const expected = ['app/code', 'runtime/code', 'system/unit', 'catalog.json', 'sbom.cdx.json', 'LICENSE'].map(name => ({ path: name, size: 1, sha256: 'a'.repeat(64), mode: 0o644 }));
    assertFullPayload(expected, structuredClone(expected));
    for (let i = 0; i < expected.length; i++) {
        const changed = structuredClone(expected); changed[i].sha256 = 'b'.repeat(64);
        assert.throws(() => assertFullPayload(expected, changed), { code: 'R8_TRUSTED_VERIFICATION_REJECTED' });
    }
    const changed = structuredClone(expected); changed[0].mode = 0o755;
    for (const actual of [changed, expected.slice(1), [...expected, { path: 'injected' }]]) assert.throws(() => assertFullPayload(expected, actual));
});
test('published delivery, proof report and checksum twins must equal recomputed trusted metadata', () => {
    const release = { releaseId: 'a'.repeat(64), archiveSha256: 'b'.repeat(64), signingPublicKeySha256: 'c'.repeat(64), archiveBytes: 123, manifest: { files: [{ path: 'one' }] } };
    const expectedDelivery = deliveryMetadata({ previousDelivery: { scope: 'management only' }, release, sourceCommit: 'd'.repeat(40), installedComponents: [{ id: 'js-controller', physicalControlEnabled: false }] });
    const expectedVerification = verificationMetadata({ sourceCommit: 'd'.repeat(40), timestamp: '2026-10-04T00:00:00Z', release, historicalCount: 109 });
    const input = { expectedDelivery, expectedVerification, delivery: structuredClone(expectedDelivery), reportDelivery: structuredClone(expectedDelivery),
        buildVerification: structuredClone(expectedVerification), checksumText: `${release.archiveSha256}  ${BASE.archive}\n${release.signingPublicKeySha256}  release-public.pem\n` };
    assertReports(input);
    for (const mutate of [x => x.delivery.installedComponents[0].physicalControlEnabled = true, x => x.reportDelivery.targetTestRequired = false,
        x => x.delivery.scope = 'all devices production approved', x => x.buildVerification.hardwareTested = true,
        x => x.buildVerification.nativeTargetExecutionPerformed = true, x => x.buildVerification.historicalDeliveryFilesUnchanged++,
        x => x.buildVerification.buildNode = '99.0.0', x => x.checksumText = 'unverified\n', x => x.reportDelivery.extraApproval = true]) {
        const changed = structuredClone(input); mutate(changed); assert.throws(() => assertReports(changed), { code: 'R8_TRUSTED_VERIFICATION_REJECTED' });
    }
});
test('host gate requires changed readiness, new R8 helper and byte-identical historical R7 helper', () => {
    const row = (path, sha256) => ({ path, sha256, size: 1, mode: 0o644 });
    const original = [row(HISTORICAL_RECOVERY, 'old-helper'), row(READINESS_TOOL, 'old-probe')];
    const current = [original[0], row(READINESS_TOOL, 'new-probe'), row(REQUIRED_RECOVERY, 'new-helper')];
    assertHostChangeScope({ files: original }, current);
    for (const rows of [current.slice(0, 2), [row(HISTORICAL_RECOVERY, 'changed'), ...current.slice(1)], [current[0], original[1], current[2]]])
        assert.throws(() => assertHostChangeScope({ files: original }, rows));
});
test('retained attempt provenance binds the actual R7 identity but does not claim target journal verification', () => {
    const result = retainedR7Evidence({ checked: { releaseId: BASE.releaseId, manifest: { sequence: 10 } } });
    assert.equal(result.releaseId, BASE.releaseId); assert.equal(result.publicKeySha256, BASE.keySha256);
    assert.equal(result.requiredRetainedJournalPhase, 'RESTORED_STOPPED'); assert.equal(result.targetJournalValidated, false);
    assert.throws(() => retainedR7Evidence({ checked: { releaseId: BASE.releaseId, manifest: { sequence: 9 } } }), { code: 'R8_RETAINED_R7_IDENTITY' });
});
function sbomFixture(t) {
    const app = temp(t), prefix = 'node_modules/@iobroker/db-objects-postgresql/';
    write(app, 'package.json', JSON.stringify({ name: 'eos', version: '1' }));
    write(app, 'package-lock.json', JSON.stringify({ lockfileVersion: 3 }));
    write(app, prefix + 'package.json', JSON.stringify({ name: '@iobroker/db-objects-postgresql', version: '0.1.0-dev.2' }));
    write(app, prefix + 'index.cjs', 'authenticated-fixed-code');
    const previousManifest = { files: inventory(app).map(row => ({ ...row, path: 'app/' + row.path })) };
    const previousSbom = { bomFormat: 'CycloneDX', specVersion: '1.5', serialNumber: 'old', version: 1,
        metadata: { timestamp: '2026-10-04T00:00:00Z', component: { name: 'eos', version: '1' }, properties: [] },
        components: [{ type: 'library', name: '@iobroker/db-objects-postgresql', version: '0.1.0-dev.2', modified: true,
            pedigree: { ancestors: [{ name: 'old', version: '1' }] }, properties: [{ name: 'eos:derivative:source-commit', value: 'retained-r7' }] }], dependencies: [] };
    return { app, previousManifest, previousSbom, previousReleaseId: 'a'.repeat(64), sourceCommit: 'b'.repeat(40), timestamp: '2026-10-04T12:00:00Z' };
}
test('host-only SBOM changes metadata and preserves every component, pedigree and graph declaration', t => {
    const input = sbomFixture(t), output = bindDerivative(input);
    assert.deepEqual(output.bom.components, input.previousSbom.components); assert.deepEqual(output.bom.dependencies, input.previousSbom.dependencies);
    assert.equal(output.bom.serialNumber, undefined); assert.deepEqual(output.evidence.changed, []); assert.deepEqual(output.evidence.derivatives, []);
    assert.equal(output.evidence.applicationUnchanged, true); assert.equal(output.evidence.npmResolutionPerformed, false);
    assert.equal(output.evidence.vulnerabilityScanPerformed, false); assert.equal(input.previousSbom.serialNumber, 'old');
});
test('host-only SBOM refuses code, lock, metadata, permissions and file-set changes', t => {
    for (const mutate of [app => write(app, 'package-lock.json', '{}'), app => write(app, 'node_modules/@iobroker/db-objects-postgresql/index.cjs', 'changed'),
        app => write(app, 'node_modules/new/index.js', 'new'), app => fs.chmodSync(path.join(app, 'package.json'), 0o755),
        app => fs.unlinkSync(path.join(app, 'package.json'))]) {
        const input = sbomFixture(t); mutate(input.app); assert.throws(() => bindDerivative(input), { code: 'R8_APP_CHANGE_NOT_AUTHORIZED' });
    }
});
test('host-only SBOM requires immutable source and prior release identifiers', t => {
    const input = sbomFixture(t);
    assert.throws(() => bindDerivative({ ...input, sourceCommit: 'main' }), { code: 'R8_SBOM_INPUT' });
    assert.throws(() => bindDerivative({ ...input, previousReleaseId: 'unknown' }), { code: 'R8_SBOM_INPUT' });
});
