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
const expectedVersion = process.env.EOS_ADMIN_SOCKET_CLASSES_VERSION || '2.3.4';
assert.ok(['2.3.4', '2.6.0'].includes(expectedVersion), 'Only explicitly reviewed dispatcher versions');
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
function fixture(role = 'admin') {
    const calls = []; let session = true;
    const id = 'system.adapter.nexowatt-ui.0';
    const objects = { [id]: { _id: id, type: 'instance', common: { enabled: true, version: '1.0.21', main: 'main.js' }, native: {} } };
    const adapter = { name: 'admin', config: {}, log: { debug() {}, info() {}, warn() {}, error() {} },
        extendForeignObject(...args) { calls.push(['extend', ...args]); args.at(-1)(null); },
        setForeignObject(...args) { calls.push(['set', ...args]); args.at(-1)(null); },
        delForeignObject(...args) { calls.push(['delete', ...args]); args.at(-1)(null); },
        setPassword(...args) { calls.push(['password', ...args]); args.at(-1)(null); },
        sendToHost(...args) { calls.push(['host', ...args]); args.at(-1)({ ok: true }); },
    };
    const commands = new SocketCommandsAdmin(adapter, () => true, { language: 'en' }, objects, {});
    commands._sendToHost = adapter.sendToHost;
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
test('real administrator host dispatch cannot reach shell, package or zip import handlers', () => {
    const x = fixture(); let result;
    for (const command of ['cmdExec', 'upgradeAdapter', 'writeDirAsZip', 'readObjectsAsZip', 'getRepository']) {
        x.commands.commands.sendToHost(x.socket, 'local', command, { data: '' }, value => { result = value; });
        assert.equal(result.error, policy.ERROR, command);
    }
    assert.equal(x.calls.length, 0);
    x.commands.commands.sendToHost(x.socket, 'local', 'getHostInfo', {}, value => { result = value; });
    assert.equal(x.calls.length, 1); assert.equal(result.ok, true);
});
test('real recursive delete alias cannot remove platform objects', () => {
    const x = fixture(); let result;
    x.commands.commands.delObjects(x.socket, 'system', {}, value => { result = value; });
    assert.equal(result, policy.ERROR); assert.equal(x.calls.length, 0);
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
