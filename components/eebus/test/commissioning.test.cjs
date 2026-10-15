'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
function harness(native, hooks = {}) {
    const file = path.join(__dirname, '../build/main.js');
    const localRequire = createRequire(file), counts = { migration: 0, writes: 0, identity: 0, runtime: 0, starts: 0, stops: 0, timers: 0, messages: 0, changes: 0 };
    const states = [], replies = [], timers = new Set();
    class Adapter {
        constructor() { this.config = structuredClone(native); this.namespace = 'eebus.0'; this.log = { info() {}, warn() {}, error() {} }; }
        on() {} async setStateAsync(id, state) { states.push([id, state.val]); }
        async setObjectNotExistsAsync() {}
        async getForeignObjectAsync() { return hooks.read ? hooks.read() : { native: structuredClone(native) }; }
        async setForeignObjectAsync() { counts.writes++; }
        setInterval(callback) { counts.timers++; timers.add(callback); return callback; }
        clearInterval(callback) { timers.delete(callback); }
        subscribeStates() {} unsubscribeStates() {}
        sendTo(_from, _command, response) { replies.push(response); }
    }
    const module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), { module, exports: module.exports,
        require(name) {
            if (name === '@iobroker/adapter-core') return { Adapter };
            if (name === '../packages/eos-license-client') return { createLicenseGuard() { return {
                async start() { if (hooks.guard) await hooks.guard(); }, async stop() {}, isAllowed: () => true, assertAllowed() {},
            }; } };
            if (name === './lib/config') { const actual = localRequire(name); return { ...actual,
                migrateLegacyNativeConfig(config) { counts.migration++; return actual.migrateLegacyNativeConfig(config); },
            }; }
            if (name === './lib/identityManager') return { IdentityManager: class { async ensureIdentity() { counts.identity++; return hooks.identity ? hooks.identity() : {}; } } };
            if (name === './lib/objectFactory') return { ObjectFactory: class { async ensureBaseObjects() {} async publishIdentity() {} } };
            if (name === './lib/eebusRuntime') return { EebusRuntime: class {
                constructor() { counts.runtime++; }
                async start() { counts.starts++; if (hooks.runtimeStart) await hooks.runtimeStart(); }
                async stop() { counts.stops++; }
                async handleMessage() { counts.messages++; } async handleStateChange() { counts.changes++; }
            } };
            return localRequire(name);
        },
    }, { filename: file });
    return { adapter: module.exports({}), counts, states, replies, timers };
}

for (const value of [false, 'false', 'true', 0, 1, null, {}]) {
    test(`defined flag ${JSON.stringify(value)} stays passive without changing config or identity`, async () => {
        const config = { eosCommissioningEnabled: value, announceShipService: false, discoveryEnabled: false, shipServerEnabled: false, autoConnectEnabled: false };
        const f = harness(config);
        await f.adapter.onReady();
        await f.adapter.startLicensedRuntime();
        assert.deepEqual(f.adapter.config, config);
        assert.equal(f.counts.migration, 0); assert.equal(f.counts.writes, 0); assert.equal(f.counts.identity, 0);
        assert.equal(f.counts.runtime, 0); assert.equal(f.counts.timers, 0);
        assert.ok(f.states.some(([id,value]) => id === 'info.commissioningState' && value === 'waiting'));
        await f.adapter.onMessage({ from: 'test', command: 'connect', callback: {} });
        assert.equal(f.replies[0].accepted, false);
        let unloaded = false; await f.adapter.onUnload(() => { unloaded = true; }); assert.equal(unloaded, true);
    });
}

for (const config of [{}, { eosCommissioningEnabled: true }]) {
    test(`legacy missing flag / explicit true starts exactly once: ${JSON.stringify(config)}`, async () => {
        const f = harness(config);
        await f.adapter.onReady();
        await Promise.all([f.adapter.startLicensedRuntime(), f.adapter.startLicensedRuntime()]);
        assert.equal(f.counts.identity, 1); assert.equal(f.counts.starts, 1);
        assert.equal(f.timers.size, 0);
        await f.adapter.onUnload(() => {});
        assert.equal(f.counts.stops, 1);
    });
}

test('unload during license startup cannot create a later timer or identity', async () => {
    const entered = deferred(), gate = deferred();
    const f = harness({ eosCommissioningEnabled: true }, { async guard() { entered.resolve(); await gate.promise; } });
    const ready = f.adapter.onReady(); await entered.promise;
    let unloaded = false; const unload = f.adapter.onUnload(() => { unloaded = true; });
    await Promise.resolve(); assert.equal(unloaded, false);
    gate.resolve(); await ready; await unload;
    assert.equal(unloaded, true); assert.equal(f.counts.identity, 0); assert.equal(f.counts.timers, 0);
});

test('unload during identity generation waits for work and never starts a runtime afterward', async () => {
    const entered = deferred(), gate = deferred();
    const f = harness({ eosCommissioningEnabled: true }, { async identity() { entered.resolve(); await gate.promise; return {}; } });
    const ready = f.adapter.onReady(); await entered.promise;
    let unloaded = false; const unload = f.adapter.onUnload(() => { unloaded = true; });
    await Promise.resolve(); assert.equal(unloaded, false);
    gate.resolve(); await ready; await unload;
    assert.equal(unloaded, true); assert.equal(f.counts.runtime, 0); assert.equal(f.timers.size, 0);
});

test('unload during migration read prevents late instance configuration rewrite', async () => {
    const entered = deferred(), gate = deferred();
    const f = harness({ eosCommissioningEnabled: true, announceShipService: false }, { async read() { entered.resolve(); await gate.promise; return { native: {} }; } });
    const ready = f.adapter.onReady(); await entered.promise;
    const unload = f.adapter.onUnload(() => {}); gate.resolve(); await ready; await unload;
    assert.equal(f.counts.writes, 0); assert.equal(f.counts.identity, 0); assert.equal(f.counts.runtime, 0);
});

test('pending runtime start rejects messages and state writes until ready, then closes again before unload', async () => {
    const entered = deferred(), gate = deferred();
    const f = harness({ eosCommissioningEnabled: true }, { async runtimeStart() { entered.resolve(); await gate.promise; } });
    const ready = f.adapter.onReady(); await entered.promise;
    const message = { from: 'test', command: 'connect', callback: {} }, state = { val: true, ack: false };
    await f.adapter.onMessage(message);
    await f.adapter.onStateChange('eebus.0.devices.test.control.connect', state);
    assert.equal(f.replies[0].accepted, false);
    assert.equal(f.counts.messages, 0); assert.equal(f.counts.changes, 0);
    gate.resolve(); await ready;
    await f.adapter.onMessage(message);
    await f.adapter.onStateChange('eebus.0.devices.test.control.connect', state);
    assert.equal(f.counts.messages, 1); assert.equal(f.counts.changes, 1);
    const unload = f.adapter.onUnload(() => {});
    await f.adapter.onMessage(message);
    await f.adapter.onStateChange('eebus.0.devices.test.control.connect', state);
    await unload;
    assert.equal(f.counts.messages, 1); assert.equal(f.counts.changes, 1);
    const previousWrites = f.states.length;
    await f.adapter.onReady();
    assert.equal(f.states.length, previousWrites);
});
