#!/usr/bin/env node
'use strict';

/**
 * RC49 / 0.8.173 – gezielte Regressionen fuer den 0.8.172-Rollback.
 *
 * Prüft:
 * - Einzelne Wallbox ohne Station wird nicht als 0-W-Gerät interpretiert.
 * - Boost- und Min+PV-Ziele passieren die finale Write-Firewall.
 * - Ein wirklich ausgeschöpftes gemeinsames Stationsbudget bleibt hart 0 W.
 * - Normaler §14a-0-W-Eingang wird auf Pmin,14a geklemmt.
 * - Lokale PV-Leistung darf zusätzlich zum §14a-Netzanteil genutzt werden.
 */

const assert = require('node:assert/strict');
const {
  beginSafetyCycle,
  markSafetyModuleResult,
  buildSafetyEnvelope,
} = require('../ems/services/safety-envelope');
const { ChargingManagementModule } = require('../ems/modules/charging-management');
const { buildPara14aConstraintSnapshot } = require('../lib/ts-mirrors/ems/para14a/para14a-constraint');

function makeAdapter({ paraRuntime = null, generation = 1 } = {}) {
  const now = Date.now();
  const adapter = {
    config: {
      installerConfig: {
        gridConnectionPower: 30000,
        para14a: !!paraRuntime,
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
      netW: 0,
      status: 'ok',
      source: 'rc49-test-meter',
      reason: 'fresh',
      measurementAgeMs: 0,
      heartbeatAgeMs: 0,
    },
    _para14a: paraRuntime,
    log: { debug() {}, info() {}, warn() {}, error() {} },
    async setStateAsync() {},
    async getStateAsync() { return null; },
    _nwRequestImmediateEmsTick() { return true; },
  };
  beginSafetyCycle(adapter, generation, now);
  if (paraRuntime) markSafetyModuleResult(adapter, 'para14a', true, '', generation, now);
  return adapter;
}

function makeDp(keys) {
  const entries = new Map(keys.map((key) => [key, { key, objectId: key }]));
  const writes = [];
  return {
    entries,
    writes,
    getEntry(key) { return entries.get(key) || null; },
    getRaw(_key, fallback = null) { return fallback; },
    getMeasurementAgeMs() { return 0; },
    getAgeMs() { return 0; },
    getConnectionStatus() { return true; },
    async writeNumber(key, value, ack) { writes.push({ key, value: Number(value), ack }); return true; },
    async writeBoolean(key, value, ack) { writes.push({ key, value: !!value, ack }); return true; },
  };
}

function release(adapter, dp, budgetSnapshot = null) {
  adapter._emsBudget = budgetSnapshot;
  return buildSafetyEnvelope({
    adapter,
    dp,
    coreSnapshot: {
      grid: {
        gridSafetyMarginW: 0,
        gridImportLimitW_physical: 30000,
        gridImportLimitW_effective: 30000,
        gridMaxPhaseA_cfg: 0,
      },
    },
    budgetSnapshot,
    now: Date.now(),
    generation: adapter._emsSafetyCycle.generation,
  });
}

function wallbox(safe, setWKey, stationKey = '', stationMaxPowerW = undefined) {
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
    maxPW: 11040,
    minPW: 4140,
    phases: 3,
    meterStale: false,
    actualPowerW: 0,
    stationKey,
    stationMaxPowerW,
    consumer: { type: 'evcs', key: safe, controlBasis: 'powerW', setWKey },
  };
}

function entry(safe, setpointKey, targetPowerW, stationKey = '', stationMaxPowerW = undefined) {
  return {
    safe,
    targetPowerW,
    targetCurrentA: 0,
    basis: 'powerW',
    setpointKey,
    writeRequired: true,
    reason: 'rc49-regression',
    stationKey,
    stationMaxPowerW,
  };
}

(async () => {
  // 1) Keine Station: Boost muss den positiven Sollwert schreiben dürfen.
  {
    const adapter = makeAdapter();
    const dp = makeDp(['wb.boost.setW']);
    release(adapter, dp);
    const module = new ChargingManagementModule(adapter, dp);
    const wb = wallbox('boost', 'wb.boost.setW');
    const result = await module._executeChargingSetpointEntries(
      [entry('boost', 'wb.boost.setW', 11040)],
      [wb],
      [],
      'rc49-boost-no-station',
      '',
    );
    assert.equal(dp.writes.at(-1)?.value, 11040);
    assert.equal(result.safetyBlockedCount, 0);
    assert.equal(result.safetyClampedCount, 0);
  }

  // 2) Keine Station: Min+PV-Mindestleistung muss ebenfalls durchgehen.
  {
    const adapter = makeAdapter();
    const dp = makeDp(['wb.minpv.setW']);
    release(adapter, dp);
    const module = new ChargingManagementModule(adapter, dp);
    const wb = wallbox('minpv', 'wb.minpv.setW');
    const result = await module._executeChargingSetpointEntries(
      [entry('minpv', 'wb.minpv.setW', 4140)],
      [wb],
      [],
      'rc49-minpv-no-station',
      '',
    );
    assert.equal(dp.writes.at(-1)?.value, 4140);
    assert.equal(result.safetyBlockedCount, 0);
  }

  // 3) Echte gemeinsame Station: erster Ladepunkt belegt das Budget, der zweite
  // wird weiterhin korrekt auf 0 W geklemmt.
  {
    const adapter = makeAdapter();
    const dp = makeDp(['wb.s1.setW', 'wb.s2.setW']);
    release(adapter, dp);
    const module = new ChargingManagementModule(adapter, dp);
    const rows = [
      wallbox('s1', 'wb.s1.setW', 'station-a', 6000),
      wallbox('s2', 'wb.s2.setW', 'station-a', 6000),
    ];
    const result = await module._executeChargingSetpointEntries(
      [
        entry('s1', 'wb.s1.setW', 6000, 'station-a', 6000),
        entry('s2', 'wb.s2.setW', 6000, 'station-a', 6000),
      ],
      rows,
      [],
      'rc49-shared-station',
      '',
    );
    const s1 = dp.writes.find((write) => write.key === 'wb.s1.setW');
    const s2 = dp.writes.find((write) => write.key === 'wb.s2.setW');
    assert.equal(s1?.value, 6000);
    assert.equal(s2?.value, 0);
    assert.ok(result.safetyClampedCount >= 1 || result.safetyBlockedCount >= 1);
  }

  // 4) Drei SteuVE, externer 0-W-Wert: Pmin,14a bleibt 10,5 kW.
  {
    const snapshot = buildPara14aConstraintSnapshot({
      active: true,
      mode: 'ems',
      minPerDeviceW: 4200,
      externalTotalSetpointW: 0,
      evcs: [
        { safe: 'lp1', maxPowerW: 11000 },
        { safe: 'lp2', maxPowerW: 11000 },
        { safe: 'lp3', maxPowerW: 11000 },
      ],
    });
    assert.equal(snapshot.pMinW, 10500);
    assert.equal(snapshot.totalCapW, 10500);
    assert.equal(snapshot.forceZero, false);
  }

  // 5) §14a 4,2 kW Netzanteil plus 5 kW PV erlaubt 9,2 kW Gesamtleistung.
  {
    const paraRuntime = {
      enabled: true,
      active: true,
      mode: 'ems',
      pMinW: 4200,
      totalCapW: 4200,
      appCapsW: { evcs: 4200, storage: 4200, thermal: 4200, heatingRod: 4200, custom: 4200 },
      evcsCapsBySafe: { pv: 4200 },
      signalFresh: true,
      signalStale: false,
      signalStatus: 'fresh',
      fallbackSafe: false,
      forceZero: false,
      emergencyStop: false,
    };
    const adapter = makeAdapter({ paraRuntime });
    const dp = makeDp(['wb.pv.setW']);
    const envelope = release(adapter, dp, { gates: { pv: { effectiveW: 5000 } } });
    assert.equal(envelope.valid, true);
    assert.equal(envelope.para14a.totalAllowanceW, 9200);
    const module = new ChargingManagementModule(adapter, dp);
    const wb = wallbox('pv', 'wb.pv.setW');
    const result = await module._executeChargingSetpointEntries(
      [entry('pv', 'wb.pv.setW', 11000)],
      [wb],
      [],
      'rc49-para14a-plus-pv',
      '',
    );
    assert.equal(dp.writes.at(-1)?.value, 9200);
    assert.ok(result.safetyClampedCount >= 1);
  }

  console.log('[rc49-para14a-evcs-start-stability] OK: Einzel-Wallbox, Stationscap, Pmin,14a und lokaler PV-Zuschlag arbeiten korrekt.');
})().catch((error) => {
  console.error('[rc49-para14a-evcs-start-stability] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
