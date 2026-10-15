'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const shutdown = require('../../runtime/controller-profile/adapter-shutdown.cjs');
const fixtures = path.join(__dirname, 'controller-profile-fixtures');
function original(flavor) {
    const bytes = fs.readFileSync(path.join(fixtures, `${flavor}-adapter.original.txt`));
    // Upstream ESM has no final LF; repository fixture adds exactly one.
    return flavor === 'esm' ? bytes.subarray(0, -1) : bytes;
}
function code(expected, operation) { assert.throws(operation, error => error.code === expected); }
function build(operation) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-adapter-shutdown-'));
    try {
        for (const row of shutdown.FILES) {
            const file = path.join(root, row.relativePath);
            fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, original(row.flavor));
        }
        const pkg = { name: shutdown.PACKAGE, version: '7.2.2', type: 'module', exports: {
            '.': { import: './build/esm/index.js', require: './build/cjs/index.js' } } };
        fs.writeFileSync(path.join(root, 'node_modules', shutdown.PACKAGE, 'package.json'), JSON.stringify(pkg));
        fs.writeFileSync(path.join(root, 'node_modules', shutdown.PACKAGE, 'build/cjs/index.js'), '');
        const controller = path.join(root, 'node_modules/iobroker.js-controller');
        fs.mkdirSync(controller); fs.writeFileSync(path.join(controller, 'package.json'), '{"name":"iobroker.js-controller","version":"7.2.2"}');
        return operation(root);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
for (const row of shutdown.FILES) test(`${row.flavor}: authenticated whole input/output and unchanged error/deadline logic`, () => {
    const result = shutdown.transformFile(row.relativePath, original(row.flavor));
    assert.equal(result.originalSha256, row.originalSha256); assert.equal(result.sha256, row.sha256);
    assert.match(result.content, /Cannot set alive state to false:/);
    assert.match(result.content, /finishUnload\(\)\.then\(terminate, terminate\)/);
    assert.match(result.content, /this\.common\?\.stopTimeout \|\| 500/);
    code('EOS_ADAPTER_SHUTDOWN_TRANSFORM_SOURCE_HASH', () => shutdown.transformFile(row.relativePath, Buffer.concat([original(row.flavor), Buffer.from('x')])));
    code('EOS_ADAPTER_SHUTDOWN_TRANSFORM_SOURCE_HASH', () => shutdown.transformFile(row.relativePath, Buffer.from(result.content)));
});
test('unknown transform path is refused', () => {
    code('EOS_ADAPTER_SHUTDOWN_TRANSFORM_SOURCE_HASH', () => shutdown.transformFile('arbitrary.js', original('cjs')));
});
test('both entire transformed distribution files pass native Node syntax checks', () => build(root => {
    for (const row of shutdown.FILES) {
        const file = path.join(root, `syntax.${row.flavor === 'esm' ? 'mjs' : 'cjs'}`);
        fs.writeFileSync(file, shutdown.transformFile(row.relativePath, original(row.flavor)).content);
        const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8', timeout: 5000 });
        assert.equal(result.status, 0, result.stderr);
    }
}));
test('whole-file idempotent verification, output drift and mixed-state rejection', () => build(root => {
    code('EOS_ADAPTER_SHUTDOWN_BUILD_HASH', () => shutdown.verifyBuild(root));
    const first = shutdown.applyToBuild(root), second = shutdown.applyToBuild(root);
    assert.equal(first.changed, true); assert.equal(second.changed, false);
    assert.equal(first.productionApproved, false); assert.equal(first.files.length, 2);
    fs.appendFileSync(path.join(root, shutdown.FILES[1].relativePath), '\n');
    code('EOS_ADAPTER_SHUTDOWN_BUILD_HASH', () => shutdown.verifyBuild(root));
    code('EOS_ADAPTER_SHUTDOWN_TRANSFORM_SOURCE_HASH', () => shutdown.applyToBuild(root));
}));
test('both inputs validated before mutation; partially applied candidates fail closed', () => {
    build(root => {
        fs.appendFileSync(path.join(root, shutdown.FILES[1].relativePath), 'x');
        code('EOS_ADAPTER_SHUTDOWN_TRANSFORM_SOURCE_HASH', () => shutdown.applyToBuild(root));
        assert.deepEqual(fs.readFileSync(path.join(root, shutdown.FILES[0].relativePath)), original('cjs'));
    });
    build(root => {
        const row = shutdown.FILES[0];
        fs.writeFileSync(path.join(root, row.relativePath), shutdown.transformFile(row.relativePath, original(row.flavor)).content);
        code('EOS_ADAPTER_SHUTDOWN_BUILD_MIXED_STATE', () => shutdown.applyToBuild(root));
        assert.deepEqual(fs.readFileSync(path.join(root, shutdown.FILES[1].relativePath)), original('esm'));
    });
});
test('package/version/entry drift and nested unpatched resolution rejected', () => {
    for (const mutate of [pkg => { pkg.version = '7.2.3'; }, pkg => { pkg.exports['.'].import = './other.js'; }]) build(root => {
        const file = path.join(root, 'node_modules', shutdown.PACKAGE, 'package.json'), pkg = JSON.parse(fs.readFileSync(file));
        mutate(pkg); fs.writeFileSync(file, JSON.stringify(pkg));
        code('EOS_ADAPTER_SHUTDOWN_PACKAGE_IDENTITY', () => shutdown.applyToBuild(root));
    });
    build(root => {
        fs.cpSync(path.join(root, 'node_modules', shutdown.PACKAGE),
            path.join(root, 'node_modules/iobroker.js-controller/node_modules', shutdown.PACKAGE), { recursive: true });
        code('EOS_ADAPTER_SHUTDOWN_MODULE_RESOLUTION', () => shutdown.applyToBuild(root));
    });
});
test('symlink/hardlink/special files, unsafe modes and oversized input refused before writes', () => {
    for (const variant of ['symlink', 'hardlink', 'directory', 'file-mode', 'parent-mode', 'parent-symlink', 'oversized']) build(root => {
        const file = path.join(root, shutdown.FILES[1].relativePath), moved = path.join(root, 'retained-input');
        if (variant === 'file-mode') fs.chmodSync(file, 0o666);
        else if (variant === 'parent-mode') fs.chmodSync(path.dirname(file), 0o777);
        else if (variant === 'oversized') fs.truncateSync(file, shutdown.MAX_BYTES + 1);
        else if (variant === 'parent-symlink') { fs.renameSync(path.dirname(file), moved); fs.symlinkSync(moved, path.dirname(file)); }
        else {
            fs.renameSync(file, moved);
            if (variant === 'symlink') fs.symlinkSync(moved, file);
            if (variant === 'hardlink') fs.linkSync(moved, file);
            if (variant === 'directory') fs.mkdirSync(file);
        }
        code(variant.startsWith('parent-') ? 'EOS_ADAPTER_SHUTDOWN_BUILD_PATH' : 'EOS_ADAPTER_SHUTDOWN_BUILD_FILE', () => shutdown.applyToBuild(root));
        assert.deepEqual(fs.readFileSync(path.join(root, shutdown.FILES[0].relativePath)), original('cjs'));
    });
});
test('symlink root and relative/noncanonical roots refused', () => build(root => {
    const alias = path.join(root, 'alias'); fs.symlinkSync(root, alias);
    for (const invalid of [alias, path.relative(process.cwd(), root), root + '/.'])
        code('EOS_ADAPTER_SHUTDOWN_PACKAGE_IDENTITY', () => shutdown.applyToBuild(invalid));
}));

// Execute the actual pinned _stop/terminate method bodies in both flavors.
// Only the clock, logger and DB boundary are fixtures; this is not a native PG
// or hardware test. Nothing in the shutdown implementation is reimplemented.
function runtime(flavor, { patched = true, held = false, noCallback = false, reenter = false } = {}) {
    const row = shutdown.FILES.find(item => item.flavor === flavor);
    const text = patched ? shutdown.transformFile(row.relativePath, original(flavor)).content : original(flavor).toString('utf8');
    const indent = flavor === 'cjs' ? '  ' : '    ';
    function method(signature) {
        const start = text.indexOf(indent + signature), end = text.indexOf('\n' + indent + '/**', start);
        assert.ok(start >= 0 && end > start); return text.slice(start, end);
    }
    let time = 0, nextId = 0, closed = false, calls = 0, callback, resolveWrite, rejectWrite;
    const timers = new Map(), events = [];
    const setTimeout = (fn, ms) => { const id = ++nextId; timers.set(id, { fn, at: time + ms }); return id; };
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    const heldWrite = new Promise((resolve, reject) => { resolveWrite = resolve; rejectWrite = reject; });
    const states = {
        async setState(id, value) {
            calls++; const call = calls;
            assert.equal(id, 'system.adapter.eos-admin.0.alive'); assert.equal(value.val, false); assert.equal(value.ack, true);
            events.push({ event: 'write-start', call, time });
            if (reenter && call === 1) callback();
            if (held) await heldWrite;
            else await delay(call === 1 ? 1 : 20);
            if (closed) { events.push({ event: 'write-after-close', call, time }); throw new Error('EOS_PG_CLOSED'); }
            events.push({ event: 'write-complete', call, time });
        },
        async destroy() { closed = true; events.push({ event: 'db-close', time }); await delay(30); },
    };
    const logger = {
        info(text) { if (text.includes(' Terminated (')) events.push({ event: 'terminate', time }); }, warn() {},
        error(text) { events.push({ event: 'error', code: text.includes('Cannot set alive state to false:') ? 'ALIVE_SHUTDOWN_WRITE_FAILED' : 'OTHER', time }); },
    };
    const EXIT_CODES = { START_IMMEDIATELY_AFTER_STOP: 11, ADAPTER_REQUESTED_TERMINATION: 156, NO_ERROR: 0 };
    const Validator = { getErrorText: () => '' };
    const scope = { Promise, states, logger, setTimeout, clearTimeout: id => timers.delete(id), clearInterval: id => timers.delete(id),
        EXIT_CODES, Validator, import_js_controller_common: { EXIT_CODES }, import_validator: { Validator },
        onUnload(done) { callback = done; if (!noCallback) done(); },
        process: { exit: code => events.push({ event: 'exit', code, time }) } };
    const adapter = vm.runInNewContext(`class AdapterHarness {
        #states; #objects;
        constructor() {
            this.#states = states; this.#objects = { async destroy() {} };
            this._config = {}; this._options = {}; this.common = {}; this.adapterReady = true;
            this.namespace = this.namespaceLog = 'eos-admin.0'; this._logger = logger;
            this._timers = new Set(); this._intervals = new Set(); this._delays = new Set(); this.messageCallbacks = new Map();
        }
        emit(name, callback) { if (name === 'unload') onUnload(callback); }
        ${method('async _stop(options = {}) {')}
        ${method('terminate(reason, exitCode) {')}
    }; new AdapterHarness();`, scope, { timeout: 5000 });
    const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
    async function advance(target) {
        assert.ok(target >= time); await flush();
        for (let count = 0; count < 100; count++) {
            const next = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0];
            if (!next || next[1].at > target) { time = target; await flush(); return; }
            time = next[1].at; timers.delete(next[0]); next[1].fn(); await flush();
        }
        assert.fail('fixture timer limit');
    }
    return { adapter, events, advance, resolveWrite, rejectWrite, callUnload: () => callback(), calls: () => calls };
}
for (const flavor of ['cjs', 'esm']) {
    test(`${flavor}: original actual methods reproduce duplicate alive write racing DB teardown`, async () => {
        const f = runtime(flavor, { patched: false }); await f.adapter._stop(); await f.advance(1000);
        assert.equal(f.calls(), 2);
        assert.ok(f.events.some(e => e.event === 'write-after-close'));
        assert.ok(f.events.some(e => e.code === 'ALIVE_SHUTDOWN_WRITE_FAILED'));
    });
    test(`${flavor}: patched callback and deadline perform one write and one DB teardown`, async () => {
        const f = runtime(flavor); await f.adapter._stop(); await f.advance(1000);
        assert.equal(f.calls(), 1); assert.equal(f.events.filter(e => e.event === 'db-close').length, 1);
        assert.equal(f.events.filter(e => e.event === 'terminate').length, 1);
        assert.ok(!f.events.some(e => e.event === 'error' || e.event === 'write-after-close'));
    });
    test(`${flavor}: pending shared write blocks deadline termination and synchronous reentry`, async () => {
        const f = runtime(flavor, { held: true, reenter: true }); await f.adapter._stop(); await f.advance(600);
        assert.equal(f.calls(), 1); const first = f.callUnload(); assert.equal(f.callUnload(), first);
        assert.ok(!f.events.some(e => e.event === 'terminate' || e.event === 'db-close'));
        f.resolveWrite(); await first; await f.advance(1200);
        assert.equal(f.calls(), 1); assert.equal(f.events.filter(e => e.event === 'db-close').length, 1);
        assert.ok(!f.events.some(e => e.event === 'error'));
    });
    test(`${flavor}: actual write rejection remains logged once and permits bounded cleanup`, async () => {
        const f = runtime(flavor, { held: true }); await f.adapter._stop(); await f.advance(600);
        assert.ok(!f.events.some(e => e.event === 'terminate'));
        f.rejectWrite(new Error('EOS_PG_UNAVAILABLE')); await f.advance(1200);
        assert.equal(f.calls(), 1); assert.equal(f.events.filter(e => e.code === 'ALIVE_SHUTDOWN_WRITE_FAILED').length, 1);
        assert.equal(f.events.filter(e => e.event === 'db-close').length, 1);
    });
    test(`${flavor}: missing callback retains upstream fallback and late callback shares completion`, async () => {
        const f = runtime(flavor, { noCallback: true }); await f.adapter._stop(); await f.advance(499);
        assert.equal(f.calls(), 0); await f.advance(501); assert.equal(f.calls(), 1);
        f.callUnload(); await f.advance(1100);
        assert.equal(f.calls(), 1); assert.equal(f.events.filter(e => e.event === 'db-close').length, 1);
        assert.ok(!f.events.some(e => e.event === 'error'));
    });
}
