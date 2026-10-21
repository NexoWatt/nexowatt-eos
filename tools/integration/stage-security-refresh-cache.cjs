'use strict';
// Explicit unprivileged dependency-resolution stage. No signing, hooks or
// installation on a target. Its lock is consumed by a separate offline npm ci.
const fs = require('node:fs');
const path = require('node:path');
const { build } = require('./build-runtime.cjs');
const product = require('../../runtime/product/scope.cjs');
const { source } = require('./prepare-security-refresh.cjs');
function stage(output) {
    const sourceCommit = source();
    const evidence = build({ output, platform: 'linux-arm64', postgresql: true,
        releaseScope: product.SECURITY_REFRESH_TEST, networkMode: 'cache-stage' });
    if (source() !== sourceCommit) throw Object.assign(new Error('FRESH_BUILD_SOURCE_CHANGED'), { code: 'FRESH_BUILD_SOURCE_CHANGED' });
    const record = { schemaVersion: 1, kind: 'eos-security-refresh-resolution', sourceCommit,
        nodeVersion: process.versions.node, npmVersion: '11.19.0', lifecycleScriptsExecuted: false,
        resolutionLockSha256: evidence.resolutionLockSha256, sourcePackages: evidence.components,
        packageLockSha256: evidence.packageLockSha256, signed: false, productionReleaseApproved: false };
    fs.writeFileSync(path.join(output, 'resolution.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    return record;
}
module.exports = { stage };
if (require.main === module) {
    try {
        if (process.argv.length !== 4 || process.argv[2] !== '--output') throw Object.assign(new Error('FRESH_CACHE_USAGE'), { code: 'FRESH_CACHE_USAGE' });
        process.stdout.write(JSON.stringify(stage(process.argv[3])) + '\n');
    } catch (error) { process.stderr.write((/^[A-Z][A-Z0-9_]+$/.test(error?.code || '') ? error.code : 'FRESH_CACHE_FAILED') + '\n'); process.exitCode = 1; }
}
