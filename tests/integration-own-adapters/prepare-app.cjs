'use strict';
// Manufacturer/test preparation only. Authenticated R9 dependencies remain unchanged;
// current own package bytes and explicit controller transforms are unsigned candidates.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const { checkedRoot } = require('../integration-controller/run-native.cjs');
const bundle = require('../../runtime/release/bundle.cjs');
const { verifyTestArchive } = require('../../tools/integration/create-test-archive.cjs');
const { copyDirectory } = require('../../tools/system/build-bundle.cjs');
const builder = require('../../reports/integration/installable-test3-r9-20261005/build-revision.cjs');
const product = require('../../runtime/product/scope.cjs');
const own = require('../../runtime/bootstrap/own-adapter-enrollment.cjs');
const { NODE, BASE_RELEASE_ID, sha, contentRows, validatePreparation } = require('./fixture.cjs');
const ROOT = path.resolve(__dirname, '../..');
const BASE = Object.freeze({ archive: 'eos-0.2.0-test.3-linux-arm64.tar.gz', bytes: 88944737,
    sha256: '8adad353b83de5f396cb9402442f430d65f70e9538390e8b02b6073bc21e7d31',
    keySha256: '018e554d65105fa012fcd443f23077018fcd6e6bcf03af8f6fdedffdc4f74b04' });
function prepare(input, baseDirectory) {
    const root = checkedRoot(input);
    if (!path.isAbsolute(baseDirectory || '') || process.versions.node !== NODE) throw new Error('OWN_NATIVE_PREPARE_INPUT');
    const archive = path.join(baseDirectory, BASE.archive), key = fs.readFileSync(path.join(baseDirectory, 'release-public.pem'));
    const bytes = bundle.readFileLimited(archive, 100 * 1024 * 1024).bytes;
    if (bytes.length !== BASE.bytes || sha(bytes) !== BASE.sha256 || sha(key) !== BASE.keySha256) throw new Error('OWN_NATIVE_BASE_PINS');
    const verified = verifyTestArchive({ archivePath: archive, publicKey: key, expectedReleaseId: BASE_RELEASE_ID, platform: 'linux-arm64' });
    if (verified.manifest.sequence !== 12 || verified.manifest.nodeVersion !== NODE || verified.manifest.profile !== 'test') throw new Error('OWN_NATIVE_BASE_SCOPE');
    const sourceCommit = cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8', timeout: 5000 }).trim();
    const sourceTreeClean = cp.execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], { cwd: ROOT, encoding: 'utf8', timeout: 5000 }).trim() === '';
    const work = path.join(root, 'own-adapters-build');
    fs.mkdirSync(work, { mode: 0o700 });
    cp.execFileSync('/usr/bin/python3', ['-I', '-B', path.join(ROOT, 'tools/system/extract-test-bundle.py'),
        '--archive', archive, '--destination', path.join(work, 'r9'), '--sha256', BASE.sha256], { timeout: 120000, maxBuffer: 65536 });
    const authenticated = bundle.verifyBundle({ bundleDirectory: path.join(work, 'r9/bundle'), publicKey: key, platform: 'linux-arm64', nodeVersion: NODE });
    if (authenticated.releaseId !== BASE_RELEASE_ID) throw new Error('OWN_NATIVE_BASE_SIGNATURE');
    const baselineApp = path.join(work, 'baseline'), app = path.join(work, 'app');
    copyDirectory(path.join(authenticated.payloadPath, 'app'), baselineApp); copyDirectory(baselineApp, app);
    const before = bundle.inventory(app), coverage = builder.sourceEntries();
    const prebuilt = builder.verifyPrebuilt(coverage);
    const overlay = builder.overlaySource(app, before, coverage);
    const profile = own.profileValue();
    if (JSON.stringify(profile.adapters) !== JSON.stringify(product.admittedAdapters(product.OWN_ADAPTER_TEST))) throw new Error('OWN_NATIVE_PROFILE_SCOPE');
    const controllerProfile = 'node_modules/iobroker.js-controller/eos-test-profile.json';
    fs.writeFileSync(path.join(app, controllerProfile), JSON.stringify(profile, null, 2) + '\n');
    fs.chmodSync(path.join(app, controllerProfile), 0o644);
    const backupState = require('../../runtime/controller-profile/backup-state.cjs');
    backupState.applyToBuild(app);
    backupState.verifyBuild(app);
    own.pinnedAdapters(app); product.inspectApp(app, product.OWN_ADAPTER_TEST);
    const after = bundle.inventory(app), byPath = new Map(before.map(row => [row.path, row]));
    const transformed = new Set([controllerProfile,
        'node_modules/@iobroker/js-controller-cli/build/cjs/lib/setup/setupBackup.js',
        'node_modules/@iobroker/js-controller-cli/build/esm/lib/setup/setupBackup.js']);
    for (const row of after) {
        const previous = byPath.get(row.path); byPath.delete(row.path);
        if (!builder.ownSourcePath(row.path) && !transformed.has(row.path) && JSON.stringify(previous) !== JSON.stringify(row)) throw new Error('OWN_NATIVE_DEPENDENCY_CHANGED');
    }
    if ([...byPath.keys()].some(name => !builder.ownSourcePath(name))) throw new Error('OWN_NATIVE_DEPENDENCY_REMOVED');
    const sourceBinding = { schemaVersion: 1, sourceCommit, sourceTreeClean, signed: false, unsignedFixture: true,
        previousSignatureVerified: true, previousReleaseId: BASE_RELEASE_ID, ownSourceCoverage: coverage, ownOverlay: overlay.bindings,
        allowedControllerTransforms: [...transformed], prebuilt, physicalHardwareTested: false, productionReleaseApproved: false };
    fs.writeFileSync(path.join(root, 'own-adapters-source-binding.json'), JSON.stringify(sourceBinding, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    const record = validatePreparation({ schemaVersion: 1, kind: 'unsigned-own-adapters-native-preparation', signed: false, unsignedFixture: true,
        sequence: 13, nodeVersion: NODE, app, baselineApp, sourceCommit, sourceTreeClean, previousReleaseId: BASE_RELEASE_ID,
        previousSignatureVerified: true, appContentSha256: sha(JSON.stringify(contentRows(app))),
        baselineContentSha256: sha(JSON.stringify(contentRows(baselineApp))) }, root);
    fs.writeFileSync(path.join(root, 'own-adapters-native-prepared.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    process.stdout.write('OWN_NATIVE_UNSIGNED_APP_PREPARED\n');
    return record;
}
module.exports = { BASE, prepare };
if (require.main === module) {
    try { if (process.argv.length !== 4) throw new Error('OWN_NATIVE_USAGE'); prepare(...process.argv.slice(2)); }
    catch { process.stderr.write('OWN_NATIVE_PREPARATION_FAILED\n'); process.exitCode = 1; }
}
