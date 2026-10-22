'use strict';
// Sign an explicitly qualified Node-only candidate without replacing retained
// host/application sources with the manufacturer's current checkout.
const fs = require('node:fs');
const path = require('node:path');
const { isDeepStrictEqual: equal } = require('node:util');
const bundle = require('../../runtime/release/bundle.cjs');
const build = require('../system/build-bundle.cjs');
const fresh = require('../integration/prepare-security-refresh.cjs');
const retained = require('../integration/prepare-node-only-runtime.cjs');
const native = require('../integration/verify-security-refresh-native.cjs');
const node = require('../integration/prepare-node-runtime.cjs');
const policy = require('../../runtime/updates/node-policy.cjs');
const automatic = require('../../runtime/updates/automatic-node.cjs');
const { validateTransition } = require('../system/update-managed-release.cjs');
const { createManagedArchive } = require('../integration/create-managed-archive.cjs');
const ROOT = path.resolve(__dirname, '../..');
const fail = code => { throw Object.assign(new Error(code), { code }); };
function assertPreparedBinding(baseline, prepared) {
    const previous = JSON.parse(bundle.readFileLimited(path.join(baseline.payloadPath, 'runtime-build.json'), 32 * 1024 * 1024).bytes);
    const expected = retained.recordFor(baseline, previous, { sourceCommit: prepared.record.sourceCommit,
        sequence: prepared.record.sequence, nodeRuntime: prepared.record.nodeRuntime });
    const expectedBom = retained.rebindSbom(JSON.parse(bundle.readFileLimited(path.join(baseline.payloadPath, 'sbom.cdx.json'), 32 * 1024 * 1024).bytes), previous, expected);
    const appRows = baseline.manifest.files.filter(row => row.path.startsWith('app/')).map(row => ({ ...row, path: row.path.slice(4) }));
    if (!equal(prepared.record, expected) || !equal(prepared.files, appRows) ||
        !equal(JSON.parse(bundle.readFileLimited(prepared.sbomFile, 32 * 1024 * 1024).bytes), expectedBom) ||
        !fs.readFileSync(prepared.catalogFile).equals(bundle.readFileLimited(path.join(baseline.payloadPath, 'catalog.json'), 1024 * 1024).bytes)) fail('NODE_ONLY_PREPARED_CHANGED');
    return true;
}
function copyCandidatePayload(baseline, prepared, destination) {
    assertPreparedBinding(baseline, prepared);
    build.copyDirectory(baseline.payloadPath, destination);
    // The signed POSIX table is authoritative even when the signer's private
    // work session uses umask 077. Never broaden unrelated host files.
    for (const row of baseline.manifest.files) fs.chmodSync(path.join(destination, row.path), row.mode);
    for (const [target, source] of [[policy.BINARY, path.join(prepared.nodeRuntimeDirectory, 'bin/node')],
        [policy.DESCRIPTOR, path.join(prepared.nodeRuntimeDirectory, 'runtime.json')], [policy.LICENSE, path.join(prepared.nodeRuntimeDirectory, 'LICENSE')],
        ['sbom.cdx.json', prepared.sbomFile], ['runtime-build.json', prepared.recordFile]]) {
        const file = path.join(destination, target);
        fs.unlinkSync(file);
        fs.writeFileSync(file, bundle.readFileLimited(source, policy.MAX_ARCHIVE_BYTES).bytes,
            { flag: 'wx', mode: target === policy.BINARY ? 0o755 : 0o644 });
        fs.chmodSync(file, target === policy.BINARY ? 0o755 : 0o644);
    }
    return destination;
}
function assemblePayload(baseline, prepared, destination) {
    copyCandidatePayload(baseline, prepared, destination);
    const metadata = { schemaVersion: 1, product: 'nexowatt-eos', releaseVersion: '0.2.0-test.3', sequence: prepared.record.sequence,
        profile: 'test', nodeVersion: prepared.record.nodeVersion, platforms: ['linux-arm64'] };
    const manifest = { ...metadata, files: bundle.inventory(destination) };
    const releaseId = bundle.sha256(Buffer.from(JSON.stringify(manifest) + '\n'));
    const next = { releaseId, manifest, ...build.validatePayload(destination, manifest) };
    validateTransition(baseline, next, { expectedReleaseId: releaseId });
    automatic.assertTransition(baseline, next);
    return { metadata, next };
}
function main(argv) {
    const flags = ['--baseline-bundle', '--public-key', '--public-key-sha256', '--prepared-runtime', '--native-evidence', '--private-key', '--sequence', '--node-archive'];
    if (argv.length !== flags.length * 2 || flags.some((flag, index) => argv[index * 2] !== flag) ||
        !/^[a-f0-9]{64}$/.test(argv[5]) || !/^[1-9][0-9]*$/.test(argv[13])) fail('NODE_ONLY_SIGN_USAGE');
    const sourceCommit = fresh.source(), sequence = fresh.sequenceValue(Number(argv[13]));
    const baseline = retained.authenticateBaseline({ bundleDirectory: argv[1], publicKeyFile: argv[3], publicKeySha256: argv[5] });
    const prepared = fresh.verifyPrepared({ directory: argv[7], sourceCommit, sequence });
    assertPreparedBinding(baseline, prepared);
    const archive = node.verifyArchive(argv[15], prepared.record.nodeVersion);
    if (archive.sha256 !== prepared.record.nodeRuntime.archiveSha256) fail('NODE_ONLY_NODE_CHANGED');
    const evidence = native.verifyNativeEvidence({ directory: argv[9], sourceCommit, files: prepared.files,
        record: prepared.record, runtimeBuildSha256: bundle.sha256(fs.readFileSync(prepared.recordFile)) });
    const keyFile = argv[11];
    if (!path.isAbsolute(keyFile) || path.resolve(keyFile) !== keyFile || fs.realpathSync(keyFile) !== keyFile ||
        keyFile === ROOT || keyFile.startsWith(ROOT + path.sep)) fail('NODE_ONLY_PRIVATE_LOCATION');
    const stat = fs.lstatSync(keyFile);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.uid !== process.getuid() || stat.mode & 0o077) fail('NODE_ONLY_PRIVATE_MODE');
    const output = path.join(ROOT, 'delivery/managed-test-' + sequence), work = path.join(ROOT, '.work/node-only-test-' + sequence);
    if (fs.existsSync(output) || fs.existsSync(work)) fail('NODE_ONLY_IMMUTABLE_OUTPUT');
    fs.mkdirSync(path.dirname(work), { recursive: true }); fs.mkdirSync(work, { mode: 0o700 });
    const payload = path.join(work, 'payload'), { metadata } = assemblePayload(baseline, prepared, payload);
    if (fresh.source() !== sourceCommit) fail('NODE_ONLY_SOURCE_CHANGED');
    const key = bundle.readFileLimited(keyFile, 16384).bytes;
    let result;
    try { result = createManagedArchive({ payloadDirectory: payload, archivePath: path.join(work, 'eos-linux-arm64.tar.gz'),
        publicKeyPath: path.join(work, 'release-public.pem'), metadata, privateKey: key, expectedPublicKeySha256: argv[5] }); }
    finally { key.fill(0); }
    automatic.assertTransition(baseline, { manifest: result.manifest, catalog: baseline.catalog });
    if (result.archiveBytes > policy.MAX_ARCHIVE_BYTES) fail('NODE_ONLY_CHANNEL_SIZE');
    fs.mkdirSync(output);
    for (const name of ['eos-linux-arm64.tar.gz', 'release-public.pem']) fs.copyFileSync(path.join(work, name), path.join(output, name), fs.constants.COPYFILE_EXCL);
    const delivery = { schemaVersion: 1, runtimeVersion: '0.2.0-test.3', deliveryRevision: sequence - 3, releaseSequence: sequence,
        archive: 'eos-linux-arm64.tar.gz', platform: 'linux-arm64', releaseId: result.releaseId, nodeVersion: metadata.nodeVersion,
        sha256: result.archiveSha256, bytes: result.archiveBytes, signingPublicKeySha256: result.signingPublicKeySha256,
        sourceCommit, nativeEvidence: evidence, nodeOnlyUpdate: prepared.record.nodeOnlyUpdate, automaticNodeUpdate: true,
        fromReleaseIds: [baseline.releaseId], archiveReadbackVerified: true, freshPiInstallationTested: false,
        productionReleaseApproved: false, published: false };
    fs.writeFileSync(path.join(output, 'delivery.json'), JSON.stringify(delivery, null, 2) + '\n', { flag: 'wx' });
    return delivery;
}
module.exports = { main, assertPreparedBinding, copyCandidatePayload, assemblePayload };
if (require.main === module) {
    try { process.stdout.write(JSON.stringify(main(process.argv.slice(2))) + '\n'); }
    catch (error) { process.stderr.write((/^[A-Z][A-Z0-9_]+$/.test(error?.code || '') ? error.code : 'NODE_ONLY_SIGN_FAILED') + '\n'); process.exitCode = 1; }
}
