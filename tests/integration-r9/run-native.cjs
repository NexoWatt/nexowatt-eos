'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { checkedRoot } = require('../integration-controller/run-native.cjs');
const { startLab } = require('../postgresql/fixtures/lab-cluster.cjs');
const { NODE, loadFixture } = require('./fixture.cjs');
async function run(input) {
    const root = checkedRoot(input); process.umask(0o077);
    if (process.versions.node !== NODE || process.platform !== 'linux' || process.arch !== 'x64') throw new Error('R9_NATIVE_NODE_REQUIRED');
    loadFixture(root, process.getuid());
    const data = '/var/lib/nexowatt-eos/iobroker-data';
    if (fs.readdirSync(data).length || fs.statSync(data).uid !== process.getuid() || (fs.statSync(data).mode & 0o777) !== 0o700) throw new Error('R9_NATIVE_FRESH_DATA_REQUIRED');
    const lab = await startLab({ binDirectory: path.join(root, 'postgresql/bin'), schemaFile: path.resolve(__dirname, '../../runtime/postgresql/schema.sql'), profile: 'management' });
    const metadata = path.join(root, 'management-pg-paths.json');
    let timer, hardTimer, child;
    try {
        fs.writeFileSync(metadata, JSON.stringify(lab.metadata), { flag: 'wx', mode: 0o600 });
        const code = await new Promise((resolve, reject) => {
            child = spawn(process.execPath, ['--test', '--test-reporter=tap', path.join(__dirname, 'management.integration.cjs')], {
                stdio: ['ignore', 'inherit', 'inherit'], env: { PATH: process.env.PATH, LANG: 'C.UTF-8', HOME: root,
                    EOS_MANAGEMENT_LAB_ROOT: root, EOS_TEST_PG_FRESH: '1', CI: 'true', NODE_OPTIONS: '', NODE_PATH: '' }
            });
            child.once('error', reject); child.once('exit', resolve);
            timer = setTimeout(() => child.kill('SIGTERM'), 540000);
            hardTimer = setTimeout(() => child.kill('SIGKILL'), 550000);
        });
        if (code !== 0) throw new Error('R9_NATIVE_INTEGRATION_FAILED');
    } finally {
        clearTimeout(timer); clearTimeout(hardTimer);
        if (child && child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
        await lab.stop(); fs.rmSync(metadata, { force: true });
        fs.rmSync(path.join(root, 'ephemeral-license-issuer.pem'), { force: true });
    }
}
module.exports = { run };
if (require.main === module) run(process.argv.length === 3 ? process.argv[2] : undefined).catch(() => {
    process.stderr.write('R9_NATIVE_INTEGRATION_FAILED\n'); process.exitCode = 1;
});
