'use strict';
// Build-host regression evidence only; never invokes APT/systemd or target Node.
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const stages = [];
function run(name, program, args, expectedExit = 0) {
    const started = new Date().toISOString();
    const result = cp.spawnSync(program, args, { cwd: root, shell: false, windowsHide: true,
        encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024 });
    fs.writeFileSync(path.join(__dirname, name + '.stdout.log'), result.stdout || '', { flag: 'wx' });
    fs.writeFileSync(path.join(__dirname, name + '.stderr.log'), result.stderr || '', { flag: 'wx' });
    stages.push({ name, program, args, started, finished: new Date().toISOString(),
        exitCode: result.status, expectedExit, error: result.error?.code || null });
    if (result.status !== expectedExit || result.error) throw new Error('BOOTSTRAP_CHECK_FAILED ' + name);
}
run('node-bootstrap', process.execPath, ['--test', '--test-reporter=tap', 'tests/bootstrap/build-download.test.cjs', 'tests/bootstrap/first-start.test.cjs']);
run('python-bootstrap', process.platform === 'win32' ? 'python' : '/usr/bin/python3', ['-I', '-B', 'tests/bootstrap/prepare-host.test.py']);
run('unit-namespace', process.execPath, ['--test', '--test-reporter=tap', '--test-name-pattern=unit namespace', 'tests/postgresql/host-install.test.cjs']);
// Preserve the whole host fixture run including the known Windows POSIX errors;
// success of selected parser tests cannot relabel it as native Linux acceptance.
run('postgresql-host-fixtures', process.execPath, ['--test', '--test-reporter=tap', 'tests/postgresql/host-install.test.cjs'], process.platform === 'win32' ? 1 : 0);
const files = ['tools/bootstrap/build-download.cjs', 'tools/bootstrap/build-kit.py', 'tools/bootstrap/prepare-host.py',
    'tools/bootstrap/first-start.cjs', 'tools/system/postgresql-host-preflight.cjs', 'tools/system/install-from-checkout.cjs',
    'tests/bootstrap/build-download.test.cjs', 'tests/bootstrap/first-start.test.cjs', 'tests/bootstrap/prepare-host.test.py',
    'tests/postgresql/host-install.test.cjs'].map(name => ({ path: name, sha256: sha256(fs.readFileSync(path.join(root, name))) }));
fs.writeFileSync(path.join(__dirname, 'commands.json'), JSON.stringify({ schemaVersion: 1, host: process.platform + '-' + process.arch,
    node: process.versions.node, stages, files, nativeSystemdExecuted: false, aptExecuted: false, piInstallationExecuted: false,
    hardwareAcceptance: 'OPEN', productionReleaseApproved: false }, null, 2) + '\n', { flag: 'wx' });
process.stdout.write(JSON.stringify(stages) + '\n');
