'use strict';
// Explicit native laboratory: reuse the complete authenticated R7 dependency
// tree without npm, package replacement, adapter mocks or native recompilation.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const bundle = require('../../runtime/release/bundle.cjs');
const { copyVerifiedTree } = require('../../runtime/postgresql/integration.cjs');
const { checkedRoot } = require('../integration-controller/run-native.cjs');
const PIN = Object.freeze({ bytes: 97495870,
    sha256: 'a8273ad1bf23bdd2ae50f45afea8875c04e31c40464dea3c3a2c5ffca921b64a',
    publicKeySha256: 'a6a11d0d02b058a15d78a1aa81a22e488d120ee3ab9f11e1bd35a3aafad6d522',
    releaseId: 'd400cab68939e60e22b619b78b3ecc4a4043afbfe6e21696934db42ba586d5a3' });
const fail = code => { throw Object.assign(new Error(code), { code }); };
function authenticate(directory, key) {
    if (bundle.sha256(key) !== PIN.publicKeySha256) fail('MANAGEMENT_LAB_KEY_PIN');
    const verified = bundle.verifyBundle({ bundleDirectory: directory, publicKey: key, platform: 'linux-arm64', nodeVersion: '24.21.0' });
    if (verified.releaseId !== PIN.releaseId || verified.manifest.sequence !== 10) fail('MANAGEMENT_LAB_RELEASE_PIN');
    require('../../runtime/bootstrap/enrollment.cjs').pinnedAdapters(path.join(verified.payloadPath, 'app'));
    return verified;
}
function prepare(rootInput, archive, keyFile) {
    const root = checkedRoot(rootInput); process.umask(0o077);
    if (![archive, keyFile].every(p => typeof p === 'string' && path.isAbsolute(p))) fail('MANAGEMENT_LAB_INPUT_PATH');
    const bytes = bundle.readFileLimited(archive, 100 * 1024 * 1024).bytes;
    const key = bundle.readFileLimited(keyFile, 16384).bytes;
    if (bytes.length !== PIN.bytes || bundle.sha256(bytes) !== PIN.sha256 || bundle.sha256(key) !== PIN.publicKeySha256) fail('MANAGEMENT_LAB_ARCHIVE_PIN');
    const destination = path.join(root, 'r7');
    const result = cp.spawnSync('/usr/bin/python3', ['-I', '-B', path.resolve(__dirname, '../../tools/system/extract-test-bundle.py'),
        '--archive', archive, '--destination', destination, '--sha256', PIN.sha256], { timeout: 180000, stdio: 'ignore' });
    if (result.error || result.status !== 0) fail('MANAGEMENT_LAB_EXTRACT');
    const verified = authenticate(path.join(destination, 'bundle'), key);
    const inventory = copyVerifiedTree(path.join(verified.payloadPath, 'app'), path.join(root, 'management-app'));
    fs.writeFileSync(path.join(root, 'management-public.pem'), key, { mode: 0o600, flag: 'wx' });
    fs.writeFileSync(path.join(root, 'management-app-inventory.json'), JSON.stringify(inventory) + '\n', { mode: 0o600, flag: 'wx' });
    process.stdout.write('MANAGEMENT_R7_APP_AUTHENTICATED\n');
}
module.exports = { PIN, authenticate, prepare };
if (require.main === module) {
    try { if (process.argv.length !== 5) fail('MANAGEMENT_LAB_USAGE'); prepare(...process.argv.slice(2)); }
    catch { process.stderr.write('MANAGEMENT_LAB_PREPARATION_FAILED\n'); process.exitCode = 1; }
}
