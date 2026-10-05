'use strict';
// Executes trusted checkout tooling only. Reconstruct the entire candidate from
// authenticated R8 + current committed sources; never execute candidate code.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');
const bundle = require('../../../runtime/release/bundle.cjs');
const { verifyTestArchive, canonicalInventory } = require('../../../tools/integration/create-test-archive.cjs');
const builder = require('./build-revision.cjs');
const { BASE, NEXT, REPORT, METADATA, prepareApp, prepareCandidatePayload, transitionEvidence, bindingMetadata,
    deliveryMetadata, verificationMetadata, historicalInventory } = builder;
const ROOT = path.resolve(__dirname, '../../..');
const fail = () => { throw Object.assign(new Error('R9_TRUSTED_VERIFICATION_REJECTED'), { code: 'R9_TRUSTED_VERIFICATION_REJECTED' }); };
const json = file => JSON.parse(bundle.readFileLimited(file, 16 * 1024 * 1024).bytes);
function assertEqual(expected, actual) { if (JSON.stringify(expected) !== JSON.stringify(actual)) fail(); }
function assertReports({ delivery, reportDelivery, buildVerification, checksumText, expectedDelivery, expectedVerification }) {
    assertEqual(expectedDelivery, delivery); assertEqual(expectedDelivery, reportDelivery); assertEqual(expectedVerification, buildVerification);
    if (checksumText !== `${expectedDelivery.sha256}  ${BASE.archive}\n${expectedDelivery.signingPublicKeySha256}  release-public.pem\n`) fail();
}
function verifySourceCheckout(sourceCommit) {
    const git = args => cp.execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', timeout: 10000 }).trim();
    const paths = ['components', 'runtime', 'tools', 'system', 'security', 'licenses', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'docs/history/UPSTREAM_README.md'];
    if (git(['rev-parse', 'HEAD']) !== sourceCommit || git(['diff', '--name-only', sourceCommit]) ||
        git(['ls-files', '--others', '--exclude-standard', '--', ...paths])) fail();
    for (const relative of [REPORT + '/build-revision.cjs', REPORT + '/verify-candidate.cjs', 'tools/integration/bind-r9-derivative-sbom.cjs']) {
        const committed = cp.execFileSync('git', ['show', sourceCommit + ':' + relative], { cwd: ROOT, timeout: 10000, maxBuffer: 4 * 1024 * 1024 });
        if (!committed.equals(bundle.readFileLimited(path.join(ROOT, relative)).bytes)) fail();
    }
    return git(['show', '-s', '--format=%cI', sourceCommit]);
}
function reconstructPayload({ candidate, baseDirectory, final, sourceCommit, timestamp, keyHash }) {
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-r9-verify-'));
    try {
        const prepared = prepareApp({ baseDirectory, work: path.join(scratch, 'prepared'), sourceCommit, timestamp });
        builder.requireCommittedSources(prepared.coverage);
        const payload = prepareCandidatePayload(prepared, path.join(scratch, 'payload'));
        assertEqual(canonicalInventory(payload.files, METADATA, payload.checked.architectureReports).files, final.manifest.files);
        const binding = bindingMetadata(prepared, final, sourceCommit, keyHash);
        assertEqual(binding, json(path.join(candidate, REPORT, 'signed-source-binding.json')));
        assertEqual(prepared.derivative.bom, json(path.join(candidate, REPORT, 'runtime.cdx.json')));
        const sbomBytes = Buffer.from(JSON.stringify(prepared.derivative.bom, null, 2) + '\n');
        if (!sbomBytes.equals(bundle.readFileLimited(path.join(candidate, REPORT, 'runtime.cdx.json'), 16 * 1024 * 1024).bytes)) fail();
        assertEqual({ ...prepared.derivative.evidence, previousSbomExactBytesSha256: bundle.sha256(prepared.previousSbomBytes), deliveredSbomSha256: bundle.sha256(sbomBytes) },
            json(path.join(candidate, REPORT, 'runtime-derivative-sbom.json')));
        const previous = { ...prepared.checked, catalog: json(path.join(prepared.oldPayload, 'catalog.json')) };
        return { prepared, installedComponents: payload.checked.productInventory,
            authenticatedBaselineTransition: transitionEvidence(previous, { ...final, catalog: payload.catalog }) };
    } finally { fs.rmSync(scratch, { recursive: true, force: true }); }
}
function main(argv = process.argv.slice(2)) {
    const [candidate, sourceCommit] = argv;
    if (process.platform !== 'linux' || process.versions.node !== METADATA.nodeVersion || ![4, 6].includes(argv.length) ||
        !path.isAbsolute(candidate || '') || !/^[a-f0-9]{40}$/.test(sourceCommit || '')) fail();
    const options = builder.parseArgs(argv.slice(2));
    const timestamp = verifySourceCheckout(sourceCommit);
    const delivery = json(path.join(candidate, NEXT, 'delivery.json'));
    if (delivery.sourceCommit !== sourceCommit || delivery.deliveryRevision !== 9 || delivery.releaseSequence !== 12 ||
        delivery.physicalControlEnabled !== false || delivery.operatorRecoveryPathAvailable !== false || delivery.productionReleaseApproved !== false) fail();
    const archive = path.join(candidate, NEXT, BASE.archive), key = bundle.readFileLimited(path.join(candidate, NEXT, 'release-public.pem'), 16384).bytes;
    const bytes = bundle.readFileLimited(archive, 100 * 1024 * 1024).bytes, keyHash = bundle.sha256(key);
    if (bundle.sha256(bytes) !== delivery.sha256 || bytes.length !== delivery.bytes || keyHash !== delivery.signingPublicKeySha256) fail();
    const final = verifyTestArchive({ archivePath: archive, publicKey: key, expectedReleaseId: delivery.releaseId, platform: 'linux-arm64' });
    for (const key of Object.keys(METADATA)) assertEqual(METADATA[key], final.manifest[key]);
    const nativeManagementEvidence = require('../../../tools/bootstrap/verify-r9-native-evidence.cjs').verifyNativeEvidence({
        directory: options.nativeEvidenceDirectory, sourceCommit, files: final.manifest.files, appPrefix: 'app/' });
    const baseDirectory = options.baseDirectory || path.join(ROOT, BASE.directory);
    const reconstructed = reconstructPayload({ candidate, baseDirectory, final, sourceCommit, timestamp, keyHash });
    let historicalCount = 0;
    for (const directory of new Set([baseDirectory, path.join(ROOT, 'delivery')])) if (fs.existsSync(directory))
        historicalCount += historicalInventory(directory).filter(row => !path.join(directory, row.path).startsWith(path.join(ROOT, NEXT) + path.sep)).length;
    const release = { ...final, signingPublicKeySha256: keyHash };
    const expectedDelivery = deliveryMetadata({ previousDelivery: reconstructed.prepared.delivery, release, sourceCommit, installedComponents: reconstructed.installedComponents });
    const expectedVerification = verificationMetadata({ sourceCommit, timestamp, release, historicalCount,
        authenticatedBaselineTransition: reconstructed.authenticatedBaselineTransition, prebuilt: reconstructed.prepared.prebuilt, nativeManagementEvidence });
    assertReports({ delivery, reportDelivery: json(path.join(candidate, REPORT, 'delivery.json')),
        buildVerification: json(path.join(candidate, REPORT, 'build-verification.json')),
        checksumText: bundle.readFileLimited(path.join(candidate, NEXT, 'bundle.sha256'), 4096).bytes.toString('utf8'), expectedDelivery, expectedVerification });
    process.stdout.write(JSON.stringify({ ok: true, releaseId: final.releaseId, sourceCommit, signedArchiveReread: true, sourceBindingsRechecked: true,
        historicalBaseAuthenticated: true, completePayloadReconstructed: true, candidateCodeExecuted: false, operatorRecoveryPathAvailable: false, productionReleaseApproved: false }) + '\n');
}
module.exports = { assertEqual, assertReports, verifySourceCheckout, reconstructPayload, main };
if (require.main === module) { try { main(); } catch { process.stderr.write('R9_TRUSTED_VERIFICATION_REJECTED\n'); process.exitCode = 1; } }
