'use strict';
// Execute shipped HTTP methods without opening listeners. The real-process suite
// separately covers controller hashing, OAuth and HTTPS transport contracts.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomBytes } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const policy = require('../build/lib/eosApplianceProfile');
const session = require('../build/lib/eosSessionSecurity');
const exportsObject = {};
const filename = path.join(root, 'build/lib/web.js');
vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    exports: exportsObject, module: { exports: exportsObject }, __dirname: path.dirname(filename), __filename: filename,
    require: name => name.startsWith('node:') ? require(name)
        : name === './eosApplianceProfile' ? policy : name === './eosSessionSecurity' ? session : name === './eosRequestSecurity' ? require('../build/lib/eosRequestSecurity') : {},
    Buffer, URL, console, setTimeout, clearTimeout, setInterval, clearInterval, process: { env: {} },
}, { filename, timeout: 5000 });
const prototype = exportsObject.default.prototype;
const clone = value => JSON.parse(JSON.stringify(value));
function fixture({ role = 'installer', pending = true, user = 'system.user.alice', origin = true } = {}) {
    const web = Object.create(prototype); const calls = { verify: 0, write: 0, revoked: 0, metadata: 0, cookies: [] };
    let credential = randomBytes(24).toString('base64url');
    const temporary = credential; const next = randomBytes(24).toString('base64url');
    const object = { _id: user, type: 'user', common: { enabled: true, password: 'test-hash' },
        native: { unrelatedSetting: 'preserved', nexowattPasswordChangeRequired: pending,
            nexowattEosAccount: { forcePasswordChange: pending, passwordInitialized: !pending,
                policyVersion: 1, role, managedBy: 'eos-host-enrollment' } } };
    web.settings = { auth: true }; web.eosAccountWrites = new Set(); web.eosPasswordWriteRates = new Map();
    web.getEosRequestAccess = async () => ({ userId: user, role }); web.isEosSameOriginWrite = () => origin;
    web.adapter = { log: { info() {}, warn() {}, debug() {} }, eosSessionSecurity: { revoke() { calls.revoked++; } },
        async getForeignObjectAsync(id) { assert.equal(id, user); return clone(object); },
        async checkPasswordAsync(name, password) { calls.verify++; assert.equal(name, user.replace('system.user.', '')); return password === credential; },
        async setPasswordAsync(name, password) { calls.write++; assert.equal(name, user.replace('system.user.', '')); credential = password; },
        async extendForeignObjectAsync(id, patch) { calls.metadata++; assert.equal(id, user); Object.assign(object, patch); },
    };
    web.destroyEosRequestSessions = async () => { calls.revoked++; };
    const req = (body = {}, first = true) => ({ headers: { [first ? 'x-nexowatt-eos-first-login' : 'x-nexowatt-eos-password']: '1' },
        body: { currentPassword: temporary, password: next, passwordRepeat: next, ...body } });
    const invoke = async (request = req(), first = true) => {
        const response = { status: 0, body: null };
        const res = { setHeader() {}, status(code) { response.status = code; return this; }, json(body) { response.body = body; return this; }, clearCookie(name) { calls.cookies.push(name); } };
        await web.saveEosOwnPassword(request, res, first); return response;
    };
    return { web, object, calls, req, invoke, temporary, next };
}

test('fixed role IDs ignore configuration and service-looking aliases', () => {
    const x = fixture();
    x.web.settings.eosAdminOnlyGroups = [{ group: 'system.group.installateur' }];
    x.web.settings.eosServiceGroups = ['system.group.forged'];
    assert.deepEqual([...x.web.getEosSecurityAdminGroups()], ['system.group.administrator']);
    for (const group of ['system.group.nexowatt-service', 'system.group.eos-service', 'system.group.forged']) {
        assert.equal(x.web.resolveEosRole('system.user.user', [group], ['Administrator'], [group]), 'enduser');
    }
    assert.equal(x.web.resolveEosRole('system.user.user', ['system.group.installateur'], [], []), 'installer');
    assert.equal(x.web.resolveEosRole('system.user.user', ['system.group.administrator'], [], []), 'admin');
    assert.equal(x.web.isEosPasswordlessFirstLoginEnabled(), false);
});
test('normal long passphrases are accepted, control and oversized UTF-8 are rejected', () => {
    const x = fixture();
    for (const value of ['a long lowercase passphrase', 'lange wörter ergeben passphrasen']) {
        assert.equal(x.web.validateEosFirstLoginPassword(value, value, 'system.user.person').valid, true);
    }
    for (const value of ['short', '界'.repeat(100), 'a'.repeat(129), '😀'.repeat(8), 'long-password-with\nnewline']) {
        assert.equal(x.web.validateEosFirstLoginPassword(value, value, 'system.user.person').valid, false);
    }
});
test('first password writes only authenticated installer, clears setup flags and invalidates sessions', async () => {
    const x = fixture(); const result = await x.invoke();
    assert.equal(result.status, 200); assert.equal(result.body.logoutRequired, true);
    assert.equal(x.calls.write, 1); assert.equal(x.calls.revoked, 2); assert.equal(x.calls.metadata, 1);
    assert.equal(x.object.native.unrelatedSetting, 'preserved');
    assert.equal(x.object.native.nexowattEosAccount.policyVersion, 1);
    assert.equal(x.object.native.nexowattEosAccount.role, 'installer');
    assert.equal(x.object.native.nexowattEosAccount.forcePasswordChange, false);
    assert.equal(x.object.native.nexowattPasswordChangeRequired, false);
    assert.deepEqual(x.calls.cookies, ['access_token', 'refresh_token', 'connect.sid']);
});
test('enduser completes own initial password independently', async () => {
    const x = fixture({ role: 'enduser' }); const result = await x.invoke();
    assert.equal(result.status, 200); assert.equal(result.body.role, 'enduser'); assert.equal(x.calls.write, 1);
});
test('wrong current credential cannot claim a first password', async () => {
    const x = fixture(); const result = await x.invoke(x.req({ currentPassword: randomBytes(24).toString('base64url') }));
    assert.equal(result.status, 403); assert.equal(result.body.error, 'currentPasswordInvalid'); assert.equal(x.calls.write, 0);
});
test('caller cannot supply another target, roles or extra fields', async () => {
    for (const extra of [{ user: 'admin' }, { userId: 'system.user.admin' }, { role: 'admin' }, { common: { enabled: true } }]) {
        const x = fixture(); const result = await x.invoke(x.req(extra)); assert.equal(result.status, 400); assert.equal(x.calls.verify, 0); assert.equal(x.calls.write, 0);
    }
});
test('foreign origin or missing explicit header fails before password work', async () => {
    const foreign = fixture({ origin: false }); assert.equal((await foreign.invoke()).status, 403); assert.equal(foreign.calls.verify, 0);
    const missing = fixture(); const request = missing.req(); request.headers = {};
    assert.equal((await missing.invoke(request)).status, 403); assert.equal(missing.calls.verify, 0);
});
test('anonymous and service accounts cannot use first-login account claiming', async () => {
    for (const options of [{ user: null }, { role: 'admin', user: 'system.user.admin' }]) {
        const x = fixture(options); assert.equal((await x.invoke()).status, 403); assert.equal(x.calls.verify, 0);
    }
});
test('pending setup cannot use normal change, initialized account cannot reclaim first password', async () => {
    const x = fixture(); assert.equal((await x.invoke(x.req({}, false), false)).body.error, 'passwordChangeRequired');
    const y = fixture({ pending: false }); assert.equal((await y.invoke()).body.error, 'passwordAlreadyInitialized');
});
test('authenticated initialized installer, enduser and service change only their own password', async () => {
    for (const role of ['installer', 'enduser', 'admin']) {
        const x = fixture({ role, pending: false }); const result = await x.invoke(x.req({}, false), false);
        assert.equal(result.status, 200, role); assert.equal(x.calls.write, 1); assert.equal(result.body.sessionInvalidated, true);
    }
});
test('password proof work bounded to five attempts per minute and one active write per account', async () => {
    const x = fixture();
    for (let i = 0; i < 5; i++) assert.equal((await x.invoke(x.req({ currentPassword: 'incorrect test credential' }))).status, 403);
    assert.equal((await x.invoke()).status, 429); assert.equal(x.calls.verify, 5);
    const y = fixture(); let release;
    y.web.adapter.checkPasswordAsync = () => new Promise(resolve => { release = resolve; });
    const first = y.invoke();
    while (!release) await new Promise(resolve => setImmediate(resolve));
    assert.equal((await y.invoke()).status, 429); release(false); assert.equal((await first).status, 403);
    assert.equal(y.web.eosAccountWrites.size, 0);
});
test('normal own-password route refuses reuse of current password', async () => {
    const x = fixture({ pending: false }); const result = await x.invoke(x.req({ password: x.temporary, passwordRepeat: x.temporary }, false), false);
    assert.equal(result.status, 400); assert.equal(result.body.error, 'passwordUnchanged'); assert.equal(x.calls.verify, 0);
});
test('legacy setup flags and initialized markers affect session fingerprint', () => {
    const x = fixture({ pending: false });
    const before = JSON.stringify(session.securityProjection(x.object._id, x.object));
    for (const flag of ['nexowattPasswordChangeRequired', 'eosPasswordChangeRequired', 'nexowattFirstLoginPending', 'eosFirstLoginRequired']) {
        const next = clone(x.object); next.native[flag] = true;
        assert.notEqual(JSON.stringify(session.securityProjection(next._id, next)), before, flag);
    }
    const next = clone(x.object); next.native.nexowattEosAccount.passwordInitialized = false;
    assert.notEqual(JSON.stringify(session.securityProjection(next._id, next)), before);
});
test('installer capabilities do not advertise service object/package/log administration', () => {
    const caps = fixture().web.getEosRoleCapabilities('installer');
    for (const name of ['adapterManagement', 'instanceManagement', 'objectDiagnostics', 'logDiagnostics', 'licenseAdministration', 'userManagement', 'securityAdministration']) assert.equal(caps[name], false, name);
    assert.equal(caps.basicSystemSettings, true);
});
test('raw object, state, file, account and arbitrary upstream commands denied to every non-service role', () => {
    for (const role of ['installer', 'enduser']) {
        for (const command of ['getObject', 'getObjects', 'getAllObjects', 'getObjectView', 'getForeignObjects', 'subscribeObjects', 'subscribeStates', 'readFile', 'getState', 'setState', 'setBinaryState', 'setObject', 'extendObject', 'delObjects', 'addUser', 'addGroup', 'changePassword', 'decrypt', 'encrypt', 'sendTo', 'sendToHost', 'cmdExec', 'futureUpstreamCommand']) {
            assert.equal(policy.roleSocketCommandAllowed(role, command, ['system.config']), false, `${role}:${command}`);
        }
        assert.equal(policy.roleSocketCommandAllowed(role, 'authEnabled', []), true);
    }
    assert.equal(policy.roleSocketCommandAllowed('unknown', 'authEnabled', []), false);
    assert.equal(policy.roleSocketCommandAllowed('admin', 'getObject', ['system.config']), true);
});

test('HTTP access requires one canonical role, including the admin username', async () => {
    const x = fixture();
    for (const ids of [[], ['system.group.nexowatt-service'], ['system.group.installateur', 'system.group.administrator']]) {
        x.web.getEosGroupDetailsForUser = async () => ids.map(id => ({ id, name: 'irrelevant', desc: '' }));
        assert.equal((await x.web.getEosAccessForUserId('system.user.admin')).userId, null);
    }
    x.web.getEosGroupDetailsForUser = async () => [{ id: 'system.group.installateur', name: 'irrelevant', desc: '' }];
    assert.equal((await x.web.getEosAccessForUserId('system.user.alice')).role, 'installer');
});
test('technical HTTP route gate rejects endusers, pending setup and installer service access', async () => {
    async function run(options, serviceOnly) {
        const x = fixture(options);
        return new Promise(resolve => {
            const res = { status(code) { this.code = code; return this; }, json(body) { resolve({ status: this.code, body }); } };
            x.web.eosTechnicalRouteGuard(serviceOnly)({}, res, () => resolve({ status: 200 }));
        });
    }
    assert.equal((await run({ role: 'enduser', pending: false }, false)).status, 403);
    assert.equal((await run({ role: 'installer', pending: true }, false)).body.error, 'passwordChangeRequired');
    assert.equal((await run({ role: 'installer', pending: false }, true)).status, 403);
    assert.equal((await run({ role: 'installer', pending: false }, false)).status, 200);
    assert.equal((await run({ role: 'admin', pending: false }, true)).status, 200);
});
test('integrated startup checks provisioned groups without repairing membership or ACLs', async () => {
    const code = fs.readFileSync(path.join(root, 'build/main.js'), 'utf8');
    const start = code.indexOf('async ensureEosRoleModel() {'); const end = code.indexOf('async ensureEosRoleReadableAcl(', start);
    assert.ok(start > 0 && end > start);
    const method = vm.runInNewContext(`({ ${code.slice(start, end)} }).ensureEosRoleModel`, { eosApplianceProfile_1: policy });
    const calls = []; const context = { async getForeignObjectAsync(id) { calls.push(id); return { type: 'group', common: { members: [] } }; },
        async refreshEosRoleCache() { calls.push('refresh'); } };
    await method.call(context); assert.equal(calls.length, 4); assert.equal(calls.at(-1), 'refresh');
    context.getForeignObjectAsync = async () => null;
    await assert.rejects(method.call(context), /EOS_ROLE_PROVISIONING_REQUIRED/);
});

test('disabled canonical group loses HTTP authority and changes session fingerprint', async () => {
    const x = fixture();
    const group = { _id: 'system.group.installateur', type: 'group', common: { name: 'irrelevant', members: ['system.user.alice'] } };
    x.web.adapter.getObjectViewAsync = async () => ({ rows: [{ id: 'display name', value: group }] });
    assert.equal((await x.web.getEosAccessForUserId('system.user.alice')).role, 'installer');
    const before = JSON.stringify(session.securityProjection(group._id, group));
    group.common.enabled = false;
    assert.notEqual(JSON.stringify(session.securityProjection(group._id, group)), before);
    assert.equal((await x.web.getEosAccessForUserId('system.user.alice')).userId, null);
});

test('installer account reset cannot cross into service or installer authority', async () => {
    for (const [target, targetRole, groups] of [
        ['system.user.admin', 'admin', ['system.group.administrator']],
        ['system.user.support', 'admin', ['system.group.administrator']],
        ['system.user.other_installer', 'installer', ['system.group.installateur']],
        ['system.user.unknown', 'enduser', []],
    ]) {
        const x = fixture({ pending: false }); let writes = 0;
        x.web.getEosAccessForUserId = async () => ({ userId: target, role: targetRole, groups });
        x.web.setEosUserPassword = async () => { writes++; };
        const response = {};
        const res = { setHeader() {}, status(code) { response.status = code; return this; }, json(body) { response.body = body; } };
        await x.web.resetEosAccountPassword({ headers: { 'x-nexowatt-eos-account-reset': '1' }, body: { user: target } }, res);
        assert.ok([400, 403].includes(response.status), target); assert.equal(writes, 0, target);
    }
});
test('ordinary enduser cannot reset any other account', async () => {
    const x = fixture({ role: 'enduser', pending: false }); let code;
    await x.web.resetEosAccountPassword({ headers: {}, body: { user: 'admin' } },
        { setHeader() {}, status(value) { code = value; return this; }, json() {} });
    assert.equal(code, 403);
});

test('service role cannot use raw account/group authority mutation instead of root provisioning', () => {
    for (const command of ['addUser', 'delUser', 'addGroup', 'delGroup', 'changePassword']) {
        assert.equal(policy.socketCommandAllowed(command, ['system.user.admin']), false, command);
    }
    for (const command of ['setObject', 'extendObject', 'delObject', 'delObjects']) {
        for (const id of ['system.group.administrator', 'system.user.alice']) {
            assert.equal(policy.socketCommandAllowed(command, [id, { common: { members: ['system.user.alice'] } }]), false, `${command}:${id}`);
        }
    }
});

test('concurrent role change during current-password proof prevents account write', async () => {
    const x = fixture();
    x.web.adapter.checkPasswordAsync = async () => {
        x.web.getEosRequestAccess = async () => ({ userId: null, role: 'enduser' });
        return true;
    };
    assert.equal((await x.invoke()).status, 409); assert.equal(x.calls.write, 0);
});
test('concurrent reset during current-password proof prevents overwriting new credential', async () => {
    const x = fixture();
    x.web.adapter.checkPasswordAsync = async () => { x.object.common.password = 'changed-by-concurrent-reset-fixture'; return true; };
    assert.equal((await x.invoke()).status, 409); assert.equal(x.calls.write, 0);
});
test('password policy rechecks account revision after KDF before any database write', async () => {
    let reads = 0; let writes = 0;
    const adapter = { async getForeignObjectAsync() { return { type: 'user', common: { enabled: true, password: ++reads === 1 ? 'old-fixture' : 'concurrent-reset-fixture' } }; },
        async extendForeignObjectAsync() { writes++; } };
    policy.installPasswordPolicy(adapter);
    await assert.rejects(adapter.setPasswordAsync('alice', randomBytes(24).toString('base64url')), /EOS_PASSWORD_ACCOUNT_CHANGED/);
    assert.equal(reads, 2); assert.equal(writes, 0);
});

test('actual Admin same-origin method binds browser authority to HTTPS transport', () => {
    const x = fixture(); const check = headers => prototype.isEosSameOriginWrite.call(x.web, { headers });
    assert.equal(check({ host: 'eos.local:8081', origin: 'https://eos.local:8081' }), true);
    assert.equal(check({ host: 'eos.local:8081', origin: 'http://eos.local:8081' }), false);
    assert.equal(check({ host: 'eos.local:8081', origin: 'https://other.local:8081', 'x-forwarded-host': 'other.local:8081' }), false);
    assert.equal(check({ host: 'eos.local:8081', cookie: 'ambient-fixture-cookie' }), false);
});
