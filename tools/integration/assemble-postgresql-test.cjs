'use strict';
// Fresh full-product assembly. Historical signed test.1/test.2 bytes are never
// edited or used to stand in for current adapter source packages.
const fs = require('node:fs');
const path = require('node:path');
const { build } = require('./build-runtime.cjs');
const { applyToBuild, verifyBuildProfile } = require('../../runtime/controller-profile/transform.cjs');
const { sha256 } = require('../../runtime/release/bundle.cjs');
const product = require('../../runtime/product/scope.cjs');
async function assemble({ output, platform = 'linux-arm64' }) {
    const evidence = build({ output, platform, postgresql: true });
    const app = path.join(path.resolve(output), 'app');
    const transform = applyToBuild(app, product.admittedAdapters());
    const profile = verifyBuildProfile(app, product.admittedAdapters());
    const controllerManifest = { relativePath: 'node_modules/iobroker.js-controller/package.json',
        originalSha256: evidence.postgresqlBackendBinding.originalControllerManifestSha256,
        sha256: evidence.postgresqlBackendBinding.controllerManifestSha256 };
    transform.files.push(controllerManifest);
    profile.files.push({ relativePath: controllerManifest.relativePath, sha256: controllerManifest.sha256 });
    const installedComponents = product.inspectApp(app);
    const record = { schemaVersion: 1, kind: 'eos-postgresql-full-product-assembly',
        productProfile: product.PROFILE, runtimeVersion: '0.2.0-test.3',
        nodeVersion: process.versions.node, npmVersion: '11.19.0', platform,
        network: 'offline-only', lifecycleScriptsExecuted: false,
        sourcePackages: evidence.components, installedComponents,
        packageLockSha256: sha256(fs.readFileSync(path.join(app, 'package-lock.json'))),
        controllerProfile: profile, targetExecutionPerformed: false,
        configured: false, physicalControlEnabled: false, productionApproved: false };
    for (const [name, data] of [['controller-transform.json', transform], ['assembly.json', record]]) {
        fs.writeFileSync(path.join(output, name), JSON.stringify(data, null, 2) + '\n', { flag: 'wx', mode: 0o644 });
    }
    return { output: path.resolve(output), app, packageLockSha256: record.packageLockSha256, installedComponents };
}
module.exports = { assemble };
if (require.main === module) {
    const a = process.argv.slice(2);
    if (a.length !== 4 || a[0] !== '--output' || a[2] !== '--platform') throw new Error('PG_ASSEMBLY_USAGE');
    assemble({ output: a[1], platform: a[3] }).then(result => process.stdout.write(JSON.stringify(result) + '\n'),
        error => { process.stderr.write(JSON.stringify({ ok: false, code: /^[A-Z0-9_]+$/.test(error.code || '') ? error.code : 'PG_ASSEMBLY_FAILED' }) + '\n'); process.exitCode = 1; });
}
