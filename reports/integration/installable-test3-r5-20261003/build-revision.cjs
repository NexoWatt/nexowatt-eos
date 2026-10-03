'use strict';
// Offline derivative assembly: authenticate R4, overlay only reviewed plain CJS
// and branding inputs, inventory a new SBOM, rebuild host payload and sign TEST.
// No npm lifecycle, dependency resolution, target execution or publication.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const ROOT = path.resolve(__dirname, '../../..');
const BASE = Object.freeze({ directory: 'delivery/test-pi-0.2.0-test.3-r4', archive: 'eos-0.2.0-test.3-linux-arm64.tar.gz',
    bytes: 88363976, sha256: 'c1d418a66b3678fb19f4487ece9871da81cf7a583af59a6d889c799d7c6dd1b3',
    keySha256: 'd35d09a005703eecf1b5a8843b553064c5ab90758cfc71a634599459cda6e8b3',
    releaseId: '15d65328b06e5d4d3a72b2ee440159aa36e07ce300d45888762519b66652ffa8' });
// Plain CommonJS source/build pairs must be byte-identical; no transpiler is
// invoked or claimed. The R4 package never shipped the unused src/ tree.
const COMMONJS = Object.freeze(['eosSessionSecurity.js', 'eosLicenseCore.js', 'eosLicenseService.js', 'eosLicensePolicy.js']);
const OVERLAYS = Object.freeze([...COMMONJS.map(name => 'build/lib/' + name), 'adminWww/index.html', 'adminWww/css/eos-startup-branding.css']);
const NEXT = 'delivery/test-pi-0.2.0-test.3-r5';
const fail = code => { throw Object.assign(new Error(code), { code }); };
function assertOverlayDelta(before, after, bindings) {
    const original = new Map(before.map(row => [row.path, row])), changed = new Map(bindings.map(row => [row.target, row]));
    for (const row of after) {
        const prior = original.get(row.path), binding = changed.get(row.path);
        if (binding) {
            if (row.sha256 !== binding.sha256 || row.size !== binding.bytes ||
                (prior?.sha256 || null) !== binding.previousSha256) fail('R5_OVERLAY_BINDING');
            changed.delete(row.path);
        } else if (!prior || JSON.stringify(prior) !== JSON.stringify(row)) fail('R5_UNDECLARED_APP_CHANGE');
        original.delete(row.path);
    }
    if (original.size || changed.size) fail('R5_APP_FILE_REMOVAL_OR_MISSING_OVERLAY');
}
function main() {
    if (process.argv.length !== 2 || process.platform !== 'linux' || Number(process.versions.node.split('.')[0]) !== 24) fail('R5_BUILD_HOST');
    const bundle = require(path.join(ROOT, 'runtime/release/bundle.cjs'));
    const { copyDirectory, preparePayload, componentRows } = require(path.join(ROOT, 'tools/system/build-bundle.cjs'));
    const { createTestArchive, verifyTestArchive } = require(path.join(ROOT, 'tools/integration/create-test-archive.cjs'));
    const { bindDerivative, appRows } = require(path.join(ROOT, 'tools/integration/bind-r5-derivative-sbom.cjs'));
    const product = require(path.join(ROOT, 'runtime/product/scope.cjs'));
    const { componentTreeDigest } = require(path.join(ROOT, 'runtime/policy/admission.cjs'));
    const run = (program, args) => {
        const result = cp.spawnSync(program, args, { cwd: ROOT, encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024,
            env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });
        if (result.status !== 0 || result.error) fail('R5_BUILD_COMMAND_FAILED');
        return result.stdout.trim();
    };
    const commit = run('git', ['rev-parse', 'HEAD']), timestamp = run('git', ['show', '-s', '--format=%cI', 'HEAD']);
    if (!/^[a-f0-9]{40}$/.test(commit) || run('git', ['status', '--porcelain', '--untracked-files=normal']) !== '') fail('R5_CLEAN_CHECKOUT_REQUIRED');
    const destination = path.join(ROOT, NEXT);
    if (fs.existsSync(destination)) fail('R5_IMMUTABLE_DESTINATION_EXISTS');
    const previousDir = path.join(ROOT, BASE.directory), archive = path.join(previousDir, BASE.archive);
    const previousArchive = fs.readFileSync(archive), previousKey = bundle.readFileLimited(path.join(previousDir, 'release-public.pem'), 16384).bytes;
    if (previousArchive.length !== BASE.bytes || bundle.sha256(previousArchive) !== BASE.sha256 || bundle.sha256(previousKey) !== BASE.keySha256) fail('R5_BASE_PINS');
    const checked = verifyTestArchive({ archivePath: archive, publicKey: previousKey, expectedReleaseId: BASE.releaseId, platform: 'linux-arm64' });
    if (checked.manifest.sequence !== 7 || checked.manifest.profile !== 'test' || checked.manifest.nodeVersion !== '24.21.0') fail('R5_BASE_SCOPE');
    const baseDelivery = JSON.parse(bundle.readFileLimited(path.join(previousDir, 'delivery.json'), 65536).bytes);
    if (baseDelivery.deliveryRevision !== 4 || baseDelivery.releaseSequence !== 7 || baseDelivery.releaseId !== BASE.releaseId) fail('R5_BASE_METADATA');
    const save = (name, data) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
    const historical = fs.readdirSync(path.join(ROOT, 'delivery')).sort().flatMap(name => {
        const dir = path.join(ROOT, 'delivery', name);
        if (!fs.lstatSync(dir).isDirectory()) return [];
        return bundle.inventory(dir).map(row => ({ ...row, path: 'delivery/' + name + '/' + row.path }));
    });
    const workParent = path.join(ROOT, '.work'); fs.mkdirSync(workParent, { recursive: true });
    const work = path.join(workParent, 'runtime-test3-r5-20261003'); fs.mkdirSync(work, { mode: 0o700 });
    const extracted = path.join(work, 'r4');
    run('/usr/bin/python3', ['-I', '-B', 'tools/system/extract-test-bundle.py', '--archive', archive, '--destination', extracted, '--sha256', BASE.sha256]);
    const oldPayload = path.join(extracted, 'bundle/payload'), app = path.join(work, 'app');
    copyDirectory(path.join(oldPayload, 'app'), app);
    const before = appRows(checked.manifest), bindings = [];
    const observed = () => bundle.inventory(app).map(({ path, size, sha256 }) => ({ path, size, sha256 }));
    if (JSON.stringify(before) !== JSON.stringify(observed())) fail('R5_BASE_APP_COPY');
    for (const relative of OVERLAYS) {
        const source = 'components/admin/' + relative, target = 'node_modules/iobroker.eos-admin/' + relative;
        const bytes = bundle.readFileLimited(path.join(ROOT, source)).bytes;
        const row = { source, target, bytes: bytes.length, sha256: bundle.sha256(bytes),
            previousSha256: before.find(item => item.path === target)?.sha256 || null };
        if (relative.startsWith('build/lib/')) {
            row.plainCommonJsSource = 'components/admin/src/lib/' + path.basename(relative);
            const sourceBytes = bundle.readFileLimited(path.join(ROOT, row.plainCommonJsSource)).bytes;
            if (!sourceBytes.equals(bytes) || bytes.toString('utf8').includes('sourceMappingURL=')) fail('R5_COMMONJS_SOURCE_PARITY');
            row.transformation = 'byte-identical-reviewed-commonjs-source-copy; no-transpilation';
        }
        fs.mkdirSync(path.dirname(path.join(app, target)), { recursive: true });
        fs.writeFileSync(path.join(app, target), bytes, { mode: 0o644 }); bindings.push(row);
    }
    const backendSource = 'runtime/postgresql/packages/db-objects-postgresql/index.cjs';
    const backendTarget = 'node_modules/@iobroker/db-objects-postgresql/index.cjs';
    const backendBytes = bundle.readFileLimited(path.join(ROOT, backendSource)).bytes;
    fs.writeFileSync(path.join(app, backendTarget), backendBytes);
    bindings.push({ source: backendSource, target: backendTarget, bytes: backendBytes.length, sha256: bundle.sha256(backendBytes),
        previousSha256: before.find(row => row.path === backendTarget)?.sha256 || null, transformation: 'byte-identical-runtime-backend-source-copy' });
    assertOverlayDelta(before, observed(), bindings);
    const previousSbomBytes = bundle.readFileLimited(path.join(oldPayload, 'sbom.cdx.json'), 16 * 1024 * 1024).bytes;
    if (bundle.sha256(previousSbomBytes) !== checked.manifest.files.find(row => row.path === 'sbom.cdx.json')?.sha256) fail('R5_BASE_SBOM_BINDING');
    const derivative = bindDerivative({ app, previousManifest: checked.manifest, previousSbom: JSON.parse(previousSbomBytes),
        previousReleaseId: BASE.releaseId, sourceCommit: commit, timestamp });
    const sbomFile = path.join(work, 'runtime.cdx.json'); fs.writeFileSync(sbomFile, JSON.stringify(derivative.bom, null, 2) + '\n', { flag: 'wx' });
    const catalog = JSON.parse(bundle.readFileLimited(path.join(oldPayload, 'catalog.json')).bytes); catalog.catalogRevision = 4;
    const catalogFile = path.join(work, 'catalog.json'); fs.writeFileSync(catalogFile, JSON.stringify(catalog, null, 2) + '\n', { flag: 'wx' });
    const payload = path.join(work, 'payload');
    const files = preparePayload({ appDirectory: app, destination: payload, catalogFile, sbomFile });
    for (const entry of catalog.entries) entry.sha256 = componentTreeDigest(componentRows(files, entry.package));
    fs.writeFileSync(path.join(payload, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
    const metadata = { schemaVersion: 1, product: 'nexowatt-eos', releaseVersion: '0.2.0-test.3', sequence: 8,
        profile: 'test', nodeVersion: '24.21.0', platforms: ['linux-arm64'] };
    const newArchive = path.join(work, BASE.archive), keyFile = path.join(work, 'release-public.pem');
    const signed = createTestArchive({ payloadDirectory: payload, archivePath: newArchive, publicKeyPath: keyFile, metadata });
    const newKey = bundle.readFileLimited(keyFile, 16384).bytes;
    const final = verifyTestArchive({ archivePath: newArchive, publicKey: newKey, expectedReleaseId: signed.releaseId, platform: 'linux-arm64' });
    assertOverlayDelta(before, appRows(final.manifest), bindings);
    const unitRows = rows => rows.filter(row => row.path.startsWith('system/') || row.path === 'runtime/postgresql/schema.sql');
    if (JSON.stringify(unitRows(checked.manifest.files)) !== JSON.stringify(unitRows(final.manifest.files))) fail('R5_HOST_MIGRATION_NOT_SUPPORTED');
    const installedComponents = product.inspectApp(app);
    const delivery = { ...baseDelivery, deliveryRevision: 5, releaseSequence: 8, releaseId: signed.releaseId,
        signingPublicKeySha256: signed.signingPublicKeySha256, sha256: signed.archiveSha256, bytes: signed.archiveBytes,
        signedFiles: signed.manifest.files.length, installedComponents, archiveReadbackVerified: true, privateKeyPersisted: false,
        sourceCommit: commit, sourceAssembly: 'authenticated-r4-app-with-bound-source-overlays',
        physicalControlEnabled: false, targetTestRequired: true, productionReleaseApproved: false };
    const sourceBindings = final.manifest.files.filter(row => !row.path.startsWith('app/') &&
        ['runtime/', 'tools/', 'security/', 'system/'].some(prefix => row.path.startsWith(prefix))).map(row => {
        const bytes = bundle.readFileLimited(path.join(ROOT, row.path)).bytes;
        if (bundle.sha256(bytes) !== row.sha256 || bytes.length !== row.size) fail('R5_HOST_SOURCE_BINDING');
        return { source: row.path, target: row.path, bytes: row.size, sha256: row.sha256 };
    });
    fs.mkdirSync(destination);
    for (const [source, name] of [[newArchive, BASE.archive], [keyFile, 'release-public.pem']]) fs.copyFileSync(source, path.join(destination, name), fs.constants.COPYFILE_EXCL);
    fs.writeFileSync(path.join(destination, 'delivery.json'), JSON.stringify(delivery, null, 2) + '\n', { flag: 'wx' });
    fs.writeFileSync(path.join(destination, 'bundle.sha256'), `${signed.archiveSha256}  ${BASE.archive}\n${signed.signingPublicKeySha256}  release-public.pem\n`, { flag: 'wx' });
    for (const row of historical) {
        const bytes = bundle.readFileLimited(path.join(ROOT, row.path), 128 * 1024 * 1024).bytes;
        if (bytes.length !== row.size || bundle.sha256(bytes) !== row.sha256) fail('R5_HISTORICAL_DELIVERY_CHANGED');
    }
    save('runtime.cdx.json', derivative.bom);
    save('runtime-derivative-sbom.json', { ...derivative.evidence, previousSbomExactBytesSha256: bundle.sha256(previousSbomBytes),
        deliveredSbomSha256: final.manifest.files.find(row => row.path === 'sbom.cdx.json').sha256 });
    save('signed-source-binding.json', { schemaVersion: 1, sourceCommit: commit, releaseId: signed.releaseId,
        archiveSha256: signed.archiveSha256, signingPublicKeySha256: signed.signingPublicKeySha256,
        previousReleaseId: BASE.releaseId, overlays: bindings.map(row => ({ ...row, target: 'app/' + row.target })), hostFiles: sourceBindings, allMatched: true,
        unchangedAppContentReused: true, unusedOriginalSourceMapsRetained: true, npmResolutionPerformed: false, sourceTranspilationPerformed: false });
    save('build-verification.json', { schemaVersion: 1, sourceCommit: commit, timestamp, host: process.platform + '-' + process.arch,
        releaseId: signed.releaseId, archiveSha256: signed.archiveSha256, archiveBytes: signed.archiveBytes,
        signingPublicKeySha256: signed.signingPublicKeySha256,
        buildNode: process.versions.node, targetNode: '24.21.0', deliveryRevision: 5, releaseSequence: 8,
        previousSignatureVerified: true, finalSignatureVerified: true, sourceBindingPassed: true, signedArchiveReadbackPassed: true,
        historicalDeliveryFilesUnchanged: historical.length, exactOverlayDeltaChecked: true,
        nativeTargetExecutionPerformed: false, piUpdatePerformed: false, hardwareTested: false, productionReleaseApproved: false });
    save('delivery.json', delivery);
    process.stdout.write(JSON.stringify({ ok: true, deliveryDirectory: NEXT, releaseId: signed.releaseId,
        archiveSha256: signed.archiveSha256, publicKeySha256: signed.signingPublicKeySha256 }) + '\n');
}
module.exports = { BASE, NEXT, COMMONJS, OVERLAYS, assertOverlayDelta };
if (require.main === module) {
    try { main(); } catch (error) { process.stderr.write((/^[A-Z0-9_]+$/.test(error.code || error.message || '') ? error.code || error.message : 'R5_BUILD_FAILED') + '\n'); process.exitCode = 1; }
}
