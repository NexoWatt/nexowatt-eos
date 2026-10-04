'use strict';
// No mocks: starts the existing qualified PostgreSQL 17.11 loopback/mTLS fixture
// and executes the actual pinned controller in a fresh disposable laboratory.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { startLab } = require('../postgresql/fixtures/lab-cluster.cjs');
const { applyToBuild, verifyBuildProfile } = require('../../runtime/controller-profile/transform.cjs');
const pidState = require('../../runtime/controller-profile/pid-state.cjs');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function checkedRoot(input) {
    if (typeof process.getuid !== 'function' || process.getuid() === 0) throw new Error('NATIVE_LAB_NONROOT_REQUIRED');
    if (typeof input !== 'string' || !path.isAbsolute(input) || fs.realpathSync(input) !== input) throw new Error('NATIVE_LAB_ROOT_REQUIRED');
    const stat = fs.lstatSync(input);
    if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== process.getuid() || (stat.mode & 0o777) !== 0o700) throw new Error('NATIVE_LAB_ROOT_REQUIRED');
    return input;
}
async function run(rootInput) {
    const root = checkedRoot(rootInput);
    process.umask(0o077);
    if (process.version !== 'v24.21.0' || process.platform !== 'linux' || process.arch !== 'x64') throw new Error('NATIVE_LAB_NODE_REQUIRED');
    const baseApp = path.join(root, 'controller'), pgClientRoot = path.join(root, 'pg-client');
    const originalBaseLock = sha(path.join(baseApp, 'package-lock.json'));
    const originalPgLock = sha(path.join(pgClientRoot, 'package-lock.json'));
    const profile = applyToBuild(baseApp, []);
    verifyBuildProfile(baseApp, []);
    const pidProfile = pidState.applyToBuild(baseApp);
    pidState.verifyBuild(baseApp);
    fs.writeFileSync(path.join(root, 'controller-profile.json'), JSON.stringify(profile, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    fs.writeFileSync(path.join(root, 'pid-profile.json'), JSON.stringify(pidProfile, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    const lab = await startLab({ binDirectory: path.join(root, 'postgresql/bin'), schemaFile: path.resolve(__dirname, '../../runtime/postgresql/schema.sql') });
    const metadataFile = path.join(root, 'lab-paths.json');
    let child, timer, hardTimer;
    try {
        fs.writeFileSync(metadataFile, JSON.stringify(lab.metadata) + '\n', { mode: 0o600, flag: 'wx' });
        const code = await new Promise((resolve, reject) => {
            child = spawn(process.execPath, ['--test', '--test-reporter=tap', path.resolve(__dirname, '../postgresql/controller.integration.cjs')], {
                stdio: ['ignore', 'inherit', 'inherit'],
                env: { ...process.env, EOS_TEST_PG_FRESH: '1', EOS_TEST_CONTROLLER_ROOT: baseApp,
                    EOS_TEST_PG_CLIENT_ROOT: pgClientRoot, EOS_TEST_PG_LAB_PATHS: metadataFile,
                    EOS_TEST_BASE_LOCK_SHA256: originalBaseLock, EOS_TEST_PG_LOCK_SHA256: originalPgLock,
                    EOS_TEST_NATIVE_PROFILE: '1', NODE_OPTIONS: '', NODE_PATH: '' }
            });
            child.once('error', reject); child.once('exit', resolve);
            timer = setTimeout(() => child.kill('SIGTERM'), 300000);
            hardTimer = setTimeout(() => child.kill('SIGKILL'), 310000);
        });
        if (code !== 0) throw new Error('NATIVE_CONTROLLER_INTEGRATION_FAILED');
    } finally {
        clearTimeout(timer); clearTimeout(hardTimer);
        if (child && child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
        await lab.stop();
        fs.rmSync(metadataFile, { force: true });
    }
}
module.exports = { checkedRoot, run };
if (require.main === module) run(process.argv.length === 3 ? process.argv[2] : undefined).catch(error => {
    // No credential-containing config or full PostgreSQL error object is printed.
    process.stderr.write(`${/^[A-Z0-9_]+$/.test(error.message || '') ? error.message : 'NATIVE_CONTROLLER_LAB_FAILED'}\n`);
    process.exitCode = 1;
});
