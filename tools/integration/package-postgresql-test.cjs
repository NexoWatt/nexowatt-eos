'use strict';
// Reproducible package assembly from an observed tree, not a release approval.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const { inventory, sha256, verifyBundle } = require('../../runtime/release/bundle.cjs');
const { componentTreeDigest } = require('../../runtime/policy/admission.cjs');
const { main: build } = require('../system/build-bundle.cjs');
const REPO = path.resolve(__dirname, '../..');
function packageTest(directory) {
    const base = path.resolve(directory), app = path.join(base, 'app');
    const catalog = JSON.parse(fs.readFileSync(path.join(REPO, 'reports/integration/stabilization/arm64/catalog.json')));
    const files = inventory(app);
    catalog.catalogRevision = 2;
    for (const entry of catalog.entries) {
        const prefix = `node_modules/${entry.package}/`;
        entry.sha256 = componentTreeDigest(files.filter(row => row.path.startsWith(prefix)).map(row => ({ path: row.path.slice(prefix.length), size: row.size, sha256: row.sha256 })));
        entry.communication = 'eos-postgresql-mtls13-v1';
        entry.permissions.protocols = entry.permissions.protocols.map(name => name === 'eos-redis-tls13-v1' ? entry.communication : name);
        entry.review.evidenceId = 'eos-postgresql-test-install-20261002';
    }
    const save = (file, value) => fs.writeFileSync(path.join(base, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
    save('catalog.json', catalog);
    const metadata = { schemaVersion: 1, product: 'nexowatt-eos', releaseVersion: '0.2.0-test.2', sequence: 3,
        profile: 'test', nodeVersion: '24.21.0', platforms: ['linux-arm64'] };
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
    const result = verifyBundle({ bundleDirectory: bundle, publicKey, minimumSequence: 0, nodeVersion: '24.21.0', platform: 'linux-arm64' });
    const archive = path.join(base, 'eos-0.2.0-test.2-linux-arm64.tar.gz');
    const tar = cp.spawnSync('/usr/bin/tar', ['--sort=name', '--mtime=2026-10-02 00:00:00Z', '--owner=0', '--group=0', '--numeric-owner', '-czf', archive, '-C', base, 'bundle'], { encoding: 'utf8', timeout: 120000 });
    if (tar.status !== 0 || tar.error) throw new Error('PG_ARCHIVE_FAILED');
    const delivery = { schemaVersion: 1, sourceVersion: '0.2.0-dev.7', runtimeVersion: metadata.releaseVersion, releaseId: result.releaseId,
        signingPublicKeySha256: sha256(publicKey), archive: path.basename(archive), sha256: sha256(fs.readFileSync(archive)), bytes: fs.statSync(archive).size,
        signedFiles: result.manifest.files.length, platform: 'linux-arm64', database: 'postgresql',
        scope: 'isolated fresh Debian13 Pi5 test; Admin/UI; no physical control', targetTestRequired: true, productionReleaseApproved: false };
    save('delivery.json', delivery); return delivery;
}
module.exports = { packageTest };
if (require.main === module) {
    try { if(process.argv.length!==3) throw new Error('PG_PACKAGE_USAGE'); process.stdout.write(JSON.stringify(packageTest(process.argv[2])) + '\n'); }
    catch(error) { process.stderr.write((error.code || error.message) + '\n'); process.exitCode = 1; }
}
