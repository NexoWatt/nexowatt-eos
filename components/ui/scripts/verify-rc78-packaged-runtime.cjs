#!/usr/bin/env node
'use strict';

/**
 * RC78 packaged-runtime verification.
 *
 * Runs only against files shipped in the npm package and therefore accepts a
 * freshly extracted package root through --root.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function argument(name, fallback = '') {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const root = path.resolve(argument('--root', path.resolve(__dirname, '..')));
const typedCore = require(path.join(root, 'lib/ts-mirrors/ems/core-limits/core-runtime.js'));
const { CoreLimitsModule, makeBudgetRuntime } = require(path.join(root, 'ems/modules/core-limits.js'));
const {
  beginSafetyCycle,
  buildSafetyEnvelope,
  evaluateFlexibleLoadRequest,
  commitFlexibleLoadDecision,
} = require(path.join(root, 'ems/services/safety-envelope.js'));

function freshRecord(value, now = Date.now()) {
  return { value, ack: true, ts: now, lc: now };
}

function makeCoreAdapter({ nvpW, importLimitW }) {
  const now = Date.now();
  const stateCache = {
    'chargingManagement.control.actualW': freshRecord(0, now),
    'chargingManagement.control.usedW': freshRecord(0, now),
    'chargingManagement.control.pvEvcsPhysicalPvManagedW': freshRecord(0, now),
    'thermal.summary.appliedTotalW': freshRecord(0, now),
    'thermal.summary.budgetUsedW': freshRecord(0, now),
    'heatingRod.summary.currentHeatingRodW': freshRecord(0, now),
    'heatingRod.summary.budgetUsedW': freshRecord(0, now),
  };
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
      source: 'rc78-packaged-runtime',
      reason: 'fresh-test-value',
      measurementAgeMs: 0,
      heartbeatAgeMs: 0,
    },
    _nwGetStorageControlAuthority() {
      return { selectedTopology: 'single', writerActive: true, reason: 'rc78-test-writer' };
    },
    _nwResolveBatteryFlowFromCache() {
      return { chargeW: 0, dischargeW: 0, signedW: 0 };
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
  return {
    adapter,
    module: new CoreLimitsModule(adapter, dp),
    coreSnapshot: { grid: { gridImportLimitW_effective: importLimitW }, para14a: { active: false }, tariff: {} },
    now,
  };
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
      source: 'rc78-packaged-runtime',
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
  assert.equal(envelope.valid, true);
  return { adapter, envelope, now };
}

// Field case from EOS: 30 kW import limit and 10.1 kW export.
{
  const { adapter, module, coreSnapshot, now } = makeCoreAdapter({ nvpW: -10100, importLimitW: 30000 });
  const snapshot = module._makeBudgetSnapshot(now, coreSnapshot);
  assert.equal(snapshot.raw.gridW, -10100);
  assert.equal(snapshot.gates.grid.incrementHeadroomW, 40100);
  assert.equal(snapshot.gates.total.effectiveW, 40100);
  const runtime = makeBudgetRuntime(adapter, snapshot);
  runtime.reserve({
    key: 'evcs', app: 'evcs', requestedW: 11000, reserveW: 11000,
    pvReserveW: 0, actualW: 0, pvOnly: false, priority: 100, mode: 'boost',
  });
  runtime.reserve({
    key: 'storage', app: 'storage', requestedW: 9300, reserveW: 9300,
    pvReserveW: 0, actualW: 0, pvOnly: false, priority: 150, mode: 'charge',
  });
  assert.equal(runtime.remainingTotalW, 19800);
}

// Active shedding remains effective when import exceeds the limit.
{
  const snapshot = typedCore.buildCoreRuntimeBudgetSnapshot({
    grid: { netW: 32000, usable: true, importLimitW: 30000, status: 'ok', source: 'test' },
    pv: { measuredW: 0, measuredFresh: true, reserveW: 0 },
    storage: { chargeW: 0, dischargeW: 0, writerActive: false },
    consumers: { evcsUsedW: 10000, evcsActualW: 10000, evcsPvUsedW: 0 },
  });
  assert.equal(snapshot.gates.grid.incrementHeadroomW, -2000);
  assert.equal(snapshot.gates.total.effectiveW, 8000);
}

// Final writer shares export headroom and prevents double allocation.
{
  const { adapter, envelope, now } = makeSafetyAdapter({ nvpW: -10100, importLimitW: 30000 });
  assert.equal(envelope.grid.incrementHeadroomW, 40100);
  const evcs = evaluateFlexibleLoadRequest(adapter, {
    key: 'evcs:lp1', app: 'evcs', requestedW: 11000, currentActualW: 0, now,
  });
  assert.equal(evcs.allowedW, 11000);
  assert.equal(commitFlexibleLoadDecision(adapter, evcs, true), true);
  const storage = evaluateFlexibleLoadRequest(adapter, {
    key: 'storage:charge', app: 'storage', requestedW: 50000, currentActualW: 0, now,
  });
  assert.equal(storage.allowedW, 29100);
  assert.equal(evcs.allowedW + storage.allowedW, 40100);
}

const emsApps = fs.readFileSync(path.join(root, 'www/ems-apps.js'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'www/sw.js'), 'utf8');
assert(emsApps.includes('EVCS Cap (NVP / Importgrenze)'));
assert(serviceWorker.includes("const CACHE_NAME = 'nexowatt-cache-v484'"));

console.log('[rc78-packaged-runtime] OK: field case 40.1/19.8 kW, over-import shedding, shared final-writer headroom and UI cache contract verified from packaged runtime.');
