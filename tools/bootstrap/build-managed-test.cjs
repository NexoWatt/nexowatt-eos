'use strict';
// Manufacturer candidate only. Requires exact native evidence and persistent
// externally held signing authority. No publication and no Pi installation.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const bundle = require('../../runtime/release/bundle.cjs');
const product = require('../../runtime/product/scope.cjs');
const build = require('../system/build-bundle.cjs');
const fresh = require('../integration/prepare-security-refresh.cjs');
const native = require('../integration/verify-security-refresh-native.cjs');
const { createManagedArchive } = require('../integration/create-managed-archive.cjs');
const { componentTreeDigest } = require('../../runtime/policy/admission.cjs');
const nodeRuntime = require('../integration/prepare-node-runtime.cjs');
const nodePolicy = require('../../runtime/updates/node-policy.cjs');
const ROOT = path.resolve(__dirname, '../..');
const fail = code => { throw Object.assign(new Error(code), { code }); };
function git(args) {
    const result = cp.spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', timeout: 10000, maxBuffer: 1048576 });
    if (result.status !== 0 || result.error) fail('MANAGED_BUILD_GIT'); return result.stdout.trim();
}
function main(argv) {
    const flags = ['--prepared-runtime', '--native-evidence', '--private-key', '--public-key-sha256', '--sequence', '--node-archive'];
    if (argv.length !== 12 || flags.some((name, i) => argv[i * 2] !== name) || !/^[a-f0-9]{64}$/.test(argv[7])) fail('MANAGED_BUILD_USAGE');
    const sequence = Number(argv[9]);
    if (!/^[1-9][0-9]*$/.test(argv[9]) || !Number.isSafeInteger(sequence) || sequence < 15) fail('MANAGED_BUILD_SEQUENCE');
    if (process.platform !== 'linux' || process.versions.node !== nodeRuntime.policy.currentVersion || git(['status', '--porcelain'])) fail('MANAGED_BUILD_CLEAN_HOST');
    const keyFile = argv[5];
    if (!path.isAbsolute(keyFile) || path.resolve(keyFile) !== keyFile || fs.realpathSync(keyFile) !== keyFile || keyFile.startsWith(ROOT + path.sep)) fail('MANAGED_BUILD_PRIVATE_LOCATION');
    const stat = fs.lstatSync(keyFile);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.uid !== process.getuid() || stat.mode & 0o077) fail('MANAGED_BUILD_PRIVATE_MODE');
    const sourceCommit = git(['rev-parse', 'HEAD']);
    const output = path.join(ROOT, 'delivery/managed-test-' + sequence);
    if (fs.existsSync(output)) fail('MANAGED_BUILD_IMMUTABLE_OUTPUT');
    const prepared = fresh.verifyPrepared({ directory: argv[1], sourceCommit, sequence });
    const pinnedNode = nodeRuntime.verifyArchive(argv[11], prepared.record.nodeVersion);
    if (pinnedNode.sha256 !== prepared.record.nodeRuntime.archiveSha256) fail('MANAGED_BUILD_NODE_BINDING');
    const evidence = native.verifyNativeEvidence({ directory: argv[3], sourceCommit, files: prepared.files,
        record: prepared.record, runtimeBuildSha256: bundle.sha256(fs.readFileSync(prepared.recordFile)) });
    fs.mkdirSync(path.join(ROOT, '.work'), { recursive: true });
    const work = path.join(ROOT, '.work/managed-test-' + sequence);
    if (fs.existsSync(work)) fail('MANAGED_BUILD_IMMUTABLE_OUTPUT');
    fs.mkdirSync(work, { mode: 0o700 });
    const payload = path.join(work, 'payload');
    const files = build.preparePayload({ appDirectory: prepared.app, destination: payload, catalogFile: prepared.catalogFile,
        sbomFile: prepared.sbomFile, nodeRuntimeDirectory: prepared.nodeRuntimeDirectory,
        releaseScope: product.SECURITY_REFRESH_TEST, networkProfile: true, managedProfile: true });
    fs.copyFileSync(prepared.recordFile, path.join(payload, 'runtime-build.json'), fs.constants.COPYFILE_EXCL);
    fs.chmodSync(path.join(payload, 'runtime-build.json'), 0o644);
    const catalog = structuredClone(prepared.catalog);
    for (const entry of catalog.entries) entry.sha256 = componentTreeDigest(build.componentRows(files, entry.package));
    fs.writeFileSync(path.join(payload, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
    const metadata = { schemaVersion: 1, product: 'nexowatt-eos', releaseVersion: '0.2.0-test.3', sequence,
        profile: 'test', nodeVersion: prepared.record.nodeVersion, platforms: ['linux-arm64'] };
    build.validatePayload(payload, { ...metadata, files: bundle.inventory(payload) });
    if (git(['status', '--porcelain']) || git(['rev-parse', 'HEAD']) !== sourceCommit) fail('MANAGED_BUILD_SOURCE_CHANGED');
    const key = bundle.readFileLimited(keyFile, 16384).bytes;
    let result;
    try { result = createManagedArchive({ payloadDirectory: payload, archivePath: path.join(work, 'eos-linux-arm64.tar.gz'),
        publicKeyPath: path.join(work, 'release-public.pem'), metadata, privateKey: key, expectedPublicKeySha256: argv[7] }); }
    finally { key.fill(0); }
    if (!Number.isSafeInteger(result.archiveBytes) || result.archiveBytes > nodePolicy.MAX_ARCHIVE_BYTES) fail('MANAGED_BUILD_CHANNEL_SIZE');
    fs.mkdirSync(output);
    for (const name of ['eos-linux-arm64.tar.gz', 'release-public.pem']) fs.copyFileSync(path.join(work, name), path.join(output, name), fs.constants.COPYFILE_EXCL);
    const delivery = { schemaVersion: 1, runtimeVersion: '0.2.0-test.3', deliveryRevision: sequence - 3, releaseSequence: sequence,
        archive: 'eos-linux-arm64.tar.gz', platform: 'linux-arm64', releaseId: result.releaseId,
        sha256: result.archiveSha256, bytes: result.archiveBytes, signingPublicKeySha256: result.signingPublicKeySha256,
        sourceCommit, nativeEvidence: evidence, archiveReadbackVerified: true, freshPiInstallationTested: false,
        productionReleaseApproved: false, published: false };
    fs.writeFileSync(path.join(output, 'delivery.json'), JSON.stringify(delivery, null, 2) + '\n', { flag: 'wx' });
    return delivery;
}
module.exports = { main };
if (require.main === module) { try { process.stdout.write(JSON.stringify(main(process.argv.slice(2))) + '\n'); }
    catch (error) { process.stderr.write((/^[A-Z][A-Z0-9_]+$/.test(error?.code || '') ? error.code : 'MANAGED_BUILD_FAILED') + '\n'); process.exitCode = 1; } }
