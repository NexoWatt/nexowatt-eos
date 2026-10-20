'use strict';
// Offline manufacturer builder for a NEW R11 test artifact. No publication,
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
const shutdown = require(path.join(ROOT, 'runtime/controller-profile/adapter-shutdown.cjs'));
const { componentTreeDigest } = require(path.join(ROOT, 'runtime/policy/admission.cjs'));
const r10 = require('../../own-adapter-test-20261015/release/build-revision.cjs');
const derivative = require('../../own-adapter-test-20261015/release/bind-derivative-sbom.cjs');
const native = require('./native-evidence.cjs');
const BASE = Object.freeze({ directory: 'delivery/test-pi-0.2.0-test.3-r10', archive: 'eos-0.2.0-test.3-linux-arm64.tar.gz',
  bytes: 88999180, sha256: '0744417d8a9ece466a097170bf8636b463cd94dde03203e3df96e8d38290bb55',
  keySha256: '9facadcef98ae5b2dfe1f09386fa3bacb69e2663456722f2ed549040ae10134a',
  deliverySha256: 'e76bee0d4a8ce7d46d4ca0fbcbf66d9a36dc16dd995b6b945bed07bd13b3d9a8', releaseId: native.BASE_RELEASE });
const METADATA = Object.freeze({ schemaVersion: 1, product: 'nexowatt-eos', releaseVersion: '0.2.0-test.3', sequence: 14,
  profile: 'test', nodeVersion: '24.21.0', platforms: ['linux-arm64'] });
const NEXT = 'delivery/test-pi-0.2.0-test.3-r11';
const REPORT = 'reports/integration/network-test-20261020/release';
const WORK = '.work/runtime-test3-r11-20261020';
const REQUIRED_UPDATER = 'tools/system/update-test-to-r11.cjs';
const NETWORK_ASSEMBLY = 'authenticated-r9-app-reconstruction-with-r10-network-transition';
const UPLOAD_TEMPLATE = 'system/own-adapter-test/systemd/nexowatt-eos-upload.service';
const UPLOAD_TARGET = 'system/postgresql-test/systemd/nexowatt-eos-upload.service';
const save = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o644 });
const fail = code => { throw Object.assign(new Error(code), { code }); };
function run(program, args, options = {}) {
  const result = cp.spawnSync(program, args, { cwd: ROOT, encoding: 'utf8', timeout: 180000,
    maxBuffer: 64 * 1024 * 1024, shell: false, env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, ...options });
  if (result.error || result.status !== 0) fail('R11_BUILD_COMMAND_FAILED');
  return result.stdout.trim();
}
function verifyBase(directory) {
  if (!path.isAbsolute(directory) || fs.realpathSync(directory) !== directory) fail('R11_BASE_PATH');
  const archive = path.join(directory, BASE.archive), key = bundle.readFileLimited(path.join(directory, 'release-public.pem'), 16384).bytes;
  const bytes = bundle.readFileLimited(archive, 100 * 1024 * 1024).bytes;
  const deliveryBytes = bundle.readFileLimited(path.join(directory, 'delivery.json'), 65536).bytes;
  if (bytes.length !== BASE.bytes || bundle.sha256(bytes) !== BASE.sha256 || bundle.sha256(key) !== BASE.keySha256 ||
      bundle.sha256(deliveryBytes) !== BASE.deliverySha256) fail('R11_BASE_PINS');
  const checked = archiveTool.verifyTestArchive({ archivePath: archive, publicKey: key, expectedReleaseId: BASE.releaseId, platform: 'linux-arm64' });
  const delivery = JSON.parse(deliveryBytes);
  if (checked.manifest.sequence !== 13 || checked.manifest.nodeVersion !== METADATA.nodeVersion || checked.manifest.profile !== 'test' ||
      delivery.deliveryRevision !== 10 || delivery.releaseId !== BASE.releaseId || delivery.productionReleaseApproved !== false ||
      delivery.physicalControlEnabled !== false) fail('R11_BASE_SCOPE');
  return { archive, key, checked, delivery };
}
// The existing native-own-adapters harness reconstructs this exact current app
// from authenticated R9. R11 retains that component evidence format, while its
// installed transition and independent host-network gate are explicitly R10->R11.
// This does not reinterpret historical R10 evidence as new network qualification.
function networkSbom(bom) {
  const result = structuredClone(bom);
  const properties = result.metadata?.properties;
  if (!Array.isArray(properties)) fail('R11_SBOM_PROFILE');
  const props = Object.fromEntries(properties.map(row => [row.name, row.value]));
  if (new Set(properties.map(row => row.name)).size !== properties.length ||
      props['eos:sbom:assembly'] !== derivative.ASSEMBLY ||
      props['eos:sbom:base-release-id'] !== r10.BASE.releaseId ||
      props['eos:sbom:previous-release-id'] !== r10.BASE.releaseId ||
      props['eos:sbom:execution-scope'] !== product.OWN_ADAPTER_TEST) fail('R11_SBOM_PROFILE');
  const changed = { 'eos:sbom:assembly': NETWORK_ASSEMBLY,
    'eos:sbom:previous-release-id': BASE.releaseId, 'eos:sbom:target-sequence': '14' };
  result.metadata.properties = properties.filter(row => !Object.hasOwn(changed, row.name));
  result.metadata.properties.push(...Object.entries(changed).map(([name,value]) => ({name,value})));
  return result; // Component trees/locks/ancestors remain the actual R9-based reconstruction.
}
function prepareApp({ baseDirectory, work, sourceCommit, timestamp }) {
  const baseline = verifyBase(baseDirectory);
  const prepared = r10.prepareApp({ baseDirectory: path.join(ROOT, r10.BASE.directory), work, sourceCommit, timestamp });
  run('/usr/bin/python3', ['-I', '-B', 'tools/system/extract-test-bundle.py', '--archive', baseline.archive,
    '--destination', path.join(work, 'r10'), '--sha256', BASE.sha256]);
  const authenticated = bundle.verifyBundle({ bundleDirectory: path.join(work, 'r10/bundle'), publicKey: baseline.key,
    platform: 'linux-arm64', nodeVersion: METADATA.nodeVersion });
  if (authenticated.releaseId !== BASE.releaseId || !equal(authenticated.manifest, baseline.checked.manifest)) fail('R11_BASE_EXTRACTED_BINDING');
  const updateCatalog = JSON.parse(bundle.readFileLimited(path.join(authenticated.payloadPath, 'catalog.json')).bytes);
  product.assertCatalog(updateCatalog, product.OWN_ADAPTER_TEST);
  if (!equal(prepared.catalog, updateCatalog)) {
    const neutral = value => ({...value, entries:value.entries.map(({sha256,...row}) => row)});
    if (!equal(neutral(prepared.catalog), neutral(updateCatalog))) fail('R11_BASE_CATALOG');
  }
  prepared.sbom = { bom: networkSbom(prepared.sbom.bom), evidence: { ...prepared.sbom.evidence,
    kind: 'eos-r11-authenticated-network-app-derivative-sbom',
    assemblyBaseReleaseId: r10.BASE.releaseId, updateBaselineReleaseId: BASE.releaseId, targetSequence: 14 } };
  fs.writeFileSync(prepared.sbomFile, JSON.stringify(prepared.sbom.bom, null, 2) + '\n');
  return {...prepared, updateBaseline: {...baseline.checked,catalog:updateCatalog}, updateDelivery:baseline.delivery};
}
function prepareCandidatePayload(prepared, payload) {
  const files = build.preparePayload({ appDirectory: prepared.app, destination: payload, catalogFile: prepared.catalogFile,
    sbomFile: prepared.sbomFile, releaseScope: product.OWN_ADAPTER_TEST, networkProfile: true });
  const catalog = structuredClone(prepared.catalog);
  for (const entry of catalog.entries) entry.sha256 = componentTreeDigest(build.componentRows(files, entry.package));
  fs.writeFileSync(path.join(payload, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
  const finalFiles = bundle.inventory(payload);
  validateHostDelta(prepared.updateBaseline.manifest.files, finalFiles);
  if (!finalFiles.some(r => r.path === REQUIRED_UPDATER)) fail('R11_UPDATER_NOT_PACKAGED');
  if (!equal(r9.appRows({ files: finalFiles }), prepared.after)) fail('R11_PAYLOAD_APP_CHANGED');
  const checked = build.validatePayload(payload, { ...METADATA, files: finalFiles });
  return { files: finalFiles, catalog, checked };
}
function validateHostDelta(previous, next) {
  const names = require(path.join(ROOT, REQUIRED_UPDATER)).NETWORK_FILES.filter(name => name.startsWith('system/'));
  const oldRows=new Map(previous.map(row=>[row.path,row])), nextRows=new Map(next.map(row=>[row.path,row]));
  for (const name of names) {
    const bytes=bundle.readFileLimited(path.join(ROOT,name),65536).bytes;
    if(oldRows.has(name) || !equal(nextRows.get(name),{path:name,size:bytes.length,mode:0o644,sha256:bundle.sha256(bytes)})) fail('R11_HOST_MIGRATION');
  }
  for(const name of new Set([...oldRows.keys(),...nextRows.keys()])) if(name.startsWith('system/') && !names.includes(name) &&
    !equal(oldRows.get(name),nextRows.get(name))) fail('R11_HOST_MIGRATION');
  return {newNetworkUnits:names,otherHostSystemFilesUnchanged:true,technicalNetworkInitiallyConfigured:false};
}
function transitionEvidence(previous, next) {
  require(path.join(ROOT, REQUIRED_UPDATER)).validateTransition(previous,next,{expectedReleaseId:next.releaseId});
  return {passed:true, previousReleaseId:BASE.releaseId,previousSequence:13,targetReleaseId:next.releaseId,targetSequence:14,
    networkUnits:validateHostDelta(previous.manifest.files,next.manifest.files),
    admissionScope:product.OWN_ADAPTER_TEST,targetExecutionPerformed:false,hardwareTested:false,productionReleaseApproved:false};
}
function sourceBinding(prepared, final) {
  const hostFiles = final.manifest.files.filter(r => ['runtime/', 'tools/', 'security/', 'system/'].some(prefix => r.path.startsWith(prefix))).map(row => {
    const source = row.path === UPLOAD_TARGET ? UPLOAD_TEMPLATE : row.path;
    const bytes = bundle.readFileLimited(path.join(ROOT, source)).bytes;
    if (bytes.length !== row.size || bundle.sha256(bytes) !== row.sha256) fail('R11_HOST_SOURCE_BINDING');
    return { source, target: row.path, bytes: row.size, sha256: row.sha256 };
  });
  return { schemaVersion: 1, sourceCommit: prepared.sourceCommit, releaseId: final.releaseId, previousReleaseId: BASE.releaseId,
    assemblyBaseReleaseId: r10.BASE.releaseId, hostFiles, sourceCoverage: prepared.coverage, ownOverlays: prepared.overlays, changes: prepared.changes,
    backupTransform: prepared.backupTransform, adapterShutdownTransform: prepared.adapterShutdownTransform,
    adapterShutdownSourceSha256: bundle.sha256(bundle.readFileLimited(path.join(ROOT, derivative.SHUTDOWN_SOURCE)).bytes), allMatched: true, npmResolutionPerformed: false, sourceTranspilationPerformed: false };
}
function deliveryMetadata({ previousDelivery, release, sourceCommit, installedComponents }) {
  return { ...previousDelivery, deliveryRevision: 11, releaseSequence: 14, releaseId: release.releaseId,
    signingPublicKeySha256: release.signingPublicKeySha256, sha256: release.archiveSha256, bytes: release.archiveBytes,
    signedFiles: release.manifest.files.length, sourceCommit, installedComponents,
    sourceAssembly: 'authenticated-r9-component-reconstruction-with-r10-transition-and-native-network-gate', executionScope: product.OWN_ADAPTER_TEST,
    scope: 'R10 to R11 controlled test; authenticated Admin network management, initially unconfigured host addon and finite Influx TLS/failure propagation repair',
    archiveReadbackVerified: true, privateKeyPersisted: false, physicalControlEnabled: false,
    targetTestRequired: true, hardwareTested: false, operatorRecoveryPathAvailable: false, productionReleaseApproved: false };
}
function verificationMetadata({ sourceCommit, timestamp, release, historicalCount, nativeEvidence, transition, prebuilt }) {
  return { schemaVersion: 1, sourceCommit, timestamp, sourceReleaseId: BASE.releaseId,
    deliveryRevision: 11, releaseSequence: 14, releaseId: release.releaseId,
    archiveSha256: release.archiveSha256, archiveBytes: release.archiveBytes, signingPublicKeySha256: release.signingPublicKeySha256,
    previousSignatureVerified: true, finalSignatureVerified: true, signedArchiveReadbackPassed: true, sourceBindingPassed: true,
    historicalDeliveryFilesUnchanged: historicalCount, nativeEvidence, transition, prebuilt,
    published: false, piUpdatePerformed: false, hardwareTested: false, productionReleaseApproved: false };
}
function parseArgs(argv) {
  if (![2, 4].includes(argv.length)) fail('R11_BUILD_USAGE');
  const result = {}, names = { '--native-evidence': 'nativeEvidenceDirectory', '--base-directory': 'baseDirectory' };
  for (let i = 0; i < argv.length; i += 2) {
    const key = names[argv[i]], value = argv[i + 1];
    if (!key || Object.hasOwn(result, key) || !path.isAbsolute(value || '') || path.resolve(value) !== value) fail('R11_BUILD_USAGE');
    result[key] = value;
  }
  if (!result.nativeEvidenceDirectory) fail('R11_NATIVE_EVIDENCE_REQUIRED');
  return result;
}
function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (process.platform !== 'linux' || process.versions.node !== METADATA.nodeVersion) fail('R11_BUILD_HOST');
  const sourceCommit = run('git', ['rev-parse', 'HEAD']), timestamp = run('git', ['show', '-s', '--format=%cI', 'HEAD']);
  if (!/^[a-f0-9]{40}$/.test(sourceCommit) || run('git', ['status', '--porcelain', '--untracked-files=normal'])) fail('R11_CLEAN_CHECKOUT_REQUIRED');
  const destination = path.join(ROOT, NEXT);
  if (fs.existsSync(destination)) fail('R11_IMMUTABLE_DESTINATION_EXISTS');
  const baseDirectory = options.baseDirectory || path.join(ROOT, BASE.directory), historical = [];
  for (const directory of new Set([baseDirectory, path.join(ROOT, 'delivery')])) if (fs.existsSync(directory))
    for (const row of r9.historicalInventory(directory)) historical.push({ ...row, absolute: path.join(directory, row.path) });
  fs.mkdirSync(path.join(ROOT, '.work'), { recursive: true });
  const prepared = prepareApp({ baseDirectory, work: path.join(ROOT, WORK), sourceCommit, timestamp });
  const nativeEvidence = native.verifyNativeEvidence({ directory: options.nativeEvidenceDirectory, sourceCommit,
    files: prepared.after, previousFiles: prepared.before, coverage: prepared.coverage, overlays: prepared.overlays });
  const payload = path.join(prepared.work, 'payload'), candidate = prepareCandidatePayload(prepared, payload);
  const canonical = archiveTool.canonicalInventory(candidate.files, METADATA, candidate.checked.architectureReports);
  if (!equal(canonical.files, candidate.files)) fail('R11_NONCANONICAL_PAYLOAD_MODE');
  const manifest = bundle.validateManifest({ ...METADATA, files: canonical.files });
  const draft = { releaseId: bundle.sha256(Buffer.from(JSON.stringify(manifest) + '\n')), manifest, catalog: candidate.catalog };
  const previous = prepared.updateBaseline;
  const transition = transitionEvidence(previous, draft);
  r9.requireCommittedSources(prepared.coverage);
  if (run('git', ['status', '--porcelain', '--untracked-files=normal'])) fail('R11_SOURCE_CHANGED_BEFORE_SIGNING');
  // Uses the established TEST-only in-memory signer; no private key is persisted.
  const archive = path.join(prepared.work, BASE.archive), keyFile = path.join(prepared.work, 'release-public.pem');
  const signed = archiveTool.createTestArchive({ payloadDirectory: payload, archivePath: archive, publicKeyPath: keyFile, metadata: METADATA });
  if (signed.archiveBytes > 100 * 1024 * 1024) fail('R11_ARCHIVE_SIZE');
  const key = bundle.readFileLimited(keyFile, 16384).bytes;
  const final = archiveTool.verifyTestArchive({ archivePath: archive, publicKey: key, expectedReleaseId: draft.releaseId, platform: 'linux-arm64' });
  if (!equal(final.manifest, manifest) || !equal(transitionEvidence(previous, { ...final, catalog: candidate.catalog }), transition)) fail('R11_SIGNED_TRANSITION_CHANGED');
  const binding = sourceBinding(prepared, final);
  for (const row of historical) {
    const bytes = bundle.readFileLimited(row.absolute, 128 * 1024 * 1024).bytes;
    if (bytes.length !== row.size || bundle.sha256(bytes) !== row.sha256) fail('R11_HISTORICAL_DELIVERY_CHANGED');
  }
  const release = { ...final, signingPublicKeySha256: bundle.sha256(key) };
  const delivery = deliveryMetadata({ previousDelivery: prepared.updateDelivery, release, sourceCommit, installedComponents: candidate.checked.productInventory });
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
module.exports = { NETWORK_ASSEMBLY, networkSbom, BASE, METADATA, NEXT, REPORT, WORK, REQUIRED_UPDATER, UPLOAD_TEMPLATE, UPLOAD_TARGET, verifyBase, prepareApp,
  prepareCandidatePayload, validateHostDelta, transitionEvidence, sourceBinding, deliveryMetadata, verificationMetadata, parseArgs, main };
if (require.main === module) try { main(); } catch (error) {
  process.stderr.write((/^[A-Z0-9_]+$/.test(error.code || '') ? error.code : 'R11_BUILD_FAILED') + '\n'); process.exitCode = 1;
}
