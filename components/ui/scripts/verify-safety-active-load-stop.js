#!/usr/bin/env node
'use strict';

/**
 * RC39 / 0.8.163 – aktive Verbraucher muessen bei einem ungueltigen
 * SafetyEnvelope auch dann physisch auf AUS/0 geschrieben werden, wenn der neue
 * Regelplan bereits AUS enthaelt. Das verhindert, dass Readback-, No-change-
 * oder Contract-Pfade einen alten Hardwarezustand weiterlaufen lassen.
 */

const assert = require('assert');
const { beginSafetyCycle } = require('../ems/services/safety-envelope');
const { ThermalControlModule } = require('../ems/modules/thermal-control');
const { HeatingRodControlModule } = require('../ems/modules/heating-rod-control');
const { MultiUseModule } = require('../ems/modules/multi-use');

class FakeAdapter {
  constructor() {
    this.namespace = 'nexowatt-ui.0';
    this.config = {
      installerConfig: {
        gridConnectionPower: 10000,
        para14a: false,
        gridPhaseCount: 3,
        safetyMeterTimeoutSec: 30,
      },
      peakShaving: { maxPhaseA: 0 },
      chargingManagement: { safetyEnvelopeMaxAgeSec: 5, nominalVoltageV: 230 },
    };
    this._nvpFreshnessSnapshot = {
      ts: Date.now() - 60000,
      usable: false,
      fresh: false,
      connected: false,
      netW: null,
      status: 'stale',
      source: 'test-meter',
      reason: 'test-stale',
      measurementAgeMs: 60000,
      heartbeatAgeMs: 60000,
    };
    this.states = new Map();
    this.foreign = new Map();
    this.writes = [];
    this.log = { debug() {}, info() {}, warn() {}, error() {} };
  }

  async getStateAsync(id) { return this.states.has(id) ? { val: this.states.get(id) } : null; }
  async setStateAsync(id, val) { this.states.set(id, val); }
  async setObjectNotExistsAsync() {}
  async getForeignStateAsync(id) {
    return this.foreign.has(id) ? { val: this.foreign.get(id), ack: true, ts: Date.now() } : null;
  }
  async setForeignStateAsync(id, val) {
    this.foreign.set(id, val);
    this.writes.push({ id, value: val });
    if (this.dp) this.dp.setByObjectId(id, val);
    return true;
  }
  _nwRequestImmediateEmsTick() { return true; }
}

class FakeDp {
  constructor(adapter) {
    this.adapter = adapter;
    this.entries = new Map();
    this.values = new Map();
    this.objectToKey = new Map();
    this.writes = [];
    this.lastWriteByObjectId = new Map();
    adapter.dp = this;
  }

  add(key, objectId, value = null) {
    this.entries.set(key, { key, objectId, invert: false });
    this.objectToKey.set(objectId, key);
    if (value !== null) {
      this.values.set(key, value);
      this.adapter.foreign.set(objectId, value);
    }
  }
  setByObjectId(id, val) {
    const key = this.objectToKey.get(id);
    if (key) this.values.set(key, val);
  }
  getEntry(key) { return this.entries.get(key) || null; }
  getRaw(key, fallback = null) { return this.values.has(key) ? this.values.get(key) : fallback; }
  getBoolean(key, fallback = null) { return this.values.has(key) ? !!this.values.get(key) : fallback; }
  getNumber(key, fallback = null) {
    if (!this.values.has(key)) return fallback;
    const parsed = Number(this.values.get(key));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  getNumberFresh(key, _maxAgeMs, fallback = null) {
    const value = this.getRaw(key, fallback);
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  getMeasurementAgeMs(key) { return this.entries.has(key) ? 0 : null; }
  getAgeMs(key) { return this.entries.has(key) ? 0 : null; }
  getConnectionStatus(key) { return this.entries.has(key) ? true : null; }
  async writeNumber(key, value) {
    const parsed = Number(value);
    this.values.set(key, parsed);
    const entry = this.getEntry(key);
    if (entry) this.adapter.foreign.set(entry.objectId, parsed);
    this.writes.push({ key, value: parsed });
    return true;
  }
  async writeBoolean(key, value) {
    const parsed = !!value;
    this.values.set(key, parsed);
    const entry = this.getEntry(key);
    if (entry) this.adapter.foreign.set(entry.objectId, parsed);
    this.writes.push({ key, value: parsed });
    return true;
  }
}

(async () => {
  // 1) Thermik: Hardware steht noch auf 3,2 kW/EIN, der aktuelle Plan bereits
  // auf 0 W. Stale NVP muss trotzdem einen erzwungenen echten AUS-Write ausloesen.
  {
    const adapter = new FakeAdapter();
    const dp = new FakeDp(adapter);
    dp.add('th.c1.setW', 'device.thermal.setW', 3200);
    dp.add('th.c1.en', 'device.thermal.enable', true);
    beginSafetyCycle(adapter, 1, Date.now());
    const thermal = new ThermalControlModule(adapter, dp);
    const device = {
      id: 'c1',
      setWKey: 'th.c1.setW',
      enableKey: 'th.c1.en',
      sg1Key: '',
      sg2Key: '',
      maxPowerW: 3200,
      estimatedPowerW: 3200,
      requireReadback: true,
      readbackTimeoutSec: 1,
      retryDelaySec: 1,
      maxRetries: 1,
      faultLockSec: 1,
    };
    const result = await thermal._applyThermalCommand(
      device,
      'power',
      { type: 'load', key: 'c1', setWKey: 'th.c1.setW', enableKey: 'th.c1.en' },
      { targetW: 0 },
      'stale-safety-stop',
    );
    assert.strictEqual(result.safetyForcedStop, true);
    assert.strictEqual(dp.values.get('th.c1.setW'), 0);
    assert.strictEqual(dp.values.get('th.c1.en'), false);
    assert(dp.writes.some((row) => row.key === 'th.c1.setW' && row.value === 0));
    assert(dp.writes.some((row) => row.key === 'th.c1.en' && row.value === false));
  }

  // 2) Heizstab: Rueckmeldung Stufe 1 ist EIN, Plan ist bereits Stufe 0.
  // Ungueltige NVP-Sicherheit muss den Relais-AUS-Write trotzdem erzwingen.
  {
    const adapter = new FakeAdapter();
    const dp = new FakeDp(adapter);
    dp.add('hr.c1.s1.w', 'device.rod.s1', true);
    dp.add('hr.c1.s1.r', 'device.rod.s1r', true);
    const originalSet = adapter.setForeignStateAsync.bind(adapter);
    adapter.setForeignStateAsync = async (id, val) => {
      await originalSet(id, val);
      if (id === 'device.rod.s1') {
        dp.values.set('hr.c1.s1.r', !!val);
        adapter.foreign.set('device.rod.s1r', !!val);
      }
      return true;
    };
    beginSafetyCycle(adapter, 1, Date.now());
    const rod = new HeatingRodControlModule(adapter, dp);
    const device = {
      id: 'c1',
      wiredStages: 1,
      stageCount: 1,
      maxPowerW: 3000,
      requireReadback: true,
      readbackTimeoutSec: 1,
      retryDelaySec: 1,
      maxRetries: 1,
      faultLockSec: 1,
      stages: [
        {
          powerW: 3000,
          writeKey: 'hr.c1.s1.w',
          readKey: 'hr.c1.s1.r',
          writeId: 'device.rod.s1',
          readId: 'device.rod.s1r',
        },
      ],
    };
    const feedback = rod._readStageFeedback(device, null);
    const result = await rod._applyStageState(device, 0, feedback, { reason: 'stale-safety-stop' });
    assert.strictEqual(result.safetyForcedStop, true);
    assert.strictEqual(dp.values.get('hr.c1.s1.w'), false);
    assert.strictEqual(dp.values.get('hr.c1.s1.r'), false);
    assert(adapter.writes.some((row) => row.id === 'device.rod.s1' && row.value === false));
  }

  // 3) Legacy-MultiUse: Der Verbraucher laeuft noch mit 3 kW, der neue Plan
  // enthaelt bereits 0 W. Der finale Writer muss aus ungueltiger Sicherheit
  // trotzdem einen echten 0-W-/AUS-Befehl erzeugen.
  {
    const adapter = new FakeAdapter();
    adapter.config.enableMultiUse = true;
    adapter.config.multiUse = { legacyFlexibleConsumersEnabled: true };
    const dp = new FakeDp(adapter);
    dp.add('mu.c1.setW', 'device.multiuse.setW', 3000);
    dp.add('mu.c1.en', 'device.multiuse.enable', true);
    dp.add('mu.c1.actual', 'device.multiuse.actualW', 3000);
    beginSafetyCycle(adapter, 1, Date.now());
    const multiUse = new MultiUseModule(adapter, dp);
    const consumer = {
      id: 'c1',
      key: 'c1',
      type: 'load',
      setWKey: 'mu.c1.setW',
      enableKey: 'mu.c1.en',
      actualWKey: 'mu.c1.actual',
      controlBasis: 'powerW',
      safetyApp: 'custom',
      maxPowerW: 3000,
      phaseCount: 3,
      voltageV: 230,
      requireReadback: false,
      readbackTimeoutSec: 1,
      retryDelaySec: 1,
      maxRetries: 1,
      faultLockSec: 1,
    };
    const result = await multiUse._applyConsumerCommand(
      consumer,
      { targetW: 0, targetA: 0, basis: 'powerW' },
      'stale-safety-stop',
      30000,
    );
    assert.strictEqual(result.safetyForcedStop, true);
    assert.strictEqual(dp.values.get('mu.c1.setW'), 0);
    assert.strictEqual(dp.values.get('mu.c1.en'), false);
    assert(dp.writes.some((row) => row.key === 'mu.c1.setW' && row.value === 0));
    assert(dp.writes.some((row) => row.key === 'mu.c1.en' && row.value === false));
  }

  console.log('[safety-active-load-stop] OK: Thermik, Heizstab und Legacy-MultiUse erzwingen bei ungueltigem SafetyEnvelope auch aus einem bereits-AUS-Plan einen realen Hardware-Stopp.');
})().catch((error) => {
  console.error('[safety-active-load-stop] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
