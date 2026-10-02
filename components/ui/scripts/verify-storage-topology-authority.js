#!/usr/bin/env node
'use strict';

/**
 * Regression 0.8.126: Eine zentrale Speicher-Steuerhoheit verbindet Policies,
 * Messquelle und Hardwarewriter deterministisch mit genau einer Topologie.
 *
 * Geprueft werden:
 * - AppCenter ist autoritativ; Legacy-Flags duerfen deaktivierte Apps nicht reaktivieren.
 * - MultiUse und Tarif aktivieren keinen Speicherwriter.
 * - Eine beschreibbare Farm gewinnt gegen den Einzelpfad.
 * - Eine reine Mess-Farm verdraengt den Einzelpfad nicht.
 * - Ein Farmfehler faellt niemals heimlich auf den Einzel-DP zurueck.
 * - Energiefluss/Istleistung stammen aus derselben ausgewaehlten Topologie.
 */

const assert = require('assert');
const path = require('path');
const Module = require('module');
const { EventEmitter } = require('events');

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
  async getStateAsync(id) {
    const rec = this.stateCache[String(id)];
    return rec ? { val: rec.value, ack: true, ts: rec.ts, lc: rec.lc || rec.ts } : null;
  }
  async setStateAsync(id, value, ack) {
    const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val') ? value.val : value;
    const ts = Date.now();
    this.stateCache[String(id)] = { value: val, ack: value && typeof value === 'object' ? value.ack : !!ack, ts, lc: ts };
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

function farmRows({ writable = true } = {}) {
  return [
    {
      enabled: true,
      name: 'Farm A',
      socId: 'farm.a.soc',
      signedPowerId: 'farm.a.actual',
      ...(writable ? { setSignedPowerId: 'farm.a.target' } : {}),
    },
    {
      enabled: true,
      name: 'Farm B',
      socId: 'farm.b.soc',
      signedPowerId: 'farm.b.actual',
      ...(writable ? { setSignedPowerId: 'farm.b.target' } : {}),
    },
  ];
}

function appState(installed, enabled) {
  return { installed: !!installed, enabled: !!enabled };
}

function setCache(adapter, key, value, ageMs = 0) {
  const ts = Date.now() - Math.max(0, Number(ageMs) || 0);
  adapter.stateCache[String(key)] = { value, ack: true, ts, lc: ts };
}

class FakeDp {
  constructor(entries = {}) {
    this.entries = entries;
    this.writes = [];
  }
  getEntry(key) { return this.entries[key] || null; }
  getNumber() { return null; }
  getNumberFresh() { return null; }
  getBoolean(_key, fallback = false) { return fallback; }
  getAgeMs() { return null; }
  async writeNumber(key, value) { this.writes.push({ key, value: Number(value) }); return true; }
  async writeBoolean(key, value) { this.writes.push({ key, value: !!value }); return true; }
}

function makeModuleAdapter(authority, farmResult = { applied: true, reason: 'ok' }) {
  const states = new Map();
  const farmCalls = [];
  return {
    config: {
      enableStorageControl: authority.selectedTopology === 'single',
      storage: { controlMode: 'targetPower' },
    },
    stateCache: {},
    log: { debug() {}, info() {}, warn() {}, error() {} },
    _nwGetStorageControlAuthority() { return { ...authority }; },
    async applyStorageFarmTargetW(value, meta) {
      farmCalls.push({ value: Number(value), meta });
      return typeof farmResult === 'function' ? farmResult(value, meta) : { ...farmResult };
    },
    async setObjectNotExistsAsync() {},
    async setStateAsync(id, value) {
      const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val') ? value.val : value;
      states.set(String(id), { val, ack: true, ts: Date.now(), lc: Date.now() });
    },
    async getStateAsync(id) { return states.get(String(id)) || null; },
    _states: states,
    _farmCalls: farmCalls,
  };
}

async function verifyAuthorityAndMeasurement() {
  const factory = require(path.join(__dirname, '..', 'main.js'));
  const stageA = require('../ems/modules/stage-a-diagnostics');
  const adapter = factory({});
  adapter.scheduleDerivedFlowUpdate = () => {};
  adapter.updateValue = function updateValue(key, value, ts) {
    this.stateCache[String(key)] = { value, ack: true, ts: Number(ts) || Date.now(), lc: Number(ts) || Date.now() };
  };

  // MultiUse bleibt eine Policy und darf die Einzel-App nicht aktivieren.
  const multiUseOnly = {
    enableStorageControl: false,
    enableStorageFarm: false,
    enableMultiUse: true,
    installerConfig: { storageMultiUse: { enabled: true } },
    emsApps: { apps: {
      storage: appState(false, false),
      storagefarm: appState(false, false),
      multiuse: appState(true, true),
    } },
    storage: { targetPowerObjectId: 'single.manual.target' },
    storageFarm: { storages: [] },
  };
  adapter.nwApplyStorageMultiUsePolicy(multiUseOnly);
  assert.strictEqual(multiUseOnly.enableStorageControl, false, 'MultiUse darf enableStorageControl nicht mutieren');
  adapter.config = multiUseOnly;
  let authority = adapter._nwGetStorageControlAuthority();
  assert.strictEqual(authority.selectedTopology, 'none');
  assert.strictEqual(authority.writerActive, false);
  assert.strictEqual(authority.multiUsePolicyActive, true);
  let ownerRows = stageA.collectActuatorMappings(adapter.config, [], authority);
  let singleOwner = ownerRows.find((row) => row.objectId === 'single.manual.target');
  assert(singleOwner && singleOwner.active === false, 'MultiUse-Policy darf den Einzel-Speicherowner nicht aktivieren');

  // Ein vorhandener, deaktivierter AppCenter-Datensatz schlägt ein altes Legacy-true.
  adapter.config = {
    enableStorageControl: true,
    emsApps: { apps: { storage: appState(true, false), storagefarm: appState(false, false) } },
    storageFarm: { storages: [] },
  };
  authority = adapter._nwGetStorageControlAuthority();
  assert.strictEqual(authority.selectedTopology, 'none', 'AppCenter-disabled darf nicht durch Legacy true reaktiviert werden');
  assert.strictEqual(authority.singleLegacyActive, true);
  assert.strictEqual(authority.singleAppCenterActive, false);

  // Getrennte Lade-/Entlade-Istwerte duerfen in LIVE und History niemals
  // gleichzeitig als zwei physische Fluesse erscheinen. Bei einem kurzzeitig
  // ueberlappenden Adapter-Readback wird deshalb nur der Nettofluss ausgegeben;
  // die Bruttowerte bleiben fuer die Diagnose erhalten.
  adapter.config = {
    enableStorageControl: true,
    enableStorageFarm: false,
    emsApps: { apps: { storage: appState(true, true), storagefarm: appState(false, false) } },
    datapoints: {
      storageChargePower: 'storage.charge.actual',
      storageDischargePower: 'storage.discharge.actual',
    },
    storage: { coupling: 'ac', targetPowerObjectId: 'single.manual.target' },
    storageFarm: { storages: [] },
  };
  setCache(adapter, 'storageChargePower', 2000);
  setCache(adapter, 'storageDischargePower', 3000);
  let splitFlow = adapter._nwResolveBatteryFlowFromCache({ now: Date.now() });
  assert.strictEqual(splitFlow.signedW, 1000, 'Split-Istwerte muessen als Nettoentladung aufgeloest werden');
  assert.strictEqual(splitFlow.chargeW, 0, 'History darf bei Nettoentladung keine gleichzeitige Ladung zeigen');
  assert.strictEqual(splitFlow.dischargeW, 1000, 'History muss nur die Nettoentladung zeigen');
  assert.strictEqual(splitFlow.grossChargeW, 2000, 'Bruttoladung muss fuer Diagnose erhalten bleiben');
  assert.strictEqual(splitFlow.grossDischargeW, 3000, 'Bruttoentladung muss fuer Diagnose erhalten bleiben');
  assert.strictEqual(splitFlow.splitConflictNormalized, true, 'Diagnose muss die physikalische Normalisierung markieren');

  // Mess-/Status-Farm ist aktiv, aber nicht beschreibbar: Einzelpfad bleibt Writer.
  adapter.config = {
    enableStorageControl: true,
    enableStorageFarm: true,
    emsApps: { apps: { storage: appState(true, true), storagefarm: appState(true, true) } },
    datapoints: { batteryPower: 'single.actual' },
    settings: {},
    storage: { coupling: 'ac', targetPowerObjectId: 'single.manual.target' },
    storageFarm: { storages: farmRows({ writable: false }) },
  };
  setCache(adapter, 'batteryPower', -35);
  setCache(adapter, 'storageFarm.totalPowerW', 900);
  setCache(adapter, 'storageFarm.powerSourcesTotal', 2);
  authority = adapter._nwGetStorageControlAuthority();
  assert.strictEqual(authority.selectedTopology, 'single');
  assert.strictEqual(authority.reason, 'single-active-farm-read-only');
  let flow = adapter._nwResolveBatteryFlowFromCache({ now: Date.now() });
  assert.strictEqual(flow.signedW, -35, 'Read-only-Farm darf den Einzel-Istwert nicht überdecken');
  assert(!String(flow.src).startsWith('storageFarm'), `Einzelquelle erwartet, erhalten: ${flow.src}`);
  ownerRows = stageA.collectActuatorMappings(adapter.config, [], authority);
  singleOwner = ownerRows.find((row) => row.objectId === 'single.manual.target');
  assert(singleOwner && singleOwner.active === true, 'Read-only-Farm muss den Einzel-Speicherowner aktiv lassen');

  // Sobald beschreibbare Farm-DPs vorhanden sind, gewinnt die Farm vollständig.
  adapter.config.storageFarm.storages = farmRows({ writable: true });
  authority = adapter._nwGetStorageControlAuthority();
  assert.strictEqual(authority.selectedTopology, 'farm');
  assert.strictEqual(authority.singleSuppressedByFarm, true);
  ownerRows = stageA.collectActuatorMappings(adapter.config, [], authority);
  singleOwner = ownerRows.find((row) => row.objectId === 'single.manual.target');
  const farmOwner = ownerRows.find((row) => row.objectId === 'farm.a.target');
  assert(singleOwner && singleOwner.active === false, 'Ausgewählte Farm muss den Einzel-Speicherowner deaktivieren');
  assert(farmOwner && farmOwner.active === true, 'Ausgewählte Farm muss ihren manuellen AppCenter-DP als aktiven Owner führen');
  flow = adapter._nwResolveBatteryFlowFromCache({ now: Date.now() });
  assert.strictEqual(flow.signedW, 900, 'Ausgewählte Farm muss ihre eigene Istleistung liefern');
  assert.strictEqual(flow.src, 'storageFarmNet');

  // Fehlt das Farm-Aggregat, ist ein alter Einzelwert ausdrücklich kein Fallback.
  delete adapter.stateCache['storageFarm.totalPowerW'];
  setCache(adapter, 'storageFarm.totalChargePowerW', 0);
  setCache(adapter, 'storageFarm.totalDischargePowerW', 0);
  setCache(adapter, 'storageFarm.powerSourcesTotal', 0);
  flow = adapter._nwResolveBatteryFlowFromCache({ now: Date.now() });
  assert.strictEqual(flow.signedW, 0);
  assert(String(flow.src).startsWith('storageFarm'), `explizite Farm-Degradation erwartet, erhalten: ${flow.src}`);
}

function verifyCoreBudgetTopologyFallback() {
  const { CoreLimitsModule } = require('../ems/modules/core-limits');
  const now = Date.now();
  const makeCore = (topology) => {
    const stateCache = {};
    const put = (key, value) => { stateCache[key] = { value, ack: true, ts: now, lc: now }; };
    put('storageFarm.totalChargePowerW', 3200);
    put('storageFarm.totalDischargePowerW', 0);
    put('storageChargePower', 700);
    put('storageDischargePower', 0);
    put('batteryPower', -900);
    put('derived.core.pv.totalW', 0);
    return new CoreLimitsModule({
      config: {
        enableStorageControl: topology === 'single',
        enableChargingManagement: false,
        enableThermalControl: false,
        enableHeatingRodControl: false,
        datapoints: { batteryPower: 'single.actual' },
        settings: {},
        chargingManagement: { staleTimeoutSec: 15 },
        storage: { pvEnabled: true, selfMaxSocPct: 100 },
      },
      stateCache,
      _nvpFreshnessSnapshot: {
        ts: now,
        usable: true,
        current: true,
        status: 'ok',
        source: 'signed',
        reason: 'measurement-fresh',
        netW: 0,
        measurementAgeMs: 0,
      },
      _nwGetStorageControlAuthority() {
        return {
          selectedTopology: topology,
          writerActive: topology !== 'none',
          reason: `${topology}-test`,
        };
      },
      log: { debug() {}, info() {}, warn() {}, error() {} },
    }, null);
  };

  const coreSnapshot = { grid: { gridImportLimitW_effective: 40000 }, evcsHighLevel: { capW: null } };
  const farm = makeCore('farm')._makeBudgetSnapshot(now, coreSnapshot);
  assert.strictEqual(farm.raw.storageChargeW, 3200, 'Core-Budget muss bei Farm ausschließlich Farmladung verwenden');
  assert.strictEqual(farm.raw.storageDischargeW, 0);
  assert.strictEqual(farm.gates.storage.topology, 'farm');

  const single = makeCore('single')._makeBudgetSnapshot(now, coreSnapshot);
  assert.strictEqual(single.raw.storageChargeW, 900, 'Core-Budget muss beim Einzelpfad den Einzel-Signed-DP verwenden');
  assert.strictEqual(single.raw.storageDischargeW, 0);
  assert.strictEqual(single.gates.storage.topology, 'single');

  const none = makeCore('none')._makeBudgetSnapshot(now, coreSnapshot);
  assert.strictEqual(none.raw.storageChargeW, 0, 'Ohne Writer darf kein alter Farm-/Einzelfluss ins Budget gelangen');
  assert.strictEqual(none.raw.storageDischargeW, 0);
  assert.strictEqual(none.gates.storage.topology, 'none');
}

async function verifyExclusiveWriters() {
  const { SpeicherRegelungModule } = require('../ems/modules/storage-control');
  const entries = {
    'st.targetPowerW': { objectId: 'single.manual.target', scale: 1, offset: 0, invert: false },
  };

  // Einzelpfad schreibt exakt den manuellen DP.
  let authority = {
    selectedTopology: 'single', writerActive: true, reason: 'single-active',
    singleAppActive: true, farmDispatchActive: false, farmAggregationActive: false,
  };
  let adapter = makeModuleAdapter(authority);
  let dp = new FakeDp(entries);
  let module = new SpeicherRegelungModule(adapter, dp);
  await module._applyTargetW(1200, 'single-test', 'eigenverbrauch');
  assert.deepStrictEqual(dp.writes, [{ key: 'st.targetPowerW', value: 1200 }]);
  assert.strictEqual(adapter._farmCalls.length, 0);

  // Farm gewinnt und der Einzel-DP bleibt unangetastet.
  authority = {
    selectedTopology: 'farm', writerActive: true, reason: 'writable-farm-precedes-single',
    singleAppActive: true, singleSuppressedByFarm: true, farmDispatchActive: true, farmAggregationActive: true,
    farm: { active: true, dispatchActive: true, rows: farmRows({ writable: true }) },
  };
  adapter = makeModuleAdapter(authority);
  dp = new FakeDp(entries);
  module = new SpeicherRegelungModule(adapter, dp);
  await module._applyTargetW(-1800, 'farm-test', 'pv');
  assert.strictEqual(adapter._farmCalls.length, 1);
  assert.strictEqual(adapter._farmCalls[0].value, -1800);
  assert.deepStrictEqual(dp.writes, [], 'Farm darf nicht parallel auf den Einzel-DP schreiben');

  // Farmfehler bleibt sichtbar; kein heimlicher Einzel-Fallback.
  adapter = makeModuleAdapter(authority, { applied: false, reason: 'blocked-by-safety-gate' });
  dp = new FakeDp(entries);
  module = new SpeicherRegelungModule(adapter, dp);
  await module._applyTargetW(900, 'farm-blocked', 'tarif');
  assert.strictEqual(adapter._farmCalls.length, 1);
  assert.deepStrictEqual(dp.writes, [], 'Farmfehler darf keinen Einzel-Fallback auslösen');
  assert.strictEqual((adapter._states.get('speicher.regelung.schreibOk') || {}).val, false);
  assert.strictEqual((adapter._states.get('speicher.regelung.schreibStatus') || {}).val, 'blocked-by-safety-gate');

  // Ohne Topologie wird selbst bei vorhandener DP-Zuordnung nicht geschrieben.
  authority = {
    selectedTopology: 'none', writerActive: false, reason: 'no-active-storage-output',
    singleAppActive: false, farmDispatchActive: false, farmAggregationActive: false,
  };
  adapter = makeModuleAdapter(authority);
  dp = new FakeDp(entries);
  module = new SpeicherRegelungModule(adapter, dp);
  await module._applyTargetW(700, 'policy-without-writer', 'tarif');
  assert.deepStrictEqual(dp.writes, []);
  assert.strictEqual((adapter._states.get('speicher.regelung.schreibStatus') || {}).val, 'kein-aktiver-speicher-ausgang');
}

async function verifyPoliciesDoNotCreateWriters() {
  const { SpeicherRegelungModule } = require('../ems/modules/storage-control');
  const authority = {
    selectedTopology: 'none', writerActive: false, reason: 'no-active-storage-output',
    singleAppActive: false, farmDispatchActive: false, farmAggregationActive: false,
    multiUsePolicyActive: true,
    farm: { active: false, dispatchActive: false, rows: [] },
  };
  const adapter = makeModuleAdapter(authority);
  adapter.config.enableMultiUse = true;
  adapter.config.installerConfig = { storageMultiUse: { enabled: true } };
  adapter._tarifVis = {
    aktiv: true,
    state: 'cheap',
    speicherLeistungW: -3000,
    speicherLeistungAbsW: 3000,
    speicherSollW: -3000,
  };
  const dp = new FakeDp({
    'st.targetPowerW': { objectId: 'single.manual.target' },
  });
  const module = new SpeicherRegelungModule(adapter, dp);
  await module.tick();
  assert.deepStrictEqual(dp.writes, [], 'Tarif/MultiUse ohne aktive Topologie dürfen keinen Hardware-DP schreiben');
  assert.strictEqual((adapter._states.get('speicher.regelung.aktiv') || {}).val, false);
  assert.strictEqual((adapter._states.get('speicher.regelung.topologie') || {}).val, 'none');
  assert.strictEqual((adapter._states.get('speicher.regelung.aktivAutoMultiUse') || {}).val, true);
  assert.strictEqual((adapter._states.get('speicher.regelung.aktivAutoTarif') || {}).val, true);
}

(async () => {
  try {
    await verifyAuthorityAndMeasurement();
    verifyCoreBudgetTopologyFallback();
    await verifyExclusiveWriters();
    await verifyPoliciesDoNotCreateWriters();
    console.log('[storage-topology-authority] OK: AppCenter, Policies, Messquellen und Hardwarewriter nutzen genau eine exklusive Speicher-Topologie.');
  } finally {
    Module._load = originalLoad;
  }
})().catch((error) => {
  Module._load = originalLoad;
  console.error('[storage-topology-authority] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
