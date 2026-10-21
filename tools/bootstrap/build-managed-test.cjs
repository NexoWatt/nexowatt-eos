'use strict';
// Manufacturer candidate only. Requires exact native evidence and persistent
// externally held signing authority. No publication and no Pi installation.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const bundle = require('../../runtime/release/bundle.cjs');
const product = require('../../runtime/product/scope.cjs');
const build = require('../system/build-bundle.cjs');
const r10 = require('../../reports/integration/own-adapter-test-20261015/release/build-revision.cjs');
const native = require('../../reports/integration/own-adapter-test-20261015/release/native-evidence.cjs');
const { createManagedArchive } = require('../integration/create-managed-archive.cjs');
const { componentTreeDigest } = require('../../runtime/policy/admission.cjs');
const ROOT = path.resolve(__dirname, '../..');
const fail = code => { throw Object.assign(new Error(code), { code }); };
function git(args) {
    const result = cp.spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', timeout: 10000, maxBuffer: 1048576 });
    if (result.status !== 0 || result.error) fail('MANAGED_BUILD_GIT'); return result.stdout.trim();
}
function main(argv) {
    const flags = ['--native-evidence', '--private-key', '--public-key-sha256', '--sequence'];
    if (argv.length !== 8 || flags.some((name, i) => argv[i * 2] !== name) || !/^[a-f0-9]{64}$/.test(argv[5])) fail('MANAGED_BUILD_USAGE');
    const sequence = Number(argv[7]);
    if (!/^[1-9][0-9]*$/.test(argv[7]) || !Number.isSafeInteger(sequence) || sequence < 15) fail('MANAGED_BUILD_SEQUENCE');
    if (process.platform !== 'linux' || process.versions.node !== '24.21.0' || git(['status', '--porcelain'])) fail('MANAGED_BUILD_CLEAN_HOST');
    const keyFile = argv[3];
    if (!path.isAbsolute(keyFile) || path.resolve(keyFile) !== keyFile || keyFile.startsWith(ROOT + path.sep)) fail('MANAGED_BUILD_PRIVATE_LOCATION');
    const stat = fs.lstatSync(keyFile);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.uid !== process.getuid() || stat.mode & 0o077) fail('MANAGED_BUILD_PRIVATE_MODE');
    const sourceCommit = git(['rev-parse', 'HEAD']), timestamp = git(['show', '-s', '--format=%cI', 'HEAD']);
    const output = path.join(ROOT, 'delivery/managed-test-' + sequence);
    if (fs.existsSync(output)) fail('MANAGED_BUILD_IMMUTABLE_OUTPUT');
    fs.mkdirSync(path.join(ROOT, '.work'), { recursive: true });
    const prepared = r10.prepareApp({ baseDirectory: path.join(ROOT, r10.BASE.directory),
        work: path.join(ROOT, '.work/managed-test-' + sequence), sourceCommit, timestamp });
    const evidence = native.verifyNativeEvidence({ directory: argv[1], sourceCommit, files: prepared.after,
        previousFiles: prepared.before, coverage: prepared.coverage, overlays: prepared.overlays });
    const bom = structuredClone(prepared.sbom.bom);
    const changes = { 'eos:sbom:base-release-id': '97780e881765e2c9854e81ac7187b3ed120eccc8cc0dea0821492c9a54e23000', 'eos:sbom:assembly': 'authenticated-r9-app-reconstruction-with-managed-updates', 'eos:sbom:target-sequence': String(sequence) };
    bom.metadata.properties = bom.metadata.properties.filter(row => !Object.hasOwn(changes, row.name));
    bom.metadata.properties.push(...Object.entries(changes).map(([name, value]) => ({ name, value })));
    fs.writeFileSync(prepared.sbomFile, JSON.stringify(bom, null, 2) + '\n');
    const payload = path.join(prepared.work, 'payload');
    const files = build.preparePayload({ appDirectory: prepared.app, destination: payload, catalogFile: prepared.catalogFile,
        sbomFile: prepared.sbomFile, releaseScope: product.OWN_ADAPTER_TEST, networkProfile: true, managedProfile: true });
    const catalog = structuredClone(prepared.catalog);
    for (const entry of catalog.entries) entry.sha256 = componentTreeDigest(build.componentRows(files, entry.package));
    fs.writeFileSync(path.join(payload, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
    const metadata = { schemaVersion: 1, product: 'nexowatt-eos', releaseVersion: '0.2.0-test.3', sequence,
        profile: 'test', nodeVersion: '24.21.0', platforms: ['linux-arm64'] };
    build.validatePayload(payload, { ...metadata, files: bundle.inventory(payload) });
    if (git(['status', '--porcelain']) || git(['rev-parse', 'HEAD']) !== sourceCommit) fail('MANAGED_BUILD_SOURCE_CHANGED');
    const key = bundle.readFileLimited(keyFile, 16384).bytes;
    let result;
    try { result = createManagedArchive({ payloadDirectory: payload, archivePath: path.join(prepared.work, 'eos-linux-arm64.tar.gz'),
        publicKeyPath: path.join(prepared.work, 'release-public.pem'), metadata, privateKey: key, expectedPublicKeySha256: argv[5] }); }
    finally { key.fill(0); }
    fs.mkdirSync(output);
    for (const name of ['eos-linux-arm64.tar.gz', 'release-public.pem']) fs.copyFileSync(path.join(prepared.work, name), path.join(output, name), fs.constants.COPYFILE_EXCL);
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
