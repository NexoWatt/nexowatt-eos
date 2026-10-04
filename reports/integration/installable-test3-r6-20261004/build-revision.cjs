'use strict';
// Offline R6 derivative. Verify immutable R5 before reuse; overlay only explicit
// current Admin/Backup package files. No install, transpile, registry or hooks.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const ROOT = path.resolve(__dirname, '../../..');
const bundle = require('../../../runtime/release/bundle.cjs');
const { copyDirectory, preparePayload, componentRows } = require('../../../tools/system/build-bundle.cjs');
const { createTestArchive, verifyTestArchive } = require('../../../tools/integration/create-test-archive.cjs');
const { bindDerivative, appRows } = require('../../../tools/integration/bind-r6-derivative-sbom.cjs');
const { validateTransition } = require('../../../tools/system/update-test-to-r6.cjs');
const product = require('../../../runtime/product/scope.cjs');
const { componentTreeDigest } = require('../../../runtime/policy/admission.cjs');
const BASE = Object.freeze({ directory: 'delivery/test-pi-0.2.0-test.3-r5', archive: 'eos-0.2.0-test.3-linux-arm64.tar.gz',
    bytes: 88366802, sha256: 'a2956eef2da94b4fd85dc218326e1bcbeeb57c833506ada1411378e624676695',
    keySha256: 'dc73b3399c8c3790051d86461588f4cd716cd44aec1b64f70aa121f0175ab082',
    releaseId: '6afb22793667514f76bbcceb785ba84b00757105577a9909c182f8fc41e45061' });
const R4 = Object.freeze({ directory: 'delivery/test-pi-0.2.0-test.3-r4', bytes: 88363976,
    sha256: 'c1d418a66b3678fb19f4487ece9871da81cf7a583af59a6d889c799d7c6dd1b3',
    keySha256: 'd35d09a005703eecf1b5a8843b553064c5ab90758cfc71a634599459cda6e8b3',
    releaseId: '15d65328b06e5d4d3a72b2ee440159aa36e07ce300d45888762519b66652ffa8' });
const NEXT = 'delivery/test-pi-0.2.0-test.3-r6';
const WORK = '.work/runtime-test3-r6-20261004';
const COMMONJS = Object.freeze(['eosSessionSecurity.js', 'eosLicenseCore.js', 'eosLicenseService.js', 'eosLicensePolicy.js']);
const ADMIN_ROOTS = Object.freeze(['src/', 'build/', 'src-admin/src/', 'src-admin/public/', 'adminWww/', 'admin/', 'public/', 'tools/', 'packages/eos-license-client/', 'test/']);
const ADMIN_FILES = Object.freeze(['NEXOWATT_EOS_PREBUILT_MANIFEST.json', 'package.json', 'package-lock.json', 'io-package.json', 'tasks.mts', 'tsconfig.json', 'tsconfig.build.json', 'src-admin/index.html']);
const BACKUP_FILES = Object.freeze(['package.json', 'io-package.json', 'release-manifest.json', 'scripts/validate-publish.cjs', 'build/lib/sdCard.js', 'build/lib/influxDbCli.js']);
const fail = code => { throw Object.assign(new Error(code), { code }); };
const save = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
function run(program, args, options = {}) {
    const result = cp.spawnSync(program, args, { cwd: ROOT, encoding: 'utf8', timeout: 180000,
        maxBuffer: 32 * 1024 * 1024, env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, ...options, shell: false });
    if (result.status !== 0 || result.error) fail('R6_BUILD_COMMAND_FAILED');
    return result.stdout.trim();
}
function backupPreparation() {
    const source = 'reports/integration/r6-backup-package-20261004/evidence.json';
    const bytes = bundle.readFileLimited(path.join(ROOT, source), 1024 * 1024).bytes;
    return { source, bytes: bytes.length, sha256: bundle.sha256(bytes), priorPreparationIncludedTranspilation: true,
        assemblyTranspilationPerformed: false, scope: 'Two prebuilt helpers recovered before assembly with pinned TypeScript; exact existing Backup manifest hashes restored.' };
}
function sourceTarget(source) {
    if (typeof source !== 'string' || source.includes('\\') || source.split('/').some(part => !part || part === '.' || part === '..')) fail('R6_SOURCE_PATH');
    if (source.startsWith('components/admin/')) {
        const relative = source.slice('components/admin/'.length);
        if (ADMIN_ROOTS.some(prefix => relative.startsWith(prefix)) || ADMIN_FILES.includes(relative))
            return 'node_modules/iobroker.eos-admin/' + relative;
    }
    if (source.startsWith('components/backitup/')) {
        const relative = source.slice('components/backitup/'.length);
        // Match the adapter's published npm file exclusions.
        if (BACKUP_FILES.includes(relative) || relative.startsWith('admin/') && !relative.endsWith('.map') && !relative.startsWith('admin/custom/')) return 'node_modules/iobroker.nexowatt-backup/' + relative;
    }
    return null;
}
function sourceEntries() {
    const names = run('git', ['ls-files', '-z', '--', 'components/admin', 'components/backitup']).split('\0').filter(Boolean);
    const entries = names.flatMap(source => { const target = sourceTarget(source); return target ? [{ source, target }] : []; });
    if (entries.length < 100 || entries.length > 10000 || new Set(entries.map(row => row.target)).size !== entries.length) fail('R6_SOURCE_SCOPE');
    for (const name of [...COMMONJS.map(file => 'build/lib/' + file), ...ADMIN_FILES])
        if (!entries.some(row => row.source === 'components/admin/' + name)) fail('R6_SOURCE_REQUIRED');
    for (const name of BACKUP_FILES) if (!entries.some(row => row.source === 'components/backitup/' + name)) fail('R6_BACKUP_SOURCE_REQUIRED');
    const seal = JSON.parse(bundle.readFileLimited(path.join(ROOT, 'components/admin/NEXOWATT_EOS_PREBUILT_MANIFEST.json')).bytes);
    if (seal.algorithm !== 'sha256' || seal.package !== 'iobroker.eos-admin' || seal.version !== '7.10.11' || Object.keys(seal.files).length !== seal.fileCount) fail('R6_ADMIN_SOURCE_SEAL');
    for (const [relative, hash] of Object.entries(seal.files)) {
        const source = 'components/admin/' + relative;
        if (!entries.some(row => row.source === source) || bundle.sha256(bundle.readFileLimited(path.join(ROOT, source)).bytes) !== hash) fail('R6_ADMIN_SOURCE_SEAL');
    }
    return entries.sort((a, b) => a.source < b.source ? -1 : a.source > b.source ? 1 : 0);
}
function assertOverlayDelta(before, after, bindings) {
    const original = new Map(before.map(row => [row.path, row])), changed = new Map(bindings.map(row => [row.target, row]));
    if (original.size !== before.length || changed.size !== bindings.length) fail('R6_OVERLAY_DUPLICATE');
    for (const row of after) {
        const prior = original.get(row.path), binding = changed.get(row.path);
        if (binding) {
            if (row.sha256 !== binding.sha256 || row.size !== binding.bytes || (prior?.sha256 || null) !== binding.previousSha256) fail('R6_OVERLAY_BINDING');
            changed.delete(row.path);
        } else if (!prior || JSON.stringify(prior) !== JSON.stringify(row)) fail('R6_UNDECLARED_APP_CHANGE');
        original.delete(row.path);
    }
    if (original.size || changed.size) fail('R6_APP_FILE_REMOVAL_OR_MISSING_OVERLAY');
}
function verifyBase(baseDirectory) {
    const archive = path.join(baseDirectory, BASE.archive), key = bundle.readFileLimited(path.join(baseDirectory, 'release-public.pem'), 16384).bytes;
    const bytes = bundle.readFileLimited(archive, 100 * 1024 * 1024).bytes;
    if (bytes.length !== BASE.bytes || bundle.sha256(bytes) !== BASE.sha256 || bundle.sha256(key) !== BASE.keySha256) fail('R6_BASE_PINS');
    const checked = verifyTestArchive({ archivePath: archive, publicKey: key, expectedReleaseId: BASE.releaseId, platform: 'linux-arm64' });
    const delivery = JSON.parse(bundle.readFileLimited(path.join(baseDirectory, 'delivery.json'), 65536).bytes);
    if (checked.manifest.sequence !== 8 || checked.manifest.profile !== 'test' || checked.manifest.nodeVersion !== '24.21.0' ||
        delivery.deliveryRevision !== 5 || delivery.releaseSequence !== 8 || delivery.releaseId !== BASE.releaseId ||
        delivery.sha256 !== BASE.sha256 || delivery.signingPublicKeySha256 !== BASE.keySha256) fail('R6_BASE_SCOPE');
    return { archive, key, checked, delivery };
}
function authenticateR4(work) {
    const read = name => {
        const file = path.join(ROOT, R4.directory, name);
        return fs.existsSync(file) ? bundle.readFileLimited(file, 100 * 1024 * 1024).bytes :
            cp.execFileSync('git', ['show', 'HEAD:' + R4.directory + '/' + name], { cwd: ROOT, timeout: 30000, maxBuffer: 100 * 1024 * 1024 });
    };
    const bytes = read(BASE.archive), key = read('release-public.pem');
    if (bytes.length !== R4.bytes || bundle.sha256(bytes) !== R4.sha256 || bundle.sha256(key) !== R4.keySha256) fail('R6_R4_BASE_PINS');
    const archive = path.join(work, 'authenticated-r4.tar.gz'); fs.writeFileSync(archive, bytes, { flag: 'wx' });
    const checked = verifyTestArchive({ archivePath: archive, publicKey: key, expectedReleaseId: R4.releaseId, platform: 'linux-arm64' });
    // Read only catalog data after authenticating every archive member; no
    // historical or candidate program is executed.
    const catalogBytes = cp.execFileSync('/usr/bin/python3', ['-I', '-B', '-c',
        'import sys,tarfile; t=tarfile.open(sys.argv[1],"r:gz"); sys.stdout.buffer.write(t.extractfile("bundle/payload/catalog.json").read())', archive],
        { cwd: ROOT, timeout: 30000, maxBuffer: 1024 * 1024 });
    if (bundle.sha256(catalogBytes) !== checked.manifest.files.find(row => row.path === 'catalog.json')?.sha256) fail('R6_R4_CATALOG_BINDING');
    return { ...checked, catalog: JSON.parse(catalogBytes) };
}
// Exported for a local, explicitly unsigned assembly check before the clean final
// commit. Only main() signs/publishes files; it always requires a clean checkout.
function prepareApp({ baseDirectory, work, sourceCommit, timestamp }) {
    if (!/^[a-f0-9]{40}$/.test(sourceCommit || '') || !Number.isFinite(Date.parse(timestamp)) || !path.isAbsolute(work) || fs.existsSync(work)) fail('R6_PREPARE_INPUT');
    const base = verifyBase(baseDirectory);
    fs.mkdirSync(work, { mode: 0o700 });
    const extracted = path.join(work, 'r5');
    run('/usr/bin/python3', ['-I', '-B', 'tools/system/extract-test-bundle.py', '--archive', base.archive, '--destination', extracted, '--sha256', BASE.sha256]);
    const oldPayload = path.join(extracted, 'bundle/payload'), app = path.join(work, 'app');
    copyDirectory(path.join(oldPayload, 'app'), app);
    const before = appRows(base.checked.manifest), previous = new Map(before.map(row => [row.path, row])), bindings = [], coverage = [];
    const observed = () => bundle.inventory(app).map(({ path, size, sha256 }) => ({ path, size, sha256 }));
    if (JSON.stringify(before) !== JSON.stringify(observed())) fail('R6_BASE_APP_COPY');
    for (const entry of sourceEntries()) {
        const bytes = bundle.readFileLimited(path.join(ROOT, entry.source)).bytes;
        const row = { ...entry, bytes: bytes.length, sha256: bundle.sha256(bytes), previousSha256: previous.get(entry.target)?.sha256 || null };
        const relative = entry.source.slice('components/admin/'.length);
        if (COMMONJS.some(name => relative === 'build/lib/' + name)) {
            row.plainCommonJsSource = 'components/admin/src/lib/' + path.basename(relative);
            if (!bundle.readFileLimited(path.join(ROOT, row.plainCommonJsSource)).bytes.equals(bytes) || bytes.toString().includes('sourceMappingURL=')) fail('R6_COMMONJS_SOURCE_PARITY');
        }
        coverage.push(row);
        if (row.sha256 === row.previousSha256 && previous.get(entry.target).size === bytes.length) continue;
        if (/(?:^|\/)(?:package|package-lock)\.json$/.test(entry.target) && !(entry.target === 'node_modules/iobroker.eos-admin/package-lock.json' && row.previousSha256 === null)) fail('R6_PACKAGE_METADATA_CHANGE');
        fs.mkdirSync(path.dirname(path.join(app, row.target)), { recursive: true });
        fs.writeFileSync(path.join(app, row.target), bytes, { mode: 0o644 }); bindings.push(row);
    }
    assertOverlayDelta(before, observed(), bindings);
    if (!bindings.some(row => row.target.startsWith('node_modules/iobroker.eos-admin/')) ||
        !bindings.some(row => row.target.startsWith('node_modules/iobroker.nexowatt-backup/'))) fail('R6_EXPECTED_PRODUCT_CHANGES');
    const adminSelftest = run(process.execPath, [path.join(app, 'node_modules/iobroker.eos-admin/tools/nexowatt-prebuilt-release-selftest.cjs')]);
    const backupSelftest = run(process.execPath, [path.join(app, 'node_modules/iobroker.nexowatt-backup/scripts/validate-publish.cjs')]);
    assertOverlayDelta(before, observed(), bindings);
    const previousSbomBytes = bundle.readFileLimited(path.join(oldPayload, 'sbom.cdx.json'), 16 * 1024 * 1024).bytes;
    if (bundle.sha256(previousSbomBytes) !== base.checked.manifest.files.find(row => row.path === 'sbom.cdx.json')?.sha256) fail('R6_BASE_SBOM_BINDING');
    const derivative = bindDerivative({ app, previousManifest: base.checked.manifest, previousSbom: JSON.parse(previousSbomBytes),
        previousReleaseId: BASE.releaseId, sourceCommit, timestamp });
    const sbomFile = path.join(work, 'runtime.cdx.json'); save(sbomFile, derivative.bom);
    const catalog = JSON.parse(bundle.readFileLimited(path.join(oldPayload, 'catalog.json')).bytes); catalog.catalogRevision = 5;
    const catalogFile = path.join(work, 'catalog.json'); save(catalogFile, catalog);
    product.inspectApp(app); product.assertCatalog(catalog);
    save(path.join(work, 'unsigned-app-verification.json'), { schemaVersion: 1, previousReleaseId: BASE.releaseId,
        previousSignatureVerified: true, sourceCommit, timestamp, signed: false, sourceTreeClean: run('git', ['status', '--porcelain', '--untracked-files=normal']) === '', appSourceCoverage: coverage.length,
        changedFiles: bindings.length, dependenciesUnchanged: true, nativeTargetExecutionPerformed: false, productionReleaseApproved: false });
    return { ...base, app, oldPayload, before, bindings, coverage, adminSelftest, backupSelftest, previousSbomBytes, derivative, sbomFile, catalog, catalogFile };
}
function main(argv = process.argv.slice(2)) {
    if (process.platform !== 'linux' || Number(process.versions.node.split('.')[0]) !== 24 ||
        !(argv.length === 0 || argv.length === 2 && argv[0] === '--base-directory' && path.isAbsolute(argv[1]))) fail('R6_BUILD_HOST');
    const commit = run('git', ['rev-parse', 'HEAD']), timestamp = run('git', ['show', '-s', '--format=%cI', 'HEAD']);
    if (!/^[a-f0-9]{40}$/.test(commit) || run('git', ['status', '--porcelain', '--untracked-files=normal']) !== '') fail('R6_CLEAN_CHECKOUT_REQUIRED');
    const destination = path.join(ROOT, NEXT);
    if (fs.existsSync(destination)) fail('R6_IMMUTABLE_DESTINATION_EXISTS');
    const baseDirectory = argv[1] || path.join(ROOT, BASE.directory), historical = [];
    for (const directory of new Set([baseDirectory, path.join(ROOT, 'delivery')])) if (fs.existsSync(directory))
        for (const row of bundle.inventory(directory)) historical.push({ ...row, absolute: path.join(directory, row.path) });
    const workParent = path.join(ROOT, '.work'); fs.mkdirSync(workParent, { recursive: true });
    const work = path.join(ROOT, WORK), prepared = prepareApp({ baseDirectory, work, sourceCommit: commit, timestamp });
    const { app, before, bindings, coverage, catalog, catalogFile, sbomFile } = prepared;
    const payload = path.join(work, 'payload');
    const files = preparePayload({ appDirectory: app, destination: payload, catalogFile, sbomFile });
    if (!files.some(row => row.path === 'tools/system/update-test-to-r6.cjs')) fail('R6_UPDATER_NOT_PACKAGED');
    for (const entry of catalog.entries) entry.sha256 = componentTreeDigest(componentRows(files, entry.package));
    fs.writeFileSync(path.join(payload, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
    const metadata = { schemaVersion: 1, product: 'nexowatt-eos', releaseVersion: '0.2.0-test.3', sequence: 9,
        profile: 'test', nodeVersion: '24.21.0', platforms: ['linux-arm64'] };
    const archive = path.join(work, BASE.archive), keyFile = path.join(work, 'release-public.pem');
    const signed = createTestArchive({ payloadDirectory: payload, archivePath: archive, publicKeyPath: keyFile, metadata });
    if (signed.archiveBytes > 100 * 1024 * 1024) fail('R6_PUBLIC_ARCHIVE_LIMIT');
    const key = bundle.readFileLimited(keyFile, 16384).bytes;
    const final = verifyTestArchive({ archivePath: archive, publicKey: key, expectedReleaseId: signed.releaseId, platform: 'linux-arm64' });
    assertOverlayDelta(before, appRows(final.manifest), bindings);
    const hostProtected = rows => rows.filter(row => row.path.startsWith('system/') || row.path === 'runtime/postgresql/schema.sql');
    if (JSON.stringify(hostProtected(prepared.checked.manifest.files)) !== JSON.stringify(hostProtected(final.manifest.files))) fail('R6_HOST_MIGRATION_NOT_SUPPORTED');
    const sourceBindings = final.manifest.files.filter(row => ['runtime/', 'tools/', 'security/', 'system/'].some(prefix => row.path.startsWith(prefix))).map(row => {
        const bytes = bundle.readFileLimited(path.join(ROOT, row.path)).bytes;
        if (bundle.sha256(bytes) !== row.sha256 || bytes.length !== row.size) fail('R6_HOST_SOURCE_BINDING');
        return { source: row.path, target: row.path, bytes: row.size, sha256: row.sha256 };
    });
    for (const row of coverage) if (final.manifest.files.find(file => file.path === 'app/' + row.target)?.sha256 !== row.sha256) fail('R6_ASSET_SOURCE_BINDING');
    const r4 = authenticateR4(work), transitionTarget = { ...final, catalog };
    const transitions = [r4, { ...prepared.checked, catalog: JSON.parse(bundle.readFileLimited(path.join(prepared.oldPayload, 'catalog.json')).bytes) }].map(previous => {
        validateTransition(previous, transitionTarget, { expectedReleaseId: final.releaseId });
        return { previousReleaseId: previous.releaseId, previousSequence: previous.manifest.sequence,
            targetReleaseId: final.releaseId, targetSequence: final.manifest.sequence, passed: true, previousSignatureVerified: true };
    });
    const delivery = { ...prepared.delivery, deliveryRevision: 6, releaseSequence: 9, releaseId: signed.releaseId,
        signingPublicKeySha256: signed.signingPublicKeySha256, sha256: signed.archiveSha256, bytes: signed.archiveBytes,
        signedFiles: signed.manifest.files.length, installedComponents: product.inspectApp(app), archiveReadbackVerified: true,
        privateKeyPersisted: false, sourceCommit: commit, sourceAssembly: 'authenticated-r5-app-with-bound-admin-backup-source-overlays',
        physicalControlEnabled: false, targetTestRequired: true, productionReleaseApproved: false };
    fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.mkdirSync(destination);
    for (const [source, name] of [[archive, BASE.archive], [keyFile, 'release-public.pem']]) fs.copyFileSync(source, path.join(destination, name), fs.constants.COPYFILE_EXCL);
    save(path.join(destination, 'delivery.json'), delivery);
    fs.writeFileSync(path.join(destination, 'bundle.sha256'), `${signed.archiveSha256}  ${BASE.archive}\n${signed.signingPublicKeySha256}  release-public.pem\n`, { flag: 'wx' });
    for (const row of historical) {
        const bytes = bundle.readFileLimited(row.absolute, 128 * 1024 * 1024).bytes;
        if (bytes.length !== row.size || bundle.sha256(bytes) !== row.sha256) fail('R6_HISTORICAL_DELIVERY_CHANGED');
    }
    fs.writeFileSync(path.join(__dirname, 'assembled-admin-prebuilt.txt'), prepared.adminSelftest + '\n', { flag: 'wx' });
    fs.writeFileSync(path.join(__dirname, 'assembled-backup-package.txt'), prepared.backupSelftest + '\n', { flag: 'wx' });
    save(path.join(__dirname, 'runtime.cdx.json'), prepared.derivative.bom);
    save(path.join(__dirname, 'runtime-derivative-sbom.json'), { ...prepared.derivative.evidence,
        previousSbomExactBytesSha256: bundle.sha256(prepared.previousSbomBytes), deliveredSbomSha256: final.manifest.files.find(row => row.path === 'sbom.cdx.json').sha256 });
    save(path.join(__dirname, 'signed-source-binding.json'), { schemaVersion: 1, sourceCommit: commit, releaseId: signed.releaseId,
        archiveSha256: signed.archiveSha256, signingPublicKeySha256: signed.signingPublicKeySha256, previousReleaseId: BASE.releaseId,
        overlays: bindings.map(row => ({ ...row, target: 'app/' + row.target })), sourceCoverage: coverage.map(row => ({ ...row, target: 'app/' + row.target })),
        hostFiles: sourceBindings, allMatched: true, unchangedAppContentReused: true,
        npmResolutionPerformed: false, sourceTranspilationPerformed: false,
        sourceTranspilationScope: 'This derivative assembly only; prebuilt helper preparation is reported separately.', backupPreparation: backupPreparation() });
    save(path.join(__dirname, 'build-verification.json'), { schemaVersion: 1, sourceCommit: commit, timestamp,
        host: process.platform + '-' + process.arch, buildNode: process.versions.node, targetNode: '24.21.0',
        releaseId: signed.releaseId, archiveSha256: signed.archiveSha256, archiveBytes: signed.archiveBytes,
        signingPublicKeySha256: signed.signingPublicKeySha256, deliveryRevision: 6, releaseSequence: 9,
        previousSignatureVerified: true, finalSignatureVerified: true, sourceBindingPassed: true, signedArchiveReadbackPassed: true,
        historicalDeliveryFilesUnchanged: historical.length, exactOverlayDeltaChecked: true,
        assembledAdminPrebuiltPassed: true, assembledBackupPackagePassed: true, authenticatedBaselineTransitions: transitions,
        nativeTargetExecutionPerformed: false, piUpdatePerformed: false, hardwareTested: false, productionReleaseApproved: false });
    save(path.join(__dirname, 'delivery.json'), delivery);
    process.stdout.write(JSON.stringify({ ok: true, deliveryDirectory: NEXT, releaseId: signed.releaseId,
        archiveSha256: signed.archiveSha256, publicKeySha256: signed.signingPublicKeySha256 }) + '\n');
}
module.exports = { BASE, R4, authenticateR4, NEXT, WORK, COMMONJS, ADMIN_ROOTS, ADMIN_FILES, BACKUP_FILES, backupPreparation, sourceTarget, sourceEntries, assertOverlayDelta, verifyBase, prepareApp, main };
if (require.main === module) {
    try { main(); } catch (error) { process.stderr.write((/^[A-Z0-9_]+$/.test(error.code || error.message || '') ? error.code || error.message : 'R6_BUILD_FAILED') + '\n'); process.exitCode = 1; }
}
