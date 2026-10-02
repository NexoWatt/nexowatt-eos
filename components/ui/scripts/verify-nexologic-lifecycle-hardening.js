#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { NexoLogicEngine, validateNexoLogicConfig } = require('../ems/nexologic-engine');

class FakeAdapter {
  constructor(initial = {}) {
    this.namespace = 'nexowatt-ui.0';
    this.config = { diagnostics: { actuatorArbiterMode: 'observe' }, smartHomeConfig: { devices: [] } };
    this.foreign = new Map();
    this.local = new Map();
    this.objects = new Map();
    this.writes = [];
    this._nwShuttingDown = false;
    this.log = { debug() {}, info() {}, warn() {}, error() {} };
    const now = Date.now();
    for (const [id, value] of Object.entries(initial)) this.foreign.set(id, { val: value, ack: true, q: 0, ts: now, lc: now });
  }
  async setObjectNotExistsAsync(id, obj) { if (!this.objects.has(id)) this.objects.set(id, obj); }
  async setStateAsync(id, state, ack) {
    const row = state && typeof state === 'object' && Object.prototype.hasOwnProperty.call(state, 'val') ? state : { val: state, ack: ack === true };
    this.local.set(id, { ...row, ts: Date.now(), lc: Date.now() });
  }
  async getStateAsync(id) { return this.local.get(id) || null; }
  async setForeignStateAsync(id, state, ack) {
    const row = state && typeof state === 'object' && Object.prototype.hasOwnProperty.call(state, 'val') ? state : { val: state, ack: ack === true };
    const stored = { ...row, ts: Date.now(), lc: Date.now(), q: 0 };
    this.foreign.set(id, stored);
    this.writes.push({ id, value: stored.val, ts: Date.now() });
    return true;
  }
  async getForeignStateAsync(id) { return this.foreign.get(id) || null; }
  async subscribeForeignStatesAsync() {}
  async unsubscribeForeignStatesAsync() {}
  getSmartHomeConfig() { return this.config.smartHomeConfig || { devices: [] }; }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const link = (id, fromNode, fromPort, toNode, toPort) => ({ id, from: { node: fromNode, port: fromPort }, to: { node: toNode, port: toPort } });

(async () => {
  // 1) Atomarer Start: Zwei bereits wahre Eingänge eines UND dürfen nur den
  // finalen wahren Ausgang erzeugen, niemals erst false und dann true.
  {
    const adapter = new FakeAdapter({ 'test.0.a': true, 'test.0.b': true });
    const engine = new NexoLogicEngine(adapter);
    await engine.init({ graphs: [{
      id: 'atomic', enabled: true,
      nodes: [
        { id: 'a', type: 'dp_in', params: { dpId: 'test.0.a', cast: 'bool', invalidPolicy: 'block' } },
        { id: 'b', type: 'dp_in', params: { dpId: 'test.0.b', cast: 'bool', invalidPolicy: 'block' } },
        { id: 'and', type: 'and', params: {} },
        { id: 'out', type: 'dp_out', params: { dpId: 'test.0.out', minIntervalMs: 0, deactivateMode: 'safe', stopValue: 'false' } },
      ],
      links: [link('l1', 'a', 'out', 'and', 'a'), link('l2', 'b', 'out', 'and', 'b'), link('l3', 'and', 'out', 'out', 'in')],
    }] });
    await wait(30);
    const startupWrites = adapter.writes.filter((row) => row.id === 'test.0.out');
    assert.deepStrictEqual(startupWrites.map((row) => row.value), [true], 'Start darf keinen falschen Zwischenwert schreiben');
    await engine.stop();
  }

  // 2) Fehlender/null Eingang ist kein Messwert 0. Der Aktor wird fail-closed
  // auf seinen Ruhewert gesetzt; es darf kein null/undefined geschrieben werden.
  {
    const adapter = new FakeAdapter({ 'test.0.input': true });
    const engine = new NexoLogicEngine(adapter);
    await engine.init({ graphs: [{
      id: 'quality', enabled: true,
      nodes: [
        { id: 'in', type: 'dp_in', params: { dpId: 'test.0.input', cast: 'bool', invalidPolicy: 'block' } },
        { id: 'out', type: 'dp_out', params: { dpId: 'test.0.relay', minIntervalMs: 0, deactivateMode: 'safe', stopValue: 'false' } },
      ],
      links: [link('l1', 'in', 'out', 'out', 'in')],
    }] });
    await wait(20);
    await engine.handleStateChange('test.0.input', { val: null, ack: true, q: 0, ts: Date.now() });
    await wait(30);
    const writes = adapter.writes.filter((row) => row.id === 'test.0.relay').map((row) => row.value);
    assert.strictEqual(writes[0], true);
    assert.strictEqual(writes[writes.length - 1], false, 'ungültiger Eingang muss sicheren Ruhewert auslösen');
    assert(!writes.some((value) => value === null || value === undefined), 'null/undefined darf nie als Hardwarewert geschrieben werden');
    await engine.stop();
  }

  // 3) Beim Start bereits TRUE erzeugt keine künstliche Flanke und keine Szene.
  {
    const adapter = new FakeAdapter({ 'test.0.trigger': true });
    const engine = new NexoLogicEngine(adapter);
    await engine.init({ graphs: [{
      id: 'edge', enabled: true,
      nodes: [
        { id: 'in', type: 'dp_in', params: { dpId: 'test.0.trigger', cast: 'bool', invalidPolicy: 'block' } },
        { id: 'edge', type: 'edge_rising', params: {} },
        { id: 'scene', type: 'scene_trigger', params: { dpId: 'test.0.scenePulse', edge: 'rising', pulseMs: 0, payload: 'true' } },
      ],
      links: [link('l1', 'in', 'out', 'edge', 'in'), link('l2', 'edge', 'out', 'scene', 'trig')],
    }] });
    await wait(40);
    assert.strictEqual(adapter.writes.some((row) => row.id === 'test.0.scenePulse' && row.value === true), false, 'Startwert darf keine Szene auslösen');
    await engine.handleStateChange('test.0.trigger', { val: false, ack: true, q: 0, ts: Date.now() });
    await wait(15);
    await engine.handleStateChange('test.0.trigger', { val: true, ack: true, q: 0, ts: Date.now() });
    await wait(30);
    assert(adapter.writes.some((row) => row.id === 'test.0.scenePulse' && row.value === true), 'reale Flanke muss Szene auslösen');
    await engine.stop();
  }

  // 4) Stop/Deaktivierung schreibt den definierten Ruhewert.
  {
    const adapter = new FakeAdapter();
    const engine = new NexoLogicEngine(adapter);
    await engine.init({ graphs: [{
      id: 'stop', enabled: true,
      nodes: [
        { id: 'const', type: 'const', params: { valueType: 'bool', value: true } },
        { id: 'out', type: 'dp_out', params: { dpId: 'test.0.stopRelay', minIntervalMs: 0, deactivateMode: 'safe', stopValue: 'false' } },
      ],
      links: [link('l1', 'const', 'out', 'out', 'in')],
    }] });
    await wait(20);
    await engine.stop();
    const writes = adapter.writes.filter((row) => row.id === 'test.0.stopRelay').map((row) => row.value);
    assert.deepStrictEqual(writes.slice(-2), [true, false], 'Engine-Stop muss aktiven Ausgang sicher ausschalten');
  }

  // 5) Der 2-Punkt-Regler wertet sich nach Mindestlaufzeit selbst erneut aus.
  {
    const adapter = new FakeAdapter({ 'test.0.temp': 18 });
    const engine = new NexoLogicEngine(adapter);
    await engine.init({ graphs: [{
      id: 'rt', enabled: true,
      nodes: [
        { id: 'enable', type: 'const', params: { valueType: 'bool', value: true } },
        { id: 'temp', type: 'dp_in', params: { dpId: 'test.0.temp', cast: 'number', invalidPolicy: 'block' } },
        { id: 'set', type: 'const', params: { valueType: 'number', value: 20 } },
        { id: 'rt', type: 'rt_2p', params: { mode: 'heat', band: 0.2, minOnMs: 100, minOffMs: 0 } },
        { id: 'out', type: 'dp_out', params: { dpId: 'test.0.heating', minIntervalMs: 0, deactivateMode: 'safe', stopValue: 'false' } },
      ],
      links: [
        link('l1', 'enable', 'out', 'rt', 'enable'), link('l2', 'temp', 'out', 'rt', 'ist'),
        link('l3', 'set', 'out', 'rt', 'soll'), link('l4', 'rt', 'out', 'out', 'in'),
      ],
    }] });
    await wait(20);
    await engine.handleStateChange('test.0.temp', { val: 22, ack: true, q: 0, ts: Date.now() });
    await wait(35);
    assert.strictEqual(adapter.foreign.get('test.0.heating').val, true, 'Mindestlaufzeit muss zunächst halten');
    await wait(110);
    assert.strictEqual(adapter.foreign.get('test.0.heating').val, false, 'Regler muss ohne weitere Eingangsänderung ausschalten');
    await engine.stop();
  }

  // 6) Kombinatorische Kreise werden vor dem Start abgewiesen.
  {
    const invalid = validateNexoLogicConfig({ graphs: [{
      id: 'cycle', enabled: true,
      nodes: [{ id: 'a', type: 'not', params: {} }, { id: 'b', type: 'not', params: {} }],
      links: [link('l1', 'a', 'out', 'b', 'in'), link('l2', 'b', 'out', 'a', 'in')],
    }] });
    assert.strictEqual(invalid.ok, false);
    assert(invalid.errors.some((row) => row.code === 'graph-cycle'));
  }

  console.log('[nexologic-lifecycle-hardening] OK');
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
