'use strict';
// Trusted offline signing gate: evidence is data, never executable code.
const path = require('node:path');
const fs = require('node:fs');
const { isDeepStrictEqual: equal } = require('node:util');
const ROOT = path.resolve(__dirname, '../..');
const bundle = require(path.join(ROOT, 'runtime/release/bundle.cjs'));
const fresh = require(path.join(ROOT, 'runtime/release/fresh-sbom-binding.cjs'));
const { appHash, passedTap } = require(path.join(ROOT, 'tools/bootstrap/verify-r9-native-evidence.cjs'));

const CHECKS = Object.freeze(['postgresqlMtls', 'platformDeniesUnadmittedProcess', 'initiallyUnlicensed',
  'adminHttpsLogin', 'uiHttpsLogin', 'homeActivation', 'homeQuotas', 'rootOwnedEosAdmission',
  'centralRevocation', 'proReactivation', 'proQuotas', 'restart', 'unchangedApp', 'sixOwnAdapterProcesses',
  'freshEnrollmentPrewriteFailureIsAtomic', 'freshEnrollmentRetainedAfterRestart', 'backupPrivatePathAndHostSecret', 'logicalBackupCreatedAndListed',
  'allOwnAdapterConfigurationAssets', 'assetOnlyUploadPreservesEnrollment', 'backupAdapterReadiness']);
// The native scenario deliberately starts without a license, activates Home,
// revokes it, then activates Pro. Retain those observed lifecycle signals in
// evidence; they are not runtime faults. Scope every observation so an expected
// readonly setup denial cannot mask a permission failure in a running adapter.
const LICENSE_SIGNALS = new Set(['LICENSE_MISSING', 'LICENSE_VALID']);
const PROCESS_SCOPES = Object.freeze(['cli-setup', 'cli-upload', 'cli-upload', 'controller', 'cli-backup', 'cli-backup', 'controller']);
const SETUP_STAGE = 'ordinary setup loads actual PostgreSQL wrappers with read-only config';
const fail = () => { throw Object.assign(new Error('FRESH_NATIVE_EVIDENCE_REJECTED'), { code: 'FRESH_NATIVE_EVIDENCE_REJECTED' }); };
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
function validate({ preparation, evidence, binding, tap, sourceCommit, appContentSha256, record, runtimeBuildSha256 }) {
  const baseline = preparation?.baselineContentSha256;
  if (!/^[a-f0-9]{40}$/.test(sourceCommit || '') || !/^[a-f0-9]{64}$/.test(appContentSha256 || '') ||
      !/^[a-f0-9]{64}$/.test(baseline || '') || !/^[a-f0-9]{64}$/.test(runtimeBuildSha256 || '') ||
      record?.kind !== fresh.ASSEMBLY || record.sourceCommit !== sourceCommit || record.appContentSha256 !== appContentSha256 ||
      record.sourceTreeClean !== true || record.controllerVersion !== fresh.CONTROLLER || record.nodeVersion !== fresh.NODE ||
      !Number.isSafeInteger(record.sequence) || record.sequence < 15 ||
      preparation?.schemaVersion !== 1 || preparation.kind !== 'unsigned-security-refresh-native-preparation' ||
      preparation.signed !== false || preparation.unsignedFixture !== true || preparation.sourceTreeClean !== true ||
      preparation.sequence !== record.sequence || preparation.nodeVersion !== fresh.NODE || preparation.sourceCommit !== sourceCommit ||
      preparation.previousSignatureVerified !== false || preparation.sourceSequence !== 0 ||
      preparation.baselineKind !== 'unsigned-fresh-management-profile' ||
      preparation.previousReleaseId !== bundle.sha256(Buffer.from('unsigned-security-refresh-management-baseline:' + baseline)) ||
      preparation.runtimeBuildSha256 !== runtimeBuildSha256 || preparation.resolutionLockSha256 !== record.resolutionLockSha256 ||
      preparation.appContentSha256 !== appContentSha256 ||
      binding?.schemaVersion !== 1 || binding.kind !== 'eos-security-refresh-native-source-binding' ||
      binding.sourceCommit !== sourceCommit || binding.sourceTreeClean !== true || binding.signed !== false || binding.unsignedFixture !== true ||
      binding.previousSignatureVerified !== false || binding.previousReleaseId !== preparation.previousReleaseId ||
      binding.appContentSha256 !== appContentSha256 || binding.baselineContentSha256 !== baseline ||
      binding.runtimeBuildSha256 !== runtimeBuildSha256 || !equal(binding.runtimeBuild, record) ||
      evidence?.schemaVersion !== 1 || evidence.kind !== 'eos-security-refresh-native-management' || evidence.passed !== true ||
      evidence.sourceReleaseId !== preparation.previousReleaseId || evidence.sourceSequence !== 0 || evidence.targetSequence !== record.sequence || evidence.sequence !== record.sequence ||
      evidence.sourceCommit !== sourceCommit || evidence.appContentSha256 !== appContentSha256 || evidence.nodeVersion !== fresh.NODE ||
      evidence.runtimeBuildSha256 !== runtimeBuildSha256 ||
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
  return { ok: true, sourceCommit, appContentSha256, baselineContentSha256: baseline, runtimeBuildSha256, nativeTestsPassed,
    scope: 'fresh-controller7.2.5-native-x64-management-license-backup-and-restart',
    checks: [...CHECKS], hardwareTested: false, productionReleaseApproved: false };
}
function verifyNativeEvidence({ directory, sourceCommit, files, record, runtimeBuildSha256 }) {
  if (!path.isAbsolute(directory || '') || fs.realpathSync(directory) !== directory || !fs.lstatSync(directory).isDirectory()) fail();
  const raw = {};
  for (const name of ['own-adapters-native-prepared.json', 'own-adapters-native-evidence.json', 'own-adapters-source-binding.json', 'own-adapters-native.tap'])
    raw[name] = bundle.readFileLimited(path.join(directory, name), 16 * 1024 * 1024).bytes;
  const result = validate({ preparation: JSON.parse(raw['own-adapters-native-prepared.json']), evidence: JSON.parse(raw['own-adapters-native-evidence.json']),
    binding: JSON.parse(raw['own-adapters-source-binding.json']), tap: raw['own-adapters-native.tap'].toString('utf8'),
    sourceCommit, appContentSha256: appHash(files, ''), record, runtimeBuildSha256 });
  return { ...result, evidenceFiles: Object.entries(raw).map(([file, bytes]) => ({ file, bytes: bytes.length, sha256: bundle.sha256(bytes) })) };
}
module.exports = { CHECKS, validate, verifyNativeEvidence };
