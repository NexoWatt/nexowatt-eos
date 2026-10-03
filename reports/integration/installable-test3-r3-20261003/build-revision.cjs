'use strict';
// Run from this checkout on the original Windows build host. All destinations
// must be fresh. Reuses only the previously built app and its bound evidence;
// the payload is prepared again from current host/runtime sources.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const { inventory, sha256 } = require(path.join(root, 'runtime/release/bundle.cjs'));
const { copyDirectory } = require(path.join(root, 'tools/system/build-bundle.cjs'));
const { digestArchive } = require(path.join(root, 'tools/system/install-from-checkout.cjs'));
if (process.platform !== 'win32' || process.versions.node !== '24.21.0' || !process.env.TEMP)
    throw new Error('REVISION_BUILD_HOST');
const previous = path.join(process.env.TEMP, 'eos-first-start-build-20261003-r2');
const output = path.join(root, '.work/runtime-test3-r3-20261003');
const stages = [];
const save = (name, data) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
function run(name, args) {
    process.stdout.write(name + ' started\n');
    const started = new Date().toISOString();
    const result = cp.spawnSync(process.execPath, args, { cwd: root, shell: false, windowsHide: true,
        timeout: 3600000, maxBuffer: 32 * 1024 * 1024, encoding: 'utf8' });
    fs.writeFileSync(path.join(__dirname, name + '.stdout.log'), result.stdout || '', { flag: 'wx' });
    fs.writeFileSync(path.join(__dirname, name + '.stderr.log'), result.stderr || '', { flag: 'wx' });
    stages.push({ name, program: process.execPath, args, started, finished: new Date().toISOString(),
        exitCode: result.status, errorCode: result.error?.code || null });
    save(name + '.command.json', stages[stages.length - 1]);
    if (result.error || result.status !== 0) throw new Error('REVISION_BUILD_STAGE_FAILED ' + name);
    process.stdout.write(name + ' passed\n');
}
function files(directory) { return inventory(directory).map(({ path, size, sha256 }) => ({ path, size, sha256 })); }
function oldDeliveries() {
    return ['test-pi-0.2.0-test.1', 'test-pi-0.2.0-test.2', 'test-pi-0.2.0-test.3', 'test-pi-0.2.0-test.3-r2',
        'bootstrap-test3-r2-pending-trust', 'bootstrap-test3-r2', 'bootstrap-test3-r2-apt']
        .flatMap(name => files(path.join(root, 'delivery', name)).map(row => ({ ...row, path: 'delivery/' + name + '/' + row.path })));
}
const historical = oldDeliveries();
run('revision-regression', ['--test', 'tests/system/install-from-checkout.test.cjs',
    'tests/integration/postgresql-catalog-payload.test.cjs', 'tests/integration/test-archive.test.cjs', 'tests/system/sudo-policy.test.cjs']);
const originalApp = files(path.join(previous, 'app'));
fs.mkdirSync(output);
process.stdout.write('copy verified existing app started\n');
copyDirectory(path.join(previous, 'app'), path.join(output, 'app'));
const copiedApp = files(path.join(output, 'app'));
if (JSON.stringify(originalApp) !== JSON.stringify(copiedApp)) throw new Error('REVISION_APP_COPY_MISMATCH');
const evidenceNames = ['assembly.json', 'build-evidence.json', 'controller-transform.json', 'native-transform.json',
    'runtime.raw.cdx.json', 'runtime.cdx.json', 'runtime-sbom-coverage.json'];
const reusedEvidence = evidenceNames.map(name => {
    const expected = digestArchive(path.join(previous, name));
    fs.copyFileSync(path.join(previous, name), path.join(output, name), fs.constants.COPYFILE_EXCL);
    if (digestArchive(path.join(output, name)) !== expected) throw new Error('REVISION_EVIDENCE_COPY_MISMATCH');
    return { path: name, sha256: expected };
});
save('app-reuse.json', { schemaVersion: 1, originalBuild: previous, output, appFiles: originalApp.length,
    appBytes: originalApp.reduce((total, row) => total + row.size, 0),
    inventoryDigestAlgorithm: 'sha256(JSON.stringify(sorted path,size,sha256 array))',
    originalAppInventorySha256: sha256(JSON.stringify(originalApp)), copiedAppInventorySha256: sha256(JSON.stringify(copiedApp)),
    exactAppContentMatch: true, reusedEvidence, npmInstallPerformed: false, sbomRegenerated: false,
    reason: 'Only signed host sudo-policy evaluation changes; original app, lock and app-bound SBOM are byte-identical.' });
run('package', ['tools/integration/package-postgresql-test.cjs', output]);
if (JSON.stringify(files(path.join(previous, 'app'))) !== JSON.stringify(originalApp) ||
    JSON.stringify(files(path.join(output, 'app'))) !== JSON.stringify(copiedApp)) throw new Error('REVISION_APP_CHANGED');
run('deliver', ['tools/integration/deliver-postgresql-test.cjs', output]);
if (JSON.stringify(oldDeliveries()) !== JSON.stringify(historical)) throw new Error('REVISION_HISTORICAL_DELIVERY_CHANGED');
save('historical-delivery-preservation.json', { schemaVersion: 1, checkedAfterDelivery: true,
    allFilesByteIdentical: true, files: historical });
for (const name of [...evidenceNames, 'delivery.json', 'release-metadata.json'])
    fs.copyFileSync(path.join(output, name), path.join(__dirname, name), fs.constants.COPYFILE_EXCL);
for (const name of ['package.json', 'package-lock.json'])
    fs.copyFileSync(path.join(output, 'app', name), path.join(__dirname, 'runtime-' + name), fs.constants.COPYFILE_EXCL);
save('build-verification.json', { schemaVersion: 1, output, host: process.platform + '-' + process.arch,
    node: process.versions.node, deliveryRevision: 3, releaseSequence: 6, commands: stages,
    completedBuildPassed: true, originalAndCopiedAppUnchanged: true, historicalDeliveriesUnchanged: true,
    nativeTargetExecutionPerformed: false, hardwareTested: false, productionReleaseApproved: false,
    files: fs.readdirSync(__dirname).sort().filter(name => fs.statSync(path.join(__dirname, name)).isFile())
        .map(name => ({ path: name, sha256: digestArchive(path.join(__dirname, name)) })) });
process.stdout.write(JSON.stringify({ ok: true, output,
    delivery: JSON.parse(fs.readFileSync(path.join(output, 'delivery.json'))) }) + '\n');
