'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

function createAdapter(devices) {
  const timers = new Map();
  const stopped = [];
  class Adapter {
    constructor(options) {
      this.config = options.config;
      this.states = new Map();
      this.writes = [];
      this.log = { debug() {}, info() {}, warn() {}, error() {} };
    }
    on() {}
    subscribeStates() {}
    async getForeignObjectsAsync() { return {}; }
    async setObjectNotExistsAsync() {}
    async setStateAsync(id, value) { this.states.set(id, value); this.writes.push({ id, ...value }); }
  }
  class DeviceRuntime {
    constructor(_adapter, cfg) { this.cfg = cfg; this.started = false; this._hbOnline = false; }
    async initObjects() {}
    async start() {
      if (this.cfg.failStart) throw new Error('connection setup failed');
      this.started = true;
      this._hbOnline = this.cfg.initialOnline === true;
    }
    async stop() { this.started = false; this._hbOnline = false; stopped.push(this.cfg.id); }
  }
  const filename = path.join(__dirname, '../main.js');
  const nativeRequire = createRequire(filename);
  const module = { exports: {}, parent: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    __dirname: path.dirname(filename), module, process,
    setInterval(callback, delay) { const timer = {}; timers.set(timer, { callback, delay }); return timer; },
    clearInterval(timer) { timers.delete(timer); },
    require(request) {
      if (request === '@iobroker/adapter-core') return { Adapter };
      if (request === './lib/deviceRuntime') return { DeviceRuntime };
      return nativeRequire(request);
    },
  }, { filename });
  return { adapter: module.exports({ config: { devices } }), timers, stopped };
}

const device = (id, overrides = {}) => ({ id, templateId: 'generic.http', protocol: 'http', ...overrides });
const connected = adapter => adapter.states.get('info.connection')?.val;
async function unload(adapter) { let calls = 0; await adapter.onUnload(() => { calls += 1; }); assert.equal(calls, 1); }
async function tick(adapter, timers) {
  for (const { callback } of timers.values()) callback();
  await adapter._globalConnectionUpdate;
}

test('configured but missing-template or failed-start devices never report connected', async () => {
  const { adapter } = createAdapter([
    device('missing', { templateId: 'does.not.exist' }), device('failed', { failStart: true }),
  ]);
  try {
    await adapter.onReady();
    assert.equal(connected(adapter), false);
    assert.equal(adapter.writes.some(write => write.id === 'info.connection' && write.val === true), false);
  } finally { await unload(adapter); }
});

test('global indicator follows one online device, complete data loss and recovery', async () => {
  const { adapter, timers } = createAdapter([device('one', { initialOnline: true }), device('two')]);
  try {
    await adapter.onReady();
    assert.equal(connected(adapter), true);
    assert.equal(timers.size, 1);
    assert.ok([...timers.values()][0].delay >= 1000 && [...timers.values()][0].delay <= 5000);
    adapter.deviceRuntimes[0]._hbOnline = false;
    await tick(adapter, timers);
    assert.equal(connected(adapter), false);
    adapter.deviceRuntimes[1]._hbOnline = true;
    await tick(adapter, timers);
    assert.equal(connected(adapter), true);
    const writes = adapter.writes.length;
    await tick(adapter, timers);
    assert.equal(adapter.writes.length, writes, 'unchanged heartbeat aggregate flooded state writes');
  } finally { await unload(adapter); }
});

test('disabled and stopped runtimes cannot make the aggregate online', async () => {
  const { adapter, timers } = createAdapter([device('disabled', { enabled: false, initialOnline: true }), device('stopped')]);
  try {
    await adapter.onReady();
    const stopped = adapter.deviceRuntimes[1];
    stopped.started = false;
    stopped._hbOnline = true;
    await tick(adapter, timers);
    assert.equal(connected(adapter), false);
  } finally { await unload(adapter); }
});

test('unload stops the timer and devices and leaves the global indicator offline', async () => {
  const { adapter, timers, stopped } = createAdapter([device('live', { initialOnline: true })]);
  await adapter.onReady();
  assert.equal(connected(adapter), true);
  await unload(adapter);
  assert.equal(connected(adapter), false);
  assert.equal(timers.size, 0);
  assert.deepEqual(stopped, ['live']);
  adapter.deviceRuntimes.push({ started: true, cfg: {}, _hbOnline: true });
  await adapter._refreshGlobalConnection();
  assert.equal(connected(adapter), false, 'late callbacks must not revive an unloaded instance');
});

test('unload waits for an in-flight online update before its final offline state', async () => {
  const { adapter } = createAdapter([device('live')]);
  await adapter.onReady();
  const write = adapter.setStateAsync.bind(adapter);
  let release;
  const blocked = new Promise(resolve => { release = resolve; });
  let begun;
  const onlineBegan = new Promise(resolve => { begun = resolve; });
  adapter.setStateAsync = async (id, state) => {
    if (id === 'info.connection' && state.val === true) { begun(); await blocked; }
    await write(id, state);
  };
  adapter.deviceRuntimes[0]._hbOnline = true;
  const update = adapter._refreshGlobalConnection();
  await onlineBegan;
  const unloading = unload(adapter);
  release();
  await Promise.all([update, unloading]);
  assert.equal(connected(adapter), false);
});

test('an empty configuration starts offline without creating a refresh timer', async () => {
  const { adapter, timers } = createAdapter([]);
  await adapter.onReady();
  assert.equal(connected(adapter), false);
  assert.equal(timers.size, 0);
  await unload(adapter);
});
