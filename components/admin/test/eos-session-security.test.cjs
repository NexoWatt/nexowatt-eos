'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const { EosSessionSecurity, readGroupRows } = require(process.env.EOS_TEST_RUNTIME === 'build' ? '../build/lib/eosSessionSecurity' : '../src/lib/eosSessionSecurity');
// Real, version-pinned upstream OAuth model. Type erasure retains an empty import
// for an all-type declaration; remove that one non-runtime import only.
const upstreamSource = fs.readFileSync(path.join(__dirname, 'fixtures/oauth2-model-v1.4.0.ts'), 'utf8');
const upstream = import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(upstreamSource, { mode: 'transform' }).replace("import 'oauth2-server';", '')).toString('base64')}`);
const clone = value => JSON.parse(JSON.stringify(value));
const STAMP = 'nexowattEosSessionV1';
async function setup(options) {
    const sessions = new Map();
    const users = { 'system.user.operator': { type: 'user', common: { enabled: true, password: 'test-password-hash-1' }, native: {} } };
    const groups = [{ id: { en: 'Installer', de: 'Installateur' }, value: { _id: 'system.group.eos-installer', type: 'group', common: { members: ['system.user.operator'], acl: { object: { read: true } } } } }];
    const adapter = {
        config: {}, log: { warn() {}, info() {}, debug() {}, error() {} },
        getSession(id, cb) { cb(sessions.has(id) ? clone(sessions.get(id)) : null); },
        setSession(id, ttl, value, cb) { sessions.set(id, clone(value)); cb?.(null); },
        async destroySession(id) { sessions.delete(id); },
        async getForeignObjectAsync(id) { return users[id] ? clone(users[id]) : null; },
        async getObjectViewAsync() { return { rows: clone(groups) }; },
        checkPassword(name, password, cb) { cb(name === 'operator' && password === 'test-only-passphrase', `system.user.${name}`); },
    };
    const security = new EosSessionSecurity(adapter, options);
    const model = new (await upstream).OAuth2Model(adapter, { noBasicAuth: true });
    security.bindOAuthModel(model);
    let number = 0;
    const issue = async (user) => {
        user ||= await model.getUser('operator', 'test-only-passphrase');
        const pair = { accessToken: `access-token-${++number}`, refreshToken: `refresh-token-${number}`, accessTokenExpiresAt: new Date(Date.now() + 60000), refreshTokenExpiresAt: new Date(Date.now() + 120000) };
        await model.saveToken(pair, { id: 'ioBroker' }, user);
        return pair;
    };
    return { adapter, security, model, sessions, users, groups, issue };
}

test('pinned upstream password login, token pair and refresh work with security binding', async () => {
    const x = await setup();
    const first = await x.issue();
    assert.equal((await x.model.getAccessToken(first.accessToken)).user.id, 'operator');
    assert.equal(x.sessions.get(`a:${first.accessToken}`)[STAMP].fingerprint.length, 64);
    assert.deepEqual(x.sessions.get(`a:${first.accessToken}`)[STAMP], x.sessions.get(`r:${first.refreshToken}`)[STAMP]);
    const refresh = await x.model.getRefreshToken(first.refreshToken);
    const next = await x.issue(refresh.user);
    assert.ok(await x.model.getAccessToken(next.accessToken));
    x.security.stop();
});

test('actual controller group view display keys do not replace canonical object identities', async () => {
    const x = await setup();
    const proof = await x.security.snapshot('operator');
    x.groups[0].id = 'system.group.administrator';
    assert.deepEqual(await x.security.snapshot('operator'), proof);
    assert.equal(readGroupRows({ rows: x.groups })[0]._id, 'system.group.eos-installer');
    x.security.stop();
});

test('malformed or duplicate canonical group objects fail closed before credential verification', async () => {
    for (const mutate of [
        x => { delete x.groups[0].value._id; },
        x => { x.groups[0].value._id = 'system.user.admin'; },
        x => { x.groups[0].value.type = 'user'; },
        x => { x.groups.push(clone(x.groups[0])); },
    ]) {
        const x = await setup(); let checked = false;
        x.adapter.checkPassword = () => { checked = true; };
        mutate(x);
        assert.equal(await x.model.getUser('operator', 'test-only-passphrase'), null);
        assert.equal(checked, false);
        x.security.stop();
    }
});

test('all devices access and refresh tokens reject changed password without waiting for object event', async () => {
    const x = await setup();
    const tokens = [await x.issue(), await x.issue()];
    x.users['system.user.operator'].common.password = 'test-password-hash-2';
    for (const token of tokens) {
        assert.ok(!await x.model.getAccessToken(token.accessToken));
        assert.ok(!await x.model.getRefreshToken(token.refreshToken));
    }
    x.security.stop();
});

test('disable, deletion and changed group ACL independently invalidate both token classes', async () => {
    for (const mutate of [x => { x.users['system.user.operator'].common.enabled = false; }, x => { delete x.users['system.user.operator']; }, x => { x.groups[0].value.common.acl.object.read = false; }, x => { x.groups[0].value.common.members = []; }]) {
        const x = await setup(); const token = await x.issue(); mutate(x);
        assert.ok(!await x.model.getAccessToken(token.accessToken));
        assert.ok(!await x.model.getRefreshToken(token.refreshToken));
        x.security.stop();
    }
});

test('observed disable then re-enable cannot resurrect old token after snapshot returns to original', async () => {
    const x = await setup(); const token = await x.issue(); const previous = clone(x.users['system.user.operator']);
    x.users['system.user.operator'].common.enabled = false;
    x.security.handleObjectChange('system.user.operator', x.users['system.user.operator'], previous);
    x.users['system.user.operator'] = previous;
    assert.ok(!await x.model.getAccessToken(token.accessToken));
    assert.ok(!await x.model.getRefreshToken(token.refreshToken));
    assert.ok(await x.model.getAccessToken((await x.issue()).accessToken));
    x.security.stop();
});

test('legacy and unbound external tokens are rejected and direct internal minting is denied', async () => {
    const x = await setup();
    x.sessions.set('a:legacy', { user: 'operator', aExp: Date.now() + 60000 });
    assert.ok(!await x.model.getAccessToken('legacy'));
    await assert.rejects(x.adapter.setSession('a:unbound', 60, { user: 'operator' }), /REAUTHENTICATION/);
    await assert.rejects(x.model.generateTokens('operator'), /REAUTHENTICATION/);
    x.security.stop();
});

test('proof cannot be forged by passing a user-shaped object or copied authenticated identity', async () => {
    const x = await setup();
    const user = await x.model.getUser('operator', 'test-only-passphrase');
    await assert.rejects(x.issue({ ...user }), /REAUTHENTICATION/);
    await assert.rejects(x.issue({ id: 'operator', [STAMP]: { epoch: x.security.epoch } }), /REAUTHENTICATION/);
    x.security.stop();
});

test('password mutation during credential verification and before token save fails closed', async () => {
    const x = await setup();
    x.adapter.checkPassword = (name, password, cb) => { x.users['system.user.operator'].common.password = 'changed-in-check'; cb(true, 'system.user.operator'); };
    assert.equal(await x.model.getUser('operator', 'test-only-passphrase'), null);
    x.adapter.checkPassword = (name, password, cb) => cb(true, 'system.user.operator');
    const user = await x.model.getUser('operator', 'test-only-passphrase');
    x.users['system.user.operator'].common.password = 'changed-before-save';
    await assert.rejects(x.issue(user), /REAUTHENTICATION/);
    x.security.stop();
});

test('refresh credential cannot cross revocation between lookup and save', async () => {
    const x = await setup(); const old = await x.issue();
    const refresh = await x.model.getRefreshToken(old.refreshToken);
    x.security.revoke();
    await assert.rejects(x.issue(refresh.user), /REAUTHENTICATION/);
    x.security.stop();
});

test('restart generation does not accept previously saved capabilities', async () => {
    const x = await setup(); const old = await x.issue();
    x.security.revoke();
    assert.ok(!await x.model.getAccessToken(old.accessToken));
    assert.ok(!await x.model.getRefreshToken(old.refreshToken));
    x.security.stop();
});

test('session database failures and bounded stalled reads fail closed without unbounded backlog', async () => {
    const x = await setup({ timeoutMs: 25, maxPending: 3 }); const old = await x.issue();
    x.adapter.getForeignObjectAsync = () => new Promise(() => {});
    assert.ok(!await x.model.getAccessToken(old.accessToken));
    assert.ok(!await x.model.getAccessToken(old.accessToken));
    assert.ok(!await x.model.getAccessToken(old.accessToken));
    assert.equal(x.security.pending, 3);
    assert.ok(!await x.model.getAccessToken(old.accessToken));
    assert.equal(x.security.pending, 3);
    x.security.stop();
});

test('socket revocation synchronously blocks commands, clears subscriptions and closes every connection', async () => {
    const x = await setup(); const handlers = {}; let closed = 0; let cleared = 0;
    const socketAdmin = {
        addEventHandler(name, handler) { handlers[name] = handler; },
        __updateSession() { return true; },
        __getUserFromSocket(client, callback) { callback(null, 'system.user.operator', Date.now() + 60000); },
        unsubscribeSocket() { cleared++; },
    };
    x.security.bindSockets(socketAdmin);
    const clients = [{ emit() {}, disconnect() { closed++; } }, { emit() {}, close() { closed++; } }];
    for (const client of clients) { handlers.connect(client); assert.equal(socketAdmin.__updateSession(client), true); }
    x.security.revoke();
    for (const client of clients) assert.equal(socketAdmin.__updateSession(client), false);
    assert.equal(closed, 2); assert.equal(cleared, 2);
    x.security.stop();
});

test('metadata-only account updates do not revoke established capabilities', async () => {
    const x = await setup(); const token = await x.issue(); const previous = clone(x.users['system.user.operator']);
    x.users['system.user.operator'].native.displayHint = 'irrelevant';
    x.security.handleObjectChange('system.user.operator', x.users['system.user.operator'], previous);
    assert.ok(await x.model.getAccessToken(token.accessToken));
    x.security.stop();
});

test('expired access and refresh capabilities fail closed in the common session reader', async () => {
    const x = await setup(); const pair = await x.issue();
    x.sessions.get(`a:${pair.accessToken}`).aExp = Date.now() - 1;
    x.sessions.get(`r:${pair.refreshToken}`).rExp = Date.now() - 1;
    assert.ok(!await x.model.getAccessToken(pair.accessToken));
    assert.ok(!await x.model.getRefreshToken(pair.refreshToken));
    x.security.stop();
});

test('late socket authentication cannot reopen a connection after revocation', async () => {
    const x = await setup(); const handlers = {}; let originalCallback; let closed = 0;
    const socketAdmin = {
        addEventHandler(name, handler) { handlers[name] = handler; },
        __updateSession() { return true; },
        __getUserFromSocket(client, callback) { originalCallback = callback; },
        unsubscribeSocket() {},
    };
    x.security.bindSockets(socketAdmin);
    const client = { emit() {}, disconnect() { closed++; } }; handlers.connect(client);
    const result = new Promise(resolve => socketAdmin.__getUserFromSocket(client, (error, user) => resolve({ error, user })));
    x.security.revoke(); originalCallback(null, 'system.user.operator', Date.now() + 60000);
    assert.ok((await result).error); assert.equal(x.security.isSocketAllowed(client), false); assert.ok(closed >= 1);
    x.security.stop();
});

test('real five-second watchdog closes a socket after a missed credential object event', async () => {
    const x = await setup(); const handlers = {}; let closed = false;
    const socketAdmin = {
        addEventHandler(name, handler) { handlers[name] = handler; },
        __updateSession() { return true; },
        __getUserFromSocket(client, callback) { callback(null, 'system.user.operator', Date.now() + 60000); },
        unsubscribeSocket() {},
    };
    x.security.bindSockets(socketAdmin);
    const client = { emit() {}, disconnect() { closed = true; } }; handlers.connect(client);
    await new Promise((resolve, reject) => socketAdmin.__getUserFromSocket(client, error => error ? reject(Error(error)) : resolve()));
    x.users['system.user.operator'].common.password = 'changed-with-no-event';
    await new Promise(resolve => setTimeout(resolve, 5250));
    assert.equal(closed, true); assert.equal(x.security.isSocketAllowed(client), false);
    x.security.stop();
});


test('password verification has a separate budget without relaxing database reads', async () => {
    const x = await setup({ timeoutMs: 25, authenticationTimeoutMs: 250 });
    x.adapter.checkPassword = (_name, _password, cb) => setTimeout(() => cb(true, 'system.user.operator'), 75);
    const user = await x.model.getUser('operator', 'test-only-passphrase');
    assert.equal(user.id, 'operator');
    const pair = await x.issue(user);
    assert.ok(await x.model.getAccessToken(pair.accessToken));
    x.adapter.getForeignObjectAsync = () => new Promise(() => {});
    assert.equal(await x.model.getUser('operator', 'test-only-passphrase'), null);
    assert.equal(x.security.pending, 1, 'timed-out DB work retains its separate pending slot');
    x.security.stop();
});

test('timed-out authentication retains two work slots, refuses backlog and never grants late proof', async () => {
    const x = await setup({ authenticationTimeoutMs: 25, maxPendingAuthentications: 2 });
    const callbacks = []; const warnings = [];
    x.adapter.log.warn = code => warnings.push(code);
    x.adapter.checkPassword = (_name, _password, cb) => callbacks.push(cb);
    const attempts = [x.model.getUser('operator', 'test-only-passphrase'), x.model.getUser('operator', 'test-only-passphrase')];
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(callbacks.length, 2);
    assert.equal(await x.model.getUser('operator', 'test-only-passphrase'), null);
    assert.deepEqual(await Promise.all(attempts), [null, null]);
    assert.equal(x.security.pendingAuthentications, 2);
    assert.equal(await x.model.getUser('operator', 'test-only-passphrase'), null);
    assert.equal(callbacks.length, 2);
    callbacks.forEach(cb => cb(true, 'system.user.operator'));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(x.security.pendingAuthentications, 0);
    await assert.rejects(x.model.saveToken({}, {}, { id: 'operator' }), /REAUTHENTICATION/);
    assert.ok(warnings.includes('EOS_AUTHENTICATION_TIMEOUT'));
    assert.ok(warnings.includes('EOS_AUTHENTICATION_BUSY'));
    assert.ok(warnings.every(code => /^EOS_AUTHENTICATION_(TIMEOUT|BUSY)$/.test(code)));
    x.security.stop();
});

test('bad passwords and revocation during slow verification still cannot receive proofs', async () => {
    const x = await setup({ timeoutMs: 25, authenticationTimeoutMs: 250 });
    x.adapter.checkPassword = (_name, _password, cb) => setTimeout(() => cb(false, 'system.user.operator'), 50);
    assert.equal(await x.model.getUser('operator', 'wrong-test-passphrase'), null);
    x.adapter.checkPassword = (_name, _password, cb) => setTimeout(() => { x.security.revoke(); cb(true, 'system.user.operator'); }, 50);
    assert.equal(await x.model.getUser('operator', 'test-only-passphrase'), null);
    x.security.stop();
});
