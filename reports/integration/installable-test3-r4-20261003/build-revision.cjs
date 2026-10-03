'use strict';
// Build-only revision from the authenticated published R3 app, never npm/latest.
// No network, target execution, persistent private key or publication occurs.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const ROOT = path.resolve(__dirname, '../../..');
const PREVIOUS_DIRECTORY = 'delivery/test-pi-0.2.0-test.3-r3';
const PREVIOUS_REPORT = 'reports/integration/installable-test3-r3-20261003';
const NEXT_DIRECTORY = 'delivery/test-pi-0.2.0-test.3-r4';
const NEXT_BOOTSTRAP = 'delivery/bootstrap-test3-r4';
const ARCHIVE = 'eos-0.2.0-test.3-linux-arm64.tar.gz';
const PREVIOUS = Object.freeze({
    archiveSha256: '743781feebfaadb3f2404ba3dca2768e050a30c4db5e3cc6445d49ddbd6efe11',
    archiveBytes: 88547053,
    publicKeySha256: '8a8adbdd515c5125ad380653234f1dee4c12dafb1b504d57fc9940b48097b1b0',
    releaseId: '343e639e8283f40df3608281c62a1fd7cd6cac4e7492b2b2bbdb0ebdd1484828',
    licenseTrustSha256: '470dce1dec8f4a5da87339e9166aed025789ea86ab85613f2c508f5e9d434b6f',
});
// Published R3 evidence pins, observed at main 66a3762f75e9e0ffc56159fe7142f6059dd550b3.
const EVIDENCE = Object.freeze({
    'assembly.json': '1cef477bc263b5012348d18c8e6a55182e668a7640cf9561d7c993b49b607be3',
    'build-evidence.json': 'd4ca28d4f9e99a2a63179f7043bae3c690a5fa413ec46fab4ab9ed4ea145a8bb',
    'controller-transform.json': '5ee7d04ed3e115fb38473492c9b18556f6e21c749699e959f3f6c4cffc15b72a',
    'native-transform.json': '8e99eae587c917a7642a93d6d5ae58ab5f3bc1336a28b1b50603e424933d80d0',
    'runtime.raw.cdx.json': 'd5bbcebab23938b2d0700ad3dc6d0ae0945a5e15880df3e399f7b2de1933890f',
    'runtime.cdx.json': '1b4b155abdc097582b2664fc47f5862f5140ed06f1cf1f1fa83da824a2463348',
    'runtime-sbom-coverage.json': 'c01f8100bec79a75fc3103967285b60d403a9fc0f8cef042b629e0fb487a99c1',
});
function requireThat(condition, code) { if (!condition) throw new Error(code); }
function assertPreviousDelivery(delivery, keyHash) {
    requireThat(delivery?.runtimeVersion === '0.2.0-test.3' && delivery.deliveryRevision === 3 &&
        delivery.releaseSequence === 6 && delivery.platform === 'linux-arm64' && delivery.archive === ARCHIVE &&
        delivery.sha256 === PREVIOUS.archiveSha256 && delivery.bytes === PREVIOUS.archiveBytes &&
        delivery.releaseId === PREVIOUS.releaseId && delivery.signingPublicKeySha256 === PREVIOUS.publicKeySha256 &&
        keyHash === PREVIOUS.publicKeySha256 && delivery.productionReleaseApproved === false &&
        delivery.physicalControlEnabled === false, 'REVISION_PREVIOUS_DELIVERY');
}
function appRows(manifest) {
    const rows = manifest.files.filter(row => row.path.startsWith('app/'))
        .map(({ path: name, size, sha256 }) => ({ path: name.slice(4), size, sha256 }));
    requireThat(rows.length > 0, 'REVISION_PREVIOUS_APP_EMPTY');
    return rows;
}
function assertSameContent(expected, observed) {
    requireThat(JSON.stringify(expected) === JSON.stringify(observed), 'REVISION_APP_CONTENT_MISMATCH');
}
function main() {
    requireThat(process.argv.length === 2 && process.platform === 'linux' && Number(process.versions.node.split('.')[0]) === 24,
        'REVISION_BUILD_HOST');
    const bundle = require(path.join(ROOT, 'runtime/release/bundle.cjs'));
    const { copyDirectory } = require(path.join(ROOT, 'tools/system/build-bundle.cjs'));
    const checkout = require(path.join(ROOT, 'tools/system/install-from-checkout.cjs'));
    const { verifyTestArchive } = require(path.join(ROOT, 'tools/integration/create-test-archive.cjs'));
    requireThat(checkout.DELIVERY_REVISION === 4 && checkout.RELEASE_SEQUENCE === 7 && checkout.DELIVERY_DIRECTORY === NEXT_DIRECTORY,
        'REVISION_CURRENT_PROFILE');
    const report = bundle.trustedDirectory(__dirname);
    const commands = [];
    const save = (name, data) => fs.writeFileSync(path.join(report, name), JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
    function run(name, program, args, timeout = 1200000) {
        const started = new Date().toISOString();
        process.stdout.write(name + ' started\n');
        const result = cp.spawnSync(program, args, { cwd: ROOT, shell: false, encoding: 'utf8', timeout,
            maxBuffer: 32 * 1024 ** 2, env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });
        for (const [stream, bytes] of [['stdout', result.stdout], ['stderr', result.stderr]])
            fs.writeFileSync(path.join(report, name + '.' + stream + '.log'), bytes || '', { flag: 'wx' });
        const record = { name, program, args, started, finished: new Date().toISOString(),
            exitCode: result.status, errorCode: result.error?.code || null };
        commands.push(record); save(name + '.command.json', record);
        requireThat(!result.error && result.status === 0, 'REVISION_STAGE_FAILED ' + name);
        process.stdout.write(name + ' passed\n');
        return result.stdout;
    }
    const files = directory => bundle.inventory(directory).map(({ path: name, size, sha256 }) => ({ path: name, size, sha256 }));
    const sourceCommit = cp.spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8', timeout: 10000 });
    requireThat(sourceCommit.status === 0 && /^[a-f0-9]{40}\s*$/.test(sourceCommit.stdout || ''), 'REVISION_GIT_SOURCE');
    const dirty = cp.spawnSync('git', ['status', '--porcelain', '--untracked-files=normal'], { cwd: ROOT, encoding: 'utf8', timeout: 10000 });
    requireThat(dirty.status === 0 && dirty.stdout === '', 'REVISION_CLEAN_CHECKOUT_REQUIRED');
    for (const destination of [NEXT_DIRECTORY, NEXT_BOOTSTRAP])
        requireThat(!fs.existsSync(path.join(ROOT, destination)), 'REVISION_FRESH_DELIVERY_REQUIRED');
    const historicalNames = fs.readdirSync(path.join(ROOT, 'delivery')).sort();
    function historicalFiles() {
        return historicalNames.flatMap(name => {
            const source = path.join(ROOT, 'delivery', name);
            if (fs.lstatSync(source).isDirectory()) return files(source)
                .map(row => ({ ...row, path: 'delivery/' + name + '/' + row.path }));
            const bytes = bundle.readFileLimited(source).bytes;
            return [{ path: 'delivery/' + name, size: bytes.length, sha256: bundle.sha256(bytes) }];
        });
    }
    const historical = historicalFiles();
    const previousDirectory = path.join(ROOT, PREVIOUS_DIRECTORY);
    const previousKey = bundle.readFileLimited(path.join(previousDirectory, 'release-public.pem'), 16384).bytes;
    const previousDelivery = JSON.parse(bundle.readFileLimited(path.join(previousDirectory, 'delivery.json'), 65536).bytes);
    assertPreviousDelivery(previousDelivery, bundle.sha256(previousKey));
    const previousArchive = path.join(previousDirectory, ARCHIVE);
    requireThat(checkout.digestArchive(previousArchive) === PREVIOUS.archiveSha256, 'REVISION_PREVIOUS_ARCHIVE_HASH');
    const checked = verifyTestArchive({ archivePath: previousArchive, publicKey: previousKey,
        expectedReleaseId: PREVIOUS.releaseId, platform: 'linux-arm64' });
    requireThat(checked.manifest.sequence === 6 && checked.manifest.profile === 'test' &&
        checked.manifest.releaseVersion === '0.2.0-test.3' && checked.archiveSha256 === PREVIOUS.archiveSha256 &&
        checked.archiveBytes === PREVIOUS.archiveBytes, 'REVISION_PREVIOUS_SIGNATURE_BINDING');
    run('publication-scope-regression', '/usr/bin/python3', ['-I', '-B',
        'reports/integration/installable-test3-r4-20261003/publish-candidate.test.py']);
    run('revision-regression', process.execPath, ['--test',
        'reports/integration/installable-test3-r4-20261003/build-revision.test.cjs',
        'reports/integration/installable-test3-r4-20261003/entrypoint-reuse.test.cjs',
        'tests/system/install-from-checkout.test.cjs', 'tests/integration/postgresql-catalog-payload.test.cjs',
        'tests/integration/test-archive.test.cjs', 'tests/system/sudo-policy.test.cjs', 'tests/onboarding/frontend.test.cjs',
        'tests/postgresql/provision-permissions.test.cjs', 'tests/bootstrap/stability-entry.test.cjs']);
    const workRoot = path.join(ROOT, '.work'); fs.mkdirSync(workRoot, { recursive: true });
    const output = path.join(workRoot, 'runtime-test3-r4-20261003');
    fs.mkdirSync(output, { mode: 0o700 });
    const extracted = path.join(output, 'previous-archive');
    run('extract-previous', '/usr/bin/python3', ['-I', '-B', 'tools/system/extract-test-bundle.py',
        '--archive', previousArchive, '--destination', extracted, '--sha256', PREVIOUS.archiveSha256]);
    const originalApp = appRows(checked.manifest);
    const previousApp = path.join(extracted, 'bundle/payload/app');
    assertSameContent(originalApp, files(previousApp));
    copyDirectory(previousApp, path.join(output, 'app'));
    assertSameContent(originalApp, files(path.join(output, 'app')));
    const reusedEvidence = [];
    for (const [name, expectedHash] of Object.entries(EVIDENCE)) {
        const source = path.join(ROOT, PREVIOUS_REPORT, name);
        requireThat(checkout.digestArchive(source) === expectedHash, 'REVISION_EVIDENCE_HASH ' + name);
        fs.copyFileSync(source, path.join(output, name), fs.constants.COPYFILE_EXCL);
        requireThat(checkout.digestArchive(path.join(output, name)) === expectedHash, 'REVISION_EVIDENCE_COPY');
        reusedEvidence.push({ path: PREVIOUS_REPORT + '/' + name, sha256: expectedHash });
    }
    requireThat(checked.manifest.files.find(row => row.path === 'sbom.cdx.json')?.sha256 === EVIDENCE['runtime.cdx.json'],
        'REVISION_SBOM_ARCHIVE_BINDING');
    save('app-reuse.json', { schemaVersion: 1, sourceCommit: sourceCommit.stdout.trim(),
        previousArchive: PREVIOUS_DIRECTORY + '/' + ARCHIVE, previousArchiveSha256: PREVIOUS.archiveSha256,
        previousSignatureVerified: true, previousReleaseId: checked.releaseId,
        appFiles: originalApp.length, appBytes: originalApp.reduce((sum, row) => sum + row.size, 0),
        inventoryDigestAlgorithm: 'sha256(JSON.stringify(sorted path,size,sha256 array))',
        publishedAppInventorySha256: bundle.sha256(JSON.stringify(originalApp)),
        copiedAppInventorySha256: bundle.sha256(JSON.stringify(files(path.join(output, 'app')))),
        exactPublishedAppContentMatch: true, reusedEvidence, npmInstallPerformed: false, sbomRegenerated: false,
        reason: 'Reuses the authenticated published R3 app bytes and its existing bound SBOM; current runtime/host payload is rebuilt separately.' });
    run('package', process.execPath, ['tools/integration/package-postgresql-test.cjs', output]);
    assertSameContent(originalApp, files(previousApp));
    assertSameContent(originalApp, files(path.join(output, 'app')));
    run('deliver', process.execPath, ['tools/integration/deliver-postgresql-test.cjs', output]);
    const delivered = JSON.parse(bundle.readFileLimited(path.join(ROOT, NEXT_DIRECTORY, 'delivery.json'), 65536).bytes);
    requireThat(delivered.deliveryRevision === 4 && delivered.releaseSequence === 7 && delivered.privateKeyPersisted === false,
        'REVISION_DELIVERY_RESULT');
    const newKey = bundle.readFileLimited(path.join(ROOT, NEXT_DIRECTORY, 'release-public.pem'), 16384).bytes;
    const finalArchive = verifyTestArchive({ archivePath: path.join(ROOT, NEXT_DIRECTORY, ARCHIVE), publicKey: newKey,
        expectedReleaseId: delivered.releaseId, platform: 'linux-arm64' });
    assertSameContent(originalApp, appRows(finalArchive.manifest));
    run('bootstrap', process.execPath, ['tools/bootstrap/build-github-download.cjs',
        '--license-trust', path.join(ROOT, 'delivery/bootstrap-test3-r3/license-public-trust.json'),
        '--license-trust-sha256', PREVIOUS.licenseTrustSha256,
        '--release-public-key-sha256', delivered.signingPublicKeySha256,
        '--output', path.join(ROOT, NEXT_BOOTSTRAP)]);
    const after = historicalFiles();
    requireThat(JSON.stringify(historical) === JSON.stringify(after), 'REVISION_HISTORICAL_DELIVERY_CHANGED');
    save('historical-delivery-preservation.json', { schemaVersion: 1, allFilesByteIdentical: true, files: historical });
    for (const name of [...Object.keys(EVIDENCE), 'delivery.json', 'release-metadata.json'])
        fs.copyFileSync(path.join(output, name), path.join(report, name), fs.constants.COPYFILE_EXCL);
    for (const name of ['package.json', 'package-lock.json'])
        fs.copyFileSync(path.join(output, 'app', name), path.join(report, 'runtime-' + name), fs.constants.COPYFILE_EXCL);
    save('build-verification.json', { schemaVersion: 1, sourceCommit: sourceCommit.stdout.trim(),
        host: process.platform + '-' + process.arch, node: process.versions.node, deliveryRevision: 4, releaseSequence: 7,
        commands, completedBuildPassed: true, signedArchiveReadbackPassed: true,
        publishedR3AppUnchanged: true, historicalDeliveriesUnchanged: true,
        nativeTargetExecutionPerformed: false, hardwareTested: false, productionReleaseApproved: false,
        bootstrap: NEXT_BOOTSTRAP, published: false });
    process.stdout.write(JSON.stringify({ ok: true, deliveryDirectory: NEXT_DIRECTORY,
        bootstrapDirectory: NEXT_BOOTSTRAP, releaseId: delivered.releaseId, sequence: 7 }) + '\n');
}
module.exports = { PREVIOUS, ARCHIVE, assertPreviousDelivery, appRows, assertSameContent };
if (require.main === module) {
    try { main(); }
    catch (error) { process.stderr.write((/^REVISION_[A-Z_]+(?: [a-zA-Z0-9._-]+)?$/.test(error.message || '')
        ? error.message : 'REVISION_BUILD_FAILED') + '\n'); process.exitCode = 1; }
}
