'use strict';
// Trusted offline signing gate: evidence is data, never executable code.
const path = require('node:path');
const fs = require('node:fs');
const { isDeepStrictEqual: equal } = require('node:util');
const ROOT = path.resolve(__dirname, '../../../..');
const bundle = require(path.join(ROOT, 'runtime/release/bundle.cjs'));
const { appHash, passedTap } = require(path.join(ROOT, 'tools/bootstrap/verify-r9-native-evidence.cjs'));
const BASE_RELEASE = '97780e881765e2c9854e81ac7187b3ed120eccc8cc0dea0821492c9a54e23000';
const CHECKS = Object.freeze(['postgresqlMtls', 'platformDeniesUnadmittedProcess', 'initiallyUnlicensed',
  'adminHttpsLogin', 'uiHttpsLogin', 'homeActivation', 'homeQuotas', 'rootOwnedEosAdmission',
  'centralRevocation', 'proReactivation', 'proQuotas', 'restart', 'unchangedApp', 'sixOwnAdapterProcesses',
  'nativeEnrollmentAndPrestartRollback', 'nativePoststartEnrollmentRollback', 'backupPrivatePathAndHostSecret', 'logicalBackupCreatedAndListed',
  'allOwnAdapterConfigurationAssets', 'assetOnlyUploadPreservesEnrollment', 'backupAdapterReadiness']);
// The native scenario deliberately starts without a license, activates Home,
// revokes it, then activates Pro. Retain those observed lifecycle signals in
// evidence; they are not runtime faults. Scope every observation so an expected
// readonly setup denial cannot mask a permission failure in a running adapter.
const LICENSE_SIGNALS = new Set(['LICENSE_MISSING', 'LICENSE_VALID']);
const PROCESS_SCOPES = Object.freeze(['cli-setup', 'cli-upload', 'cli-upload', 'controller', 'cli-backup', 'cli-backup', 'controller']);
const SETUP_STAGE = 'ordinary setup loads actual PostgreSQL wrappers with read-only config';
const fail = () => { throw Object.assign(new Error('R10_NATIVE_EVIDENCE_REJECTED'), { code: 'R10_NATIVE_EVIDENCE_REJECTED' }); };
function validateProcessIndicators(evidence) {
  const records = evidence.processIndicators;
  // These are the seven actual child invocations of the pinned native scenario,
  // in launch order. Repeated upload/backup/controller scopes are deliberate;
  // missing, extra, reordered or unknown process records are not accepted.
  if (!Array.isArray(records) || records.length !== PROCESS_SCOPES.length ||
      !Array.isArray(evidence.runtimeIndicators) || evidence.runtimeIndicators.length > 3) fail();
  const setup = evidence.stages.filter(row => row.name === SETUP_STAGE);
  if (setup.length !== 1 || setup[0].passed !== true || setup[0].failureCode !== null) fail();
  const observed = new Set();
  for (let index = 0; index < PROCESS_SCOPES.length; index++) {
    const row = records[index];
    if (!row || typeof row !== 'object' || Array.isArray(row) ||
        !equal(Object.keys(row).sort(), ['indicators', 'scope']) || row.scope !== PROCESS_SCOPES[index] ||
        !Array.isArray(row.indicators) || row.indicators.length > 2 ||
        new Set(row.indicators).size !== row.indicators.length) fail();
    for (const code of row.indicators) {
      // setup exits zero only after its real PostgreSQL/configuration work. Its
      // optional upstream root launcher encounters EACCES in the immutable app.
      // Global unchanged-app/config and all subsequent runtime checks still gate
      // success. No other setup failure or other process's EACCES is exempted.
      if (!(row.scope === 'controller' && LICENSE_SIGNALS.has(code)) &&
          !(row.scope === 'cli-setup' && code === 'PERMISSION_DENIED')) fail();
      observed.add(code);
    }
  }
  // Preserve the raw records. The aggregate may neither hide a process fault nor
  // invent an unscoped exemption; duplicates, bad types and order drift fail.
  if (!equal(evidence.runtimeIndicators, [...observed].sort())) fail();
}
function validate({ preparation, evidence, binding, tap, sourceCommit, appContentSha256, baselineContentSha256, coverage, overlays }) {
  if (!/^[a-f0-9]{40}$/.test(sourceCommit || '') || !/^[a-f0-9]{64}$/.test(appContentSha256 || '') ||
      !/^[a-f0-9]{64}$/.test(baselineContentSha256 || '') || !Array.isArray(coverage) || !coverage.length || !Array.isArray(overlays) || !overlays.length ||
      preparation?.schemaVersion !== 1 || preparation.kind !== 'unsigned-own-adapters-native-preparation' ||
      preparation.signed !== false || preparation.unsignedFixture !== true || preparation.sourceTreeClean !== true ||
      preparation.sequence !== 13 || preparation.nodeVersion !== '24.21.0' || preparation.sourceCommit !== sourceCommit ||
      preparation.previousSignatureVerified !== true || preparation.previousReleaseId !== BASE_RELEASE ||
      preparation.appContentSha256 !== appContentSha256 || preparation.baselineContentSha256 !== baselineContentSha256 ||
      binding?.schemaVersion !== 1 || binding.sourceCommit !== sourceCommit || binding.sourceTreeClean !== true ||
      binding.signed !== false || binding.unsignedFixture !== true || binding.previousSignatureVerified !== true ||
      binding.previousReleaseId !== BASE_RELEASE || !equal(binding.ownSourceCoverage, coverage) || !equal(binding.ownOverlay, overlays) ||
      !equal(binding.allowedControllerTransforms, ['node_modules/iobroker.js-controller/eos-test-profile.json',
        'node_modules/@iobroker/js-controller-cli/build/cjs/lib/setup/setupBackup.js', 'node_modules/@iobroker/js-controller-cli/build/esm/lib/setup/setupBackup.js']) ||
      evidence?.schemaVersion !== 1 || evidence.kind !== 'eos-own-adapters-native-management' || evidence.passed !== true ||
      evidence.sourceReleaseId !== BASE_RELEASE || evidence.sourceSequence !== 12 || evidence.targetSequence !== 13 || evidence.sequence !== 13 ||
      evidence.sourceCommit !== sourceCommit || evidence.appContentSha256 !== appContentSha256 || evidence.nodeVersion !== '24.21.0' ||
      evidence.licenseFormat !== 'NWL3' || evidence.signed !== false || evidence.unsignedFixture !== true || evidence.candidateSigned !== false ||
      evidence.hardwareTested !== false || evidence.productionReleaseApproved !== false || evidence.hostArch !== 'x64' ||
      evidence.nativePostgresql !== '17.11' || evidence.signedPayloadPlatform !== 'linux-arm64' ||
      !evidence.checks || Object.keys(evidence.checks).length !== CHECKS.length || CHECKS.some(k => evidence.checks[k] !== true) ||
      ['managementReadinessPassed', 'restartPassed', 'candidateAppBytesUnchanged', 'fixedRootOwnedEosPaths', 'ownDeviceAdapterProcessesStarted'].some(k => evidence[k] !== true) ||
      ['lifecycleScriptsExecuted', 'nativeModulesRebuilt', 'mockedRuntimeDependencies', 'physicalHardwareConnected', 'physicalCommandsSent', 'actualSystemdMountPolicy', 'physicalPiAcceptance'].some(k => evidence[k] !== false) ||
      !Array.isArray(evidence.stages) || !evidence.stages.length || evidence.stages.some(s => s.passed !== true || s.failureCode !== null) ||
      evidence.logReadFailure) fail();
  validateProcessIndicators(evidence);
  for (const name of ['bootstrapSteps', 'finalSteps']) if (!Array.isArray(evidence[name]) || !evidence[name].length ||
    evidence[name].some(s => s.passed !== true || s.failureCode !== null)) fail();
  if (evidence.logicalBackup?.archives !== 2 || evidence.logicalBackup.privatePermissions !== true || evidence.logicalBackup.previousArchivesExcluded !== true ||
      evidence.logicalBackup.nativeDatabaseExport !== true || evidence.logicalBackup.archiveContentsRead !== true ||
      evidence.logicalBackup.restorePerformed !== false || evidence.logicalBackup.completeSystemBackup !== false ||
      !Array.isArray(evidence.logicalBackup.inspections) || evidence.logicalBackup.inspections.length !== 2 ||
      evidence.logicalBackup.inspections.some(row => row.canaryObjectAndStatePresent !== true || row.exactRuntimeConfigPresent !== true || row.requiredObjectsPresent !== true)) fail();
  if (evidence.assetUpload?.adapters !== 6 || !Number.isSafeInteger(evidence.assetUpload.files) || evidence.assetUpload.files < 1 ||
      !Number.isSafeInteger(evidence.assetUpload.bytes) || evidence.assetUpload.bytes < 1 ||
      evidence.assetUpload.instancesAndMarkersUnchanged !== true || evidence.assetUpload.unrelatedFilesPreserved !== true) fail();
  let nativeTestsPassed;
  try { nativeTestsPassed = passedTap(tap); } catch { fail(); }
  return { ok: true, sourceCommit, appContentSha256, baselineContentSha256, nativeTestsPassed,
    scope: 'six-own-adapters-native-x64-management-license-backup-and-rollback',
    checks: [...CHECKS], hardwareTested: false, productionReleaseApproved: false };
}
function verifyNativeEvidence({ directory, sourceCommit, files, previousFiles, coverage, overlays }) {
  if (!path.isAbsolute(directory || '') || fs.realpathSync(directory) !== directory || !fs.lstatSync(directory).isDirectory()) fail();
  const raw = {};
  for (const name of ['own-adapters-native-prepared.json', 'own-adapters-native-evidence.json', 'own-adapters-source-binding.json', 'own-adapters-native.tap'])
    raw[name] = bundle.readFileLimited(path.join(directory, name), 16 * 1024 * 1024).bytes;
  const result = validate({ preparation: JSON.parse(raw['own-adapters-native-prepared.json']), evidence: JSON.parse(raw['own-adapters-native-evidence.json']),
    binding: JSON.parse(raw['own-adapters-source-binding.json']), tap: raw['own-adapters-native.tap'].toString('utf8'),
    sourceCommit, appContentSha256: appHash(files, ''), baselineContentSha256: appHash(previousFiles, ''), coverage, overlays });
  return { ...result, evidenceFiles: Object.entries(raw).map(([file, bytes]) => ({ file, bytes: bytes.length, sha256: bundle.sha256(bytes) })) };
}
module.exports = { BASE_RELEASE, CHECKS, validate, verifyNativeEvidence };
