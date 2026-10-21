'use strict';
// Executes the published/locked socket-classes 2.10.0 implementation. Only
// controller discovery and database/message I/O are fixtures. No controller 8
// mayRead fast path, network transport, real database or Pi is exercised here.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const Module = require('node:module');
const dependencies = process.env.EOS_ADMIN_DEPENDENCIES;
if (!dependencies || !path.isAbsolute(dependencies)) throw new Error('EOS_ADMIN_DEPENDENCIES must identify the verified isolated node_modules');
const packageRoot = path.join(dependencies, '@iobroker/socket-classes');
assert.equal(JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'))).version, '2.10.0');
const load = Module._load;
let SocketCommands, SocketCommandsAdmin;
try {
    Module._load = function(name, parent, main) {
        if (name === '@iobroker/adapter-core') return { commonTools: {} };
        return load.call(this, name, parent, main);
    };
    ({ SocketCommands } = require(path.join(packageRoot, 'build/lib/socketCommands')));
    ({ SocketCommandsAdmin } = require(path.join(packageRoot, 'build/lib/socketCommandsAdmin')));
} finally { Module._load = load; }

function fixture() {
    const queries = [], watches = [], messages = [];
    let session = true;
    const adapter = {
        name: 'admin', config: {}, log: { warn() {}, error() {}, info() {}, debug() {} },
        getForeignObject(id, options, callback) { queries.push({ id, options, callback }); },
        subscribeForeignObjectsAsync(pattern) { watches.push(pattern); return Promise.resolve(); },
        sendTo(target, command, message, callback, options) { messages.push({ target, command, message, options }); callback?.({ ok: true }); },
        sendToHost(target, command, message, callback, options) { messages.push({ target, command, message, options }); callback?.({ ok: true }); },
    };
    const commands = new SocketCommands(adapter, () => session, { language: 'en' });
    function socket(user = 'system.user.fixture', kinds = ['stateChange', 'objectChange', 'fileChange']) {
        const events = [];
        return { id: `${user}-fixture`, _acl: { user, other: { sendto: true } },
            subscribe: Object.fromEntries(kinds.map(kind => [kind, [{ regex: /.*/ }]])),
            events, emit(...args) { events.push(args); } };
    }
    return { adapter, commands, queries, watches, messages, socket, revoke() { session = false; } };
}

test('controller 7 fallback checks state/file metadata with the real authenticated user before publication', () => {
    const x = fixture(), socket = x.socket();
    assert.equal(x.adapter.mayRead, undefined);
    x.commands.publish(socket, 'stateChange', 'fixture.value', { val: 1 });
    x.commands.publishFile(socket, 'fixture.0', 'fixture.txt', 12);
    assert.equal(socket.events.length, 0);
    assert.deepEqual(x.queries.map(({ id, options }) => ({ id, options })), [
        { id: 'fixture.value', options: { user: 'system.user.fixture' } },
        { id: 'fixture.0', options: { user: 'system.user.fixture' } },
    ]);
    x.queries[0].callback(null);
    x.queries[1].callback(null);
    assert.deepEqual(socket.events, [['stateChange', 'fixture.value', { val: 1 }], ['fileChange', 'fixture.0', 'fixture.txt', 12]]);
    assert.deepEqual(x.watches, ['*']);
    // On controller 7 the file check is the meta object's ACL, not a claim
    // that per-file modes or state ACLs were evaluated by controller 8 mayRead.
});

test('database refusal and anonymous sockets disclose no state, object or file events', () => {
    const x = fixture(), socket = x.socket();
    x.commands.publish(socket, 'stateChange', 'fixture.value', { val: 1 });
    x.commands.publish(socket, 'objectChange', 'fixture.object', { type: 'state' });
    x.commands.publishFile(socket, 'fixture.0', 'fixture.txt', 12);
    for (const query of x.queries) query.callback('permissionError');
    assert.equal(socket.events.length, 0);
    const anonymous = x.socket(undefined); delete anonymous._acl.user;
    x.commands.publish(anonymous, 'stateChange', 'fixture.value', { val: 2 });
    x.commands.publish(anonymous, 'objectChange', 'fixture.object', { type: 'state' });
    x.commands.publishFile(anonymous, 'fixture.0', 'fixture.txt', 12);
    assert.equal(anonymous.events.length, 0);
    assert.equal(x.queries.length, 3);
});

test('read decisions are separated by user and invalidated after object and group rights changes', () => {
    const x = fixture(), allowed = x.socket('system.user.allowed', ['stateChange']);
    const denied = x.socket('system.user.denied', ['stateChange']);
    x.commands.publish(allowed, 'stateChange', 'fixture.value', { val: 1 });
    x.commands.publish(denied, 'stateChange', 'fixture.value', { val: 1 });
    x.queries[0].callback(null); x.queries[1].callback('permissionError');
    x.commands.publish(allowed, 'stateChange', 'fixture.value', { val: 2 });
    assert.equal(x.queries.length, 2);
    assert.equal(allowed.events.length, 2); assert.equal(denied.events.length, 0);
    x.commands.publish(allowed, 'objectChange', 'fixture.value', { type: 'state' });
    x.commands.publish(allowed, 'stateChange', 'fixture.value', { val: 3 });
    assert.equal(x.queries.length, 3);
    x.queries[2].callback('permissionError');
    assert.equal(allowed.events.length, 2);
    x.commands.publish(denied, 'objectChange', 'system.group.fixture', { type: 'group' });
    x.commands.publish(denied, 'stateChange', 'fixture.value', { val: 4 });
    assert.equal(x.queries.length, 4);
    x.queries[3].callback(null);
    assert.deepEqual(denied.events, [['stateChange', 'fixture.value', { val: 4 }]]);
});

test('an async read decision publishes only the newest waiting state and rechecks a stale answer', () => {
    const x = fixture(), socket = x.socket('system.user.fixture', ['stateChange']);
    x.commands.publish(socket, 'stateChange', 'fixture.value', { val: 1 });
    x.commands.publish(socket, 'stateChange', 'fixture.value', { val: 2 });
    assert.equal(x.queries.length, 1);
    x.commands.publish(socket, 'objectChange', 'fixture.value', { type: 'state' });
    x.queries[0].callback(null);
    assert.equal(socket.events.length, 0);
    assert.equal(x.queries.length, 2);
    x.queries[1].callback(null);
    assert.deepEqual(socket.events, [['stateChange', 'fixture.value', { val: 2 }]]);
});

test('revoked sessions and removed subscriptions are rechecked before a pending event leaves', () => {
    for (const change of ['revoke', 'unsubscribe']) {
        const x = fixture(), socket = x.socket();
        x.commands.publish(socket, 'stateChange', 'fixture.value', { val: 1 });
        if (change === 'revoke') x.revoke(); else delete socket.subscribe.stateChange;
        x.queries[0].callback(null);
        assert.equal(socket.events.length, 0, change);
    }
});

test('known upstream 2.10 limitation: successful nonadmin objectChange replay repeats ACL reads; EOS raw-role denial remains required', () => {
    const x = fixture(), socket = x.socket();
    x.commands.publish(socket, 'objectChange', 'fixture.object', { type: 'state' });
    // Bound this characterization explicitly: do not let a synchronous fixture
    // recurse indefinitely. This is not a passing positive delivery test.
    for (let i = 0; i < 3; i++) x.queries[i].callback(null);
    assert.equal(x.queries.length, 4);
    assert.equal(socket.events.length, 0);
});

test('base sendTo/sendToHost and client subscription messages preserve the socket user', async () => {
    const x = fixture(), socket = x.socket();
    await new Promise(resolve => x.commands.commands.sendTo(socket, 'fixture.0', 'fixtureRead', {}, resolve));
    x.commands.commands.sendToHost(socket, 'fixture-host', 'getHostInfo', {}, () => {});
    x.commands.commands.clientSubscribe(socket, 'fixture.0', 'fixtureEvent', {}, () => {});
    x.commands.commands.clientUnsubscribe(socket, 'fixture.0', 'fixtureEvent', () => {});
    assert.equal(x.messages.length, 4);
    for (const message of x.messages) assert.deepEqual(message.options, { user: 'system.user.fixture' });
});

test('known upstream Admin override limitation: allowed host reads lack user options, unlike base dispatcher', async () => {
    const x = fixture(), socket = x.socket();
    const commands = new SocketCommandsAdmin(x.adapter, () => true, { language: 'en' }, {}, {});
    await new Promise(resolve => commands.commands.sendToHost(socket, 'fixture-host', 'getHostInfo', {}, resolve));
    assert.equal(x.messages.length, 1);
    assert.equal(x.messages[0].options, undefined);
    // EOS permits only its finite service host-read allowlist; it must not rely
    // on this path to forward identity for command execution or shared caching.
});
