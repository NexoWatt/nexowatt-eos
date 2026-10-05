'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { createHmac } = require('node:crypto');
const { test } = require('node:test');
const { stageAuthorizedRestore, consumeAuthorizedRestore } = require('../build/lib/restoreAuthorization');

function fixture(t) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-backup-license-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const archive = path.join(dir, 'iobroker_test.tar.gz');
    fs.writeFileSync(archive, 'fixture archive, no customer data');
    return { dir, config: { backupType: 'iobroker', fileName: archive, backupDir: dir } };
}

test('licensed recovery admits exactly one bound restore without online Admin', async t => {
    const { dir, config } = fixture(t);
    let assertions = 0;
    const key = await stageAuthorizedRestore(dir, config, () => { assertions++; });
    assert.equal(assertions, 2);
    assert.equal(fs.statSync(path.join(dir, 'restore.json')).mode & 0o777, 0o600);
    assert.deepEqual(await consumeAuthorizedRestore(dir, key), config);
    await assert.rejects(consumeAuthorizedRestore(dir, key));
});

test('recovery staging fails closed on initial denial or lease loss during archive hashing', async t => {
    const { dir, config } = fixture(t);
    await assert.rejects(stageAuthorizedRestore(dir, config, () => { throw new Error('denied'); }));
    assert.equal(fs.existsSync(path.join(dir, 'restore.json')), false);
    let calls = 0;
    await assert.rejects(stageAuthorizedRestore(dir, config, () => { if (++calls === 2) throw new Error('revoked'); }));
    assert.equal(fs.existsSync(path.join(dir, 'restore.json')), false);
});

test('plain staged config or missing process capability cannot authorize restore', async t => {
    const { dir, config } = fixture(t);
    fs.writeFileSync(path.join(dir, 'restore.json'), JSON.stringify(config), { mode: 0o600 });
    await assert.rejects(consumeAuthorizedRestore(dir, undefined), /AUTH_REQUIRED/);
    await assert.rejects(consumeAuthorizedRestore(dir, 'a'.repeat(64)), /TICKET_INVALID/);
});

test('wrong capability consumes the ticket but never executes recovery', async t => {
    const { dir, config } = fixture(t);
    const key = await stageAuthorizedRestore(dir, config, () => {});
    await assert.rejects(consumeAuthorizedRestore(dir, key === 'a'.repeat(64) ? 'b'.repeat(64) : 'a'.repeat(64)), /AUTH_REQUIRED/);
    await assert.rejects(consumeAuthorizedRestore(dir, key));
});

test('changed archive, edited scope, expired admission and public ticket are rejected', async t => {
    for (const change of ['archive', 'scope', 'expired', 'permissions']) {
        await t.test(change, async t => {
            const { dir, config } = fixture(t);
            const key = await stageAuthorizedRestore(dir, config, () => {});
            const file = path.join(dir, 'restore.json');
            if (change === 'archive') fs.appendFileSync(config.fileName, 'tampered');
            if (change === 'permissions') fs.chmodSync(file, 0o644);
            if (change === 'scope' || change === 'expired') {
                const ticket = JSON.parse(fs.readFileSync(file));
                const payload = JSON.parse(ticket.payload);
                if (change === 'scope') payload.config.backupType = '../arbitrary';
                else payload.expiresAt = Date.now() - 1;
                ticket.payload = JSON.stringify(payload);
                // Even a correctly authenticated but out-of-scope/expired ticket is rejected.
                ticket.mac = createHmac('sha256', Buffer.from(key, 'hex')).update(ticket.payload).digest('hex');
                fs.writeFileSync(file, JSON.stringify(ticket));
            }
            await assert.rejects(consumeAuthorizedRestore(dir, key));
            assert.equal(fs.existsSync(file), false);
        });
    }
});

test('restore dispatcher rejects direct null-adapter or unlicensed invocation', () => {
    const { restore } = require('../build/lib/restore');
    let result;
    restore(null, {}, null, null, null, null, null, {}, value => { result = value; });
    assert.equal(result.error, 'EOS_RECOVERY_AUTH_REQUIRED');
    restore({}, {}, null, null, null, null, null, {}, value => { result = value; });
    assert.equal(result.error, 'EOS_LICENSE_REQUIRED');
});

function adapterHarness() {
    let allowed = false;
    let onLost;
    let executed = 0;
    const replies = [];
    const guard = {
        async start() { return allowed; },
        async stop() { onLost(); },
        isAllowed() { return allowed; },
        assertAllowed() { if (!allowed) throw new Error('denied'); },
        getStatus() { return { valid: allowed, code: allowed ? 'LICENSE_VALID' : 'LICENSE_DENIED' }; },
    };
    class Adapter {
        constructor() { this.name = 'nexowatt-backup'; this.namespace = 'nexowatt-backup.0'; this.config = {}; this.log = { error() {}, info() {}, warn() {}, debug() {} }; }
        on() {}
        sendTo(...args) { replies.push(args); }
    }
    const module = { exports: {} };
    const modules = {
        '@iobroker/adapter-core': { Adapter, getAbsoluteDefaultDataDir: () => os.tmpdir() },
        'node-schedule': {},
        '../packages/eos-license-client': { createLicenseGuard(_adapter, options) { onLost = options.onLost; return guard; } },
        './lib/tools': {},
        './lib/execute': { __esModule: true, default: (_adapter, _config, callback) => { executed++; callback(); } },
        './lib/systemCheck': {}, './lib/tokenRefresher': { __esModule: true, default: class {} }, './lib/sdCard': {},
    };
    const localRequire = name => Object.hasOwn(modules, name) ? modules[name] : require(name);
    localRequire.main = {};
    const filename = path.resolve(__dirname, '../build/main.js');
    vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { require: localRequire, module, exports: module.exports, __dirname: path.dirname(filename), setTimeout, clearTimeout, setInterval, clearInterval, process, console });
    const adapter = module.exports();
    return { adapter, replies, setAllowed(value) { allowed = value; }, lose() { allowed = false; onLost(); }, get executed() { return executed; } };
}

test('startup denied then activation resumes; revocation blocks and renewal resumes exactly once', async t => {
    const h = adapterHarness();
    t.after(() => clearInterval(h.adapter.licenseMonitor));
    let initialized = 0;
    h.adapter.main = async () => { initialized++; h.adapter.operationalReady = true; };
    await h.adapter.onReady();
    assert.equal(initialized, 0);
    let error;
    await h.adapter.startBackup({}, value => { error = value; });
    assert.equal(error, 'EOS_LICENSE_REQUIRED');
    await h.adapter.onMessage({ command: 'restore', from: 'eos-admin.0', message: {}, callback: {} });
    assert.equal(h.replies[0][2].error, 'EOS_LICENSE_REQUIRED');
    h.setAllowed(true);
    await Promise.all([h.adapter.synchronizeLicensedWork(), h.adapter.synchronizeLicensedWork()]);
    assert.equal(initialized, 1);
    await h.adapter.startBackup({}, value => { error = value; });
    assert.equal(h.executed, 1);
    let cancelled = 0;
    h.adapter.backupTimeSchedules.job = { cancel() { cancelled++; } };
    h.lose();
    assert.equal(cancelled, 1);
    await h.adapter.startBackup({}, value => { error = value; });
    assert.equal(error, 'EOS_LICENSE_REQUIRED');
    assert.equal(h.executed, 1);
    h.setAllowed(true);
    assert.throws(() => h.adapter.assertLicensedOperation(), /NOT_READY/);
    await Promise.all([h.adapter.synchronizeLicensedWork(), h.adapter.synchronizeLicensedWork()]);
    assert.equal(initialized, 2);
    await h.adapter.startBackup({}, value => { error = value; });
    assert.equal(h.executed, 2);
});

test('destroyed token refresher cannot restart after an in-flight state read', async () => {
    const TokenRefresher = require('../build/lib/tokenRefresher').default;
    let finishRead;
    let subscribed = 0;
    const refresher = new TokenRefresher({
        getStateAsync: () => new Promise(resolve => { finishRead = resolve; }),
        subscribeStatesAsync: async () => { subscribed++; },
        config: {}, log: { error() {} }, clearTimeout() {},
    }, 'info.dropboxTokens', 'https://example.invalid');
    refresher.destroy();
    finishRead({ val: '{}' });
    await refresher.readyPromise;
    assert.equal(subscribed, 0);
    await refresher.refreshTokens();
    assert.equal(await refresher.getAccessToken(), undefined);
});

test('native EOS system restore directs operator recovery before download or staging', () => {
    const { restore } = require('../build/lib/restore');
    for (const name of ['iobroker', 'redis', 'iobroker_2026_10_05.tar.gz', 'redis_2026_10_05.tar.gz', '2026_10_05-01_02_03_backupiobroker.tar.gz']) {
        let result;
        restore({ assertLicensedOperation() {} }, {}, 'webdav', name, 'dark', 'https:', '/unusable', {}, value => { result = value; });
        assert.equal(result.error, 'EOS_OPERATOR_RECOVERY_REQUIRED');
    }
});

test('generated launch script never sends recovery capability into systemd properties or argv', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../build/main.js'), 'utf8');
    assert.equal(source.includes('--setenv=NEXOWATT_RESTORE_KEY'), false);
    assert.equal(source.includes('--preserve-env=NEXOWATT_RESTORE_KEY'), false);
});
