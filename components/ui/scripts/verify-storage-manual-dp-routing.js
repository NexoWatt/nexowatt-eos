#!/usr/bin/env node
'use strict';

/**
 * Regression 0.8.123: Freie, manuelle AppCenter-DP-Zuordnungen sind die einzige
 * Hardwarequelle für Einzel-Speicher und Speicherfarm.
 *
 * Geprüft werden:
 * - AppCenter-Zeilen schlagen einen alten storageFarm.configJson-Spiegel.
 * - Legacy-Feldnamen aus der TS-Migration werden kanonisch aufgelöst.
 * - Optionale, fehlende/ungültige Freigabe-DPs warnen, blockieren aber nicht.
 * - Beliebige Objektpfade (auch mit ".ctrl.") bleiben als Istwerte zulässig.
 * - Eine reine Mess-Farm kapert den manuell gemappten Einzel-Speicher-Sollwert nicht.
 */

const assert = require('assert');
const path = require('path');
const Module = require('module');
const { EventEmitter } = require('events');

const internal = new Map();
const foreign = new Map();
const writes = [];

class AdapterStub extends EventEmitter {
  constructor(options = {}) {
    super();
    this.name = options.name || 'nexowatt-ui';
    this.namespace = `${this.name}.0`;
    this.config = {};
    this.stateCache = {};
    this.log = { debug() {}, info() {}, warn() {}, error() {}, silly() {} };
  }
  async setObjectNotExistsAsync() {}
  async extendObjectAsync() {}
  async getStateAsync(id) { return internal.get(String(id)) || null; }
  async setStateAsync(id, value, ack) {
    const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val') ? value.val : value;
    const rec = {
      val,
      ack: value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'ack') ? value.ack : !!ack,
      ts: Date.now(),
      lc: Date.now(),
    };
    internal.set(String(id), rec);
    this.stateCache[String(id)] = { value: val, ts: rec.ts, lc: rec.lc, ack: rec.ack };
  }
  async getForeignStateAsync(id) { return foreign.get(String(id)) || null; }
  async getForeignObjectAsync(id) {
    const sid = String(id || '');
    return { type: 'state', common: { unit: sid.includes('soc') ? '%' : 'W', write: sid.includes('target') || sid.includes('command') }, native: {} };
  }
  async setForeignStateAsync(id, value) {
    const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val') ? value.val : value;
    writes.push({ id: String(id), val: Number(val) });
    foreign.set(String(id), { val, ack: false, ts: Date.now(), lc: Date.now() });
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

function setInternal(adapter, id, val, ts = Date.now()) {
  internal.set(id, { val, ack: true, ts, lc: ts });
  adapter.stateCache[id] = { value: val, ack: true, ts, lc: ts };
}

function setForeign(id, val, ts = Date.now()) {
  foreign.set(id, { val, ack: true, ts, lc: ts });
}

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === '@iobroker/adapter-core') return { Adapter: AdapterStub };
  if (request === 'express') return expressStub;
  if (request === '@iobroker/type-detector') {
    const error = new Error('optional dependency intentionally absent in test');
    error.code = 'MODULE_NOT_FOUND';
    throw error;
  }
  return originalLoad.call(this, request, parent, isMain);
};

async function verifyFarmRouting() {
  const factory = require(path.join(__dirname, '..', 'main.js'));
  const adapter = factory({});
    adapter._nwLicenseOk = true;
    adapter._nwLicenseInfo = { ok: true, edition: 'eos' };
  adapter.scheduleDerivedFlowUpdate = () => {};
  adapter.updateValue = function updateValue(key, value, ts) {
    this.stateCache[String(key)] = { value, ts: Number(ts) || Date.now(), lc: Number(ts) || Date.now(), ack: true };
  };

  const appRows = [
    {
      enabled: true,
      name: 'Manuell A',
      socId: 'vendor.a.soc',
      // Ein legitimer Fremd-DP darf trotz freiem Namensbestandteil ".ctrl." gelesen werden.
      signedPowerId: 'vendor.a.ctrl.actualPower',
      setSignedPowerId: 'vendor.a.command.target',
      availableId: 'vendor.a.optional.available.missing',
      faultId: 'vendor.a.optional.fault.invalid',
      chargeAllowedId: 'vendor.a.optional.chargeAllowed.missing',
      dischargeAllowedId: 'vendor.a.optional.dischargeAllowed.invalid',
      maxChargeW: 2000,
      maxDischargeW: 2000,
    },
    {
      enabled: true,
      name: 'Manuell B',
      socId: 'vendor.b.soc',
      signedPowerId: 'vendor.b.actualPower',
      setSignedPowerId: 'vendor.b.command.target',
      maxChargeW: 4000,
      maxDischargeW: 4000,
    },
  ];
  const staleRows = [
    { enabled: true, name: 'Alt A', socId: 'stale.a.soc', signedPowerId: 'stale.a.actual', setSignedPowerId: 'stale.a.target' },
    { enabled: true, name: 'Alt B', socId: 'stale.b.soc', signedPowerId: 'stale.b.actual', setSignedPowerId: 'stale.b.target' },
  ];

  adapter.config = {
    emsApps: { apps: { storagefarm: { installed: true, enabled: true } } },
    storageFarm: { mode: 'pool', schedulerIntervalMs: 2000, storages: appRows },
  };
  setInternal(adapter, 'storageFarm.configJson', JSON.stringify(staleRows));
  setInternal(adapter, 'settings.deviceStaleTimeoutSec', 300);
  setForeign('vendor.a.soc', 50);
  setForeign('vendor.a.ctrl.actualPower', -700);
  setForeign('vendor.a.optional.fault.invalid', 'unbekannt');
  setForeign('vendor.a.optional.dischargeAllowed.invalid', 'unbekannt');
  setForeign('vendor.b.soc', 60);
  setForeign('vendor.b.actualPower', 200);

  const runtime = adapter._nwGetStorageFarmRuntimeInfo();
  assert.strictEqual(runtime.rowsSource, 'config', 'AppCenter muss einen alten Runtime-State schlagen');
  assert.strictEqual(runtime.active, true);
  assert.strictEqual(runtime.dispatchActive, true);
  assert.deepStrictEqual(runtime.rows.map((row) => row.setSignedPowerId), ['vendor.a.command.target', 'vendor.b.command.target']);

  await adapter.ensureStorageFarmStates();
  await adapter.syncStorageFarmConfigFromAdmin();
  const mirrored = JSON.parse(String((internal.get('storageFarm.configJson') || {}).val || '[]'));
  assert.deepStrictEqual(mirrored.map((row) => row.setSignedPowerId), ['vendor.a.command.target', 'vendor.b.command.target'], 'State-Spiegel muss auf AppCenter-Zuordnung repariert werden');

  await adapter.updateStorageFarmDerived('manual-dp-regression');
  const status = JSON.parse(String((internal.get('storageFarm.storagesStatusJson') || {}).val || '[]'));
  assert.strictEqual(status.length, 2);
  const first = status.find((row) => row.name === 'Manuell A');
  assert.ok(first, 'erste manuelle Farm-Zeile fehlt');
  assert.strictEqual(first.powerSourceKey, 'signed:vendor.a.ctrl.actualPower', 'freie .ctrl.-Istwert-ID wurde fälschlich verworfen');
  assert.strictEqual(first.powerFeedbackIgnoredReason, undefined);
  assert.strictEqual(first.chargeDispatchAvailable, true, 'fehlende optionale DPs dürfen Laden nicht blockieren');
  assert.strictEqual(first.dischargeDispatchAvailable, true, 'ungültige optionale DPs dürfen Entladen nicht blockieren');
  assert.ok(first.dispatchWarnings.includes('available_missing_ignored'));
  assert.ok(first.dispatchWarnings.includes('fault_invalid_ignored'));
  assert.ok(first.dispatchWarnings.includes('charge_allowed_missing_ignored'));
  assert.ok(first.dispatchWarnings.includes('discharge_allowed_invalid_ignored'));

  writes.length = 0;
  const dispatch = await adapter.applyStorageFarmTargetW(-3000, { source: 'pv', reason: 'test' });
  assert.strictEqual(dispatch.applied, true, `Farm muss auf die manuell zugeordneten Ziele schreiben: ${dispatch.reason}`);
  assert.deepStrictEqual(new Set(writes.map((row) => row.id)), new Set(['vendor.a.command.target', 'vendor.b.command.target']));
  assert.ok(!writes.some((row) => row.id.startsWith('stale.')), 'alter Runtime-State darf kein Schreibziel mehr liefern');

  // Schon eine reale AppCenter-Zeile verhindert die Rückkehr zu einer alten Zwei-Zeilen-Farm.
  adapter.config.storageFarm.storages = [appRows[0]];
  setInternal(adapter, 'storageFarm.configJson', JSON.stringify(staleRows));
  const partial = adapter._nwGetStorageFarmRuntimeInfo();
  assert.strictEqual(partial.rowsSource, 'config');
  assert.strictEqual(partial.configuredCount, 1);
  assert.strictEqual(partial.active, false, 'alte persistierte Zeilen dürfen eine bewusst unvollständige AppCenter-Farm nicht reaktivieren');

  // Legacy-/vor-TS-Felder werden zentral in die heutigen Feldnamen überführt.
  const legacyRows = [
    {
      enabled: true,
      name: 'Legacy A',
      // Ein veralteter Alias darf ein heutiges kanonisches Feld in einer erhaltenen
      // Migrationsstruktur nicht wieder überstimmen.
      targetPowerId: 'legacy.a.stale.target',
      targetPowerInvert: 'true',
      datapoints: {
        socDp: 'legacy.a.soc',
        powerId: 'legacy.a.actual',
        setSignedPowerId: 'legacy.a.target',
        invertSetSignedPowerSign: 'false',
      },
      maxChargeW: 2000,
      maxDischargeW: 2000,
    },
    {
      enabled: true,
      name: 'Legacy B',
      socObjectId: 'legacy.b.soc',
      batteryPowerObjectId: 'legacy.b.actual',
      targetPowerObjectId: 'legacy.b.target',
      targetPowerInvert: 'false',
      maxChargeW: 2000,
      maxDischargeW: 2000,
    },
  ];
  adapter.config.storageFarm.storages = legacyRows;
  setForeign('legacy.a.soc', 40);
  setForeign('legacy.a.actual', 0);
  setForeign('legacy.b.soc', 45);
  setForeign('legacy.b.actual', 0);
  const legacyRuntime = adapter._nwGetStorageFarmRuntimeInfo();
  assert.strictEqual(legacyRuntime.dispatchActive, true);
  assert.deepStrictEqual(legacyRuntime.rows.map((row) => row.setSignedPowerId), ['legacy.a.target', 'legacy.b.target']);
  assert.deepStrictEqual(legacyRuntime.rows.map((row) => row.invertSetSignedPowerSign), [false, false], 'String-Boolean false darf nicht zu true werden');
  await adapter.syncStorageFarmConfigFromAdmin();
  await adapter.updateStorageFarmDerived('legacy-mapping-regression');
  writes.length = 0;
  const legacyDispatch = await adapter.applyStorageFarmTargetW(2000, { source: 'eigenverbrauch' });
  assert.strictEqual(legacyDispatch.applied, true, `Legacy-Farm-Mapping muss schreiben: ${legacyDispatch.reason}`);
  assert.deepStrictEqual(new Set(writes.map((row) => row.id)), new Set(['legacy.a.target', 'legacy.b.target']));
}

async function verifySingleStorageFallback() {
  const { SpeicherRegelungModule } = require('../ems/modules/storage-control');
  const { SpeicherMappingModule } = require('../ems/modules/storage-mapping');

  const states = new Map();
  let farmCalls = 0;
  const adapter = {
    config: {
      enableStorageControl: true,
      storage: {
        controlMode: 'targetPower',
        // Direkte Altstruktur muss weiterhin exakt in st.* registriert werden.
        socDp: 'single.legacy.soc',
        targetPowerId: 'single.legacy.target',
        targetPowerInvert: 'false',
        batteryPowerInvert: 'false',
      },
      datapoints: { batteryPower: 'single.global.actual' },
      storageFarm: { storages: [
        { enabled: true, socId: 'farm.measure.a.soc' },
        { enabled: true, socId: 'farm.measure.b.soc' },
      ] },
    },
    stateCache: {},
    log: { debug() {}, info() {}, warn() {}, error() {} },
    _nwGetStorageFarmRuntimeInfo() {
      return { active: true, dispatchActive: false, rows: this.config.storageFarm.storages };
    },
    async applyStorageFarmTargetW() { farmCalls += 1; return { applied: false, reason: 'no_setpoint_dps' }; },
    async getStateAsync(id) { return states.get(String(id)) || null; },
    async setStateAsync(id, val) { states.set(String(id), { val, ack: true, ts: Date.now(), lc: Date.now() }); },
    async setObjectNotExistsAsync() {},
    async extendObjectAsync() {},
  };

  const mapping = new SpeicherMappingModule(adapter, null);
  const normalizedCfg = mapping._getCfg();
  assert.strictEqual(normalizedCfg.dp.socObjectId, 'single.legacy.soc');
  assert.strictEqual(normalizedCfg.dp.batteryPowerObjectId, 'single.global.actual');
  assert.strictEqual(normalizedCfg.dp.targetPowerObjectId, 'single.legacy.target');
  assert.strictEqual(normalizedCfg.dp.targetPowerInvert, false);
  assert.strictEqual(normalizedCfg.dp.batteryPowerInvert, false);
  assert.strictEqual(normalizedCfg.farmEnabled, false, 'reine Mess-Farm darf auch die Einzel-Mappingprüfung nicht übernehmen');

  const dpWrites = [];
  const dp = {
    getEntry(key) {
      if (key === 'st.targetPowerW') return { objectId: 'single.manual.target', scale: 1, offset: 0, invert: false };
      return null;
    },
    async writeNumber(key, value) { dpWrites.push({ key, value: Number(value) }); return true; },
    async writeBoolean() { return true; },
  };
  const module = new SpeicherRegelungModule(adapter, dp);
  await module._applyTargetW(-1234, 'manueller AppCenter-DP', 'pv');
  assert.strictEqual(farmCalls, 0, 'reine Mess-Farm darf den Einzel-Speicherpfad nicht aufrufen');
  assert.deepStrictEqual(dpWrites, [{ key: 'st.targetPowerW', value: -1234 }], 'Einzel-Speicher muss exakt auf sein manuell gemapptes Ziel schreiben');

  // Sobald ein echtes Farm-Ziel vorhanden ist, führt wieder ausschließlich die Farm.
  adapter._nwGetStorageFarmRuntimeInfo = () => ({ active: true, dispatchActive: true, rows: [{ enabled: true, setSignedPowerId: 'farm.manual.target' }] });
  adapter.applyStorageFarmTargetW = async (value) => { farmCalls += 1; return { applied: true, reason: 'ok', value }; };
  dpWrites.length = 0;
  await module._applyTargetW(1500, 'Farm-Sollwert', 'eigenverbrauch');
  assert.strictEqual(farmCalls, 1);
  assert.strictEqual(dpWrites.length, 0, 'beschreibbare Farm darf nicht parallel auf den Einzel-DP schreiben');
}

async function verifyFreeNamedSignedFeedback() {
  const { SpeicherRegelungModule } = require('../ems/modules/storage-control');
  const stateRows = new Map();
  const now = Date.now();
  const entries = {
    'grid.powerW': { val: 120, ts: now, objectId: 'meter.grid.filtered' },
    'grid.powerRawW': { val: 120, ts: now, objectId: 'meter.grid.raw' },
    'st.socPct': { val: 80, ts: now, objectId: 'vendor.free.soc' },
    // Der Name ist absichtlich "steuerungsartig". Ausschlaggebend ist nur, dass
    // dieses Objekt nicht identisch mit einem der realen Schreibziele ist.
    'st.batteryPowerW': { val: 3000, ts: now, objectId: 'vendor.free.ctrl.actualChargePowerW' },
    'st.targetPowerW': { val: 0, ts: now, objectId: 'vendor.free.command.targetSetpoint' },
  };
  const dp = {
    writes: [],
    getEntry(key) { return entries[key] || null; },
    getAgeMs(key) { const row = entries[key]; return row ? Math.max(0, Date.now() - row.ts) : null; },
    getNumber(key, fallback = null) { const n = Number(entries[key] && entries[key].val); return Number.isFinite(n) ? n : fallback; },
    getNumberFresh(key, staleMs, fallback = null) {
      const row = entries[key];
      if (!row || Date.now() - row.ts > Number(staleMs)) return fallback;
      const n = Number(row.val);
      return Number.isFinite(n) ? n : fallback;
    },
    getBoolean(key, fallback = false) { const row = entries[key]; return row ? !!row.val : fallback; },
    async writeNumber(key, value) { this.writes.push({ key, value: Number(value) }); return true; },
    async writeBoolean(key, value) { this.writes.push({ key, value: !!value }); return true; },
  };
  const adapter = {
    config: {
      enableStorageControl: true,
      enableStorageFarm: false,
      enableMultiUse: false,
      enablePeakShaving: false,
      enableGridConstraints: false,
      storage: {
        controlMode: 'targetPower',
        staleTimeoutSec: 15,
        maxDeltaWPerTick: 500,
        pvMaxDeltaWPerTick: 1500,
        stepW: 1,
        pvEnabled: true,
        pvExportThresholdW: 50,
        selfTargetGridImportW: 50,
        selfImportThresholdW: 50,
        selfMinSocPct: 20,
        selfMaxSocPct: 100,
      },
    },
    stateCache: {},
    log: { warn() {}, info() {}, debug() {}, error() {} },
    _nwGetStorageFarmRuntimeInfo() { return { active: false, dispatchActive: false, rows: [] }; },
    async setObjectNotExistsAsync() {},
    async getStateAsync(id) { return stateRows.get(String(id)) || null; },
    async setStateAsync(id, value) {
      const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val') ? value.val : value;
      stateRows.set(String(id), { val, ack: true, ts: Date.now(), lc: Date.now() });
    },
    _nwGetNumberFromCache(id) {
      const row = this.stateCache && this.stateCache[id];
      const n = Number(row && row.value);
      return Number.isFinite(n) ? n : null;
    },
  };

  const module = new SpeicherRegelungModule(adapter, dp);
  module._lastTargetW = 3000;
  module._lastSource = 'eigenverbrauch';
  await module.tick();

  assert.strictEqual((stateRows.get('speicher.regelung.batteryPowerTrusted') || {}).val, true, 'frei benannter Signed-Istwert wurde fälschlich blockiert');
  assert.strictEqual((stateRows.get('speicher.regelung.batteryPowerIgnoredReason') || {}).val, '', 'Objektname darf keinen Mapping-Fehler auslösen');
}

(async () => {
  try {
    await verifyFarmRouting();
    await verifySingleStorageFallback();
    await verifyFreeNamedSignedFeedback();
    console.log('[storage-manual-dp-routing] OK: AppCenter-DPs bleiben frei, autoritativ und werden im Einzel-/Farm-Pfad zuverlässig beschrieben.');
  } finally {
    Module._load = originalLoad;
  }
})().catch((error) => {
  Module._load = originalLoad;
  console.error('[storage-manual-dp-routing] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
