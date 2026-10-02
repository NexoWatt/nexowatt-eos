#!/usr/bin/env node
'use strict';

/**
 * Regression: Adapter-Unload darf keine neuen ioBroker-Timer erzeugen.
 *
 * Der ioBroker-Core markiert eine Instanz bereits vor dem `unload`-Callback als
 * "shutting down". Jeder danach erzeugte adapter.setTimeout()/setInterval()-Aufruf
 * führt zur Warnung "setTimeout called, but adapter is shutting down". Dieser Test
 * lädt die echte main.js mit einem kleinen Adapter-Core-Stub und prüft den gesamten
 * Unload-Einstieg sowie die zentralen Timer-/StateChange-Guards.
 */

const assert = require('assert');
const path = require('path');
const Module = require('module');
const { EventEmitter } = require('events');

let timeoutCalls = 0;
let intervalCalls = 0;
let forbiddenTimerCalls = 0;
let clearCalls = 0;

class AdapterStub extends EventEmitter {
  constructor(options = {}) {
    super();
    this.name = options.name || 'nexowatt-ui';
    this.namespace = `${this.name}.0`;
    this.config = {};
    this.log = {
      debug() {}, info() {}, warn() {}, error() {}, silly() {},
    };
    this._coreShuttingDown = false;
  }

  setTimeout(fn, ms, ...args) {
    timeoutCalls += 1;
    if (this._coreShuttingDown) forbiddenTimerCalls += 1;
    return { kind: 'timeout', fn, ms, args };
  }

  setInterval(fn, ms, ...args) {
    intervalCalls += 1;
    if (this._coreShuttingDown) forbiddenTimerCalls += 1;
    return { kind: 'interval', fn, ms, args };
  }

  clearTimeout() { clearCalls += 1; }
  clearInterval() { clearCalls += 1; }
  setStateAsync() { return Promise.resolve(); }
}

function expressStub() {
  return {
    use() {}, get() {}, post() {}, put() {}, delete() {},
    listen() { return null; },
  };
}
expressStub.json = () => (_req, _res, next) => { if (typeof next === 'function') next(); };
expressStub.static = () => (_req, _res, next) => { if (typeof next === 'function') next(); };

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === '@iobroker/adapter-core') return { Adapter: AdapterStub };
  if (request === 'express') return expressStub;
  if (request === '@iobroker/type-detector') {
    const err = new Error('optional dependency not installed in regression stub');
    err.code = 'MODULE_NOT_FOUND';
    throw err;
  }
  return originalLoad.call(this, request, parent, isMain);
};

try {
  const factory = require(path.join(__dirname, '..', 'main.js'));
  const adapter = factory({});

  assert.strictEqual(adapter._nwShuttingDown, false, 'lifecycle guard must start inactive');

  // Normal operation may schedule timers.
  const t = adapter._nwSetTimeout(() => {}, 10);
  const i = adapter._nwSetInterval(() => {}, 10);
  assert.ok(t && i, 'normal timer scheduling must remain available');
  assert.strictEqual(timeoutCalls, 1);
  assert.strictEqual(intervalCalls, 1);

  // Simulate the ioBroker core already being in shutdown before unload is emitted.
  adapter._coreShuttingDown = true;
  let unloadDone = 0;
  adapter.onUnload(() => { unloadDone += 1; });

  assert.strictEqual(adapter._nwShuttingDown, true, 'unload must activate the guard first');
  assert.strictEqual(unloadDone, 1, 'unload callback must finish exactly once without server');
  assert.strictEqual(forbiddenTimerCalls, 0, 'unload must not call adapter timers after shutdown began');

  // Asynchronous leftovers must also be harmless after unload.
  assert.strictEqual(adapter._nwSetTimeout(() => {}, 1), null);
  assert.strictEqual(adapter._nwSetInterval(() => {}, 1), null);
  adapter.scheduleDerivedFlowUpdate('after-unload');
  adapter.updateValue('gridBuyPower', 1234, Date.now());
  adapter.onStateChange('foreign.0.test', { val: 1, ts: Date.now(), ack: true });

  assert.strictEqual(timeoutCalls, 1, 'no timeout may be added after unload');
  assert.strictEqual(intervalCalls, 1, 'no interval may be added after unload');
  assert.strictEqual(forbiddenTimerCalls, 0, 'no adapter-core shutdown warning path may be reached');

  // Charging-Management besitzt eine eigene gebündelte Publish-Queue. Auch dieser
  // Modulpfad muss den zentralen Shutdown-Guard respektieren.
  const { ChargingManagementModule } = require(path.join(__dirname, '..', 'ems', 'modules', 'charging-management.js'));
  const cm = new ChargingManagementModule(adapter, {});
  cm._pubQueue.set('chargingManagement.test', { val: 1, ack: true });
  cm._schedulePubFlush();
  assert.strictEqual(cm._pubQueue.size, 0, 'module publish queue must be discarded during shutdown');
  assert.strictEqual(timeoutCalls, 1, 'module must not schedule a shutdown timeout');
  assert.strictEqual(forbiddenTimerCalls, 0, 'module must not reach adapter-core timer warning path');
  assert.ok(clearCalls >= 0);

  console.log('[shutdown-timer-guard] OK');
} finally {
  Module._load = originalLoad;
}
