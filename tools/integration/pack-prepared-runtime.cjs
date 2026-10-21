'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const { source, verifyPrepared } = require('./prepare-security-refresh.cjs');
const { verifyNativeEvidence } = require('./verify-security-refresh-native.cjs');
const { sha256 } = require('../../runtime/release/bundle.cjs');
function pack({ directory, evidenceDirectory, output }) {
    const sourceCommit = source();
    const record = JSON.parse(fs.readFileSync(path.join(directory, 'runtime-build.json')));
    const prepared = verifyPrepared({ directory, sourceCommit, sequence: record.sequence });
    verifyNativeEvidence({ directory: evidenceDirectory, sourceCommit, files: prepared.files, record: prepared.record,
        runtimeBuildSha256: sha256(fs.readFileSync(prepared.recordFile)) });
    const result = cp.spawnSync('/usr/bin/python3', ['-I', '-B', path.join(__dirname, 'prepared-runtime-archive.py'), 'pack', directory, output],
        { encoding: 'utf8', timeout: 300000, maxBuffer: 65536, shell: false });
    if (result.error || result.status !== 0) throw new Error('PREPARED_ARCHIVE_FAILED');
    if (source() !== sourceCommit) throw new Error('FRESH_BUILD_SOURCE_CHANGED');
    return JSON.parse(result.stdout);
}
module.exports = { pack };
if (require.main === module) {
    try {
        const a = process.argv.slice(2);
        if (a.length !== 6 || a[0] !== '--prepared-runtime' || a[2] !== '--native-evidence' || a[4] !== '--output') throw new Error('PREPARED_ARCHIVE_USAGE');
        process.stdout.write(JSON.stringify(pack({ directory: a[1], evidenceDirectory: a[3], output: a[5] })) + '\n');
    } catch { process.stderr.write('PREPARED_ARCHIVE_FAILED\n'); process.exitCode = 1; }
}
