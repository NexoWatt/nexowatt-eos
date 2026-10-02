#!/usr/bin/env node
'use strict';

/**
 * RC78 / 0.8.203 – Netzanschlussgrenze ausschließlich für Bezug.
 *
 * Der NVP bleibt im gesamten Budget-/Safety-Pfad signiert:
 *   Bezug       = positiver NVP
 *   Einspeisung = negativer NVP
 *
 * Geprüft werden der reale Feldfall aus der EOS-Diagnose, Überbezug mit
 * aktivem Lastabwurf, nicht von EOS gesteuerte Speicherleistung, der
 * typisierte Core-Laufzeitvertrag sowie die letzte Safety-Freigabe direkt vor
 * dem Hardware-Write.
 */
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const typedCore = require(path.join(root, 'lib/ts-mirrors/ems/core-limits/core-runtime.js'));
const { CoreLimitsModule, makeBudgetRuntime } = require(path.join(root, 'ems/modules/core-limits.js'));
const {
  beginSafetyCycle,
  buildSafetyEnvelope,
  evaluateFlexibleLoadRequest,
  commitFlexibleLoadDecision,
} = require(path.join(root, 'ems/services/safety-envelope.js'));

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function freshRecord(value, now = Date.now()) {
  return { value, ack: true, ts: now, lc: now };
}

function makeCoreAdapter({
  nvpW,
  importLimitW,
  evcsActualW = 0,
  evcsReservedW = 0,
  thermalActualW = 0,
  thermalReservedW = 0,
  heatingRodActualW = 0,
  heatingRodReservedW = 0,
  storageChargeW = 0,
  storageWriterActive = true,
} = {}) {
  const now = Date.now();
  const stateCache = {};
  const put = (id, value) => { stateCache[id] = freshRecord(value, now); };
  put('chargingManagement.control.actualW', evcsActualW);
  put('chargingManagement.control.usedW', evcsReservedW);
  put('chargingManagement.control.pvEvcsPhysicalPvManagedW', 0);
  put('thermal.summary.appliedTotalW', thermalActualW);
  put('thermal.summary.budgetUsedW', thermalReservedW);
  put('heatingRod.summary.currentHeatingRodW', heatingRodActualW);
  put('heatingRod.summary.budgetUsedW', heatingRodReservedW);

  const adapter = {
    config: {
      enableChargingManagement: true,
      enableThermalControl: true,
      enableHeatingRodControl: true,
      chargingManagement: { staleTimeoutSec: 15, pvChargeReserveW: 500 },
      storage: {},
      storageFarm: {},
      installerConfig: {},
    },
    stateCache,
    _nvpFreshnessSnapshot: {
      ts: now,
      usable: true,
      fresh: true,
      connected: true,
      netW: nvpW,
      status: 'ok',
      source: 'rc78-signed-nvp',
      reason: 'fresh-test-value',
      measurementAgeMs: 0,
      heartbeatAgeMs: 0,
    },
    _nwGetStorageControlAuthority() {
      return {
        selectedTopology: storageWriterActive ? 'single' : 'none',
        writerActive: storageWriterActive,
        reason: storageWriterActive ? 'rc78-test-writer' : 'rc78-external-storage',
      };
    },
    _nwResolveBatteryFlowFromCache() {
      return { chargeW: storageChargeW, dischargeW: 0, signedW: -storageChargeW };
    },
    log: { debug() {}, info() {}, warn() {}, error() {} },
    async setStateAsync() {},
    updateValue() {},
  };
  const dp = {
    getNumberFresh() { return null; },
    getNumber() { return null; },
    getRaw() { return null; },
    getEntry() { return null; },
  };
  const module = new CoreLimitsModule(adapter, dp);
  const coreSnapshot = {
    grid: { gridImportLimitW_effective: importLimitW },
    para14a: { active: false },
    tariff: {},
  };
  return { adapter, module, coreSnapshot, now };
}

function makeSafetyAdapter({ nvpW, importLimitW }) {
  const now = Date.now();
  const adapter = {
    config: {
      installerConfig: {
        gridConnectionPower: importLimitW,
        para14a: false,
        gridPhaseCount: 3,
        safetyMeterTimeoutSec: 30,
      },
      peakShaving: { maxPhaseA: 0 },
      chargingManagement: { safetyEnvelopeMaxAgeSec: 5, nominalVoltageV: 230 },
    },
    _nvpFreshnessSnapshot: {
      ts: now,
      usable: true,
      fresh: true,
      connected: true,
      netW: nvpW,
      status: 'ok',
      source: 'rc78-signed-nvp',
      reason: 'fresh-test-value',
      measurementAgeMs: 0,
      heartbeatAgeMs: 0,
    },
    log: { debug() {}, info() {}, warn() {}, error() {} },
    async setStateAsync() {},
    async getStateAsync() { return null; },
  };
  beginSafetyCycle(adapter, 1, now);
  const dp = {
    getEntry() { return null; },
    getRaw(_key, fallback = null) { return fallback; },
    getMeasurementAgeMs() { return null; },
    getAgeMs() { return null; },
    getConnectionStatus() { return null; },
  };
  const envelope = buildSafetyEnvelope({
    adapter,
    dp,
    coreSnapshot: {
      grid: {
        gridSafetyMarginW: 0,
        gridImportLimitW_physical: importLimitW,
        gridImportLimitW_effective: importLimitW,
        gridMaxPhaseA_cfg: 0,
      },
    },
    budgetSnapshot: { gates: { pv: { effectiveW: 0 } } },
    now,
    generation: 1,
  });
  assert.strictEqual(envelope.valid, true, 'Safety-Envelope muss bei frischem NVP gültig sein');
  return { adapter, envelope, now };
}

// 1) Kanonische Formeln und alte harte Anschlussklemme.
{
  const coreSource = read('src-ts/runtime-executables/ems/modules/core-limits.ts');
  const chargingSource = read('src-ts/runtime-executables/ems/modules/charging-management.ts');
  const safetySource = read('src-ts/runtime-executables/ems/services/safety-envelope.ts');
  assert(coreSource.includes('gridLimitW - gridControlW'));
  assert(coreSource.includes('currentControlledLoadW + gridIncrementHeadroomW'));
  assert(!coreSource.includes('Math.min(gridLimitW, gridHeadroomRawW)'));
  assert(chargingSource.includes('hardLimitW: gridImportLimitEffW'));
  assert(chargingSource.includes('gridEnvelope.maxControlledLoadW'));
  assert(chargingSource.includes('currentControlledLoadW: gridEvcsActualForCapW'));
  assert(chargingSource.includes('gridEnvelope.progressiveIncrementW'));
  assert(!chargingSource.includes('gridCapEvcsW = clamp(gridImportLimitEffW - gridBaseLoadW, 0, gridImportLimitEffW)'));
  assert(safetySource.includes('maxImportW - signedNvpW'));
  assert(read('src-ts/runtime-executables/www/ems-apps.ts').includes('EVCS Cap (NVP / Importgrenze)'));
  assert(read('src-ts/runtime-executables/www/sw.ts').match(/const CACHE_NAME = 'nexowatt-cache-v\d+'/));
}

// 2) Feldfall: 30 kW Bezugsgrenze, 10,1 kW Einspeisung, 0 W Istlast.
//    Gesamtziel 40,1 kW; nach 11,0 kW EVCS und 9,3 kW Speicher bleiben 19,8 kW.
{
  const { adapter, module, coreSnapshot, now } = makeCoreAdapter({
    nvpW: -10100,
    importLimitW: 30000,
    evcsActualW: 0,
    evcsReservedW: 0,
    storageChargeW: 0,
    storageWriterActive: true,
  });
  const snapshot = module._makeBudgetSnapshot(now, coreSnapshot);
  assert.strictEqual(snapshot.raw.gridW, -10100);
  assert.strictEqual(snapshot.gates.grid.incrementHeadroomW, 40100);
  assert.strictEqual(snapshot.raw.currentControlledLoadW, 0);
  assert.strictEqual(snapshot.gates.total.effectiveW, 40100);
  assert.strictEqual(snapshot.tsCoreRuntime?.fallback, false, 'Typisierter Core darf nicht in den Legacy-Fallback fallen');

  const runtime = makeBudgetRuntime(adapter, snapshot);
  runtime.reserve({
    key: 'evcs', app: 'evcs', requestedW: 11000, reserveW: 11000,
    pvReserveW: 0, actualW: 0, pvOnly: false, priority: 100, mode: 'boost',
  });
  runtime.reserve({
    key: 'storage', app: 'storage', requestedW: 9300, reserveW: 9300,
    pvReserveW: 0, actualW: 0, pvOnly: false, priority: 150, mode: 'charge',
  });
  assert.strictEqual(runtime.remainingTotalW, 19800);
  assert.strictEqual(runtime.tsReservationLast?.fallback, false, 'Reservierungsvertrag muss typisiert produktiv bleiben');
}

// 3) Bereits laufende geregelte Last wird zum Gesamtziel addiert, nicht doppelt abgezogen.
{
  const snapshot = typedCore.buildCoreRuntimeBudgetSnapshot({
    grid: { netW: 12000, usable: true, importLimitW: 40000, status: 'ok', source: 'test' },
    pv: { measuredW: 0, measuredFresh: true, reserveW: 0 },
    storage: { chargeW: 0, dischargeW: 0, writerActive: false },
    consumers: {
      evcsUsedW: 3000,
      evcsActualW: 3000,
      evcsPvUsedW: 0,
      thermalUsedW: 0,
      thermalActualW: 0,
      heatingRodUsedW: 0,
      heatingRodActualW: 0,
    },
  });
  assert.strictEqual(snapshot.gates.grid.incrementHeadroomW, 28000);
  assert.strictEqual(snapshot.raw.currentControlledLoadW, 3000);
  assert.strictEqual(snapshot.gates.total.effectiveW, 31000);
}

// 4) Fremd gesteuerte Speicherladung darf nicht als EOS-Istlast zurückaddiert werden.
{
  const snapshot = typedCore.buildCoreRuntimeBudgetSnapshot({
    grid: { netW: 20000, usable: true, importLimitW: 30000, status: 'ok', source: 'test' },
    pv: { measuredW: 0, measuredFresh: true, reserveW: 0 },
    storage: { chargeW: 5000, dischargeW: 0, writerActive: false },
    consumers: { evcsUsedW: 0, evcsActualW: 0, evcsPvUsedW: 0 },
  });
  assert.strictEqual(snapshot.raw.storageControlledChargeW, 0);
  assert.strictEqual(snapshot.raw.currentControlledLoadW, 0);
  assert.strictEqual(snapshot.gates.total.effectiveW, 10000);
}

// 5) Überbezug muss bestehende flexible Last aktiv reduzieren.
{
  const snapshot = typedCore.buildCoreRuntimeBudgetSnapshot({
    grid: { netW: 32000, usable: true, importLimitW: 30000, status: 'ok', source: 'test' },
    pv: { measuredW: 0, measuredFresh: true, reserveW: 0 },
    storage: { chargeW: 0, dischargeW: 0, writerActive: false },
    consumers: { evcsUsedW: 10000, evcsActualW: 10000, evcsPvUsedW: 0 },
  });
  assert.strictEqual(snapshot.gates.grid.incrementHeadroomW, -2000);
  assert.strictEqual(snapshot.gates.total.effectiveW, 8000);
}

// 6) Finaler Hardware-Write: Export wird freigegeben, parallele Writer dürfen
//    den gemeinsamen Inkrement-Headroom aber nur einmal verbrauchen.
{
  const { adapter, envelope, now } = makeSafetyAdapter({ nvpW: -10100, importLimitW: 30000 });
  assert.strictEqual(envelope.grid.incrementHeadroomW, 40100);
  assert.strictEqual(envelope.grid.availableHeadroomW, 40100);

  const evcs = evaluateFlexibleLoadRequest(adapter, {
    key: 'evcs:lp1', app: 'evcs', requestedW: 11000, currentActualW: 0, now,
  });
  assert.strictEqual(evcs.allowedW, 11000);
  assert.strictEqual(evcs.gridIncrementHeadroomW, 40100);
  assert.strictEqual(commitFlexibleLoadDecision(adapter, evcs, true), true);

  const storage = evaluateFlexibleLoadRequest(adapter, {
    key: 'storage:charge', app: 'storage', requestedW: 50000, currentActualW: 0, now,
  });
  assert.strictEqual(storage.allowedW, 29100);
  assert.strictEqual(storage.binding, 'grid');
  assert.strictEqual(evcs.allowedW + storage.allowedW, 40100);
}

// 7) Finaler Hardware-Write bei Überbezug: 32 kW Bezug, 30 kW Limit,
//    10 kW Istlast => höchstens 8 kW neues Gesamtziel.
{
  const { adapter, now } = makeSafetyAdapter({ nvpW: 32000, importLimitW: 30000 });
  const decision = evaluateFlexibleLoadRequest(adapter, {
    key: 'evcs:active', app: 'evcs', requestedW: 10000, currentActualW: 10000, now,
  });
  assert.strictEqual(decision.gridIncrementHeadroomW, -2000);
  assert.strictEqual(decision.allowedW, 8000);
  assert.strictEqual(decision.binding, 'grid');
}

console.log('[rc78-import-only-grid-budget] OK: signed NVP, central budget, EVCS cap and final writer treat the connection limit as import-only.');
