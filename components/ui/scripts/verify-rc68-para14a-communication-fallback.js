#!/usr/bin/env node
'use strict';

/**
 * RC68 / 0.8.193 – §14a-Kommunikationsausfall ohne unnötigen 0-W-Stopp.
 *
 * Prüft:
 * - fehlendes/veraltetes §14a-Signal aktiviert den lokalen Pmin-Fallback,
 * - Direktansteuerung lässt je EVCS höchstens 4,2 kW zu,
 * - EMS-Ansteuerung behält das GZF-Gesamtbudget, lässt einen aktiven LP aber
 *   mit bis zu 4,2 kW starten,
 * - ein frisches inaktives Signal hebt den Fallback sauber auf,
 * - Netzanschluss- und Safety-Grenzen bleiben stärker als der Fallback,
 * - lokale PV-Leistung darf zusätzlich zum netzwirksamen §14a-Anteil wirken.
 */

const assert = require('node:assert/strict');
const {
  resolvePara14aSignal,
  buildPara14aConstraintSnapshot,
} = require('../lib/ts-mirrors/ems/para14a/para14a-constraint');
const { Para14aModule } = require('../ems/modules/para14a');
const {
  beginSafetyCycle,
  markSafetyModuleResult,
  buildSafetyEnvelope,
} = require('../ems/services/safety-envelope');
const { ChargingManagementModule } = require('../ems/modules/charging-management');

class FakeDp {
  constructor() {
    this.entries = new Map();
    this.values = new Map();
    this.writes = [];
  }
  async upsert(entry) { this.entries.set(entry.key, { ...entry }); }
  getEntry(key) { return this.entries.get(key) || null; }
  setValue(key, value, ageMs = 0) { this.values.set(key, { value, ts: Date.now() - Math.max(0, ageMs) }); }
  getRaw(key, fallback = null) { return this.values.has(key) ? this.values.get(key).value : fallback; }
  getAgeMs(key) { return this.values.has(key) ? Math.max(0, Date.now() - this.values.get(key).ts) : null; }
  getMeasurementAgeMs(key) { return this.getAgeMs(key) ?? 0; }
  getConnectionStatus() { return true; }
  getNumberFresh(key, maxAgeMs, fallback = null) {
    const value = this.getRaw(key, fallback);
    const ageMs = this.getAgeMs(key);
    const number = Number(value);
    return ageMs !== null && ageMs <= maxAgeMs && Number.isFinite(number) ? number : fallback;
  }
  async writeNumber(key, value, ack) {
    this.writes.push({ key, value: Number(value), ack });
    return true;
  }
  async writeBoolean(key, value, ack) {
    this.writes.push({ key, value: !!value, ack });
    return true;
  }
}

function makeAdapter({
  mode = 'direct',
  activeId = '',
  gridConnectionPower = 30000,
  nvpW = 0,
  evcsCount = 1,
  directIngress = null,
} = {}) {
  const now = Date.now();
  const states = new Map();
  const evcsList = Array.from({ length: evcsCount }, (_unused, index) => ({
    key: `lp${index + 1}`,
    name: `LP ${index + 1}`,
    setPowerWId: `wb.lp${index + 1}.setW`,
    maxPowerW: 11000,
  }));
  const adapter = {
    config: {
      installerConfig: {
        gridConnectionPower,
        gridSafetyMarginW: 0,
        gridPhaseCount: 3,
        para14a: true,
        para14aMode: mode,
        para14aMinPerDeviceW: 4200,
        para14aSignalMaxAgeSec: 30,
        para14aStalePolicy: 'local-pmin',
        para14aActiveId: activeId,
      },
      peakShaving: { maxPhaseA: 0 },
      chargingManagement: { safetyEnvelopeMaxAgeSec: 5, nominalVoltageV: 230 },
    },
    evcsList,
    stateCache: {},
    _nvpFreshnessSnapshot: {
      ts: now,
      usable: true,
      fresh: true,
      connected: true,
      netW: nvpW,
      status: 'ok',
      source: 'rc68-test-meter',
      reason: 'fresh',
      measurementAgeMs: 0,
      heartbeatAgeMs: 0,
    },
    log: { debug() {}, info() {}, warn() {}, error() {} },
    async setObjectNotExistsAsync() {},
    async setStateAsync(id, value) {
      const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val')
        ? value.val
        : value;
      states.set(id, { val, ts: Date.now(), ack: true });
    },
    async getStateAsync(id) { return states.get(id) || null; },
    updateValue(id, value, ts = Date.now()) { this.stateCache[id] = { value, ts }; },
    _nwRequestImmediateEmsTick() { return true; },
    _states: states,
  };
  if (directIngress) adapter._nwGetPara14aEebusIngress = () => ({ ...directIngress });
  return adapter;
}

function wallbox(safe, setWKey) {
  return {
    safe,
    ch: `chargingManagement.wallboxes.${safe}`,
    online: true,
    controlAvailable: true,
    controlBasis: 'powerW',
    setWKey,
    enableKey: '',
    name: safe,
    cfgEnabled: true,
    userStationEnabled: true,
    userEnabled: true,
    operationalBlocked: false,
    enabled: true,
    maxPW: 11000,
    minPW: 4140,
    phases: 3,
    meterStale: false,
    actualPowerW: 0,
    stationKey: '',
    consumer: { type: 'evcs', key: safe, controlBasis: 'powerW', setWKey },
  };
}

function entry(safe, setpointKey, targetPowerW) {
  return {
    safe,
    targetPowerW,
    targetCurrentA: 0,
    basis: 'powerW',
    setpointKey,
    writeRequired: true,
    reason: 'rc68-para14a-fallback',
    stationKey: '',
  };
}

async function prepareRuntime({
  mode = 'direct',
  activeId = '',
  signalValue,
  signalAgeMs = 0,
  gridConnectionPower = 30000,
  nvpW = 0,
  evcsCount = 1,
  directIngress = null,
  pvW = 0,
} = {}) {
  const adapter = makeAdapter({ mode, activeId, gridConnectionPower, nvpW, evcsCount, directIngress });
  const dp = new FakeDp();
  for (let index = 1; index <= evcsCount; index += 1) {
    dp.entries.set(`wb.lp${index}.setW`, { key: `wb.lp${index}.setW`, objectId: `wb.lp${index}.setW` });
  }
  const para = new Para14aModule(adapter, dp);
  await para.init();
  if (activeId && signalValue !== undefined) dp.setValue('p14a.active', signalValue, signalAgeMs);
  const generation = 68;
  const now = Date.now();
  beginSafetyCycle(adapter, generation, now);
  await para.tick();
  markSafetyModuleResult(adapter, 'para14a', true, '', generation, Date.now());
  const budgetSnapshot = { gates: { pv: { effectiveW: Math.max(0, pvW) } } };
  adapter._emsBudget = budgetSnapshot;
  const envelope = buildSafetyEnvelope({
    adapter,
    dp,
    coreSnapshot: {
      grid: {
        gridSafetyMarginW: 0,
        gridImportLimitW_physical: gridConnectionPower,
        gridImportLimitW_effective: gridConnectionPower,
        gridMaxPhaseA_cfg: 0,
      },
    },
    budgetSnapshot,
    now: Date.now(),
    generation,
  });
  return { adapter, dp, para, envelope };
}

(async () => {
  // Legacy "release" must migrate to the fail-closed local Pmin policy.
  {
    const signal = resolvePara14aSignal({
      enabled: true,
      mapped: true,
      rawValue: false,
      ageMs: 60000,
      maxAgeMs: 30000,
      stalePolicy: 'release',
    });
    assert.equal(signal.stalePolicy, 'local-pmin');
    assert.equal(signal.active, true);
    assert.equal(signal.reason, 'stale-local-pmin');
  }

  // EMS mode: two EVCS keep the 7.56-kW GZF aggregate, but either active
  // wallbox may receive the technical 4.2-kW start cap.
  {
    const snapshot = buildPara14aConstraintSnapshot({
      active: true,
      communicationFallback: true,
      mode: 'ems',
      minPerDeviceW: 4200,
      evcs: [
        { safe: 'lp1', maxPowerW: 11000 },
        { safe: 'lp2', maxPowerW: 11000 },
      ],
    });
    assert.equal(snapshot.communicationFallbackActive, true);
    assert.equal(snapshot.pMinW, 7560);
    assert.equal(snapshot.totalCapW, 7560);
    assert.equal(snapshot.evcsTotalCapW, 7560);
    assert.equal(snapshot.evcsCapsBySafe.lp1, 4200);
    assert.equal(snapshot.evcsCapsBySafe.lp2, 4200);
  }

  // No activation mapping: enabled §14a falls back locally instead of blocking
  // the final writer or releasing unrestricted power.
  {
    const { adapter, dp, envelope } = await prepareRuntime({ mode: 'direct', evcsCount: 1 });
    assert.equal(adapter._para14a.communicationFallbackActive, true);
    assert.equal(adapter._para14a.signalFresh, false);
    assert.equal(adapter._para14a.fallbackSafe, true);
    assert.equal(adapter._para14a.totalCapW, 4200);
    assert.equal(adapter._para14a.evcsCapsBySafe.lp1, 4200);
    assert.equal(envelope.valid, true);
    assert.equal(envelope.para14a.safetyReady, true);
    assert.equal(envelope.para14a.communicationFallbackActive, true);
    assert.equal(envelope.para14a.fallbackEvcsCapW, 4200);

    const charging = new ChargingManagementModule(adapter, dp);
    const result = await charging._executeChargingSetpointEntries(
      [entry('lp1', 'wb.lp1.setW', 11000)],
      [wallbox('lp1', 'wb.lp1.setW')],
      [],
      'rc68-missing-signal',
      '',
    );
    assert.equal(dp.writes.at(-1)?.value, 4200);
    assert.equal(result.safetyBlockedCount, 0);
    assert.ok(result.safetyClampedCount >= 1);
  }

  // Stale inactive mapping must also enter the same local Pmin fallback.
  {
    const { adapter, envelope } = await prepareRuntime({
      mode: 'direct',
      activeId: 'grid.para14a.active',
      signalValue: false,
      signalAgeMs: 60000,
      evcsCount: 1,
    });
    assert.equal(adapter._para14a.communicationFallbackActive, true);
    assert.equal(adapter._para14a.totalCapW, 4200);
    assert.equal(envelope.valid, true);
  }

  // Fresh inactive mapping is a real release: no fallback and no §14a cap.
  {
    const { adapter, envelope } = await prepareRuntime({
      mode: 'direct',
      activeId: 'grid.para14a.active',
      signalValue: false,
      signalAgeMs: 0,
      evcsCount: 1,
    });
    assert.equal(adapter._para14a.communicationFallbackActive, false);
    assert.equal(adapter._para14a.active, false);
    assert.equal(adapter._para14a.totalCapW, null);
    assert.equal(envelope.valid, true);
    assert.equal(envelope.para14a.active, false);
  }

  // A gateway-supervised local failsafe must use local Pmin even when the
  // ingress object itself is still reachable.
  {
    const { adapter, envelope } = await prepareRuntime({
      mode: 'ems',
      evcsCount: 1,
      directIngress: {
        available: true,
        active: true,
        fresh: true,
        stale: false,
        localFailsafeActive: true,
        limitW: 12000,
        status: 'gateway-heartbeat-missing',
        sourceInstance: 'eebus.0',
        sourceDeviceId: 'cls-1',
        receivedAtMs: Date.now(),
      },
    });
    assert.equal(adapter._para14a.communicationFallbackActive, true);
    assert.equal(adapter._para14a.totalCapW, 4200);
    assert.match(adapter._para14a.communicationFallbackReason, /gateway-heartbeat-missing/);
    assert.equal(envelope.valid, true);
  }

  // The local grid connection remains stronger. If only 2.5 kW headroom is
  // available, the AC wallbox cannot run below its technical minimum and the
  // single writer must issue 0 W rather than violate the site limit.
  {
    const { adapter, dp } = await prepareRuntime({
      mode: 'direct',
      gridConnectionPower: 30000,
      nvpW: 27500,
      evcsCount: 1,
    });
    const charging = new ChargingManagementModule(adapter, dp);
    const result = await charging._executeChargingSetpointEntries(
      [entry('lp1', 'wb.lp1.setW', 11000)],
      [wallbox('lp1', 'wb.lp1.setW')],
      [],
      'rc68-grid-headroom',
      '',
    );
    assert.equal(dp.writes.at(-1)?.value, 0);
    assert.ok(result.safetyBlockedCount >= 1 || result.safetyClampedCount >= 1);
  }

  // §14a limits only net-effective grid power. Local PV remains additive while
  // all site and device limits continue to apply.
  {
    const { adapter, dp, envelope } = await prepareRuntime({
      mode: 'direct',
      evcsCount: 1,
      pvW: 5000,
    });
    assert.equal(envelope.para14a.totalAllowanceW, 9200);
    const charging = new ChargingManagementModule(adapter, dp);
    const result = await charging._executeChargingSetpointEntries(
      [entry('lp1', 'wb.lp1.setW', 11000)],
      [wallbox('lp1', 'wb.lp1.setW')],
      [],
      'rc68-local-pv',
      '',
    );
    assert.equal(dp.writes.at(-1)?.value, 9200);
    assert.ok(result.safetyClampedCount >= 1);
  }

  console.log('[rc68-para14a-communication-fallback] OK: Pmin-Fallback, GZF-Verteilung, Grid-Safety und lokaler PV-Zuschlag arbeiten zusammen.');
})().catch((error) => {
  console.error('[rc68-para14a-communication-fallback] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
