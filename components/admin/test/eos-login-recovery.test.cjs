'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const { EosSessionSecurity } = require(process.env.EOS_TEST_RUNTIME === 'build'
    ? '../build/lib/eosSessionSecurity' : '../src/lib/eosSessionSecurity');
const upstreamSource = fs.readFileSync(path.join(__dirname, 'fixtures/oauth2-model-v1.4.0.ts'), 'utf8');
const upstream = import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(upstreamSource, { mode: 'transform' })
    .replace("import 'oauth2-server';", '')).toString('base64')}`);

async function setup(options = {}) {
    let passwordCheck = (_name, _password, cb) => cb(true, 'system.user.admin');
    const sessions = new Map();
    const user = { type: 'user', common: { enabled: true, password: 'fixture-revision' }, native: {} };
    const adapter = {
        config: {}, log: { warn() {}, info() {}, debug() {}, error() {} },
        getSession(id, cb) { cb(sessions.get(id)); },
        setSession(id, ttl, value, cb) { sessions.set(id, value); cb?.(null); },
        async getForeignObjectAsync() { return structuredClone(user); },
        async getObjectViewAsync() { return { rows: [{ value: { _id: 'system.group.administrator',
            type: 'group', common: { members: ['system.user.admin'], acl: {} } } }] }; },
        checkPassword(...args) { passwordCheck(...args); },
    };
    const security = new EosSessionSecurity(adapter, options);
    const model = new (await upstream).OAuth2Model(adapter, { noBasicAuth: true });
    security.bindOAuthModel(model);
    return { adapter, model, security, user, setCheck(callback) { passwordCheck = callback; } };
}

test('slow valid proof has its own deadline while ordinary session reads remain short', async t => {
    const x = await setup({ timeoutMs: 25, authenticationTimeoutMs: 1000 });
    t.after(() => x.security.stop());
    x.setCheck((_name, _password, callback) => setTimeout(() => callback(true, 'system.user.admin'), 60));
    assert.equal((await x.model.getUser('admin', 'temporary-passphrase')).id, 'admin');
    assert.equal(x.security.pendingAuthentications, 0);
    const before = Date.now();
    await assert.rejects(x.security.bounded(() => new Promise(() => {})), /REAUTHENTICATION/);
    assert.ok(Date.now() - before < 900, 'normal reads do not inherit password budget');
});

test('password-work cap remains occupied after timeout until actual proof settles', async t => {
    const x = await setup({ authenticationTimeoutMs: 30, maxPendingAuthentications: 2 });
    t.after(() => x.security.stop());
    const callbacks = [];
    x.setCheck((_name, _password, callback) => callbacks.push(callback));
    const attempts = [x.model.getUser('admin', 'temporary-passphrase'), x.model.getUser('admin', 'temporary-passphrase')];
    assert.deepEqual(await Promise.all(attempts), [null, null]);
    assert.equal(callbacks.length, 2);
    assert.equal(x.security.pendingAuthentications, 2);
    assert.equal(await x.model.getUser('admin', 'temporary-passphrase'), null);
    assert.equal(callbacks.length, 2, 'timed-out native work must not multiply');
    callbacks.forEach(callback => callback(true, 'system.user.admin'));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(x.security.pendingAuthentications, 0);
    x.setCheck((_name, _password, callback) => callback(true, 'system.user.admin'));
    assert.equal((await x.model.getUser('admin', 'temporary-passphrase')).id, 'admin');
});

test('revocation or account disable during slow proof rejects credentials', async t => {
    for (const mutate of [x => x.security.revoke(), x => { x.user.common.enabled = false; }]) {
        const x = await setup({ timeoutMs: 25, authenticationTimeoutMs: 1000 });
        t.after(() => x.security.stop());
        x.setCheck((_name, _password, callback) => setTimeout(() => { mutate(x); callback(true, 'system.user.admin'); }, 50));
        assert.equal(await x.model.getUser('admin', 'temporary-passphrase'), null);
    }
});

test('malformed and oversized credentials are denied before CPU work', async t => {
    const x = await setup(); t.after(() => x.security.stop());
    let called = false; let reads = 0; x.setCheck(() => { called = true; });
    x.adapter.getForeignObjectAsync = async () => { reads++; return structuredClone(x.user); };
    for (const [name, password] of [['admin', 'x'.repeat(129)], ['admin', '\u{1f600}'.repeat(65)], ['admin', {}],
        ['admin', ''], ['../admin', 'temporary-passphrase']]) {
        assert.equal(await x.model.getUser(name, password), null);
    }
    assert.equal(called, false);
    assert.equal(reads, 0);
    assert.equal(x.security.pendingAuthentications, 0);
});

test('existing EOS password length boundaries remain accepted without imposing new composition rules', async t => {
    const x = await setup(); t.after(() => x.security.stop());
    let called = 0; x.setCheck((_name, _password, cb) => { called++; cb(true, 'system.user.admin'); });
    for (const password of ['x'.repeat(128), '\u00e9'.repeat(128), '\u{1f600}'.repeat(64), 'legacy-short']) {
        assert.equal((await x.model.getUser('admin', password)).id, 'admin');
    }
    assert.equal(called, 4);
});

function browserHarness(kind, fetchImpl, tokenImpl) {
    let method;
    if (kind === 'source') {
        const source = fs.readFileSync(path.join(__dirname, '../src-admin/src/login/Login.tsx'), 'utf8');
        method = source.slice(source.indexOf('    onLogin(): void {'), source.indexOf('    render(): JSX.Element'))
            .replace('onLogin(): void', 'onLogin()');
    } else {
        const source = fs.readFileSync(path.join(__dirname, '../adminWww/assets/bootstrap-COulQZax-v84.js'), 'utf8');
        const begin = source.indexOf('onLogin(){');
        method = source.slice(begin, source.indexOf('render(){', begin));
    }
    const timers = [];
    const context = vm.createContext({ AbortController, encodeURIComponent, fetch: fetchImpl,
        I18n: { t: value => value },
        iobroker_admin__loadShare___mf_0_iobroker_mf_1_adapter_mf_2_react_mf_2_v5__loadShare__: { I18n: { t: value => value } },
        setTimeout(callback, delay) { const timer = { callback, delay }; timers.push(timer); return timer; },
        clearTimeout(timer) { timer.cleared = true; },
    });
    vm.runInContext(`class Login { ${method} }; const Zi = Login; globalThis.Login = Login;`, context);
    context.Login.processTokenAnswer = tokenImpl || (async () => false);
    const instance = new context.Login();
    instance.state = { inProcess: false, username: 'admin', password: 'temporary-passphrase', stayLoggedIn: false };
    instance.setState = (state, callback) => { Object.assign(instance.state, state); instance.inflight = callback?.() || instance.inflight; };
    return { instance, timers };
}

for (const kind of ['source', 'build']) {
    test(`${kind} login unlocks and explains network failure without throwing`, async () => {
        const x = browserHarness(kind, async () => { throw new TypeError('network fixture'); });
        x.instance.onLogin(); await x.instance.inflight;
        assert.equal(x.instance.state.inProcess, false);
        assert.match(x.instance.state.error, /connection is not ready/);
        assert.ok(x.timers.every(timer => timer.cleared));
    });
    test(`${kind} login catches a malformed successful token reply`, async () => {
        const x = browserHarness(kind, async () => ({ ok: true }), async () => { throw new SyntaxError('invalid JSON'); });
        x.instance.onLogin(); await x.instance.inflight;
        assert.equal(x.instance.state.inProcess, false);
        assert.match(x.instance.state.error, /connection is not ready/);
    });
    test(`${kind} login distinguishes wrong password from transport failure`, async () => {
        const x = browserHarness(kind, async () => ({ ok: false }));
        x.instance.onLogin(); await x.instance.inflight;
        assert.equal(x.instance.state.inProcess, false);
        assert.equal(x.instance.state.error, 'wrongPassword');
    });
    test(`${kind} hung login aborts after 20s and suppresses duplicate submission`, async () => {
        let count = 0;
        const x = browserHarness(kind, (_url, options) => {
            count++;
            return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted'))));
        });
        x.instance.onLogin(); x.instance.onLogin();
        assert.equal(count, 1); assert.equal(x.timers[0].delay, 20000);
        x.timers[0].callback(); await x.instance.inflight;
        assert.equal(x.instance.state.inProcess, false);
        assert.equal(x.timers[0].cleared, true);
    });
    test(`${kind} accepted login remains blocked while redirect starts`, async () => {
        const x = browserHarness(kind, async () => ({ ok: true }), async () => true);
        x.instance.onLogin(); await x.instance.inflight;
        assert.equal(x.instance.state.inProcess, true);
        assert.equal(x.instance.state.error, '');
        assert.ok(x.timers.every(timer => timer.cleared));
    });
}
