'use strict';
// Manufacturer-only R8 candidate. No download, package install, target repair
// or publication. Historical R7 is authenticated before its app is reused.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const ROOT = path.resolve(__dirname, '../../..');
const bundle = require('../../../runtime/release/bundle.cjs');
const pid = require('../../../runtime/controller-profile/pid-state.cjs');
const { copyDirectory, preparePayload, componentRows, validatePayload } = require('../../../tools/system/build-bundle.cjs');
const { createTestArchive, verifyTestArchive, canonicalInventory } = require('../../../tools/integration/create-test-archive.cjs');
const { bindDerivative, appRows, assertUnchangedApp } = require('../../../tools/integration/bind-r8-derivative-sbom.cjs');
const { validateTransition, RETAINED_R7 } = require('../../../tools/system/recover-r4-restored-r7-to-r8.cjs');
const product = require('../../../runtime/product/scope.cjs');
const { componentTreeDigest } = require('../../../runtime/policy/admission.cjs');
const BASE = Object.freeze({ directory: 'delivery/test-pi-0.2.0-test.3-r7', archive: 'eos-0.2.0-test.3-linux-arm64.tar.gz',
    bytes: 97495870, sha256: 'a8273ad1bf23bdd2ae50f45afea8875c04e31c40464dea3c3a2c5ffca921b64a',
    keySha256: 'a6a11d0d02b058a15d78a1aa81a22e488d120ee3ab9f11e1bd35a3aafad6d522',
    releaseId: 'd400cab68939e60e22b619b78b3ecc4a4043afbfe6e21696934db42ba586d5a3',
    deliverySha256: '815f442858d9a97f898b41b039018f1facae999c679a95bf200f82e8580cb1db' });
const R4 = Object.freeze({ directory: 'delivery/test-pi-0.2.0-test.3-r4', bytes: 88363976,
    sha256: 'c1d418a66b3678fb19f4487ece9871da81cf7a583af59a6d889c799d7c6dd1b3',
    keySha256: 'd35d09a005703eecf1b5a8843b553064c5ab90758cfc71a634599459cda6e8b3',
    releaseId: '15d65328b06e5d4d3a72b2ee440159aa36e07ce300d45888762519b66652ffa8' });
const NEXT = 'delivery/test-pi-0.2.0-test.3-r8';
const WORK = '.work/runtime-test3-r8-20261004';
const REQUIRED_RECOVERY = 'tools/system/recover-r4-restored-r7-to-r8.cjs';
const HISTORICAL_RECOVERY = 'tools/system/recover-r4-first-start-to-r7.cjs';
const READINESS_TOOL = 'tools/system/onboard-ui.cjs';
const BACKENDS = Object.freeze([
    Object.freeze({ directory: 'store', package: '@nexowatt/eos-postgresql-store', files: ['index.cjs'] }),
    Object.freeze({ directory: 'db-objects-postgresql', package: '@iobroker/db-objects-postgresql', files: ['auth.cjs', 'facade.cjs', 'index.cjs', 'views.cjs'] }),
    Object.freeze({ directory: 'db-states-postgresql', package: '@iobroker/db-states-postgresql', files: ['index.cjs'] }),
]);
const METADATA = Object.freeze({ schemaVersion: 1, product: 'nexowatt-eos', releaseVersion: '0.2.0-test.3', sequence: 11,
    profile: 'test', nodeVersion: '24.21.0', platforms: ['linux-arm64'] });
const fail = code => { throw Object.assign(new Error(code), { code }); };
const save = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
function run(program, args, options = {}) {
    const result = cp.spawnSync(program, args, { cwd: ROOT, encoding: 'utf8', timeout: 180000,
        maxBuffer: 32 * 1024 * 1024, env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, ...options, shell: false });
    if (result.status !== 0 || result.error) fail('R8_BUILD_COMMAND_FAILED');
    return result.stdout.trim();
}
function sourceEntries() {
    return BACKENDS.flatMap(spec => {
        const source = 'runtime/postgresql/packages/' + spec.directory;
        // A new executable must be consciously added to this fixed mapping.
        const actual = bundle.inventory(path.join(ROOT, source)).filter(row => /\.(?:[cm]?js|ts)$/.test(row.path)).map(row => row.path).sort();
        if (JSON.stringify(actual) !== JSON.stringify([...spec.files].sort())) fail('R8_BACKEND_SOURCE_SCOPE');
        const pkg = JSON.parse(bundle.readFileLimited(path.join(ROOT, source, 'package.json')).bytes);
        if (pkg.name !== spec.package || pkg.version !== '0.1.0-dev.2' || pkg.main !== 'index.cjs') fail('R8_BACKEND_SOURCE_IDENTITY');
        return spec.files.map(file => ({ source: source + '/' + file, target: 'node_modules/' + spec.package + '/' + file }));
    }).sort((a, b) => a.target.localeCompare(b.target));
}
// Independent historical deliveries are not one installable payload. Retain
// the normal file/path/link/mode/count guards, but do not add archive bytes
// across releases to the product's unchanged 1-GiB payload-size ceiling.
function historicalInventory(directory) {
    const root = bundle.trustedDirectory(directory), rows = [];
    let count = 0;
    function walk(relative = '') {
        const entries = fs.opendirSync(path.join(root, relative));
        try { for (let entry; (entry = entries.readSync()) !== null;) {
            if (++count > bundle.LIMITS.entries) fail('R8_HISTORY_SIZE');
            const name = bundle.safeRelative(relative ? `${relative}/${entry.name}` : entry.name);
            if (entry.isDirectory()) walk(name);
            else if (entry.isFile()) {
                if (rows.length >= bundle.LIMITS.files) fail('R8_HISTORY_SIZE');
                const { bytes, mode } = bundle.readFileLimited(path.join(root, name));
                if (mode & 0o7000) fail('R8_HISTORY_MODE');
                rows.push({ path: name, size: bytes.length, sha256: bundle.sha256(bytes), mode: mode & 0o111 ? 0o755 : 0o644 });
            } else fail('R8_HISTORY_FILE');
        } } finally { entries.closeSync(); }
    }
    walk();
    return rows.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}
function verifyBase(baseDirectory) {
    const archive = path.join(baseDirectory, BASE.archive), key = bundle.readFileLimited(path.join(baseDirectory, 'release-public.pem'), 16384).bytes;
    const bytes = bundle.readFileLimited(archive, 100 * 1024 * 1024).bytes;
    if (bytes.length !== BASE.bytes || bundle.sha256(bytes) !== BASE.sha256 || bundle.sha256(key) !== BASE.keySha256) fail('R8_BASE_PINS');
    const checked = verifyTestArchive({ archivePath: archive, publicKey: key, expectedReleaseId: BASE.releaseId, platform: 'linux-arm64' });
    const deliveryBytes = bundle.readFileLimited(path.join(baseDirectory, 'delivery.json'), 65536).bytes;
    if (bundle.sha256(deliveryBytes) !== BASE.deliverySha256) fail('R8_BASE_DELIVERY_PIN');
    const delivery = JSON.parse(deliveryBytes);
    if (checked.manifest.sequence !== 10 || checked.manifest.profile !== 'test' || checked.manifest.nodeVersion !== '24.21.0' ||
        delivery.deliveryRevision !== 7 || delivery.releaseSequence !== 10 || delivery.releaseId !== BASE.releaseId ||
        delivery.sha256 !== BASE.sha256 || delivery.signingPublicKeySha256 !== BASE.keySha256 || delivery.physicalControlEnabled !== false) fail('R8_BASE_SCOPE');
    return { archive, key, checked, delivery };
}
function authenticateR4(work) {
    const read = name => {
        const file = path.join(ROOT, R4.directory, name);
        return fs.existsSync(file) ? bundle.readFileLimited(file, 100 * 1024 * 1024).bytes :
            cp.execFileSync('git', ['show', 'HEAD:' + R4.directory + '/' + name], { cwd: ROOT, timeout: 30000, maxBuffer: 100 * 1024 * 1024 });
    };
    const bytes = read(BASE.archive), key = read('release-public.pem');
    if (bytes.length !== R4.bytes || bundle.sha256(bytes) !== R4.sha256 || bundle.sha256(key) !== R4.keySha256) fail('R8_R4_BASE_PINS');
    const archive = path.join(work, 'authenticated-r4.tar.gz'); fs.writeFileSync(archive, bytes, { flag: 'wx' });
    const checked = verifyTestArchive({ archivePath: archive, publicKey: key, expectedReleaseId: R4.releaseId, platform: 'linux-arm64' });
    const catalogBytes = cp.execFileSync('/usr/bin/python3', ['-I', '-B', '-c',
        'import sys,tarfile; t=tarfile.open(sys.argv[1],"r:gz"); sys.stdout.buffer.write(t.extractfile("bundle/payload/catalog.json").read())', archive],
        { cwd: ROOT, timeout: 30000, maxBuffer: 1024 * 1024 });
    if (bundle.sha256(catalogBytes) !== checked.manifest.files.find(row => row.path === 'catalog.json')?.sha256) fail('R8_R4_CATALOG_BINDING');
    return { ...checked, catalog: JSON.parse(catalogBytes) };
}
function transitionEvidence(previous, next) {
    validateTransition(previous, next, { expectedReleaseId: next.releaseId });
    if (previous.manifest.schemaVersion !== 1 || next.manifest.schemaVersion !== 1 ||
        previous.catalog.schemaVersion !== 1 || next.catalog.schemaVersion !== 1) fail('R8_TRANSITION_SCHEMA');
    const schema = previous.manifest.files.find(row => row.path === 'runtime/postgresql/schema.sql');
    if (!schema || schema.sha256 !== next.manifest.files.find(row => row.path === schema.path)?.sha256) fail('R8_TRANSITION_SCHEMA');
    return { previousReleaseId: previous.releaseId, previousSequence: previous.manifest.sequence,
        targetReleaseId: next.releaseId, targetSequence: next.manifest.sequence,
        previousManifestSchemaVersion: previous.manifest.schemaVersion, targetManifestSchemaVersion: next.manifest.schemaVersion,
        previousCatalogSchemaVersion: previous.catalog.schemaVersion, targetCatalogSchemaVersion: next.catalog.schemaVersion,
        previousCatalogRevision: previous.catalog.catalogRevision, targetCatalogRevision: next.catalog.catalogRevision,
        previousRuntimeVersion: previous.manifest.releaseVersion, targetRuntimeVersion: next.manifest.releaseVersion,
        postgresqlSchemaSha256: schema.sha256, postgresqlSchemaFileUnchanged: true, hostSystemFilesUnchanged: true,
        admissionScopeUnchanged: true, previousSignatureVerified: true, passed: true, targetExecutionPerformed: false };
}
function assertBackendMetadata(app) {
    for (const spec of BACKENDS) {
        const source = JSON.parse(bundle.readFileLimited(path.join(ROOT, 'runtime/postgresql/packages', spec.directory, 'package.json')).bytes);
        const installed = JSON.parse(bundle.readFileLimited(path.join(app, 'node_modules', spec.package, 'package.json')).bytes);
        if (JSON.stringify(source) !== JSON.stringify(installed)) fail('R8_BACKEND_DEPENDENCY_CHANGE');
    }
}
function retainedR7Evidence(base) {
    const expected = { releaseId: BASE.releaseId, publicKeySha256: BASE.keySha256, sequence: 10, revision: 7, phase: 'RESTORED_STOPPED' };
    if (JSON.stringify(RETAINED_R7) !== JSON.stringify(expected) || base.checked.releaseId !== BASE.releaseId ||
        base.checked.manifest.sequence !== 10) fail('R8_RETAINED_R7_IDENTITY');
    return { ...expected, archiveSha256: BASE.sha256, signatureVerified: true,
        requiredRetainedJournalPhase: 'RESTORED_STOPPED', targetJournalValidated: false,
        scope: 'Authenticated retained release identity; per-host protected journal and snapshot remain mandatory target checks.' };
}
function assertHostChangeScope(previousManifest, files) {
    const previous = new Map(previousManifest.files.map(row => [row.path, row])), current = new Map(files.map(row => [row.path, row]));
    if (!current.has(REQUIRED_RECOVERY) || previous.has(REQUIRED_RECOVERY)) fail('R8_RECOVERY_NOT_PACKAGED');
    const unchanged = previous.get(HISTORICAL_RECOVERY), retained = current.get(HISTORICAL_RECOVERY);
    if (!unchanged || !retained || JSON.stringify(unchanged) !== JSON.stringify(retained)) fail('R8_HISTORICAL_RECOVERY_CHANGED');
    if (!previous.has(READINESS_TOOL) || !current.has(READINESS_TOOL) ||
        previous.get(READINESS_TOOL).sha256 === current.get(READINESS_TOOL).sha256) fail('R8_READINESS_FIX_NOT_PACKAGED');
}
// Explicitly unsigned local preparation remains usable while fixes are being
// reviewed. Only main() signs, after checking a clean reviewed source commit.
function prepareApp({ baseDirectory, work, sourceCommit, timestamp }) {
    if (!/^[a-f0-9]{40}$/.test(sourceCommit || '') || !Number.isFinite(Date.parse(timestamp)) || !path.isAbsolute(work) || fs.existsSync(work)) fail('R8_PREPARE_INPUT');
    const base = verifyBase(baseDirectory);
    const retainedReleaseProvenance = retainedR7Evidence(base);
    fs.mkdirSync(work, { mode: 0o700 });
    const extracted = path.join(work, 'r7');
    run('/usr/bin/python3', ['-I', '-B', 'tools/system/extract-test-bundle.py', '--archive', base.archive, '--destination', extracted, '--sha256', BASE.sha256]);
    const oldPayload = path.join(extracted, 'bundle/payload'), app = path.join(work, 'app');
    copyDirectory(path.join(oldPayload, 'app'), app);
    const before = appRows(base.checked.manifest), previous = new Map(before.map(row => [row.path, row])), coverage = [];
    const observed = () => bundle.inventory(app).map(({ path, size, sha256, mode }) => ({ path, size, sha256, mode }));
    assertUnchangedApp(before, observed());
    assertBackendMetadata(app);
    for (const entry of sourceEntries()) {
        const bytes = bundle.readFileLimited(path.join(ROOT, entry.source)).bytes, prior = previous.get(entry.target);
        if (!prior || prior.sha256 !== bundle.sha256(bytes) || prior.size !== bytes.length) fail('R8_BACKEND_SOURCE_CHANGE_NOT_AUTHORIZED');
        coverage.push({ ...entry, bytes: bytes.length, sha256: prior.sha256, previousSha256: prior.sha256 });
    }
    const pidVerification = pid.verifyBuild(app);
    assertUnchangedApp(before, observed());
    const previousSbomBytes = bundle.readFileLimited(path.join(oldPayload, 'sbom.cdx.json'), 16 * 1024 * 1024).bytes;
    if (bundle.sha256(previousSbomBytes) !== base.checked.manifest.files.find(row => row.path === 'sbom.cdx.json')?.sha256) fail('R8_BASE_SBOM_BINDING');
    const derivative = bindDerivative({ app, previousManifest: base.checked.manifest, previousSbom: JSON.parse(previousSbomBytes),
        previousReleaseId: BASE.releaseId, sourceCommit, timestamp });
    const sbomFile = path.join(work, 'runtime.cdx.json'); save(sbomFile, derivative.bom);
    const catalog = JSON.parse(bundle.readFileLimited(path.join(oldPayload, 'catalog.json')).bytes); catalog.catalogRevision = 7;
    const catalogFile = path.join(work, 'catalog.json'); save(catalogFile, catalog);
    product.inspectApp(app); product.assertCatalog(catalog);
    save(path.join(work, 'unsigned-app-verification.json'), { schemaVersion: 1, previousReleaseId: BASE.releaseId,
        previousSignatureVerified: true, sourceCommit, timestamp, signed: false, sourceTreeClean: run('git', ['status', '--porcelain', '--untracked-files=normal']) === '',
        appSourceCoverage: coverage.length, changedFiles: 0, applicationUnchanged: true, dependenciesUnchanged: true,
        nativeTargetExecutionPerformed: false, operatorRecoveryPathAvailable: false, productionReleaseApproved: false });
    return { ...base, app, oldPayload, before, coverage, pidVerification, previousSbomBytes, derivative, sbomFile, catalog, catalogFile, retainedReleaseProvenance };
}
function prepareCandidatePayload(prepared, payload) {
    pid.verifyBuild(prepared.app);
    const catalog = structuredClone(prepared.catalog);
    const files = preparePayload({ appDirectory: prepared.app, destination: payload, catalogFile: prepared.catalogFile, sbomFile: prepared.sbomFile });
    assertHostChangeScope(prepared.checked.manifest, files);
    for (const entry of catalog.entries) entry.sha256 = componentTreeDigest(componentRows(files, entry.package));
    fs.writeFileSync(path.join(payload, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
    const finalFiles = bundle.inventory(payload);
    const protectedRows = rows => rows.filter(row => row.path.startsWith('system/') || row.path === 'runtime/postgresql/schema.sql');
    if (JSON.stringify(protectedRows(prepared.checked.manifest.files)) !== JSON.stringify(protectedRows(finalFiles))) fail('R8_HOST_MIGRATION_NOT_SUPPORTED');
    const checked = validatePayload(payload, { ...METADATA, files: finalFiles });
    pid.verifyBuild(path.join(payload, 'app'));
    for (const row of prepared.coverage) {
        const installed = finalFiles.find(file => file.path === 'app/' + row.target);
        const runtime = finalFiles.find(file => file.path === row.source);
        if (installed?.sha256 !== row.sha256 || installed?.size !== row.bytes || runtime?.sha256 !== row.sha256) fail('R8_POSTGRESQL_RUNTIME_APP_BINDING');
    }
    return { files: finalFiles, catalog, checked };
}
function deliveryMetadata({ previousDelivery, release, sourceCommit, installedComponents }) {
    return { ...previousDelivery, deliveryRevision: 8, releaseSequence: 11, releaseId: release.releaseId,
        signingPublicKeySha256: release.signingPublicKeySha256, sha256: release.archiveSha256, bytes: release.archiveBytes,
        signedFiles: release.manifest.files.length, installedComponents, archiveReadbackVerified: true,
        privateKeyPersisted: false, sourceCommit, sourceAssembly: 'authenticated-r7-app-unchanged-with-reviewed-host-readiness-and-recovery',
        physicalControlEnabled: false, targetTestRequired: true, operatorRecoveryPathAvailable: false, productionReleaseApproved: false };
}
function verificationMetadata({ sourceCommit, timestamp, release, historicalCount, authenticatedBaselineTransition, retainedReleaseProvenance }) {
    return { schemaVersion: 1, sourceCommit, timestamp,
        host: process.platform + '-' + process.arch, buildNode: process.versions.node, targetNode: '24.21.0',
        releaseId: release.releaseId, archiveSha256: release.archiveSha256, archiveBytes: release.archiveBytes,
        signingPublicKeySha256: release.signingPublicKeySha256, deliveryRevision: 8, releaseSequence: 11,
        previousSignatureVerified: true, finalSignatureVerified: true, sourceBindingPassed: true, signedArchiveReadbackPassed: true,
        historicalDeliveryFilesUnchanged: historicalCount, exactOverlayDeltaChecked: true, applicationUnchanged: true, postgresqlRuntimeAndAppIdentical: true,
        authenticatedBaselineTransition, retainedReleaseProvenance,
        nativeTargetExecutionPerformed: false, piUpdatePerformed: false, operatorRecoveryPathAvailable: false, hardwareTested: false, productionReleaseApproved: false };
}
function main(argv = process.argv.slice(2)) {
    if (process.platform !== 'linux' || Number(process.versions.node.split('.')[0]) !== 24 ||
        !(argv.length === 0 || argv.length === 2 && argv[0] === '--base-directory' && path.isAbsolute(argv[1]))) fail('R8_BUILD_HOST');
    const commit = run('git', ['rev-parse', 'HEAD']), timestamp = run('git', ['show', '-s', '--format=%cI', 'HEAD']);
    if (!/^[a-f0-9]{40}$/.test(commit) || run('git', ['status', '--porcelain', '--untracked-files=normal']) !== '') fail('R8_CLEAN_CHECKOUT_REQUIRED');
    const destination = path.join(ROOT, NEXT);
    if (fs.existsSync(destination)) fail('R8_IMMUTABLE_DESTINATION_EXISTS');
    const baseDirectory = argv[1] || path.join(ROOT, BASE.directory), historical = [];
    for (const directory of new Set([baseDirectory, path.join(ROOT, 'delivery')])) if (fs.existsSync(directory))
        for (const row of historicalInventory(directory)) historical.push({ ...row, absolute: path.join(directory, row.path) });
    fs.mkdirSync(path.join(ROOT, '.work'), { recursive: true });
    const work = path.join(ROOT, WORK), prepared = prepareApp({ baseDirectory, work, sourceCommit: commit, timestamp });
    const payload = path.join(work, 'payload'), candidate = prepareCandidatePayload(prepared, payload);
    const draftManifest = bundle.validateManifest({ ...METADATA, files: canonicalInventory(candidate.files, METADATA, candidate.checked.architectureReports).files });
    const draft = { releaseId: bundle.sha256(Buffer.from(JSON.stringify(draftManifest) + '\n')), manifest: draftManifest, catalog: candidate.catalog };
    const r4 = authenticateR4(work), authenticatedBaselineTransition = transitionEvidence(r4, draft);
    const archive = path.join(work, BASE.archive), keyFile = path.join(work, 'release-public.pem');
    const signed = createTestArchive({ payloadDirectory: payload, archivePath: archive, publicKeyPath: keyFile, metadata: METADATA });
    if (signed.archiveBytes > 100 * 1024 * 1024) fail('R8_PUBLIC_ARCHIVE_LIMIT');
    const final = verifyTestArchive({ archivePath: archive, publicKey: bundle.readFileLimited(keyFile, 16384).bytes, expectedReleaseId: signed.releaseId, platform: 'linux-arm64' });
    if (JSON.stringify(authenticatedBaselineTransition) !== JSON.stringify(transitionEvidence(r4, { ...final, catalog: candidate.catalog }))) fail('R8_SIGNED_TRANSITION_CHANGED');
    assertUnchangedApp(prepared.before, appRows(final.manifest));
    const hostFiles = final.manifest.files.filter(row => ['runtime/', 'tools/', 'security/', 'system/'].some(prefix => row.path.startsWith(prefix))).map(row => {
        const bytes = bundle.readFileLimited(path.join(ROOT, row.path)).bytes;
        if (bundle.sha256(bytes) !== row.sha256 || bytes.length !== row.size) fail('R8_HOST_SOURCE_BINDING');
        return { source: row.path, target: row.path, bytes: row.size, sha256: row.sha256 };
    });
    for (const row of historical) {
        const bytes = bundle.readFileLimited(row.absolute, 128 * 1024 * 1024).bytes;
        if (bytes.length !== row.size || bundle.sha256(bytes) !== row.sha256) fail('R8_HISTORICAL_DELIVERY_CHANGED');
    }
    const delivery = deliveryMetadata({ previousDelivery: prepared.delivery, release: signed, sourceCommit: commit, installedComponents: product.inspectApp(prepared.app) });
    fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.mkdirSync(destination);
    for (const [source, name] of [[archive, BASE.archive], [keyFile, 'release-public.pem']]) fs.copyFileSync(source, path.join(destination, name), fs.constants.COPYFILE_EXCL);
    save(path.join(destination, 'delivery.json'), delivery);
    fs.writeFileSync(path.join(destination, 'bundle.sha256'), `${signed.archiveSha256}  ${BASE.archive}\n${signed.signingPublicKeySha256}  release-public.pem\n`, { flag: 'wx' });
    save(path.join(__dirname, 'runtime.cdx.json'), prepared.derivative.bom);
    save(path.join(__dirname, 'runtime-derivative-sbom.json'), { ...prepared.derivative.evidence,
        previousSbomExactBytesSha256: bundle.sha256(prepared.previousSbomBytes), deliveredSbomSha256: final.manifest.files.find(row => row.path === 'sbom.cdx.json').sha256 });
    save(path.join(__dirname, 'signed-source-binding.json'), { schemaVersion: 1, sourceCommit: commit, releaseId: signed.releaseId,
        archiveSha256: signed.archiveSha256, signingPublicKeySha256: signed.signingPublicKeySha256, previousReleaseId: BASE.releaseId,
        overlays: [], sourceCoverage: prepared.coverage, pidVerification: prepared.pidVerification, hostFiles, allMatched: true,
        unchangedAppContentReused: true, applicationUnchanged: true, npmResolutionPerformed: false, sourceTranspilationPerformed: false });
    save(path.join(__dirname, 'build-verification.json'), verificationMetadata({ sourceCommit: commit, timestamp, release: signed, historicalCount: historical.length, authenticatedBaselineTransition, retainedReleaseProvenance: prepared.retainedReleaseProvenance }));
    save(path.join(__dirname, 'delivery.json'), delivery);
    process.stdout.write(JSON.stringify({ ok: true, deliveryDirectory: NEXT, releaseId: signed.releaseId,
        archiveSha256: signed.archiveSha256, publicKeySha256: signed.signingPublicKeySha256, operatorRecoveryPathAvailable: false }) + '\n');
}
module.exports = { BASE, R4, NEXT, WORK, REQUIRED_RECOVERY, HISTORICAL_RECOVERY, READINESS_TOOL, BACKENDS, METADATA, sourceEntries, historicalInventory, assertUnchangedApp, verifyBase, authenticateR4, transitionEvidence, assertBackendMetadata, retainedR7Evidence, assertHostChangeScope, prepareApp, prepareCandidatePayload, deliveryMetadata, verificationMetadata, main };
if (require.main === module) {
    try { main(); } catch (error) { process.stderr.write((/^[A-Z0-9_]+$/.test(error.code || error.message || '') ? error.code || error.message : 'R8_BUILD_FAILED') + '\n'); process.exitCode = 1; }
}
