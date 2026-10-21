'use strict';
// Contract integration against the actual npm-locked SocketCommandsAdmin.
// Only adapter-core's controller discovery and the database adapter are fixtures;
// the socket dispatcher and its permission checks execute unchanged upstream code.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const Module = require('node:module');
const dependencies = process.env.EOS_ADMIN_DEPENDENCIES;
if (!dependencies || !path.isAbsolute(dependencies)) throw new Error('EOS_ADMIN_DEPENDENCIES must identify the verified isolated node_modules');
const packageRoot = path.join(dependencies, '@iobroker/socket-classes');
const expectedVersion = process.env.EOS_ADMIN_SOCKET_CLASSES_VERSION || '2.10.0';
assert.ok(['2.3.4', '2.6.0', '2.10.0'].includes(expectedVersion), 'Only explicitly reviewed dispatcher versions');
assert.equal(JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'))).version, expectedVersion);
const load = Module._load;
let SocketCommandsAdmin;
try {
    Module._load = function(name, parent, main) {
        if (name === '@iobroker/adapter-core') return { commonTools: {} };
        return load.call(this, name, parent, main);
    };
    ({ SocketCommandsAdmin } = require(path.join(packageRoot, 'build/lib/socketCommandsAdmin')));
} finally { Module._load = load; }
const policy = require(`../${process.env.EOS_TEST_RUNTIME === 'build' ? 'build' : 'src'}/lib/eosApplianceProfile`);
function actualGuard() {
    const runtime = process.env.EOS_TEST_RUNTIME === 'build' ? 'build' : 'src';
    const source = fs.readFileSync(path.join(__dirname, '..', runtime, runtime === 'src' ? 'main.ts' : 'main.js'), 'utf8');
    const begin = source.indexOf(runtime === 'src' ? '    private installEosSocketCommandGuard(' : '    installEosSocketCommandGuard(');
    const end = source.indexOf(runtime === 'src' ? '    private async ensureEosRoleModel(' : '    async ensureEosRoleModel(', begin);
    assert.ok(begin > 0 && end > begin, 'Actual Admin method must be present');
    let wrapper = `class Guard {${source.slice(begin, end)}}`;
    if (runtime === 'src') wrapper = Module.stripTypeScriptTypes(wrapper, { mode: 'transform' });
    wrapper += '; return Guard.prototype.installEosSocketCommandGuard;';
    return new Function('installSocketBoundary', 'roleSocketCommandAllowed', 'eosApplianceProfile_1', 'ERROR_PERMISSION', wrapper)(
        policy.installSocketBoundary, policy.roleSocketCommandAllowed, policy, 'permissionError');
}
test('actual Admin installation fails closed when required upstream permission hooks disappear', () => {
    const install = actualGuard();
    for (const commands of [undefined, {}, { _checkPermissions: true }, { _checkPermissions: null, _nexowattEosGuardInstalled: true }]) {
        assert.throws(() => install.call({}, { commands }), /EOS_SOCKET_PROFILE/);
    }
    assert.throws(() => install.call({}, { commands: { _checkPermissions() { return true; } } }), /EOS_SOCKET_PROFILE/);
});
function fixture(role = 'admin') {
    const calls = []; let session = true;
    const id = 'system.adapter.nexowatt-ui.0';
    const objects = { [id]: { _id: id, type: 'instance', common: { enabled: true, version: '1.0.21', main: 'main.js' }, native: {} } };
    const adapter = { name: 'admin', config: {}, log: { debug() {}, info() {}, warn() {}, error() {} },
        extendForeignObject(...args) { calls.push(['extend', ...args]); args.at(-1)(null); },
        setForeignObject(...args) { calls.push(['set', ...args]); args.at(-1)(null); },
        delForeignObject(...args) { calls.push(['delete', ...args]); args.at(-1)(null); },
        setPassword(...args) { calls.push(['password', ...args]); args.at(-1)(null); },
        sendToHost(host, command, message, callback, options) { calls.push(['host', host, command, message, options]); callback?.({ ok: true }); },
        sendTo(instance, command, message, callback, options) { calls.push(['adapter', instance, command, message, options]); callback?.({ ok: true }); },
    };
    const commands = new SocketCommandsAdmin(adapter, () => true, { language: 'en' }, objects, {});
    policy.installSocketBoundary(commands, (_socket, command, args) => session && policy.roleSocketCommandAllowed(role, command, args), () => objects);
    const socket = { id: 'fixture', _acl: { user: 'system.user.admin' }, emit() {} };
    return { commands, socket, calls, id, objects, revoke() { session = false; } };
}
test('real dispatcher allows native configuration but denies changed entrypoint before write', () => {
    const x = fixture(); let result;
    x.commands.commands.extendObject(x.socket, x.id, { native: { ordinary: true } }, error => { result = error; });
    assert.equal(result, null); assert.equal(x.calls.length, 1);
    x.commands.commands.extendObject(x.socket, x.id, { common: { main: '/tmp/unsigned.js' } }, error => { result = error; });
    assert.equal(result, policy.ERROR); assert.equal(x.calls.length, 1);
});
test('real administrator host dispatch cannot reach shell, package or zip import handlers', async () => {
    const x = fixture(); let result;
    for (const command of ['cmdExec', 'upgradeAdapter', 'writeDirAsZip', 'readObjectsAsZip', 'getRepository']) {
        x.commands.commands.sendToHost(x.socket, 'local', command, { data: '' }, value => { result = value; });
        assert.equal(result.error, policy.ERROR, command);
    }
    assert.equal(x.calls.length, 0);
    result = await new Promise(resolve => x.commands.commands.sendToHost(x.socket, 'local', 'getHostInfo', {}, resolve));
    assert.equal(x.calls.length, 1); assert.equal(result.ok, true);
});

test('real allowed EOS message forwards the authenticated user and stops after revocation', async () => {
    if (expectedVersion !== '2.10.0') return;
    const x = fixture();
    const payload = { user: 'system.user.untrusted-payload-marker' };
    const result = await new Promise(resolve => x.commands.commands.sendTo(x.socket, 'eos-admin.0', 'eos.license.check', payload, resolve));
    assert.equal(result.ok, true);
    assert.deepEqual(x.calls[0].at(-1), { user: 'system.user.admin' });
    assert.equal(x.calls[0][3], payload);
    x.revoke(); let rejected;
    x.commands.commands.sendTo(x.socket, 'eos-admin.0', 'eos.license.check', {}, value => { rejected = value; });
    assert.equal(rejected.error, policy.ERROR);
    assert.equal(x.calls.length, 1);
});
test('real recursive delete alias cannot remove platform objects', () => {
    const x = fixture(); let result;
    x.commands.commands.delObjects(x.socket, 'system', {}, value => { result = value; });
    assert.equal(result, policy.ERROR); assert.equal(x.calls.length, 0);
});

test('real dispatcher denies every command outside the installer/enduser navigation contract, including new upstream commands', () => {
    const navigation = new Set(['authenticate', 'authEnabled', 'updateTokenExpiration',
        'getAdapterName', 'checkFeatureSupported', 'getCurrentInstance', 'getEasyMode',
        'getIsEasyModeStrict', 'getUserPermissions', 'listPermissions', 'getVersion', 'logout']);
    for (const role of ['installer', 'enduser']) {
        const x = fixture(role);
        for (const [name, handler] of Object.entries(x.commands.commands)) {
            if (navigation.has(name)) continue;
            let result;
            handler(x.socket, 'system.config', {}, value => { result = value; });
            assert.equal(typeof result === 'object' ? result.error : result, policy.ERROR, `${role}:${name}`);
            assert.equal(x.calls.length, 0, `${role}:${name} never reached adapter`);
        }
    }
});
test('revoked own-user password call is denied despite upstream self-user shortcut', () => {
    const x = fixture(); let result; x.revoke();
    x.commands.commands.changePassword(x.socket, 'system.user.admin', 'ephemeral-test-password', value => { result = value; });
    assert.equal(result, policy.ERROR); assert.equal(x.calls.length, 0);
});

// The real upstream cache dispatcher would otherwise disclose full readable
// objects. The role boundary must run before that handler is reached.
test('real dispatcher denies installer/enduser raw secrets, aliases and elevation paths', () => {
    for (const role of ['installer', 'enduser']) {
        const x = fixture(role);
        x.objects['system.config'] = { _id: 'system.config', type: 'config', native: { secret: 'non-secret-fixture-marker' } };
        x.objects['system.user.admin'] = { _id: 'system.user.admin', type: 'user', common: { password: 'non-secret-hash-fixture' } };
        for (const name of ['getAllObjects', 'getObjects', 'getObject', 'getObjectView', 'getForeignObjects', 'subscribeObjects',
            'extendObject', 'setObject', 'delObjects', 'addUser', 'addGroup', 'changePassword', 'setState', 'setBinaryState',
            'sendTo', 'sendToHost', 'decrypt', 'writeFile']) {
            let result;
            assert.equal(typeof x.commands.commands[name], 'function', name);
            x.commands.commands[name](x.socket, 'system.config', {}, value => { result = value; });
            assert.equal(typeof result === 'object' ? result.error : result, policy.ERROR, `${role}:${name}`);
            assert.equal(x.calls.length, 0, `${role}:${name} never reached adapter`);
        }
    }
});

test('real service dispatcher cannot change root-owned accounts or promote installers', () => {
    const x = fixture('admin');
    const group = 'system.group.administrator';
    x.objects[group] = { _id: group, type: 'group', common: { members: ['system.user.admin'] } };
    for (const [command, args] of [
        ['extendObject', [group, { common: { members: ['system.user.admin', 'system.user.alice'] } }]],
        ['setObject', ['system.user.alice', { type: 'user', common: { enabled: true } }]],
        ['addUser', ['another_admin', 'ephemeral test passphrase']], ['addGroup', ['service_alias', 'label']],
        ['delUser', ['alice']], ['delGroup', ['installateur']],
        ['changePassword', ['system.user.admin', 'ephemeral test passphrase']],
    ]) {
        let result; x.commands.commands[command](x.socket, ...args, value => { result = value; });
        assert.equal(result, policy.ERROR, command); assert.equal(x.calls.length, 0, command);
    }
});
