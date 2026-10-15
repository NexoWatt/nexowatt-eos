'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { startupFailure } = require('../ocpp/secure-transport');

test('new instance and actual admin form expose the same disabled-by-default enrollment gate', () => {
  const metadata = require('../io-package.json');
  const config = require('../admin/jsonConfig.json');
  assert.equal(metadata.native.eosCommissioningEnabled, false);
  assert.equal(config.items.general.items.eosCommissioningEnabled.default, false);
  assert.match(config.items.general.items.port.help.en, /wss:\/\/EOS-IP:port\/ocpp\/identity/);
  assert.doesNotMatch(JSON.stringify(config), /"[^"\n]*\bws:\/\//);
});

// Execute actual adapter lifecycle methods; only database, license transport,
// timer scheduling and the network listener are replaced. Actual TLS/file
// boundaries are tested separately in secure-transport.test.js.
function fixture(config = {}, options = {}) {
  const file = path.join(__dirname, '../main.js');
  const localRequire = createRequire(file);
  const module = { exports: {} };
  const states = new Map(), objects = new Map(), logs = [], timers = new Set();
  const calls = { constructed: 0, listened: 0, closed: 0, subscribed: 0, guards: 0 };
  let allowed = options.allowed !== false, failure = options.failure, loss;
  const guard = {
    async start() { await options.licenseStart; }, async stop() {}, isAllowed() { return allowed; },
    assertAllowed() { if (!allowed) throw new Error('EOS_LICENSE_REQUIRED'); },
  };
  class Adapter {
    constructor() {
      this.namespace = 'ocpp21.0'; this.config = config;
      this.log = Object.fromEntries(['info', 'warn', 'error', 'debug'].map(level => [level, message => logs.push({ level, message })]));
    }
    on() {}
    async setObjectNotExistsAsync(id, object) { objects.set(id, object); }
    async setStateAsync(id, state) { states.set(id, state); }
    async setStateChangedAsync(id, state) { states.set(id, state); }
    subscribeStates() { calls.subscribed++; }
  }
  class Server {
    constructor(ctx) { calls.constructed++; if (failure) throw failure; this.ctx = ctx; }
    async listen() { calls.listened++; await options.listening; }
    async close() { calls.closed++; }
  }
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
    module, exports: module.exports,
    setInterval(fn, ms) { const timer = { fn, ms, unref() {} }; timers.add(timer); return timer; },
    clearInterval(timer) { timers.delete(timer); }, setTimeout, clearTimeout,
    require(name) {
      if (name === '@iobroker/adapter-core') return { Adapter };
      if (name === './ocpp/server') return { OcppRpcServer: Server };
      if (name === './packages/eos-license-client') return { createLicenseGuard(_adapter, opts) { calls.guards++; loss = opts.onLost; return guard; } };
      return localRequire(name);
    },
  }, { filename: file });
  const adapter = module.exports({});
  adapter._resetPersistedHealth = async () => {};
  adapter._watchdogCycle = async () => {};
  return { adapter, states, objects, logs, calls, timers,
    allow(value) { allowed = value; if (!value) loss?.(); },
    fail(value) { failure = value; },
    state() { return states.get('info.runtimeState')?.val; },
    reason() { return states.get('info.runtimeReason')?.val; },
  };
}

test('new inactive commissioning starts healthy waiting process without listener, commands, or fake connection', async () => {
  const f = fixture({ eosCommissioningEnabled: false });
  await f.adapter.onReady();
  assert.equal(f.state(), 'awaiting_transport_enrollment');
  assert.equal(f.reason(), 'EOS_OCPP_COMMISSIONING_DISABLED');
  assert.equal(f.states.get('info.connection').val, false);
  assert.equal(f.objects.get('info.runtimeState').common.write, false);
  for (let i = 0; i < 10; i++) await f.adapter._startLicensedRuntime();
  await f.adapter.onStateChange('ocpp21.0.station.control.hardReset', { val: true, ack: false });
  assert.equal(f.calls.constructed, 0);
  assert.equal(f.calls.subscribed, 0);
  assert.equal(f.logs.filter(entry => entry.message.includes('COMMISSIONING_DISABLED')).length, 1);
  assert.equal(f.timers.size, 1);
  assert.equal([...f.timers][0].ms, 5000);
});

test('missing manifest reports enrollment, retries at most every 30s, then resumes once', async () => {
  const f = fixture({ eosCommissioningEnabled: true }, { failure: new Error('EOS_OCPP_TRANSPORT_NOT_ENROLLED') });
  await f.adapter.onReady();
  assert.equal(f.state(), 'awaiting_transport_enrollment');
  assert.equal(f.reason(), 'EOS_OCPP_TRANSPORT_NOT_ENROLLED');
  assert.equal(f.calls.constructed, 1);
  const next = f.adapter._nextStartupAttempt;
  assert.ok(next > Date.now() + 29000);
  for (let i = 0; i < 10; i++) await f.adapter._startLicensedRuntime();
  assert.equal(f.calls.constructed, 1);
  assert.equal(f.logs.filter(entry => entry.message.includes('TRANSPORT_NOT_ENROLLED')).length, 1);
  f.adapter._nextStartupAttempt = 0;
  f.fail(undefined);
  await f.adapter._startLicensedRuntime();
  await f.adapter._startLicensedRuntime();
  assert.equal(f.state(), 'listening');
  assert.equal(f.calls.constructed, 2);
  assert.equal(f.calls.listened, 1);
  assert.equal(f.states.get('info.connection').val, false, 'listener is not a station connection');
});

for (const code of ['EOS_OCPP_PROFILE_INVALID', 'EOS_OCPP_PROFILE_DIRECTORY_UNSAFE', 'EOS_OCPP_PROFILE_FILE_UNSAFE',
  'EOS_OCPP_PROFILE_INCOMPLETE', 'EOS_OCPP_IDENTITY_MAP_INVALID']) {
  test(`unsafe/incomplete enrollment is rejected, not mislabeled absent: ${code}`, async () => {
    const f = fixture({ eosCommissioningEnabled: true }, { failure: new Error(code) });
    await f.adapter.onReady();
    assert.equal(f.state(), 'configuration_rejected');
    assert.equal(f.reason(), code);
    assert.equal(f.calls.listened, 0);
    assert.equal(f.states.get('info.connection').val, false);
    await f.adapter._startLicensedRuntime();
    assert.equal(f.logs.filter(entry => entry.level === 'error').length, 1);
  });
}

test('unknown startup exception never leaks paths, material or arbitrary error codes', async () => {
  const failure = Object.assign(new Error('private station path and certificate data'), { code: 'ENOENT' });
  const f = fixture({}, { failure });
  await f.adapter.onReady();
  assert.equal(f.state(), 'configuration_rejected');
  assert.equal(f.reason(), 'EOS_OCPP_START_FAILED');
  assert.ok(!JSON.stringify([...f.states, ...f.logs]).includes('private station'));
  assert.equal(startupFailure({ code: 'EACCES' }).reason, 'EOS_OCPP_PROFILE_UNREADABLE');
  assert.equal(startupFailure({ code: 'EADDRINUSE' }).reason, 'EOS_OCPP_LISTENER_IN_USE');
});

test('existing absent flag preserves profile-required startup; malformed flags deny it', async () => {
  const legacy = fixture({});
  await legacy.adapter.onReady();
  assert.equal(legacy.calls.listened, 1);
  for (const value of [null, 0, 1, '', 'false', 'true', {}]) {
    const f = fixture({ eosCommissioningEnabled: value });
    await f.adapter.onReady();
    assert.equal(f.state(), 'configuration_rejected');
    assert.equal(f.reason(), 'EOS_OCPP_COMMISSIONING_INVALID');
    assert.equal(f.calls.constructed, 0);
  }
});

test('license activation, loss and renewal preserve sessions and stop new commands', async () => {
  const f = fixture({ eosCommissioningEnabled: true }, { allowed: false });
  await f.adapter.onReady();
  assert.equal(f.state(), 'awaiting_license');
  assert.equal(f.calls.constructed, 0);
  f.allow(true);
  await f.adapter._startLicensedRuntime();
  const session = { client: {}, socketConnected: true, smartChargingGeneration: 1 };
  f.adapter.runtimeIndex.set('station', session);
  await f.adapter._updateAdapterConnection();
  assert.equal(f.states.get('info.connection').val, true);
  f.allow(false);
  await f.adapter._startLicensedRuntime();
  await f.adapter.onStateChange('ocpp21.0.station.control.hardReset', { val: true, ack: false });
  assert.equal(f.state(), 'license_blocked');
  assert.equal(session.smartChargingGeneration, 2);
  assert.equal(f.calls.closed, 0);
  f.allow(true);
  await f.adapter._startLicensedRuntime();
  assert.equal(f.state(), 'listening');
  assert.equal(f.calls.listened, 1);
  session.socketConnected = false;
  await f.adapter._updateAdapterConnection();
  assert.equal(f.states.get('info.connection').val, false);
});

test('invalid physical inventory and all disabled protocols fail closed', async () => {
  const bad = fixture({ chargePointInventory: [{ stationIdentity: 's', connectorId: 0, evseId: 1 }] });
  await bad.adapter.onReady();
  assert.equal(bad.reason(), 'EOS_OCPP_INVENTORY_INVALID');
  assert.equal(bad.calls.guards, 0);
  const protocols = fixture({ enable16: false, enable201: false, enable21: false });
  await protocols.adapter.onReady();
  assert.equal(protocols.reason(), 'EOS_OCPP_PROTOCOLS_REQUIRED');
  assert.equal(protocols.calls.constructed, 0);
});

test('unload while waiting clears the scheduler and cannot restart afterwards', async () => {
  const f = fixture({ eosCommissioningEnabled: false });
  await f.adapter.onReady();
  let done = false;
  await f.adapter.onUnload(() => { done = true; });
  f.adapter.config.eosCommissioningEnabled = true;
  await f.adapter._startLicensedRuntime();
  assert.equal(done, true);
  assert.equal(f.state(), 'stopped');
  assert.equal(f.timers.size, 0);
  assert.equal(f.calls.constructed, 0);
});

test('unload during listener startup closes it and never subscribes or starts watchdog', async () => {
  let release;
  const f = fixture({}, { listening: new Promise(resolve => { release = resolve; }) });
  const startup = f.adapter.onReady();
  while (f.calls.listened === 0) await new Promise(resolve => setImmediate(resolve));
  const unload = f.adapter.onUnload(() => {});
  release();
  await Promise.all([startup, unload]);
  assert.equal(f.adapter.server, null);
  assert.equal(f.calls.closed, 1);
  assert.equal(f.calls.subscribed, 0);
  assert.equal(f.timers.size, 0);
  assert.equal(f.state(), 'stopped');
});

function barrier() {
  let enter, release;
  const entered = new Promise(resolve => { enter = resolve; });
  const wait = new Promise(resolve => { release = resolve; });
  return { entered, release, async pause() { enter(); await wait; } };
}

for (const phase of ['initial-status-write', 'persisted-health-reset', 'license-start']) {
  test(`unload during ${phase} waits for cancellation and cannot resurrect startup`, { timeout: 2000 }, async () => {
    const gate = barrier();
    const options = phase === 'license-start' ? { licenseStart: gate.pause() } : {};
    const f = fixture({ eosCommissioningEnabled: false }, options);
    if (phase === 'initial-status-write') {
      const write = f.adapter.setStateAsync.bind(f.adapter);
      f.adapter.setStateAsync = async (id, state) => {
        if (id === 'info.runtimeState' && state.val === 'starting') await gate.pause();
        await write(id, state);
      };
    } else if (phase === 'persisted-health-reset') f.adapter._resetPersistedHealth = () => gate.pause();
    const ready = f.adapter.onReady();
    await gate.entered;
    // licenseStart's promise was prepared before onReady, so let initialization
    // reach the awaited start operation before scheduling unload.
    if (phase === 'license-start') while (f.calls.guards === 0) await new Promise(resolve => setImmediate(resolve));
    let unloaded = false;
    const unload = f.adapter.onUnload(() => { unloaded = true; });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(unloaded, false, 'unload must not finish ahead of an in-flight lifecycle write');
    gate.release();
    await Promise.all([ready, unload]);
    assert.equal(unloaded, true);
    assert.equal(f.state(), 'stopped');
    assert.equal(f.states.get('info.connection').val, false);
    assert.equal(f.timers.size, 0);
    assert.equal(f.calls.constructed, 0);
    await f.adapter.onReady();
    assert.equal(f.timers.size, 0, 'late ready callbacks cannot reopen a stopped adapter');
  });
}

test('unload orders final false after dispatched connection write and discards queued stale writes', { timeout: 2000 }, async () => {
  const f = fixture({});
  await f.adapter.onReady();
  f.adapter.runtimeIndex.set('station', { socketConnected: true, client: {}, smartChargingGeneration: 0 });
  const gate = barrier();
  const write = f.adapter.setStateChangedAsync.bind(f.adapter);
  let trueWrites = 0;
  f.adapter.setStateChangedAsync = async (id, state) => {
    if (id === 'info.connection' && state.val === true) { trueWrites++; await gate.pause(); }
    await write(id, state);
  };
  const online = f.adapter._updateAdapterConnection();
  await gate.entered;
  const queued = f.adapter._updateAdapterConnection();
  let unloaded = false;
  const unload = f.adapter.onUnload(() => { unloaded = true; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(unloaded, false);
  gate.release();
  await Promise.all([online, queued, unload]);
  assert.equal(trueWrites, 1, 'queued old-generation write must never be dispatched');
  assert.equal(f.states.get('info.connection').val, false);
  assert.equal(f.state(), 'stopped');
  assert.equal(f.timers.size, 0);
  await f.adapter._updateAdapterConnection();
  assert.equal(f.states.get('info.connection').val, false);
});
