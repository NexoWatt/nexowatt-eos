#!/usr/bin/env node
'use strict';

/**
 * RC60: hersteller- und protokollunabhängiger Auto-Startvertrag.
 *
 * Geprüft werden reale Regelticks für:
 * - Alfen/IEC 61851 über nexowatt-devices (Modbus/currentA)
 * - NexoWatt OCPP21 (powerW)
 * - frei zugeordnete Herstellerzustände
 * - 1-phasige AC- und leistungsgeregelte DC-Ladepunkte
 * - Auto, PV, Min+PV, Zeit-Ziel und dynamischer Tarif
 * - Start-Timeout/Cooldown sowie autoritative Kein-Bedarf-/Fehlerzustände
 * - automatisches nexowatt-devices-Mapping ohne Vermischung von Geräten
 * - produktive TS-Allocation mit aktivem Startprobevertrag
 */

const assert = require('node:assert/strict');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const charging = require(path.join(root, 'ems/modules/charging-management.js'));
const mapping = require(path.join(root, 'ems/evcs-control-mapping.js'));
const allocation = require(path.join(root, 'lib/ts-mirrors/ems/charging-management/charging-allocation.js'));

const { ChargingManagementModule } = charging;

function finite(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function makeWallbox(overrides = {}) {
  return {
    key: 'lp1',
    name: 'Universal test wallbox',
    enabled: true,
    evcsIndex: 1,
    chargerType: 'AC',
    controlBasis: 'currentA',
    phases: 3,
    voltageV: 230,
    minA: 6,
    maxA: 16,
    maxPowerW: 11000,
    actualPowerWId: 'test.wallbox.powerW',
    statusId: 'test.wallbox.status',
    vehicleConnectedId: 'test.wallbox.vehicleConnected',
    onlineId: 'test.wallbox.online',
    heartbeatId: 'test.wallbox.lastSeenMs',
    setCurrentAId: 'test.wallbox.setCurrentA',
    enableId: 'test.wallbox.enable',
    userModeDefault: 'auto',
    ...overrides,
  };
}

function makeHarness(options = {}) {
  const now = Date.now();
  const localStates = new Map();
  const localMeta = new Map();
  const objectValues = new Map();
  const objectMeta = new Map();
  const entries = new Map();
  const values = new Map();
  const writes = [];
  const logs = [];

  const wallbox = makeWallbox(options.wallbox || {});
  const pvW = finite(options.pvW, 0);
  const gridAllowed = options.gridAllowed !== false;
  const tariffState = String(options.tariffState || (gridAllowed ? 'neutral' : 'teuer'));
  const goalEnabled = options.goalEnabled === true;
  const goalFinishTs = finite(options.goalFinishTs, now + finite(options.deadlineHours, 8) * 3600_000);
  const vehicleSoc = finite(options.vehicleSoc, 50);

  const setLocal = (id, val, ts = Date.now()) => {
    localStates.set(id, val);
    localMeta.set(id, { ts, lc: ts, ack: true });
  };
  const setObject = (id, val, ts = Date.now()) => {
    objectValues.set(id, val);
    objectMeta.set(id, { ts, lc: ts, ack: true });
  };

  const defaultObjects = {
    [wallbox.actualPowerWId]: finite(options.actualPowerW, 0),
    [wallbox.statusId]: options.status === undefined ? 'B2' : options.status,
    [wallbox.chargingStateId]: options.chargingState === undefined ? '' : options.chargingState,
    [wallbox.transactionActiveId]: options.transactionActive === true,
    [wallbox.vehicleConnectedId]: options.vehicleConnected === undefined ? true : options.vehicleConnected,
    [wallbox.chargeDemandId]: options.chargeDemand === undefined ? null : options.chargeDemand,
    [wallbox.onlineId]: options.online !== false,
    [wallbox.dataFreshId]: options.dataFresh !== false,
    [wallbox.heartbeatId]: now,
  };
  for (const [id, value] of Object.entries(defaultObjects)) {
    if (id && id !== 'undefined' && value !== null && value !== undefined) setObject(id, value, now);
  }
  for (const [id, value] of Object.entries(options.objectValues || {})) setObject(id, value, now);

  setLocal('chargingManagement.wallboxes.lp1.userMode', String(options.userMode || 'auto'));
  setLocal('chargingManagement.wallboxes.lp1.userAutoSource', 'standard');
  setLocal('chargingManagement.wallboxes.lp1.userStationEnabled', true);
  setLocal('chargingManagement.wallboxes.lp1.userEnabled', true);
  setLocal('chargingManagement.wallboxes.lp1.userStorageAssistEnabled', false);
  setLocal('chargingManagement.wallboxes.lp1.goalEnabled', goalEnabled);
  setLocal('chargingManagement.wallboxes.lp1.goalTargetSocPct', finite(options.goalTargetSocPct, 80));
  setLocal('chargingManagement.wallboxes.lp1.goalFinishTs', goalFinishTs);
  setLocal('chargingManagement.wallboxes.lp1.goalBatteryKwh', finite(options.goalBatteryKwh, 60));
  setLocal('evcs.1.vehicleSoc', vehicleSoc, now);
  setLocal('tarif.state', tariffState);
  setLocal('tarif.preisAktuellEurProKwh', finite(options.priceCurrent, tariffState === 'guenstig' ? 0.1 : tariffState === 'teuer' ? 0.5 : 0.3));
  setLocal('tarif.preisDurchschnittEurProKwh', finite(options.priceAverage, 0.3));
  setLocal('tarif.negativpreisAktiv', options.negativeActive === true);
  setLocal('tarif.netzbezugBevorzugt', options.gridImportPreferred === true);
  setLocal('tarif.netFeeEnabled', false);
  setLocal('tarif.netFeeMode', 'Standard');

  const chargingManagement = {
    mode: 'mixed',
    totalBudgetMode: 'static',
    staticMaxChargingPowerW: finite(options.totalBudgetW, 11000),
    voltageV: 230,
    defaultPhases: 3,
    minCurrentA: 6,
    maxCurrentA: 16,
    wallboxMeterStaleTimeoutSec: 300,
    wallboxStatusStaleTimeoutSec: 86400,
    tariffPermissionHoldSec: 0,
    pvStartThresholdW: 0,
    pvStopThresholdW: 0,
    pvStartStableSec: options.pvStartStableSec === undefined ? 0 : finite(options.pvStartStableSec, 0),
    pvStartDelaySec: 0,
    pvStartResponseTimeoutSec: 15,
    ocppStartResponseTimeoutSec: 75,
    vehicleStartResponseTimeoutSec: finite(options.vehicleStartResponseTimeoutSec, 45),
    vehicleStartRetryCooldownSec: finite(options.vehicleStartRetryCooldownSec, 60),
    goalStrategy: String(options.goalStrategy || 'standard'),
    goalTariffOverrideMode: String(options.goalTariffOverrideMode || 'forecast'),
    goalTariffOverrideUrgency: 0.7,
    goalTariffOverrideMinRemainingMin: 60,
    goalSocWaitFallbackSec: 0,
    goalCheapPriceFactor: 0.9,
    goalCheapBoostFactor: 1.5,
    wallboxes: [wallbox],
  };

  const adapter = {
    namespace: 'nexowatt-ui.0',
    config: {
      enableChargingManagement: true,
      _chargingHasAnySetpoint: !!(wallbox.setCurrentAId || wallbox.setPowerWId),
      settingsConfig: { evcsCount: 1, stationGroups: [] },
      installerConfig: { gridConnectionPower: 30000, gridPhaseCount: 3, safetyMeterTimeoutSec: 30 },
      peakShaving: { maxPhaseA: 0 },
      chargingManagement,
    },
    _nvpFreshnessSnapshot: {
      ts: now,
      usable: true,
      fresh: true,
      connected: true,
      netW: finite(options.netW, 1000),
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
      totalW: finite(options.totalBudgetW, 30000),
      remainingTotalW: finite(options.totalBudgetW, 30000),
      remainingPvW: pvW,
      reservations: [],
    },
    log: {
      debug(message) { logs.push({ level: 'debug', message: String(message || '') }); },
      info(message) { logs.push({ level: 'info', message: String(message || '') }); },
      warn(message) { logs.push({ level: 'warn', message: String(message || '') }); },
      error(message) { logs.push({ level: 'error', message: String(message || '') }); },
    },
    async setStateAsync(id, value) {
      const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val') ? value.val : value;
      setLocal(id, val, Date.now());
    },
    async getStateAsync(id) {
      if (!localStates.has(id)) return null;
      const meta = localMeta.get(id) || { ts: Date.now(), lc: Date.now(), ack: true };
      return { val: localStates.get(id), ...meta };
    },
    async getForeignStateAsync(id) {
      if (localStates.has(id)) {
        const meta = localMeta.get(id) || { ts: Date.now(), lc: Date.now(), ack: true };
        return { val: localStates.get(id), ...meta };
      }
      if (!objectValues.has(id)) return null;
      const meta = objectMeta.get(id) || { ts: Date.now(), lc: Date.now(), ack: true };
      return { val: objectValues.get(id), ...meta };
    },
    async setObjectNotExistsAsync() {},
    async extendObjectAsync() {},
    async getObjectAsync() { return null; },
    async getForeignObjectAsync(id) {
      if (!objectValues.has(id)) return null;
      const write = id === wallbox.setCurrentAId || id === wallbox.setPowerWId || id === wallbox.enableId;
      return { type: 'state', common: { read: !write, write }, native: {} };
    },
    _nwRequestImmediateEmsTick() { return true; },
  };

  entries.set('cm.gridChargeAllowed', { key: 'cm.gridChargeAllowed', objectId: 'nexowatt-ui.0.tarif.netzLadenErlaubt' });
  values.set('cm.gridChargeAllowed', gridAllowed);
  entries.set('priceCurrent', { key: 'priceCurrent', objectId: 'nexowatt-ui.0.tarif.preisAktuellEurProKwh' });
  values.set('priceCurrent', finite(options.priceCurrent, tariffState === 'guenstig' ? 0.1 : tariffState === 'teuer' ? 0.5 : 0.3));
  entries.set('priceAverage', { key: 'priceAverage', objectId: 'nexowatt-ui.0.tarif.preisDurchschnittEurProKwh' });
  values.set('priceAverage', finite(options.priceAverage, 0.3));

  const dp = {
    entries,
    lastWriteByObjectId: new Map(),
    async upsert(entry) {
      entries.set(entry.key, entry);
      if (entry.direction === 'in' && objectValues.has(entry.objectId)) values.set(entry.key, objectValues.get(entry.objectId));
      return entry;
    },
    getEntry(key) { return entries.get(key) || null; },
    getNumber(key, fallback = null) {
      const value = values.get(key);
      return Number.isFinite(Number(value)) ? Number(value) : fallback;
    },
    getNumberFresh(key, maxAgeMs, fallback = null) {
      const entry = entries.get(key);
      if (!entry) return fallback;
      const meta = objectMeta.get(entry.objectId);
      if (meta && Number.isFinite(Number(maxAgeMs)) && Date.now() - meta.ts > Number(maxAgeMs)) return fallback;
      const value = values.get(key);
      return Number.isFinite(Number(value)) ? Number(value) : fallback;
    },
    getRaw(key, fallback = null) { return values.has(key) ? values.get(key) : fallback; },
    getBoolean(key, fallback = false) { return values.has(key) ? !!values.get(key) : fallback; },
    getAgeMs(key) {
      const entry = entries.get(key);
      const meta = entry ? objectMeta.get(entry.objectId) : null;
      return meta ? Math.max(0, Date.now() - meta.ts) : Number.POSITIVE_INFINITY;
    },
    getMeasurementAgeMs(key) { return this.getAgeMs(key); },
    getConnectionStatus(key) {
      if (!values.has(key)) return null;
      return !!values.get(key);
    },
    async writeNumber(key, value) {
      const n = Number(value);
      writes.push({ key, value: n, ts: Date.now() });
      values.set(key, n);
      const entry = entries.get(key);
      if (entry && entry.objectId) setObject(entry.objectId, n, Date.now());
      return true;
    },
    async writeBoolean(key, value) {
      const bool = !!value;
      writes.push({ key, value: bool, ts: Date.now() });
      values.set(key, bool);
      const entry = entries.get(key);
      if (entry && entry.objectId) setObject(entry.objectId, bool, Date.now());
      return true;
    },
  };

  const module = new ChargingManagementModule(adapter, dp);
  module._queueState = async (id, value) => setLocal(id, value, Date.now());
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

  function result() {
    const base = 'chargingManagement.wallboxes.lp1.';
    return {
      targetPowerW: finite(localStates.get(`${base}targetPowerW`), 0),
      targetCurrentA: finite(localStates.get(`${base}targetCurrentA`), 0),
      actualPowerW: finite(localStates.get(`${base}actualPowerW`), 0),
      effectiveMode: String(localStates.get(`${base}effectiveMode`) || ''),
      reason: String(localStates.get(`${base}reason`) || ''),
      limiter: String(localStates.get(`${base}limiter`) || ''),
      vehiclePlugged: localStates.get(`${base}vehiclePlugged`) === true,
      vehicleDemandConfirmed: localStates.get(`${base}vehicleDemandConfirmed`) === true,
      vehicleStartEligible: localStates.get(`${base}vehicleStartEligible`) === true,
      vehicleStartProbeActive: localStates.get(`${base}vehicleStartProbeActive`) === true,
      vehicleStartProbeSince: finite(localStates.get(`${base}vehicleStartProbeSince`), 0),
      vehicleStartCooldownUntil: finite(localStates.get(`${base}vehicleStartCooldownUntil`), 0),
      vehicleStateNormalized: String(localStates.get(`${base}vehicleStateNormalized`) || ''),
      vehicleDemandReason: String(localStates.get(`${base}vehicleDemandReason`) || ''),
      chargeDemandSourceId: String(localStates.get(`${base}chargeDemandSourceId`) || ''),
      goalActive: localStates.get(`${base}goalActive`) === true,
      goalStatus: String(localStates.get(`${base}goalStatus`) || ''),
      goalDesiredPowerW: finite(localStates.get(`${base}goalDesiredPowerW`), 0),
      goalTariffOverride: localStates.get(`${base}goalTariffOverride`) === true,
      goalTariffOverrideReason: String(localStates.get(`${base}goalTariffOverrideReason`) || ''),
      mappingIssues: String(localStates.get(`${base}mappingIssues`) || ''),
      writes: writes.slice(),
      errors: logs.filter((entry) => entry.level === 'error'),
    };
  }

  return {
    module,
    adapter,
    dp,
    wallbox,
    localStates,
    objectValues,
    writes,
    logs,
    setLocal,
    setObject,
    async tick() {
      await module.tick();
      const out = result();
      assert.equal(out.errors.length, 0, `Regeltick logged errors: ${JSON.stringify(out.errors)}`);
      return out;
    },
    stop() { module.stop(); },
  };
}

async function withHarness(options, fn) {
  const harness = makeHarness(options);
  try {
    return await fn(harness);
  } finally {
    harness.stop();
  }
}

async function testMappingContract() {
  const base = 'nexowatt-devices.0.devices.alfen_ace';
  const other = 'nexowatt-devices.0.devices.other_wallbox';
  const readable = new Set([
    `${base}.aliases.v1.r.power`,
    `${base}.aliases.v1.r.energyTotal`,
    `${base}.aliases.v1.r.statusText`,
    `${base}.aliases.v1.r.statusCode`,
    `${base}.aliases.v1.r.vehicleConnected`,
    `${base}.aliases.v1.r.online`,
    `${base}.aliases.v1.r.lastSeenMs`,
    `${other}.aliases.v1.r.statusText`,
  ]);
  const writable = new Set([
    `${base}.aliases.v1.ctrl.currentLimitA`,
    `${base}.aliases.v1.ctrl.run`,
    `${other}.aliases.v1.ctrl.powerLimitW`,
  ]);
  const resolved = await mapping.resolveEvcsControlMapping({
    powerId: `${base}.aliases.r.power`,
    chargeDemandId: `${base}.aliases.r.charging`,
    controlPreference: 'none',
  }, async id => writable.has(id), async id => readable.has(id));

  assert.equal(resolved.baseId, base);
  assert.equal(resolved.row.powerId, `${base}.aliases.r.power`, 'explicit power mapping must remain authoritative');
  assert.equal(resolved.row.statusId, `${base}.aliases.v1.r.statusText`, 'semantic status text must win over numeric status code');
  assert.equal(resolved.row.vehicleConnectedId, `${base}.aliases.v1.r.vehicleConnected`);
  assert.equal(resolved.row.onlineId, `${base}.aliases.v1.r.online`);
  assert.equal(resolved.row.heartbeatId, `${base}.aliases.v1.r.lastSeenMs`);
  assert.equal(resolved.row.setCurrentAId, `${base}.aliases.v1.ctrl.currentLimitA`);
  assert.equal(resolved.row.enableWriteId, `${base}.aliases.v1.ctrl.run`);
  assert.equal(resolved.row.chargeDemandId, '', 'r.charging must not be reused as vehicle demand');
  assert.equal(resolved.ignoredObservationDemand, true);
  assert.equal(resolved.row.controlPreference, 'currentA');
  for (const field of ['statusId', 'vehicleConnectedId', 'onlineId', 'heartbeatId', 'setCurrentAId', 'enableWriteId']) {
    assert.ok(String(resolved.row[field]).startsWith(`${base}.`), `${field} mixed another device base`);
  }
  assert.equal(mapping.normalizeEvcsChargeDemandObjectId(`${base}.aliases.v1.r.charging`), '');
  assert.equal(mapping.normalizeEvcsChargeDemandObjectId(`${base}.aliases.v1.r.chargeDemand`), `${base}.aliases.v1.r.chargeDemand`);
}

async function testAlfenAndGenericStart() {
  const base = 'nexowatt-devices.0.devices.alfen_ace';
  const wallbox = {
    actualPowerWId: `${base}.aliases.v1.r.power`,
    statusId: `${base}.aliases.v1.r.statusText`,
    vehicleConnectedId: `${base}.aliases.v1.r.vehicleConnected`,
    // Deliberately preserve the historical bad mapping. RC60 must ignore it.
    chargeDemandId: `${base}.aliases.v1.r.charging`,
    onlineId: `${base}.aliases.v1.r.online`,
    heartbeatId: `${base}.aliases.v1.r.lastSeenMs`,
    setCurrentAId: `${base}.aliases.v1.ctrl.currentLimitA`,
    enableId: `${base}.aliases.v1.ctrl.run`,
  };
  await withHarness({
    wallbox,
    status: 'Vehicle connected, ready (B2)',
    vehicleConnected: true,
    chargeDemand: false,
    actualPowerW: 0,
    gridAllowed: true,
  }, async h => {
    let out = await h.tick();
    assert.equal(out.vehicleStateNormalized, 'ready_to_charge');
    assert.equal(out.vehicleStartEligible, true);
    assert.equal(out.vehicleDemandConfirmed, false);
    assert.equal(out.vehicleStartProbeActive, true);
    assert.equal(out.chargeDemandSourceId, '', 'observation-only r.charging mapping was not neutralized');
    assert.ok(out.mappingIssues.includes('observation_only_charge_demand_ignored'));
    assert.ok(out.targetPowerW >= 4100 && out.targetPowerW <= 4200, `unexpected Alfen start power ${out.targetPowerW}`);
    assert.ok(out.writes.some(entry => entry.key.endsWith('.setA') && Math.abs(entry.value - 6) < 0.05), 'Alfen did not receive 6 A technical start command');

    h.setObject(wallbox.actualPowerWId, 4500);
    h.setObject(wallbox.statusId, 'Charging (C2)');
    out = await h.tick();
    assert.equal(out.vehicleDemandConfirmed, true);
    assert.equal(out.vehicleStartProbeActive, false);
    assert.ok(out.targetPowerW > 4100, `Alfen did not ramp after response: ${out.targetPowerW}`);
  });

  // Older/weak status mappings are rescued by the fresh explicit vehicle contact.
  await withHarness({
    wallbox: { ...wallbox, chargeDemandId: '' },
    status: 'Operative',
    vehicleConnected: true,
    actualPowerW: 0,
    gridAllowed: true,
  }, async h => {
    const out = await h.tick();
    assert.equal(out.vehicleStartEligible, true);
    assert.equal(out.vehicleStateNormalized, 'connected');
    assert.ok(out.targetPowerW >= 4100, 'explicit vehicle contact did not permit bounded start');
  });

  // Explicit genuine "no demand" remains authoritative and prevents cycling a full EV.
  await withHarness({
    wallbox: { ...wallbox, chargeDemandId: 'custom.wallbox.chargeDemand' },
    status: 'Vehicle connected, ready (B2)',
    vehicleConnected: true,
    chargeDemand: false,
    objectValues: { 'custom.wallbox.chargeDemand': false },
    gridAllowed: true,
  }, async h => {
    const out = await h.tick();
    assert.equal(out.vehicleStartEligible, false);
    assert.equal(out.vehicleStateNormalized, 'paused_by_vehicle');
    assert.equal(out.targetPowerW, 0);
  });

  // Freie Herstellerwerte can be configured without protocol-specific code.
  await withHarness({
    wallbox: {
      controlBasis: 'powerW',
      setCurrentAId: '',
      setPowerWId: 'custom.wallbox.powerLimitW',
      enableId: 'custom.wallbox.enable',
      vehicleConnectedId: '',
      statusConnectedValues: '*PRESENT*',
    },
    status: 'CAR_PRESENT_WAIT',
    gridAllowed: true,
  }, async h => {
    const out = await h.tick();
    assert.equal(out.vehicleStartEligible, true);
    assert.equal(out.vehicleStateNormalized, 'connected');
    assert.ok(out.targetPowerW >= 4100);
    assert.ok(out.writes.some(entry => entry.key.endsWith('.setW') && entry.value >= 4100));
  });
}

async function testOcppAndControlTypes() {
  const rootId = 'ocpp21.0.CP_01';
  const wallbox = {
    chargerType: 'AC',
    controlBasis: 'powerW',
    actualPowerWId: `${rootId}.measurements.powerW`,
    statusId: `${rootId}.info.status`,
    chargingStateId: `${rootId}.transactions.chargingState`,
    transactionActiveId: `${rootId}.transactions.transactionActive`,
    vehicleConnectedId: '',
    chargeDemandId: '',
    onlineId: `${rootId}.info.socketConnected`,
    dataFreshId: `${rootId}.health.dataFresh`,
    heartbeatId: `${rootId}.health.lastSeenMs`,
    setCurrentAId: '',
    setPowerWId: `${rootId}.control.chargeLimit`,
    enableId: `${rootId}.control.availability`,
    telemetryProfile: 'ocpp-1.6-event-driven',
  };
  await withHarness({
    wallbox,
    status: 'Occupied',
    chargingState: 'EVConnected',
    transactionActive: false,
    actualPowerW: 0,
    gridAllowed: true,
  }, async h => {
    let out = await h.tick();
    assert.equal(out.vehicleStartEligible, true);
    assert.equal(out.vehicleStartProbeActive, true);
    assert.ok(out.targetPowerW >= 4100, 'OCPP EVConnected is still deadlocked');
    assert.ok(out.writes.some(entry => entry.key.endsWith('.setW') && entry.value >= 4100));

    h.setObject(wallbox.actualPowerWId, 6200);
    h.setObject(wallbox.chargingStateId, 'Charging');
    h.setObject(wallbox.transactionActiveId, true);
    out = await h.tick();
    assert.equal(out.vehicleDemandConfirmed, true);
    assert.equal(out.vehicleStartProbeActive, false);
    assert.ok(out.targetPowerW > 0);
  });

  // OCPP sources may arrive in different order. Connector occupancy must
  // complement an early Idle chargingState, while hard faults and vehicle-side
  // pauses remain authoritative.
  await withHarness({
    wallbox, status: 'Occupied', chargingState: 'Idle', transactionActive: false,
    actualPowerW: 0, gridAllowed: true,
  }, async h => {
    const out = await h.tick();
    assert.equal(out.vehicleStateNormalized, 'connected');
    assert.equal(out.vehicleStartEligible, true);
    assert.ok(out.targetPowerW >= 4100, 'Idle + Occupied remained start-deadlocked');
  });
  await withHarness({
    wallbox, status: 'Faulted', chargingState: 'EVConnected', transactionActive: false,
    actualPowerW: 0, gridAllowed: true,
  }, async h => {
    const out = await h.tick();
    assert.equal(out.vehicleStateNormalized, 'faulted');
    assert.equal(out.vehicleStartEligible, false);
    assert.equal(out.targetPowerW, 0);
  });
  await withHarness({
    wallbox, status: 'Occupied', chargingState: 'SuspendedEV', transactionActive: false,
    actualPowerW: 0, gridAllowed: true,
  }, async h => {
    const out = await h.tick();
    assert.equal(out.vehicleStateNormalized, 'paused_by_vehicle');
    assert.equal(out.vehicleStartEligible, false);
    assert.equal(out.targetPowerW, 0);
  });

  // 1-phase current-controlled AC wallbox: 6 A = 1.38 kW.
  await withHarness({
    wallbox: {
      phases: 1,
      maxPowerW: 3680,
      actualPowerWId: 'onephase.powerW',
      statusId: 'onephase.status',
      vehicleConnectedId: 'onephase.connected',
      onlineId: 'onephase.online',
      heartbeatId: 'onephase.lastSeen',
      setCurrentAId: 'onephase.setA',
      enableId: 'onephase.enable',
    },
    status: 'Connected',
    vehicleConnected: true,
    actualPowerW: 0,
  }, async h => {
    const out = await h.tick();
    assert.ok(out.targetPowerW >= 1370 && out.targetPowerW <= 1390, `1p minimum is wrong: ${out.targetPowerW}`);
    assert.ok(out.writes.some(entry => entry.key.endsWith('.setA') && Math.abs(entry.value - 6) < 0.05));
  });

  // Power-controlled DC wallbox uses configured technical minimum.
  await withHarness({
    wallbox: {
      chargerType: 'DC',
      controlBasis: 'powerW',
      phases: 1,
      minA: 0,
      maxA: 0,
      minPowerW: 1000,
      maxPowerW: 20000,
      actualPowerWId: 'dc.powerW',
      statusId: 'dc.status',
      vehicleConnectedId: 'dc.connected',
      onlineId: 'dc.online',
      heartbeatId: 'dc.lastSeen',
      setCurrentAId: '',
      setPowerWId: 'dc.setW',
      enableId: 'dc.enable',
    },
    status: 'Connected',
    vehicleConnected: true,
    actualPowerW: 0,
    totalBudgetW: 20000,
  }, async h => {
    const out = await h.tick();
    assert.equal(out.targetPowerW, 1000);
    assert.ok(out.writes.some(entry => entry.key.endsWith('.setW') && entry.value === 1000));
  });

  // Negative status texts containing the word "charging" must never be
  // interpreted as active demand. This protects generic/manual templates and
  // vendor translations such as "Not charging" or "Charging paused".
  for (const status of ['Not charging', 'No charging', 'Charging paused', 'Charge paused', 'Charging blocked']) {
    await withHarness({
      wallbox: {
        statusId: 'generic.status',
        vehicleConnectedId: 'generic.vehicleConnected',
        onlineId: 'generic.online',
      },
      status,
      vehicleConnected: true,
      gridAllowed: true,
    }, async h => {
      const out = await h.tick();
      assert.equal(out.targetPowerW, 0, `${status} was incorrectly treated as demand`);
      assert.equal(out.vehicleDemandConfirmed, false, `${status} confirmed false demand`);
      assert.equal(out.vehicleStartEligible, false, `${status} allowed an automatic start probe`);
    });
  }

  // A measurable but non-controllable wallbox remains fail-closed.
  await withHarness({
    wallbox: {
      controlBasis: 'none',
      setCurrentAId: '',
      setPowerWId: '',
      enableId: '',
    },
    status: 'Connected',
    vehicleConnected: true,
  }, async h => {
    const out = await h.tick();
    assert.equal(out.targetPowerW, 0);
    assert.equal(out.writes.length, 0);
  });
}

async function testAllAutoVariants() {
  // Normal Auto starts connected Alfen/Mode-3 devices with technical minimum.
  await withHarness({ userMode: 'auto', status: 'B2', vehicleConnected: true, gridAllowed: true }, async h => {
    const out = await h.tick();
    assert.equal(out.effectiveMode, 'normal');
    assert.ok(out.targetPowerW >= 4100);
  });

  // Min+PV keeps its grid-backed base even without PV.
  await withHarness({ userMode: 'minpv', status: 'B2', vehicleConnected: true, gridAllowed: true, pvW: 0 }, async h => {
    const out = await h.tick();
    assert.equal(out.effectiveMode, 'minpv');
    assert.ok(out.targetPowerW >= 4100 && out.targetPowerW <= 4200);
  });

  // Pure PV starts only when the technical minimum is available.
  await withHarness({ userMode: 'pv', status: 'B2', vehicleConnected: true, gridAllowed: false, pvW: 6000, pvStartStableSec: 0 }, async h => {
    const out = await h.tick();
    assert.equal(out.effectiveMode, 'pv');
    assert.ok(out.targetPowerW >= 4100 && out.targetPowerW <= 4200);
  });
  await withHarness({ userMode: 'pv', status: 'B2', vehicleConnected: true, gridAllowed: false, pvW: 2000, pvStartStableSec: 0 }, async h => {
    const out = await h.tick();
    assert.equal(out.targetPowerW, 0, 'PV-only started below technical minimum');
  });

  // Time-target and cheap tariff must also start from the pre-PWM B1 state.
  // RC72+ may legitimately wait for a later forecast window. The deadline here
  // is deliberately urgent so this RC60 contract tests the B1 start path rather
  // than the separate forecast-window planner.
  await withHarness({
    userMode: 'auto', status: 'B1', vehicleConnected: true,
    goalEnabled: true, goalTargetSocPct: 60, vehicleSoc: 50, goalBatteryKwh: 60,
    deadlineHours: 0.4, gridAllowed: true, tariffState: 'neutral', goalStrategy: 'standard',
  }, async h => {
    const out = await h.tick();
    assert.equal(out.goalActive, true);
    assert.equal(out.vehicleStartEligible, true);
    assert.ok(out.targetPowerW >= 4100, 'B1 time-target did not create a controlled start');
  });
  await withHarness({
    userMode: 'auto', status: 'B1', vehicleConnected: true,
    gridAllowed: true, tariffState: 'guenstig',
  }, async h => {
    const out = await h.tick();
    assert.equal(out.vehicleStartEligible, true);
    assert.ok(out.targetPowerW >= 4100, 'B1 cheap-tariff Auto did not start');
  });

  // Time-target can plan and start before current flow, then command the required corridor after response.
  await withHarness({
    userMode: 'auto',
    status: 'B2',
    vehicleConnected: true,
    goalEnabled: true,
    goalTargetSocPct: 60,
    vehicleSoc: 50,
    goalBatteryKwh: 60,
    deadlineHours: 0.4,
    gridAllowed: true,
    goalStrategy: 'standard',
  }, async h => {
    let out = await h.tick();
    assert.equal(out.goalActive, true);
    assert.ok(out.goalDesiredPowerW > 4100);
    assert.ok(out.targetPowerW >= 4100 && out.targetPowerW <= 4200, 'first target-goal start must remain bounded');
    h.setObject(h.wallbox.actualPowerWId, 4500);
    h.setObject(h.wallbox.statusId, 'C2');
    out = await h.tick();
    assert.equal(out.vehicleDemandConfirmed, true);
    assert.ok(out.targetPowerW > 4100, `time-target did not ramp after response: ${out.targetPowerW}`);
  });

  // Under an urgent planner corridor, a cheap tariff must never reduce the
  // target compared with the standard strategy. RC72 owns exact window/boost
  // shaping, while RC60 keeps the universal control path protocol-neutral.
  let standardAfterResponse = 0;
  await withHarness({
    userMode: 'auto', status: 'C2', vehicleConnected: true, actualPowerW: 4500,
    goalEnabled: true, goalTargetSocPct: 60, vehicleSoc: 50, deadlineHours: 0.6,
    gridAllowed: true, tariffState: 'neutral', goalStrategy: 'standard',
  }, async h => {
    standardAfterResponse = (await h.tick()).targetPowerW;
  });
  await withHarness({
    userMode: 'auto', status: 'C2', vehicleConnected: true, actualPowerW: 4500,
    goalEnabled: true, goalTargetSocPct: 60, vehicleSoc: 50, deadlineHours: 0.6,
    gridAllowed: true, tariffState: 'guenstig', goalStrategy: 'smart',
  }, async h => {
    const out = await h.tick();
    assert.ok(standardAfterResponse > 4100, `urgent standard target did not charge (${standardAfterResponse})`);
    assert.ok(out.targetPowerW > 4100, `urgent smart target did not charge (${out.targetPowerW})`);
    assert.ok(out.targetPowerW >= standardAfterResponse, `cheap tariff reduced the smart target (${out.targetPowerW} < ${standardAfterResponse})`);
  });

  // Expensive tariff waits when deadline is safe, but urgent target overrides the tariff gate.
  await withHarness({
    userMode: 'auto', status: 'B2', vehicleConnected: true,
    goalEnabled: true, goalTargetSocPct: 60, vehicleSoc: 50, deadlineHours: 10,
    gridAllowed: false, tariffState: 'teuer', pvW: 0,
  }, async h => {
    const out = await h.tick();
    assert.equal(out.effectiveMode, 'pv');
    assert.equal(out.targetPowerW, 0);
    assert.equal(out.goalActive, true);
  });
  await withHarness({
    userMode: 'auto', status: 'B2', vehicleConnected: true,
    goalEnabled: true, goalTargetSocPct: 70, vehicleSoc: 50, deadlineHours: 0.25,
    gridAllowed: false, tariffState: 'teuer', pvW: 0,
  }, async h => {
    const out = await h.tick();
    assert.equal(out.goalActive, true);
    assert.equal(out.goalTariffOverride, true, `urgent goal did not override tariff: ${out.goalTariffOverrideReason}`);
    assert.equal(out.effectiveMode, 'normal');
    assert.ok(out.targetPowerW >= 4100, 'urgent target did not start');
  });
}

async function testTimeoutAndAllocationContract() {
  await withHarness({
    userMode: 'auto', status: 'B2', vehicleConnected: true,
    vehicleStartResponseTimeoutSec: 10,
    vehicleStartRetryCooldownSec: 60,
  }, async h => {
    h.module._vehicleStartAttemptSinceMs.set('lp1', Date.now() - 12_000);
    const out = await h.tick();
    assert.equal(out.targetPowerW, 0);
    assert.equal(out.vehicleStartProbeActive, false);
    assert.ok(out.vehicleStartCooldownUntil > Date.now(), 'failed start has no retry cooldown');
  });

  const baseWallbox = {
    safe: 'wb_probe',
    name: 'TS start probe',
    enabled: true,
    online: true,
    vehiclePlugged: true,
    vehicleDemandConfirmed: false,
    vehicleStartEligible: true,
    vehicleStartProbeActive: true,
    vehicleStartCooldownActive: false,
    boostPrearmAllowed: false,
    charging: false,
    effectiveMode: 'auto',
    userMode: 'auto',
    chargerType: 'ac',
    controlBasis: 'currentA',
    phases: 3,
    voltageV: 230,
    minPowerW: 4140,
    maxPowerW: 11040,
    minA: 6,
    maxA: 16,
    stepA: 1,
    setAKey: 'cm.wb.wb_probe.setA',
    hasSetpoint: true,
    hasSetCurrent: true,
  };
  const build = (probe) => allocation.buildChargingAllocationShadowPlan({
    mode: 'auto',
    budgetMode: 'engine:central',
    budgetW: 11040,
    remainingW: 6900,
    totalTargetPowerW: probe ? 4140 : 0,
    totalTargetCurrentA: probe ? 6 : 0,
    wallboxes: [{ ...baseWallbox, vehicleStartProbeActive: probe }],
    allocations: [{
      safe: 'wb_probe',
      targetW: probe ? 4140 : 0,
      targetA: probe ? 6 : 0,
      effectiveMode: 'auto',
      userMode: 'auto',
      reason: probe ? 'vehicle-start-probe' : 'no_vehicle',
    }],
  });
  const active = build(true);
  assert.equal(active.wallboxes[0].targetPowerW, 4140, 'TS allocation removed active universal start probe');
  assert.equal(active.wallboxes[0].vehicleStartProbeActive, true);
  const inactive = build(false);
  assert.equal(inactive.wallboxes[0].targetPowerW, 0);
}

module.exports = { makeHarness };

if (require.main === module) (async () => {
  await testMappingContract();
  await testAlfenAndGenericStart();
  await testOcppAndControlTypes();
  await testAllAutoVariants();
  await testTimeoutAndAllocationContract();
  console.log('[rc60-universal-auto-wallbox] OK: nexowatt-devices/Alfen, OCPP21, freie Hersteller, AC/DC, Auto, PV, Min+PV, Zeit-Ziel und Tarif nutzen einen gemeinsamen sicheren Startvertrag.');
})().catch((error) => {
  console.error('[rc60-universal-auto-wallbox] FAILED');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
