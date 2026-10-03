'use strict';
// Local regression/build evidence only: no token, APT transaction or target install.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'reports/integration/github-bootstrap-apt-20261003');
const RAW = path.join(OUT, 'raw');
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
if (!fs.statSync(OUT).isDirectory() || fs.existsSync(RAW)) throw new Error('FRESH_RAW_DIRECTORY_REQUIRED');
fs.mkdirSync(RAW);
const python = process.platform === 'win32' ? 'python' : '/usr/bin/python3';
const commands = [
    ['node-bootstrap', process.execPath, ['--test', '--test-reporter=tap', 'tests/bootstrap/build-download.test.cjs',
        'tests/bootstrap/build-github-download.test.cjs', 'tests/bootstrap/first-start.test.cjs', 'tests/bootstrap/github-publication.test.cjs']],
    ['python-download', python, ['-I', '-B', 'tests/bootstrap/github-download.test.py']],
    ['python-host-preparation', python, ['-I', '-B', 'tests/bootstrap/prepare-host.test.py']]
];
const results = [];
for (const [name, command, args] of commands) {
    const result = cp.spawnSync(command, args, { cwd: ROOT, shell: false, windowsHide: true, timeout: 240000, maxBuffer: 8 * 1024 ** 2 });
    const stdout = result.stdout || Buffer.alloc(0), stderr = result.stderr || Buffer.alloc(0);
    fs.writeFileSync(path.join(RAW, name + '.stdout'), stdout, { flag: 'wx' });
    fs.writeFileSync(path.join(RAW, name + '.stderr'), stderr, { flag: 'wx' });
    results.push({ name, command: [path.basename(command), ...args], exitCode: result.status,
        launchError: result.error ? result.error.code : null,
        stdout: { file: 'raw/' + name + '.stdout', bytes: stdout.length, sha256: hash(stdout) },
        stderr: { file: 'raw/' + name + '.stderr', bytes: stderr.length, sha256: hash(stderr) } });
}
const sources = ['tools/bootstrap/build-github-download.cjs', 'tools/bootstrap/github-download.py',
    'tools/bootstrap/prepare-host.py', 'tools/bootstrap/build-download.cjs', 'tools/bootstrap/first-start.cjs',
    'tools/integration/verify-github-ready.py', 'tools/integration/verify-private-github-blobs.py',
    'tools/integration/record-github-apt-fix.cjs', 'tests/bootstrap/build-download.test.cjs',
    'tests/bootstrap/build-github-download.test.cjs', 'tests/bootstrap/first-start.test.cjs',
    'tests/bootstrap/github-download.test.py', 'tests/bootstrap/prepare-host.test.py', 'tests/bootstrap/github-publication.test.cjs'];
const summary = { schemaVersion: 1, kind: 'private-github-bootstrap-apt-regression-verification', checkedAt: new Date().toISOString(),
    platform: process.platform, node: process.version, ok: results.every(row => row.exitCode === 0), results,
    sources: sources.map(name => { const bytes = fs.readFileSync(path.join(ROOT, name)); return { path: name, bytes: bytes.length, sha256: hash(bytes) }; }),
    completeManufacturerBuildFixture: 'tests/bootstrap/github-publication.test.cjs uses only an isolated public fixture key',
    actualManufacturerPacket: 'delivery/bootstrap-test3-r2-apt/preparation.json',
    actualPacketVerification: 'artifact-verification.json',
    manufacturerLicenseTrustProvenance: '../github-bootstrap-ready-20261003/license-trust-provenance.json',
    previousSignedRuntimeReused: 'delivery/test-pi-0.2.0-test.3-r2', signedRuntimeChanged: false,
    exactUserPiAptSourcesObserved: false, targetInstallationExecuted: false,
    actualAptTransactionExecuted: false, nativeDebianCaPathTested: false, browserTested: false,
    hardwareAcceptance: 'OPEN', productionReleaseApproved: false, fleetUpdaterImplemented: false };
fs.writeFileSync(path.join(OUT, 'verification-summary.json'), JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ report: path.relative(ROOT, OUT), results: results.map(row => ({ name: row.name, exitCode: row.exitCode })) }));
if (!summary.ok) process.exitCode = 1;
