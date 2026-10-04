'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const pid = require('../../runtime/controller-profile/pid-state.cjs');
const fixtures = path.join(__dirname, 'controller-profile-fixtures');
const original = flavor => fs.readFileSync(path.join(fixtures, `${flavor}-common-db-tools.original.txt`));
function code(expected, action) { assert.throws(action, error => error.code === expected); }
function functionText(text, name) {
    const at = text.indexOf(`function ${name}(`), end = text.indexOf('\n}', at);
    assert.ok(at >= 0 && end > at);
    return text.slice(at, end + 2).replace('(): string', '()');
}
function build(action) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-pid-build-'));
    try {
        for (const row of pid.FILES) {
            const file = path.join(root, row.relativePath);
            fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, original(row.flavor));
        }
        const pkg = { name: pid.PACKAGE, version: '7.2.2', type: 'module', exports: {
            './tools': { require: './build/cjs/lib/common/tools.js', import: './build/esm/lib/common/tools.js' } } };
        fs.writeFileSync(path.join(root, 'node_modules', pid.PACKAGE, 'package.json'), JSON.stringify(pkg));
        for (const parent of ['iobroker.js-controller', '@iobroker/js-controller-common', '@iobroker/js-controller-cli']) {
            const dir = path.join(root, 'node_modules', parent); fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: parent, version: '7.2.2' }));
        }
        return action(root);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
for (const row of [...pid.FILES, pid.SOURCE]) {
    test(`actual ${row.flavor} input and output are pinned; modified input is rejected`, () => {
        const result = pid.transformFile(row.relativePath, original(row.flavor));
        assert.equal(result.originalSha256, row.originalSha256); assert.equal(result.sha256, row.sha256);
        code('EOS_PID_TRANSFORM_SOURCE_HASH', () => pid.transformFile(row.relativePath, Buffer.concat([original(row.flavor), Buffer.from('\n')])));
        const fn = vm.runInNewContext(`(${functionText(result.content, 'getPidsFileName')})`, {
            process: { env: { IOBROKER_DATA_DIR: '/attacker', EOS_PID_FILE: '/attacker' } },
            getControllerDir() { throw new Error('immutable controller path must not be used'); }
        });
        assert.equal(fn(), pid.PID_FILE);
    });
}
test('unknown file and second application of transform are rejected', () => {
    code('EOS_PID_TRANSFORM_SOURCE_HASH', () => pid.transformFile('unknown.js', original('cjs')));
    const row = pid.FILES[0], once = pid.transformFile(row.relativePath, original('cjs'));
    code('EOS_PID_TRANSFORM_SOURCE_HASH', () => pid.transformFile(row.relativePath, Buffer.from(once.content)));
});
test('both complete transformed executable modules pass the actual Node parser', () => build(root => {
    pid.applyToBuild(root);
    for (const row of pid.FILES) {
        const file = path.join(root, row.flavor === 'cjs' ? 'syntax.cjs' : 'syntax.mjs');
        fs.copyFileSync(path.join(root, row.relativePath), file);
        const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8', timeout: 5000 });
        assert.equal(result.status, 0, result.stderr);
    }
}));
test('new build gate rejects unpatched output and verifies both exact patched files', () => build(root => {
    code('EOS_PID_BUILD_HASH', () => pid.verifyBuild(root));
    const evidence = pid.applyToBuild(root), checked = pid.verifyBuild(root);
    assert.equal(evidence.files.length, 2); assert.equal(checked.files.length, 2);
    assert.equal(evidence.pidFile, pid.PID_FILE); assert.equal(evidence.productionApproved, false);
    fs.appendFileSync(path.join(root, pid.FILES[1].relativePath), '\n');
    code('EOS_PID_BUILD_HASH', () => pid.verifyBuild(root));
}));
test('all original files are checked before any output is changed', () => build(root => {
    fs.appendFileSync(path.join(root, pid.FILES[1].relativePath), '\n');
    code('EOS_PID_TRANSFORM_SOURCE_HASH', () => pid.applyToBuild(root));
    assert.deepEqual(fs.readFileSync(path.join(root, pid.FILES[0].relativePath)), original('cjs'));
}));
test('wrong package version and altered ESM export are rejected', () => {
    for (const mutate of [pkg => { pkg.version = '7.2.3'; }, pkg => { pkg.exports['./tools'].import = './other.js'; }]) build(root => {
        const file = path.join(root, 'node_modules', pid.PACKAGE, 'package.json'), pkg = JSON.parse(fs.readFileSync(file));
        mutate(pkg); fs.writeFileSync(file, JSON.stringify(pkg));
        code('EOS_PID_PACKAGE_IDENTITY', () => pid.applyToBuild(root));
    });
});
test('nested common-db copy used by a host/CLI consumer is rejected', () => build(root => {
    const target = path.join(root, 'node_modules/iobroker.js-controller/node_modules', pid.PACKAGE);
    fs.cpSync(path.join(root, 'node_modules', pid.PACKAGE), target, { recursive: true });
    code('EOS_PID_MODULE_RESOLUTION', () => pid.applyToBuild(root));
}));
test('symlink output leaf and parent are rejected without changing external bytes', () => {
    for (const flavor of ['cjs', 'esm']) for (const parent of [false, true]) build(root => {
        const leaf = path.join(root, pid.FILES.find(row => row.flavor === flavor).relativePath), selected = parent ? path.dirname(leaf) : leaf;
        const moved = path.join(root, parent ? 'external-directory' : 'external-file');
        fs.renameSync(selected, moved); fs.symlinkSync(moved, selected);
        code(flavor === 'cjs' ? 'EOS_PID_MODULE_RESOLUTION' : parent ? 'EOS_PID_BUILD_PATH' : 'EOS_PID_BUILD_FILE', () => pid.applyToBuild(root));
        assert.deepEqual(fs.readFileSync(parent ? path.join(moved, 'tools.js') : moved), original(flavor));
    });
});
function storageContext(flavor, getPidsFileName, writableFile, readonlyRoot) {
    const errors = [], pending = [], writes = [], blocked = [];
    const mapped = file => {
        if (file === pid.PID_FILE) return writableFile;
        if (file.startsWith(readonlyRoot + path.sep)) {
            blocked.push(file); throw Object.assign(new Error('read-only file system'), { code: 'EROFS' });
        }
        throw new Error('unexpected fixture path');
    };
    const filesystem = {
        writeFileSync(file, bytes) { writes.push(file); fs.writeFileSync(mapped(file), bytes); },
        readFile: async (file, options) => fs.promises.readFile(mapped(file), options),
        unlinkSync: file => fs.unlinkSync(mapped(file))
    };
    return { errors, pending, writes, blocked, context: {
        storeTimer: null, setTimeout: callback => { pending.push(callback); return 1; },
        procs: { 'admin.0': { process: { pid: 4321 } }, ignored: { process: { pid: 5555 }, startedAsCompactGroup: true } },
        compactProcs: { group: { process: { pid: 1234 } } }, process: { pid: 1111 }, hostLogPrefix: 'fixture-host',
        logger: { error: message => errors.push(String(message)) },
        fs: filesystem, tools: { getPidsFileName },
        import_fs_extra: { default: filesystem }, import_js_controller_common: { tools: { getPidsFileName } },
        getPidsFileName
    } };
}
for (const flavor of ['cjs', 'esm']) test(`actual upstream PID writer/read/cleanup contract (${flavor})`, async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-pid-lifecycle-'));
    const readonlyRoot = path.join(root, 'signed-app'), writable = path.join(root, 'data/pids.txt');
    fs.mkdirSync(readonlyRoot, { mode: 0o555 }); fs.mkdirSync(path.dirname(writable), { mode: 0o700 });
    const main = fs.readFileSync(path.join(fixtures, `${flavor}-main.original.txt`), 'utf8');
    const toolsOriginal = original(flavor).toString('utf8');
    const oldPath = vm.runInNewContext(`(${functionText(toolsOriginal, 'getPidsFileName')})`, {
        getControllerDir: () => readonlyRoot, path, import_node_path: { default: path }
    });
    const old = storageContext(flavor, oldPath, writable, readonlyRoot);
    const beforeMask = process.umask(0o077);
    try {
        // Actual upstream writer catches EROFS and logs it: this defect alone
        // does not prove the separate CONTROLLER_NOT_READY failure's cause.
        vm.runInNewContext(`(${functionText(main, 'storePids')})()`, old.context);
        assert.equal(old.pending.length, 1); assert.doesNotThrow(() => old.pending[0]());
        assert.equal(old.blocked.length, 1); assert.ok(old.errors.some(text => text.includes('could not store process id list')));
        assert.equal(fs.existsSync(writable), false);
        const row = pid.FILES.find(row => row.flavor === flavor), patched = pid.transformFile(row.relativePath, original(flavor)).content;
        const correctedPath = vm.runInNewContext(`(${functionText(patched, 'getPidsFileName')})`);
        const current = storageContext(flavor, correctedPath, writable, readonlyRoot);
        vm.runInNewContext(`(${functionText(main, 'storePids')})()`, current.context);
        current.pending[0]();
        assert.deepEqual(JSON.parse(fs.readFileSync(writable, 'utf8')), [4321, 1234, 1111]);
        assert.equal(fs.statSync(writable).mode & 0o777, 0o600);
        assert.equal(current.errors.length, 0); assert.equal(current.blocked.length, 0);
        const readerText = functionText(patched, 'getPids');
        const reader = vm.runInNewContext(`(async ${readerText})`, current.context);
        assert.equal(JSON.stringify(await reader()), '[4321,1234,1111]');
        // Execute the real controller cleanup statement against the same path.
        const cleanup = main.split('\n').find(line => line.includes('.unlinkSync(') && line.includes('getPidsFileName()'));
        assert.ok(cleanup); vm.runInNewContext(cleanup, current.context);
        assert.equal(fs.existsSync(writable), false); assert.deepEqual(fs.readdirSync(readonlyRoot), []);
        assert.equal(fs.statSync(readonlyRoot).mode & 0o777, 0o555);
        assert.equal(JSON.stringify(await reader()), '[]');
    } finally { process.umask(beforeMask); fs.rmSync(root, { recursive: true, force: true }); }
});
test('existing systemd and provisioning contracts keep code immutable and PID state private', () => {
    for (const profile of ['test-base', 'postgresql-test']) {
        const service = fs.readFileSync(path.join(__dirname, '../../system', profile, 'systemd/nexowatt-eos-controller.service'), 'utf8');
        assert.match(service, /^ProtectSystem=strict$/m); assert.match(service, /^UMask=0077$/m);
        assert.match(service, /^User=eos-runtime$/m); assert.match(service, /^KillMode=control-group$/m);
        const paths = service.split('\n').filter(line => line.startsWith('ReadWritePaths='));
        assert.equal(paths.length, 1); assert.ok(paths[0].includes('/var/lib/nexowatt-eos/iobroker-data'));
        assert.ok(!paths[0].includes('/opt/')); assert.ok(!service.includes('PIDFile='));
    }
    const install = fs.readFileSync(path.join(__dirname, '../../tools/system/install-postgresql-host.cjs'), 'utf8');
    assert.match(install, /function writable\(name, account\) \{ mkdir\(name, 0o700\)/);
    assert.match(install, /iobroker-data'.*writable\(name, 'eos-runtime'\)/);
});
