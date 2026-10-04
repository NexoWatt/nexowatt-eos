'use strict';
// Independent readback: execute only trusted checkout code, reconstruct the app
// from authenticated R6 and current reviewed source, then compare every row.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');
const { sha256, readFileLimited, inventory } = require('../../../runtime/release/bundle.cjs');
const { verifyTestArchive, canonicalInventory } = require('../../../tools/integration/create-test-archive.cjs');
const { appRows, bindDerivative } = require('../../../tools/integration/bind-r7-derivative-sbom.cjs');
const { BASE, NEXT, METADATA, REQUIRED_RECOVERY, sourceEntries, assertOverlayDelta, verifyBase, authenticateR4, transitionEvidence, assertBackendMetadata, deliveryMetadata, verificationMetadata } = require('./build-revision.cjs');
const { copyDirectory, preparePayload, componentRows, validatePayload } = require('../../../tools/system/build-bundle.cjs');
const { componentTreeDigest } = require('../../../runtime/policy/admission.cjs');
const pid = require('../../../runtime/controller-profile/pid-state.cjs');
const ROOT = path.resolve(__dirname, '../../..');
const REPORT = path.relative(ROOT, __dirname);
const fail = () => { throw Object.assign(new Error('R7_TRUSTED_VERIFICATION_REJECTED'), { code: 'R7_TRUSTED_VERIFICATION_REJECTED' }); };
const json = file => JSON.parse(readFileLimited(file, 16 * 1024 * 1024).bytes);
function exactSourceBindings({ root, manifest, binding, entries }) {
    const files = new Map(manifest.files.map(row => [row.path, row]));
    if (files.size !== manifest.files.length || !Array.isArray(binding.sourceCoverage) || !Array.isArray(binding.hostFiles)) fail();
    const coverage = new Map(binding.sourceCoverage.map(row => [row.target, row]));
    if (coverage.size !== entries.length || coverage.size !== binding.sourceCoverage.length) fail();
    const check = (source, target, declared, declaredTarget = target) => {
        const signed = files.get(target), bytes = readFileLimited(path.join(root, source)).bytes;
        if (!declared || declared.source !== source || declared.target !== declaredTarget || !signed ||
            signed.size !== bytes.length || signed.sha256 !== sha256(bytes) || declared.bytes !== signed.size || declared.sha256 !== signed.sha256) fail();
    };
    for (const row of entries) {
        check(row.source, 'app/' + row.target, coverage.get(row.target), row.target);
        if (files.get(row.source)?.sha256 !== files.get('app/' + row.target)?.sha256) fail();
    }
    const host = manifest.files.filter(row => ['runtime/', 'tools/', 'security/', 'system/'].some(prefix => row.path.startsWith(prefix)));
    const declaredHost = new Map(binding.hostFiles.map(row => [row.target, row]));
    if (host.length !== binding.hostFiles.length || declaredHost.size !== host.length ||
        !['runtime/controller-profile/pid-state.cjs', REQUIRED_RECOVERY].every(required => host.some(row => row.path === required))) fail();
    for (const row of host) check(row.path, row.path, declaredHost.get(row.path));
}
function assertFullPayload(expected, actual) {
    if (JSON.stringify(expected) !== JSON.stringify(actual)) fail();
}
function assertReports({ delivery, reportDelivery, buildVerification, checksumText, expectedDelivery, expectedVerification }) {
    for (const [actual, expected] of [[delivery, expectedDelivery], [reportDelivery, expectedDelivery], [buildVerification, expectedVerification]])
        if (JSON.stringify(actual) !== JSON.stringify(expected)) fail();
    if (checksumText !== `${expectedDelivery.sha256}  ${BASE.archive}\n${expectedDelivery.signingPublicKeySha256}  release-public.pem\n`) fail();
}
function reconstructPayload({ candidate, base, final, binding, sourceCommit, timestamp }) {
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-r7-verify-'));
    try {
        cp.execFileSync('/usr/bin/python3', ['-I', '-B', 'tools/system/extract-test-bundle.py', '--archive', base.archive,
            '--destination', path.join(scratch, 'base'), '--sha256', BASE.sha256], { cwd: ROOT, timeout: 180000, maxBuffer: 1024 * 1024 });
        const basePayload = path.join(scratch, 'base/bundle/payload'), app = path.join(scratch, 'expected-app');
        copyDirectory(path.join(basePayload, 'app'), app);
        assertBackendMetadata(app);
        const before = appRows(base.checked.manifest), oldRows = new Map(before.map(row => [row.path, row]));
        const expectedBindings = [], expectedCoverage = [];
        for (const entry of sourceEntries()) {
            const bytes = readFileLimited(path.join(ROOT, entry.source)).bytes, prior = oldRows.get(entry.target);
            if (!prior) fail();
            const row = { ...entry, bytes: bytes.length, sha256: sha256(bytes), previousSha256: prior.sha256 };
            expectedCoverage.push(row);
            if (row.sha256 === prior.sha256 && row.bytes === prior.size) continue;
            fs.writeFileSync(path.join(app, row.target), bytes); expectedBindings.push(row);
        }
        // Recreate each exact transformation from the authenticated original;
        // candidate declarations or candidate program code are never executed.
        const transformed = [];
        for (const pin of pid.FILES) {
            const transformedFile = pid.transformFile(pin.relativePath, readFileLimited(path.join(app, pin.relativePath)).bytes);
            fs.writeFileSync(path.join(app, pin.relativePath), transformedFile.content);
            const { content, ...declaration } = transformedFile; transformed.push(declaration);
            expectedBindings.push({ source: 'runtime/controller-profile/pid-state.cjs', target: pin.relativePath,
                transformation: 'eos-controller-pid-state-transform', bytes: Buffer.byteLength(content), sha256: pin.sha256, previousSha256: pin.originalSha256 });
        }
        pid.verifyBuild(app);
        const expectedTransform = { schemaVersion: 1, kind: 'eos-controller-pid-state-transform', component: pid.PACKAGE, version: '7.2.2',
            pidFile: pid.PID_FILE, files: transformed, physicalControlEnabled: false, productionApproved: false };
        for (const [expected, actual] of [[expectedCoverage, binding.sourceCoverage], [expectedBindings, binding.overlays], [expectedTransform, binding.pidTransformation]])
            if (JSON.stringify(expected) !== JSON.stringify(actual)) fail();
        assertOverlayDelta(before, appRows(final.manifest), expectedBindings);
        const previousSbomBytes = readFileLimited(path.join(basePayload, 'sbom.cdx.json'), 16 * 1024 * 1024).bytes;
        const derivative = bindDerivative({ app, previousManifest: base.checked.manifest, previousSbom: JSON.parse(previousSbomBytes),
            previousReleaseId: BASE.releaseId, sourceCommit, timestamp });
        const sbomBytes = Buffer.from(JSON.stringify(derivative.bom, null, 2) + '\n');
        if (!sbomBytes.equals(readFileLimited(path.join(candidate, REPORT, 'runtime.cdx.json'), 16 * 1024 * 1024).bytes)) fail();
        const expectedEvidence = { ...derivative.evidence, previousSbomExactBytesSha256: sha256(previousSbomBytes), deliveredSbomSha256: sha256(sbomBytes) };
        if (JSON.stringify(expectedEvidence) !== JSON.stringify(json(path.join(candidate, REPORT, 'runtime-derivative-sbom.json')))) fail();
        const sbomFile = path.join(scratch, 'sbom.cdx.json'), catalogFile = path.join(scratch, 'catalog.json');
        fs.writeFileSync(sbomFile, sbomBytes);
        const catalog = json(path.join(basePayload, 'catalog.json')); catalog.catalogRevision = 6;
        fs.writeFileSync(catalogFile, JSON.stringify(catalog, null, 2) + '\n');
        const payload = path.join(scratch, 'expected-payload');
        const prepared = preparePayload({ appDirectory: app, destination: payload, catalogFile, sbomFile });
        for (const entry of catalog.entries) entry.sha256 = componentTreeDigest(componentRows(prepared, entry.package));
        fs.writeFileSync(path.join(payload, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
        const files = inventory(payload), checked = validatePayload(payload, { ...METADATA, files });
        const canonical = canonicalInventory(files, METADATA, checked.architectureReports);
        assertFullPayload(canonical.files, final.manifest.files);
        const protectedRows = rows => rows.filter(row => row.path.startsWith('system/') || row.path === 'runtime/postgresql/schema.sql');
        assertFullPayload(protectedRows(base.checked.manifest.files), protectedRows(final.manifest.files));
        const authenticatedBaselineTransition = transitionEvidence(authenticateR4(scratch), { ...final, catalog });
        return { installedComponents: checked.productInventory, sourceCoverage: expectedCoverage, overlays: expectedBindings, pidTransformation: expectedTransform, authenticatedBaselineTransition };
    } finally { fs.rmSync(scratch, { recursive: true, force: true }); }
}
function main(argv = process.argv.slice(2)) {
    const [candidate, expectedCommit, flag, localBase] = argv;
    if (![2, 4].includes(argv.length) || !path.isAbsolute(candidate || '') || !/^[a-f0-9]{40}$/.test(expectedCommit || '') ||
        argv.length === 4 && (flag !== '--base-directory' || !path.isAbsolute(localBase))) fail();
    const git = args => cp.execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', timeout: 10000 }).trim();
    const sourcePaths = ['runtime', 'tools', 'system', 'security', 'licenses', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'docs/history/UPSTREAM_README.md'];
    if (git(['rev-parse', 'HEAD']) !== expectedCommit || git(['diff', '--name-only', expectedCommit, '--', ...sourcePaths, REPORT]) ||
        git(['ls-files', '--others', '--exclude-standard', '--', ...sourcePaths])) fail();
    for (const source of [REPORT + '/build-revision.cjs', REPORT + '/verify-candidate.cjs', 'runtime/controller-profile/pid-state.cjs', 'tools/integration/bind-r7-derivative-sbom.cjs']) {
        const committed = cp.execFileSync('git', ['show', expectedCommit + ':' + source], { cwd: ROOT, timeout: 10000, maxBuffer: 4 * 1024 * 1024 });
        if (!committed.equals(readFileLimited(path.join(ROOT, source)).bytes)) fail();
    }
    const delivery = json(path.join(candidate, NEXT, 'delivery.json')), binding = json(path.join(candidate, REPORT, 'signed-source-binding.json'));
    if (delivery.sourceCommit !== expectedCommit || binding.sourceCommit !== expectedCommit || binding.previousReleaseId !== BASE.releaseId ||
        delivery.deliveryRevision !== 7 || delivery.releaseSequence !== 10 || delivery.physicalControlEnabled !== false ||
        delivery.operatorRecoveryPathAvailable !== false || delivery.productionReleaseApproved !== false) fail();
    const archive = path.join(candidate, NEXT, BASE.archive), key = readFileLimited(path.join(candidate, NEXT, 'release-public.pem'), 16384).bytes;
    const archiveBytes = readFileLimited(archive, 100 * 1024 * 1024).bytes;
    if (sha256(archiveBytes) !== delivery.sha256 || archiveBytes.length !== delivery.bytes || sha256(key) !== delivery.signingPublicKeySha256) fail();
    const final = verifyTestArchive({ archivePath: archive, publicKey: key, expectedReleaseId: delivery.releaseId, platform: 'linux-arm64' });
    for (const key of Object.keys(METADATA)) if (JSON.stringify(final.manifest[key]) !== JSON.stringify(METADATA[key])) fail();
    if (delivery.signedFiles !== final.manifest.files.length || binding.releaseId !== final.releaseId || binding.archiveSha256 !== final.archiveSha256 || binding.signingPublicKeySha256 !== sha256(key)) fail();
    const baseDirectory = localBase || path.join(ROOT, BASE.directory), base = verifyBase(baseDirectory);
    exactSourceBindings({ root: ROOT, manifest: final.manifest, binding, entries: sourceEntries() });
    const timestamp = git(['show', '-s', '--format=%cI', expectedCommit]);
    const reconstructed = reconstructPayload({ candidate, base, final, binding, sourceCommit: expectedCommit, timestamp });
    const expectedBinding = { schemaVersion: 1, sourceCommit: expectedCommit, releaseId: final.releaseId,
        archiveSha256: final.archiveSha256, signingPublicKeySha256: sha256(key), previousReleaseId: BASE.releaseId,
        overlays: reconstructed.overlays, sourceCoverage: reconstructed.sourceCoverage, pidTransformation: reconstructed.pidTransformation,
        hostFiles: final.manifest.files.filter(row => ['runtime/', 'tools/', 'security/', 'system/'].some(prefix => row.path.startsWith(prefix)))
            .map(row => ({ source: row.path, target: row.path, bytes: row.size, sha256: row.sha256 })),
        allMatched: true, unchangedAppContentReused: true, npmResolutionPerformed: false, sourceTranspilationPerformed: false };
    assertFullPayload(expectedBinding, binding);
    let historicalCount = 0;
    for (const directory of new Set([baseDirectory, path.join(ROOT, 'delivery')])) if (fs.existsSync(directory))
        historicalCount += inventory(directory).filter(row => !path.join(directory, row.path).startsWith(path.join(ROOT, NEXT) + path.sep)).length;
    const release = { ...final, signingPublicKeySha256: sha256(key) };
    const expectedDelivery = deliveryMetadata({ previousDelivery: base.delivery, release, sourceCommit: expectedCommit, installedComponents: reconstructed.installedComponents });
    const expectedVerification = verificationMetadata({ sourceCommit: expectedCommit, timestamp, release, historicalCount, authenticatedBaselineTransition: reconstructed.authenticatedBaselineTransition });
    assertReports({ delivery, reportDelivery: json(path.join(candidate, REPORT, 'delivery.json')),
        buildVerification: json(path.join(candidate, REPORT, 'build-verification.json')),
        checksumText: readFileLimited(path.join(candidate, NEXT, 'bundle.sha256'), 4096).bytes.toString('utf8'), expectedDelivery, expectedVerification });
    process.stdout.write(JSON.stringify({ ok: true, releaseId: delivery.releaseId, sourceCommit: expectedCommit,
        signedArchiveReread: true, sourceBindingsRechecked: true, historicalBaseAuthenticated: true, completePayloadReconstructed: true,
        candidateCodeExecuted: false, operatorRecoveryPathAvailable: false, productionReleaseApproved: false }) + '\n');
}
module.exports = { main, exactSourceBindings, assertFullPayload, assertReports, reconstructPayload };
if (require.main === module) { try { main(); } catch { process.stderr.write('R7_TRUSTED_VERIFICATION_REJECTED\n'); process.exitCode = 1; } }
