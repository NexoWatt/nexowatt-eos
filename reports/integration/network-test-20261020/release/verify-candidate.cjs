'use strict';
// Run from the trusted, committed source checkout, never from candidate data.
// Complete reconstruction authenticates all delivered bytes independently of
// candidate JSON claims and its newly generated TEST signing key.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');
const { isDeepStrictEqual: equal } = require('node:util');
const ROOT = path.resolve(__dirname, '../../../..');
const bundle = require(path.join(ROOT, 'runtime/release/bundle.cjs'));
const archiveTool = require(path.join(ROOT, 'tools/integration/create-test-archive.cjs'));
const r9 = require(path.join(ROOT, 'reports/integration/installable-test3-r9-20261005/build-revision.cjs'));
const builder = require('./build-revision.cjs');
const native = require('./native-evidence.cjs');
const { BASE, NEXT, REPORT, METADATA } = builder;
const fail = () => { throw Object.assign(new Error('R11_TRUSTED_VERIFICATION_REJECTED'), { code: 'R11_TRUSTED_VERIFICATION_REJECTED' }); };
const json = file => JSON.parse(bundle.readFileLimited(file, 16 * 1024 * 1024).bytes);
function assertEqual(expected, actual) { if (!equal(expected, actual)) fail(); }
function assertReports({ delivery, reportDelivery, buildVerification, checksumText, expectedDelivery, expectedVerification }) {
  assertEqual(expectedDelivery, delivery); assertEqual(expectedDelivery, reportDelivery); assertEqual(expectedVerification, buildVerification);
  if (checksumText !== `${expectedDelivery.sha256}  ${BASE.archive}\n${expectedDelivery.signingPublicKeySha256}  release-public.pem\n`) fail();
}
function verifySourceCheckout(sourceCommit) {
  if (!/^[a-f0-9]{40}$/.test(sourceCommit || '')) fail();
  const git = args => cp.execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', timeout: 10000 }).trim();
  const paths = ['components', 'runtime', 'tools', 'system', 'security', 'licenses', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'docs/history/UPSTREAM_README.md'];
  if (git(['rev-parse', 'HEAD']) !== sourceCommit || git(['diff', '--name-only', sourceCommit]) ||
      git(['ls-files', '--others', '--exclude-standard', '--', ...paths])) fail();
  for (const name of ['build-revision.cjs', 'native-evidence.cjs', 'verify-candidate.cjs']) {
    const relative = REPORT + '/' + name;
    const committed = cp.execFileSync('git', ['show', sourceCommit + ':' + relative], { cwd: ROOT, timeout: 10000, maxBuffer: 4 * 1024 * 1024 });
    if (!committed.equals(bundle.readFileLimited(path.join(ROOT, relative)).bytes)) fail();
  }
  return git(['show', '-s', '--format=%cI', sourceCommit]);
}
function reconstructPayload({ candidate, baseDirectory, final, sourceCommit, timestamp, nativeEvidenceDirectory }) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-r11-verify-'));
  try {
    const prepared = builder.prepareApp({ baseDirectory, work: path.join(scratch, 'prepared'), sourceCommit, timestamp });
    r9.requireCommittedSources(prepared.coverage);
    const payload = builder.prepareCandidatePayload(prepared, path.join(scratch, 'payload'));
    const canonical = archiveTool.canonicalInventory(payload.files, METADATA, payload.checked.architectureReports);
    assertEqual(canonical.files, payload.files); assertEqual(canonical.files, final.manifest.files);
    const nativeEvidence = native.verifyNativeEvidence({ directory: nativeEvidenceDirectory, sourceCommit,
      files: prepared.after, previousFiles: prepared.before, coverage: prepared.coverage, overlays: prepared.overlays });
    assertEqual(builder.sourceBinding(prepared, final), json(path.join(candidate, REPORT, 'signed-source-binding.json')));
    const sbomBytes = Buffer.from(JSON.stringify(prepared.sbom.bom, null, 2) + '\n');
    if (!sbomBytes.equals(bundle.readFileLimited(path.join(candidate, REPORT, 'runtime.cdx.json'), 16 * 1024 * 1024).bytes)) fail();
    assertEqual({ ...prepared.sbom.evidence, deliveredSbomSha256: bundle.sha256(sbomBytes) }, json(path.join(candidate, REPORT, 'runtime-derivative-sbom.json')));
    if (final.manifest.files.find(row => row.path === 'sbom.cdx.json')?.sha256 !== bundle.sha256(sbomBytes)) fail();
    const previous = prepared.updateBaseline;
    return { previousDelivery: prepared.updateDelivery, prebuilt: prepared.prebuilt, installedComponents: payload.checked.productInventory,
      transition: builder.transitionEvidence(previous, { ...final, catalog: payload.catalog }), nativeEvidence };
  } finally { fs.rmSync(scratch, { recursive: true, force: true }); }
}
function parseArgs(argv) {
  const [candidate, sourceCommit] = argv;
  if (![4, 6].includes(argv.length) || !path.isAbsolute(candidate || '') || path.resolve(candidate) !== candidate ||
      !/^[a-f0-9]{40}$/.test(sourceCommit || '')) fail();
  return { candidate, sourceCommit, ...builder.parseArgs(argv.slice(2)) };
}
function main(argv = process.argv.slice(2)) {
  if (process.platform !== 'linux' || process.versions.node !== METADATA.nodeVersion) fail();
  const { candidate, sourceCommit, nativeEvidenceDirectory, baseDirectory: givenBase } = parseArgs(argv);
  if (fs.realpathSync(candidate) !== candidate || !fs.lstatSync(candidate).isDirectory()) fail();
  const timestamp = verifySourceCheckout(sourceCommit);
  const delivery = json(path.join(candidate, NEXT, 'delivery.json'));
  if (delivery.sourceCommit !== sourceCommit || delivery.deliveryRevision !== 11 || delivery.releaseSequence !== 14 ||
      delivery.physicalControlEnabled !== false || delivery.operatorRecoveryPathAvailable !== false || delivery.productionReleaseApproved !== false) fail();
  const archive = path.join(candidate, NEXT, BASE.archive), key = bundle.readFileLimited(path.join(candidate, NEXT, 'release-public.pem'), 16384).bytes;
  const bytes = bundle.readFileLimited(archive, 100 * 1024 * 1024).bytes, signingPublicKeySha256 = bundle.sha256(key);
  if (bundle.sha256(bytes) !== delivery.sha256 || bytes.length !== delivery.bytes || signingPublicKeySha256 !== delivery.signingPublicKeySha256) fail();
  const final = archiveTool.verifyTestArchive({ archivePath: archive, publicKey: key, expectedReleaseId: delivery.releaseId, platform: 'linux-arm64' });
  for (const name of Object.keys(METADATA)) assertEqual(METADATA[name], final.manifest[name]);
  const baseDirectory = givenBase || path.join(ROOT, BASE.directory);
  const historical = [];
  for (const directory of new Set([baseDirectory, path.join(ROOT, 'delivery')])) if (fs.existsSync(directory))
    for (const row of r9.historicalInventory(directory)) {
      const absolute = path.join(directory, row.path);
      if (!absolute.startsWith(path.join(ROOT, NEXT) + path.sep)) historical.push({ ...row, absolute });
    }
  const reconstructed = reconstructPayload({ candidate, baseDirectory, final, sourceCommit, timestamp, nativeEvidenceDirectory });
  for (const row of historical) {
    const old = bundle.readFileLimited(row.absolute, 128 * 1024 * 1024).bytes;
    if (old.length !== row.size || bundle.sha256(old) !== row.sha256) fail();
  }
  verifySourceCheckout(sourceCommit);
  const release = { ...final, signingPublicKeySha256 };
  const expectedDelivery = builder.deliveryMetadata({ previousDelivery: reconstructed.previousDelivery, release, sourceCommit, installedComponents: reconstructed.installedComponents });
  const expectedVerification = builder.verificationMetadata({ sourceCommit, timestamp, release, historicalCount: historical.length,
    nativeEvidence: reconstructed.nativeEvidence, transition: reconstructed.transition, prebuilt: reconstructed.prebuilt });
  assertReports({ delivery, reportDelivery: json(path.join(candidate, REPORT, 'delivery.json')),
    buildVerification: json(path.join(candidate, REPORT, 'build-verification.json')),
    checksumText: bundle.readFileLimited(path.join(candidate, NEXT, 'bundle.sha256'), 4096).bytes.toString('utf8'), expectedDelivery, expectedVerification });
  process.stdout.write(JSON.stringify({ ok: true, releaseId: final.releaseId, sourceCommit, signedArchiveReread: true,
    sourceBindingsRechecked: true, historicalBaseAuthenticated: true, completePayloadReconstructed: true,
    nativeEvidenceRechecked: true, candidateCodeExecuted: false, operatorRecoveryPathAvailable: false, productionReleaseApproved: false }) + '\n');
}
module.exports = { assertEqual, assertReports, verifySourceCheckout, reconstructPayload, parseArgs, main };
if (require.main === module) try { main(); } catch { process.stderr.write('R11_TRUSTED_VERIFICATION_REJECTED\n'); process.exitCode = 1; }
