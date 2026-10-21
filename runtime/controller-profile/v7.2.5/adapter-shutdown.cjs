'use strict';
// EOS-ADAPTER-SHUTDOWN-001: exact-input offline transform for a NEW unsigned
// candidate only. Historical signed bundles and live installations stay intact.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const PACKAGE = '@iobroker/js-controller-adapter';
const MAX_BYTES = 1024 * 1024;
const FILES = Object.freeze([
    Object.freeze({ relativePath: `node_modules/${PACKAGE}/build/cjs/lib/adapter/adapter.js`, flavor: 'cjs',
        originalSha256: '6ebf0593db8be7a6aa0ec75fc54be97db72e1705fd220ff5ca304d794f63c625', sha256: 'db0fc39efb8d38d6aeefa165258b46d52c4d8f86079d399df442e1a7b5306158' }),
    Object.freeze({ relativePath: `node_modules/${PACKAGE}/build/esm/lib/adapter/adapter.js`, flavor: 'esm',
        originalSha256: '3fc3b1fe76257ba0cf6bb7a8321f7353647de118a19f371c3a8f1e46662478c8', sha256: 'd560eeac3d6665923e9f737e976727ccec5d957425efa84d14686a1ded7d76b3' }),
]);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function fail(code) { throw Object.assign(new Error(code), { code }); }
function transformFile(relativePath, input) {
    const spec = FILES.find(row => row.relativePath === relativePath);
    if (!spec || sha(input) !== spec.originalSha256) fail('EOS_ADAPTER_SHUTDOWN_TRANSFORM_SOURCE_HASH');
    const text = input.toString('utf8'), unit = spec.flavor === 'cjs' ? '  ' : '    ', indent = unit.repeat(3);
    const opener = `${indent}const finishUnload = async () => {\n`;
    const ending = `${indent}${unit}this.terminate(reason, exitCode);\n${indent}};`;
    const start = text.indexOf(opener), end = text.indexOf(ending);
    if (start < 0 || end <= start || start !== text.lastIndexOf(opener) || end !== text.lastIndexOf(ending))
        fail('EOS_ADAPTER_SHUTDOWN_TRANSFORM_ANCHOR');
    // Publish the one shared Promise before executing any cleanup. Callback,
    // deadline and synchronous re-entry must await the SAME alive write before
    // terminate() can close the PostgreSQL clients. Existing error logging and
    // the upstream fallback deadline remain unchanged.
    const body = text.slice(start + opener.length, end + ending.length - `${indent}};`.length)
        .split('\n').map(line => line ? unit.repeat(2) + line : line).join('\n');
    const replacement = `${indent}// EOS-ADAPTER-SHUTDOWN-001: callback/deadline share one complete finalization.\n` +
        `${indent}let eosFinishUnloadTask;\n${indent}const finishUnload = () => {\n` +
        `${indent}${unit}if (!eosFinishUnloadTask) {\n` +
        `${indent}${unit.repeat(2)}eosFinishUnloadTask = Promise.resolve().then(async () => {\n` + body +
        `${indent}${unit.repeat(2)}});\n${indent}${unit}}\n` +
        `${indent}${unit}return eosFinishUnloadTask;\n${indent}};`;
    let content = text.slice(0, start) + replacement + text.slice(end + ending.length);
    // OAuth session IDs can contain access/refresh bearer tokens. Upstream
    // 7.2.5's error diagnostic includes that ID and the database error text.
    // Preserve its null-session callback but never put either value in logs.
    const sessionDiagnostic = 'this._logger.error(`${this.namespaceLog} Cannot read session "${options.id}": ${err.message}`);';
    if (content.indexOf(sessionDiagnostic) < 0 || content.indexOf(sessionDiagnostic) !== content.lastIndexOf(sessionDiagnostic))
        fail('EOS_ADAPTER_SHUTDOWN_TRANSFORM_ANCHOR');
    content = content.replace(sessionDiagnostic, 'this._logger.error("EOS_SESSION_DATABASE_READ_FAILED");');
    if (sha(content) !== spec.sha256) fail('EOS_ADAPTER_SHUTDOWN_TRANSFORM_OUTPUT_HASH');
    return { relativePath, originalSha256: spec.originalSha256, sha256: spec.sha256, content };
}
function localFile(app, relative) {
    if (typeof app !== 'string' || !path.isAbsolute(app) || path.resolve(app) !== app ||
        typeof relative !== 'string' || relative.includes('\\') || relative.split('/').some(p => !p || p === '.' || p === '..'))
        fail('EOS_ADAPTER_SHUTDOWN_BUILD_PATH');
    let current = app;
    try {
        if (fs.realpathSync(app) !== app) fail('EOS_ADAPTER_SHUTDOWN_BUILD_PATH');
        for (const part of ['', ...relative.split('/').slice(0, -1)]) {
            if (part) current = path.join(current, part);
            const stat = fs.lstatSync(current);
            if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o022)) fail('EOS_ADAPTER_SHUTDOWN_BUILD_PATH');
        }
    } catch { fail('EOS_ADAPTER_SHUTDOWN_BUILD_PATH'); }
    let fd;
    try {
        fd = fs.openSync(path.join(app, relative), fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
        const stat = fs.fstatSync(fd);
        if (!stat.isFile() || stat.size > MAX_BYTES || (stat.mode & 0o022) || stat.nlink !== 1) fail('EOS_ADAPTER_SHUTDOWN_BUILD_FILE');
        const buffer = Buffer.alloc(MAX_BYTES + 1);
        let used = 0, count;
        while ((count = fs.readSync(fd, buffer, used, buffer.length - used, null)) > 0) {
            used += count;
            if (used > MAX_BYTES) fail('EOS_ADAPTER_SHUTDOWN_BUILD_FILE');
        }
        if (used !== stat.size || fs.fstatSync(fd).size !== used) fail('EOS_ADAPTER_SHUTDOWN_BUILD_FILE');
        return buffer.subarray(0, used);
    } catch { fail('EOS_ADAPTER_SHUTDOWN_BUILD_FILE'); }
    finally { if (fd !== undefined) fs.closeSync(fd); }
}
function identity(app) {
    let pkg;
    try { pkg = JSON.parse(localFile(app, `node_modules/${PACKAGE}/package.json`)); }
    catch { fail('EOS_ADAPTER_SHUTDOWN_PACKAGE_IDENTITY'); }
    if (pkg.name !== PACKAGE || pkg.version !== '7.2.5' || pkg.type !== 'module' ||
        pkg.exports?.['.']?.require !== './build/cjs/index.js' || pkg.exports?.['.']?.import !== './build/esm/index.js')
        fail('EOS_ADAPTER_SHUTDOWN_PACKAGE_IDENTITY');
    let resolved;
    try { resolved = createRequire(path.join(app, 'node_modules/iobroker.js-controller/package.json')).resolve(PACKAGE); }
    catch { fail('EOS_ADAPTER_SHUTDOWN_MODULE_RESOLUTION'); }
    if (resolved !== path.join(app, `node_modules/${PACKAGE}/build/cjs/index.js`)) fail('EOS_ADAPTER_SHUTDOWN_MODULE_RESOLUTION');
}
function prepareFiles(app) {
    identity(app);
    const rows = FILES.map(spec => {
        const input = localFile(app, spec.relativePath);
        if (sha(input) === spec.sha256) return { relativePath: spec.relativePath, originalSha256: spec.originalSha256,
            sha256: spec.sha256, content: input.toString('utf8'), unchanged: true };
        return { ...transformFile(spec.relativePath, input), unchanged: false };
    });
    if (rows.some(row => row.unchanged) && !rows.every(row => row.unchanged)) fail('EOS_ADAPTER_SHUTDOWN_BUILD_MIXED_STATE');
    return rows;
}
function applyToBuild(app) {
    const rows = prepareFiles(app); // Authenticate BOTH complete inputs before writing either.
    for (const row of rows.filter(item => !item.unchanged)) {
        const fd = fs.openSync(path.join(app, row.relativePath), fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW);
        try {
            const stat = fs.fstatSync(fd);
            if (!stat.isFile() || stat.nlink !== 1 || (stat.mode & 0o022)) fail('EOS_ADAPTER_SHUTDOWN_BUILD_FILE');
            fs.ftruncateSync(fd, 0); fs.writeFileSync(fd, row.content); fs.fsyncSync(fd);
        } finally { fs.closeSync(fd); }
    }
    return { ...verifyBuild(app), kind: 'eos-controller-adapter-shutdown-transform', changed: rows.some(row => !row.unchanged) };
}
function verifyBuild(app) {
    identity(app);
    for (const row of FILES) if (sha(localFile(app, row.relativePath)) !== row.sha256) fail('EOS_ADAPTER_SHUTDOWN_BUILD_HASH');
    return { schemaVersion: 1, kind: 'eos-controller-adapter-shutdown-verification', component: PACKAGE, version: '7.2.5',
        files: FILES.map(({ flavor, ...row }) => row), productionApproved: false };
}
module.exports = { PACKAGE, MAX_BYTES, FILES, transformFile, prepareFiles, applyToBuild, verifyBuild };
