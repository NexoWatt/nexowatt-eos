'use strict';
// Reproducible package assembly from an observed tree, not a release approval.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const { inventory, sha256, verifyBundle } = require('../../runtime/release/bundle.cjs');
const { componentTreeDigest } = require('../../runtime/policy/admission.cjs');
const { main: build } = require('../system/build-bundle.cjs');
const product = require('../../runtime/product/scope.cjs');
const REPO = path.resolve(__dirname, '../..');
function packageTest(directory) {
    // chmod(0600) on Windows does not provide the required POSIX private-key
    // ownership boundary. Assembly/SBOM inspection may run there; signing may
    // only start on the reviewed Linux build host.
    if (process.platform !== 'linux') throw new Error('PG_LINUX_SIGNING_HOST_REQUIRED');
    const base = path.resolve(directory), app = path.join(base, 'app');
    const installedComponents = product.inspectApp(app);
    const assembly = JSON.parse(fs.readFileSync(path.join(base, 'assembly.json'), 'utf8'));
    if (!['linux-arm64', 'linux-x64'].includes(assembly.platform) || assembly.productProfile !== product.PROFILE) throw new Error('PG_PRODUCT_ASSEMBLY_REQUIRED');
    const catalog = { schemaVersion: 1, kind: 'eos-adapter-admission', catalogRevision: 3,
        entries: product.SPECS.map(spec => ({ id: spec.id, package: spec.package, version: spec.version,
            sha256: '', digestKind: 'tree-sha256-v1', kind: spec.kind, required: spec.execute,
            review: { status: spec.execute ? 'approved-test' : 'pending', evidenceId: spec.execute ? 'eos-first-start-20261002' : null },
            permissions: { capabilities: spec.kind === 'core' ? ['state.read', 'state.write', 'process.fixed'] : ['state.read', 'state.write', ...(spec.execute ? ['https.listen', 'https.client'] : [])],
                protocols: ['eos-postgresql-mtls13-v1', ...(spec.execute && spec.kind === 'adapter' ? ['https'] : [])],
                network: 'declared-endpoints-and-discovery', shellExec: false, additionalNpmModules: [], arbitraryCode: false },
            communication: 'eos-postgresql-mtls13-v1' })) };
    const files = inventory(app);
    for (const entry of catalog.entries) {
        const prefix = `node_modules/${entry.package}/`;
        entry.sha256 = componentTreeDigest(files.filter(row => row.path.startsWith(prefix)).map(row => ({ path: row.path.slice(prefix.length), size: row.size, sha256: row.sha256 })));
        entry.communication = 'eos-postgresql-mtls13-v1';
        entry.permissions.protocols = entry.permissions.protocols.map(name => name === 'eos-redis-tls13-v1' ? entry.communication : name);
    }
    const save = (file, value) => fs.writeFileSync(path.join(base, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
    save('catalog.json', catalog);
    const metadata = { schemaVersion: 1, product: 'nexowatt-eos', releaseVersion: '0.2.0-test.3', sequence: 4,
        profile: 'test', nodeVersion: '24.21.0', platforms: [assembly.platform] };
    save('release-metadata.json', metadata);
    const keyDirectory = path.join(base, 'test-signing-private'); fs.mkdirSync(keyDirectory, { mode: 0o700 });
    const keys = crypto.generateKeyPairSync('ed25519');
    const secret = keys.privateKey.export({ type: 'pkcs8', format: 'pem' });
    const publicKey = keys.publicKey.export({ type: 'spki', format: 'pem' });
    const privateFile = path.join(keyDirectory, 'release-private.pem'); fs.writeFileSync(privateFile, secret, { flag: 'wx', mode: 0o600 });
    fs.writeFileSync(path.join(base, 'release-public.pem'), publicKey, { flag: 'wx', mode: 0o644 });
    const bundle = path.join(base, 'bundle');
    build(['--app', app, '--catalog', path.join(base,'catalog.json'), '--sbom', path.join(base,'runtime.cdx.json'),
        '--metadata', path.join(base,'release-metadata.json'), '--private-key', privateFile, '--output', bundle]);
    const result = verifyBundle({ bundleDirectory: bundle, publicKey, minimumSequence: 0, nodeVersion: '24.21.0', platform: assembly.platform });
    const archive = path.join(base, `eos-0.2.0-test.3-${assembly.platform}.tar.gz`);
    const tar = cp.spawnSync('/usr/bin/tar', ['--sort=name', '--mtime=2026-10-02 00:00:00Z', '--owner=0', '--group=0', '--numeric-owner', '-czf', archive, '-C', base, 'bundle'], { encoding: 'utf8', timeout: 120000 });
    if (tar.status !== 0 || tar.error) throw new Error('PG_ARCHIVE_FAILED');
    const delivery = { schemaVersion: 1, sourceVersion: '0.2.0-dev.9', runtimeVersion: metadata.releaseVersion, releaseId: result.releaseId,
        signingPublicKeySha256: sha256(publicKey), archive: path.basename(archive), sha256: sha256(fs.readFileSync(archive)), bytes: fs.statSync(archive).size,
        signedFiles: result.manifest.files.length, platform: assembly.platform, database: 'postgresql',
        productProfile: product.PROFILE, installedComponents,
        scope: 'full required package installation; HTTPS first-start; management activation only; physical adapters pending acceptance',
        configured: false, physicalControlEnabled: false, targetTestRequired: true, productionReleaseApproved: false };
    save('delivery.json', delivery); return delivery;
}
module.exports = { packageTest };
if (require.main === module) {
    try { if(process.argv.length!==3) throw new Error('PG_PACKAGE_USAGE'); process.stdout.write(JSON.stringify(packageTest(process.argv[2])) + '\n'); }
    catch(error) { process.stderr.write((error.code || error.message) + '\n'); process.exitCode = 1; }
}
