'use strict';
// Manufacturer-only, offline preparation. The official archive pin is reviewed
// in source; no latest lookup or caller-supplied expected hash is accepted.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const policy = require('./node-runtime-policy.json');
const node = require('../../runtime/updates/node-policy.cjs');
const bundle = require('../../runtime/release/bundle.cjs');
const fail = code => { throw Object.assign(new Error(code), { code }); };
function release(version = policy.currentVersion, platform = 'linux-arm64') {
    node.validateVersion(version);
    const value = policy.releases?.[version]?.[platform];
    if (policy.schemaVersion !== 1 || !['linux-arm64', 'linux-x64'].includes(platform) || !value ||
        value.archive !== `node-v${version}-${platform}.tar.xz` || !/^[a-f0-9]{64}$/.test(value.sha256 || '')) fail('NODE_PACKAGE_PIN');
    return { version, platform, ...value };
}
function verifyArchive(archive, version = policy.currentVersion, platform = 'linux-arm64') {
    const pin = release(version, platform);
    if (!path.isAbsolute(archive || '') || path.resolve(archive) !== archive || fs.realpathSync(archive) !== archive) fail('NODE_PACKAGE_PATH');
    const before = fs.lstatSync(archive);
    if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1 || before.size < 1 || before.size > 128 * 1024 ** 2) fail('NODE_PACKAGE_FILE');
    const fd = fs.openSync(archive, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW), hash = crypto.createHash('sha256');
    try {
        const opened = fs.fstatSync(fd);
        if (opened.dev !== before.dev || opened.ino !== before.ino || opened.size !== before.size) fail('NODE_PACKAGE_CHANGED');
        const buffer = Buffer.alloc(1024 * 1024); let count;
        while ((count = fs.readSync(fd, buffer)) > 0) hash.update(buffer.subarray(0, count));
        const after = fs.fstatSync(fd);
        if (opened.size !== after.size || opened.mtimeMs !== after.mtimeMs || opened.ctimeMs !== after.ctimeMs) fail('NODE_PACKAGE_CHANGED');
        if (hash.digest('hex') !== pin.sha256) fail('NODE_PACKAGE_HASH');
    } finally { fs.closeSync(fd); }
    return { ...pin, bytes: before.size };
}
function prepare({ archive, destination, version = policy.currentVersion }) {
    verifyArchive(archive, version);
    if (!path.isAbsolute(destination || '') || path.resolve(destination) !== destination || fs.existsSync(destination)) fail('NODE_PACKAGE_OUTPUT');
    const result = cp.spawnSync('/usr/bin/python3', ['-I', '-B', path.join(__dirname, 'node-runtime-archive.py'),
        '--archive', archive, '--output', destination, '--version', version, '--platform', 'linux-arm64'],
    { encoding: 'utf8', timeout: 120000, maxBuffer: 4096, shell: false });
    if (result.error || result.status !== 0) fail('NODE_PACKAGE_EXTRACT');
    const metadata = JSON.parse(result.stdout);
    const rows = bundle.inventory(destination).map(row => ({ ...row, path: `node-runtime/${row.path}` }));
    node.validateRuntime(path.dirname(destination), { nodeVersion: version, files: rows });
    return metadata;
}
module.exports = { policy, release, verifyArchive, prepare };
