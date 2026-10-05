#!/usr/bin/env node
'use strict';

// These tests execute the shipped JavaScript with an in-memory ioBroker boundary.
// They neither start a server nor load external packages, connect to a controller,
// change a real account, or contact a network. HTTP parser registration checks
// below are explicitly static checks; they are not a live multipart/HTTP test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const copy = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const tests = [];
const test = (name, run) => tests.push({ name, run });
const applianceProfile = require('../build/lib/eosApplianceProfile.js');
const quietLog = { debug() {}, info() {}, warn() {}, error() {} };
const { isEosSameOriginRequest } = require('../build/lib/eosRequestSecurity.js');

function loadWebPrototype() {
    const exports = {};
    const filename = path.join(root, 'build/lib/web.js');
    const sandbox = {
        exports,
        module: { exports },
        __dirname: path.dirname(filename),
        __filename: filename,
        require: name => name.startsWith('node:') ? require(name) : name === './eosApplianceProfile' ? applianceProfile : name === './eosSessionSecurity' ? require('../build/lib/eosSessionSecurity') : {},
        Buffer, URL, console, process: { env: {} },
        setTimeout() { throw new Error('Unexpected timer/server startup in isolated test'); },
        setInterval() { throw new Error('Unexpected timer/server startup in isolated test'); },
        clearTimeout() {}, clearInterval() {},
    };
    vm.runInNewContext(read('build/lib/web.js'), sandbox, { filename, timeout: 5000 });
    assert.equal(typeof exports.default, 'function', 'Web class must be exported');
    return exports.default.prototype;
}

const webPrototype = loadWebPrototype();
function makeWeb({ sessions = {}, users = {}, settings = {} } = {}) {
    const lookedUp = [];
    const web = Object.create(webPrototype);
    web.settings = { auth: true, ...settings };
    web.eosAccountWrites = new Set();
    web.eosPasswordWriteRates = new Map();
    web.adapter = {
        config: web.settings,
        namespace: 'eos-admin.0',
        log: quietLog,
        eosSessionSecurity: { revoke() {} },
        getSession(id, callback) { lookedUp.push(id); callback(copy(sessions[id])); },
        async getForeignObjectAsync(id) { return copy(users[id]); },
    };
    return { web, lookedUp };
}
const guest = () => ({ _id: 'system.user.guest', type: 'user', common: { enabled: true, password: 'personal-hash' }, native: {} });
const request = token => ({ headers: token ? { authorization: `Bearer ${token}` } : {}, query: {} });

test('live full-length session authenticates an enabled existing user', async () => {
    for (const token of ['test-full-session-token', 'a:test-full-session-token']) {
        const { web } = makeWeb({ sessions: { 'a:test-full-session-token': { user: 'guest', aExp: Date.now() + 60_000 } }, users: { 'system.user.guest': guest() } });
        assert.equal(await web.readEosCurrentUser(request(token)), 'system.user.guest', token);
    }
});

test('expired, absent, and nonnumeric session expiry fail closed', async () => {
    for (const aExp of [Date.now() - 1, 0, undefined, null, 'invalid', NaN, Infinity]) {
        const { web } = makeWeb({ sessions: { 'a:test-full-session-token': { user: 'guest', aExp } }, users: { 'system.user.guest': guest() } });
        assert.equal(await web.readEosCurrentUser(request('test-full-session-token')), null, `Rejected aExp=${String(aExp)}`);
    }
});

test('one-character session alias cannot authenticate an unrelated bearer token', async () => {
    const { web, lookedUp } = makeWeb({ sessions: { 'a:e': { user: 'admin', aExp: Date.now() + 60_000 } }, users: { 'system.user.admin': { ...guest(), _id: 'system.user.admin' } } });
    assert.equal(await web.readEosCurrentUser(request('test-full-session-token')), null);
    assert.ok(!lookedUp.includes('a:e'), 'No shortened alias lookup is allowed');
});

test('disabled, deleted, and non-user objects cannot use otherwise live sessions', async () => {
    for (const user of [undefined, { ...guest(), common: { enabled: false } }, { ...guest(), type: 'state' }]) {
        const { web } = makeWeb({ sessions: { 'a:test-full-session-token': { user: 'guest', aExp: Date.now() + 60_000 } }, users: { 'system.user.guest': user } });
        assert.equal(await web.readEosCurrentUser(request('test-full-session-token')), null);
    }
});

test('session and user database errors fail closed', async () => {
    const { web } = makeWeb({ sessions: { 'a:test-full-session-token': { user: 'guest', aExp: Date.now() + 60_000 } }, users: { 'system.user.guest': guest() } });
    web.adapter.getForeignObjectAsync = async () => { throw new Error('simulated user database failure'); };
    assert.equal(await web.readEosCurrentUser(request('test-full-session-token')), null);
    web.readSession = async () => { throw new Error('simulated session database failure'); };
    assert.equal(await web.readEosCurrentUser(request('test-full-session-token')), null);
});

test('raw/refresh namespaces and short tokens cannot authenticate a live user', async () => {
    for (const id of ['test-full-session-token', 'r:test-full-session-token']) {
        const { web } = makeWeb({ sessions: { [id]: { user: 'guest', aExp: Date.now() + 60_000 } }, users: { 'system.user.guest': guest() } });
        assert.equal(await web.readEosCurrentUser(request('test-full-session-token')), null);
    }
    const { web, lookedUp } = makeWeb({ sessions: { 'a:short': { user: 'guest', aExp: Date.now() + 60_000 } }, users: { 'system.user.guest': guest() } });
    assert.equal(await web.readEosCurrentUser(request('short')), null);
    assert.equal(lookedUp.length, 0, 'Malformed tokens must not hit the session database');
});

test('upstream authenticated identity still requires an enabled existing user', async () => {
    const { web } = makeWeb({ users: { 'system.user.guest': guest() } });
    assert.equal(await web.readEosCurrentUser({ ...request(), user: 'guest' }), 'system.user.guest');
    web.adapter.getForeignObjectAsync = async () => ({ ...guest(), common: { enabled: false } });
    assert.equal(await web.readEosCurrentUser({ ...request(), user: 'guest' }), null);
});

test('missing credentials never authenticate while auth is required', async () => {
    const { web } = makeWeb({ users: { 'system.user.guest': guest() } });
    assert.equal(await web.readEosCurrentUser(request()), null);
});

test('legacy auth=false cannot imply administrator identity without login', async () => {
    const { web } = makeWeb({ settings: { auth: false, defaultUser: 'system.user.admin' },
        users: { 'system.user.admin': { ...guest(), _id: 'system.user.admin' } } });
    assert.equal(await web.readEosCurrentUser(request()), null);
    assert.equal(await web.readEosCurrentUser({ ...request(), user: 'admin' }), null);
    assert.ok(read('src/lib/web.ts').includes('this.settings = { ...this.settings, bind, auth: true }'));
    assert.ok(/auth: true,/.test(read('src/main.ts').slice(read('src/main.ts').indexOf('async initSocket('))));
});

test('role-looking labels and unconfigured group IDs never elevate authority', () => {
    const { web } = makeWeb();
    for (const label of ['NexoWatt Service', 'EOS Service', 'service admin', 'service administrator', 'installer', 'Installateur', 'Techniker', 'Integrator', 'Partner']) {
        assert.equal(web.resolveEosRole('system.user.guest', ['system.group.custom'], [label], ['system.group.administrator']), 'enduser', label);
    }
    for (const id of ['system.group.service-admin', 'system.group.technician', 'system.group.partner']) {
        assert.equal(web.resolveEosRole('system.user.guest', [id], [], ['system.group.administrator']), 'enduser', id);
    }
});

test('explicit administrator and installer membership retains intended authority', () => {
    const { web } = makeWeb();
    assert.equal(web.resolveEosRole('system.user.admin', ['system.group.administrator'], [], []), 'admin');
    assert.equal(web.resolveEosRole('system.user.operator', ['system.group.administrator'], [], []), 'admin');
    assert.equal(web.resolveEosRole('system.user.operator', ['system.group.custom-trusted-admin'], [], ['system.group.custom-trusted-admin']), 'enduser');
    const installers = web.getEosInstallerGroups();
    assert.ok(installers.length > 0, 'An explicit installer group must exist');
    assert.equal(web.resolveEosRole('system.user.operator', [installers[0]], [], []), 'installer');
});

function loadProvisioning() {
    const built = read('build/main.js');
    const first = built.search(/const EOS_(?:STABLE|LEGACY)_INITIAL_PASSWORD\s*=/);
    const end = built.indexOf('\nclass Admin ', first);
    assert.ok(first >= 0 && end > first, 'Cannot locate shipped provisioning helpers');
    const sandbox = { exports: {}, console, Buffer, node_crypto_1: crypto, _nodeCrypto: crypto, randomBytes: crypto.randomBytes };
    vm.runInNewContext(`${built.slice(first, end)}\nexports.provision = ensureEosStableInitialAccounts;`, sandbox, { filename: 'build/main.js:provisioning', timeout: 5000 });
    return sandbox.exports.provision;
}

function makeAdapter(initial) {
    const objects = new Map(Object.entries(copy(initial)));
    const writes = [];
    const passwordWrites = [];
    const adapter = {
        log: quietLog,
        async getForeignObjectAsync(id) { return copy(objects.get(id)); },
        async setForeignObjectAsync(id, value) { writes.push(id); objects.set(id, copy(value)); },
        async extendForeignObjectAsync(id, value) {
            writes.push(id);
            const current = objects.get(id) || {};
            objects.set(id, { ...current, ...copy(value), common: { ...current.common, ...copy(value.common) }, native: { ...current.native, ...copy(value.native) } });
        },
        async checkPasswordAsync(user, password) { return objects.get(`system.user.${user.replace(/^system\.user\./, '')}`)?.common?.password === `hash:${password}`; },
        async setPasswordAsync(user, password) {
            const id = `system.user.${user.replace(/^system\.user\./, '')}`;
            passwordWrites.push({ id, password });
            const value = objects.get(id);
            assert.ok(value, 'Password target exists');
            value.common.password = `hash:${password}`;
        },
    };
    return { adapter, objects, writes, passwordWrites };
}

test('new, blank, and known shared-password accounts are disabled without setting shared passwords', async () => {
    const provision = loadProvisioning();
    const { adapter, objects, passwordWrites } = makeAdapter({
        'system.user.installer': { ...guest(), _id: 'system.user.installer', common: { enabled: true, password: '' } },
        'system.user.guest': { ...guest(), common: { enabled: true, password: 'hash:nexowatt' } },
    });
    await provision(adapter);
    for (const id of ['system.user.installer', 'system.user.guest', 'system.user.user']) {
        assert.equal(objects.get(id)?.common?.enabled, false, `${id} must not remain usable`);
    }
    assert.ok(passwordWrites.every(write => write.password !== 'nexowatt'), 'Never introduce the known shared bootstrap password');
});

test('provisioning preserves personal passwords, disabled status, and the administrator', async () => {
    const provision = loadProvisioning();
    const admin = { ...guest(), _id: 'system.user.admin', common: { enabled: true, password: 'admin-personal-hash' }, native: { retained: 'admin' } };
    const personal = { ...guest(), _id: 'system.user.installer', common: { enabled: true, password: 'installer-personal-hash' }, native: { retained: 'installer' } };
    const disabled = { ...guest(), common: { enabled: false, password: 'guest-personal-hash' } };
    const { adapter, objects, writes, passwordWrites } = makeAdapter({ 'system.user.admin': admin, 'system.user.installer': personal, 'system.user.guest': disabled });
    await provision(adapter);
    assert.deepEqual(objects.get('system.user.admin'), admin);
    assert.ok(!writes.includes('system.user.admin'), 'Administrator is outside automated provisioning');
    assert.equal(objects.get('system.user.installer').common.password, personal.common.password);
    assert.equal(objects.get('system.user.installer').common.enabled, true);
    assert.equal(objects.get('system.user.installer').native.retained, 'installer');
    assert.equal(objects.get('system.user.guest').common.password, disabled.common.password);
    assert.equal(objects.get('system.user.guest').common.enabled, false);
    assert.ok(!passwordWrites.some(write => ['system.user.admin', 'system.user.installer', 'system.user.guest'].includes(write.id)));
});

test('password-check failure aborts startup provisioning', async () => {
    const provision = loadProvisioning();
    const { adapter, objects } = makeAdapter({ 'system.user.guest': { ...guest(), common: { enabled: true, password: 'hash:nexowatt' } } });
    adapter.checkPasswordAsync = async () => { throw new Error('simulated password verifier unavailable'); };
    await assert.rejects(() => provision(adapter), /simulated password verifier unavailable/);
    assert.equal(objects.get('system.user.guest').common.password, 'hash:nexowatt', 'An unavailable verifier cannot silently rewrite an existing credential');
});

async function runTechnicalGuard({ role = 'admin', userId = 'system.user.test', adminOnly = true, write = true, pending = false, origin = true, error = false } = {}) {
    const { web } = makeWeb();
    web.getEosRequestAccess = async () => { if (error) throw new Error('simulated ACL store failure'); return { role, userId }; };
    web.getEosFirstLoginPasswordState = async () => ({ required: pending });
    web.isEosSameOriginWrite = () => origin;
    return new Promise((resolve, reject) => {
        let status;
        const timer = setTimeout(() => reject(new Error('Guard neither responded nor called next')), 2000);
        const finish = outcome => { clearTimeout(timer); resolve(outcome); };
        const res = { status(value) { status = value; return this; }, json(body) { finish({ status, body }); } };
        web.eosTechnicalRouteGuard(adminOnly, write)(request(), res, () => finish({ next: true }));
    });
}

test('upload guard rejects anonymous, customer, installer, pending-password, and foreign-origin requests', async () => {
    for (const options of [{ userId: null }, { role: 'enduser' }, { role: 'installer' }, { pending: true }, { origin: false }]) {
        const result = await runTechnicalGuard(options);
        assert.equal(result.status, 403, JSON.stringify(options));
        assert.ok(!result.next, 'Denied request must not enter the upload parser');
    }
});

test('upload guard permits authorized same-origin administrator and rejects ACL failures', async () => {
    assert.equal((await runTechnicalGuard()).next, true);
    assert.equal((await runTechnicalGuard({ error: true })).status, 503);
    assert.equal((await runTechnicalGuard({ adminOnly: false, role: 'installer' })).next, true);
    assert.equal((await runTechnicalGuard({ adminOnly: false, role: 'enduser' })).status, 403);
});

test('source and shipped upload parser registration enforce limits before file handling (static)', () => {
    for (const filename of ['src/lib/web.ts', 'build/lib/web.js']) {
        const code = read(filename);
        assert.match(code, /EOS_UPLOAD_MAX_BYTES\s*=\s*200\s*\*\s*1024\s*\*\s*1024/);
        const helper = read(filename.startsWith('src/') ? 'src/lib/eosUploadGuard.js' : 'build/lib/eosUploadGuard.js');
        assert.match(helper, /abortOnLimit:\s*true/);
        assert.match(helper, /fileSize:\s*MAX_FILE/);
        for (const [key, value] of [['files', 1], ['fields', 4], ['parts', 5]]) assert.match(helper, new RegExp(`${key}:\\s*${value}\\b`));
        assert.match(helper, /uploadTimeout:\s*(?:30_000|30000)/);
        assert.match(code, /['"]\/upload['"],\s*this\.eosTechnicalRouteGuard\(true,\s*true\),\s*(?:\(0,\s*[\w$]+\.createUploadMiddleware\)|createUploadMiddleware)\(/);
        assert.match(code, /['"]\/upload-adapter['"],\s*this\.eosTechnicalRouteGuard\(true,\s*true\),\s*(?:[\w$]+\.)?blockUnsignedUpload,\s*(?:\(0,\s*[\w$]+\.createUploadMiddleware\)|createUploadMiddleware)\(/);
        assert.match(code, /myFile\.truncated\s*\|\|\s*myFile\.size\s*>\s*EOS_UPLOAD_MAX_BYTES/);
        assert.doesNotMatch(code, /myFile\.data\s*&&\s*myFile\.data\.length\s*>/, 'Temp-file upload size must not depend on the in-memory data buffer');
    }
});

test('same-origin browser writes retain host, port, and transport scheme', () => {
    assert.equal(isEosSameOriginRequest({ host: 'eos.local:8188', origin: 'https://eos.local:8188', 'sec-fetch-site': 'same-origin' }, 'https:'), true);
    assert.equal(isEosSameOriginRequest({ host: 'eos.local:8188', origin: 'http://eos.local:8188', 'sec-fetch-site': 'same-origin' }, 'http:'), true);
    assert.equal(isEosSameOriginRequest({ host: 'eos.local:8188', origin: 'http://eos.local:8188' }, 'https:'), false, 'Mixed-scheme origin');
    assert.equal(isEosSameOriginRequest({ host: 'eos.local:8188', origin: 'https://eos.local:8081' }, 'https:'), false, 'Wrong port');
    assert.equal(isEosSameOriginRequest({ host: 'eos.local:8188', origin: 'https://other.local:8188' }, 'https:'), false, 'Wrong host');
});

test('forged X-Forwarded-Host does not authorize another origin', () => {
    const headers = { host: 'eos.local:8188', origin: 'https://attacker.invalid', 'x-forwarded-host': 'attacker.invalid' };
    assert.equal(isEosSameOriginRequest(headers, 'https:'), false);
    assert.equal(isEosSameOriginRequest({ ...headers, 'x-forwarded-host': 'attacker.invalid, eos.local:8188' }, 'https:'), false);
});

test('cookie-authorized writes require Origin even when a bearer header is also present', () => {
    assert.equal(isEosSameOriginRequest({ host: 'eos.local:8188', cookie: 'access_token=test-only-placeholder' }, 'https:'), false);
    assert.equal(isEosSameOriginRequest({ host: 'eos.local:8188', cookie: 'access_token=test-only-placeholder', authorization: 'Bearer test-only-placeholder' }, 'https:'), false);
    assert.equal(isEosSameOriginRequest({ host: 'eos.local:8188' }, 'https:'), false);
});

test('explicit non-cookie bearer clients can omit Origin', () => {
    assert.equal(isEosSameOriginRequest({ host: 'eos.local:8188', authorization: 'Bearer test-only-placeholder' }, 'https:'), true);
    for (const authorization of ['', 'Bearer ', 'Basic test-only-placeholder', 'Bearer two words', ['Bearer token']]) {
        assert.equal(isEosSameOriginRequest({ host: 'eos.local:8188', authorization }, 'https:'), false);
    }
});

test('malformed or non-origin URLs fail closed', () => {
    for (const origin of ['null', 'not a URL', 'file://eos.local:8188', 'https://eos.local:8188/', 'https://eos.local:8188/path', 'https://user:pass@eos.local:8188', 'https://eos.local:8188?x=1', ['https://eos.local:8188']]) {
        assert.equal(isEosSameOriginRequest({ host: 'eos.local:8188', origin, cookie: 'session=test-only-placeholder' }, 'https:'), false, String(origin));
    }
});

test('cross-site and same-site fetch metadata cannot authorize writes', () => {
    for (const fetchSite of ['cross-site', 'same-site']) {
        assert.equal(isEosSameOriginRequest({ host: 'eos.local:8188', origin: 'https://eos.local:8188', 'sec-fetch-site': fetchSite }, 'https:'), false);
    }
    assert.equal(isEosSameOriginRequest({ host: 'eos.local:8188', origin: 'https://eos.local:8188', 'sec-fetch-site': 'none' }, 'https:'), true);
});

function makeSocketGuard({ role = 'installer', userId = 'system.user.test', disabled = false, pending = false, originalAllowed = true, healthy = true, sessionAllowed = true } = {}) {
    const code = read('build/main.js');
    const start = code.indexOf('installEosSocketCommandGuard(socketAdmin) {');
    const end = code.indexOf('async ensureEosRoleModel()', start);
    assert.ok(start >= 0 && end > start, 'Shipped socket guard is available');
    const install = vm.runInNewContext(`({ ${code.slice(start, end)} }).installEosSocketCommandGuard`, { ERROR_PERMISSION: 'permissionError', eosApplianceProfile_1: applianceProfile, objects: {} }, { filename: 'build/main.js:socketGuard', timeout: 5000 });
    const originalCalls = [];
    const replies = [];
    const commands = { commands: {}, _checkPermissions(...args) { originalCalls.push(args); return originalAllowed; } };
    const context = {
        log: quietLog,
        namespace: 'eos-admin.0',
        getEosCachedRole() { return role; },
        eosDisabledUsers: new Set(disabled ? [userId] : []),
        eosPasswordSetupRequired: new Set(pending ? [userId] : []),
        eosRoleCacheHealthy: healthy,
        eosSessionSecurity: { isSocketAllowed() { return sessionAllowed; }, revoke() {} },
        getProtectedAdapterNames() { return ['admin', 'eos-admin', 'nexowatt-ui', 'nexowatt-devices']; },
    };
    install.call(context, { commands });
    return {
        originalCalls,
        replies,
        check(command, id) { return commands._checkPermissions({ _acl: { user: userId } }, command, error => replies.push(error), id); },
    };
}

test('socket guard rejects a revoked connection even with cached administrator privileges', () => {
    const guard = makeSocketGuard({ role: 'admin', sessionAllowed: false });
    assert.equal(guard.check('setState', 'test.0.output'), false);
    assert.equal(guard.originalCalls.length, 0);
});

test('socket guard denies command and host execution for customer and installer', () => {
    for (const role of ['enduser', 'installer']) {
        for (const command of ['cmdExec', 'sendToHost', 'changePassword', 'addUser', 'delUser', 'addGroup', 'delGroup']) {
            const guard = makeSocketGuard({ role });
            assert.equal(guard.check(command, 'system.host.test'), false, `${role}/${command}`);
            assert.deepEqual(guard.replies, ['permissionError']);
            assert.equal(guard.originalCalls.length, 0, 'Denied calls never enter the upstream operation');
        }
    }
});

test('socket guard blocks sensitive object mutation including EOS Admin and xterm', () => {
    for (const role of ['enduser', 'installer']) {
        for (const command of ['setObject', 'extendObject', 'delObject']) {
            for (const id of ['system.config', 'system.repositories', 'system.certificates', 'system.licenses', 'system.credentials.example', 'system.user.admin', 'system.group.administrator', 'system.host.test', 'system.adapter.eos-admin.0', 'system.adapter.admin.0', 'system.adapter.xterm.0']) {
                const guard = makeSocketGuard({ role });
                assert.equal(guard.check(command, id), false, `${role}/${command}/${id}`);
                assert.equal(guard.originalCalls.length, 0);
            }
        }
    }
});

test('socket guard blocks unresolved, missing, disabled, and pending-password identities before administrator bypass', () => {
    for (const role of ['admin', 'installer', 'enduser']) {
        for (const flags of [{ userId: null }, { disabled: true }, { pending: true }, { healthy: false }]) {
            const guard = makeSocketGuard({ role, ...flags });
            assert.equal(guard.check('getState', 'test.0.value'), false, `${role}/${JSON.stringify(flags)}`);
            assert.equal(guard.originalCalls.length, 0);
        }
    }
});

test('socket administrator forwards to upstream permissions instead of bypassing them', () => {
    for (const originalAllowed of [true, false]) {
        for (const command of ['cmdExec', 'sendToHost', 'setObject', 'setState']) {
            const guard = makeSocketGuard({ role: 'admin', originalAllowed });
            assert.equal(guard.check(command, 'system.adapter.eos-admin.0'), originalAllowed);
            assert.equal(guard.originalCalls.length, 1);
        }
    }
});

test('socket customer datapoints remain read-only while normal installer writes retain upstream ACLs', () => {
    for (const command of ['setState', 'createState', 'delState']) {
        const customer = makeSocketGuard({ role: 'enduser' });
        assert.equal(customer.check(command, 'test.0.value'), false);
        assert.equal(customer.originalCalls.length, 0);
        const installer = makeSocketGuard({ role: 'installer' });
        assert.equal(installer.check(command, 'test.0.value'), true);
        assert.equal(installer.originalCalls.length, 1);
    }
    const reader = makeSocketGuard({ role: 'enduser' });
    assert.equal(reader.check('getState', 'test.0.value'), true);
    assert.equal(reader.originalCalls.length, 1);
});

async function runFirstPassword(currentPassword, passwordMatches = false, verificationAvailable = true) {
    const { web } = makeWeb();
    const calls = { verify: 0, write: 0, metadata: 0, invalidate: 0, clearedCookies: [] };
    web.getEosRequestAccess = async () => ({ userId: 'system.user.guest', role: 'enduser' });
    web.getEosFirstLoginPasswordState = async () => ({ required: true, minLength: 12 });
    web.isEosSameOriginWrite = () => true;
    web.adapter.checkPasswordAsync = async () => { calls.verify++; return passwordMatches; };
    if (!verificationAvailable) delete web.adapter.checkPasswordAsync;
    web.setEosUserPassword = async () => { calls.write++; };
    web.updateEosAccountMetadata = async () => { calls.metadata++; };
    web.destroyEosRequestSessions = async () => { calls.invalidate++; };
    const response = { status: null, body: null };
    const res = {
        setHeader() {},
        status(value) { response.status = value; return this; },
        json(value) { response.body = value; return this; },
        clearCookie(value) { calls.clearedCookies.push(value); },
    };
    const req = { ...request(), headers: { 'x-nexowatt-eos-first-login': '1' }, body: { currentPassword, password: 'Unique-only-test-Passphrase-9!', passwordRepeat: 'Unique-only-test-Passphrase-9!' } };
    await web.saveEosFirstLoginPassword(req, res);
    return { ...response, calls };
}

test('first-password change requires a bounded nonempty current credential', async () => {
    for (const current of [undefined, '', 'x'.repeat(129), 1234]) {
        const outcome = await runFirstPassword(current);
        assert.equal(outcome.status, 400);
        assert.equal(outcome.body.error, 'currentPasswordRequired');
        assert.equal(outcome.calls.verify, 0);
        assert.equal(outcome.calls.write, 0);
    }
});

test('first-password change rejects invalid current credentials and unavailable verification', async () => {
    const outcome = await runFirstPassword('wrong-test-only-credential', false);
    assert.equal(outcome.status, 403);
    assert.equal(outcome.body.error, 'currentPasswordInvalid');
    assert.equal(outcome.calls.verify, 1);
    assert.equal(outcome.calls.write, 0);
    assert.equal(outcome.calls.metadata, 0);
    const unavailable = await runFirstPassword('current-test-only-credential', true, false);
    assert.equal(unavailable.status, 503);
    assert.equal(unavailable.body.error, 'passwordVerificationUnavailable');
    assert.equal(unavailable.calls.write, 0);
    assert.equal(unavailable.calls.metadata, 0);
});

test('first-password change with correct current credential writes and invalidates the session', async () => {
    const outcome = await runFirstPassword('current-test-only-credential', true);
    assert.equal(outcome.status, 200);
    assert.equal(outcome.body.success, true);
    assert.equal(outcome.body.sessionInvalidated, true);
    assert.equal(outcome.calls.verify, 1);
    assert.equal(outcome.calls.write, 1);
    assert.equal(outcome.calls.metadata, 1);
    assert.equal(outcome.calls.invalidate, 1);
    assert.deepEqual(outcome.calls.clearedCookies, ['access_token', 'refresh_token', 'connect.sid']);
});

function roleCacheFixture() {
    const code = read('build/main.js');
    const start = code.indexOf('async refreshEosRoleCache() {');
    const end = code.indexOf('getEosCachedRole(', start);
    assert.ok(start >= 0 && end > start, 'Shipped role cache refresh is available');
    const refresh = vm.runInNewContext(`({ ${code.slice(start, end)} }).refreshEosRoleCache`, {}, { filename: 'build/main.js:roleCache', timeout: 5000 });
    const objects = {
        'system.group.service': { type: 'group', common: { members: ['system.user.support', 'system.user.admin'] } },
        'system.group.installer': { type: 'group', common: { members: ['system.user.install'] } },
        'system.group.enduser': { type: 'group', common: { members: ['system.user.guest'] } },
        'system.group.administrator': { type: 'group', common: { members: ['system.user.admin'] } },
        'system.user.admin': { ...guest(), _id: 'system.user.admin' },
        'system.user.support': { ...guest(), _id: 'system.user.support', common: { enabled: false } },
        'system.user.install': { ...guest(), _id: 'system.user.install', native: { nexowattEosAccount: { forcePasswordChange: true } } },
        'system.user.guest': guest(),
    };
    const context = {
        eosRoleCacheHealthy: true,
        eosRoleCache: new Map([['system.user.stale', 'admin']]),
        eosDisabledUsers: new Set(['system.user.old-disabled']),
        eosPasswordSetupRequired: new Set(['system.user.old-pending']),
        getEosRoleGroupIds(role) { return [`system.group.${role}`]; },
        async getForeignObjectAsync(id) { return copy(objects[id]); },
    };
    return { refresh, context };
}

test('role-cache refresh suspends authorization until one complete snapshot is committed', async () => {
    const { refresh, context } = roleCacheFixture();
    const pending = refresh.call(context);
    assert.equal(context.eosRoleCacheHealthy, false, 'No socket authorization during asynchronous refresh');
    assert.equal(context.eosRoleCache.get('system.user.stale'), 'admin', 'No partial cache mutation before read completion');
    await pending;
    assert.equal(context.eosRoleCacheHealthy, true);
    assert.equal(context.eosRoleCache.has('system.user.stale'), false);
    assert.equal(context.eosRoleCache.get('system.user.admin'), 'admin');
    assert.equal(context.eosRoleCache.get('system.user.install'), 'installer');
    assert.equal(context.eosRoleCache.get('system.user.guest'), 'enduser');
    assert.deepEqual([...context.eosDisabledUsers], ['system.user.support']);
    assert.deepEqual([...context.eosPasswordSetupRequired], ['system.user.install', 'system.user.guest']);
});

test('role-cache read failures leave authorization closed and never commit a partial snapshot', async () => {
    const { refresh, context } = roleCacheFixture();
    context.getForeignObjectAsync = async () => { throw new Error('simulated ACL read failure'); };
    await assert.rejects(() => refresh.call(context), /simulated ACL read failure/);
    assert.equal(context.eosRoleCacheHealthy, false);
    assert.deepEqual([...context.eosRoleCache], [['system.user.stale', 'admin']]);
    assert.deepEqual([...context.eosDisabledUsers], ['system.user.old-disabled']);
    assert.deepEqual([...context.eosPasswordSetupRequired], ['system.user.old-pending']);
});


test('message dispatch denies every chat capability before any privileged MCP construction', () => {
    const code = read('build/main.js');
    const start = code.indexOf('onMessage = obj => {') >= 0 ? code.indexOf('onMessage = obj => {') : code.indexOf('onMessage = (obj) => {');
    const end = code.indexOf('getName(', start);
    assert.ok(start >= 0 && end > start, 'Shipped message dispatcher is present');
    const Dispatcher = vm.runInNewContext(`(class { ${code.slice(start, end)} })`, {}, { timeout: 5000 });
    const adapter = new Dispatcher();
    const replies = [];
    adapter.sendTo = (...args) => replies.push(args);
    adapter.getMcpChat = () => { throw new Error('Privileged MCP construction must remain unreachable'); };
    adapter.processChatMessage = () => { throw new Error('Privileged chat dispatch must remain unreachable'); };
    for (const command of ['chat:send', 'chat:getTools', 'chat:callTool', 'chat:getProviders', 'chat:testConnection', 'chat:unknown']) {
        adapter.onMessage({ command, from: 'system.adapter.untrusted.0', callback: { id: 1 }, message: {} });
    }
    assert.equal(replies.length, 6);
    assert.ok(replies.every(row => row[2].error === 'EOS_SIGNED_MAINTENANCE_REQUIRED'));
});

async function runStartupSecret(systemConfig, persistenceFails = false, platformAllowed = true) {
    const code = read('build/main.js');
    const start = code.indexOf('onReady = async () => {');
    const followingComment = /\n\s*\/\*\*/.exec(code.slice(start));
    assert.ok(start >= 0 && followingComment, 'Shipped startup method is available');
    const body = code.slice(start, start + followingComment.index);
    const calls = { init: 0, persistence: 0, platformChecks: 0, objectReads: 0, randomSizes: [], events: [], errors: [] };
    const random = { randomBytes(size, callback) {
        calls.randomSizes.push(size);
        const bytes = crypto.randomBytes(size);
        if (callback) { void Promise.resolve().then(() => callback(null, bytes)); return; }
        return bytes;
    } };
    const adapterCore = { I18n: { init: async () => {} }, getAbsoluteInstanceDataDir: () => '/isolated-test-data' };
    const licenseModule = { EosLicenseService: class { async start() { calls.events.push('license-start'); } } };
    const sessionModule = { EosSessionSecurity: class {} };
    const sandbox = {
        console, Buffer, __dirname: path.join(root, 'build'), systemLanguage: 'en',
        // Isolate only the platform-attestation boundary. The actual shipped
        // onReady gate still runs; all later secret/persistence behavior is real.
        require(name) {
            assert.equal(name, '../packages/eos-license-client');
            return { assertEosPlatform(adapter) {
                assert.equal(adapter, 'eos-admin'); calls.platformChecks++;
                if (!platformAllowed) throw new Error('EOS_PLATFORM_REQUIRED');
            } };
        },
        _nodeCrypto: random, node_crypto_1: random,
        _nodePath: path, node_path_1: path,
        _adapterCore: adapterCore, adapter_core_1: adapterCore,
        _eosLicenseService: licenseModule, eosLicenseService_1: licenseModule,
        _eosSessionSecurity: sessionModule, eosSessionSecurity_1: sessionModule,
        eosApplianceProfile_1: { ...applianceProfile, assertOauthDependency() {} },
        async ensureEosStableInitialAccounts() { calls.events.push('accounts'); },
        // Negative control needs only a nonempty old fallback, never its actual bytes.
        secret: 'negative-control-legacy-fallback-placeholder',
    };
    const Startup = vm.runInNewContext(`(class { ${body} })`, sandbox, { filename: 'build/main.js:onReady', timeout: 5000 });
    const adapter = new Startup();
    Object.assign(adapter, {
        config: {},
        log: { ...quietLog, error(message) { calls.errors.push(String(message)); } },
        async getForeignObjectAsync(id) { calls.objectReads++; assert.equal(id, 'system.config'); return copy(systemConfig); },
        async extendForeignObjectAsync(id, value) {
            calls.persistence++;
            assert.equal(id, 'system.config');
            calls.events.push('persist-start');
            await Promise.resolve();
            assert.equal(calls.init, 0, 'Web startup cannot race the awaited secret write');
            if (persistenceFails) throw new Error('simulated secret persistence failure');
            calls.persistedSecret = value.native.secret;
            calls.events.push('persist-complete');
        },
        init() { assert.equal(this.config.auth, true, 'Web startup always requires authentication'); calls.init++; calls.events.push('init'); },
    });
    // Also expose the older callback-era name for a faithful negative control.
    adapter.extendForeignObject = adapter.extendForeignObjectAsync;
    await adapter.onReady();
    await new Promise(resolve => setImmediate(resolve));
    return { adapter, calls };
}

test('platform denial stops startup before secrets, accounts, license service and web initialization', async () => {
    const { calls } = await runStartupSecret({ common: {}, native: {} }, false, false);
    assert.equal(calls.platformChecks, 1);
    assert.equal(calls.objectReads, 0); assert.equal(calls.init, 0); assert.equal(calls.persistence, 0);
    assert.deepEqual(calls.randomSizes, []); assert.deepEqual(calls.events, []);
    assert.deepEqual(calls.errors, ['EOS_PLATFORM_REQUIRED']);
});

test('fresh session secret uses 32 random bytes and is persisted before web startup', async () => {
    const first = await runStartupSecret({ common: {}, native: {} });
    const second = await runStartupSecret({ common: {}, native: {} });
    for (const { adapter, calls } of [first, second]) {
        assert.deepEqual(calls.randomSizes, [32]);
        assert.equal(calls.persistence, 1);
        assert.equal(calls.init, 1);
        assert.match(adapter.secret, /^[a-f0-9]{64}$/);
        assert.equal(calls.persistedSecret, adapter.secret);
        assert.ok(calls.events.indexOf('persist-complete') < calls.events.indexOf('init'));
    }
    assert.notEqual(first.adapter.secret, second.adapter.secret, 'Independent installations receive independent secrets');
});

test('session-secret persistence failure denies web startup', async () => {
    const { calls } = await runStartupSecret({ common: {}, native: {} }, true);
    assert.equal(calls.persistence, 1);
    assert.equal(calls.init, 0);
    assert.ok(calls.errors.some(message => message.includes('startup denied')));
});

test('missing system.config never selects a built-in fallback session secret', async () => {
    const { adapter, calls } = await runStartupSecret(null);
    assert.equal(adapter.secret, undefined);
    assert.equal(calls.init, 0);
    assert.equal(calls.persistence, 0);
    assert.equal(calls.randomSizes.length, 0);
});

test('valid existing installation session secret is preserved without regeneration', async () => {
    const existing = 'existing-installation-test-secret-123456789';
    const { adapter, calls } = await runStartupSecret({ common: {}, native: { secret: existing } });
    assert.equal(adapter.secret, existing);
    assert.equal(calls.init, 1);
    assert.equal(calls.persistence, 0);
    assert.equal(calls.randomSizes.length, 0);
});

test('invalid nonempty existing installation secret denies web startup', async () => {
    for (const secret of ['short', 123, { invalid: true }]) {
        const { calls } = await runStartupSecret({ common: {}, native: { secret } });
        assert.equal(calls.init, 0);
        assert.equal(calls.persistence, 0);
        assert.equal(calls.randomSizes.length, 0);
        assert.ok(calls.errors.some(message => message.includes('invalid')));
    }
});

(async () => {
    let failed = 0;
    for (const { name, run } of tests) {
        try {
            await run();
            console.log(`PASS ${name}`);
        } catch (error) {
            failed++;
            console.error(`FAIL ${name}: ${error.stack || error}`);
        }
    }
    console.log(`[NexoWatt EOS security boundaries] ${tests.length - failed}/${tests.length} passed; isolated shipped-code tests, no live HTTP/controller test`);
    if (failed) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
