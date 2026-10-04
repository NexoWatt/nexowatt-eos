'use strict';
// EOS-PID-STATE-001: manufacturer build transform for a new signed candidate.
// Never apply to an installed release or silently modify historical artifacts.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const PACKAGE = '@iobroker/js-controller-common-db';
const PID_FILE = '/var/lib/nexowatt-eos/iobroker-data/pids.txt';
const FILES = Object.freeze([
    Object.freeze({ relativePath: `node_modules/${PACKAGE}/build/cjs/lib/common/tools.js`,
        originalSha256: '471884540adde741e539be9dd8f6decddca9971685d359ccab487a1476d0e727',
        sha256: 'f7499955dc5a935e8eea9eff7afab20c9c8d4b86b5098a58121c44605a776ad3', flavor: 'cjs' }),
    Object.freeze({ relativePath: `node_modules/${PACKAGE}/build/esm/lib/common/tools.js`,
        originalSha256: '0aed4f76a9a5d61752ff34268a67db016e92e505667ed981c727270d0b23c122',
        sha256: 'c32efa42a0bdd94dd035dbdb9c1b47b715f475d37beb28034c20aeb3bead4a86', flavor: 'esm' })
]);
const SOURCE = Object.freeze({ relativePath: 'packages/common-db/src/lib/common/tools.ts',
    originalSha256: '73535c3fe5c52e0ddf697e4222e8d1e4fb1d4cc15cc047be166224310c0974d5',
    sha256: '54af3ae542ded7f55ca1fbfe3bdf717cf7f468f07b965db4aed3662532960685', flavor: 'source' });
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function fail(code) { throw Object.assign(new Error(code), { code }); }
function transformFile(relativePath, bytes) {
    const spec = [...FILES, SOURCE].find(row => row.relativePath === relativePath);
    if (!spec || sha(bytes) !== spec.originalSha256) fail('EOS_PID_TRANSFORM_SOURCE_HASH');
    const text = bytes.toString('utf8'), indent = spec.flavor === 'cjs' ? '  ' : '    ';
    const before = spec.flavor === 'cjs' ? '  return import_node_path.default.join(getControllerDir(), "pids.txt");' :
        "    return path.join(getControllerDir(), 'pids.txt');";
    if (text.indexOf(before) < 0 || text.indexOf(before) !== text.lastIndexOf(before)) fail('EOS_PID_TRANSFORM_ANCHOR');
    const content = text.replace(before, indent + '// EOS-PID-STATE-001: runtime state never belongs to the signed release tree.\n' +
        indent + "return '" + PID_FILE + "';");
    if (sha(content) !== spec.sha256) fail('EOS_PID_TRANSFORM_OUTPUT_HASH');
    return { relativePath, originalSha256: spec.originalSha256, sha256: spec.sha256, content };
}
function localFile(app, relativePath) {
    const root = path.resolve(app);
    if (typeof relativePath !== 'string' || relativePath.split('/').some(part => !part || part === '.' || part === '..') ||
        relativePath.includes('\\')) fail('EOS_PID_BUILD_PATH');
    // Build trees are isolated from concurrent writers. Reject all existing
    // symlinks, including parents, before opening final paths with O_NOFOLLOW.
    if (fs.realpathSync(root) !== root) fail('EOS_PID_BUILD_PATH');
    let current = root;
    for (const part of ['', ...relativePath.split('/').slice(0, -1)]) {
        if (part) current = path.join(current, part);
        const stat = fs.lstatSync(current);
        if (!stat.isDirectory() || stat.isSymbolicLink()) fail('EOS_PID_BUILD_PATH');
    }
    const file = path.join(root, relativePath);
    let fd;
    try {
        fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
        const stat = fs.fstatSync(fd);
        if (!stat.isFile() || stat.size > 2000000) fail('EOS_PID_BUILD_FILE');
        const bytes = fs.readFileSync(fd);
        if (bytes.length !== stat.size) fail('EOS_PID_BUILD_FILE');
        return bytes;
    } catch { fail('EOS_PID_BUILD_FILE'); }
    finally { if (fd !== undefined) fs.closeSync(fd); }
}
function identity(app) {
    let pkg;
    try { pkg = JSON.parse(localFile(app, `node_modules/${PACKAGE}/package.json`)); }
    catch { fail('EOS_PID_PACKAGE_IDENTITY'); }
    if (pkg.name !== PACKAGE || pkg.version !== '7.2.2' || pkg.type !== 'module' ||
        pkg.exports?.['./tools']?.require !== './build/cjs/lib/common/tools.js' ||
        pkg.exports?.['./tools']?.import !== './build/esm/lib/common/tools.js') fail('EOS_PID_PACKAGE_IDENTITY');
    for (const parent of ['iobroker.js-controller', '@iobroker/js-controller-common', '@iobroker/js-controller-cli']) {
        // These are the host/CLI consumers of common-db. A nested or alternate
        // copy would leave a real writer/reader on the old immutable path.
        localFile(app, `node_modules/${parent}/package.json`);
        let resolved;
        try { resolved = createRequire(path.resolve(app, 'node_modules', parent, 'package.json')).resolve(`${PACKAGE}/tools`); }
        catch { fail('EOS_PID_MODULE_RESOLUTION'); }
        if (resolved !== path.resolve(app, FILES[0].relativePath)) fail('EOS_PID_MODULE_RESOLUTION');
    }
}
function prepareFiles(app) {
    identity(app);
    return FILES.map(row => transformFile(row.relativePath, localFile(app, row.relativePath)));
}
function applyToBuild(app) {
    const files = prepareFiles(app); // Validate every input before first write.
    for (const row of files) {
        const fd = fs.openSync(path.join(app, row.relativePath), fs.constants.O_WRONLY | fs.constants.O_TRUNC | fs.constants.O_NOFOLLOW);
        try { fs.writeFileSync(fd, row.content); } finally { fs.closeSync(fd); }
    }
    return { schemaVersion: 1, kind: 'eos-controller-pid-state-transform', component: PACKAGE, version: '7.2.2',
        pidFile: PID_FILE, files: files.map(({ content, ...row }) => row), physicalControlEnabled: false, productionApproved: false };
}
function verifyBuild(app) {
    identity(app);
    for (const row of FILES) if (sha(localFile(app, row.relativePath)) !== row.sha256) fail('EOS_PID_BUILD_HASH');
    return { schemaVersion: 1, kind: 'eos-controller-pid-state-verification', component: PACKAGE, version: '7.2.2',
        pidFile: PID_FILE, files: FILES.map(({ flavor, originalSha256, ...row }) => row), productionApproved: false };
}
module.exports = { PACKAGE, PID_FILE, FILES, SOURCE, transformFile, prepareFiles, applyToBuild, verifyBuild };
