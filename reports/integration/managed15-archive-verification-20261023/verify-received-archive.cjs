'use strict';
// Evidence-only readback. Runs reviewed repository validators, never payload code.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '../../..');
const bundle = require(path.join(ROOT, 'runtime/release/bundle.cjs'));
const build = require(path.join(ROOT, 'tools/system/build-bundle.cjs'));
const fresh = require(path.join(ROOT, 'runtime/release/fresh-sbom-binding.cjs'));
const native = require(path.join(ROOT, 'tools/integration/verify-security-refresh-native.cjs'));
const archiveTool = require(path.join(ROOT, 'tools/integration/create-test-archive.cjs'));
const entry = require(path.join(ROOT, 'tools/bootstrap/build-public-r8-managed-entry.cjs'));
const channel = require(path.join(ROOT, 'runtime/updates/channel.cjs'));
const SOURCE = 'f353dd08bf8ac5897e9b1c357994d4047a82ed6d';
const EVIDENCE = path.join(ROOT, 'reports/integration/managed15-public-metadata-20261023/received');
const read = name => fs.readFileSync(path.join(EVIDENCE, name));
const json = name => JSON.parse(read(name));
const identity = bytes => ({ bytes: bytes.length, sha256: bundle.sha256(bytes) });
const git = args => cp.execFileSync('git', args, {cwd: ROOT, encoding: 'utf8', timeout: 30000, maxBuffer: 1048576}).trim();
const [archivePath, payload, nativeDirectory] = process.argv.slice(2);
assert.equal(process.argv.length, 5, 'Expected archive, extracted payload and independently obtained native evidence directory');
for (const name of [archivePath, payload, nativeDirectory]) assert.equal(path.resolve(name), name);
const delivery = json('delivery.json'), key = read('release-public.pem');
assert.equal(bundle.sha256(key), '518f89debdb0b396d2abe7be8136b7ea5670c2a1f043705ed5d5528124067a40');
assert.equal(bundle.sha256(read('delivery.json')), 'bd16e1cd02cf5816c869030686d5aec2a7d9f796a30aa4fd3c2d0d1048675d43');
const checked = archiveTool.verifyTestArchive({archivePath, publicKey: key,
    expectedReleaseId: delivery.releaseId, platform: 'linux-arm64', nodeVersion: '24.22.1'});
assert.equal(checked.archiveSha256, delivery.sha256);
assert.equal(checked.archiveBytes, delivery.bytes);
assert.equal(checked.manifest.sequence, 15);
assert.equal(checked.manifest.profile, 'test');
assert.equal(checked.manifest.releaseVersion, '0.2.0-test.3');
assert.deepEqual(bundle.inventory(payload), checked.manifest.files);
const validated = build.validatePayload(payload, checked.manifest);
const recordBytes = fs.readFileSync(path.join(payload, 'runtime-build.json'));
const record = JSON.parse(recordBytes);
const appRows = checked.manifest.files.filter(row => row.path.startsWith('app/')).map(row => ({...row, path: row.path.slice(4)}));
assert.equal(record.sourceCommit, SOURCE);
assert.equal(record.sourceCommit, delivery.sourceCommit);
assert.equal(bundle.sha256(recordBytes), delivery.nativeEvidence.runtimeBuildSha256);
assert.equal(fresh.digest(fresh.content(appRows)), delivery.nativeEvidence.appContentSha256);
const nativeEvidence = native.verifyNativeEvidence({directory: nativeDirectory, sourceCommit: SOURCE,
    files: appRows, record, runtimeBuildSha256: bundle.sha256(recordBytes)});
assert.deepEqual(nativeEvidence, delivery.nativeEvidence);
const scope = ['runtime', 'tools/system', 'tools/integration', 'system', 'security', 'licenses',
    'LICENSE', 'THIRD_PARTY_NOTICES.md', 'docs/history/UPSTREAM_README.md'];
assert.equal(git(['diff', '--name-only', SOURCE, 'HEAD', '--', ...scope]), '');
assert.equal(git(['diff', 'HEAD', '--name-only', '--', ...scope]), '');
const sourceBindings = [];
for (const row of checked.manifest.files) {
    if (row.path.startsWith('app/') || row.path.startsWith('node-runtime/') ||
        ['catalog.json', 'sbom.cdx.json', 'runtime-build.json'].includes(row.path)) continue;
    let sourcePath = row.path, kind = 'byte-identical-qualified-source';
    if (sourcePath === 'licenses/upstream/README.ioBroker-Installer.md') sourcePath = 'docs/history/UPSTREAM_README.md';
    if (sourcePath === 'system/postgresql-test/systemd/nexowatt-eos-upload.service')
        sourcePath = 'system/own-adapter-test/systemd/nexowatt-eos-upload.service';
    let bytes = fs.readFileSync(path.join(ROOT, sourcePath));
    if (row.path === 'THIRD_PARTY_NOTICES.md') {
        bytes = Buffer.from(build.runtimeLicenseNotices(bytes.toString('utf8'), 'app/'));
        kind = 'qualified-license-path-transform';
    }
    if (/^system\/(?:test-base|postgresql-test|own-adapter-test)\/systemd\/.+\.service$/.test(row.path)) {
        bytes = Buffer.from(build.renderManagedNodeUnit(bytes.toString('utf8')));
        kind = 'qualified-managed-node-unit-transform';
    }
    assert.equal(bytes.length, row.size, row.path);
    assert.equal(bundle.sha256(bytes), row.sha256, row.path);
    sourceBindings.push({path: row.path, sourcePath, kind, ...identity(bytes)});
}
const preparation = json('r8-entry/preparation.json');
for (const name of entry.SOURCE_PATHS) {
    const row = checked.manifest.files.find(item => item.path === name);
    assert.deepEqual({bytes: row.size, sha256: row.sha256}, preparation.sources[name]);
}
const config = entry.configFor(delivery, key);
assert.deepEqual(config, preparation.config);
const helpers = Object.fromEntries(Object.entries(entry.HELPERS).map(([name, file]) => [name, fs.readFileSync(path.join(ROOT, file))]));
assert.deepEqual(entry.render(config, key, helpers), read('r8-entry/update.sh'));
const feed = channel.verifyFeed(read('test.json'), key);
assert.deepEqual(feed.releases, []);
const bom = JSON.parse(fs.readFileSync(path.join(payload, 'sbom.cdx.json')));
const result = {
    checkedAt: new Date().toISOString(), reviewerNode: process.version, verifierSourceCommit: git(['rev-parse', 'HEAD']),
    sourceCommit: SOURCE, releaseId: checked.releaseId, releaseSequence: 15,
    archive: {bytes: checked.archiveBytes, sha256: checked.archiveSha256},
    manifestFiles: checked.manifest.files.length, payloadBytes: checked.manifest.files.reduce((sum, row) => sum + row.size, 0),
    manifestSignatureVerified: true, fullArchiveReadbackVerified: true, extractedInventoryMatches: true,
    payloadValidationPassed: true, sbomBindingVerified: true, sbomComponents: bom.components.length,
    sbom: identity(fs.readFileSync(path.join(payload, 'sbom.cdx.json'))),
    runtimeBuild: identity(recordBytes), appFiles: appRows.length, appContentSha256: record.appContentSha256,
    nodeVersion: record.nodeVersion, controllerVersion: record.controllerVersion, compilerNpmVersion: record.npmVersion,
    nativeEvidenceIndependentlyCrossChecked: true, nativeEvidence, historicalNativeTestsReexecuted: false,
    qualifiedSourcesMatch: true, sourceBindings, r8EntryMatchesActualArchive: true, signedFeedVerified: true, feed,
    components: validated.catalog.entries.map(row => ({id: row.id, package: row.package, version: row.version, review: row.review.status})),
    databaseBackend: validated.databaseBackend, architecture: validated.architectureReports,
    bundledNodeSeparatelyValidated: true, targetCodeExecuted: false, runtimePublished: false,
    publicArchiveReadbackPerformed: false, piMigrationTested: false, productionReleaseApproved: false,
};
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
