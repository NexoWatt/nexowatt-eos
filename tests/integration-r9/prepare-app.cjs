'use strict';
// Unsigned native candidate: actual authenticated R8 + exact six current own source overlays.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const { checkedRoot } = require('../integration-controller/run-native.cjs');
const builder = require('../../reports/integration/installable-test3-r9-20261005/build-revision.cjs');
const { NODE, sha, contentRows, validatePreparation } = require('./fixture.cjs');
function prepare(input, baseDirectory) {
    const root = checkedRoot(input);
    if (!path.isAbsolute(baseDirectory || '') || process.versions.node !== NODE) throw new Error('R9_NATIVE_PREPARE_INPUT');
    const sourceCommit = cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: path.resolve(__dirname, '../..'), encoding: 'utf8', timeout: 5000 }).trim();
    const prepared = builder.prepareApp({ baseDirectory, work: path.join(root, 'r9-build'), sourceCommit, timestamp: new Date().toISOString() });
    const verification = JSON.parse(fs.readFileSync(path.join(root, 'r9-build/unsigned-app-verification.json')));
    if (verification.signed !== false || verification.previousSignatureVerified !== true || !verification.changedFiles
        || verification.dependenciesUnchanged !== true || prepared.app !== path.join(root, 'r9-build/app')) throw new Error('R9_NATIVE_PREPARED_SOURCE');
    const record = validatePreparation({ schemaVersion: 1, kind: 'unsigned-r9-native-preparation', signed: false, unsignedFixture: true,
        sequence: 12, nodeVersion: NODE, app: prepared.app, sourceCommit, previousReleaseId: builder.BASE.releaseId,
        previousSignatureVerified: true, appContentSha256: sha(JSON.stringify(contentRows(prepared.app))) }, root);
    fs.writeFileSync(path.join(root, 'r9-native-prepared.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    process.stdout.write('R9_NATIVE_UNSIGNED_APP_PREPARED\n');
    return record;
}
module.exports = { prepare };
if (require.main === module) {
    try { if (process.argv.length !== 4) throw new Error('R9_NATIVE_USAGE'); prepare(...process.argv.slice(2)); }
    catch { process.stderr.write('R9_NATIVE_PREPARATION_FAILED\n'); process.exitCode = 1; }
}
