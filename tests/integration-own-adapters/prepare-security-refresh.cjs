'use strict';
// A fresh dependency tree has no historical signature. The enrollment
// baseline below is an explicitly unsigned enrollment/rollback lab fixture.
const fs = require('node:fs');
const path = require('node:path');
const { checkedRoot } = require('../integration-controller/run-native.cjs');
const { verifyPrepared, source } = require('../../tools/integration/prepare-security-refresh.cjs');
const { copyDirectory } = require('../../tools/system/build-bundle.cjs');
const { sha, contentRows, validatePreparation } = require('./fixture.cjs');
function prepare(input, runtime) {
    const root = checkedRoot(input), sourceCommit = source();
    const raw = fs.readFileSync(path.join(runtime, 'runtime-build.json'));
    const record = JSON.parse(raw), prepared = verifyPrepared({ directory: runtime, sourceCommit, sequence: record.sequence });
    const work = path.join(root, 'own-adapters-build');
    fs.mkdirSync(work, { mode: 0o700 });
    const app = path.join(work, 'app'), baselineApp = path.join(work, 'baseline');
    copyDirectory(prepared.app, app); copyDirectory(prepared.app, baselineApp);
    const baselineContentSha256 = sha(JSON.stringify(contentRows(baselineApp)));
    const value = validatePreparation({ schemaVersion: 1, kind: 'unsigned-security-refresh-native-preparation',
        signed: false, unsignedFixture: true, sequence: record.sequence, nodeVersion: record.nodeVersion,
        app, baselineApp, sourceCommit, sourceTreeClean: true, previousSignatureVerified: false,
        previousReleaseId: sha('unsigned-security-refresh-management-baseline:' + baselineContentSha256),
        sourceSequence: 0, baselineKind: 'unsigned-fresh-management-profile',
        appContentSha256: sha(JSON.stringify(contentRows(app))), baselineContentSha256,
        runtimeBuildSha256: sha(raw), resolutionLockSha256: record.resolutionLockSha256 }, root);
    const binding = { schemaVersion: 1, kind: 'eos-security-refresh-native-source-binding', sourceCommit,
        sourceTreeClean: true, signed: false, unsignedFixture: true, previousSignatureVerified: false,
        previousReleaseId: value.previousReleaseId, runtimeBuildSha256: sha(raw), runtimeBuild: record,
        appContentSha256: value.appContentSha256, baselineContentSha256, physicalHardwareTested: false, productionReleaseApproved: false };
    for (const [name, data] of [['own-adapters-source-binding.json', binding], ['own-adapters-native-prepared.json', value]])
        fs.writeFileSync(path.join(root, name), JSON.stringify(data, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    process.stdout.write('FRESH_NATIVE_UNSIGNED_APP_PREPARED\n');
    return value;
}
module.exports = { prepare };
if (require.main === module) {
    try { if (process.argv.length !== 4) throw new Error('FRESH_NATIVE_USAGE'); prepare(...process.argv.slice(2)); }
    catch { process.stderr.write('FRESH_NATIVE_PREPARATION_FAILED\n'); process.exitCode = 1; }
}
