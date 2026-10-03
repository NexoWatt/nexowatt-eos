'use strict';
// Focused manufacturer/fixture checks only. Never installs or requests a token.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'reports/integration/github-bootstrap-20261003');
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
if (fs.existsSync(OUT)) throw new Error('FRESH_EVIDENCE_DIRECTORY_REQUIRED');
fs.mkdirSync(path.join(OUT, 'raw'), { recursive: true });
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
    fs.writeFileSync(path.join(OUT, 'raw', name + '.stdout'), stdout, { flag: 'wx' });
    fs.writeFileSync(path.join(OUT, 'raw', name + '.stderr'), stderr, { flag: 'wx' });
    results.push({ name, command: [path.basename(command), ...args], exitCode: result.status,
        launchError: result.error ? result.error.code : null,
        stdout: { file: 'raw/' + name + '.stdout', bytes: stdout.length, sha256: hash(stdout) },
        stderr: { file: 'raw/' + name + '.stderr', bytes: stderr.length, sha256: hash(stderr) } });
}
const sources = ['tools/bootstrap/build-github-download.cjs', 'tools/bootstrap/github-download.py',
    'tools/bootstrap/prepare-host.py', 'tools/bootstrap/build-download.cjs', 'tools/bootstrap/first-start.cjs',
    'tools/integration/verify-private-github-blobs.py', 'tools/integration/record-github-bootstrap.cjs',
    'tests/bootstrap/build-github-download.test.cjs', 'tests/bootstrap/github-download.test.py',
    'tests/bootstrap/prepare-host.test.py', 'tests/bootstrap/github-publication.test.cjs'];
const summary = { schemaVersion: 1, kind: 'private-github-bootstrap-verification', checkedAt: new Date().toISOString(),
    platform: process.platform, node: process.version, results,
    sources: sources.map(name => { const bytes = fs.readFileSync(path.join(ROOT, name)); return { path: name, bytes: bytes.length, sha256: hash(bytes) }; }),
    completeManufacturerBuildFixture: 'tests/bootstrap/github-publication.test.cjs uses only an isolated public fixture key',
    readyForTargetInstallation: false, manufacturerLicenseTrustIdentityConfirmed: false,
    previousSignedRuntimeReused: 'delivery/test-pi-0.2.0-test.3-r2', signedRuntimeChanged: false,
    targetInstallationExecuted: false, nativeDebianCaPathTested: false, browserTested: false,
    hardwareAcceptance: 'OPEN', productionReleaseApproved: false, fleetUpdaterImplemented: false };
fs.writeFileSync(path.join(OUT, 'verification-summary.json'), JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ report: path.relative(ROOT, OUT), results: results.map(row => ({ name: row.name, exitCode: row.exitCode })) }));
if (results.some(row => row.exitCode !== 0)) process.exitCode = 1;
