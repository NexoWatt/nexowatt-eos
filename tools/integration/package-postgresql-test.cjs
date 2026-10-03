'use strict';
// Reproducible package assembly from an observed tree, not a release approval.
const fs = require('node:fs');
const path = require('node:path');
const { componentTreeDigest } = require('../../runtime/policy/admission.cjs');
const { preparePayload, componentRows } = require('../system/build-bundle.cjs');
const { createTestArchive } = require('./create-test-archive.cjs');
const product = require('../../runtime/product/scope.cjs');
const DELIVERY_REVISION = 2;
const RELEASE_SEQUENCE = 5;
function releaseMetadata(platform) {
    if (!['linux-arm64', 'linux-x64'].includes(platform)) throw new Error('PG_PRODUCT_ASSEMBLY_REQUIRED');
    return { schemaVersion: 1, product: 'nexowatt-eos', releaseVersion: '0.2.0-test.3', sequence: RELEASE_SEQUENCE,
        profile: 'test', nodeVersion: '24.21.0', platforms: [platform] };
}
function prepareCatalogPayload({ app, payload, catalogFile, sbomFile, catalog }) {
    // An incomplete catalog is only unsigned build input. In particular npm's
    // nested .bin helpers belong to the source tree, not the delivered payload.
    fs.writeFileSync(catalogFile, JSON.stringify(catalog, null, 2) + '\n', { flag: 'wx' });
    const files = preparePayload({ appDirectory: app, destination: payload, catalogFile, sbomFile });
    const bound = { ...catalog, entries: catalog.entries.map(entry => ({ ...entry,
        sha256: componentTreeDigest(componentRows(files, entry.package)) })) };
    const bytes = JSON.stringify(bound, null, 2) + '\n';
    // Only the two files just created by this build are replaced. The source
    // app stays intact. Signing re-inventories and validates the final payload.
    fs.writeFileSync(catalogFile, bytes);
    fs.writeFileSync(path.join(payload, 'catalog.json'), bytes);
    return bound;
}
function packageTest(directory) {
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
    const save = (file, value) => fs.writeFileSync(path.join(base, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
    const metadata = releaseMetadata(assembly.platform);
    save('release-metadata.json', metadata);
    const archive = path.join(base, `eos-0.2.0-test.3-${assembly.platform}.tar.gz`);
    // This payload is build input, not a POSIX bundle installed from Windows.
    // The archive carries the signed modes and is reread before delivery.
    const payload = path.join(base, 'test-archive-payload');
    prepareCatalogPayload({ app, payload, catalog,
        catalogFile: path.join(base, 'catalog.json'), sbomFile: path.join(base, 'runtime.cdx.json') });
    const result = createTestArchive({ payloadDirectory: payload, archivePath: archive,
        publicKeyPath: path.join(base, 'release-public.pem'), metadata });
    const delivery = { schemaVersion: 1, sourceVersion: '0.2.0-dev.9', runtimeVersion: metadata.releaseVersion,
        deliveryRevision: DELIVERY_REVISION, releaseSequence: metadata.sequence, releaseId: result.releaseId,
        signingPublicKeySha256: result.signingPublicKeySha256, archive: path.basename(archive),
        sha256: result.archiveSha256, bytes: result.archiveBytes,
        signedFiles: result.manifest.files.length, platform: assembly.platform, database: 'postgresql',
        productProfile: product.PROFILE, installedComponents,
        scope: 'full required package installation; HTTPS first-start; management activation only; physical adapters pending acceptance',
        archiveReadbackVerified: result.archiveReadbackVerified, archiveModePolicy: result.modePolicy,
        signing: result.signing, privateKeyPersisted: false,
        reproducibility: 'Payload modes, order and timestamps are canonical. A fresh test signer changes the signature, public-key hash and archive hash; identical manifest bytes retain the same releaseId.',
        configured: false, physicalControlEnabled: false, targetTestRequired: true, productionReleaseApproved: false };
    save('delivery.json', delivery); return delivery;
}
module.exports = { DELIVERY_REVISION, RELEASE_SEQUENCE, releaseMetadata, packageTest, prepareCatalogPayload };
if (require.main === module) {
    try { if(process.argv.length!==3) throw new Error('PG_PACKAGE_USAGE'); process.stdout.write(JSON.stringify(packageTest(process.argv[2])) + '\n'); }
    catch(error) { process.stderr.write((error.code || error.message) + '\n'); process.exitCode = 1; }
}
