#!/usr/bin/env node
'use strict';

/**
 * Regression 0.8.134 / Baustein 8:
 * - genau eine Speicher-Kommandofamilie ist aktiv,
 * - nicht ausgewaehlte Familien werden neutralisiert,
 * - Split-Richtungswechsel schreibt inaktive Richtung zuerst auf 0,
 * - nur bestaetigte Kommandodatenpunkte gelten als akzeptiert,
 * - dieselben Regeln gelten fuer Einzelspeicher und Speicherfarm.
 */

const assert = require('assert');
const path = require('path');
const Module = require('module');
const { EventEmitter } = require('events');
const { SpeicherRegelungModule } = require('../ems/modules/storage-control');

function entry(objectId, extra = {}) {
  return { objectId, scale: 1, offset: 0, invert: false, unitScale: 1, min: null, max: null, ...extra };
}

class SingleAdapter {
  constructor(storage = {}) {
    this.config = {
      enableStorageControl: true,
      enableStorageFarm: false,
      emsApps: { apps: { storagefarm: { installed: false, enabled: false } } },
      storageFarm: { storages: [] },
      storage: { controlMode: 'targetPower', reserveMinSocPct: 20, ...storage },
    };
    this.states = new Map();
    this.foreign = new Map();
    this.writes = [];
    this.swallowIds = new Set();
    this.log = { debug() {}, info() {}, warn() {}, error() {} };
  }
  async getStateAsync(id) { return this.states.get(String(id)) || null; }
  async setStateAsync(id, value) {
    const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val') ? value.val : value;
    this.states.set(String(id), { val, ack: true, ts: Date.now(), lc: Date.now() });
  }
  async setObjectNotExistsAsync() {}
  async getForeignStateAsync(id) { return this.foreign.get(String(id)) || null; }
  async setForeignStateAsync(id, value) {
    const objectId = String(id);
    const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val') ? value.val : value;
    this.writes.push({ id: objectId, val });
    if (!this.swallowIds.has(objectId)) this.foreign.set(objectId, { val, ack: false, ts: Date.now(), lc: Date.now() });
    return undefined;
  }
  value(id) { const state = this.states.get(String(id)); return state ? state.val : undefined; }
}

class SingleDp {
  constructor(adapter, entries) {
    this.adapter = adapter;
    this.entries = new Map(Object.entries(entries));
    this.lastWriteByObjectId = new Map();
  }
  getEntry(key) { return this.entries.get(key) || null; }
  getRaw(key) {
    const e = this.getEntry(key);
    const state = e ? this.adapter.foreign.get(e.objectId) : null;
    return state ? state.val : null;
  }
  async writeNumber(key, value, ack = false) {
    const e = this.getEntry(key);
    if (!e) return false;
    let physical = Number(value);
    if (!Number.isFinite(physical)) return false;
    if (typeof e.min === 'number' && Number.isFinite(e.min)) physical = Math.max(e.min, physical);
    if (typeof e.max === 'number' && Number.isFinite(e.max)) physical = Math.min(e.max, physical);
    let raw = (physical - Number(e.offset || 0)) / (Number(e.scale || 1) || 1);
    if (e.invert) raw = -raw;
    if (Number.isFinite(Number(e.unitScale)) && Number(e.unitScale) !== 0 && Number(e.unitScale) !== 1) raw /= Number(e.unitScale);
    const result = await this.adapter.setForeignStateAsync(e.objectId, raw, ack);
    if (result && result.__nexowattActuatorAuthorityBlocked === true) return false;
    this.lastWriteByObjectId.set(e.objectId, { val: physical, ts: Date.now() });
    return true;
  }
  async writeBoolean(key, value, ack = false) {
    const e = this.getEntry(key);
    if (!e) return false;
    const physical = !!value;
    const raw = e.invert ? !physical : physical;
    const result = await this.adapter.setForeignStateAsync(e.objectId, raw, ack);
    if (result && result.__nexowattActuatorAuthorityBlocked === true) return false;
    this.lastWriteByObjectId.set(e.objectId, { val: physical ? 1 : 0, ts: Date.now() });
    return true;
  }
}

async function verifySingleStorage() {
  const adapter = new SingleAdapter();
  const dp = new SingleDp(adapter, {
    'st.targetPowerW': entry('single.ctrl.signed'),
    'st.targetChargePowerW': entry('single.ctrl.charge'),
    'st.targetDischargePowerW': entry('single.ctrl.discharge'),
    'st.run': entry('single.ctrl.run'),
  });
  adapter.foreign.set('single.ctrl.signed', { val: -1869, ack: true, ts: Date.now(), lc: Date.now() });
  adapter.foreign.set('single.ctrl.charge', { val: 1869, ack: true, ts: Date.now(), lc: Date.now() });
  adapter.foreign.set('single.ctrl.discharge', { val: 0, ack: true, ts: Date.now(), lc: Date.now() });
  adapter.foreign.set('single.ctrl.run', { val: true, ack: true, ts: Date.now(), lc: Date.now() });

  const mod = new SpeicherRegelungModule(adapter, dp);
  await mod._applyTargetW(7480, 'customer discharge handover', 'eigenverbrauch');

  const commandWrites = adapter.writes.filter((row) => row.id.startsWith('single.ctrl.'));
  assert.deepStrictEqual(
    commandWrites.slice(0, 3).map((row) => [row.id, Number(row.val)]),
    [
      ['single.ctrl.signed', 0],
      ['single.ctrl.charge', 0],
      ['single.ctrl.discharge', 7480],
    ],
    `Alternative und Split-Richtung wurden nicht eindeutig uebergeben: ${JSON.stringify(commandWrites)}`,
  );
  assert.strictEqual(adapter.foreign.get('single.ctrl.signed').val, 0);
  assert.strictEqual(adapter.foreign.get('single.ctrl.charge').val, 0);
  assert.strictEqual(adapter.foreign.get('single.ctrl.discharge').val, 7480);
  assert.strictEqual(adapter.value('speicher.regelung.commandFamily'), 'split');
  assert.strictEqual(adapter.value('speicher.regelung.commandDpReadbackOk'), true);
  assert.strictEqual(adapter.value('speicher.regelung.commandDpReadbackStatus'), 'confirmed');
  assert.strictEqual(adapter.value('speicher.regelung.acceptedSollW'), 7480);
  assert.strictEqual(adapter.value('speicher.regelung.schreibOk'), true);

  adapter.writes.length = 0;
  await mod._applyTargetW(-2400, 'direct reverse', 'pv');
  const reverse = adapter.writes.filter((row) => row.id === 'single.ctrl.charge' || row.id === 'single.ctrl.discharge');
  assert.deepStrictEqual(
    reverse.slice(0, 2).map((row) => [row.id, Number(row.val)]),
    [['single.ctrl.discharge', 0], ['single.ctrl.charge', 2400]],
    'Entladen -> Laden muss ohne eigene 0-W-Runde direkt und in sicherer Split-Reihenfolge erfolgen',
  );
  assert.strictEqual(adapter.value('speicher.regelung.acceptedSollW'), -2400);

  // Der Adapter nimmt den Write-Aufruf an, haelt im State aber weiter 0 W.
  // Genau dieser Fall muss als nicht akzeptierter Hardwarebefehl gelten.
  adapter.writes.length = 0;
  adapter.swallowIds.add('single.ctrl.discharge');
  adapter.foreign.set('single.ctrl.discharge', { val: 0, ack: true, ts: Date.now(), lc: Date.now() });
  await mod._applyTargetW(3600, 'swallowed discharge command', 'eigenverbrauch');
  assert.strictEqual(adapter.value('speicher.regelung.schreibOk'), false);
  assert.strictEqual(adapter.value('speicher.regelung.acceptedSollW'), 0);
  assert.strictEqual(adapter.value('speicher.regelung.schreibStatus'), 'direction-handover-failed');
  assert.strictEqual(adapter.foreign.get('single.ctrl.run').val, false, 'Run muss bei Kommandoreadback-Fehler sicher geloest werden');
  const readback = JSON.parse(String(adapter.value('speicher.regelung.commandDpReadbackJson') || '{}'));
  assert.strictEqual(readback.failureStatus, 'direction-handover-failed');
  assert.ok(readback.readback.rows.some((row) => row.objectId === 'single.ctrl.discharge' && row.ok === false));

  // Signed-only inklusive invertierter Rohwertkonvention.
  const signedAdapter = new SingleAdapter();
  const signedDp = new SingleDp(signedAdapter, {
    'st.targetPowerW': entry('single.signed.inverted', { invert: true }),
    'st.run': entry('single.signed.run'),
  });
  const signedMod = new SpeicherRegelungModule(signedAdapter, signedDp);
  await signedMod._applyTargetW(1200, 'signed inverted discharge', 'eigenverbrauch');
  assert.strictEqual(signedAdapter.foreign.get('single.signed.inverted').val, -1200);
  assert.strictEqual(signedAdapter.value('speicher.regelung.commandFamily'), 'signed');
  assert.strictEqual(signedAdapter.value('speicher.regelung.commandDpReadbackOk'), true);
  assert.strictEqual(signedAdapter.value('speicher.regelung.acceptedSollW'), 1200);
}

class FarmAdapterStub extends EventEmitter {
  constructor(options = {}) {
    super();
    this.name = options.name || 'nexowatt-ui';
    this.namespace = `${this.name}.0`;
    this.config = {};
    this.stateCache = {};
    this.internal = new Map();
    this.foreign = new Map();
    this.writes = [];
    this.swallowIds = new Set();
    this.log = { debug() {}, info() {}, warn() {}, error() {}, silly() {} };
  }
  async setObjectNotExistsAsync() {}
  async getStateAsync(id) { return this.internal.get(String(id)) || null; }
  async setStateAsync(id, value, ack) {
    const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val') ? value.val : value;
    const rec = { val, ack: value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'ack') ? value.ack : !!ack, ts: Date.now(), lc: Date.now() };
    this.internal.set(String(id), rec);
    this.stateCache[String(id)] = { value: val, ts: rec.ts, lc: rec.lc, ack: rec.ack };
  }
  async getForeignStateAsync(id) { return this.foreign.get(String(id)) || null; }
  async getForeignObjectAsync(id) {
    const sid = String(id || '');
    return { type: 'state', common: { unit: sid.endsWith('.soc') ? '%' : 'W', write: sid.includes('.set') }, native: {} };
  }
  async setForeignStateAsync(id, value) {
    const objectId = String(id);
    const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val') ? value.val : value;
    this.writes.push({ id: objectId, val: Number(val) });
    if (!this.swallowIds.has(objectId)) this.foreign.set(objectId, { val, ack: false, ts: Date.now(), lc: Date.now() });
    return undefined;
  }
  setTimeout(fn, ms) { return setTimeout(fn, ms); }
  setInterval(fn, ms) { return setInterval(fn, ms); }
  clearTimeout(ref) { clearTimeout(ref); }
  clearInterval(ref) { clearInterval(ref); }
}

function expressStub() {
  return { use() {}, get() {}, post() {}, put() {}, delete() {}, listen() { return null; } };
}
expressStub.json = () => (_req, _res, next) => { if (typeof next === 'function') next(); };
expressStub.static = () => (_req, _res, next) => { if (typeof next === 'function') next(); };

async function verifyStorageFarm() {
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === '@iobroker/adapter-core') return { Adapter: FarmAdapterStub };
    if (request === 'express') return expressStub;
    if (request === '@iobroker/type-detector') {
      const error = new Error('optional dependency intentionally absent');
      error.code = 'MODULE_NOT_FOUND';
      throw error;
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const factory = require(path.join(__dirname, '..', 'main.js'));
    const adapter = factory({});
    adapter._nwLicenseOk = true;
    adapter._nwLicenseInfo = { ok: true, edition: 'eos' };
    adapter.scheduleDerivedFlowUpdate = () => {};
    adapter.updateValue = function updateValue(key, value, ts) {
      this.stateCache[String(key)] = { value, ts: Number(ts) || Date.now(), lc: Number(ts) || Date.now(), ack: true };
    };

    const now = Date.now();
    const rows = [
      {
        enabled: true,
        name: 'Farm Split A',
        socId: 'farm.split.soc',
        signedPowerId: 'farm.split.actual',
        setSignedPowerId: 'farm.split.setSigned',
        setChargePowerId: 'farm.split.setCharge',
        setDischargePowerId: 'farm.split.setDischarge',
        capacityKWh: 20,
        maxChargeW: 10000,
        maxDischargeW: 10000,
      },
      {
        enabled: true,
        name: 'Farm Monitor B',
        socId: 'farm.monitor.soc',
        signedPowerId: 'farm.monitor.actual',
        capacityKWh: 10,
      },
    ];
    adapter.config = {
      emsApps: { apps: { storagefarm: { installed: true, enabled: true } } },
      storageFarm: { mode: 'pool', schedulerIntervalMs: 1000, storages: rows },
    };
    adapter.internal.set('storageFarm.configJson', { val: JSON.stringify(rows), ack: true, ts: now, lc: now });
    adapter.stateCache['storageFarm.configJson'] = { value: JSON.stringify(rows), ts: now, lc: now, ack: true };
    adapter.stateCache['settings.deviceStaleTimeoutSec'] = { value: 300, ts: now, lc: now, ack: true };
    adapter.foreign.set('farm.split.soc', { val: 70, ack: true, ts: now, lc: now });
    adapter.foreign.set('farm.split.actual', { val: 0, ack: true, ts: now, lc: now });
    adapter.foreign.set('farm.monitor.soc', { val: 50, ack: true, ts: now, lc: now });
    adapter.foreign.set('farm.monitor.actual', { val: 0, ack: true, ts: now, lc: now });
    adapter.foreign.set('farm.split.setSigned', { val: -1500, ack: true, ts: now, lc: now });
    adapter.foreign.set('farm.split.setCharge', { val: 1500, ack: true, ts: now, lc: now });
    adapter.foreign.set('farm.split.setDischarge', { val: 0, ack: true, ts: now, lc: now });

    await adapter.ensureStorageFarmStates();
    await adapter.updateStorageFarmDerived('command-family-test');
    adapter.writes.length = 0;
    let result = await adapter.applyStorageFarmTargetW(3000, { source: 'eigenverbrauch' });
    assert.strictEqual(result.writeOk, true, JSON.stringify(result));
    assert.strictEqual(result.acceptedDeliveredW, 3000);
    assert.strictEqual(result.commandDpReadbackSupported, true);
    assert.strictEqual(result.commandDpReadbackOk, true);
    assert.strictEqual(result.results[0].commandFamily, 'split');
    assert.deepStrictEqual(
      adapter.writes.slice(0, 3).map((row) => [row.id, row.val]),
      [
        ['farm.split.setSigned', 0],
        ['farm.split.setCharge', 0],
        ['farm.split.setDischarge', 3000],
      ],
      `Farm-Kommandofamilie oder Write-Reihenfolge falsch: ${JSON.stringify(adapter.writes)}`,
    );

    adapter._sfLastSetpoints.clear();
    adapter._sfLastSetpointsTs.clear();
    adapter.writes.length = 0;
    adapter.swallowIds.add('farm.split.setDischarge');
    adapter.foreign.set('farm.split.setDischarge', { val: 0, ack: true, ts: Date.now(), lc: Date.now() });
    result = await adapter.applyStorageFarmTargetW(3500, { source: 'eigenverbrauch' });
    assert.strictEqual(result.applied, false);
    assert.strictEqual(result.writeOk, false);
    assert.strictEqual(result.acceptedDeliveredW, 0);
    assert.strictEqual(result.status, 'farm-write-failed');
    assert.strictEqual(result.commandDpReadbackSupported, true);
    assert.strictEqual(result.commandDpReadbackOk, false);
    assert.strictEqual(result.commandDpReadbackStatus, 'command-dp-mismatch');
    assert.ok(result.commandDpReadbackRows.some((row) => row.objectId === 'farm.split.setDischarge' && row.ok === false));
  } finally {
    Module._load = originalLoad;
  }
}

(async () => {
  await verifySingleStorage();
  await verifyStorageFarm();
  console.log('[storage-command-family-readback] OK: Exklusive Sollwertfamilien, direkte Split-Uebergabe und Kommandodatenpunkt-Readback sind fuer Einzel- und Farmspeicher abgesichert.');
})().catch((error) => {
  console.error('[storage-command-family-readback] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
