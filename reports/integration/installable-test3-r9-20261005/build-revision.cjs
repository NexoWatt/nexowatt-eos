'use strict';
// Manufacturer-only R9 derivative of authentic R8. Package file tables are
// collected without hooks/network; source files must already be reviewed builds.
// Third-party files, root dependency lock and execution admission stay unchanged.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const ROOT = path.resolve(__dirname, '../../..');
const bundle = require('../../../runtime/release/bundle.cjs');
const { copyDirectory, preparePayload, componentRows, validatePayload } = require('../../../tools/system/build-bundle.cjs');
const { createTestArchive, verifyTestArchive, canonicalInventory } = require('../../../tools/integration/create-test-archive.cjs');
const { historicalInventory } = require('../installable-test3-r8-20261004/build-revision.cjs');
const product = require('../../../runtime/product/scope.cjs');
const { componentTreeDigest } = require('../../../runtime/policy/admission.cjs');
const BASE = Object.freeze({ directory: 'delivery/test-pi-0.2.0-test.3-r8', archive: 'eos-0.2.0-test.3-linux-arm64.tar.gz',
    bytes: 97504932, sha256: 'b7c38754cd572cb42462d525337a417d436f31dbf4d149bb9708187881e6c5d3',
    keySha256: 'bc104daef9346ef31fe7b51d447bc8d3c5103aa5e6cf532e7a83ea17551280c5',
    releaseId: 'eb3d1747c35988bdf8785e7a5cdfc786ab356fa87149054767d7c0ed211b7ea7',
    deliverySha256: 'f3c28047f144b706841879d5703df753dd5eb3afe51ddd9200a6e19759a1564a' });
const NEXT = 'delivery/test-pi-0.2.0-test.3-r9';
const WORK = '.work/runtime-test3-r9-20261005';
const REPORT = 'reports/integration/installable-test3-r9-20261005';
const REQUIRED_UPDATER = 'tools/system/update-test-to-r9.cjs';
const METADATA = Object.freeze({ schemaVersion: 1, product: 'nexowatt-eos', releaseVersion: '0.2.0-test.3', sequence: 12,
    profile: 'test', nodeVersion: '24.21.0', platforms: ['linux-arm64'] });
const SPECS = Object.freeze(product.SPECS.filter(spec => spec.source));
const fail = code => { throw Object.assign(new Error(code), { code }); };
const save = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const sorted = rows => rows.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
const appRows = manifest => manifest.files.filter(row => row.path.startsWith('app/')).map(row => ({ ...row, path: row.path.slice(4) }));
function run(program, args, options = {}) {
    const result = cp.spawnSync(program, args, { cwd: ROOT, encoding: 'utf8', timeout: 180000, maxBuffer: 64 * 1024 * 1024,
        env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, ...options, shell: false });
    if (result.status !== 0 || result.error) fail('R9_BUILD_COMMAND_FAILED');
    return result.stdout.trim();
}
function sourceFile(root, relative) {
    bundle.safeRelative(relative);
    const file = path.join(root, relative);
    if (fs.realpathSync(file) !== file) fail('R9_SOURCE_LINK');
    const st = fs.lstatSync(file);
    if (!st.isFile() || st.nlink !== 1 || st.mode & 0o7000) fail('R9_SOURCE_FILE');
    return { file, bytes: bundle.readFileLimited(file).bytes, mode: st.mode & 0o111 ? 0o755 : 0o644 };
}
function validatePackTable(spec, result, root = ROOT) {
    if (!Array.isArray(result) || result.length !== 1 || result[0].name !== spec.package || result[0].version !== spec.version ||
        !Array.isArray(result[0].files) || result[0].files.length < 3 || result[0].files.length > 15000) fail('R9_PACKAGE_TABLE');
    const entries = [], seen = new Set();
    for (const row of result[0].files) {
        if (!row || typeof row.path !== 'string' || seen.has(row.path) || row.path.split('/').includes('node_modules')) fail('R9_PACKAGE_PATH');
        bundle.safeRelative(row.path); seen.add(row.path);
        const source = 'components/' + spec.source + '/' + row.path;
        const actual = sourceFile(root, source);
        const mode = row.mode & 0o111 ? 0o755 : 0o644;
        if (!Number.isSafeInteger(row.size) || row.size !== actual.bytes.length || ![0o644, 0o755].includes(row.mode) || mode !== actual.mode) fail('R9_PACKAGE_TABLE_DRIFT');
        entries.push({ source, target: 'node_modules/' + spec.package + '/' + row.path, bytes: actual.bytes.length, sha256: bundle.sha256(actual.bytes), mode });
    }
    const clientPath = spec.source === 'devices' ? 'lib/eos-license-client/' : 'packages/eos-license-client/';
    for (const relative of ['package.json', 'io-package.json', spec.main, ...['index.js', 'eos-platform.js', 'package.json'].map(name => clientPath + name)])
        if (!seen.has(relative)) fail('R9_PACKAGE_REQUIRED_FILE');
    return entries.sort((a, b) => a.target.localeCompare(b.target));
}
function sourceEntries() {
    const entries = SPECS.flatMap(spec => validatePackTable(spec,
        JSON.parse(run('npm', ['pack', '--dry-run', '--json', '--ignore-scripts', '--offline'], { cwd: path.join(ROOT, 'components', spec.source) }))));
    if (new Set(entries.map(row => row.target)).size !== entries.length) fail('R9_PACKAGE_DUPLICATE');
    return entries.sort((a, b) => a.target.localeCompare(b.target));
}
function ownSourcePath(name) {
    if (typeof name !== 'string' || name.includes('\\') || name.split('/').some(part => !part || part === '.' || part === '..')) return false;
    const spec = SPECS.find(item => name.startsWith('node_modules/' + item.package + '/'));
    if (!spec) return false;
    const relative = name.slice(('node_modules/' + spec.package + '/').length);
    return !relative.split('/').includes('node_modules');
}
function assertOverlayDelta(before, after, bindings) {
    const previous = new Map(before.map(row => [row.path, row])), current = new Map(after.map(row => [row.path, row]));
    const declared = new Map(bindings.map(row => [row.target, row]));
    if (previous.size !== before.length || current.size !== after.length || declared.size !== bindings.length) fail('R9_OVERLAY_DUPLICATE');
    for (const name of new Set([...previous.keys(), ...current.keys()])) {
        const old = previous.get(name) || null, next = current.get(name) || null, delta = declared.get(name);
        if (JSON.stringify(old) === JSON.stringify(next)) { if (delta) fail('R9_REDUNDANT_OVERLAY'); continue; }
        if (!ownSourcePath(name) || !delta || JSON.stringify(delta.before) !== JSON.stringify(old) || JSON.stringify(delta.after) !== JSON.stringify(next)) fail('R9_UNDECLARED_APP_CHANGE');
        declared.delete(name);
    }
    if (declared.size) fail('R9_OVERLAY_MISSING');
}
function overlaySource(app, before, entries, root = ROOT) {
    const wanted = new Map(entries.map(row => [row.target, row]));
    if (wanted.size !== entries.length || entries.some(row => !ownSourcePath(row.target))) fail('R9_SOURCE_SCOPE');
    // Only files owned directly by these six source packages can be removed.
    // Installed nested dependencies are never inferred from the npm pack table.
    for (const row of before) if (ownSourcePath(row.path) && !wanted.has(row.path)) fs.unlinkSync(path.join(app, row.path));
    for (const row of entries) {
        const source = sourceFile(root, row.source);
        if (source.bytes.length !== row.bytes || bundle.sha256(source.bytes) !== row.sha256 || source.mode !== row.mode) fail('R9_SOURCE_CHANGED');
        const target = path.join(app, row.target);
        fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, source.bytes); fs.chmodSync(target, row.mode);
    }
    const after = bundle.inventory(app);
    const oldRows = new Map(before.map(row => [row.path, row])), newRows = new Map(after.map(row => [row.path, row]));
    const bindings = [...new Set([...oldRows.keys(), ...newRows.keys()])].sort().flatMap(target => {
        const a = oldRows.get(target) || null, b = newRows.get(target) || null;
        return JSON.stringify(a) === JSON.stringify(b) ? [] : [{ target, source: wanted.get(target)?.source || null, before: a, after: b }];
    });
    assertOverlayDelta(before, after, bindings); return { after, bindings };
}
function verifyBase(baseDirectory) {
    const archive = path.join(baseDirectory, BASE.archive), key = bundle.readFileLimited(path.join(baseDirectory, 'release-public.pem'), 16384).bytes;
    const bytes = bundle.readFileLimited(archive, 100 * 1024 * 1024).bytes;
    const deliveryBytes = bundle.readFileLimited(path.join(baseDirectory, 'delivery.json'), 65536).bytes;
    if (bytes.length !== BASE.bytes || bundle.sha256(bytes) !== BASE.sha256 || bundle.sha256(key) !== BASE.keySha256 || bundle.sha256(deliveryBytes) !== BASE.deliverySha256) fail('R9_BASE_PINS');
    const checked = verifyTestArchive({ archivePath: archive, publicKey: key, expectedReleaseId: BASE.releaseId, platform: 'linux-arm64' });
    const delivery = JSON.parse(deliveryBytes);
    if (checked.manifest.sequence !== 11 || checked.manifest.nodeVersion !== METADATA.nodeVersion || checked.manifest.profile !== 'test' ||
        delivery.deliveryRevision !== 8 || delivery.releaseId !== BASE.releaseId || delivery.physicalControlEnabled !== false) fail('R9_BASE_SCOPE');
    return { archive, key, checked, delivery };
}
function verifyPrebuilt(entries) {
    const mapped = new Map(entries.map(row => [row.source, row]));
    const seal = JSON.parse(bundle.readFileLimited(path.join(ROOT, 'components/admin/NEXOWATT_EOS_PREBUILT_MANIFEST.json')).bytes);
    if (seal.algorithm !== 'sha256' || seal.package !== 'iobroker.eos-admin' || seal.version !== '7.10.11' || seal.fileCount !== Object.keys(seal.files).length) fail('R9_ADMIN_PREBUILT');
    for (const [file, hash] of Object.entries(seal.files)) {
        const source = sourceFile(ROOT, 'components/admin/' + file);
        if (bundle.sha256(source.bytes) !== hash) fail('R9_ADMIN_PREBUILT');
        const row = mapped.get('components/admin/' + file); if (row && row.sha256 !== hash) fail('R9_ADMIN_PREBUILT');
    }
    // These checks do not rebuild or reseal the independent historical UI release.
    run(process.execPath, ['scripts/build-ts-runtime-executables.js', '--check'], { cwd: path.join(ROOT, 'components/ui') });
    const client = bundle.readFileLimited(path.join(ROOT, 'components/admin/packages/eos-license-client/index.js')).bytes;
    for (const spec of SPECS) {
        const directory = spec.source === 'devices' ? 'lib/eos-license-client' : 'packages/eos-license-client';
        for (const name of ['index.js', 'eos-platform.js', 'package.json']) {
            const actual = bundle.readFileLimited(path.join(ROOT, 'components', spec.source, directory, name)).bytes;
            const canonical = name === 'index.js' ? client : bundle.readFileLimited(path.join(ROOT, 'components/admin/packages/eos-license-client', name)).bytes;
            if (!actual.equals(canonical)) fail('R9_LICENSE_CLIENT_PARITY');
        }
    }
    return { adminManifestVerified: true, uiRuntimeSourceParityVerified: true, sixCentralClientsIdentical: true, sourceTranspilationPerformed: false };
}
function prepareApp({ baseDirectory, work, sourceCommit, timestamp }) {
    if (!/^[a-f0-9]{40}$/.test(sourceCommit || '') || !Number.isFinite(Date.parse(timestamp)) || !path.isAbsolute(work) || fs.existsSync(work)) fail('R9_PREPARE_INPUT');
    const base = verifyBase(baseDirectory), coverage = sourceEntries(), prebuilt = verifyPrebuilt(coverage);
    fs.mkdirSync(work, { mode: 0o700 });
    run('/usr/bin/python3', ['-I', '-B', 'tools/system/extract-test-bundle.py', '--archive', base.archive, '--destination', path.join(work, 'r8'), '--sha256', BASE.sha256]);
    const oldPayload = path.join(work, 'r8/bundle/payload'), previousApp = path.join(oldPayload, 'app'), app = path.join(work, 'app');
    copyDirectory(previousApp, app);
    const before = appRows(base.checked.manifest);
    if (JSON.stringify(before) !== JSON.stringify(bundle.inventory(app))) fail('R9_BASE_COPY');
    const { bindings } = overlaySource(app, before, coverage);
    if (!bindings.length) fail('R9_EMPTY_DERIVATIVE');
    const previousSbomBytes = bundle.readFileLimited(path.join(oldPayload, 'sbom.cdx.json'), 16 * 1024 * 1024).bytes;
    if (bundle.sha256(previousSbomBytes) !== base.checked.manifest.files.find(row => row.path === 'sbom.cdx.json')?.sha256) fail('R9_BASE_SBOM_BINDING');
    const sbom = require('../../../tools/integration/bind-r9-derivative-sbom.cjs');
    const pin = sbom.R8_EEBUS_SOURCE_LOCK;
    const previousEebusSourceLock = cp.execFileSync('git', ['show', pin.sourceCommit + ':' + pin.path], { cwd: ROOT, timeout: 30000, maxBuffer: 16 * 1024 * 1024 });
    const derivative = sbom.bindDerivative({ app, previousApp, previousManifest: base.checked.manifest,
        previousSbom: JSON.parse(previousSbomBytes), previousReleaseId: BASE.releaseId, sourceCommit, timestamp, previousEebusSourceLock });
    const sbomFile = path.join(work, 'runtime.cdx.json'); save(sbomFile, derivative.bom);
    const catalog = JSON.parse(bundle.readFileLimited(path.join(oldPayload, 'catalog.json')).bytes); catalog.catalogRevision = 8;
    product.inspectApp(app); product.assertCatalog(catalog);
    const catalogFile = path.join(work, 'catalog.json'); save(catalogFile, catalog);
    save(path.join(work, 'unsigned-app-verification.json'), { schemaVersion: 1, previousReleaseId: BASE.releaseId, sourceCommit, timestamp,
        previousSignatureVerified: true, signed: false, sourceTreeClean: run('git', ['status', '--porcelain', '--untracked-files=normal']) === '',
        changedFiles: bindings.length, deletedFiles: bindings.filter(row => !row.after).length, appSourceCoverage: coverage.length,
        dependenciesUnchanged: true, prebuilt, nativeTargetExecutionPerformed: false, productionReleaseApproved: false });
    return { ...base, app, previousApp, oldPayload, before, bindings, coverage, prebuilt, previousSbomBytes, derivative, sbomFile, catalog, catalogFile };
}
function prepareCandidatePayload(prepared, payload) {
    const catalog = structuredClone(prepared.catalog);
    const files = preparePayload({ appDirectory: prepared.app, destination: payload, catalogFile: prepared.catalogFile, sbomFile: prepared.sbomFile });
    for (const entry of catalog.entries) entry.sha256 = componentTreeDigest(componentRows(files, entry.package));
    fs.writeFileSync(path.join(payload, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
    const finalFiles = bundle.inventory(payload), old = prepared.checked.manifest.files;
    const protectedRows = rows => rows.filter(row => row.path.startsWith('system/') || row.path === 'runtime/postgresql/schema.sql');
    if (JSON.stringify(protectedRows(old)) !== JSON.stringify(protectedRows(finalFiles))) fail('R9_HOST_MIGRATION');
    if (!finalFiles.some(row => row.path === REQUIRED_UPDATER)) fail('R9_UPDATER_NOT_PACKAGED');
    const checked = validatePayload(payload, { ...METADATA, files: finalFiles });
    assertOverlayDelta(prepared.before, appRows({ files: finalFiles }), prepared.bindings);
    return { files: finalFiles, catalog, checked };
}
function transitionEvidence(previous, next) {
    require('../../../tools/system/update-test-to-r9.cjs').validateTransition(previous, next, { expectedReleaseId: next.releaseId });
    return { previousReleaseId: previous.releaseId, previousSequence: 11, targetReleaseId: next.releaseId, targetSequence: 12,
        previousSignatureVerified: true, hostSystemFilesUnchanged: true, postgresqlSchemaFileUnchanged: true, admissionScopeUnchanged: true, controllerProfileUnchanged: true,
        passed: true, targetExecutionPerformed: false };
}
function deliveryMetadata({ previousDelivery, release, sourceCommit, installedComponents }) {
    return { ...previousDelivery, deliveryRevision: 9, releaseSequence: 12, releaseId: release.releaseId,
        signingPublicKeySha256: release.signingPublicKeySha256, sha256: release.archiveSha256, bytes: release.archiveBytes,
        signedFiles: release.manifest.files.length, installedComponents, archiveReadbackVerified: true, privateKeyPersisted: false,
        sourceCommit, sourceAssembly: 'authenticated-r8-app-with-six-reviewed-own-package-overlays', physicalControlEnabled: false,
        targetTestRequired: true, operatorRecoveryPathAvailable: false, productionReleaseApproved: false };
}
function verificationMetadata({ sourceCommit, timestamp, release, historicalCount, authenticatedBaselineTransition, prebuilt, nativeManagementEvidence }) {
    return { schemaVersion: 1, sourceCommit, timestamp, host: process.platform + '-' + process.arch, buildNode: process.versions.node,
        targetNode: METADATA.nodeVersion, releaseId: release.releaseId, archiveSha256: release.archiveSha256, archiveBytes: release.archiveBytes,
        signingPublicKeySha256: release.signingPublicKeySha256, deliveryRevision: 9, releaseSequence: 12, previousSignatureVerified: true,
        finalSignatureVerified: true, sourceBindingPassed: true, signedArchiveReadbackPassed: true, historicalDeliveryFilesUnchanged: historicalCount,
        exactOverlayDeltaChecked: true, dependenciesUnchanged: true, prebuilt, nativeManagementEvidence, authenticatedBaselineTransition,
        nativeTargetExecutionPerformed: false, piUpdatePerformed: false, operatorRecoveryPathAvailable: false, hardwareTested: false, productionReleaseApproved: false };
}
function bindingMetadata(prepared, final, sourceCommit, keyHash) {
    const hostFiles = final.manifest.files.filter(row => ['runtime/', 'tools/', 'security/', 'system/'].some(prefix => row.path.startsWith(prefix))).map(row => {
        const bytes = bundle.readFileLimited(path.join(ROOT, row.path)).bytes;
        if (bundle.sha256(bytes) !== row.sha256 || bytes.length !== row.size) fail('R9_HOST_SOURCE_BINDING');
        return { source: row.path, target: row.path, bytes: row.size, sha256: row.sha256 };
    });
    return { schemaVersion: 1, sourceCommit, releaseId: final.releaseId, archiveSha256: final.archiveSha256, signingPublicKeySha256: keyHash,
        previousReleaseId: BASE.releaseId, overlays: prepared.bindings, sourceCoverage: prepared.coverage, hostFiles, allMatched: true,
        unchangedThirdPartyContentReused: true, npmResolutionPerformed: false, sourceTranspilationPerformed: false };
}
function requireCommittedSources(entries) {
    const tracked = new Set(run('git', ['ls-files', '-z', '--', 'components']).split('\0').filter(Boolean));
    if (entries.some(row => !tracked.has(row.source))) fail('R9_UNCOMMITTED_PREBUILT_SOURCE');
}
function parseArgs(argv) {
    const names = { '--native-evidence': 'nativeEvidenceDirectory', '--base-directory': 'baseDirectory' };
    if (![2, 4].includes(argv.length)) fail('R9_BUILD_USAGE');
    const options = {};
    for (let index = 0; index < argv.length; index += 2) {
        const key = names[argv[index]], value = argv[index + 1];
        if (!key || Object.hasOwn(options, key) || typeof value !== 'string' || !path.isAbsolute(value) || path.resolve(value) !== value) fail('R9_BUILD_USAGE');
        options[key] = value;
    }
    if (!options.nativeEvidenceDirectory) fail('R9_NATIVE_EVIDENCE_REQUIRED');
    return options;
}
function main(argv = process.argv.slice(2)) {
    const options = parseArgs(argv);
    if (process.platform !== 'linux' || process.versions.node !== METADATA.nodeVersion) fail('R9_BUILD_HOST');
    const sourceCommit = run('git', ['rev-parse', 'HEAD']), timestamp = run('git', ['show', '-s', '--format=%cI', 'HEAD']);
    if (!/^[a-f0-9]{40}$/.test(sourceCommit) || run('git', ['status', '--porcelain', '--untracked-files=normal']) !== '') fail('R9_CLEAN_CHECKOUT_REQUIRED');
    const destination = path.join(ROOT, NEXT); if (fs.existsSync(destination)) fail('R9_IMMUTABLE_DESTINATION_EXISTS');
    const baseDirectory = options.baseDirectory || path.join(ROOT, BASE.directory), historical = [];
    for (const directory of new Set([baseDirectory, path.join(ROOT, 'delivery')])) if (fs.existsSync(directory))
        for (const row of historicalInventory(directory)) historical.push({ ...row, absolute: path.join(directory, row.path) });
    fs.mkdirSync(path.join(ROOT, '.work'), { recursive: true });
    const work = path.join(ROOT, WORK), prepared = prepareApp({ baseDirectory, work, sourceCommit, timestamp });
    const nativeManagementEvidence = require('../../../tools/bootstrap/verify-r9-native-evidence.cjs').verifyNativeEvidence({
        directory: options.nativeEvidenceDirectory, sourceCommit, files: bundle.inventory(prepared.app), appPrefix: '' });
    const payload = path.join(work, 'payload'), candidate = prepareCandidatePayload(prepared, payload);
    const manifest = bundle.validateManifest({ ...METADATA, files: canonicalInventory(candidate.files, METADATA, candidate.checked.architectureReports).files });
    const draft = { releaseId: bundle.sha256(Buffer.from(JSON.stringify(manifest) + '\n')), manifest, catalog: candidate.catalog };
    const previous = { ...prepared.checked, catalog: JSON.parse(bundle.readFileLimited(path.join(prepared.oldPayload, 'catalog.json')).bytes) };
    const authenticatedBaselineTransition = transitionEvidence(previous, draft);
    const archive = path.join(work, BASE.archive), keyFile = path.join(work, 'release-public.pem');
    requireCommittedSources(prepared.coverage);
    if (run('git', ['status', '--porcelain', '--untracked-files=normal']) !== '') fail('R9_SOURCE_CHANGED_BEFORE_SIGNING');
    const signed = createTestArchive({ payloadDirectory: payload, archivePath: archive, publicKeyPath: keyFile, metadata: METADATA });
    if (signed.archiveBytes > 100 * 1024 * 1024) fail('R9_PUBLIC_ARCHIVE_LIMIT');
    const key = bundle.readFileLimited(keyFile, 16384).bytes;
    const final = verifyTestArchive({ archivePath: archive, publicKey: key, expectedReleaseId: signed.releaseId, platform: 'linux-arm64' });
    assertOverlayDelta(prepared.before, appRows(final.manifest), prepared.bindings);
    if (JSON.stringify(authenticatedBaselineTransition) !== JSON.stringify(transitionEvidence(previous, { ...final, catalog: candidate.catalog }))) fail('R9_SIGNED_TRANSITION_CHANGED');
    const binding = bindingMetadata(prepared, final, sourceCommit, bundle.sha256(key));
    for (const row of historical) {
        const bytes = bundle.readFileLimited(row.absolute, 128 * 1024 * 1024).bytes;
        if (bytes.length !== row.size || bundle.sha256(bytes) !== row.sha256) fail('R9_HISTORICAL_DELIVERY_CHANGED');
    }
    const release = { ...final, signingPublicKeySha256: bundle.sha256(key) };
    const delivery = deliveryMetadata({ previousDelivery: prepared.delivery, release, sourceCommit, installedComponents: candidate.checked.productInventory });
    fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.mkdirSync(destination);
    for (const [file, name] of [[archive, BASE.archive], [keyFile, 'release-public.pem']]) fs.copyFileSync(file, path.join(destination, name), fs.constants.COPYFILE_EXCL);
    save(path.join(destination, 'delivery.json'), delivery);
    fs.writeFileSync(path.join(destination, 'bundle.sha256'), `${release.archiveSha256}  ${BASE.archive}\n${release.signingPublicKeySha256}  release-public.pem\n`, { flag: 'wx' });
    save(path.join(__dirname, 'runtime.cdx.json'), prepared.derivative.bom);
    save(path.join(__dirname, 'runtime-derivative-sbom.json'), { ...prepared.derivative.evidence, previousSbomExactBytesSha256: bundle.sha256(prepared.previousSbomBytes), deliveredSbomSha256: final.manifest.files.find(row => row.path === 'sbom.cdx.json').sha256 });
    save(path.join(__dirname, 'signed-source-binding.json'), binding);
    save(path.join(__dirname, 'build-verification.json'), verificationMetadata({ sourceCommit, timestamp, release, historicalCount: historical.length, authenticatedBaselineTransition, prebuilt: prepared.prebuilt, nativeManagementEvidence }));
    save(path.join(__dirname, 'delivery.json'), delivery);
    process.stdout.write(JSON.stringify({ ok: true, deliveryDirectory: NEXT, releaseId: release.releaseId, archiveSha256: release.archiveSha256, publicKeySha256: release.signingPublicKeySha256 }) + '\n');
}
module.exports = { BASE, NEXT, WORK, REPORT, METADATA, REQUIRED_UPDATER, SPECS, sourceFile, sourceEntries, validatePackTable, ownSourcePath,
    appRows, overlaySource, assertOverlayDelta, verifyBase, verifyPrebuilt, prepareApp, prepareCandidatePayload, transitionEvidence,
    deliveryMetadata, verificationMetadata, bindingMetadata, historicalInventory, requireCommittedSources, parseArgs, main };
if (require.main === module) { try { main(); } catch (error) { process.stderr.write((/^[A-Z0-9_]+$/.test(error.code || '') ? error.code : 'R9_BUILD_FAILED') + '\n'); process.exitCode = 1; } }
