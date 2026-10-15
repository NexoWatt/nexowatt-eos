'use strict';
// Offline manufacturer builder for a NEW R10 test artifact. No publication,
// device install, credentials, npm resolution, lifecycle hooks or private-key file.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const { isDeepStrictEqual: equal } = require('node:util');
const ROOT = path.resolve(__dirname, '../../../..');
const bundle = require(path.join(ROOT, 'runtime/release/bundle.cjs'));
const r9 = require(path.join(ROOT, 'reports/integration/installable-test3-r9-20261005/build-revision.cjs'));
const build = require(path.join(ROOT, 'tools/system/build-bundle.cjs'));
const archiveTool = require(path.join(ROOT, 'tools/integration/create-test-archive.cjs'));
const product = require(path.join(ROOT, 'runtime/product/scope.cjs'));
const own = require(path.join(ROOT, 'runtime/bootstrap/own-adapter-enrollment.cjs'));
const backup = require(path.join(ROOT, 'runtime/controller-profile/backup-state.cjs'));
const { componentTreeDigest } = require(path.join(ROOT, 'runtime/policy/admission.cjs'));
const derivative = require('./bind-derivative-sbom.cjs');
const native = require('./native-evidence.cjs');
const BASE = Object.freeze({ directory: 'delivery/test-pi-0.2.0-test.3-r9', archive: 'eos-0.2.0-test.3-linux-arm64.tar.gz',
  bytes: 88944737, sha256: '8adad353b83de5f396cb9402442f430d65f70e9538390e8b02b6073bc21e7d31',
  keySha256: '018e554d65105fa012fcd443f23077018fcd6e6bcf03af8f6fdedffdc4f74b04',
  deliverySha256: '2134362c3c25871010ab8b99cf9a8f4a9600cb50d81db1fe476106c0ec7f3df4', releaseId: native.BASE_RELEASE });
const METADATA = Object.freeze({ schemaVersion: 1, product: 'nexowatt-eos', releaseVersion: '0.2.0-test.3', sequence: 13,
  profile: 'test', nodeVersion: '24.21.0', platforms: ['linux-arm64'] });
const NEXT = 'delivery/test-pi-0.2.0-test.3-r10';
const REPORT = 'reports/integration/own-adapter-test-20261015/release';
const WORK = '.work/runtime-test3-r10-20261015';
const REQUIRED_UPDATER = 'tools/system/update-test-own-adapters.cjs';
const UPLOAD_TEMPLATE = 'system/own-adapter-test/systemd/nexowatt-eos-upload.service';
const UPLOAD_TARGET = 'system/postgresql-test/systemd/nexowatt-eos-upload.service';
const save = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o644 });
const fail = code => { throw Object.assign(new Error(code), { code }); };
function run(program, args, options = {}) {
  const result = cp.spawnSync(program, args, { cwd: ROOT, encoding: 'utf8', timeout: 180000,
    maxBuffer: 64 * 1024 * 1024, shell: false, env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, ...options });
  if (result.error || result.status !== 0) fail('R10_BUILD_COMMAND_FAILED');
  return result.stdout.trim();
}
function verifyBase(directory) {
  if (!path.isAbsolute(directory) || fs.realpathSync(directory) !== directory) fail('R10_BASE_PATH');
  const archive = path.join(directory, BASE.archive), key = bundle.readFileLimited(path.join(directory, 'release-public.pem'), 16384).bytes;
  const bytes = bundle.readFileLimited(archive, 100 * 1024 * 1024).bytes;
  const deliveryBytes = bundle.readFileLimited(path.join(directory, 'delivery.json'), 65536).bytes;
  if (bytes.length !== BASE.bytes || bundle.sha256(bytes) !== BASE.sha256 || bundle.sha256(key) !== BASE.keySha256 ||
      bundle.sha256(deliveryBytes) !== BASE.deliverySha256) fail('R10_BASE_PINS');
  const checked = archiveTool.verifyTestArchive({ archivePath: archive, publicKey: key, expectedReleaseId: BASE.releaseId, platform: 'linux-arm64' });
  const delivery = JSON.parse(deliveryBytes);
  if (checked.manifest.sequence !== 12 || checked.manifest.nodeVersion !== METADATA.nodeVersion || checked.manifest.profile !== 'test' ||
      delivery.deliveryRevision !== 9 || delivery.releaseId !== BASE.releaseId || delivery.productionReleaseApproved !== false ||
      delivery.physicalControlEnabled !== false) fail('R10_BASE_SCOPE');
  return { archive, key, checked, delivery };
}
function candidateCatalog(previous) {
  product.assertCatalog(previous, product.MANAGEMENT_TEST);
  const next = structuredClone(previous); next.catalogRevision = previous.catalogRevision + 1;
  for (const entry of next.entries) if (entry.review.status === 'pending') {
    entry.required = true;
    entry.review = { status: 'approved-test', evidenceId: 'eos-own-adapters-native-20261015' };
  }
  product.assertCatalog(next, product.OWN_ADAPTER_TEST);
  return next; // Unsigned candidate only; no signing before native evidence passes.
}
function prepareApp({ baseDirectory, work, sourceCommit, timestamp }) {
  if (!/^[a-f0-9]{40}$/.test(sourceCommit || '') || !Number.isFinite(Date.parse(timestamp)) || !path.isAbsolute(work || '') ||
      path.resolve(work) !== work || fs.existsSync(work)) fail('R10_PREPARE_INPUT');
  const base = verifyBase(baseDirectory), coverage = r9.sourceEntries(), prebuilt = r9.verifyPrebuilt(coverage);
  fs.mkdirSync(work, { mode: 0o700 });
  run('/usr/bin/python3', ['-I', '-B', 'tools/system/extract-test-bundle.py', '--archive', base.archive,
    '--destination', path.join(work, 'r9'), '--sha256', BASE.sha256]);
  const authenticated = bundle.verifyBundle({ bundleDirectory: path.join(work, 'r9/bundle'), publicKey: base.key,
    platform: 'linux-arm64', nodeVersion: METADATA.nodeVersion });
  if (authenticated.releaseId !== BASE.releaseId || !equal(authenticated.manifest, base.checked.manifest)) fail('R10_BASE_EXTRACTED_BINDING');
  const oldPayload = authenticated.payloadPath, previousApp = path.join(oldPayload, 'app'), app = path.join(work, 'app');
  build.copyDirectory(previousApp, app);
  const before = r9.appRows(base.checked.manifest);
  if (!equal(before, bundle.inventory(app))) fail('R10_BASE_COPY');
  const overlay = r9.overlaySource(app, before, coverage);
  const profile = own.profileValue();
  if (!equal(profile.adapters, product.admittedAdapters(product.OWN_ADAPTER_TEST))) fail('R10_ADAPTER_PROFILE');
  const controllerProfile = path.join(app, derivative.PROFILE_FILE);
  fs.writeFileSync(controllerProfile, JSON.stringify(profile, null, 2) + '\n'); fs.chmodSync(controllerProfile, 0o644);
  const backupTransform = backup.applyToBuild(app);
  own.pinnedAdapters(app); product.inspectApp(app, product.OWN_ADAPTER_TEST);
  const after = bundle.inventory(app), changes = derivative.assertDelta(before, after);
  const previousSbomBytes = bundle.readFileLimited(path.join(oldPayload, 'sbom.cdx.json'), 16 * 1024 * 1024).bytes;
  const sbom = derivative.bindDerivative({ app, previousApp, previousManifest: base.checked.manifest,
    previousSbom: JSON.parse(previousSbomBytes), sourceCommit, timestamp });
  const sbomFile = path.join(work, 'runtime.cdx.json'); save(sbomFile, sbom.bom);
  const oldCatalog = JSON.parse(bundle.readFileLimited(path.join(oldPayload, 'catalog.json')).bytes);
  const catalog = candidateCatalog(oldCatalog), catalogFile = path.join(work, 'catalog.json'); save(catalogFile, catalog);
  save(path.join(work, 'unsigned-app-verification.json'), { schemaVersion: 1, kind: 'unsigned-r10-candidate-preparation',
    signed: false, sourceCommit, timestamp, previousReleaseId: BASE.releaseId, previousSignatureVerified: true,
    appContentSha256: sbom.evidence.actualAppFileTableSha256, changes: changes.length, prebuilt, backupTransform,
    executionScope: product.OWN_ADAPTER_TEST, nativeTargetExecutionPerformed: false, hardwareTested: false, productionReleaseApproved: false });
  return { ...base, work, app, previousApp, oldPayload, before, after, changes, coverage, overlays: overlay.bindings,
    prebuilt, backupTransform, sbom, sbomFile, catalog, oldCatalog, catalogFile, sourceCommit, timestamp };
}
function prepareCandidatePayload(prepared, payload) {
  const files = build.preparePayload({ appDirectory: prepared.app, destination: payload, catalogFile: prepared.catalogFile,
    sbomFile: prepared.sbomFile, releaseScope: product.OWN_ADAPTER_TEST });
  const catalog = structuredClone(prepared.catalog);
  for (const entry of catalog.entries) entry.sha256 = componentTreeDigest(build.componentRows(files, entry.package));
  fs.writeFileSync(path.join(payload, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
  const finalFiles = bundle.inventory(payload);
  validateHostDelta(prepared.checked.manifest.files, finalFiles);
  if (!finalFiles.some(r => r.path === REQUIRED_UPDATER)) fail('R10_UPDATER_NOT_PACKAGED');
  if (!equal(r9.appRows({ files: finalFiles }), prepared.after)) fail('R10_PAYLOAD_APP_CHANGED');
  const checked = build.validatePayload(payload, { ...METADATA, files: finalFiles });
  return { files: finalFiles, catalog, checked };
}
function validateHostDelta(previous, next) {
  const oldRows = new Map(previous.map(row => [row.path, row])), nextRows = new Map(next.map(row => [row.path, row]));
  const bytes = bundle.readFileLimited(path.join(ROOT, UPLOAD_TEMPLATE), 65536).bytes;
  if (!oldRows.has(UPLOAD_TARGET) || oldRows.has(UPLOAD_TEMPLATE)) fail('R10_HOST_MIGRATION');
  for (const name of [UPLOAD_TEMPLATE, UPLOAD_TARGET]) {
    const expected = { path: name, size: bytes.length, mode: 0o644, sha256: bundle.sha256(bytes) };
    if (!equal(nextRows.get(name), expected)) fail('R10_HOST_MIGRATION');
  }
  for (const name of new Set([...oldRows.keys(), ...nextRows.keys()])) {
    if ((name.startsWith('system/') || name === 'runtime/postgresql/schema.sql') &&
        ![UPLOAD_TEMPLATE, UPLOAD_TARGET].includes(name) && !equal(oldRows.get(name), nextRows.get(name))) fail('R10_HOST_MIGRATION');
  }
  return { source: UPLOAD_TEMPLATE, target: UPLOAD_TARGET, sha256: bundle.sha256(bytes), bytes: bytes.length,
    mode: 0o644, packagedSourceTemplate: true };
}
function transitionEvidence(previous, next) {
  require(path.join(ROOT, REQUIRED_UPDATER)).validateTransition(previous, next, { expectedReleaseId: next.releaseId });
  const uploadUnitMapping = validateHostDelta(previous.manifest.files, next.manifest.files);
  return { passed: true, previousReleaseId: BASE.releaseId, previousSequence: 12, targetReleaseId: next.releaseId, targetSequence: 13,
    hostSystemFilesUnchanged: false, otherHostSystemFilesUnchanged: true, uploadUnitMapping,
    postgresqlSchemaFileUnchanged: true, admissionScope: product.OWN_ADAPTER_TEST,
    targetExecutionPerformed: false, hardwareTested: false, productionReleaseApproved: false };
}
function sourceBinding(prepared, final) {
  const hostFiles = final.manifest.files.filter(r => ['runtime/', 'tools/', 'security/', 'system/'].some(prefix => r.path.startsWith(prefix))).map(row => {
    const source = row.path === UPLOAD_TARGET ? UPLOAD_TEMPLATE : row.path;
    const bytes = bundle.readFileLimited(path.join(ROOT, source)).bytes;
    if (bytes.length !== row.size || bundle.sha256(bytes) !== row.sha256) fail('R10_HOST_SOURCE_BINDING');
    return { source, target: row.path, bytes: row.size, sha256: row.sha256 };
  });
  return { schemaVersion: 1, sourceCommit: prepared.sourceCommit, releaseId: final.releaseId, previousReleaseId: BASE.releaseId,
    hostFiles, sourceCoverage: prepared.coverage, ownOverlays: prepared.overlays, changes: prepared.changes,
    backupTransform: prepared.backupTransform, allMatched: true, npmResolutionPerformed: false, sourceTranspilationPerformed: false };
}
function deliveryMetadata({ previousDelivery, release, sourceCommit, installedComponents }) {
  return { ...previousDelivery, deliveryRevision: 10, releaseSequence: 13, releaseId: release.releaseId,
    signingPublicKeySha256: release.signingPublicKeySha256, sha256: release.archiveSha256, bytes: release.archiveBytes,
    signedFiles: release.manifest.files.length, sourceCommit, installedComponents,
    sourceAssembly: derivative.ASSEMBLY, executionScope: product.OWN_ADAPTER_TEST,
    scope: 'six own adapters admitted for controlled test; initial instances have no configured physical endpoints',
    archiveReadbackVerified: true, privateKeyPersisted: false, physicalControlEnabled: false,
    targetTestRequired: true, hardwareTested: false, operatorRecoveryPathAvailable: false, productionReleaseApproved: false };
}
function verificationMetadata({ sourceCommit, timestamp, release, historicalCount, nativeEvidence, transition, prebuilt }) {
  return { schemaVersion: 1, sourceCommit, timestamp, sourceReleaseId: BASE.releaseId,
    deliveryRevision: 10, releaseSequence: 13, releaseId: release.releaseId,
    archiveSha256: release.archiveSha256, archiveBytes: release.archiveBytes, signingPublicKeySha256: release.signingPublicKeySha256,
    previousSignatureVerified: true, finalSignatureVerified: true, signedArchiveReadbackPassed: true, sourceBindingPassed: true,
    historicalDeliveryFilesUnchanged: historicalCount, nativeEvidence, transition, prebuilt,
    published: false, piUpdatePerformed: false, hardwareTested: false, productionReleaseApproved: false };
}
function parseArgs(argv) {
  if (![2, 4].includes(argv.length)) fail('R10_BUILD_USAGE');
  const result = {}, names = { '--native-evidence': 'nativeEvidenceDirectory', '--base-directory': 'baseDirectory' };
  for (let i = 0; i < argv.length; i += 2) {
    const key = names[argv[i]], value = argv[i + 1];
    if (!key || Object.hasOwn(result, key) || !path.isAbsolute(value || '') || path.resolve(value) !== value) fail('R10_BUILD_USAGE');
    result[key] = value;
  }
  if (!result.nativeEvidenceDirectory) fail('R10_NATIVE_EVIDENCE_REQUIRED');
  return result;
}
function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (process.platform !== 'linux' || process.versions.node !== METADATA.nodeVersion) fail('R10_BUILD_HOST');
  const sourceCommit = run('git', ['rev-parse', 'HEAD']), timestamp = run('git', ['show', '-s', '--format=%cI', 'HEAD']);
  if (!/^[a-f0-9]{40}$/.test(sourceCommit) || run('git', ['status', '--porcelain', '--untracked-files=normal'])) fail('R10_CLEAN_CHECKOUT_REQUIRED');
  const destination = path.join(ROOT, NEXT);
  if (fs.existsSync(destination)) fail('R10_IMMUTABLE_DESTINATION_EXISTS');
  const baseDirectory = options.baseDirectory || path.join(ROOT, BASE.directory), historical = [];
  for (const directory of new Set([baseDirectory, path.join(ROOT, 'delivery')])) if (fs.existsSync(directory))
    for (const row of r9.historicalInventory(directory)) historical.push({ ...row, absolute: path.join(directory, row.path) });
  fs.mkdirSync(path.join(ROOT, '.work'), { recursive: true });
  const prepared = prepareApp({ baseDirectory, work: path.join(ROOT, WORK), sourceCommit, timestamp });
  const nativeEvidence = native.verifyNativeEvidence({ directory: options.nativeEvidenceDirectory, sourceCommit,
    files: prepared.after, previousFiles: prepared.before, coverage: prepared.coverage, overlays: prepared.overlays });
  const payload = path.join(prepared.work, 'payload'), candidate = prepareCandidatePayload(prepared, payload);
  const canonical = archiveTool.canonicalInventory(candidate.files, METADATA, candidate.checked.architectureReports);
  if (!equal(canonical.files, candidate.files)) fail('R10_NONCANONICAL_PAYLOAD_MODE');
  const manifest = bundle.validateManifest({ ...METADATA, files: canonical.files });
  const draft = { releaseId: bundle.sha256(Buffer.from(JSON.stringify(manifest) + '\n')), manifest, catalog: candidate.catalog };
  const previous = { ...prepared.checked, catalog: prepared.oldCatalog };
  const transition = transitionEvidence(previous, draft);
  r9.requireCommittedSources(prepared.coverage);
  if (run('git', ['status', '--porcelain', '--untracked-files=normal'])) fail('R10_SOURCE_CHANGED_BEFORE_SIGNING');
  // Uses the established TEST-only in-memory signer; no private key is persisted.
  const archive = path.join(prepared.work, BASE.archive), keyFile = path.join(prepared.work, 'release-public.pem');
  const signed = archiveTool.createTestArchive({ payloadDirectory: payload, archivePath: archive, publicKeyPath: keyFile, metadata: METADATA });
  if (signed.archiveBytes > 100 * 1024 * 1024) fail('R10_ARCHIVE_SIZE');
  const key = bundle.readFileLimited(keyFile, 16384).bytes;
  const final = archiveTool.verifyTestArchive({ archivePath: archive, publicKey: key, expectedReleaseId: draft.releaseId, platform: 'linux-arm64' });
  if (!equal(final.manifest, manifest) || !equal(transitionEvidence(previous, { ...final, catalog: candidate.catalog }), transition)) fail('R10_SIGNED_TRANSITION_CHANGED');
  const binding = sourceBinding(prepared, final);
  for (const row of historical) {
    const bytes = bundle.readFileLimited(row.absolute, 128 * 1024 * 1024).bytes;
    if (bytes.length !== row.size || bundle.sha256(bytes) !== row.sha256) fail('R10_HISTORICAL_DELIVERY_CHANGED');
  }
  const release = { ...final, signingPublicKeySha256: bundle.sha256(key) };
  const delivery = deliveryMetadata({ previousDelivery: prepared.delivery, release, sourceCommit, installedComponents: candidate.checked.productInventory });
  // New immutable destination only. Historical artifacts and entry pins untouched.
  fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.mkdirSync(destination);
  fs.copyFileSync(archive, path.join(destination, BASE.archive), fs.constants.COPYFILE_EXCL);
  fs.copyFileSync(keyFile, path.join(destination, 'release-public.pem'), fs.constants.COPYFILE_EXCL);
  save(path.join(destination, 'delivery.json'), delivery);
  fs.writeFileSync(path.join(destination, 'bundle.sha256'), `${final.archiveSha256}  ${BASE.archive}\n${bundle.sha256(key)}  release-public.pem\n`, { flag: 'wx' });
  save(path.join(__dirname, 'runtime.cdx.json'), prepared.sbom.bom);
  save(path.join(__dirname, 'runtime-derivative-sbom.json'), { ...prepared.sbom.evidence,
    deliveredSbomSha256: final.manifest.files.find(r => r.path === 'sbom.cdx.json').sha256 });
  save(path.join(__dirname, 'signed-source-binding.json'), binding);
  save(path.join(__dirname, 'build-verification.json'), verificationMetadata({ sourceCommit, timestamp, release,
    historicalCount: historical.length, nativeEvidence, transition, prebuilt: prepared.prebuilt }));
  save(path.join(__dirname, 'delivery.json'), delivery);
  process.stdout.write(JSON.stringify({ ok: true, deliveryDirectory: NEXT, releaseId: final.releaseId,
    archiveSha256: final.archiveSha256, publicKeySha256: bundle.sha256(key), published: false }) + '\n');
}
module.exports = { BASE, METADATA, NEXT, REPORT, WORK, REQUIRED_UPDATER, UPLOAD_TEMPLATE, UPLOAD_TARGET, verifyBase, candidateCatalog, prepareApp,
  prepareCandidatePayload, validateHostDelta, transitionEvidence, sourceBinding, deliveryMetadata, verificationMetadata, parseArgs, main };
if (require.main === module) try { main(); } catch (error) {
  process.stderr.write((/^[A-Z0-9_]+$/.test(error.code || '') ? error.code : 'R10_BUILD_FAILED') + '\n'); process.exitCode = 1;
}
