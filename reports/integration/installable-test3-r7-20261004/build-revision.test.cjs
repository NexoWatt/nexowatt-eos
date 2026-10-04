'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const { sha256, inventory } = require('../../../runtime/release/bundle.cjs');
const { BASE, R4, NEXT, METADATA, REQUIRED_RECOVERY, sourceEntries, assertOverlayDelta, transitionEvidence, deliveryMetadata, verificationMetadata, main } = require('./build-revision.cjs');
const { exactSourceBindings, assertFullPayload, assertReports } = require('./verify-candidate.cjs');
const { bindDerivative } = require('../../../tools/integration/bind-r7-derivative-sbom.cjs');
const ROOT = path.resolve(__dirname, '../../..');
function temp(t) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-r7-test-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true })); return directory;
}
function write(root, name, bytes) { fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true }); fs.writeFileSync(path.join(root, name), bytes); }
test('R6 baseline is exactly pinned to historical metadata/key; R7 uses a fresh sequence and path', () => {
    const tracked = file => cp.execFileSync('git', ['show', 'HEAD:' + BASE.directory + '/' + file], { cwd: ROOT, timeout: 10000 });
    const metadata = JSON.parse(tracked('delivery.json'));
    for (const [a, b] of [['releaseId', 'releaseId'], ['sha256', 'sha256'], ['bytes', 'bytes'], ['keySha256', 'signingPublicKeySha256']]) assert.equal(BASE[a], metadata[b]);
    assert.equal(BASE.keySha256, sha256(tracked('release-public.pem')));
    assert.equal(metadata.releaseSequence, 9); assert.equal(metadata.deliveryRevision, 6);
    assert.equal(NEXT, 'delivery/test-pi-0.2.0-test.3-r7'); assert.equal(METADATA.sequence, 10);
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
    const { BASES } = require('../../../tools/system/recover-r4-first-start-to-r7.cjs');
    assert.deepEqual(BASES, [{ releaseId: R4.releaseId, publicKeySha256: R4.keySha256, sequence: 7, nodeVersion: '24.21.0', profile: 'test' }]);
});
test('R4 transition proof checks actual schema versions, admission and protected files without authorizing migration', () => {
    const schema = { path: 'runtime/postgresql/schema.sql', size: 2, mode: 0o644, sha256: 'a'.repeat(64) };
    const previous = { releaseId: R4.releaseId, manifest: { ...METADATA, sequence: 7, files: [schema] },
        catalog: { schemaVersion: 1, catalogRevision: 3, entries: [{ id: 'js-controller', version: '7.2.2', sha256: 'old', review: { status: 'approved-test' } }] } };
    const next = { releaseId: 'b'.repeat(64), manifest: { ...METADATA, files: [schema] },
        catalog: { schemaVersion: 1, catalogRevision: 6, entries: [{ id: 'js-controller', version: '7.2.2', sha256: 'new', review: { status: 'approved-test' } }] } };
    const result = transitionEvidence(previous, next);
    assert.equal(result.previousSequence, 7); assert.equal(result.targetSequence, 10);
    assert.equal(result.previousCatalogRevision, 3); assert.equal(result.targetCatalogRevision, 6);
    assert.equal(result.postgresqlSchemaFileUnchanged, true); assert.equal(result.targetExecutionPerformed, false);
    for (const mutate of [x => x.manifest.sequence = 9, x => x.manifest.schemaVersion = 2, x => x.catalog.schemaVersion = 2,
        x => x.manifest.files[0].sha256 = 'c'.repeat(64), x => x.catalog.entries[0].review.status = 'approved-production']) {
        const changed = structuredClone(next); mutate(changed); assert.throws(() => transitionEvidence(previous, changed));
    }
});
test('manufacturer builder rejects unsupported argument and target-repair interfaces', () => {
    for (const args of [['--force'], ['--base-directory', 'relative'], ['--target-root', '/tmp'], ['--publish'], ['--private-key', '/tmp/key']])
        assert.throws(() => main(args), { code: 'R7_BUILD_HOST' });
});
test('exact app delta rejects hidden mutations, duplicate rows, additions and removals', () => {
    const before = [{ path: 'a', size: 1, sha256: 'old' }, { path: 'b', size: 1, sha256: 'same' }];
    const after = [{ path: 'a', size: 2, sha256: 'new' }, before[1]];
    const bindings = [{ target: 'a', bytes: 2, sha256: 'new', previousSha256: 'old' }];
    assertOverlayDelta(before, after, bindings);
    for (const [rows, changes] of [
        [[{ ...after[0], sha256: 'wrong' }, after[1]], bindings],
        [[after[0], { ...after[1], sha256: 'hidden' }], bindings],
        [[after[0]], bindings], [[...after, { path: 'extra', size: 1, sha256: 'extra' }], bindings],
        [after, [...bindings, ...bindings]], [[...after, after[0]], bindings],
        [after, [{ ...bindings[0], previousSha256: 'forged' }]],
    ]) assert.throws(() => assertOverlayDelta(before, rows, changes));
});
test('independent source binding requires both runtime and app copies plus exact host declarations', t => {
    const root = temp(t), source = 'runtime/postgresql/packages/db-objects-postgresql/index.cjs';
    const target = 'node_modules/@iobroker/db-objects-postgresql/index.cjs', profile = 'runtime/controller-profile/pid-state.cjs';
    for (const file of [source, profile, REQUIRED_RECOVERY]) write(root, file, 'reviewed');
    const hash = sha256(Buffer.from('reviewed'));
    const host = [source, profile, REQUIRED_RECOVERY].map(file => ({ source: file, target: file, bytes: 8, sha256: hash }));
    const input = { root, entries: [{ source, target }], manifest: { files: ['app/' + target, source, profile, REQUIRED_RECOVERY].map(file => ({ path: file, size: 8, sha256: hash })) },
        binding: { sourceCoverage: [{ source, target, bytes: 8, sha256: hash }], hostFiles: host } };
    exactSourceBindings(input);
    for (const mutate of [x => x.binding.sourceCoverage.pop(), x => x.binding.hostFiles.pop(), x => x.binding.sourceCoverage[0].sha256 = '0'.repeat(64),
        x => x.manifest.files[0].sha256 = '0'.repeat(64), x => x.manifest.files[1].sha256 = '0'.repeat(64), x => x.binding.sourceCoverage.push(x.binding.sourceCoverage[0])]) {
        const changed = structuredClone(input); mutate(changed); assert.throws(() => exactSourceBindings(changed), { code: 'R7_TRUSTED_VERIFICATION_REJECTED' });
    }
    const withoutRecovery = structuredClone(input);
    withoutRecovery.manifest.files = withoutRecovery.manifest.files.filter(row => row.path !== REQUIRED_RECOVERY);
    withoutRecovery.binding.hostFiles = withoutRecovery.binding.hostFiles.filter(row => row.target !== REQUIRED_RECOVERY);
    assert.throws(() => exactSourceBindings(withoutRecovery), { code: 'R7_TRUSTED_VERIFICATION_REJECTED' });
    write(root, profile, 'unreviewed'); assert.throws(() => exactSourceBindings(input), { code: 'R7_TRUSTED_VERIFICATION_REJECTED' });
});
test('complete payload comparison rejects altered executable modes, policy, inventory, SBOM and licenses', () => {
    const expected = ['app/code', 'runtime/code', 'system/unit', 'catalog.json', 'sbom.cdx.json', 'LICENSE'].map(name => ({ path: name, size: 1, sha256: 'a'.repeat(64), mode: 0o644 }));
    assertFullPayload(expected, structuredClone(expected));
    for (let i = 0; i < expected.length; i++) {
        const changed = structuredClone(expected); changed[i].sha256 = 'b'.repeat(64);
        assert.throws(() => assertFullPayload(expected, changed), { code: 'R7_TRUSTED_VERIFICATION_REJECTED' });
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
        const changed = structuredClone(input); mutate(changed); assert.throws(() => assertReports(changed), { code: 'R7_TRUSTED_VERIFICATION_REJECTED' });
    }
});
function sbomFixture(t, name = '@iobroker/db-objects-postgresql', relative = 'index.cjs') {
    const app = temp(t), prefix = 'node_modules/' + name + '/';
    write(app, 'package.json', JSON.stringify({ name: 'eos', version: '1' }));
    write(app, 'package-lock.json', JSON.stringify({ lockfileVersion: 3 }));
    write(app, prefix + 'package.json', JSON.stringify({ name, version: '0.1.0-dev.2' }));
    write(app, prefix + relative, 'old');
    const previousManifest = { files: inventory(app).map(row => ({ ...row, path: 'app/' + row.path })) };
    const previousSbom = { bomFormat: 'CycloneDX', specVersion: '1.5', serialNumber: 'old', version: 1,
        metadata: { timestamp: '2026-10-04T00:00:00Z', component: { name: 'eos', version: '1' }, properties: [] },
        components: [{ type: 'library', name, version: '0.1.0-dev.2', 'bom-ref': 'component', hashes: [{ alg: 'SHA-512', content: 'original' }] }], dependencies: [] };
    write(app, prefix + relative, 'changed');
    return { app, previousManifest, previousSbom, previousReleaseId: 'a'.repeat(64), sourceCommit: 'b'.repeat(40), timestamp: '2026-10-04T12:00:00Z' };
}
test('backend derivative records actual changed tree and removes stale package archive identity', t => {
    const input = sbomFixture(t), output = bindDerivative(input), component = output.bom.components[0];
    assert.equal(component.modified, true); assert.equal(component.hashes, undefined);
    assert.deepEqual(component.pedigree.ancestors[0].hashes, input.previousSbom.components[0].hashes);
    assert.equal(output.evidence.changed.length, 1); assert.match(output.evidence.actualAppFileTableSha256, /^[a-f0-9]{64}$/);
    assert.equal(output.evidence.npmResolutionPerformed, false); assert.equal(output.evidence.vulnerabilityScanPerformed, false);
    assert.equal(output.evidence.hardwareTested, false); assert.equal(output.bom.serialNumber, undefined);
    assert.equal(input.previousSbom.components[0].modified, undefined);
});
test('common-db PID derivative is inventoried independently of original controller transform pedigree', t => {
    const input = sbomFixture(t, '@iobroker/js-controller-common-db', 'build/cjs/lib/common/tools.js');
    const result = bindDerivative(input);
    assert.equal(result.evidence.derivatives[0].package, '@iobroker/js-controller-common-db');
    assert.equal(result.bom.components[0].hashes, undefined);
});
test('root lock and installed package metadata cannot change in dependency-neutral R7', t => {
    const input = sbomFixture(t); write(input.app, 'package-lock.json', '{}');
    assert.throws(() => bindDerivative(input), { code: 'R7_SBOM_DEPENDENCY_CHANGE' });
    const other = sbomFixture(t); write(other.app, 'node_modules/@iobroker/db-objects-postgresql/package.json', '{}');
    assert.throws(() => bindDerivative(other), { code: 'R7_SBOM_OVERLAY_SCOPE' });
});
test('SBOM rejects additions, removals, nested dependencies and unrelated package changes', t => {
    for (const file of ['node_modules/@iobroker/db-objects-postgresql/unreviewed.cjs', 'node_modules/@iobroker/db-objects-postgresql/node_modules/new/index.js', 'node_modules/iobroker.eos-admin/index.js']) {
        const input = sbomFixture(t); write(input.app, file, 'unreviewed'); assert.throws(() => bindDerivative(input), { code: 'R7_SBOM_OVERLAY_SCOPE' });
    }
    const input = sbomFixture(t); fs.unlinkSync(path.join(input.app, 'node_modules/@iobroker/db-objects-postgresql/index.cjs'));
    assert.throws(() => bindDerivative(input), { code: 'R7_SBOM_OVERLAY_SCOPE' });
});
test('SBOM preserves prior pedigree and rejects unbound source identities', t => {
    const input = sbomFixture(t);
    input.previousSbom.components[0].pedigree = { ancestors: [{ name: 'original', version: '1' }], notes: 'Prior review.' };
    const output = bindDerivative(input);
    assert.equal(output.bom.components[0].pedigree.ancestors[0].name, 'original'); assert.match(output.bom.components[0].pedigree.notes, /^Prior review\./);
    assert.throws(() => bindDerivative({ ...input, sourceCommit: 'main' }), { code: 'R7_SBOM_INPUT' });
    assert.throws(() => bindDerivative({ ...input, previousReleaseId: 'unknown' }), { code: 'R7_SBOM_INPUT' });
});
