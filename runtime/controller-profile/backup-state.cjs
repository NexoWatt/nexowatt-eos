'use strict';
// EOS-BACKUP-STATE-001: offline transform for a NEW unsigned candidate only.
// Never run against a live installation or an already signed historical bundle.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const PACKAGE = '@iobroker/js-controller-cli';
const DATA_DIR = '/var/lib/nexowatt-eos/iobroker-data';
const HOME_DIR = '/var/lib/nexowatt-eos/home';
const STAGE_DIR = `${HOME_DIR}/backup-stage`;
const ARCHIVE_DIR = `${DATA_DIR}/nexowatt-backup/backups`;
const FILES = Object.freeze([
    Object.freeze({ relativePath: `node_modules/${PACKAGE}/build/cjs/lib/setup/setupBackup.js`, flavor: 'cjs',
        originalSha256: '616477dc218a6d93a0175f59d2a4f6819c319977d253b08dc0571a318691dce7', sha256: '3c57c8fb32597e2e0b4c8fd3a822411749ac7a8ba7c83629146cf3baa7df9338' }),
    Object.freeze({ relativePath: `node_modules/${PACKAGE}/build/esm/lib/setup/setupBackup.js`, flavor: 'esm',
        originalSha256: '0d8b3050aedb680f384b37863e55f3e82b4680c8b126ba461b9eb6fe8611cded', sha256: '41ba67a57249f207607507d739681e34df2c93182de4b2aea843a07b41f26a33' })
]);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function fail(code) { throw Object.assign(new Error(code), { code }); }
function once(text, anchor, value) {
    if (text.indexOf(anchor) < 0 || text.indexOf(anchor) !== text.lastIndexOf(anchor)) fail('EOS_BACKUP_TRANSFORM_ANCHOR');
    return text.replace(anchor, value);
}
// Embedded verbatim into both CLI flavors. The existing private EOS home/data
// directories must already exist; no chmod/chown, root fallback or env override.
function eosBackupPrivateDirectory(base, parts) {
    const reject = () => { throw new Error('EOS_BACKUP_PRIVATE_PATH'); };
    if (typeof process.getuid !== 'function' || ![eosBackupHome, eosBackupData].includes(base)) reject();
    let current = base;
    const check = () => {
        const stat = eosBackupFs.lstatSync(current);
        if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== process.getuid() ||
            (stat.mode & 0o077) !== 0 || eosBackupFs.realpathSync(current) !== current) reject();
    };
    check();
    for (const part of parts) {
        if (typeof part !== 'string' || !/^[a-z][a-z-]*$/.test(part)) reject();
        current = eosBackupPath.join(current, part);
        try { eosBackupFs.mkdirSync(current, { mode: 0o700 }); }
        catch (error) { if (error.code !== 'EEXIST') throw error; }
        check();
    }
    return current;
}
function eosBackupExcluded(source) {
    const resolved = eosBackupPath.resolve(source);
    for (const excluded of [eosBackupStage, eosBackupArchive]) {
        if (resolved === excluded || resolved.startsWith(excluded + eosBackupPath.sep)) return true;
    }
    // Upstream statSync follows directory links and can recursively copy old
    // archives or the live staging tree. Fail closed instead of following links.
    if (eosBackupFs.existsSync(source)) {
        const stat = eosBackupFs.lstatSync(source);
        if (stat.isSymbolicLink() || eosBackupFs.realpathSync(source) !== resolved ||
            (!stat.isDirectory() && !stat.isFile())) throw new Error('EOS_BACKUP_SOURCE_PATH');
    }
    return false;
}
function embedded(flavor) {
    return '// EOS-BACKUP-STATE-001: immutable code, private external staging and archives.\n' +
        `const eosBackupFs = ${flavor === 'cjs' ? 'import_fs_extra.default' : 'fs'};\n` +
        `const eosBackupPath = ${flavor === 'cjs' ? 'import_node_path.default' : 'path'};\n` +
        `const eosBackupHome = ${JSON.stringify(HOME_DIR)}, eosBackupData = ${JSON.stringify(DATA_DIR)};\n` +
        `const eosBackupStage = ${JSON.stringify(STAGE_DIR)}, eosBackupArchive = ${JSON.stringify(ARCHIVE_DIR)};\n` +
        eosBackupPrivateDirectory.toString() + '\n' + eosBackupExcluded.toString() + '\n';
}
function transformFile(relativePath, input) {
    const spec = FILES.find(row => row.relativePath === relativePath);
    if (!spec || sha(input) !== spec.originalSha256) fail('EOS_BACKUP_TRANSFORM_SOURCE_HASH');
    const cjs = spec.flavor === 'cjs';
    let text = input.toString('utf8');
    text = once(text, cjs ? 'class BackupRestore {' : 'export class BackupRestore {',
        embedded(spec.flavor) + (cjs ? 'class BackupRestore {' : 'export class BackupRestore {'));
    text = once(text, cjs ? 'tmpDir = import_node_path.default.normalize(import_node_path.default.join(controllerDir, "tmp"));' :
        "tmpDir = path.normalize(path.join(controllerDir, 'tmp'));",
    'tmpDir = eosBackupPrivateDirectory(eosBackupHome, ["backup-stage"]);');
    text = once(text, cjs ? 'bkpDir = import_node_path.default.normalize(import_node_path.default.join(controllerDir, "backups"));' :
        "bkpDir = path.normalize(path.join(controllerDir, 'backups'));",
    'bkpDir = eosBackupPrivateDirectory(eosBackupData, ["nexowatt-backup", "backups"]);');
    text = once(text, cjs ? 'return import_node_path.default.join(import_js_controller_common.tools.getRootDir(), "backups/");' :
        "return path.join(tools.getRootDir(), 'backups/');", 'return eosBackupArchive + "/";');
    for (const method of ['copyFileSync', 'copyFolderRecursiveSync']) {
        const anchor = `${method}(source, target) {`;
        text = once(text, anchor, anchor + '\n        if (eosBackupExcluded(source)) return;');
    }
    // Bounds, archive formats and logical DB export/validation remain upstream.
    // System restore remains denied by the immutable CLI admission profile.
    if (sha(text) !== spec.sha256) fail('EOS_BACKUP_TRANSFORM_OUTPUT_HASH');
    return { relativePath, originalSha256: spec.originalSha256, sha256: sha(text), content: text };
}
function localFile(app, relative) {
    if (typeof app !== 'string' || !path.isAbsolute(app) || path.resolve(app) !== app ||
        typeof relative !== 'string' || relative.includes('\\') || relative.split('/').some(p => !p || p === '.' || p === '..'))
        fail('EOS_BACKUP_BUILD_PATH');
    let current = app;
    try {
        if (fs.realpathSync(app) !== app) fail('EOS_BACKUP_BUILD_PATH');
        for (const part of ['', ...relative.split('/').slice(0, -1)]) {
            if (part) current = path.join(current, part);
            const stat = fs.lstatSync(current);
            if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o022)) fail('EOS_BACKUP_BUILD_PATH');
        }
    } catch { fail('EOS_BACKUP_BUILD_PATH'); }
    let fd;
    try {
        fd = fs.openSync(path.join(app, relative), fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
        const stat = fs.fstatSync(fd);
        if (!stat.isFile() || stat.size > 131072 || (stat.mode & 0o022) || stat.nlink !== 1) fail('EOS_BACKUP_BUILD_FILE');
        const buffer = Buffer.alloc(131073);
        let used = 0, count;
        while ((count = fs.readSync(fd, buffer, used, buffer.length - used, null)) > 0) {
            used += count;
            if (used > 131072) fail('EOS_BACKUP_BUILD_FILE');
        }
        if (used !== stat.size || fs.fstatSync(fd).size !== used) fail('EOS_BACKUP_BUILD_FILE');
        return buffer.subarray(0, used);
    } catch { fail('EOS_BACKUP_BUILD_FILE'); }
    finally { if (fd !== undefined) fs.closeSync(fd); }
}
function identity(app) {
    let pkg;
    try { pkg = JSON.parse(localFile(app, `node_modules/${PACKAGE}/package.json`)); }
    catch { fail('EOS_BACKUP_PACKAGE_IDENTITY'); }
    if (pkg.name !== PACKAGE || pkg.version !== '7.2.2' || pkg.type !== 'module' ||
        pkg.exports?.['.']?.require !== './build/cjs/index.js' || pkg.exports?.['.']?.import !== './build/esm/index.js')
        fail('EOS_BACKUP_PACKAGE_IDENTITY');
    let resolved;
    try { resolved = createRequire(path.join(app, 'node_modules/iobroker.js-controller/package.json')).resolve(PACKAGE); }
    catch { fail('EOS_BACKUP_MODULE_RESOLUTION'); }
    if (resolved !== path.join(app, `node_modules/${PACKAGE}/build/cjs/index.js`)) fail('EOS_BACKUP_MODULE_RESOLUTION');
}
function prepareFiles(app) {
    identity(app);
    const rows = FILES.map(spec => {
        const input = localFile(app, spec.relativePath);
        if (sha(input) === spec.sha256) return { relativePath: spec.relativePath, originalSha256: spec.originalSha256,
            sha256: spec.sha256, content: input.toString('utf8'), unchanged: true };
        return { ...transformFile(spec.relativePath, input), unchanged: false };
    });
    // A partially transformed tree is not a successful previous application.
    if (rows.some(row => row.unchanged) && !rows.every(row => row.unchanged)) fail('EOS_BACKUP_BUILD_MIXED_STATE');
    return rows;
}
function applyToBuild(app) {
    const rows = prepareFiles(app); // Validate ALL inputs before first write.
    for (const row of rows.filter(item => !item.unchanged)) {
        const fd = fs.openSync(path.join(app, row.relativePath), fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW);
        try {
            const stat = fs.fstatSync(fd);
            if (!stat.isFile() || stat.nlink !== 1 || (stat.mode & 0o022)) fail('EOS_BACKUP_BUILD_FILE');
            fs.ftruncateSync(fd, 0); fs.writeFileSync(fd, row.content); fs.fsyncSync(fd);
        } finally { fs.closeSync(fd); }
    }
    return { ...verifyBuild(app), kind: 'eos-controller-backup-state-transform',
        changed: rows.some(row => !row.unchanged) };
}
function verifyBuild(app) {
    identity(app);
    for (const row of FILES) if (sha(localFile(app, row.relativePath)) !== row.sha256) fail('EOS_BACKUP_BUILD_HASH');
    return { schemaVersion: 1, kind: 'eos-controller-backup-state-verification', component: PACKAGE, version: '7.2.2',
        stagingDirectory: STAGE_DIR, archiveDirectory: ARCHIVE_DIR, files: FILES.map(({ flavor, ...row }) => row),
        logicalBackupOnly: true, fullSystemRestoreTested: false, productionApproved: false };
}
module.exports = { PACKAGE, DATA_DIR, HOME_DIR, STAGE_DIR, ARCHIVE_DIR, FILES,
    transformFile, prepareFiles, applyToBuild, verifyBuild };
