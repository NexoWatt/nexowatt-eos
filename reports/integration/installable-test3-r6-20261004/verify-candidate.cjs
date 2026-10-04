'use strict';
// Trusted checkout code: no script from the candidate archive is executed.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');
const { sha256, readFileLimited, inventory } = require('../../../runtime/release/bundle.cjs');
const { verifyTestArchive, canonicalInventory } = require('../../../tools/integration/create-test-archive.cjs');
const { appRows, bindDerivative } = require('../../../tools/integration/bind-r6-derivative-sbom.cjs');
const { BASE, NEXT, sourceEntries, assertOverlayDelta, verifyBase, authenticateR4, backupPreparation } = require('./build-revision.cjs');
const { preparePayload, componentRows, validatePayload } = require('../../../tools/system/build-bundle.cjs');
const { validateTransition } = require('../../../tools/system/update-test-to-r6.cjs');
const { componentTreeDigest } = require('../../../runtime/policy/admission.cjs');
const ROOT = path.resolve(__dirname, '../../..');
const REPORT = path.relative(ROOT, __dirname);
const fail = () => { throw Object.assign(new Error('R6_TRUSTED_VERIFICATION_REJECTED'), { code: 'R6_TRUSTED_VERIFICATION_REJECTED' }); };
const json = file => JSON.parse(readFileLimited(file, 16 * 1024 * 1024).bytes);
function exactSourceBindings({ root, manifest, binding, entries }) {
    const files = new Map(manifest.files.map(row => [row.path, row]));
    if (files.size !== manifest.files.length || !Array.isArray(binding.sourceCoverage) || !Array.isArray(binding.hostFiles)) fail();
    const expected = entries.map(row => ({ ...row, target: 'app/' + row.target }));
    if (expected.length !== binding.sourceCoverage.length) fail();
    const coverage = new Map(binding.sourceCoverage.map(row => [row.target, row]));
    if (coverage.size !== expected.length) fail();
    const check = (source, target, declared) => {
        const signed = files.get(target), bytes = readFileLimited(path.join(root, source)).bytes;
        if (!declared || declared.source !== source || declared.target !== target || !signed ||
            signed.size !== bytes.length || signed.sha256 !== sha256(bytes) || declared.bytes !== signed.size || declared.sha256 !== signed.sha256) fail();
    };
    for (const row of expected) check(row.source, row.target, coverage.get(row.target));
    const host = manifest.files.filter(row => ['runtime/', 'tools/', 'security/', 'system/'].some(prefix => row.path.startsWith(prefix)));
    const declaredHost = new Map(binding.hostFiles.map(row => [row.target, row]));
    if (host.length !== binding.hostFiles.length || declaredHost.size !== host.length || !host.some(row => row.path === 'tools/system/update-test-to-r6.cjs')) fail();
    for (const row of host) check(row.path, row.path, declaredHost.get(row.path));
}
function assertFullPayload(expected, actual) {
    if (JSON.stringify(expected) !== JSON.stringify(actual)) fail();
}
function reconstructPayload({ candidate, base, final, sourceCommit, timestamp }) {
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-r6-verify-'));
    const execute = (program, args) => cp.execFileSync(program, args, { cwd: ROOT, encoding: 'utf8', timeout: 180000, maxBuffer: 1024 * 1024 });
    try {
        for (const [archive, destination, hash] of [[base.archive, 'base', BASE.sha256], [path.join(candidate, NEXT, BASE.archive), 'candidate', final.archiveSha256]]) {
            execute('/usr/bin/python3', ['-I', '-B', 'tools/system/extract-test-bundle.py', '--archive', archive, '--destination', path.join(scratch, destination), '--sha256', hash]);
        }
        const basePayload = path.join(scratch, 'base/bundle/payload');
        const app = path.join(scratch, 'candidate/bundle/payload/app');
        const previousSbomBytes = readFileLimited(path.join(basePayload, 'sbom.cdx.json'), 16 * 1024 * 1024).bytes;
        const derivative = bindDerivative({ app, previousManifest: base.checked.manifest, previousSbom: JSON.parse(previousSbomBytes),
            previousReleaseId: BASE.releaseId, sourceCommit, timestamp });
        const sbomBytes = Buffer.from(JSON.stringify(derivative.bom, null, 2) + '\n');
        const reportSbom = readFileLimited(path.join(candidate, REPORT, 'runtime.cdx.json'), 16 * 1024 * 1024).bytes;
        if (!sbomBytes.equals(reportSbom)) fail();
        const expectedEvidence = { ...derivative.evidence, previousSbomExactBytesSha256: sha256(previousSbomBytes), deliveredSbomSha256: sha256(sbomBytes) };
        if (JSON.stringify(expectedEvidence) !== JSON.stringify(json(path.join(candidate, REPORT, 'runtime-derivative-sbom.json')))) fail();
        const sbomFile = path.join(scratch, 'sbom.cdx.json'), catalogFile = path.join(scratch, 'catalog.json');
        fs.writeFileSync(sbomFile, sbomBytes);
        const previousCatalog = json(path.join(basePayload, 'catalog.json'));
        const catalog = structuredClone(previousCatalog); catalog.catalogRevision = 5;
        fs.writeFileSync(catalogFile, JSON.stringify(catalog, null, 2) + '\n');
        const payload = path.join(scratch, 'expected-payload');
        const prepared = preparePayload({ appDirectory: app, destination: payload, catalogFile, sbomFile });
        for (const entry of catalog.entries) entry.sha256 = componentTreeDigest(componentRows(prepared, entry.package));
        fs.writeFileSync(path.join(payload, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
        // Reconstruct EVERY expected row: host files, licenses, policy, catalog,
        // SBOM, app and canonical native modes. Candidate omissions/additions
        // and a self-signed relaxed catalog cannot approve themselves.
        const files = inventory(payload);
        const checked = validatePayload(payload, { ...final.manifest, files });
        const canonical = canonicalInventory(files, final.manifest, checked.architectureReports);
        assertFullPayload(canonical.files, final.manifest.files);
        const r4 = authenticateR4(scratch), target = { ...final, catalog };
        for (const previous of [r4, { ...base.checked, catalog: previousCatalog }])
            validateTransition(previous, target, { expectedReleaseId: final.releaseId });
    } finally { fs.rmSync(scratch, { recursive: true, force: true }); }
}
function main(argv = process.argv.slice(2)) {
    const [candidate, expectedCommit] = argv;
    if (argv.length !== 2 || !path.isAbsolute(candidate || '') || !/^[a-f0-9]{40}$/.test(expectedCommit || '')) fail();
    const delivery = json(path.join(candidate, NEXT, 'delivery.json'));
    const binding = json(path.join(candidate, REPORT, 'signed-source-binding.json'));
    if (delivery.sourceCommit !== expectedCommit || binding.sourceCommit !== expectedCommit || binding.previousReleaseId !== BASE.releaseId ||
        delivery.deliveryRevision !== 6 || delivery.releaseSequence !== 9 || delivery.physicalControlEnabled !== false || delivery.productionReleaseApproved !== false) fail();
    if (JSON.stringify(binding.backupPreparation) !== JSON.stringify(backupPreparation())) fail();
    const archive = path.join(candidate, NEXT, BASE.archive), key = readFileLimited(path.join(candidate, NEXT, 'release-public.pem'), 16384).bytes;
    const archiveBytes = readFileLimited(archive, 100 * 1024 * 1024).bytes;
    if (sha256(archiveBytes) !== delivery.sha256 || archiveBytes.length !== delivery.bytes || sha256(key) !== delivery.signingPublicKeySha256) fail();
    const final = verifyTestArchive({ archivePath: archive, publicKey: key, expectedReleaseId: delivery.releaseId, platform: 'linux-arm64' });
    if (final.manifest.sequence !== 9 || final.manifest.profile !== 'test' || final.manifest.nodeVersion !== '24.21.0' || final.manifest.releaseVersion !== '0.2.0-test.3' || JSON.stringify(final.manifest.platforms) !== '["linux-arm64"]') fail();
    const base = verifyBase(path.join(ROOT, BASE.directory));
    exactSourceBindings({ root: ROOT, manifest: final.manifest, binding, entries: sourceEntries() });
    const before = appRows(base.checked.manifest), after = appRows(final.manifest);
    if (!Array.isArray(binding.overlays)) fail();
    const coverage = new Map(binding.sourceCoverage.map(row => [row.target, row]));
    for (const row of binding.overlays) {
        if (JSON.stringify(coverage.get(row.target)) !== JSON.stringify(row)) fail();
    }
    assertOverlayDelta(before, after, binding.overlays.map(row => ({ ...row, target: row.target.slice(4) })));
    const protectedRows = manifest => manifest.files.filter(row => row.path.startsWith('system/') || row.path === 'runtime/postgresql/schema.sql');
    if (JSON.stringify(protectedRows(final.manifest)) !== JSON.stringify(protectedRows(base.checked.manifest))) fail();
    const timestamp = cp.execFileSync('git', ['show', '-s', '--format=%cI', expectedCommit], { cwd: ROOT, encoding: 'utf8', timeout: 10000 }).trim();
    reconstructPayload({ candidate, base, final, sourceCommit: expectedCommit, timestamp });
    process.stdout.write(JSON.stringify({ ok: true, releaseId: delivery.releaseId, sourceCommit: expectedCommit,
        signedArchiveReread: true, sourceBindingsRechecked: true, historicalBaseAuthenticated: true, completePayloadReconstructed: true, productionReleaseApproved: false }) + '\n');
}
module.exports = { main, exactSourceBindings, assertFullPayload, reconstructPayload };
if (require.main === module) { try { main(); } catch { process.stderr.write('R6_TRUSTED_VERIFICATION_REJECTED\n'); process.exitCode = 1; } }
