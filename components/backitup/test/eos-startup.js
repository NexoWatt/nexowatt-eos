'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { randomBytes } = require('node:crypto');
const { test } = require('node:test');

function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-backup-startup-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const dataDir = path.join(root, 'iobroker-data');
    fs.mkdirSync(dataDir, { mode: 0o700 });
    return { root, dataDir };
}

function loadTools(dataDir) {
    const module = { exports: {} };
    const localRequire = name => name === '@iobroker/adapter-core'
        ? { getAbsoluteDefaultDataDir: () => dataDir } : require(name);
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../build/lib/tools.js'), 'utf8'), {
        require: localRequire, exports: module.exports, module, process, console, Buffer,
    });
    return module.exports;
}

function loadAdapter(dataDir, tools, secret, hooks = {}) {
    const errors = [];
    const states = [];
    let allowed = hooks.allowed !== false, onLost;
    class Adapter {
        constructor() {
            this.name = 'nexowatt-backup'; this.namespace = 'nexowatt-backup.0';
            this.config = structuredClone(require('../io-package.json').native);
            this.log = { error: code => errors.push(code), info() {}, warn() {}, debug() {} };
        }
        on() {}
        subscribeStates() {}
        async setObjectNotExistsAsync() {}
        async setStateAsync(id, value) { if (hooks.state) await hooks.state(id, value); states.push([id, value.val]); }
        async getForeignObjectAsync() { if (hooks.read) await hooks.read(); return { common: {}, native: { secret } }; }
    }
    const module = { exports: {} };
    const mocks = {
        '@iobroker/adapter-core': { Adapter, getAbsoluteDefaultDataDir: () => dataDir },
        'node-schedule': {},
        '../packages/eos-license-client': { createLicenseGuard(_adapter, options) { onLost = options.onLost; return {
            isAllowed: () => allowed, assertAllowed() { if (!allowed) throw Error('EOS_LICENSE_REQUIRED'); },
            async start() { if (hooks.guard) await hooks.guard(); return allowed; }, async stop() { onLost(); },
        }; } },
        './lib/tools': tools,
        './lib/execute': {}, './lib/systemCheck': {}, './lib/tokenRefresher': {}, './lib/sdCard': {},
    };
    const localRequire = name => Object.hasOwn(mocks, name) ? mocks[name] : require(name);
    localRequire.main = {};
    const filename = path.join(__dirname, '../build/main.js');
    vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
        require: localRequire, exports: module.exports, module, process, console,
        __dirname: path.dirname(filename), setTimeout, clearTimeout, setInterval, clearInterval,
    });
    const adapter = module.exports();
    adapter.initConfig = async key => { assert.equal(key, secret); };
    adapter.checkStates = async () => { if (hooks.checkStates) await hooks.checkStates(); };
    adapter.createBackupSchedule = () => {};
    adapter.nextBackup = async () => {};
    adapter.detectLatestBackupFile = async () => {};
    return { adapter, errors, states, setAllowed(value) { allowed = value; if (!value) onLost(); } };
}

test('host-specific secret required: missing/malformed values never use fallback', () => {
    const tools = loadTools('/unused');
    for (const value of [undefined, null, '', 123, {}, [], 'short', ' '.repeat(48), 'g'.repeat(48), 'a'.repeat(31), 'a'.repeat(129)]) {
        assert.throws(() => tools.requireSystemSecret(value), /EOS_BACKUP_SYSTEM_SECRET_INVALID/);
    }
    for (const bytes of [16, 24, 32, 64]) {
        const secret = randomBytes(bytes).toString('hex');
        assert.equal(tools.requireSystemSecret(secret), secret);
    }
});

test('private archive directory stays inside existing writable data tree', t => {
    const { root, dataDir } = fixture(t), tools = loadTools(dataDir);
    const backupDir = tools.ensureBackupDirectory();
    assert.equal(backupDir, path.join(dataDir, 'nexowatt-backup', 'backups'));
    assert.equal(fs.statSync(backupDir).mode & 0o777, 0o700);
    assert.equal(fs.statSync(path.dirname(backupDir)).mode & 0o777, 0o700);
    assert.equal(tools.ensureBackupDirectory(), backupDir);
    assert.equal(fs.existsSync(path.join(root, 'backups')), false);
});

test('archive directory rejects symlink and public parent without widening rights', t => {
    const { root, dataDir } = fixture(t), tools = loadTools(dataDir);
    const parent = path.join(dataDir, 'nexowatt-backup');
    fs.symlinkSync(root, parent);
    assert.throws(() => tools.ensureBackupDirectory(), /EOS_BACKUP_DATA_PATH_UNSAFE/);
    assert.equal(fs.existsSync(path.join(root, 'backups')), false);
    fs.unlinkSync(parent);
    fs.mkdirSync(parent, { mode: 0o755 });
    assert.throws(() => tools.ensureBackupDirectory(), /EOS_BACKUP_DATA_PATH_UNSAFE/);
    assert.equal(fs.statSync(parent).mode & 0o777, 0o755);
});

test('archive setup does not follow a substituted data-directory symlink', t => {
    const { root, dataDir } = fixture(t);
    const alias = path.join(root, 'data-link');
    fs.symlinkSync(dataDir, alias);
    assert.throws(() => loadTools(alias).ensureBackupDirectory(), /EOS_BACKUP_DATA_PATH_UNSAFE/);
    assert.deepEqual(fs.readdirSync(dataDir), []);
});

test('invalid secret blocks actual startup before any local files or schedules', async t => {
    const { dataDir } = fixture(t), tools = loadTools(dataDir);
    const { adapter } = loadAdapter(dataDir, tools, undefined);
    await assert.rejects(adapter.main(), /EOS_BACKUP_SYSTEM_SECRET_INVALID/);
    assert.equal(adapter.operationalReady, false);
    assert.deepEqual(fs.readdirSync(dataDir), []);
});

test('licensed startup makes writable archive directory, no privileged launcher, retains recovery evidence', async t => {
    const { dataDir } = fixture(t), tools = loadTools(dataDir);
    tools.ensureBackupDirectory();
    const parent = path.dirname(tools.getBackupDir());
    const ticket = path.join(parent, 'restore.json');
    fs.writeFileSync(ticket, 'retained diagnostic evidence', { mode: 0o600 });
    const { adapter } = loadAdapter(dataDir, tools, randomBytes(24).toString('hex'));
    await adapter.main();
    assert.equal(adapter.operationalReady, true);
    assert.equal(fs.readFileSync(ticket, 'utf8'), 'retained diagnostic evidence');
    assert.equal(fs.statSync(path.join(parent, 'nexowatt-backup.0.log')).mode & 0o777, 0o600);
    for (const name of ['stopIOB.sh', 'startIOB.sh', 'external.sh', 'stopIOB.bat', 'external.bat']) {
        assert.equal(fs.existsSync(path.join(parent, name)), false);
    }
});

test('all archive producers/readers share new path and no legacy launcher is emitted', () => {
    for (const file of ['main.js', 'lib/execute.js', 'lib/list.js', 'lib/list/cifs.js', 'lib/restore.js']) {
        const source = fs.readFileSync(path.join(__dirname, '../build', file), 'utf8');
        assert.doesNotMatch(source, /getIobDir\(\), ["']backups/);
    }
    const main = fs.readFileSync(path.join(__dirname, '../build/main.js'), 'utf8');
    assert.doesNotMatch(main, /sudo systemd-run|--uid=iobroker|createBashScripts|native\?\.secret \|\|/);
});

test('private log reader rejects symlinks, hardlinks, public files and oversized files', t => {
    const { root, dataDir } = fixture(t), tools = loadTools(dataDir);
    const secret = path.join(root, 'secret');
    fs.writeFileSync(secret, 'do not replay', { mode: 0o600 });
    const link = path.join(root, 'linked-log');
    fs.symlinkSync(secret, link);
    assert.throws(() => tools.readPrivateLog(link), /EOS_BACKUP_LOG_UNSAFE/);
    fs.unlinkSync(link);
    fs.linkSync(secret, link);
    assert.throws(() => tools.readPrivateLog(link), /EOS_BACKUP_LOG_UNSAFE/);
    fs.unlinkSync(link);
    fs.chmodSync(secret, 0o644);
    assert.throws(() => tools.readPrivateLog(secret), /EOS_BACKUP_LOG_UNSAFE/);
    fs.chmodSync(secret, 0o600);
    assert.throws(() => tools.readPrivateLog(secret, 2), /EOS_BACKUP_LOG_UNSAFE/);
    assert.equal(tools.readPrivateLog(secret), 'do not replay');
});

test('existing runtime log symlink blocks startup without reading or overwriting target', async t => {
    const { root, dataDir } = fixture(t), tools = loadTools(dataDir);
    tools.ensureBackupDirectory();
    const secret = path.join(root, 'secret');
    fs.writeFileSync(secret, 'private sentinel', { mode: 0o600 });
    fs.symlinkSync(secret, path.join(path.dirname(tools.getBackupDir()), 'nexowatt-backup.0.log'));
    const { adapter } = loadAdapter(dataDir, tools, randomBytes(24).toString('hex'));
    await assert.rejects(adapter.main(), /EOS_BACKUP_LOG_UNSAFE/);
    assert.equal(fs.readFileSync(secret, 'utf8'), 'private sentinel');
    assert.equal(adapter.operationalReady, false);
});

test('previous log symlink is retained and never replayed into logs or states', t => {
    const { root, dataDir } = fixture(t), tools = loadTools(dataDir);
    tools.ensureBackupDirectory();
    const secret = path.join(root, 'secret');
    fs.writeFileSync(secret, 'private sentinel', { mode: 0o600 });
    const link = path.join(tools.getBackupDir(), 'logs.txt');
    fs.symlinkSync(secret, link);
    const { adapter } = loadAdapter(dataDir, tools, randomBytes(24).toString('hex'));
    const output = [], states = [];
    adapter.log = Object.fromEntries(['info','warn','debug','error'].map(level => [level, text => output.push(text)]));
    adapter.setState = (...args) => { states.push(args); };
    adapter.readLogFile();
    assert.deepEqual(output, ['EOS_BACKUP_LOG_UNSAFE']);
    assert.deepEqual(states, []);
    assert.ok(fs.lstatSync(link).isSymbolicLink());
    assert.equal(fs.readFileSync(secret, 'utf8'), 'private sentinel');
});

function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
function runtimeStates(f) { return f.states.filter(([id]) => id === 'info.runtimeState').map(([, value]) => value); }

test('runtime readiness is read-only and ready follows complete state initialization', async t => {
    const meta = require('../io-package.json').instanceObjects.find(row => row._id === 'info.runtimeState');
    assert.equal(meta.common.read, true); assert.equal(meta.common.write, false);
    const { dataDir } = fixture(t), entered = deferred(), gate = deferred();
    const f = loadAdapter(dataDir, loadTools(dataDir), randomBytes(24).toString('hex'), {
        async checkStates() { entered.resolve(); await gate.promise; },
    });
    t.after(() => clearInterval(f.adapter.licenseMonitor));
    const start = f.adapter.onReady(); await entered.promise;
    assert.equal(f.adapter.operationalReady, false);
    assert.deepEqual(runtimeStates(f), ['waiting_license', 'starting']);
    gate.resolve(); await start;
    assert.equal(f.adapter.operationalReady, true);
    assert.equal(runtimeStates(f).at(-1), 'ready');
    await f.adapter.onUnload(() => {});
    assert.equal(runtimeStates(f).at(-1), 'stopped');
});

test('licensed startup failure publishes error, never ready or secret content', async t => {
    const { dataDir } = fixture(t);
    const f = loadAdapter(dataDir, loadTools(dataDir), undefined);
    t.after(() => clearInterval(f.adapter.licenseMonitor));
    await f.adapter.onReady();
    assert.equal(f.adapter.operationalReady, false);
    assert.deepEqual(runtimeStates(f), ['waiting_license', 'starting', 'error']);
    assert.deepEqual(fs.readdirSync(dataDir), []);
    await f.adapter.onUnload(() => {});
});

test('license wait, activation and revocation publish truthful nonsecret readiness', async t => {
    const { dataDir } = fixture(t);
    const f = loadAdapter(dataDir, loadTools(dataDir), randomBytes(24).toString('hex'), { allowed: false });
    t.after(() => clearInterval(f.adapter.licenseMonitor));
    await f.adapter.onReady();
    assert.deepEqual(runtimeStates(f), ['waiting_license']);
    f.setAllowed(true); await f.adapter.synchronizeLicensedWork();
    assert.equal(runtimeStates(f).at(-1), 'ready');
    f.setAllowed(false); await f.adapter.runtimeStateWrites;
    assert.equal(runtimeStates(f).at(-1), 'waiting_license');
    assert.equal(f.adapter.operationalReady, false);
    await f.adapter.onUnload(() => {});
});

for (const stage of ['guard', 'read', 'checkStates']) {
    test(`unload during ${stage} waits and cannot publish late ready or create late schedules`, async t => {
        const { dataDir } = fixture(t), entered = deferred(), gate = deferred();
        const f = loadAdapter(dataDir, loadTools(dataDir), randomBytes(24).toString('hex'), {
            async [stage]() { entered.resolve(); await gate.promise; },
        });
        t.after(() => clearInterval(f.adapter.licenseMonitor));
        let schedules = 0, unloaded = false;
        f.adapter.createBackupSchedule = () => { schedules++; };
        const start = f.adapter.onReady(); await entered.promise;
        const stop = f.adapter.onUnload(() => { unloaded = true; });
        await Promise.resolve(); assert.equal(unloaded, false);
        gate.resolve(); await start; await stop;
        assert.equal(unloaded, true); assert.equal(f.adapter.operationalReady, false);
        assert.equal(schedules, 0); assert.equal(runtimeStates(f).includes('ready'), false);
        assert.equal(runtimeStates(f).at(-1), 'stopped');
        if (stage !== 'checkStates') assert.deepEqual(fs.readdirSync(dataDir), []);
        const writes = f.states.length;
        await f.adapter.onReady(); await f.adapter.synchronizeLicensedWork();
        assert.equal(f.states.length, writes);
    });
}

test('pending ready state write completes before final stopped, never after unload callback', async t => {
    const { dataDir } = fixture(t), entered = deferred(), gate = deferred();
    const f = loadAdapter(dataDir, loadTools(dataDir), randomBytes(24).toString('hex'), {
        async state(_id, value) { if (value.val === 'ready') { entered.resolve(); await gate.promise; } },
    });
    t.after(() => clearInterval(f.adapter.licenseMonitor));
    const start = f.adapter.onReady(); await entered.promise;
    let unloaded = false; const stop = f.adapter.onUnload(() => { unloaded = true; });
    await Promise.resolve(); assert.equal(unloaded, false);
    gate.resolve(); await start; await stop;
    assert.equal(unloaded, true); assert.equal(runtimeStates(f).at(-1), 'stopped');
    assert.equal(f.adapter.operationalReady, false);
});
