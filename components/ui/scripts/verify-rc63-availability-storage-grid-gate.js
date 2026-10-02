#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
  ChargingManagementModule,
  resolveEvcsAvailabilityRequest,
} = require('../ems/modules/charging-management');
const { applyEvcsSetpoint } = require('../ems/consumers/evcs');
const {
  resolveStorageGridChargePermission,
  formatStorageNtWindowLabel,
} = require('../ems/modules/tarif-vis');
const {
  isCentralStorageGridChargeSource,
  resolveStorageGridChargeFinalGate,
} = require('../ems/modules/storage-control');

function testEvcsAvailability() {
  const normal = resolveEvcsAvailabilityRequest({
    userStationEnabled: true,
    rfidEnforced: false,
    rfidAuthorized: false,
  });
  assert.strictEqual(normal.requested, true, 'RFID disabled must not lock the station');
  assert.strictEqual(normal.owner, 'charging-management');

  const customerOff = resolveEvcsAvailabilityRequest({
    userStationEnabled: false,
    rfidEnforced: false,
    rfidAuthorized: true,
  });
  assert.strictEqual(customerOff.requested, false, 'explicit customer station-off must lock');
  assert.strictEqual(customerOff.owner, 'customer');

  const rfidDenied = resolveEvcsAvailabilityRequest({
    userStationEnabled: true,
    rfidEnforced: true,
    rfidAuthorized: false,
  });
  assert.strictEqual(rfidDenied.requested, false, 'active RFID denial must lock');
  assert.strictEqual(rfidDenied.owner, 'rfid');
  assert.strictEqual(rfidDenied.rfidLockActive, true);

  const rfidAllowed = resolveEvcsAvailabilityRequest({
    userStationEnabled: true,
    rfidEnforced: true,
    rfidAuthorized: true,
  });
  assert.strictEqual(rfidAllowed.requested, true, 'whitelisted RFID must restore Operative');

  // The helper intentionally has no safety/transaction/status input. Those
  // conditions control power=0, never OCPP availability.
  assert.deepStrictEqual(
    Object.keys(normal).sort(),
    ['customerLockActive', 'owner', 'reason', 'requested', 'rfidLockActive'].sort(),
  );
}

function testStorageTariffGate() {
  const master = {
    appCenterAllowed: true,
    priorityAllowsStorage: true,
    storageWriterAvailable: true,
    storagePowerW: 4000,
  };

  const ntPath = {
    ...master,
    tariffActive: false,
    currentPriceFresh: false,
    tariffState: 'neutral',
    manualNetFeeEnabled: true,
    manualNtWindowActive: true,
  };
  const ntAllowed = resolveStorageGridChargePermission(ntPath);
  assert.strictEqual(ntAllowed.allowed, false, 'configured NT alone must never allow storage grid charging when the dynamic tariff is disabled');
  assert.strictEqual(ntAllowed.source, 'dynamic-tariff');
  assert.strictEqual(resolveStorageGridChargePermission({ ...ntPath, tariffActive: true, currentPriceFresh: true, tariffState: 'neutral' }).allowed, false, 'fresh neutral tariff must not charge even inside NT');
  const ntCheapAllowed = resolveStorageGridChargePermission({ ...ntPath, tariffActive: true, currentPriceFresh: true, tariffState: 'guenstig' });
  assert.strictEqual(ntCheapAllowed.allowed, true, 'fresh cheap tariff may charge inside NT');
  assert.strictEqual(ntCheapAllowed.source, 'net-fee-nt-cheap');
  assert.strictEqual(resolveStorageGridChargePermission({ ...ntPath, tariffActive: true, currentPriceFresh: true, tariffState: 'teuer' }).allowed, false, 'expensive tariff must block storage grid charging even inside NT');
  assert.strictEqual(resolveStorageGridChargePermission({ ...ntPath, tariffActive: true, currentPriceFresh: false, tariffState: 'neutral' }).allowed, false, 'stale dynamic price must block storage grid charging inside NT');
  assert.strictEqual(resolveStorageGridChargePermission({ ...ntPath, manualNtWindowActive: false }).allowed, false, 'net-fee mode must fail closed outside configured NT');

  const cheapPath = {
    ...master,
    tariffActive: true,
    currentPriceFresh: true,
    tariffState: 'guenstig',
    manualNetFeeEnabled: false,
    manualNtWindowActive: false,
  };
  const cheapAllowed = resolveStorageGridChargePermission(cheapPath);
  assert.strictEqual(cheapAllowed.allowed, true, 'cheap dynamic tariff must allow charging when variable net fee is disabled');
  assert.strictEqual(cheapAllowed.source, 'dynamic-tariff-cheap');
  assert.strictEqual(resolveStorageGridChargePermission({ ...cheapPath, tariffState: 'neutral' }).allowed, false);
  assert.strictEqual(resolveStorageGridChargePermission({ ...cheapPath, tariffState: 'teuer' }).allowed, false);
  assert.strictEqual(resolveStorageGridChargePermission({ ...cheapPath, currentPriceFresh: false }).allowed, false, 'stale price must fail closed on the dynamic-tariff path');
  assert.strictEqual(resolveStorageGridChargePermission({ ...cheapPath, tariffActive: false }).allowed, false, 'dynamic tariff must be active when net fee is disabled');

  assert.strictEqual(resolveStorageGridChargePermission({ ...ntPath, appCenterAllowed: false }).allowed, false, 'AppCenter permission is mandatory');
  assert.strictEqual(resolveStorageGridChargePermission({ ...ntPath, priorityAllowsStorage: false }).allowed, false, 'storage priority is mandatory');
  assert.strictEqual(resolveStorageGridChargePermission({ ...ntPath, storageWriterAvailable: false }).allowed, false, 'storage writer is mandatory');

  assert.strictEqual(formatStorageNtWindowLabel({ model: 2, quarter: 3, startRaw: '22:00', endRaw: '06:00' }), 'Q3 NT 22:00–06:00');
  assert.strictEqual(formatStorageNtWindowLabel({ model: 1, startRaw: '21:00', endRaw: '05:30' }), 'NT 21:00–05:30');
}

function testStorageFinalFirewall() {
  assert.strictEqual(isCentralStorageGridChargeSource('tarif', -4000), true);
  assert.strictEqual(isCentralStorageGridChargeSource('reserve_grid', -2500), true);
  assert.strictEqual(isCentralStorageGridChargeSource('lsk_refill', -1000), true);
  assert.strictEqual(isCentralStorageGridChargeSource('pv', -4000), false, 'PV charging must remain independent');
  assert.strictEqual(isCentralStorageGridChargeSource('tarif', 4000), false, 'discharge is not grid charging');

  const blockedTariff = resolveStorageGridChargeFinalGate({
    targetW: -4000,
    source: 'tarif',
    configured: true,
    allowed: false,
    blockReason: 'Tarif ist neutral',
  });
  assert.strictEqual(blockedTariff.blocked, true);
  assert.strictEqual(blockedTariff.targetW, 0);
  assert.match(blockedTariff.reason, /neutral/);

  const blockedReserve = resolveStorageGridChargeFinalGate({
    targetW: -2500,
    source: 'reserve_grid',
    configured: true,
    allowed: false,
  });
  assert.strictEqual(blockedReserve.blocked, true, 'reserve grid charging must obey the same gate');

  const allowedTariff = resolveStorageGridChargeFinalGate({
    targetW: -4000,
    source: 'tarif',
    configured: true,
    allowed: true,
  });
  assert.strictEqual(allowedTariff.blocked, false);
  assert.strictEqual(allowedTariff.targetW, -4000);

  const pv = resolveStorageGridChargeFinalGate({
    targetW: -4000,
    source: 'pv',
    configured: false,
    allowed: false,
  });
  assert.strictEqual(pv.blocked, false, 'PV charging must not be blocked by the grid-charge gate');
  assert.strictEqual(pv.targetW, -4000);
}


async function testEvcsActuatorContract() {
  const entries = new Map([
    ['wb.setW', { key: 'wb.setW', objectId: 'ocpp21.0.CP_01.control.chargeLimit' }],
    ['wb.enable', { key: 'wb.enable', objectId: 'ocpp21.0.CP_01.control.availability' }],
  ]);
  const writes = [];
  const dp = {
    getEntry(key) { return entries.get(key) || null; },
    async writeNumber(key, value) { writes.push({ type: 'number', key, value: Number(value) }); return true; },
    async writeBoolean(key, value) { writes.push({ type: 'boolean', key, value: !!value }); return true; },
  };
  const consumer = {
    type: 'evcs', key: 'lp1', controlBasis: 'powerW',
    setWKey: 'wb.setW', enableKey: 'wb.enable',
  };

  await applyEvcsSetpoint({ dp, adapter: { log: { debug() {} } } }, consumer, {
    targetW: 0, targetA: 0, basis: 'powerW', enable: true,
  });
  assert.deepStrictEqual(writes, [
    { type: 'number', key: 'wb.setW', value: 0 },
    { type: 'boolean', key: 'wb.enable', value: true },
  ], 'normal pause/charge-end must write 0 W first and keep the station Operative');

  writes.length = 0;
  await applyEvcsSetpoint({ dp, adapter: { log: { debug() {} } } }, consumer, {
    targetW: 0, targetA: 0, basis: 'powerW', enable: false,
  });
  assert.deepStrictEqual(writes, [
    { type: 'number', key: 'wb.setW', value: 0 },
    { type: 'boolean', key: 'wb.enable', value: false },
  ], 'explicit customer/RFID lock must first stop power and only then set Inoperative');

  writes.length = 0;
  await applyEvcsSetpoint({ dp, adapter: { log: { debug() {} } } }, consumer, {
    targetW: 0, targetA: 0, basis: 'powerW',
  });
  assert.deepStrictEqual(writes, [
    { type: 'number', key: 'wb.setW', value: 0 },
  ], 'without an explicit availability owner the actuator must never toggle availability');
}

async function testChargingModuleDeactivateDoesNotLock() {
  const writes = [];
  const entries = new Map();
  const dp = {
    entries,
    lastWriteByObjectId: new Map(),
    async upsert(entry) { entries.set(entry.key, { ...entry }); },
    getEntry(key) { return entries.get(key) || null; },
    async writeNumber(key, value) { writes.push({ type: 'number', key, value: Number(value) }); return true; },
    async writeBoolean(key, value) { writes.push({ type: 'boolean', key, value: !!value }); return true; },
  };
  const adapter = {
    config: {
      chargingManagement: {
        wallboxes: [{
          key: 'lp1', enabled: true,
          setPowerWId: 'ocpp21.0.CP_01.control.chargeLimit',
          enableId: 'ocpp21.0.CP_01.control.availability',
        }],
      },
    },
    log: { debug() {}, info() {}, warn() {}, error() {} },
    async setStateAsync() {},
  };
  const module = new ChargingManagementModule(adapter, dp);
  module._queueState = async () => {};
  module._flushPubQueue = async () => {};
  const result = await module.deactivate();
  module.stop();
  assert.strictEqual(result.ok, true);
  assert(writes.some((row) => row.type === 'number' && row.value === 0), 'module deactivation must stop the setpoint');
  assert(!writes.some((row) => row.type === 'boolean'), 'module deactivation must never set station availability to false');
}

function makeAvailabilityTickHarness({ status = 'Unavailable', userStationEnabled = true, rfidEnforced = false, rfidAuthorized = true } = {}) {
  const states = new Map();
  const writes = [];
  const now = Date.now();
  const adapter = {
    namespace: 'nexowatt-ui.0',
    config: {
      enableChargingManagement: true,
      _chargingHasAnySetpoint: true,
      settingsConfig: { evcsCount: 1, stationGroups: [] },
      installerConfig: { gridConnectionPower: 30000, gridPhaseCount: 3, safetyMeterTimeoutSec: 30 },
      peakShaving: { maxPhaseA: 0 },
      chargingManagement: {
        mode: 'mixed', totalBudgetMode: 'static', staticMaxChargingPowerW: 11000,
        voltageV: 230, defaultPhases: 3, minCurrentA: 6, maxCurrentA: 16,
        wallboxes: [{
          key: 'lp1', name: 'OCPP21 Availability Test', enabled: true,
          telemetryProfile: 'nexowattocpp',
          actualPowerWId: 'ocpp21.0.CP_01.measurements.powerW',
          statusId: 'ocpp21.0.CP_01.info.status',
          transactionActiveId: 'ocpp21.0.CP_01.transactions.transactionActive',
          onlineId: 'ocpp21.0.CP_01.info.socketConnected',
          dataFreshId: 'ocpp21.0.CP_01.health.dataFresh',
          heartbeatId: 'ocpp21.0.CP_01.health.lastSeenMs',
          setPowerWId: 'ocpp21.0.CP_01.control.chargeLimit',
          enableId: 'ocpp21.0.CP_01.control.availability',
          maxPowerW: 11000, minA: 6, maxA: 16, phases: 3,
          userModeDefault: 'auto', controlBasis: 'powerW',
        }],
      },
    },
    _nvpFreshnessSnapshot: {
      ts: now, usable: true, fresh: true, connected: true, netW: 1000,
      status: 'ok', source: 'rc63-test-meter', reason: 'fresh', measurementAgeMs: 0, heartbeatAgeMs: 0,
    },
    _emsCaps: {},
    _emsBudget: {
      mode: 'rc63-test', gates: { grid: { effectiveW: 30000 }, pv: { effectiveW: 0 } },
      remainingTotalW: 30000, remainingPvW: 0, reservations: [],
    },
    log: { debug() {}, info() {}, warn() {}, error() {} },
    async setStateAsync(id, value) {
      states.set(String(id), value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val') ? value.val : value);
    },
    async getStateAsync(id) {
      return states.has(String(id)) ? { val: states.get(String(id)), ts: Date.now(), ack: true } : null;
    },
    async setObjectNotExistsAsync() {},
    async getObjectAsync() { return null; },
    _nwRequestImmediateEmsTick() { return true; },
  };
  states.set('chargingManagement.wallboxes.lp1.userMode', 'auto');
  states.set('chargingManagement.wallboxes.lp1.userAutoSource', 'standard');
  states.set('chargingManagement.wallboxes.lp1.userStationEnabled', userStationEnabled);
  states.set('chargingManagement.wallboxes.lp1.userEnabled', true);
  states.set('chargingManagement.wallboxes.lp1.userStorageAssistEnabled', false);
  states.set('evcs.1.rfidEnforced', rfidEnforced);
  states.set('evcs.1.rfidAuthorized', rfidAuthorized);
  states.set('evcs.1.rfidReason', rfidEnforced ? (rfidAuthorized ? 'whitelisted' : 'not_whitelisted') : 'rfid_disabled');

  const values = new Map();
  const entries = new Map();
  const dp = {
    entries,
    lastWriteByObjectId: new Map(),
    async upsert(entry) {
      entries.set(entry.key, { ...entry });
      if (entry.key.endsWith('.pW')) values.set(entry.key, 0);
      else if (entry.key.endsWith('.onlineRaw')) values.set(entry.key, true);
      else if (entry.key.endsWith('.dataFreshRaw')) values.set(entry.key, true);
      else if (entry.key.endsWith('.st')) values.set(entry.key, status);
      else if (entry.key.endsWith('.transactionActiveRaw')) values.set(entry.key, false);
      else if (entry.key.endsWith('.heartbeatRaw')) values.set(entry.key, Date.now());
      else if (entry.key.endsWith('.ocppAdapterAliveRaw')) values.set(entry.key, true);
      return entry;
    },
    getEntry(key) { return entries.get(key) || null; },
    getNumber(key, fallback = null) { const value = values.get(key); return Number.isFinite(Number(value)) ? Number(value) : fallback; },
    getRaw(key, fallback = null) { return values.has(key) ? values.get(key) : fallback; },
    getAgeMs() { return 0; },
    getMeasurementAgeMs() { return 0; },
    getConnectionStatus() { return true; },
    async writeNumber(key, value) { writes.push({ type: 'number', key, value: Number(value) }); values.set(key, Number(value)); return true; },
    async writeBoolean(key, value) { writes.push({ type: 'boolean', key, value: !!value }); values.set(key, !!value); return true; },
  };
  return { adapter, dp, states, writes };
}

async function runAvailabilityTick(options) {
  const h = makeAvailabilityTickHarness(options);
  const module = new ChargingManagementModule(h.adapter, h.dp);
  module._queueState = async (id, value) => { h.states.set(String(id), value); };
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
  await module.tick();
  module.stop();
  return h;
}

async function testAvailabilitySelfHealIntegration() {
  const heal = await runAvailabilityTick({ status: 'Unavailable', userStationEnabled: true, rfidEnforced: false });
  assert(heal.writes.some((row) => row.key === 'cm.wb.lp1.en' && row.value === true), 'legacy Inoperative/Unavailable latch must self-heal to Operative');
  assert(!heal.writes.some((row) => row.key === 'cm.wb.lp1.en' && row.value === false), 'normal unavailable recovery must never reinforce the lock');

  const customerOff = await runAvailabilityTick({ status: 'Available', userStationEnabled: false, rfidEnforced: false });
  assert(customerOff.writes.some((row) => row.key === 'cm.wb.lp1.en' && row.value === false), 'explicit station-off must set Inoperative');

  const rfidOff = await runAvailabilityTick({ status: 'Available', userStationEnabled: true, rfidEnforced: true, rfidAuthorized: false });
  assert(rfidOff.writes.some((row) => row.key === 'cm.wb.lp1.en' && row.value === false), 'active RFID whitelist denial must set Inoperative');

  const normalEnd = await runAvailabilityTick({ status: 'Available', userStationEnabled: true, rfidEnforced: false });
  assert(!normalEnd.writes.some((row) => row.key === 'cm.wb.lp1.en' && row.value === false), 'charge end/unplug must never lock the station');
}


class FakeDp {
  constructor() { this.entries = new Map(); this.values = new Map(); this.ages = new Map(); }
  async upsert(entry) { this.entries.set(entry.key, { ...entry }); }
  getEntry(key) { return this.entries.get(key) || null; }
  set(key, value, ageMs = 0) { this.values.set(key, value); this.ages.set(key, ageMs); }
  getAgeMs(key) { return this.ages.has(key) ? this.ages.get(key) : null; }
  getRaw(key) { return this.values.has(key) ? this.values.get(key) : null; }
  getNumber(key, fallback = null) { const n = Number(this.values.get(key)); return Number.isFinite(n) ? n : fallback; }
  getNumberFresh(key, maxAgeMs, fallback = null) {
    const age = this.getAgeMs(key);
    if (Number.isFinite(Number(age)) && Number(age) > maxAgeMs) return fallback;
    return this.getNumber(key, fallback);
  }
  getBoolean(key, fallback = false) { return this.values.has(key) ? this.values.get(key) === true : fallback; }
}

async function runTariffIntegration({
  hour = 23,
  currentPrice = 0.10,
  currentPriceAgeMs = 0,
  allowGridCharge = true,
  priority = 2,
  netFeeEnabled = true,
  netFeeModel = 2,
  configureQuarter = true,
  configureSimple = true,
  dynamicTariff = true,
} = {}) {
  const realNow = Date.now;
  const fixed = new Date(2026, 7, 16, hour, 0, 0, 0).getTime(); // Q3, local time
  Date.now = () => fixed;
  try {
    const states = new Map();
    const adapter = {
      namespace: 'nexowatt-ui.0',
      config: {
        enableStorageControl: true,
        datapoints: {
          priceCurrent: 'provider.current',
          priceAverage: 'provider.average',
          priceTodayJson: 'provider.today',
          priceTomorrowJson: 'provider.tomorrow',
        },
        tariff: { currentPriceMaxAgeMin: 90, averagePriceMaxAgeHours: 36, curveMaxAgeHours: 36 },
        storage: { allowGridCharge },
        storageFarm: {},
      },
      log: { debug() {}, info() {}, warn() {}, error() {} },
      async setObjectNotExistsAsync() {},
      async setStateAsync(id, value) {
        const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val') ? value.val : value;
        states.set(String(id), { val, ts: fixed, lc: fixed });
      },
      async getStateAsync(id) { return states.get(String(id)) || null; },
      _states: states,
    };
    const dp = new FakeDp();
    const module = new (require('../ems/modules/tarif-vis').TarifVisModule)(adapter, dp);
    await module.init();
    dp.set('vis.settings.dynamicTariff', dynamicTariff, 0);
    dp.set('vis.settings.tariffMode', 1, 0);
    dp.set('vis.settings.price', 0.25, 0);
    dp.set('vis.settings.priority', priority, 0);
    dp.set('vis.settings.storagePower', 4000, 0);
    dp.set('vis.settings.evcsMaxPower', 22000, 0);
    dp.set('vis.settings.netFeeEnabled', netFeeEnabled, 0);
    dp.set('vis.settings.netFeeModel', netFeeModel, 0);
    if (configureSimple) {
      dp.set('vis.settings.netFeeNtStart', '22:00', 0);
      dp.set('vis.settings.netFeeNtEnd', '06:00', 0);
      dp.set('vis.settings.netFeeHtStart', '06:00', 0);
      dp.set('vis.settings.netFeeHtEnd', '22:00', 0);
    }
    if (configureQuarter) {
      dp.set('vis.settings.netFeeQ3NtStart', '22:00', 0);
      dp.set('vis.settings.netFeeQ3NtEnd', '06:00', 0);
      dp.set('vis.settings.netFeeQ3HtStart', '06:00', 0);
      dp.set('vis.settings.netFeeQ3HtEnd', '22:00', 0);
    }
    dp.set('tarif.preisAktuellEurProKwh', currentPrice, currentPriceAgeMs);
    dp.set('tarif.preisDurchschnittEurProKwh', 0.30, 0);
    dp.set('st.socPct', 40, 0);
    await module.tick();
    return { adapter, dp, module, states };
  } finally {
    Date.now = realNow;
  }
}

async function testTariffIntegration() {
  {
    const { states, adapter } = await runTariffIntegration();
    assert.strictEqual(states.get('tarif.state').val, 'guenstig');
    assert.strictEqual(states.get('tarif.netFeeMode').val, 'NT');
    assert.strictEqual(states.get('tarif.speicherNetzLadenErlaubt').val, true);
    assert.strictEqual(states.get('tarif.speicherSollW').val, -4000);
    assert.strictEqual(adapter._tarifVis.storageGridChargeAllowed, true);
    assert.strictEqual(adapter._tarifVis.storageGridChargeSource, 'net-fee-nt-cheap');
    assert.strictEqual(adapter._tarifVis.storageManualWindowLabel, 'Q3 NT 22:00–06:00');
  }
  {
    const { states, adapter } = await runTariffIntegration({ currentPrice: 0.25 });
    assert.strictEqual(states.get('tarif.netFeeMode').val, 'NT');
    assert.strictEqual(states.get('tarif.speicherNetzLadenErlaubt').val, false, 'neutral dynamic price must never allow storage grid charging, even inside NT');
    assert.strictEqual(states.get('tarif.speicherSollW').val, 0);
    assert.strictEqual(adapter._tarifVis.storageGridChargeSource, 'dynamic-tariff');
  }
  {
    const { states, adapter } = await runTariffIntegration({ currentPrice: 0.10, currentPriceAgeMs: 2 * 60 * 60 * 1000 });
    assert.strictEqual(states.get('tarif.netFeeMode').val, 'NT');
    assert.strictEqual(states.get('tarif.speicherNetzLadenErlaubt').val, false, 'stale dynamic price must block storage grid charging even inside NT');
    assert.strictEqual(states.get('tarif.speicherSollW').val, 0);
    assert.strictEqual(adapter._tarifVis.storageGridChargeSource, 'dynamic-tariff');
  }
  {
    const { states, adapter } = await runTariffIntegration({ currentPrice: 0.50 });
    assert.strictEqual(states.get('tarif.netFeeMode').val, 'NT');
    assert.strictEqual(states.get('tarif.speicherNetzLadenErlaubt').val, false, 'expensive dynamic price must block storage grid charging even inside NT');
    assert.strictEqual(states.get('tarif.speicherSollW').val, 0);
    assert.strictEqual(adapter._tarifVis.storageGridChargeSource, 'dynamic-tariff');
  }
  {
    const { states } = await runTariffIntegration({ hour: 12, currentPrice: 0.10 });
    assert.strictEqual(states.get('tarif.speicherNetzLadenErlaubt').val, false, 'when variable net fee is enabled, configured NT is the governing window');
    assert.strictEqual(states.get('tarif.speicherSollW').val, 0);
  }
  {
    const { states, adapter } = await runTariffIntegration({ hour: 12, currentPrice: 0.10, netFeeEnabled: false });
    assert.strictEqual(states.get('tarif.netFeeMode').val, 'off');
    assert.strictEqual(states.get('tarif.speicherNetzLadenErlaubt').val, true, 'cheap tariff must allow charging when variable net fee is disabled');
    assert.strictEqual(states.get('tarif.speicherSollW').val, -4000);
    assert.strictEqual(adapter._tarifVis.storageGridChargeSource, 'dynamic-tariff-cheap');
  }
  {
    const { states } = await runTariffIntegration({ hour: 12, currentPrice: 0.25, netFeeEnabled: false });
    assert.strictEqual(states.get('tarif.speicherNetzLadenErlaubt').val, false, 'neutral tariff must not allow dynamic-tariff grid charging');
    assert.strictEqual(states.get('tarif.speicherSollW').val, 0);
  }
  {
    const { states } = await runTariffIntegration({ hour: 12, currentPrice: 0.10, currentPriceAgeMs: 2 * 60 * 60 * 1000, netFeeEnabled: false });
    assert.strictEqual(states.get('tarif.speicherNetzLadenErlaubt').val, false, 'stale cheap price must fail closed when net fee is disabled');
    assert.strictEqual(states.get('tarif.speicherSollW').val, 0);
  }
  {
    const { states } = await runTariffIntegration({ currentPrice: 0.25, dynamicTariff: false });
    assert.strictEqual(states.get('tarif.speicherNetzLadenErlaubt').val, false, 'NT must not charge when the dynamic tariff is disabled');
    assert.strictEqual(states.get('tarif.speicherSollW').val, 0);
  }
  {
    const { states } = await runTariffIntegration({ allowGridCharge: false });
    assert.strictEqual(states.get('tarif.speicherNetzLadenErlaubt').val, false, 'AppCenter master permission is mandatory');
  }
  {
    const { states } = await runTariffIntegration({ configureQuarter: false });
    assert.strictEqual(states.get('tarif.speicherNetzLadenErlaubt').val, false, 'missing manual quarter times must fail closed while net fee is enabled');
    assert.match(states.get('tarif.speicherZeitfensterLabel').val, /nicht konfiguriert/);
  }
  {
    const { states } = await runTariffIntegration({ netFeeModel: 1, configureQuarter: false, configureSimple: false });
    assert.strictEqual(states.get('tarif.speicherNetzLadenErlaubt').val, false, 'missing manual simple NT times must fail closed without hidden defaults');
    assert.match(states.get('tarif.speicherZeitfensterLabel').val, /nicht konfiguriert/);
  }
}

function testWiring() {
  const charging = fs.readFileSync(path.join(__dirname, '../ems/modules/charging-management.js'), 'utf8');
  const main = fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8');
  const tariff = fs.readFileSync(path.join(__dirname, '../ems/modules/tarif-vis.js'), 'utf8');
  const storage = fs.readFileSync(path.join(__dirname, '../ems/modules/storage-control.js'), 'utf8');

  assert.match(charging, /setpointTarget\.enable = availability\.requested === true/);
  assert.doesNotMatch(charging, /setpointTarget\.enable = safetyForcedStop/);
  assert.doesNotMatch(charging, /setpointTarget\.enable[\s\S]{0,180}!w\.operationalBlocked/);
  assert.match(charging, /rfidEnforced/);
  assert.match(charging, /availabilityOwner/);
  const deactivateStart = charging.indexOf('async deactivate() {');
  const deactivateEnd = charging.indexOf('async init() {', deactivateStart);
  const deactivateBlock = charging.slice(deactivateStart, deactivateEnd);
  assert.ok(deactivateStart >= 0 && deactivateEnd > deactivateStart, 'charging deactivate block missing');
  assert(!deactivateBlock.includes('cm.wb.${safe}.en'), 'module deactivate must not include the availability mapping');
  assert.doesNotMatch(deactivateBlock, /enableWriteId/);

  const enableBranch = main.indexOf('} else if (wb.enableWriteId) {');
  const legacyBranch = main.indexOf('} else if (wb.activeId) {', enableBranch + 1);
  assert.ok(enableBranch >= 0, 'RFID availability branch missing');
  assert.ok(legacyBranch > enableBranch, 'enableWriteId must precede legacy activeId');
  assert.match(main, /const want = !!authorized && customerStationEnabled/);
  assert.match(main, /Kundensperre Wallbox lp\$\{idx\} hat Vorrang vor RFID/);

  assert.doesNotMatch(tariff, /storageChargeStartMin/);
  assert.doesNotMatch(tariff, /cheapOrNtWanted/);
  assert.match(tariff, /storageGridChargeAllowed/);
  assert.match(tariff, /tarif\.speicherNetzLadenErlaubt/);
  assert.match(tariff, /manualNtWindowActive: storageChargeWindowOk/);
  assert.match(tariff, /source: 'net-fee-nt-cheap'/);
  assert.match(tariff, /source: 'dynamic-tariff-cheap'/);
  assert.doesNotMatch(tariff, /\? '22:00' : ntStartRaw/);
  assert.doesNotMatch(tariff, /\? '06:00' : ntEndRaw/);

  assert.doesNotMatch(storage, /getEntry\('cm\.gridChargeAllowed'\)/, 'storage must not reuse the EVCS tariff gate');
  assert.doesNotMatch(storage, /getEntry\('st\.tariffGridChargeAllowed'\)/, 'a persisted boolean alone must never reopen storage grid charging');
  assert.match(storage, /resolveStrictStorageTariffPermission/);
  assert.match(storage, /gridChargeBlockedByTariffGate/);
  assert.match(storage, /resolveStorageGridChargeFinalGate/);
}

(async () => {
  testEvcsAvailability();
  await testEvcsActuatorContract();
  await testChargingModuleDeactivateDoesNotLock();
  await testAvailabilitySelfHealIntegration();
  testStorageTariffGate();
  testStorageFinalFirewall();
  await testTariffIntegration();
  testWiring();
  console.log('[rc63-availability-storage-grid-gate] OK: availability only customer/RFID; storage grid charge only with fresh cheap dynamic tariff and, when enabled, active NT; PV charging unaffected.');
})().catch((error) => {
  console.error('[rc63-availability-storage-grid-gate] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
