'use strict';
// Manufacturer regression evidence; never installs, invokes sudo or asks for a token.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'reports/integration/github-bootstrap-sudo-20261003');
const RAW = path.join(OUT, 'raw');
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
if (!fs.statSync(OUT).isDirectory() || fs.existsSync(RAW)) throw new Error('FRESH_RAW_DIRECTORY_REQUIRED');
fs.mkdirSync(RAW);
const python = process.platform === 'win32' ? 'python' : '/usr/bin/python3';
const commands = [
    ['node-bootstrap', process.execPath, ['--test', '--test-reporter=tap', 'tests/bootstrap/build-download.test.cjs',
        'tests/bootstrap/build-github-download.test.cjs', 'tests/bootstrap/first-start.test.cjs', 'tests/bootstrap/github-publication.test.cjs']],
    ['node-security', process.execPath, ['--test', '--test-reporter=tap', 'tests/security/runtime-tls.test.cjs', 'tests/security/sftp.test.cjs']],
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
    'tools/system/install-host.cjs', 'tools/system/install-postgresql-host.cjs', 'tools/system/install-from-checkout.cjs',
    'tools/integration/verify-github-ready.py', 'tools/integration/verify-private-github-blobs.py',
    'tools/integration/record-github-sudo-fix.cjs', 'tests/bootstrap/build-download.test.cjs',
    'tests/bootstrap/build-github-download.test.cjs', 'tests/bootstrap/first-start.test.cjs',
    'tests/bootstrap/github-download.test.py', 'tests/bootstrap/prepare-host.test.py', 'tests/bootstrap/github-publication.test.cjs',
    'tests/system/sudo-policy.test.cjs', 'tests/security/runtime-tls.test.cjs', 'tests/security/sftp.test.cjs'];
const summary = { schemaVersion: 1, kind: 'private-github-bootstrap-sudo-regression-verification', checkedAt: new Date().toISOString(),
    platform: process.platform, node: process.version, ok: results.every(row => row.exitCode === 0), results,
    sources: sources.map(name => { const bytes = fs.readFileSync(path.join(ROOT, name)); return { path: name, bytes: bytes.length, sha256: hash(bytes) }; }),
    sudoAndRevisionRegression: '../installable-test3-r3-20261003/revision-regression.command.json',
    manufacturerBuild: '../installable-test3-r3-20261003/build-verification.json',
    actualManufacturerPacket: 'delivery/bootstrap-test3-r3/preparation.json',
    actualPacketVerification: 'artifact-verification.json',
    manufacturerLicenseTrustProvenance: '../github-bootstrap-ready-20261003/license-trust-provenance.json',
    priorUserPiFailure: 'user-pi-observation.json', runtimeRevision: 3, releaseSequence: 6,
    windowsPosixBaselineObservation: { command: ['node', '--test', 'tests/postgresql/host-install.test.cjs'],
        phase: 'before sudo source change', pass: 13, fail: 4, skipped: 1, rawLogAvailable: false,
        source: 'observed tool output; not reconstructed as a raw log',
        failureScope: 'existing POSIX toolTrust/mode/ownership fixtures on Windows; new sudo command-fixture models metadata explicitly' },
    unavailableLinuxChecks: { wslInstalled: false, nativeSudoExecuted: false,
        shellPolicySuites: ['tests/security/host-policy.test.py', 'tests/security/wrapper.test.py',
            'tests/security/node-update-log.test.py', 'tests/security/profile.test.py'],
        status: 'NOT_EXECUTED: require native /bin/bash, Linux paths and POSIX semantics unavailable on this Windows host' },
    targetInstallationExecutedByAgent: false, completedPiInstallation: false, actualRecoveryExecuted: false,
    nativeDebianCaPathTested: false, browserTested: false,
    hardwareAcceptance: 'OPEN', productionReleaseApproved: false, fleetUpdaterImplemented: false };
fs.writeFileSync(path.join(OUT, 'verification-summary.json'), JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ report: path.relative(ROOT, OUT), results: results.map(row => ({ name: row.name, exitCode: row.exitCode })) }));
if (!summary.ok) process.exitCode = 1;
