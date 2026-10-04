'use strict';
// Manufacturer-only R7 candidate. No download, package install, target repair
// or publication. Historical R6 is authenticated before its app is reused.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const ROOT = path.resolve(__dirname, '../../..');
const bundle = require('../../../runtime/release/bundle.cjs');
const pid = require('../../../runtime/controller-profile/pid-state.cjs');
const { copyDirectory, preparePayload, componentRows, validatePayload } = require('../../../tools/system/build-bundle.cjs');
const { createTestArchive, verifyTestArchive, canonicalInventory } = require('../../../tools/integration/create-test-archive.cjs');
const { bindDerivative, appRows } = require('../../../tools/integration/bind-r7-derivative-sbom.cjs');
const { validateTransition } = require('../../../tools/system/recover-r4-first-start-to-r7.cjs');
const product = require('../../../runtime/product/scope.cjs');
const { componentTreeDigest } = require('../../../runtime/policy/admission.cjs');
const BASE = Object.freeze({ directory: 'delivery/test-pi-0.2.0-test.3-r6', archive: 'eos-0.2.0-test.3-linux-arm64.tar.gz',
    bytes: 97478929, sha256: '9975190781ce5d5843f38658de11d153119eb8c5e7cd781485af08342571f1ba',
    keySha256: '47b10989738f4fc6210ab634768cc5b07cc5c024d701f162cb3ec59009492ce3',
    releaseId: '80063204cfd1dad6dbd6b8b22462bd08deeee430c2b7c4ab0c6d316d4ac90a07' });
const R4 = Object.freeze({ directory: 'delivery/test-pi-0.2.0-test.3-r4', bytes: 88363976,
    sha256: 'c1d418a66b3678fb19f4487ece9871da81cf7a583af59a6d889c799d7c6dd1b3',
    keySha256: 'd35d09a005703eecf1b5a8843b553064c5ab90758cfc71a634599459cda6e8b3',
    releaseId: '15d65328b06e5d4d3a72b2ee440159aa36e07ce300d45888762519b66652ffa8' });
const NEXT = 'delivery/test-pi-0.2.0-test.3-r7';
const WORK = '.work/runtime-test3-r7-20261004';
const REQUIRED_RECOVERY = 'tools/system/recover-r4-first-start-to-r7.cjs';
const BACKENDS = Object.freeze([
    Object.freeze({ directory: 'store', package: '@nexowatt/eos-postgresql-store', files: ['index.cjs'] }),
    Object.freeze({ directory: 'db-objects-postgresql', package: '@iobroker/db-objects-postgresql', files: ['auth.cjs', 'facade.cjs', 'index.cjs', 'views.cjs'] }),
    Object.freeze({ directory: 'db-states-postgresql', package: '@iobroker/db-states-postgresql', files: ['index.cjs'] }),
]);
const METADATA = Object.freeze({ schemaVersion: 1, product: 'nexowatt-eos', releaseVersion: '0.2.0-test.3', sequence: 10,
    profile: 'test', nodeVersion: '24.21.0', platforms: ['linux-arm64'] });
const fail = code => { throw Object.assign(new Error(code), { code }); };
const save = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
function run(program, args, options = {}) {
    const result = cp.spawnSync(program, args, { cwd: ROOT, encoding: 'utf8', timeout: 180000,
        maxBuffer: 32 * 1024 * 1024, env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, ...options, shell: false });
    if (result.status !== 0 || result.error) fail('R7_BUILD_COMMAND_FAILED');
    return result.stdout.trim();
}
function sourceEntries() {
    return BACKENDS.flatMap(spec => {
        const source = 'runtime/postgresql/packages/' + spec.directory;
        // A new executable must be consciously added to this fixed mapping.
        const actual = bundle.inventory(path.join(ROOT, source)).filter(row => /\.(?:[cm]?js|ts)$/.test(row.path)).map(row => row.path).sort();
        if (JSON.stringify(actual) !== JSON.stringify([...spec.files].sort())) fail('R7_BACKEND_SOURCE_SCOPE');
        const pkg = JSON.parse(bundle.readFileLimited(path.join(ROOT, source, 'package.json')).bytes);
        if (pkg.name !== spec.package || pkg.version !== '0.1.0-dev.2' || pkg.main !== 'index.cjs') fail('R7_BACKEND_SOURCE_IDENTITY');
        return spec.files.map(file => ({ source: source + '/' + file, target: 'node_modules/' + spec.package + '/' + file }));
    }).sort((a, b) => a.target.localeCompare(b.target));
}
function assertOverlayDelta(before, after, bindings) {
    const original = new Map(before.map(row => [row.path, row])), changed = new Map(bindings.map(row => [row.target, row]));
    if (original.size !== before.length || changed.size !== bindings.length || new Set(after.map(row => row.path)).size !== after.length) fail('R7_OVERLAY_DUPLICATE');
    for (const row of after) {
        const prior = original.get(row.path), binding = changed.get(row.path);
        if (binding) {
            if (!prior || row.sha256 !== binding.sha256 || row.size !== binding.bytes || prior.sha256 !== binding.previousSha256) fail('R7_OVERLAY_BINDING');
            changed.delete(row.path);
        } else if (!prior || JSON.stringify(prior) !== JSON.stringify(row)) fail('R7_UNDECLARED_APP_CHANGE');
        original.delete(row.path);
    }
    if (original.size || changed.size) fail('R7_APP_FILE_REMOVAL_OR_MISSING_OVERLAY');
}
function verifyBase(baseDirectory) {
    const archive = path.join(baseDirectory, BASE.archive), key = bundle.readFileLimited(path.join(baseDirectory, 'release-public.pem'), 16384).bytes;
    const bytes = bundle.readFileLimited(archive, 100 * 1024 * 1024).bytes;
    if (bytes.length !== BASE.bytes || bundle.sha256(bytes) !== BASE.sha256 || bundle.sha256(key) !== BASE.keySha256) fail('R7_BASE_PINS');
    const checked = verifyTestArchive({ archivePath: archive, publicKey: key, expectedReleaseId: BASE.releaseId, platform: 'linux-arm64' });
    const delivery = JSON.parse(bundle.readFileLimited(path.join(baseDirectory, 'delivery.json'), 65536).bytes);
    if (checked.manifest.sequence !== 9 || checked.manifest.profile !== 'test' || checked.manifest.nodeVersion !== '24.21.0' ||
        delivery.deliveryRevision !== 6 || delivery.releaseSequence !== 9 || delivery.releaseId !== BASE.releaseId ||
        delivery.sha256 !== BASE.sha256 || delivery.signingPublicKeySha256 !== BASE.keySha256 || delivery.physicalControlEnabled !== false) fail('R7_BASE_SCOPE');
    return { archive, key, checked, delivery };
}
function authenticateR4(work) {
    const read = name => {
        const file = path.join(ROOT, R4.directory, name);
        return fs.existsSync(file) ? bundle.readFileLimited(file, 100 * 1024 * 1024).bytes :
            cp.execFileSync('git', ['show', 'HEAD:' + R4.directory + '/' + name], { cwd: ROOT, timeout: 30000, maxBuffer: 100 * 1024 * 1024 });
    };
    const bytes = read(BASE.archive), key = read('release-public.pem');
    if (bytes.length !== R4.bytes || bundle.sha256(bytes) !== R4.sha256 || bundle.sha256(key) !== R4.keySha256) fail('R7_R4_BASE_PINS');
    const archive = path.join(work, 'authenticated-r4.tar.gz'); fs.writeFileSync(archive, bytes, { flag: 'wx' });
    const checked = verifyTestArchive({ archivePath: archive, publicKey: key, expectedReleaseId: R4.releaseId, platform: 'linux-arm64' });
    const catalogBytes = cp.execFileSync('/usr/bin/python3', ['-I', '-B', '-c',
        'import sys,tarfile; t=tarfile.open(sys.argv[1],"r:gz"); sys.stdout.buffer.write(t.extractfile("bundle/payload/catalog.json").read())', archive],
        { cwd: ROOT, timeout: 30000, maxBuffer: 1024 * 1024 });
    if (bundle.sha256(catalogBytes) !== checked.manifest.files.find(row => row.path === 'catalog.json')?.sha256) fail('R7_R4_CATALOG_BINDING');
    return { ...checked, catalog: JSON.parse(catalogBytes) };
}
function transitionEvidence(previous, next) {
    validateTransition(previous, next, { expectedReleaseId: next.releaseId });
    if (previous.manifest.schemaVersion !== 1 || next.manifest.schemaVersion !== 1 ||
        previous.catalog.schemaVersion !== 1 || next.catalog.schemaVersion !== 1) fail('R7_TRANSITION_SCHEMA');
    const schema = previous.manifest.files.find(row => row.path === 'runtime/postgresql/schema.sql');
    if (!schema || schema.sha256 !== next.manifest.files.find(row => row.path === schema.path)?.sha256) fail('R7_TRANSITION_SCHEMA');
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
        if (JSON.stringify(source) !== JSON.stringify(installed)) fail('R7_BACKEND_DEPENDENCY_CHANGE');
    }
}
// Explicitly unsigned local preparation remains usable while fixes are being
// reviewed. Only main() signs, after checking a clean reviewed source commit.
function prepareApp({ baseDirectory, work, sourceCommit, timestamp }) {
    if (!/^[a-f0-9]{40}$/.test(sourceCommit || '') || !Number.isFinite(Date.parse(timestamp)) || !path.isAbsolute(work) || fs.existsSync(work)) fail('R7_PREPARE_INPUT');
    const base = verifyBase(baseDirectory);
    fs.mkdirSync(work, { mode: 0o700 });
    const extracted = path.join(work, 'r6');
    run('/usr/bin/python3', ['-I', '-B', 'tools/system/extract-test-bundle.py', '--archive', base.archive, '--destination', extracted, '--sha256', BASE.sha256]);
    const oldPayload = path.join(extracted, 'bundle/payload'), app = path.join(work, 'app');
    copyDirectory(path.join(oldPayload, 'app'), app);
    const before = appRows(base.checked.manifest), previous = new Map(before.map(row => [row.path, row])), bindings = [], coverage = [];
    const observed = () => bundle.inventory(app).map(({ path, size, sha256 }) => ({ path, size, sha256 }));
    if (JSON.stringify(before) !== JSON.stringify(observed())) fail('R7_BASE_APP_COPY');
    assertBackendMetadata(app);
    for (const entry of sourceEntries()) {
        const bytes = bundle.readFileLimited(path.join(ROOT, entry.source)).bytes, prior = previous.get(entry.target);
        if (!prior) fail('R7_BACKEND_FILE_MISSING');
        const row = { ...entry, bytes: bytes.length, sha256: bundle.sha256(bytes), previousSha256: prior.sha256 };
        coverage.push(row);
        if (row.sha256 === prior.sha256 && row.bytes === prior.size) continue;
        fs.writeFileSync(path.join(app, row.target), bytes); bindings.push(row);
    }
    const transformation = pid.applyToBuild(app);
    for (const row of transformation.files) {
        const bytes = bundle.readFileLimited(path.join(app, row.relativePath)).bytes;
        bindings.push({ source: 'runtime/controller-profile/pid-state.cjs', target: row.relativePath,
            transformation: transformation.kind, bytes: bytes.length, sha256: row.sha256, previousSha256: row.originalSha256 });
    }
    pid.verifyBuild(app);
    assertOverlayDelta(before, observed(), bindings);
    if (!bindings.some(row => row.target === 'node_modules/@iobroker/db-objects-postgresql/auth.cjs') ||
        !bindings.some(row => row.target === 'node_modules/@iobroker/db-objects-postgresql/index.cjs')) fail('R7_EXPECTED_POSTGRESQL_CHANGES');
    const previousSbomBytes = bundle.readFileLimited(path.join(oldPayload, 'sbom.cdx.json'), 16 * 1024 * 1024).bytes;
    if (bundle.sha256(previousSbomBytes) !== base.checked.manifest.files.find(row => row.path === 'sbom.cdx.json')?.sha256) fail('R7_BASE_SBOM_BINDING');
    const derivative = bindDerivative({ app, previousManifest: base.checked.manifest, previousSbom: JSON.parse(previousSbomBytes),
        previousReleaseId: BASE.releaseId, sourceCommit, timestamp });
    const sbomFile = path.join(work, 'runtime.cdx.json'); save(sbomFile, derivative.bom);
    const catalog = JSON.parse(bundle.readFileLimited(path.join(oldPayload, 'catalog.json')).bytes); catalog.catalogRevision = 6;
    const catalogFile = path.join(work, 'catalog.json'); save(catalogFile, catalog);
    product.inspectApp(app); product.assertCatalog(catalog);
    save(path.join(work, 'unsigned-app-verification.json'), { schemaVersion: 1, previousReleaseId: BASE.releaseId,
        previousSignatureVerified: true, sourceCommit, timestamp, signed: false, sourceTreeClean: run('git', ['status', '--porcelain', '--untracked-files=normal']) === '',
        appSourceCoverage: coverage.length, changedFiles: bindings.length, dependenciesUnchanged: true,
        nativeTargetExecutionPerformed: false, operatorRecoveryPathAvailable: false, productionReleaseApproved: false });
    return { ...base, app, oldPayload, before, bindings, coverage, transformation, previousSbomBytes, derivative, sbomFile, catalog, catalogFile };
}
function prepareCandidatePayload(prepared, payload) {
    pid.verifyBuild(prepared.app);
    const catalog = structuredClone(prepared.catalog);
    const files = preparePayload({ appDirectory: prepared.app, destination: payload, catalogFile: prepared.catalogFile, sbomFile: prepared.sbomFile });
    if (!files.some(row => row.path === REQUIRED_RECOVERY)) fail('R7_RECOVERY_NOT_PACKAGED');
    for (const entry of catalog.entries) entry.sha256 = componentTreeDigest(componentRows(files, entry.package));
    fs.writeFileSync(path.join(payload, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
    const finalFiles = bundle.inventory(payload);
    const protectedRows = rows => rows.filter(row => row.path.startsWith('system/') || row.path === 'runtime/postgresql/schema.sql');
    if (JSON.stringify(protectedRows(prepared.checked.manifest.files)) !== JSON.stringify(protectedRows(finalFiles))) fail('R7_HOST_MIGRATION_NOT_SUPPORTED');
    const checked = validatePayload(payload, { ...METADATA, files: finalFiles });
    pid.verifyBuild(path.join(payload, 'app'));
    for (const row of prepared.coverage) {
        const installed = finalFiles.find(file => file.path === 'app/' + row.target);
        const runtime = finalFiles.find(file => file.path === row.source);
        if (installed?.sha256 !== row.sha256 || installed?.size !== row.bytes || runtime?.sha256 !== row.sha256) fail('R7_POSTGRESQL_RUNTIME_APP_BINDING');
    }
    return { files: finalFiles, catalog, checked };
}
function deliveryMetadata({ previousDelivery, release, sourceCommit, installedComponents }) {
    return { ...previousDelivery, deliveryRevision: 7, releaseSequence: 10, releaseId: release.releaseId,
        signingPublicKeySha256: release.signingPublicKeySha256, sha256: release.archiveSha256, bytes: release.archiveBytes,
        signedFiles: release.manifest.files.length, installedComponents, archiveReadbackVerified: true,
        privateKeyPersisted: false, sourceCommit, sourceAssembly: 'authenticated-r6-app-with-bound-pid-and-postgresql-source-overlays',
        physicalControlEnabled: false, targetTestRequired: true, operatorRecoveryPathAvailable: false, productionReleaseApproved: false };
}
function verificationMetadata({ sourceCommit, timestamp, release, historicalCount, authenticatedBaselineTransition }) {
    return { schemaVersion: 1, sourceCommit, timestamp,
        host: process.platform + '-' + process.arch, buildNode: process.versions.node, targetNode: '24.21.0',
        releaseId: release.releaseId, archiveSha256: release.archiveSha256, archiveBytes: release.archiveBytes,
        signingPublicKeySha256: release.signingPublicKeySha256, deliveryRevision: 7, releaseSequence: 10,
        previousSignatureVerified: true, finalSignatureVerified: true, sourceBindingPassed: true, signedArchiveReadbackPassed: true,
        historicalDeliveryFilesUnchanged: historicalCount, exactOverlayDeltaChecked: true, postgresqlRuntimeAndAppIdentical: true,
        authenticatedBaselineTransition,
        nativeTargetExecutionPerformed: false, piUpdatePerformed: false, operatorRecoveryPathAvailable: false, hardwareTested: false, productionReleaseApproved: false };
}
function main(argv = process.argv.slice(2)) {
    if (process.platform !== 'linux' || Number(process.versions.node.split('.')[0]) !== 24 ||
        !(argv.length === 0 || argv.length === 2 && argv[0] === '--base-directory' && path.isAbsolute(argv[1]))) fail('R7_BUILD_HOST');
    const commit = run('git', ['rev-parse', 'HEAD']), timestamp = run('git', ['show', '-s', '--format=%cI', 'HEAD']);
    if (!/^[a-f0-9]{40}$/.test(commit) || run('git', ['status', '--porcelain', '--untracked-files=normal']) !== '') fail('R7_CLEAN_CHECKOUT_REQUIRED');
    const destination = path.join(ROOT, NEXT);
    if (fs.existsSync(destination)) fail('R7_IMMUTABLE_DESTINATION_EXISTS');
    const baseDirectory = argv[1] || path.join(ROOT, BASE.directory), historical = [];
    for (const directory of new Set([baseDirectory, path.join(ROOT, 'delivery')])) if (fs.existsSync(directory))
        for (const row of bundle.inventory(directory)) historical.push({ ...row, absolute: path.join(directory, row.path) });
    fs.mkdirSync(path.join(ROOT, '.work'), { recursive: true });
    const work = path.join(ROOT, WORK), prepared = prepareApp({ baseDirectory, work, sourceCommit: commit, timestamp });
    const payload = path.join(work, 'payload'), candidate = prepareCandidatePayload(prepared, payload);
    const draftManifest = bundle.validateManifest({ ...METADATA, files: canonicalInventory(candidate.files, METADATA, candidate.checked.architectureReports).files });
    const draft = { releaseId: bundle.sha256(Buffer.from(JSON.stringify(draftManifest) + '\n')), manifest: draftManifest, catalog: candidate.catalog };
    const r4 = authenticateR4(work), authenticatedBaselineTransition = transitionEvidence(r4, draft);
    const archive = path.join(work, BASE.archive), keyFile = path.join(work, 'release-public.pem');
    const signed = createTestArchive({ payloadDirectory: payload, archivePath: archive, publicKeyPath: keyFile, metadata: METADATA });
    if (signed.archiveBytes > 100 * 1024 * 1024) fail('R7_PUBLIC_ARCHIVE_LIMIT');
    const final = verifyTestArchive({ archivePath: archive, publicKey: bundle.readFileLimited(keyFile, 16384).bytes, expectedReleaseId: signed.releaseId, platform: 'linux-arm64' });
    if (JSON.stringify(authenticatedBaselineTransition) !== JSON.stringify(transitionEvidence(r4, { ...final, catalog: candidate.catalog }))) fail('R7_SIGNED_TRANSITION_CHANGED');
    assertOverlayDelta(prepared.before, appRows(final.manifest), prepared.bindings);
    const hostFiles = final.manifest.files.filter(row => ['runtime/', 'tools/', 'security/', 'system/'].some(prefix => row.path.startsWith(prefix))).map(row => {
        const bytes = bundle.readFileLimited(path.join(ROOT, row.path)).bytes;
        if (bundle.sha256(bytes) !== row.sha256 || bytes.length !== row.size) fail('R7_HOST_SOURCE_BINDING');
        return { source: row.path, target: row.path, bytes: row.size, sha256: row.sha256 };
    });
    for (const row of historical) {
        const bytes = bundle.readFileLimited(row.absolute, 128 * 1024 * 1024).bytes;
        if (bytes.length !== row.size || bundle.sha256(bytes) !== row.sha256) fail('R7_HISTORICAL_DELIVERY_CHANGED');
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
        overlays: prepared.bindings, sourceCoverage: prepared.coverage, pidTransformation: prepared.transformation, hostFiles, allMatched: true,
        unchangedAppContentReused: true, npmResolutionPerformed: false, sourceTranspilationPerformed: false });
    save(path.join(__dirname, 'build-verification.json'), verificationMetadata({ sourceCommit: commit, timestamp, release: signed, historicalCount: historical.length, authenticatedBaselineTransition }));
    save(path.join(__dirname, 'delivery.json'), delivery);
    process.stdout.write(JSON.stringify({ ok: true, deliveryDirectory: NEXT, releaseId: signed.releaseId,
        archiveSha256: signed.archiveSha256, publicKeySha256: signed.signingPublicKeySha256, operatorRecoveryPathAvailable: false }) + '\n');
}
module.exports = { BASE, R4, NEXT, WORK, REQUIRED_RECOVERY, BACKENDS, METADATA, sourceEntries, assertOverlayDelta, verifyBase, authenticateR4, transitionEvidence, assertBackendMetadata, prepareApp, prepareCandidatePayload, deliveryMetadata, verificationMetadata, main };
if (require.main === module) {
    try { main(); } catch (error) { process.stderr.write((/^[A-Z0-9_]+$/.test(error.code || error.message || '') ? error.code || error.message : 'R7_BUILD_FAILED') + '\n'); process.exitCode = 1; }
}
