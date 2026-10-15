'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const backup = require('../../runtime/controller-profile/backup-state.cjs');
const fixtures = path.join(__dirname, 'controller-profile-fixtures');
function original(flavor) {
    const bytes = fs.readFileSync(path.join(fixtures, `${flavor}-setupBackup.original.txt`));
    // The ESM upstream file has no terminal LF. The text fixture adds exactly
    // one LF for repository tooling; its reconstructed bytes must match the pin.
    return flavor === 'esm' ? bytes.subarray(0, -1) : bytes;
}
function code(expected, fn) { assert.throws(fn, error => error.code === expected); }
function build(fn) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-backup-build-'));
    try {
        for (const row of backup.FILES) {
            const file = path.join(root, row.relativePath);
            fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, original(row.flavor));
        }
        const pkg = { name: backup.PACKAGE, version: '7.2.2', type: 'module', exports: {
            '.': { import: './build/esm/index.js', require: './build/cjs/index.js' } } };
        fs.writeFileSync(path.join(root, 'node_modules', backup.PACKAGE, 'package.json'), JSON.stringify(pkg));
        fs.writeFileSync(path.join(root, 'node_modules', backup.PACKAGE, 'build/cjs/index.js'), '');
        const controller = path.join(root, 'node_modules/iobroker.js-controller');
        fs.mkdirSync(controller); fs.writeFileSync(path.join(controller, 'package.json'), '{"name":"iobroker.js-controller","version":"7.2.2"}');
        return fn(root);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
for (const row of backup.FILES) test(`${row.flavor}: exact authenticated R9 input/output; changed bytes rejected`, () => {
    const result = backup.transformFile(row.relativePath, original(row.flavor));
    assert.equal(result.originalSha256, row.originalSha256); assert.equal(result.sha256, row.sha256);
    code('EOS_BACKUP_TRANSFORM_SOURCE_HASH', () => backup.transformFile(row.relativePath, Buffer.concat([original(row.flavor), Buffer.from('x')])));
    code('EOS_BACKUP_TRANSFORM_SOURCE_HASH', () => backup.transformFile(row.relativePath, Buffer.from(result.content)));
});
test('unknown files are never transformed', () => {
    code('EOS_BACKUP_TRANSFORM_SOURCE_HASH', () => backup.transformFile('arbitrary.js', original('cjs')));
});
test('both actual transformed modules pass native Node syntax checks', () => build(root => {
    for (const row of backup.FILES) {
        const file = path.join(root, `syntax.${row.flavor === 'esm' ? 'mjs' : 'cjs'}`);
        fs.writeFileSync(file, backup.transformFile(row.relativePath, original(row.flavor)).content);
        const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8', timeout: 5000 });
        assert.equal(result.status, 0, result.stderr);
    }
}));
test('new candidate transform is exactly idempotent and drift fails closed', () => build(root => {
    code('EOS_BACKUP_BUILD_HASH', () => backup.verifyBuild(root));
    const first = backup.applyToBuild(root), second = backup.applyToBuild(root);
    assert.equal(first.changed, true); assert.equal(second.changed, false);
    assert.equal(first.logicalBackupOnly, true); assert.equal(first.fullSystemRestoreTested, false);
    assert.equal(first.productionApproved, false); assert.equal(first.files.length, 2);
    fs.appendFileSync(path.join(root, backup.FILES[1].relativePath), '\n');
    code('EOS_BACKUP_BUILD_HASH', () => backup.verifyBuild(root));
    code('EOS_BACKUP_TRANSFORM_SOURCE_HASH', () => backup.applyToBuild(root));
}));
test('all source bytes are verified before writing; mixed candidate state rejected', () => {
    build(root => {
        fs.appendFileSync(path.join(root, backup.FILES[1].relativePath), 'x');
        code('EOS_BACKUP_TRANSFORM_SOURCE_HASH', () => backup.applyToBuild(root));
        assert.deepEqual(fs.readFileSync(path.join(root, backup.FILES[0].relativePath)), original('cjs'));
    });
    build(root => {
        const row = backup.FILES[0];
        fs.writeFileSync(path.join(root, row.relativePath), backup.transformFile(row.relativePath, original(row.flavor)).content);
        code('EOS_BACKUP_BUILD_MIXED_STATE', () => backup.applyToBuild(root));
        assert.deepEqual(fs.readFileSync(path.join(root, backup.FILES[1].relativePath)), original('esm'));
    });
});
test('package drift, alternative entry and nested controller resolution are refused', () => {
    for (const mutate of [pkg => { pkg.version = '7.2.3'; }, pkg => { pkg.exports['.'].import = './other.js'; }]) build(root => {
        const file = path.join(root, 'node_modules', backup.PACKAGE, 'package.json'), pkg = JSON.parse(fs.readFileSync(file));
        mutate(pkg); fs.writeFileSync(file, JSON.stringify(pkg));
        code('EOS_BACKUP_PACKAGE_IDENTITY', () => backup.applyToBuild(root));
    });
    build(root => {
        fs.cpSync(path.join(root, 'node_modules', backup.PACKAGE),
            path.join(root, 'node_modules/iobroker.js-controller/node_modules', backup.PACKAGE), { recursive: true });
        code('EOS_BACKUP_MODULE_RESOLUTION', () => backup.applyToBuild(root));
    });
});
test('symlink/hardlink/special output files and unsafe parent/file modes are refused', () => {
    for (const variant of ['symlink', 'hardlink', 'directory', 'file-mode', 'parent-mode', 'parent-symlink']) build(root => {
        const file = path.join(root, backup.FILES[1].relativePath), moved = path.join(root, 'retained-input');
        if (variant === 'file-mode') fs.chmodSync(file, 0o666);
        else if (variant === 'parent-mode') fs.chmodSync(path.dirname(file), 0o777);
        else if (variant === 'parent-symlink') {
            fs.renameSync(path.dirname(file), moved); fs.symlinkSync(moved, path.dirname(file));
        } else {
            fs.renameSync(file, moved);
            if (variant === 'symlink') fs.symlinkSync(moved, file);
            if (variant === 'hardlink') fs.linkSync(moved, file);
            if (variant === 'directory') fs.mkdirSync(file);
        }
        code(variant.startsWith('parent-') ? 'EOS_BACKUP_BUILD_PATH' : 'EOS_BACKUP_BUILD_FILE', () => backup.applyToBuild(root));
        assert.deepEqual(fs.readFileSync(path.join(root, backup.FILES[0].relativePath)), original('cjs'));
    });
});
test('symlink app root and noncanonical relative build root are refused', () => build(root => {
    const alias = path.join(root, 'alias'); fs.symlinkSync(root, alias);
    code('EOS_BACKUP_PACKAGE_IDENTITY', () => backup.applyToBuild(alias));
    code('EOS_BACKUP_PACKAGE_IDENTITY', () => backup.applyToBuild(path.relative(process.cwd(), root)));
}));
function runtime(flavor, fn) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-backup-runtime-'));
    const prefix = '/var/lib/nexowatt-eos';
    const mapped = file => {
        assert.equal(typeof file, 'string');
        assert.ok(file === prefix || file.startsWith(prefix + '/'), `unexpected filesystem path: ${file}`);
        return path.join(root, file.slice(prefix.length));
    };
    const filesystem = {};
    for (const name of ['lstatSync', 'statSync', 'existsSync', 'readdirSync', 'mkdirSync', 'rmSync', 'readFileSync', 'writeFileSync'])
        filesystem[name] = (file, ...args) => fs[name](mapped(file), ...args);
    filesystem.realpathSync = file => prefix + fs.realpathSync(mapped(file)).slice(root.length);
    filesystem.ensureDirSync = file => fs.mkdirSync(mapped(file), { recursive: true, mode: 0o700 });
    const tools = { getControllerDir: () => '/immutable-release', getRootDir: () => '/immutable-release',
        getHostName: () => 'fixture', getConfigFileName: () => backup.DATA_DIR + '/iobroker.json', appNameLowerCase: 'iobroker' };
    const imports = { 'fs-extra': filesystem, 'node:path': path,
        '@iobroker/js-controller-common': { tools, EXIT_CODES: {} },
        'promisify-child-process': {}, tar: {}, './setupUpload.js': { Upload: class {} },
        './dbConnection.js': {}, './customError.js': { IoBrokerError: class extends Error {} },
        '../../lib/cli/cliProcess.js': {}, 'node:fs/promises': {} };
    const spec = backup.FILES.find(row => row.flavor === flavor);
    let content = backup.transformFile(spec.relativePath, original(flavor)).content;
    if (flavor === 'esm') content = content.replace(/^import .+;\n/gm, '').replace('export class BackupRestore', 'class BackupRestore');
    const scope = { fs: filesystem, path, tools, Upload: class {}, module: { exports: {} },
        console: { log() {}, warn() {}, error() {} }, process: { getuid: process.getuid,
            env: { HOME: '/attacker', IOBROKER_DATA_DIR: '/attacker', EOS_BACKUP_PATH: '/attacker' } },
        require: name => { assert.ok(Object.hasOwn(imports, name), name); return imports[name]; } };
    try {
        for (const dir of [backup.HOME_DIR, backup.DATA_DIR]) fs.mkdirSync(mapped(dir), { mode: 0o700 });
        const Constructor = vm.runInNewContext(content + '\nBackupRestore;', scope, { timeout: 5000 });
        const create = () => new Constructor({ objects: {}, states: {}, processExit() {}, cleanDatabase() {}, restartController() {} });
        return fn({ Constructor, create, root, mapped, scope, filesystem });
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
for (const flavor of ['cjs', 'esm']) {
    test(`${flavor}: actual class uses private external writable paths, ignoring env overrides`, () => runtime(flavor, ctx => {
        const instance = ctx.create();
        assert.equal(instance.tmpDir, backup.STAGE_DIR); assert.equal(instance.bkpDir, backup.ARCHIVE_DIR);
        assert.equal(ctx.Constructor.getBackupDir(), backup.ARCHIVE_DIR + '/');
        for (const file of [backup.STAGE_DIR, path.dirname(backup.ARCHIVE_DIR), backup.ARCHIVE_DIR])
            assert.equal(fs.statSync(ctx.mapped(file)).mode & 0o777, 0o700);
        assert.equal(ctx.create().tmpDir, backup.STAGE_DIR);
    }));
    test(`${flavor}: existing world-readable path or foreign owner is rejected, never silently chmodded`, () => {
        for (const directory of [backup.HOME_DIR, backup.DATA_DIR, backup.STAGE_DIR, backup.ARCHIVE_DIR]) runtime(flavor, ctx => {
            ctx.create(); fs.chmodSync(ctx.mapped(directory), 0o755);
            assert.throws(() => ctx.create(), /EOS_BACKUP_PRIVATE_PATH/);
            assert.equal(fs.statSync(ctx.mapped(directory)).mode & 0o777, 0o755);
        });
        runtime(flavor, ctx => {
            ctx.scope.process.getuid = () => process.getuid() + 1;
            assert.throws(() => ctx.create(), /EOS_BACKUP_PRIVATE_PATH/);
        });
    });
    test(`${flavor}: symbolic-link stage/home/archive entries are refused`, () => {
        for (const directory of [backup.HOME_DIR, backup.STAGE_DIR, backup.ARCHIVE_DIR]) runtime(flavor, ctx => {
            ctx.create(); const originalPath = ctx.mapped(directory), moved = path.join(ctx.root, 'retained-private');
            fs.renameSync(originalPath, moved); fs.symlinkSync(moved, originalPath);
            assert.throws(() => ctx.create(), /EOS_BACKUP_PRIVATE_PATH/);
            assert.deepEqual(fs.readdirSync(moved), directory === backup.HOME_DIR ? ['backup-stage'] : []);
        });
    });
    test(`${flavor}: real recursive-copy method excludes archives/staging while retaining adapter files`, () => runtime(flavor, ctx => {
        const instance = ctx.create(), adapterDir = path.dirname(backup.ARCHIVE_DIR);
        fs.writeFileSync(ctx.mapped(backup.ARCHIVE_DIR + '/old.tar.gz'), 'previous archive');
        fs.writeFileSync(ctx.mapped(adapterDir + '/settings.json'), '{"retained":true}');
        const target = backup.STAGE_DIR + '/backup'; fs.mkdirSync(ctx.mapped(target));
        instance.copyFolderRecursiveSync(adapterDir, target);
        assert.equal(fs.readFileSync(ctx.mapped(target + '/nexowatt-backup/settings.json'), 'utf8'), '{"retained":true}');
        assert.equal(fs.existsSync(ctx.mapped(target + '/nexowatt-backup/backups')), false);
        instance.copyFolderRecursiveSync(backup.HOME_DIR, target);
        assert.equal(fs.existsSync(ctx.mapped(target + '/home/backup-stage')), false);
        instance.removeTempBackupDir();
        assert.equal(fs.existsSync(ctx.mapped(target)), false);
        assert.equal(fs.readFileSync(ctx.mapped(backup.ARCHIVE_DIR + '/old.tar.gz'), 'utf8'), 'previous archive');
    }));
    test(`${flavor}: recursive source symlink cannot reintroduce excluded archives`, () => runtime(flavor, ctx => {
        const instance = ctx.create(), source = backup.DATA_DIR + '/adapter-data';
        fs.mkdirSync(ctx.mapped(source)); fs.symlinkSync(ctx.mapped(backup.ARCHIVE_DIR), ctx.mapped(source + '/alias'));
        const target = backup.STAGE_DIR + '/backup'; fs.mkdirSync(ctx.mapped(target));
        assert.throws(() => instance.copyFolderRecursiveSync(source, target), /EOS_BACKUP_SOURCE_PATH/);
    }));
}
test('existing immutable code and private service boundaries remain unchanged', () => {
    const service = fs.readFileSync(path.join(__dirname, '../../system/postgresql-test/systemd/nexowatt-eos-controller.service'), 'utf8');
    assert.match(service, /^ProtectSystem=strict$/m); assert.match(service, /^UMask=0077$/m);
    assert.match(service, /^User=eos-runtime$/m);
    const writable = service.split('\n').filter(row => row.startsWith('ReadWritePaths='));
    assert.equal(writable.length, 1); assert.ok(writable[0].includes(backup.HOME_DIR));
    assert.ok(writable[0].includes(backup.DATA_DIR)); assert.ok(!writable[0].includes('/opt'));
    const transform = fs.readFileSync(path.join(__dirname, '../../runtime/controller-profile/transform.cjs'), 'utf8');
    assert.match(transform, /CLI_BLOCK.*"restore"/);
});
