'use strict';
// Record actual stdout/stderr and source digests; never invokes target recovery.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '../../..');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const raw = path.join(__dirname, 'raw');
fs.mkdirSync(raw);
const rows = [];
const commands = [
    ['recovery', 'python', ['-I', '-B', 'tests/bootstrap/recover-sudo-abort.test.py']],
    ['entry', 'node', ['--test', 'tests/bootstrap/sudo-recovery-command.test.cjs']],
    ['historical-archive', 'python', ['-I', '-B', 'reports/integration/sudo-abort-recovery-20261003/verify-r2-archive.py']],
];
for (const [name, executable, args] of commands) {
    const result = cp.spawnSync(executable, args, { cwd: ROOT, windowsHide: true, timeout: 180000,
        encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    const stdout = Buffer.from(result.stdout || ''), stderr = Buffer.from(result.stderr || '');
    fs.writeFileSync(path.join(raw, name + '.stdout.log'), stdout, { flag: 'wx' });
    fs.writeFileSync(path.join(raw, name + '.stderr.log'), stderr, { flag: 'wx' });
    rows.push({ executable, args, status: result.status, errorCode: result.error?.code || null,
        stdout: { path: `raw/${name}.stdout.log`, sha256: sha(stdout) },
        stderr: { path: `raw/${name}.stderr.log`, sha256: sha(stderr) } });
}
const sources = ['tools/bootstrap/recover-sudo-abort.py', 'tests/bootstrap/recover-sudo-abort.test.py',
    'tools/bootstrap/build-sudo-recovery-command.cjs', 'tests/bootstrap/sudo-recovery-command.test.cjs',
    'reports/integration/sudo-abort-recovery-20261003/verify-r2-archive.py',
    'reports/integration/sudo-abort-recovery-20261003/record-local.cjs'].map(file =>
    ({ path: file, sha256: sha(fs.readFileSync(path.join(ROOT, file))) }));
const report = { schemaVersion: 1, kind: 'sudo-abort-recovery-local-verification',
    host: { platform: process.platform, arch: process.arch, node: process.versions.node },
    ok: rows.every(row => row.status === 0 && row.errorCode === null), rows, sources,
    targetRecoveryExecuted: false, targetInstallationExecuted: false, hardwareAcceptance: 'OPEN',
    scope: 'Local fixtures and actual historical archive verification. No native Linux account, rename, fsync, sudo, systemd or installation acceptance.' };
fs.writeFileSync(path.join(__dirname, 'verification.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.ok ? 0 : 1;
