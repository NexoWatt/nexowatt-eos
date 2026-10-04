'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { checkedRoot } = require('../integration-controller/run-native.cjs');
const { startLab } = require('../postgresql/fixtures/lab-cluster.cjs');
const { authenticate } = require('./prepare-bundle.cjs');
const { inventoryTree } = require('../../runtime/postgresql/integration.cjs');
async function run(input) {
    const root = checkedRoot(input); process.umask(0o077);
    if (process.version !== 'v24.21.0' || process.platform !== 'linux' || process.arch !== 'x64') throw new Error('MANAGEMENT_NATIVE_NODE_REQUIRED');
    authenticate(path.join(root, 'r7/bundle'), fs.readFileSync(path.join(root, 'management-public.pem')));
    if (JSON.stringify(inventoryTree(path.join(root, 'management-app'))) !== fs.readFileSync(path.join(root, 'management-app-inventory.json'), 'utf8').trim()) throw new Error('MANAGEMENT_APP_CHANGED');
    const marker = JSON.parse(fs.readFileSync('/etc/nexowatt-eos/management-lab.json'));
    if (marker.kind !== 'disposable-native-management-lab' || marker.root !== root || marker.uid !== process.getuid()) throw new Error('MANAGEMENT_FIXED_FIXTURE_REQUIRED');
    const data = '/var/lib/nexowatt-eos/iobroker-data';
    if (fs.readdirSync(data).length || fs.statSync(data).uid !== process.getuid() || (fs.statSync(data).mode & 0o777) !== 0o700) throw new Error('MANAGEMENT_FRESH_DATA_REQUIRED');
    const lab = await startLab({ binDirectory: path.join(root, 'postgresql/bin'), schemaFile: path.resolve(__dirname, '../../runtime/postgresql/schema.sql') });
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
            timer = setTimeout(() => child.kill('SIGTERM'), 480000);
            hardTimer = setTimeout(() => child.kill('SIGKILL'), 490000);
        });
        if (code !== 0) throw new Error('MANAGEMENT_NATIVE_INTEGRATION_FAILED');
    } finally {
        clearTimeout(timer); clearTimeout(hardTimer);
        if (child && child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
        await lab.stop(); fs.rmSync(metadata, { force: true });
        fs.rmSync(path.join(root, 'ephemeral-license-issuer.pem'), { force: true });
    }
}
module.exports = { run };
if (require.main === module) run(process.argv.length === 3 ? process.argv[2] : undefined).catch(() => {
    process.stderr.write('MANAGEMENT_NATIVE_INTEGRATION_FAILED\n'); process.exitCode = 1;
});
