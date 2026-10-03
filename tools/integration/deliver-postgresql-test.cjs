'use strict';
// Build-host delivery, after package-postgresql-test.cjs. No publishing or
// target execution. The destination must be fresh; verified bytes are pinned.
const fs = require('node:fs');
const path = require('node:path');
const { verifyTestArchive } = require('./create-test-archive.cjs');
const { inventory, readFileLimited, trustedDirectory, sha256 } = require('../../runtime/release/bundle.cjs');
const { runtimeLicenseNotices } = require('../system/build-bundle.cjs');
const { digestArchive } = require('../system/install-from-checkout.cjs');
const product = require('../../runtime/product/scope.cjs');
const ROOT = path.resolve(__dirname, '../..');
const ARCHIVE = 'eos-0.2.0-test.3-linux-arm64.tar.gz';
const REPORT = path.join(ROOT, 'reports/integration/installable-test3-20261003');
function deliver(directory) {
    trustedDirectory(ROOT);
    const base = trustedDirectory(path.resolve(directory));
    const metadata = readFileLimited(path.join(base, 'delivery.json'), 65536).bytes;
    const delivery = JSON.parse(metadata);
    const key = readFileLimited(path.join(base, 'release-public.pem'), 16384).bytes;
    if (delivery.archive !== ARCHIVE || delivery.runtimeVersion !== '0.2.0-test.3' || delivery.platform !== 'linux-arm64' ||
        delivery.productionReleaseApproved !== false || delivery.physicalControlEnabled !== false) throw new Error('DELIVERY_PROFILE');
    const checked = verifyTestArchive({ archivePath: path.join(base, ARCHIVE), publicKey: key,
        expectedReleaseId: delivery.releaseId, platform: 'linux-arm64' });
    if (checked.manifest.releaseVersion !== '0.2.0-test.3' || checked.manifest.profile !== 'test' || checked.manifest.nodeVersion !== '24.21.0' ||
        JSON.stringify(checked.manifest.platforms) !== '["linux-arm64"]' || delivery.releaseId !== checked.releaseId ||
        delivery.signedFiles !== checked.manifest.files.length || checked.archiveSha256 !== delivery.sha256 || checked.archiveBytes !== delivery.bytes ||
        sha256(key) !== delivery.signingPublicKeySha256) throw new Error('DELIVERY_MISMATCH');
    const byPath = new Map(checked.manifest.files.map(row => [row.path, row]));
    const sources = [];
    function bind(source, target, transformed) {
        const row = byPath.get(target), bytes = transformed ?? readFileLimited(path.join(ROOT, source)).bytes;
        if (!row || row.sha256 !== sha256(bytes) || row.size !== Buffer.byteLength(bytes)) throw new Error('SOURCE_DELIVERY_MISMATCH ' + source);
        sources.push({ source, target, sha256: row.sha256, bytes: row.size, ...(transformed ? { transformation: 'runtime-notice-paths' } : {}) });
    }
    function subtree(source, target = source) {
        const expected = inventory(path.join(ROOT, source)).map(row => row.path);
        const actual = checked.manifest.files.filter(row => row.path.startsWith(target + '/')).map(row => row.path.slice(target.length + 1));
        if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new Error('SOURCE_FILESET_MISMATCH ' + source);
        for (const relative of expected) bind(source + '/' + relative, target + '/' + relative);
    }
    subtree('runtime');
    for (const name of ['system/test-base/systemd', 'system/test-base/os-updates', 'system/postgresql-test/systemd']) subtree(name);
    const systemTools = ['host-preflight.cjs', 'install-host.cjs', 'postgresql-host-preflight.cjs', 'install-postgresql-host.cjs',
        'prepare-inputs.py', 'prepare-onboarding.cjs', 'prepare-first-start-context.cjs', 'finalize-onboarding.cjs', 'activate-release.cjs',
        'build-bundle.cjs', 'eos-base.cjs', 'onboard-ui.cjs', 'rotate-certificates.cjs', 'preflight-installation.cjs'];
    const expectedTools = systemTools.map(name => 'tools/system/' + name).sort();
    const actualTools = checked.manifest.files.filter(row => row.path.startsWith('tools/system/')).map(row => row.path).sort();
    if (JSON.stringify(expectedTools) !== JSON.stringify(actualTools)) throw new Error('SOURCE_TOOLSET_MISMATCH');
    for (const name of expectedTools) bind(name, name);
    for (const name of ['tools/integration/check-runtime-architecture.cjs', 'security/verify-runtime-tls.cjs']) bind(name, name);
    for (const prefix of ['', 'app/']) {
        bind('LICENSE', prefix + 'LICENSE');
        for (const row of inventory(path.join(ROOT, 'licenses'))) bind('licenses/' + row.path, prefix + 'licenses/' + row.path);
        bind('docs/history/UPSTREAM_README.md', prefix + 'licenses/upstream/README.ioBroker-Installer.md');
        bind('THIRD_PARTY_NOTICES.md', prefix + 'THIRD_PARTY_NOTICES.md', Buffer.from(runtimeLicenseNotices(
            readFileLimited(path.join(ROOT, 'THIRD_PARTY_NOTICES.md')).bytes.toString('utf8'), prefix ? '' : 'app/')));
    }
    for (const spec of product.SPECS.filter(row => row.source)) {
        const source = 'components/' + spec.source;
        const pkg = JSON.parse(readFileLimited(path.join(ROOT, source, 'package.json')).bytes);
        if (pkg.name !== spec.package || pkg.version !== spec.version || pkg.main !== spec.main) throw new Error('SOURCE_PACKAGE_IDENTITY');
        for (const relative of ['package.json', 'io-package.json', pkg.main, 'LICENSE']) bind(source + '/' + relative, 'app/node_modules/' + spec.package + '/' + relative);
    }
    for (const name of ['store', 'db-objects-postgresql', 'db-states-postgresql']) {
        const source = 'runtime/postgresql/packages/' + name;
        const pkg = JSON.parse(readFileLimited(path.join(ROOT, source, 'package.json')).bytes);
        for (const relative of ['package.json', pkg.main, 'LICENSE']) bind(source + '/' + relative, 'app/node_modules/' + pkg.name + '/' + relative);
    }
    for (const relative of ['www/ems-apps.js', 'ems/module-manager.js', 'ems/modules/storage-control.js', 'ems/services/feature-flags.js',
        'lib/eos-integrated.js', 'lib/license-bootstrap-access.js', 'packages/eos-license-client/index.js',
        'scripts/verify-stable-1.0.5-storage-protection-telemetry.cjs'])
        bind('components/ui/' + relative, 'app/node_modules/iobroker.nexowatt-ui/' + relative);
    for (const relative of ['build/lib/web.js', 'build/lib/eosLicenseCore.js', 'build/lib/eosLicenseService.js', 'build/lib/eosLicenseHttp.js',
        'public/nexowatt-invitation.html', 'public/nexowatt-invitation.js'])
        bind('components/admin/' + relative, 'app/node_modules/iobroker.eos-admin/' + relative);
    const destination = path.join(ROOT, 'delivery/test-pi-0.2.0-test.3');
    trustedDirectory(path.dirname(destination));
    trustedDirectory(REPORT);
    fs.mkdirSync(destination); // exclusive; existing deliveries are never replaced
    const expectedCopies = new Map([[ARCHIVE, checked.archiveSha256], ['release-public.pem', sha256(key)], ['delivery.json', sha256(metadata)]]);
    for (const [name, expectedHash] of expectedCopies) {
        const target = path.join(destination, name);
        fs.copyFileSync(path.join(base, name), target, fs.constants.COPYFILE_EXCL);
        if (digestArchive(target) !== expectedHash) throw new Error('DELIVERY_COPY_MISMATCH');
    }
    fs.writeFileSync(path.join(destination, 'bundle.sha256'), checked.archiveSha256 + '  ' + ARCHIVE + '\n', { flag: 'wx' });
    const save = (name, value) => fs.writeFileSync(path.join(REPORT, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
    save('signed-source-binding.json', { schemaVersion: 1, kind: 'final-workspace-to-signed-runtime-source-binding',
        releaseId: checked.releaseId, archiveSha256: checked.archiveSha256, files: sources, allMatched: true,
        scope: 'Expected runtime/system file sets, fixed tools, license texts, package identities/entrypoints and changed license UI functions. Not target execution.' });
    save('archive-delivery-verification.json', { schemaVersion: 1, releaseId: checked.releaseId, archiveSha256: checked.archiveSha256,
        archiveBytes: checked.archiveBytes, signingPublicKeySha256: delivery.signingPublicKeySha256,
        signedFiles: checked.manifest.files.length, archiveReadbackVerified: true, signatureVerified: true,
        copiedBytesMatchVerifiedHashes: true, sourceFilesMatched: sources.length,
        targetExecutionPerformed: false, hardwareTested: false, productionReleaseApproved: false });
    return { destination, releaseId: checked.releaseId, archiveSha256: checked.archiveSha256, sourceFilesMatched: sources.length };
}
module.exports = { deliver };
if (require.main === module) {
    try {
        if (process.argv.length !== 3) throw new Error('DELIVERY_USAGE');
        process.stdout.write(JSON.stringify(deliver(process.argv[2])) + '\n');
    } catch (error) { process.stderr.write(error.message + '\n'); process.exitCode = 1; }
}
