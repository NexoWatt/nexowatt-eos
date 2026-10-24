'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const fresh = require('../../runtime/release/fresh-sbom-binding.cjs');
const { sha256 } = require('../../runtime/release/bundle.cjs');
const { bindPostgresqlPeer, snapshot } = require('../../tools/integration/build-runtime.cjs');
const native = require('../../tools/integration/verify-security-refresh-native.cjs');
const { validatePreparation } = require('../integration-own-adapters/fixture.cjs');
const hash = x => sha256(Buffer.from(x));
function fixture(nodeVersion = fresh.NODE) {
    const files = fresh.OWNERS.map((name, index) => ({ path: `node_modules/${name}/file.js`, size: 1, sha256: hash(String(index)), mode: 0o644 }));
    files.push({ path: 'package-lock.json', size: 2, sha256: hash('{}'), mode: 0o644 });
    files.sort((a, b) => a.path < b.path ? -1 : 1);
    const profile = { schemaVersion: 1, kind: 'eos-controller-profile-verification', controllerVersion: '7.2.5', productionApproved: false,
        files: files.filter(row => row.path !== 'package-lock.json').map(row => ({ relativePath: row.path, sha256: row.sha256 })) };
    const record = { schemaVersion: 1, kind: fresh.ASSEMBLY, sourceCommit: 'a'.repeat(40), sourceTreeClean: true, sequence: 15,
        nodeVersion, nodeRuntime: { schemaVersion: 1, version: nodeVersion, platform: 'linux-arm64',
            archiveSha256: 'e'.repeat(64), binarySha256: 'f'.repeat(64), licenseSha256: 'a'.repeat(64) }, npmVersion: '11.19.0', controllerVersion: '7.2.5', platform: 'linux-arm64', signed: false,
        lifecycleScriptsExecuted: false, productionReleaseApproved: false, controllerProfile: profile,
        packageLockSha256: hash('{}'), resolutionLockSha256: 'd'.repeat(64), appContentSha256: fresh.digest(fresh.content(files)), appModeSha256: fresh.digest(files) };
    const components = fresh.OWNERS.map(name => ({ name, version: name === '@iobroker/ws-server' ? '4.5.2' : '7.2.5', type: 'library', hashes: [{ alg: 'SHA-512', content: 'a'.repeat(128) }] }));
    for (let n = 0; n < 6; n++) components.push({ name: '@nexowatt/eos-license-client', version: '1.0.2',
        properties: [{ name: 'eos:scope', value: 'embedded-package-files-observed-in-runtime-tree' }, { name: 'eos:tree-sha256', value: 'b'.repeat(64) }] });
    const bom = fresh.bindFreshSbom({ bom: { metadata: { properties: [] }, components }, files, profile, record, sequence: 15 });
    const rows = files.map(row => ({ ...row, path: `app/${row.path}` }));
    rows.push({ path: 'runtime-build.json', sha256: hash(JSON.stringify(record, null, 2) + '\n') });
    rows.push({ path: 'node-runtime/bin/node', size: 64, sha256: record.nodeRuntime.binarySha256, mode: 0o755 },
        { path: 'node-runtime/LICENSE', size: 10, sha256: record.nodeRuntime.licenseSha256, mode: 0o644 },
        { path: 'node-runtime/runtime.json', size: 400, sha256: hash(JSON.stringify(record.nodeRuntime, null, 2) + '\n'), mode: 0o644 });
    return { bom, files: rows, profile, release: { sequence: 15, nodeVersion }, record };
}
test('fresh complete-tree SBOM binds source, sequence, lock, all five transformed packages and local bytes', () => {
    const input = fixture(); assert.equal(fresh.verifyFreshSbom(input), true);
    for (const change of [x => x.release.sequence++, x => x.record.sourceCommit = 'b'.repeat(40),
        x => x.record.controllerVersion = '8.0.0', x => x.record.nodeVersion = '24.19.0',
        x => x.files[0].sha256 = 'c'.repeat(64), x => x.files[0].mode = 0o755,
        x => x.bom.components[0].hashes = [{ alg: 'SHA-512', content: 'a'.repeat(128) }],
        x => x.profile.files.pop(), x => x.record.packageLockSha256 = 'c'.repeat(64)]) {
        const changed = structuredClone(input); change(changed); assert.throws(() => fresh.verifyFreshSbom(changed));
    }
});
test('fresh SBOM retains six identical embedded license-client copies and rejects a hidden divergent copy', () => {
    const original = fixture();
    const client = x => x.bom.components.find(row => row.name === '@nexowatt/eos-license-client');
    for (const change of [x => x.bom.components.splice(x.bom.components.indexOf(client(x)), 1), x => client(x).version = '1.0.1',
        x => client(x).properties[1].value = 'e'.repeat(64),
        x => client(x).properties.push({ name: 'eos:tree-sha256', value: 'e'.repeat(64) })]) {
        const changed = structuredClone(original); change(changed); assert.throws(() => fresh.verifyFreshSbom(changed));
    }
});
test('immutable fresh SBOM validator admits exact future Node24 patches and minors while rejecting major or downgrade', () => {
    for (const version of ['24.22.2', '24.23.0']) {
        const input = fixture(version);
        assert.equal(fresh.verifyFreshSbom(input), true);
        assert.equal(input.bom.components.find(row => row.name === 'node').version, version);
        input.release.nodeVersion = '24.22.1';
        assert.throws(() => fresh.verifyFreshSbom(input));
    }
    for (const version of ['24.21.0', '24.22.0', '25.0.0']) assert.throws(() => fixture(version), /FRESH_SBOM_NODE/);
});
test('fresh SBOM binds Node binary, complete license and metadata independently of npm packages', () => {
    const original = fixture();
    for (const change of [
        x => { x.files = x.files.filter(row => row.path !== 'node-runtime/LICENSE'); },
        x => { x.files.find(row => row.path === 'node-runtime/bin/node').sha256 = '1'.repeat(64); },
        x => { x.files.find(row => row.path === 'node-runtime/bin/node').mode = 0o644; },
        x => { x.files.find(row => row.path === 'node-runtime/runtime.json').sha256 = '2'.repeat(64); },
        x => { x.bom.components.push(structuredClone(x.bom.components.find(row => row.name === 'node'))); },
        x => { x.bom.components.find(row => row.name === 'node').hashes[0].content = '3'.repeat(64); },
        x => { x.release.nodeVersion = '24.23.0'; }
    ]) {
        const altered = structuredClone(original); change(altered);
        assert.throws(() => fresh.verifyFreshSbom(altered));
    }
});
test('only the fresh packed PostgreSQL backend can bind the reviewed newer Redis base API', () => {
    const legacy = { name: '@iobroker/db-objects-postgresql', peerDependencies: { '@iobroker/db-objects-redis': '7.2.2' } };
    const current = structuredClone(legacy);
    assert.equal(bindPostgresqlPeer(legacy, 'db-objects-postgresql', '7.2.2'), undefined);
    assert.equal(legacy.peerDependencies['@iobroker/db-objects-redis'], '7.2.2');
    assert.equal(bindPostgresqlPeer(current, 'db-objects-postgresql', '7.2.5').version, '7.2.5');
    assert.equal(current.peerDependencies['@iobroker/db-objects-redis'], '7.2.5');
    assert.throws(() => bindPostgresqlPeer(current, 'db-objects-postgresql', '7.2.5'), { code: 'BUILD_POSTGRESQL_PEER_INPUT' });
});
function nativeFixture() {
    const root = path.resolve(__dirname, '../../reports/integration/own-adapter-test-20261015/release');
    // Explicit contract data derived from the old sanitized scenario; this unit
    // test does not claim that any new native controller process was executed.
    const evidence = JSON.parse(fs.readFileSync(path.join(root, 'own-adapters-native-evidence.json')));
    const sourceCommit = 'a'.repeat(40), appContentSha256 = 'b'.repeat(64), baselineContentSha256 = 'c'.repeat(64);
    const record = fixture().record; record.appContentSha256 = appContentSha256;
    const runtimeBuildSha256 = hash(JSON.stringify(record, null, 2) + '\n');
    const previousReleaseId = hash('unsigned-security-refresh-management-baseline:' + baselineContentSha256);
    const preparation = { schemaVersion: 1, kind: 'unsigned-security-refresh-native-preparation', signed: false, unsignedFixture: true,
        sourceTreeClean: true, sequence: 15, nodeVersion: fresh.NODE, sourceCommit, previousSignatureVerified: false,
        sourceSequence: 0, baselineKind: 'unsigned-fresh-management-profile', previousReleaseId, runtimeBuildSha256,
        resolutionLockSha256: record.resolutionLockSha256, appContentSha256, baselineContentSha256,
        app: '/tmp/fresh-native/own-adapters-build/app', baselineApp: '/tmp/fresh-native/own-adapters-build/baseline' };
    Object.assign(evidence, { kind: 'eos-security-refresh-native-management', sourceReleaseId: previousReleaseId, sourceSequence: 0,
        targetSequence: 15, sequence: 15, sourceCommit, appContentSha256, runtimeBuildSha256, nodeVersion: fresh.NODE });
    delete evidence.checks.nativeEnrollmentAndPrestartRollback; delete evidence.checks.nativePoststartEnrollmentRollback;
    evidence.checks.freshEnrollmentPrewriteFailureIsAtomic = true; evidence.checks.freshEnrollmentRetainedAfterRestart = true;
    // Synthetic contract fields only: this old fixture did not execute the new
    // native transaction probe and is never written back as qualification data.
    evidence.checks.postgresqlTransactionContextIsolation = true;
    evidence.postgresqlTransactionIsolation = { nativeStore: true, contextRejected: true,
        rejectedCode: 'EOS_PG_TRANSACTION_ABORTED', escapedWriteAbsent: true,
        committedWritePreserved: true, independentWriteSucceeded: true, probeRowsRemoved: true };
    evidence.stages.push({ name: 'native PostgreSQL rejects detached writes from a released transaction context', passed: true, failureCode: null });
    const binding = { schemaVersion: 1, kind: 'eos-security-refresh-native-source-binding', sourceCommit, sourceTreeClean: true,
        signed: false, unsignedFixture: true, previousSignatureVerified: false, previousReleaseId,
        appContentSha256, baselineContentSha256, runtimeBuildSha256, runtimeBuild: record };
    return { preparation, evidence, binding, sourceCommit, appContentSha256, record, runtimeBuildSha256,
        tap: fs.readFileSync(path.join(root, 'own-adapters-native.tap'), 'utf8') };
}
test('fresh native contract has no historical signature or migration claim and binds the same complete runtime', () => {
    const input = nativeFixture();
    assert.equal(native.validate(input).ok, true);
    assert.equal(validatePreparation(input.preparation, '/tmp/fresh-native'), input.preparation);
    for (const change of [x => x.preparation.previousSignatureVerified = true, x => x.evidence.sourceSequence = 12,
        x => x.record.sourceCommit = 'e'.repeat(40), x => x.evidence.runtimeBuildSha256 = 'e'.repeat(64),
        x => x.evidence.checks.freshEnrollmentPrewriteFailureIsAtomic = false,
        x => delete x.evidence.checks.postgresqlTransactionContextIsolation,
        x => x.evidence.postgresqlTransactionIsolation.escapedWriteAbsent = false,
        x => x.evidence.postgresqlTransactionIsolation.independentWriteSucceeded = false,
        x => x.evidence.postgresqlTransactionIsolation.rejectedCode = 'EOS_PG_QUERY_FAILED',
        x => x.evidence.postgresqlTransactionIsolation.unreviewed = true,
        x => { x.evidence.processIndicators[3].indicators.push('CONTROLLER_LOG_FORWARD_FAILED');
            x.evidence.runtimeIndicators = [...new Set([...x.evidence.runtimeIndicators, 'CONTROLLER_LOG_FORWARD_FAILED'])].sort(); },
        x => x.evidence.stages.pop(),
        x => x.evidence.checks.nativePoststartEnrollmentRollback = true, x => x.evidence.processIndicators.pop(),
        x => x.tap = x.tap.replace('# skipped 0', '# skipped 1')]) {
        const value = structuredClone(input); change(value); assert.throws(() => native.validate(value), { code: 'FRESH_NATIVE_EVIDENCE_REJECTED' });
    }
});

test('fresh source snapshots exclude untracked and ignored secret fixtures before npm packaging', t => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'fresh-tracked-snapshot-'));
    t.after(() => fs.rmSync(base, { recursive: true, force: true }));
    const source = path.join(base, 'source'), output = path.join(base, 'output');
    fs.mkdirSync(path.join(source, 'lib'), { recursive: true });
    fs.writeFileSync(path.join(source, 'lib/main.js'), 'reviewed code');
    fs.writeFileSync(path.join(source, 'lib/private-key.pem'), 'excluded fixture');
    fs.writeFileSync(path.join(source, '.env'), 'excluded fixture');
    snapshot(source, output, ['lib/main.js']);
    assert.deepEqual(fs.readdirSync(output), ['lib']);
    assert.deepEqual(fs.readdirSync(path.join(output, 'lib')), ['main.js']);
    assert.throws(() => snapshot(source, path.join(base, 'invalid'), ['../escape']), /BUILD_TRACKED_PATH/);
});

test('fresh app and enrollment baseline share six-adapter admission while first-run selects two management adapters', t => {
    const own = require('../../runtime/bootstrap/own-adapter-enrollment.cjs');
    const management = require('../../runtime/bootstrap/enrollment.cjs');
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'fresh-management-profile-'));
    t.after(() => fs.rmSync(base, { recursive: true, force: true }));
    fs.mkdirSync(path.join(base, 'system/managed-test'), { recursive: true });
    fs.copyFileSync(path.resolve(__dirname, '../../system/managed-test/profile.json'), path.join(base, 'system/managed-test/profile.json'));
    for (const label of ['app', 'baseline']) {
        const app = path.join(base, label), controller = path.join(app, 'node_modules/iobroker.js-controller');
        fs.mkdirSync(controller, { recursive: true });
        const file = path.join(controller, 'eos-test-profile.json');
        fs.writeFileSync(file, JSON.stringify(own.profileValue('7.2.5')));
        for (const spec of own.SPECS) {
            const directory = path.join(app, 'node_modules', 'iobroker.' + spec.name); fs.mkdirSync(directory);
            fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ name: 'iobroker.' + spec.name, version: spec.version, main: spec.main }));
            fs.writeFileSync(path.join(directory, 'io-package.json'), JSON.stringify({ common: { name: spec.name, version: spec.version }, native: {} }));
        }
        assert.equal(management.managedApp(app), true);
        assert.equal(own.pinnedAdapters(app).length, 6);
        assert.deepEqual(management.pinnedAdapters(app).map(row => row.spec.name), ['eos-admin', 'nexowatt-ui']);
        const invalid = own.profileValue('7.2.5'); invalid.adapters = invalid.adapters.slice(0, 2);
        fs.writeFileSync(file, JSON.stringify(invalid));
        assert.throws(() => management.pinnedAdapters(app), /OWN_ENROLLMENT_PROFILE_SCOPE/);
    }
});

test('fresh catalog contains exactly the reviewed seven-package product with new evidence and controller7.2.5', () => {
    const product = require('../../runtime/product/scope.cjs');
    const specs = product.specsFor(product.SECURITY_REFRESH_TEST);
    const rows = specs.map(spec => ({ path: `node_modules/${spec.package}/package.json`, size: 2, sha256: hash('{}'), mode: 0o644 }));
    const catalog = require('../../tools/integration/prepare-security-refresh.cjs').freshCatalog(rows);
    assert.equal(catalog.entries.length, 7);
    assert.equal(catalog.catalogRevision, 6);
    assert.equal(catalog.entries.find(row => row.id === 'js-controller').version, '7.2.5');
    assert.equal(product.assertCatalog(catalog, product.SECURITY_REFRESH_TEST), catalog);
    for (const row of catalog.entries) {
        assert.equal(row.communication, 'eos-postgresql-mtls13-v1');
        assert.equal(row.review.evidenceId, 'eos-security-refresh-native-20261021');
        assert.match(row.sha256, /^[a-f0-9]{64}$/);
        assert.equal(row.permissions.shellExec, false);
    }
    assert.throws(() => product.assertCatalog(catalog, product.OWN_ADAPTER_TEST), /PRODUCT_CATALOG_SCOPE/);
});
