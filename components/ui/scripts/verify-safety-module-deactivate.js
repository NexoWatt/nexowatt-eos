#!/usr/bin/env node
'use strict';

/**
 * RC39 / 0.8.163 – Lifecycle-Sicherheitsnachweis.
 * Deaktivierte Apps und Cold-Start-Konfigurationen duerfen keine alten
 * Hardware-Sollwerte weiterlaufen lassen. Jeder Aktorpfad muss 0/AUS schreiben;
 * ein fehlgeschlagener Stop bleibt im Modulmanager kritisch verriegelt.
 */

const assert = require('assert');
const { ChargingManagementModule } = require('../ems/modules/charging-management');
const { SpeicherRegelungModule } = require('../ems/modules/storage-control');
const { ThermalControlModule } = require('../ems/modules/thermal-control');
const { HeatingRodControlModule } = require('../ems/modules/heating-rod-control');
const { MultiUseModule } = require('../ems/modules/multi-use');
const { ThresholdControlModule } = require('../ems/modules/threshold-control');
const { NexoLogicBudgetModule } = require('../ems/modules/nexologic-budget');
const { ModuleManager } = require('../ems/module-manager');

class FakeAdapter {
  constructor(config = {}) {
    this.namespace = 'nexowatt-ui.0';
    this.config = config;
    this.states = new Map();
    this.foreign = new Map();
    this.writes = [];
    this.log = { debug() {}, info() {}, warn() {}, error() {} };
    this._nwSafetyEnvelopeRequired = false;
  }

  async setObjectNotExistsAsync() {}
  async extendObjectAsync() {}
  async getStateAsync(id) {
    return this.states.has(id) ? { val: this.states.get(id), ack: true, ts: Date.now() } : null;
  }
  async setStateAsync(id, value) {
    const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val') ? value.val : value;
    this.states.set(id, val);
    return true;
  }
  async getForeignStateAsync(id) {
    return this.foreign.has(id) ? { val: this.foreign.get(id), ack: true, ts: Date.now() } : null;
  }
  async setForeignStateAsync(id, value) {
    this.foreign.set(id, value);
    this.writes.push({ id, value });
    if (this.dp) this.dp.setByObjectId(id, value);
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
    this.lastWriteByObjectId = new Map();
    this.writes = [];
    adapter.dp = this;
  }

  async upsert(row) {
    const entry = {
      key: row.key,
      objectId: row.objectId,
      dataType: row.dataType || 'number',
      direction: row.direction || 'in',
      invert: !!row.invert,
      scale: 1,
      offset: 0,
      unitScale: 1,
      deadband: Number(row.deadband) || 0,
      maxWriteIntervalMs: Number(row.maxWriteIntervalMs) || 0,
    };
    this.entries.set(row.key, entry);
    this.objectToKey.set(row.objectId, row.key);
    if (this.adapter.foreign.has(row.objectId)) this.values.set(row.key, this.adapter.foreign.get(row.objectId));
    return entry;
  }
  add(key, objectId, value) {
    this.entries.set(key, { key, objectId, dataType: typeof value === 'boolean' ? 'boolean' : 'number', direction: 'out', invert: false, scale: 1, offset: 0, unitScale: 1, deadband: 0 });
    this.objectToKey.set(objectId, key);
    this.values.set(key, value);
    this.adapter.foreign.set(objectId, value);
  }
  setByObjectId(id, value) {
    const key = this.objectToKey.get(id);
    if (key) this.values.set(key, value);
  }
  getEntry(key) { return this.entries.get(key) || null; }
  getRaw(key, fallback = null) { return this.values.has(key) ? this.values.get(key) : fallback; }
  getNumber(key, fallback = null) {
    if (!this.values.has(key)) return fallback;
    const n = Number(this.values.get(key));
    return Number.isFinite(n) ? n : fallback;
  }
  getNumberFresh(key, _maxAgeMs, fallback = null) { return this.getNumber(key, fallback); }
  getBoolean(key, fallback = null) { return this.values.has(key) ? !!this.values.get(key) : fallback; }
  getAgeMs(key) { return this.entries.has(key) ? 0 : null; }
  getMeasurementAgeMs(key) { return this.entries.has(key) ? 0 : null; }
  getConnectionStatus(key) { return this.entries.has(key) ? true : null; }
  isStale(key) { return !this.entries.has(key); }
  async writeNumber(key, value) {
    const entry = this.getEntry(key);
    if (!entry) return false;
    const n = Number(value);
    if (!Number.isFinite(n)) return false;
    this.values.set(key, n);
    this.adapter.foreign.set(entry.objectId, n);
    this.lastWriteByObjectId.set(entry.objectId, { val: n, ts: Date.now() });
    this.writes.push({ key, value: n });
    this.adapter.writes.push({ id: entry.objectId, value: n });
    return true;
  }
  async writeBoolean(key, value) {
    const entry = this.getEntry(key);
    if (!entry) return false;
    const b = !!value;
    this.values.set(key, b);
    this.adapter.foreign.set(entry.objectId, b);
    this.lastWriteByObjectId.set(entry.objectId, { val: b ? 1 : 0, ts: Date.now() });
    this.writes.push({ key, value: b });
    this.adapter.writes.push({ id: entry.objectId, value: b });
    return true;
  }
}

(async () => {
  // 1) Charging cold start: Modul ist bereits AUS, Hardware steht aber noch auf
  // positivem Sollwert. deactivate() muss ohne vorherigen Tick die Ladeleistung
  // sicher auf 0 setzen, darf die getrennte Stationsverfügbarkeit aber nicht auf
  // Inoperative schalten. Nur Kundenschalter oder aktive RFID-Whitelist besitzen
  // die Zugangs-/Availability-Hoheit.
  {
    const adapter = new FakeAdapter({
      enableChargingManagement: false,
      chargingManagement: {
        wallboxes: [{ key: 'wb1', setCurrentAId: 'wb.setA', setPowerWId: 'wb.setW', enableId: 'wb.enable' }],
      },
    });
    adapter.foreign.set('wb.setA', 16);
    adapter.foreign.set('wb.setW', 11000);
    adapter.foreign.set('wb.enable', true);
    const dp = new FakeDp(adapter);
    const module = new ChargingManagementModule(adapter, dp);
    const result = await module.deactivate();
    assert.strictEqual(result.ok, true);
    assert.strictEqual(adapter.foreign.get('wb.setA'), 0);
    assert.strictEqual(adapter.foreign.get('wb.setW'), 0);
    assert.strictEqual(adapter.foreign.get('wb.enable'), true);
    assert.strictEqual(adapter.writes.some((write) => write.id === 'wb.enable' && write.value === false), false);
  }

  // 2) Thermik cold start: Installer-Ausgaenge werden aus flowSlots aufgebaut.
  {
    const adapter = new FakeAdapter({
      enableThermalControl: false,
      thermal: { devices: [{ slot: 1, enabled: true, type: 'load', maxPowerW: 3200, estimatedPowerW: 3200 }] },
      vis: { flowSlots: { consumers: [{ name: 'WP', ctrl: { switchWriteId: 'th.enable', setpointWriteId: 'th.setW' } }] } },
      datapoints: {},
    });
    adapter.foreign.set('th.enable', true);
    adapter.foreign.set('th.setW', 3200);
    const dp = new FakeDp(adapter);
    const module = new ThermalControlModule(adapter, dp);
    const result = await module.deactivate();
    assert.strictEqual(result.ok, true);
    assert.strictEqual(adapter.foreign.get('th.enable'), false);
    assert.strictEqual(adapter.foreign.get('th.setW'), 0);
  }

  // 3) Heizstab cold start: alle Relaisstufen physisch AUS.
  {
    const adapter = new FakeAdapter({
      enableHeatingRodControl: false,
      heatingRod: {
        devices: [{ slot: 1, enabled: true, stageCount: 2, maxPowerW: 4000, requireReadback: false, stages: [
          { writeId: 'hr.s1', powerW: 2000 },
          { writeId: 'hr.s2', powerW: 2000 },
        ] }],
      },
      vis: { flowSlots: { consumers: [{}] } },
      datapoints: {},
    });
    adapter.foreign.set('hr.s1', true);
    adapter.foreign.set('hr.s2', true);
    const dp = new FakeDp(adapter);
    const module = new HeatingRodControlModule(adapter, dp);
    const result = await module.deactivate();
    assert.strictEqual(result.ok, true);
    assert.strictEqual(adapter.foreign.get('hr.s1'), false);
    assert.strictEqual(adapter.foreign.get('hr.s2'), false);
  }

  // 4) Legacy-MultiUse cold start.
  {
    const adapter = new FakeAdapter({
      enableMultiUse: false,
      multiUse: { consumers: [{ key: 'load1', type: 'load', setWId: 'mu.setW', enableId: 'mu.enable', maxPowerW: 3000 }] },
    });
    adapter.foreign.set('mu.setW', 3000);
    adapter.foreign.set('mu.enable', true);
    const dp = new FakeDp(adapter);
    const module = new MultiUseModule(adapter, dp);
    const result = await module.deactivate();
    assert.strictEqual(result.ok, true);
    assert.strictEqual(adapter.foreign.get('mu.setW'), 0);
    assert.strictEqual(adapter.foreign.get('mu.enable'), false);
  }

  // 5) Schwellwertregel cold start: expliziter Off-Wert wird geschrieben.
  {
    const adapter = new FakeAdapter({
      enableThresholdControl: false,
      threshold: { rules: [{ idx: 1, enabled: true, inputId: 'thr.input', threshold: 10, outputId: 'thr.output', outputType: 'boolean', onValue: true, offValue: false, safetyRelevant: false }] },
    });
    adapter.foreign.set('thr.output', true);
    const dp = new FakeDp(adapter);
    const module = new ThresholdControlModule(adapter, dp);
    const result = await module.deactivate();
    assert.strictEqual(result.ok, true);
    assert.strictEqual(adapter.foreign.get('thr.output'), false);
  }

  // 6) Einzelregel deaktiviert oder Eingang stale: Ein zuvor aktiver Ausgang
  // darf nicht stehen bleiben, obwohl das Gesamtmodul weiterhin aktiv ist.
  for (const scenario of [
    { name: 'rule-disabled', enabled: false, inputPresent: true, expectedStatus: 'inactive-safe-stop' },
    { name: 'input-stale', enabled: true, inputPresent: false, expectedStatus: 'stale-safe-stop' },
  ]) {
    const adapter = new FakeAdapter({
      enableThresholdControl: true,
      threshold: { rules: [{
        idx: 1,
        enabled: scenario.enabled,
        inputId: `thr.${scenario.name}.input`,
        threshold: 10,
        outputId: `thr.${scenario.name}.output`,
        outputType: 'boolean',
        onValue: true,
        offValue: false,
        safetyRelevant: false,
      }] },
    });
    adapter.foreign.set(`thr.${scenario.name}.output`, true);
    if (scenario.inputPresent) adapter.foreign.set(`thr.${scenario.name}.input`, 20);
    const dp = new FakeDp(adapter);
    const module = new ThresholdControlModule(adapter, dp);
    await module.init();
    await module.tick();
    assert.strictEqual(adapter.foreign.get(`thr.${scenario.name}.output`), false, scenario.name);
    assert.strictEqual(adapter.states.get('threshold.rules.r1.status'), scenario.expectedStatus, scenario.name);
  }

  // 7) NexoLogic: jeder bekannte Intent bekommt einen bestaetigten 0-W-Grant.
  {
    const adapter = new FakeAdapter({ enableNexoLogic: false });
    const grants = [];
    adapter.logicEngine = {
      getBudgetIntents: () => [{ key: 'logic1', currentReservedW: 2500 }],
      applyBudgetGrant: async (key, grantW) => {
        grants.push({ key, grantW });
        return { accepted: true, confirmed: true, budgetReservedW: 0, status: 'released' };
      },
    };
    const module = new NexoLogicBudgetModule(adapter, new FakeDp(adapter));
    const result = await module.deactivate();
    assert.strictEqual(result.ok, true);
    assert.deepStrictEqual(grants, [{ key: 'logic1', grantW: 0 }]);
  }

  // 8) Speicher-Lifecycle delegiert an den vollstaendigen Storage-Writer und
  // akzeptiert die Deaktivierung nur bei bestaetigtem 0-W-Ergebnis.
  {
    const adapter = new FakeAdapter({ storage: {} });
    const dp = new FakeDp(adapter);
    dp.add('st.targetPowerW', 'storage.target', 4000);
    const module = new SpeicherRegelungModule(adapter, dp);
    module._getStorageControlAuthority = () => ({ selectedTopology: 'single' });
    module._applyTargetW = async (targetW) => {
      assert.strictEqual(targetW, 0);
      await dp.writeNumber('st.targetPowerW', 0);
      module._lastTargetW = 0;
      await adapter.setStateAsync('speicher.regelung.schreibOk', true);
      await adapter.setStateAsync('speicher.regelung.acceptedSollW', 0);
    };
    const result = await module.deactivate();
    assert.strictEqual(result.ok, true);
    assert.strictEqual(adapter.foreign.get('storage.target'), 0);
  }

  // 9) Modulmanager: Ein abgewiesener Safe-Stop darf den kritischen Fault nicht
  // loeschen. Er bleibt verriegelt und wird im Folgetick erneut versucht.
  {
    const adapter = new FakeAdapter({});
    const manager = new ModuleManager(adapter, new FakeDp(adapter));
    const row = {
      key: 'chargingManagement',
      lastEnabled: true,
      deactivated: false,
      instance: { deactivate: async () => { throw new Error('hardware-write-failed'); } },
    };
    const ok = await manager._deactivateModule(row, 7, true);
    assert.strictEqual(ok, false);
    assert.strictEqual(row.deactivated, false);
    assert(adapter._nwSafetyCriticalFaults && adapter._nwSafetyCriticalFaults.chargingManagement);
    assert(String(adapter._nwSafetyCriticalFaults.chargingManagement.error).includes('hardware-write-failed'));
  }

  // 10) RC79: Ein beim Cold-Start deaktiviertes Aktormodul muss seine States
  // zuerst in init() anlegen, bevor deactivate() Summary-/Diagnosewerte schreibt.
  // Das verhindert ioBroker-Warnungen fuer thermal.summary.* und threshold.rules.*.
  {
    const adapter = new FakeAdapter({});
    const manager = new ModuleManager(adapter, new FakeDp(adapter));
    const sequence = [];
    let objectsReady = false;
    const row = {
      key: 'thresholdControl',
      lastEnabled: false,
      deactivated: false,
      initialized: false,
      alwaysInit: false,
      instance: {
        init: async () => {
          sequence.push('init');
          objectsReady = true;
        },
        deactivate: async () => {
          sequence.push('deactivate');
          assert.strictEqual(objectsReady, true, 'deactivate darf erst nach Objekt-Initialisierung laufen');
          return { ok: true };
        },
      },
    };
    const ok = await manager._deactivateModule(row, 'cold-start', true);
    assert.strictEqual(ok, true);
    assert.deepStrictEqual(sequence, ['init', 'deactivate']);
    assert.strictEqual(row.deactivated, true);
    assert.strictEqual(row.initialized, false, 'nicht-always-init Modul wird nach Safe-Stop fuer spaetere Reaktivierung neu initialisiert');
  }

  console.log('[safety-module-deactivate] OK: Cold-Start/App-AUS stoppt EVCS, Speicher, Thermik, Heizstab, MultiUse, NexoLogic und Threshold physisch; States werden vor dem Safe-Stop initialisiert und Fehler bleiben kritisch verriegelt.');
})().catch((error) => {
  console.error('[safety-module-deactivate] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
