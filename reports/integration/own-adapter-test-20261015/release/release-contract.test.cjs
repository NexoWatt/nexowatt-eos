'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '../../../..');
const native = require('./native-evidence.cjs');
const sbom = require('./bind-derivative-sbom.cjs');
const builder = require('./build-revision.cjs');
const verifier = require('./verify-candidate.cjs');
const backup = require(path.join(ROOT, 'runtime/controller-profile/backup-state.cjs'));
const product = require(path.join(ROOT, 'runtime/product/scope.cjs'));
const bad = fn => assert.throws(fn, e => /^R10_/.test(e.code || ''));
function sample() {
  const sourceCommit = 'a'.repeat(40), appContentSha256 = 'b'.repeat(64), baselineContentSha256 = 'c'.repeat(64);
  const coverage = [{ source: 'components/fixture.js', target: 'fixture.js', sha256: 'd'.repeat(64) }], overlays = [{ target: 'fixture.js' }];
  const stages = [{ name: 'synthetic unit-test fixture only', passed: true, failureCode: null }];
  return { sourceCommit, appContentSha256, baselineContentSha256, coverage, overlays,
    preparation: { schemaVersion: 1, kind: 'unsigned-own-adapters-native-preparation', signed: false, unsignedFixture: true,
      sourceTreeClean: true, sequence: 13, nodeVersion: '24.21.0', sourceCommit, previousSignatureVerified: true,
      previousReleaseId: native.BASE_RELEASE, appContentSha256, baselineContentSha256 },
    binding: { schemaVersion: 1, sourceCommit, sourceTreeClean: true, signed: false, unsignedFixture: true,
      previousSignatureVerified: true, previousReleaseId: native.BASE_RELEASE, ownSourceCoverage: coverage, ownOverlay: overlays,
      allowedControllerTransforms: [sbom.PROFILE_FILE, ...backup.FILES.map(r => r.relativePath)] },
    evidence: { schemaVersion: 1, kind: 'eos-own-adapters-native-management', passed: true, sourceReleaseId: native.BASE_RELEASE,
      sourceSequence: 12, targetSequence: 13, sequence: 13, sourceCommit, appContentSha256, nodeVersion: '24.21.0', licenseFormat: 'NWL3',
      signed: false, unsignedFixture: true, candidateSigned: false, hardwareTested: false, productionReleaseApproved: false,
      hostArch: 'x64', nativePostgresql: '17.11', signedPayloadPlatform: 'linux-arm64', checks: Object.fromEntries(native.CHECKS.map(k => [k, true])),
      managementReadinessPassed: true, restartPassed: true, candidateAppBytesUnchanged: true, fixedRootOwnedEosPaths: true,
      ownDeviceAdapterProcessesStarted: true, lifecycleScriptsExecuted: false, nativeModulesRebuilt: false, mockedRuntimeDependencies: false,
      physicalHardwareConnected: false, physicalCommandsSent: false, actualSystemdMountPolicy: false, physicalPiAcceptance: false,
      assetUpload: { adapters: 6, files: 1, bytes: 1, instancesAndMarkersUnchanged: true, unrelatedFilesPreserved: true },
      stages, bootstrapSteps: stages, finalSteps: stages, runtimeIndicators: [], logicalBackup: { archives: 2, privatePermissions: true,
        previousArchivesExcluded: true, nativeDatabaseExport: true, archiveContentsRead: true,
        restorePerformed: false, completeSystemBackup: false, inspections: [0, 1].map(() => ({
        canaryObjectAndStatePresent: true, exactRuntimeConfigPresent: true, requiredObjectsPresent: true })) } },
    tap: 'TAP version 13\nok 1 - synthetic fixture\n1..1\n# tests 1\n# pass 1\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n' };
}
test('R10 evidence binds successful synthetic contract without claiming a native run', () => {
  const result = native.validate(sample()); assert.equal(result.ok, true); assert.equal(result.hardwareTested, false);
});
test('every missing or failed required native check rejects signing', () => {
  for (const key of native.CHECKS) for (const mode of ['missing', 'false']) {
    const x = sample(); if (mode === 'missing') delete x.evidence.checks[key]; else x.evidence.checks[key] = false;
    bad(() => native.validate(x));
  }
});
test('source, artifact, baseline, version, scope and dirty-worktree drift reject evidence', () => {
  for (const [section, key, value] of [
    ['preparation', 'sourceCommit', 'e'.repeat(40)], ['preparation', 'sourceTreeClean', false],
    ['binding', 'sourceTreeClean', false], ['evidence', 'appContentSha256', 'e'.repeat(64)],
    ['preparation', 'baselineContentSha256', 'e'.repeat(64)], ['preparation', 'sequence', 12],
    ['evidence', 'nodeVersion', '24.19.0'], ['evidence', 'hostArch', 'arm64'], ['evidence', 'passed', false],
    ['evidence', 'hardwareTested', true], ['evidence', 'productionReleaseApproved', true], ['evidence', 'candidateSigned', true]
  ]) { const x = sample(); x[section][key] = value; bad(() => native.validate(x)); }
});
test('different source coverage, missing rollback/config assets and incomplete archive proof reject', () => {
  const mutations = [x => { x.binding.ownSourceCoverage = []; }, x => { x.binding.ownOverlay = []; },
    x => { x.binding.allowedControllerTransforms = []; }, x => { x.evidence.logicalBackup.inspections.pop(); },
    x => { x.evidence.logicalBackup.inspections[0].exactRuntimeConfigPresent = false; },
    x => { x.evidence.logicalBackup.privatePermissions = false; },
    x => { x.evidence.logicalBackup.previousArchivesExcluded = false; },
    x => { x.evidence.bootstrapSteps = []; }, x => { x.evidence.stages[0].passed = false; },
    x => { x.evidence.runtimeIndicators.push('READ_ONLY_WRITE'); },
    x => { x.evidence.assetUpload.instancesAndMarkersUnchanged = false; },
    x => { x.evidence.assetUpload.unrelatedFilesPreserved = false; },
    x => { x.evidence.assetUpload.files = 0; }, x => { delete x.evidence.assetUpload; }];
  for (const mutate of mutations) { const x = sample(); mutate(x); bad(() => native.validate(x)); }
});
test('failed, skipped, cancelled or malformed TAP cannot turn evidence green', () => {
  for (const tap of ['', sample().tap + 'not ok 2 - failure\n', sample().tap.replace('# skipped 0', '# skipped 1'),
    sample().tap.replace('# cancelled 0', '# cancelled 1'), sample().tap.replace('# tests 1', '# tests 2')]) {
    const x = sample(); x.tap = tap; bad(() => native.validate(x));
  }
});
const row = (name, hash) => ({ path: name, size: 1, sha256: hash, mode: 0o644 });
function deltaFixture() {
  return { before: [row(sbom.PROFILE_FILE, 'a'.repeat(64)), ...backup.FILES.map(f => row(f.relativePath, f.originalSha256))],
    after: [row(sbom.PROFILE_FILE, 'b'.repeat(64)), ...backup.FILES.map(f => row(f.relativePath, f.sha256))] };
}
test('only explicit controller profile and exact backup-state changes pass delta gate', () => {
  const x = deltaFixture(); assert.equal(sbom.assertDelta(x.before, x.after).length, 3);
  x.after.push(row('node_modules/foreign/index.js', 'e'.repeat(64))); bad(() => sbom.assertDelta(x.before, x.after));
});
test('nested dependency changes, root lock drift, removed transform and transformed-byte drift reject', () => {
  for (const name of ['package-lock.json', 'node_modules/iobroker.ocpp21/node_modules/ajv/dist/ajv.js']) {
    const x = deltaFixture(); x.after.push(row(name, 'd'.repeat(64))); bad(() => sbom.assertDelta(x.before, x.after));
  }
  let x = deltaFixture(); x.after.pop(); bad(() => sbom.assertDelta(x.before, x.after));
  x = deltaFixture(); x.after[1].sha256 = 'e'.repeat(64); bad(() => sbom.assertDelta(x.before, x.after));
});
test('package metadata allows source packaging/scripts but never dependency or entrypoint changes', () => {
  const spec = product.SPECS.find(s => s.source === 'ocpp21');
  const a = { name: spec.package, version: spec.version, main: spec.main, dependencies: { sample: '1.0.0' } };
  assert.deepEqual(sbom.packageContract(a, { ...a, files: ['main.js'], scripts: { test: 'node --test' } }, spec), []);
  bad(() => sbom.packageContract(a, { ...a, dependencies: { sample: '2.0.0' } }, spec));
  bad(() => sbom.packageContract(a, { ...a, main: 'other.js' }, spec));
});
test('candidate catalogue changes only explicit own-adapter execution scope', () => {
  const c = { catalogRevision: 8, entries: product.SPECS.map(s => ({ id: s.id, package: s.package, version: s.version,
    kind: s.kind, required: s.execute, review: { status: s.execute ? 'approved-test' : 'pending', evidenceId: s.execute ? 'historical' : null },
    communication: 'eos-postgresql-mtls13-v1', permissions: { arbitraryCode: false } })) };
  const next = builder.candidateCatalog(c); assert.equal(next.catalogRevision, 9);
  assert.equal(c.entries.filter(e => e.required).length, 3); assert(next.entries.every(e => e.required));
  assert(next.entries.every((e, i) => e.package === c.entries[i].package && equalJson(e.permissions, c.entries[i].permissions)));
});
function equalJson(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
test('no force, bypass, relative path or evidence-free CLI', () => {
  assert.deepEqual(builder.parseArgs(['--native-evidence', '/evidence']), { nativeEvidenceDirectory: '/evidence' });
  for (const args of [[], ['--force', '/evidence'], ['--base-directory', '/base'], ['--native-evidence', 'relative'],
    ['--native-evidence', '/a', '--native-evidence', '/b']]) bad(() => builder.parseArgs(args));
});
test('host delta permits only the exact upload mapping and byte-identical source template', () => {
  const bytes = fs.readFileSync(path.join(ROOT, builder.UPLOAD_TEMPLATE));
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  const unitRow = name => ({ path: name, size: bytes.length, sha256, mode: 0o644 });
  const fixed = row('runtime/postgresql/schema.sql', 'f'.repeat(64));
  const before = [row(builder.UPLOAD_TARGET, 'a'.repeat(64)), fixed];
  const after = [unitRow(builder.UPLOAD_TARGET), unitRow(builder.UPLOAD_TEMPLATE), fixed];
  assert.deepEqual(builder.validateHostDelta(before, after), { source: builder.UPLOAD_TEMPLATE, target: builder.UPLOAD_TARGET,
    sha256, bytes: bytes.length, mode: 0o644, packagedSourceTemplate: true });
  for (const index of [0, 1, 2]) {
    const changed = structuredClone(after); changed[index].sha256 = 'b'.repeat(64);
    bad(() => builder.validateHostDelta(before, changed));
  }
  bad(() => builder.validateHostDelta(before, after.slice(0, 1)));
  bad(() => builder.validateHostDelta(before, [...after, row('system/arbitrary.service', 'b'.repeat(64))]));
  bad(() => builder.validateHostDelta([], after));
});
test('host source binding records the explicit upload source mapping', () => {
  const bytes = fs.readFileSync(path.join(ROOT, builder.UPLOAD_TEMPLATE));
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  const result = builder.sourceBinding({ sourceCommit: 'a'.repeat(40), coverage: [], overlays: [], changes: [], backupTransform: {} },
    { releaseId: 'b'.repeat(64), manifest: { files: [{ path: builder.UPLOAD_TARGET, size: bytes.length, sha256 }] } });
  assert.deepEqual(result.hostFiles, [{ source: builder.UPLOAD_TEMPLATE, target: builder.UPLOAD_TARGET, bytes: bytes.length, sha256 }]);
});
test('trusted verifier requires pinned source and explicit native evidence without force options', () => {
  const commit = 'a'.repeat(40);
  assert.deepEqual(verifier.parseArgs(['/candidate', commit, '--native-evidence', '/evidence']), {
    candidate: '/candidate', sourceCommit: commit, nativeEvidenceDirectory: '/evidence' });
  for (const args of [[], ['/candidate', commit], ['relative', commit, '--native-evidence', '/evidence'],
    ['/candidate', 'main', '--native-evidence', '/evidence'], ['/candidate', commit, '--force', '/evidence']]) bad(() => verifier.parseArgs(args));
});
test('trusted report gate rejects optimistic, omitted or altered release claims', () => {
  const release = { releaseId: 'a'.repeat(64), archiveSha256: 'b'.repeat(64), signingPublicKeySha256: 'c'.repeat(64), archiveBytes: 123,
    manifest: { files: [] } };
  const expectedDelivery = builder.deliveryMetadata({ previousDelivery: { historicalField: 'preserved' }, release,
    sourceCommit: 'd'.repeat(40), installedComponents: [] });
  const expectedVerification = builder.verificationMetadata({ sourceCommit: 'd'.repeat(40), timestamp: '2026-10-15T00:00:00Z',
    release, historicalCount: 1, nativeEvidence: { ok: true }, transition: { passed: true }, prebuilt: { verified: true } });
  const input = { delivery: expectedDelivery, reportDelivery: expectedDelivery, buildVerification: expectedVerification,
    expectedDelivery, expectedVerification, checksumText: `${release.archiveSha256}  ${builder.BASE.archive}\n${release.signingPublicKeySha256}  release-public.pem\n` };
  verifier.assertReports(input);
  for (const key of ['delivery', 'reportDelivery', 'buildVerification']) {
    const changed = { ...input, [key]: structuredClone(input[key]) }; changed[key].productionReleaseApproved = true;
    bad(() => verifier.assertReports(changed));
    const missing = { ...input, [key]: structuredClone(input[key]) }; delete missing[key].sourceCommit;
    bad(() => verifier.assertReports(missing));
  }
  bad(() => verifier.assertReports({ ...input, checksumText: input.checksumText + '\n' }));
});
