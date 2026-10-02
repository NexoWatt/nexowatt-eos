#!/usr/bin/env node
'use strict';

/**
 * RC60 regression contract:
 * One Auto orchestrator must work across Alfen/IEC-61851 via
 * nexowatt-devices, NexoWatt OCPP21 and generic manually mapped chargers.
 *
 * The test intentionally exercises a complete charging-management tick. It
 * verifies that a connected/startable vehicle receives only the technical
 * minimum until demand/power is confirmed, while hard no-demand/fault states
 * remain at 0. It also covers PV, Min+PV, time-target, tariff override and the
 * bounded timeout/cooldown contract.
 */

const assert = require('assert');
const path = require('path');

const root = path.resolve(__dirname, '..');
const { ChargingManagementModule } = require(path.join(root, 'ems/modules/charging-management'));
const { computeChargingMinimumServicePlan } = require(path.join(root, 'ems/charging-budget-helpers'));

function makeHarness(opts = {}) {
  const states = new Map();
  const stateMeta = new Map();
  const writes = [];
  const now = Date.now();
  const status = opts.status ?? 'C1';
  const chargingState = opts.chargingState ?? '';
  const txActive = opts.txActive ?? false;
  const actualPowerW = opts.actualPowerW ?? 0;
  const dataFresh = opts.dataFresh ?? true;
  const online = opts.online ?? true;
  const pvW = opts.pvW ?? 0;
  const gridAllowed = opts.gridAllowed ?? true;
  const goalEnabled = opts.goalEnabled ?? false;
  const goalTargetSocPct = opts.goalTargetSocPct ?? 80;
  const vehicleSoc = opts.vehicleSoc ?? 50;
  const deadlineHours = opts.deadlineHours ?? 10;
  const goalFinishTs = opts.goalFinishTs ?? (now + deadlineHours * 3600_000);
  const tariffState = opts.tariffState ?? (gridAllowed ? 'neutral' : 'teuer');
  const tariffActive = opts.tariffActive ?? true;
  const tariffStale = opts.tariffStale ?? false;
  const netFeeEnabled = opts.netFeeEnabled ?? false;
  const netFeeMode = opts.netFeeMode ?? 'Standard';
  const telemetryProfile = opts.telemetryProfile ?? 'generic';
  const explicitConnectedConfigured = Object.prototype.hasOwnProperty.call(opts, 'explicitConnected');
  const explicitDemandConfigured = Object.prototype.hasOwnProperty.call(opts, 'explicitDemand');
  const controlBasis = opts.controlBasis === 'powerW' ? 'powerW' : 'currentA';

  const wallbox = {
    key: 'lp1',
    name: opts.name || 'RC60 Test Wallbox',
    enabled: true,
    evcsIndex: 1,
    telemetryProfile,
    actualPowerWId: 'test.evcs.powerW',
    statusId: 'test.evcs.status',
    chargingStateId: chargingState ? 'test.evcs.chargingState' : '',
    onlineId: 'test.evcs.online',
    dataFreshId: 'test.evcs.dataFresh',
    heartbeatId: 'test.evcs.lastSeenMs',
    vehicleConnectedId: explicitConnectedConfigured ? 'test.evcs.vehicleConnected' : '',
    chargeDemandId: explicitDemandConfigured ? 'test.evcs.chargeDemand' : '',
    vehicleSocId: 'test.evcs.soc',
    setCurrentAId: controlBasis === 'currentA' ? 'test.evcs.setCurrentA' : '',
    setPowerWId: controlBasis === 'powerW' ? 'test.evcs.setPowerW' : '',
    enableId: 'test.evcs.enable',
    maxPowerW: opts.maxPowerW ?? 11000,
    minA: 6,
    maxA: 16,
    phases: 3,
    voltageV: 230,
    userModeDefault: 'auto',
    controlBasis,
  };

  const cmCfg = {
    mode: 'mixed',
    totalBudgetMode: 'static',
    staticMaxChargingPowerW: 11000,
    voltageV: 230,
    defaultPhases: 3,
    minCurrentA: 6,
    maxCurrentA: 16,
    wallboxMeterStaleTimeoutSec: 300,
    wallboxStatusStaleTimeoutSec: 86400,
    tariffPermissionHoldSec: 0,
    pvStartStableSec: opts.pvStartStableSec ?? 0,
    pvStartDelaySec: opts.pvStartDelaySec ?? 0,
    pvStartResponseTimeoutSec: opts.pvStartResponseTimeoutSec ?? 15,
    ocppStartResponseTimeoutSec: opts.ocppStartResponseTimeoutSec ?? 75,
    vehicleStartResponseTimeoutSec: opts.vehicleStartResponseTimeoutSec ?? 45,
    vehicleStartRetryCooldownSec: opts.vehicleStartRetryCooldownSec ?? 60,
    pvStartRetryCooldownSec: opts.pvStartRetryCooldownSec ?? 60,
    goalStrategy: opts.goalStrategy ?? 'standard',
    goalTariffOverrideMode: opts.goalTariffOverrideMode ?? 'forecast',
    goalForecastReserveMin: opts.goalForecastReserveMin ?? 15,
    goalForecastSafetyFactor: opts.goalForecastSafetyFactor ?? 1.1,
    goalSocWaitFallbackSec: 0,
    goalCheapPriceFactor: opts.goalCheapPriceFactor ?? 0.9,
    goalCheapBoostFactor: opts.goalCheapBoostFactor ?? 1.5,
    wallboxes: [wallbox],
  };

  const adapter = {
    namespace: 'nexowatt-ui.0',
    config: {
      enableChargingManagement: true,
      _chargingHasAnySetpoint: true,
      settingsConfig: { evcsCount: 1, stationGroups: [] },
      installerConfig: { gridConnectionPower: 30000, gridPhaseCount: 3, safetyMeterTimeoutSec: 30 },
      peakShaving: { maxPhaseA: 0 },
      chargingManagement: cmCfg,
    },
    _nvpFreshnessSnapshot: {
      ts: now,
      usable: true,
      fresh: true,
      connected: true,
      netW: opts.netW ?? 1000,
      status: 'ok',
      source: 'rc60-test-meter',
      reason: 'fresh',
      measurementAgeMs: 0,
      heartbeatAgeMs: 0,
    },
    _emsCaps: {},
    _emsBudget: {
      ts: now,
      mode: 'rc60-test',
      gates: {
        grid: { effectiveW: 30000 },
        pv: { effectiveW: pvW, rawW: pvW },
        pvAllocation: { totalW: pvW, evcsCapW: pvW, mode: 'evcs', evcsSharePct: 100 },
      },
      totalW: 30000,
      remainingTotalW: 30000,
      remainingPvW: pvW,
      reservations: [],
    },
    log: { debug() {}, info() {}, warn() {}, error() {} },
    async setStateAsync(id, value) {
      const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val') ? value.val : value;
      states.set(id, val);
      stateMeta.set(id, { ts: Date.now(), ack: value && typeof value === 'object' ? value.ack : true });
    },
    async getStateAsync(id) {
      if (!states.has(id)) return null;
      const meta = stateMeta.get(id) || { ts: Date.now(), ack: true };
      return { val: states.get(id), ts: meta.ts, lc: meta.ts, ack: meta.ack };
    },
    async setObjectNotExistsAsync() {},
    async getObjectAsync() { return null; },
    _nwRequestImmediateEmsTick() { return true; },
  };

  const setState = (id, val, ts = Date.now()) => {
    states.set(id, val);
    stateMeta.set(id, { ts, ack: true });
  };
  setState('chargingManagement.wallboxes.lp1.userMode', opts.userMode ?? 'auto');
  setState('chargingManagement.wallboxes.lp1.userAutoSource', 'standard');
  setState('chargingManagement.wallboxes.lp1.userStationEnabled', true);
  setState('chargingManagement.wallboxes.lp1.userEnabled', true);
  setState('chargingManagement.wallboxes.lp1.userStorageAssistEnabled', false);
  setState('chargingManagement.wallboxes.lp1.goalEnabled', goalEnabled);
  setState('chargingManagement.wallboxes.lp1.goalTargetSocPct', goalTargetSocPct);
  setState('chargingManagement.wallboxes.lp1.goalFinishTs', goalFinishTs);
  setState('chargingManagement.wallboxes.lp1.goalBatteryKwh', opts.goalBatteryKwh ?? 60);
  setState('tarif.aktiv', tariffActive);
  setState('tarif.dynamicTariffStale', tariffStale);
  setState('tarif.state', tariffState);
  setState('tarif.preisAktuellEurProKwh', opts.priceCurrent ?? (tariffState === 'guenstig' ? 0.1 : tariffState === 'teuer' ? 0.5 : 0.3));
  setState('tarif.preisDurchschnittEurProKwh', opts.priceAverage ?? 0.3);
  setState('tarif.negativpreisAktiv', opts.negativeActive ?? false);
  setState('tarif.netzbezugBevorzugt', opts.gridImportPreferred ?? false);
  setState('tarif.netFeeEnabled', netFeeEnabled);
  setState('tarif.netFeeMode', netFeeMode);

  const values = new Map();
  const entries = new Map();
  entries.set('cm.gridChargeAllowed', { key: 'cm.gridChargeAllowed', objectId: 'nexowatt-ui.0.tarif.netzLadenErlaubt' });
  values.set('cm.gridChargeAllowed', gridAllowed);
  entries.set('priceCurrent', { key: 'priceCurrent', objectId: 'nexowatt-ui.0.tarif.preisAktuellEurProKwh' });
  values.set('priceCurrent', opts.priceCurrent ?? (tariffState === 'guenstig' ? 0.1 : tariffState === 'teuer' ? 0.5 : 0.3));
  entries.set('priceAverage', { key: 'priceAverage', objectId: 'nexowatt-ui.0.tarif.preisDurchschnittEurProKwh' });
  values.set('priceAverage', opts.priceAverage ?? 0.3);

  const dp = {
    entries,
    lastWriteByObjectId: new Map(),
    async upsert(entry) {
      entries.set(entry.key, entry);
      if (entry.key.endsWith('.pW')) values.set(entry.key, actualPowerW);
      else if (entry.key.endsWith('.onlineRaw')) values.set(entry.key, online);
      else if (entry.key.endsWith('.dataFreshRaw')) values.set(entry.key, dataFresh);
      else if (entry.key.endsWith('.st')) values.set(entry.key, status);
      else if (entry.key.endsWith('.chargingStateRaw')) values.set(entry.key, chargingState);
      else if (entry.key.endsWith('.transactionActiveRaw')) values.set(entry.key, txActive);
      else if (entry.key.endsWith('.vehicleConnectedRaw')) values.set(entry.key, opts.explicitConnected);
      else if (entry.key.endsWith('.chargeDemandRaw')) values.set(entry.key, opts.explicitDemand);
      else if (entry.key.endsWith('.heartbeatRaw')) values.set(entry.key, Date.now());
      else if (entry.key.endsWith('.ocppAdapterAliveRaw')) values.set(entry.key, true);
      else if (entry.key.endsWith('.soc')) values.set(entry.key, vehicleSoc);
      return entry;
    },
    getEntry(key) { return entries.get(key) || null; },
    getNumber(key, fallback = null) {
      const v = values.get(key);
      return Number.isFinite(Number(v)) ? Number(v) : fallback;
    },
    getNumberFresh(key, _age, fallback = null) {
      const v = values.get(key);
      return Number.isFinite(Number(v)) ? Number(v) : fallback;
    },
    getRaw(key, fallback = null) { return values.has(key) ? values.get(key) : fallback; },
    getBoolean(key, fallback = false) { return values.has(key) ? !!values.get(key) : fallback; },
    getAgeMs() { return 0; },
    getMeasurementAgeMs() { return 0; },
    getConnectionStatus() { return true; },
    async writeNumber(key, value) {
      writes.push({ key, value: Number(value) });
      values.set(key, Number(value));
      return true;
    },
    async writeBoolean(key, value) {
      writes.push({ key, value: !!value });
      values.set(key, !!value);
      return true;
    },
  };

  const module = new ChargingManagementModule(adapter, dp);
  module._queueState = async (id, value) => { states.set(id, value); };
  module._flushPubQueue = async () => {};
  module._recordChargingAudit = async () => {};
  module._publishChargingControlTsShadow = async () => null;
  module._publishChargingAllocationTsShadow = async () => null;
  module._publishChargingStationDiagnosticsFromAllocationPlan = async () => null;
  module._publishChargingPhaseSelectionRuntimeStates = async () => null;
  module._publishChargingNormalSourceState = async () => null;
  module._publishChargingEvcsJavascriptRemovalState = async () => null;
  module._publishChargingLegacyDecisionTreeState = async () => null;
  module._publishChargingTsNormalSourceState = async () => null;

  return { adapter, dp, states, writes, module };
}

async function tickScenario(opts) {
  const h = makeHarness(opts);
  await h.module.tick();
  const result = snapshot(h);
  h.module.stop();
  return result;
}

function snapshot(h) {
  const currentWrites = h.writes.filter((row) => row.key.endsWith('.setA'));
  const powerWrites = h.writes.filter((row) => row.key.endsWith('.setW'));
  return {
    targetPowerW: Number(h.states.get('chargingManagement.wallboxes.lp1.targetPowerW') || 0),
    targetCurrentA: Number(h.states.get('chargingManagement.wallboxes.lp1.targetCurrentA') || 0),
    effectiveMode: String(h.states.get('chargingManagement.wallboxes.lp1.effectiveMode') || ''),
    demandConfirmed: h.states.get('chargingManagement.wallboxes.lp1.vehicleDemandConfirmed') === true,
    startEligible: h.states.get('chargingManagement.wallboxes.lp1.vehicleStartEligible') === true,
    startProbeActive: h.states.get('chargingManagement.wallboxes.lp1.vehicleStartProbeActive') === true,
    startCooldownUntil: Number(h.states.get('chargingManagement.wallboxes.lp1.vehicleStartCooldownUntil') || 0),
    vehicleState: String(h.states.get('chargingManagement.wallboxes.lp1.vehicleStateNormalized') || ''),
    reason: String(h.states.get('chargingManagement.wallboxes.lp1.reason') || ''),
    goalActive: h.states.get('chargingManagement.wallboxes.lp1.goalActive') === true,
    goalStatus: String(h.states.get('chargingManagement.wallboxes.lp1.goalStatus') || ''),
    goalDesiredW: Number(h.states.get('chargingManagement.wallboxes.lp1.goalDesiredW') || 0),
    tariffOverrideReason: String(h.states.get('chargingManagement.wallboxes.lp1.goalTariffOverrideReason') || ''),
    lastCurrentWriteA: currentWrites.length ? Number(currentWrites[currentWrites.length - 1].value) : null,
    lastPowerWriteW: powerWrites.length ? Number(powerWrites[powerWrites.length - 1].value) : null,
  };
}

function assertTechnicalStart(result, name, basis = 'currentA') {
  assert.strictEqual(result.startEligible, true, `${name}: start eligibility`);
  assert.strictEqual(result.demandConfirmed, false, `${name}: demand must not be faked`);
  assert.strictEqual(result.startProbeActive, true, `${name}: bounded start probe`);
  assert(result.targetPowerW >= 4100 && result.targetPowerW <= 4200, `${name}: technical minimum expected, got ${result.targetPowerW} W`);
  if (basis === 'powerW') {
    assert(result.lastPowerWriteW !== null && result.lastPowerWriteW >= 4100 && result.lastPowerWriteW <= 4200, `${name}: technical W setpoint expected`);
  } else {
    assert(result.lastCurrentWriteA !== null && result.lastCurrentWriteA >= 5.9 && result.lastCurrentWriteA <= 6.1, `${name}: 6 A write expected`);
  }
}

(async () => {
  // Alfen / IEC-61851 via nexowatt-devices.
  assertTechnicalStart(await tickScenario({ status: 'B1', userMode: 'auto' }), 'Alfen B1 Auto');
  assertTechnicalStart(await tickScenario({ status: 'B2', userMode: 'auto' }), 'Alfen B2 Auto');
  assertTechnicalStart(await tickScenario({ status: 'B1', userMode: 'minpv', pvW: 0 }), 'Alfen B1 Min+PV');
  assertTechnicalStart(await tickScenario({ status: 'B2', userMode: 'pv', pvW: 6000, pvStartStableSec: 0 }), 'Alfen B2 PV');

  const pvInsufficient = await tickScenario({ status: 'B1', userMode: 'pv', pvW: 2000, pvStartStableSec: 0 });
  assert.strictEqual(pvInsufficient.targetPowerW, 0, 'PV-only must not start below technical minimum.');
  assert.strictEqual(pvInsufficient.startProbeActive, false);

  for (const status of ['A', 'A1', 'E', 'F']) {
    const result = await tickScenario({ status, userMode: 'auto' });
    assert.strictEqual(result.targetPowerW, 0, `${status}: no start allowed`);
    assert.strictEqual(result.startEligible, false, `${status}: start eligibility must be false`);
  }

  const alfenDemand = await tickScenario({ status: 'C1', userMode: 'auto' });
  assert.strictEqual(alfenDemand.demandConfirmed, true);
  assert(alfenDemand.targetPowerW >= 4100 && alfenDemand.targetPowerW <= 4700, `Alfen C1 must enter Auto through the soft first ramp, got ${alfenDemand.targetPowerW} W`);
  assert.strictEqual(alfenDemand.startProbeActive, false);

  // NexoWatt OCPP21 event semantics.
  assertTechnicalStart(await tickScenario({ status: 'EVConnected', telemetryProfile: 'ocpp-1.6-event-driven', userMode: 'auto' }), 'OCPP EVConnected Auto');
  assertTechnicalStart(await tickScenario({ status: 'Occupied', telemetryProfile: 'ocpp-1.6-event-driven', userMode: 'pv', pvW: 6000, pvStartStableSec: 0 }), 'OCPP Occupied PV');
  assertTechnicalStart(await tickScenario({ status: 'Preparing', telemetryProfile: 'ocpp-1.6-event-driven', userMode: 'auto' }), 'OCPP Preparing Auto');
  const suspendedEv = await tickScenario({ status: 'SuspendedEV', telemetryProfile: 'ocpp-1.6-event-driven', userMode: 'auto' });
  assert.strictEqual(suspendedEv.targetPowerW, 0, 'SuspendedEV means the vehicle itself does not request power.');
  assert.strictEqual(suspendedEv.startEligible, false);
  const suspendedEvse = await tickScenario({ status: 'SuspendedEVSE', telemetryProfile: 'ocpp-1.6-event-driven', userMode: 'auto' });
  assert.strictEqual(suspendedEvse.demandConfirmed, true);
  assert(suspendedEvse.targetPowerW >= 4100 && suspendedEvse.targetPowerW <= 4700, 'SuspendedEVSE must remain confirmed and enter through the soft Auto ramp.');

  // Generic/manual mapping: explicit vehicle contact starts; explicit no-demand blocks.
  assertTechnicalStart(await tickScenario({ status: 'Ready', explicitConnected: true, userMode: 'auto' }), 'Generic explicit vehicle contact');
  assertTechnicalStart(
    await tickScenario({ status: 'Ready', explicitConnected: true, userMode: 'auto', controlBasis: 'powerW' }),
    'Generic power-controlled vehicle contact',
    'powerW',
  );
  const explicitNoDemand = await tickScenario({ status: 'B2', explicitConnected: true, explicitDemand: false, userMode: 'auto' });
  assert.strictEqual(explicitNoDemand.targetPowerW, 0, 'Explicit no-demand must remain authoritative.');
  assert.strictEqual(explicitNoDemand.startEligible, false);

  // Time-target and tariff behavior after vehicle demand is confirmed.
  const cheapStandard = await tickScenario({
    status: 'C1', userMode: 'auto', goalEnabled: true, goalStrategy: 'standard',
    gridAllowed: true, tariffState: 'guenstig', deadlineHours: 10,
    vehicleSoc: 50, goalTargetSocPct: 60,
  });
  assert.strictEqual(cheapStandard.goalActive, true);
  assert.strictEqual(cheapStandard.targetPowerW, 0,
    'Forecast-aware target charging must not start immediately when a safe later slot exists.');
  assert.strictEqual(cheapStandard.goalStatus, 'waiting_window',
    'A deliberate future target window must be reported as waiting_window, not shortfall.');

  const cheapSmart = await tickScenario({
    status: 'C1', userMode: 'auto', goalEnabled: true, goalStrategy: 'smart',
    gridAllowed: true, tariffState: 'guenstig', deadlineHours: 10,
    vehicleSoc: 50, goalTargetSocPct: 60,
  });
  assert.strictEqual(cheapSmart.targetPowerW, 0,
    'Smart mode must use the same forecast-aware slot plan instead of charging unnecessarily early.');
  assert.strictEqual(cheapSmart.goalStatus, 'waiting_window');

  const expensiveFar = await tickScenario({
    status: 'C1', userMode: 'auto', goalEnabled: true, goalStrategy: 'smart',
    gridAllowed: false, tariffState: 'teuer', deadlineHours: 10,
    vehicleSoc: 50, goalTargetSocPct: 60,
  });
  assert.strictEqual(expensiveFar.targetPowerW, 0, 'Far target may wait during an expensive tariff window.');

  const expensiveUrgent = await tickScenario({
    status: 'C1', userMode: 'auto', goalEnabled: true, goalStrategy: 'smart',
    gridAllowed: false, tariffState: 'teuer', deadlineHours: 0.7,
    vehicleSoc: 50, goalTargetSocPct: 60,
  });
  assert(expensiveUrgent.targetPowerW > 0, 'Urgent target must override tariff wait within hard limits.');
  assert(['latest_start', 'legacy_urgency', 'forecast_insufficient', 'always'].includes(expensiveUrgent.tariffOverrideReason), `Unexpected tariff override: ${expensiveUrgent.tariffOverrideReason}`);

  // RC65: NT is not allowed to overrule an expensive or stale active dynamic
  // tariff. The time-target override must nevertheless engage at latest-start.
  const ntExpensiveFar = await tickScenario({
    status: 'C1', userMode: 'auto', goalEnabled: true, goalStrategy: 'smart',
    gridAllowed: false, tariffActive: true, tariffStale: false, tariffState: 'teuer',
    netFeeEnabled: true, netFeeMode: 'NT', deadlineHours: 10,
    vehicleSoc: 50, goalTargetSocPct: 60,
  });
  assert.strictEqual(ntExpensiveFar.targetPowerW, 0, 'NT must not overrule an expensive active tariff while the target still has time.');

  const ntExpensiveUrgent = await tickScenario({
    status: 'C1', userMode: 'auto', goalEnabled: true, goalStrategy: 'smart',
    gridAllowed: false, tariffActive: true, tariffStale: false, tariffState: 'teuer',
    netFeeEnabled: true, netFeeMode: 'NT', deadlineHours: 0.7,
    vehicleSoc: 50, goalTargetSocPct: 60,
  });
  assert(ntExpensiveUrgent.targetPowerW > 0, 'Urgent time-target must override the NT/expensive tariff lock within hard limits.');
  assert(['latest_start', 'legacy_urgency', 'forecast_insufficient', 'always'].includes(ntExpensiveUrgent.tariffOverrideReason), `Unexpected NT-expensive target override: ${ntExpensiveUrgent.tariffOverrideReason}`);

  const ntStaleFar = await tickScenario({
    status: 'C1', userMode: 'auto', goalEnabled: true, goalStrategy: 'smart',
    gridAllowed: false, tariffActive: true, tariffStale: true, tariffState: 'neutral',
    netFeeEnabled: true, netFeeMode: 'NT', deadlineHours: 10,
    vehicleSoc: 50, goalTargetSocPct: 60,
  });
  assert.strictEqual(ntStaleFar.targetPowerW, 0, 'NT must not overrule stale active tariff data while the target still has time.');

  const ntStaleUrgent = await tickScenario({
    status: 'C1', userMode: 'auto', goalEnabled: true, goalStrategy: 'smart',
    gridAllowed: false, tariffActive: true, tariffStale: true, tariffState: 'neutral',
    netFeeEnabled: true, netFeeMode: 'NT', deadlineHours: 0.7,
    vehicleSoc: 50, goalTargetSocPct: 60,
  });
  assert(ntStaleUrgent.targetPowerW > 0, 'Urgent time-target must override the NT/stale tariff lock within hard limits.');
  assert(['latest_start', 'legacy_urgency', 'forecast_insufficient', 'always'].includes(ntStaleUrgent.tariffOverrideReason), `Unexpected NT-stale target override: ${ntStaleUrgent.tariffOverrideReason}`);

  const ntWithoutDynamicTariff = await tickScenario({
    status: 'C1', userMode: 'auto', goalEnabled: false,
    gridAllowed: false, tariffActive: false, tariffStale: false, tariffState: 'unknown',
    netFeeEnabled: true, netFeeMode: 'NT',
  });
  assert(ntWithoutDynamicTariff.targetPowerW > 0, 'Configured NT must allow EVCS grid charging when the dynamic tariff is disabled.');

  // Mixed protocol fleet: startable Alfen, OCPP and generic wallboxes share
  // one minimum-service plan without one protocol consuming the others' floor.
  const mixedMinimumPlan = computeChargingMinimumServicePlan({
    totalBudgetW: 12_600,
    wallboxes: [
      { safe: 'alfen', enabled: true, online: true, controlAvailable: true, effectiveMode: 'normal', vehicleDemandConfirmed: false, vehicleStartEligible: true, vehicleStartCooldownActive: false, minPW: 4200, maxPW: 11000 },
      { safe: 'ocpp', enabled: true, online: true, controlAvailable: true, effectiveMode: 'normal', vehicleDemandConfirmed: false, vehicleStartEligible: true, vehicleStartCooldownActive: false, minPW: 4200, maxPW: 11000 },
      { safe: 'generic', enabled: true, online: true, controlAvailable: true, effectiveMode: 'minpv', vehicleDemandConfirmed: false, vehicleStartEligible: true, vehicleStartCooldownActive: false, minPW: 4200, maxPW: 11000 },
    ],
  });
  assert.strictEqual(mixedMinimumPlan.preserveAll, true, 'Mixed protocol fleet must preserve all technical minima when the budget fits.');
  assert.strictEqual(mixedMinimumPlan.totalMinimumW, 12_600);
  const mixedCooldownPlan = computeChargingMinimumServicePlan({
    totalBudgetW: 12_600,
    wallboxes: [
      { safe: 'alfen', enabled: true, online: true, controlAvailable: true, effectiveMode: 'normal', vehicleDemandConfirmed: false, vehicleStartEligible: true, vehicleStartCooldownActive: true, minPW: 4200, maxPW: 11000 },
      { safe: 'ocpp', enabled: true, online: true, controlAvailable: true, effectiveMode: 'normal', vehicleDemandConfirmed: false, vehicleStartEligible: true, vehicleStartCooldownActive: false, minPW: 4200, maxPW: 11000 },
    ],
  });
  assert.strictEqual(mixedCooldownPlan.totalMinimumW, 4200, 'A timed-out wallbox must not keep reserving a fleet minimum during cooldown.');

  const strategyPausedPlan = computeChargingMinimumServicePlan({
    totalBudgetW: 8400,
    wallboxes: [
      {
        safe: 'paused-strategy', enabled: true, online: true, effectiveMode: 'normal', userMode: 'auto', userAutoSource: 'strategy',
        strategyOverlay: { active: true, action: 'pause', fallbackPause: true },
        vehicleDemandConfirmed: false, vehicleStartEligible: true, vehicleStartCooldownActive: false, minPW: 4200, maxPW: 11000,
      },
      {
        safe: 'active-auto', enabled: true, online: true, effectiveMode: 'normal', userMode: 'auto', userAutoSource: 'standard',
        vehicleDemandConfirmed: false, vehicleStartEligible: true, vehicleStartCooldownActive: false, minPW: 4200, maxPW: 11000,
      },
    ],
  });
  assert.strictEqual(strategyPausedPlan.totalMinimumW, 4200, 'A strategy-paused wallbox must not reserve a technical minimum.');
  assert.strictEqual(strategyPausedPlan.minimumBySafe.get('paused-strategy'), 0, 'Strategy pause leaked into fleet minimum reservation.');

  const strategyBelowMinimumPlan = computeChargingMinimumServicePlan({
    totalBudgetW: 8400,
    wallboxes: [
      {
        safe: 'strategy-cap-too-small', enabled: true, online: true, effectiveMode: 'normal', userMode: 'auto', userAutoSource: 'strategy',
        strategyOverlay: { active: true, targetPowerW: 2000 },
        vehicleDemandConfirmed: false, vehicleStartEligible: true, vehicleStartCooldownActive: false, minPW: 4200, maxPW: 11000,
      },
      {
        safe: 'active-auto', enabled: true, online: true, effectiveMode: 'normal', userMode: 'auto', userAutoSource: 'standard',
        vehicleDemandConfirmed: false, vehicleStartEligible: true, vehicleStartCooldownActive: false, minPW: 4200, maxPW: 11000,
      },
    ],
  });
  assert.strictEqual(strategyBelowMinimumPlan.totalMinimumW, 4200, 'A strategy cap below the technical minimum must not reserve fleet power.');

  // Bounded start response and cooldown: no uncontrolled on/off oscillation.
  const cooldownHarness = makeHarness({
    status: 'B1', userMode: 'auto', vehicleStartResponseTimeoutSec: 10,
    vehicleStartRetryCooldownSec: 60,
  });
  await cooldownHarness.module.tick();
  let first = snapshot(cooldownHarness);
  assertTechnicalStart(first, 'Cooldown first probe');
  cooldownHarness.module._vehicleStartAttemptSinceMs.set('lp1', Date.now() - 11_000);
  cooldownHarness.writes.length = 0;
  await cooldownHarness.module.tick();
  const timedOut = snapshot(cooldownHarness);
  assert.strictEqual(timedOut.targetPowerW, 0, 'No-response timeout must stop the probe.');
  assert(timedOut.startCooldownUntil > Date.now(), 'No-response timeout must establish a retry cooldown.');
  cooldownHarness.writes.length = 0;
  await cooldownHarness.module.tick();
  const inCooldown = snapshot(cooldownHarness);
  assert.strictEqual(inCooldown.targetPowerW, 0, 'Cooldown must prevent immediate restart oscillation.');
  cooldownHarness.module._vehicleStartCooldownUntilMs.set('lp1', Date.now() - 1);
  cooldownHarness.writes.length = 0;
  await cooldownHarness.module.tick();
  const afterCooldown = snapshot(cooldownHarness);
  assertTechnicalStart(afterCooldown, 'Cooldown retry probe');
  cooldownHarness.module.stop();

  // Alfen Modbus default validity is 60 s; RC61 resolves a device-specific
  // keepalive and refreshes Alfen setpoints every 15 s while OCPP/generic
  // profiles retain their own safe cadence.
  const source = require('fs').readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/charging-management.ts'), 'utf8');
  assert(source.includes('resolveEvcsSetpointRefreshMs('), 'Universal EVCS keepalive resolver is missing.');
  const { resolveEvcsSetpointRefreshMs } = require(path.join(root, 'ems/modules/charging-management'));
  assert.strictEqual(resolveEvcsSetpointRefreshMs({ vendor: 'Alfen' }, 'generic'), 15000, 'Alfen keepalive must stay well below the 60 s validity.');
  for (const needle of [
    'vehicleStartResponseTimeoutSec',
    'vehicleStartRetryCooldownSec',
    'vehicleStartProbeActive',
    'vehicleStartCooldownUntilMs',
    'mode3-b1-connected-startable',
    'mode3-b2-pwm-startable',
    'status-${token}-startable',
  ]) assert(source.includes(needle), `Universal Auto contract missing: ${needle}`);

  console.log('[rc60-universal-auto-orchestrator] OK: Auto/PV/Min+PV/Zeit-Ziel/Tarif funktionieren mit Alfen Mode 3, OCPP21 und generischen EVCS-Zuordnungen.');
})().catch((error) => {
  console.error('[rc60-universal-auto-orchestrator] FAILED:', error && error.stack ? error.stack : error);
  process.exit(1);
});
