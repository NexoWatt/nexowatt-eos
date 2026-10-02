#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  ChargingManagementModule,
  inferIoBrokerOcppConnectorContext,
  belongsToOcppConnectorContext,
  resolveOcppCanonicalObjectId,
} = require('../ems/modules/charging-management');
const {
  beginSafetyCycle,
  markSafetyModuleResult,
  buildSafetyEnvelope,
  evaluateSafetyCommandPermission,
} = require('../ems/services/safety-envelope');

function makeTickHarness() {
  const states = new Map();
  const writes = [];
  const now = Date.now();
  const adapter = {
    namespace: 'nexowatt-ui.0',
    config: {
      enableChargingManagement: true,
      _chargingHasAnySetpoint: true,
      settingsConfig: { evcsCount: 1, stationGroups: [] },
      installerConfig: {
        gridConnectionPower: 30000,
        gridPhaseCount: 3,
        safetyMeterTimeoutSec: 30,
      },
      peakShaving: { maxPhaseA: 0 },
      chargingManagement: {
        mode: 'mixed',
        totalBudgetMode: 'static',
        staticMaxChargingPowerW: 11000,
        voltageV: 230,
        defaultPhases: 3,
        minCurrentA: 6,
        maxCurrentA: 16,
        wallboxes: [{
          key: 'lp1',
          name: 'OCPP21 Feldtest',
          enabled: true,
          telemetryProfile: 'nexowattocpp',
          actualPowerWId: 'ocpp21.0.CP_01.measurements.powerW',
          statusId: 'ocpp21.0.CP_01.info.status',
          transactionActiveId: 'ocpp21.0.CP_01.transactions.transactionActive',
          onlineId: 'ocpp21.0.CP_01.info.socketConnected',
          dataFreshId: 'ocpp21.0.CP_01.health.dataFresh',
          heartbeatId: 'ocpp21.0.CP_01.health.lastSeenMs',
          setPowerWId: 'ocpp21.0.CP_01.control.chargeLimit',
          enableId: 'ocpp21.0.CP_01.control.availability',
          maxPowerW: 11000,
          minA: 6,
          maxA: 16,
          phases: 3,
          userModeDefault: 'boost',
          controlBasis: 'powerW',
        }],
      },
    },
    _nvpFreshnessSnapshot: {
      ts: now,
      usable: true,
      fresh: true,
      connected: true,
      netW: 1000,
      status: 'ok',
      source: 'rc59-test-meter',
      reason: 'fresh',
      measurementAgeMs: 0,
      heartbeatAgeMs: 0,
    },
    _emsCaps: {},
    _emsBudget: {
      mode: 'rc59-test',
      gates: { grid: { effectiveW: 30000 }, pv: { effectiveW: 0 } },
      remainingTotalW: 30000,
      remainingPvW: 0,
      reservations: [],
    },
    log: { debug() {}, info() {}, warn() {}, error() {} },
    async setStateAsync(id, value) {
      states.set(id, value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val') ? value.val : value);
    },
    async getStateAsync(id) {
      return states.has(id) ? { val: states.get(id), ts: Date.now(), ack: true } : null;
    },
    async setObjectNotExistsAsync() {},
    async getObjectAsync() { return null; },
    _nwRequestImmediateEmsTick() { return true; },
  };

  states.set('chargingManagement.wallboxes.lp1.userMode', 'boost');
  states.set('chargingManagement.wallboxes.lp1.userAutoSource', 'standard');
  states.set('chargingManagement.wallboxes.lp1.userStationEnabled', true);
  states.set('chargingManagement.wallboxes.lp1.userEnabled', true);
  states.set('chargingManagement.wallboxes.lp1.userStorageAssistEnabled', false);

  const values = new Map();
  const entries = new Map();
  const dp = {
    entries,
    lastWriteByObjectId: new Map(),
    async upsert(entry) {
      entries.set(entry.key, entry);
      if (entry.key.endsWith('.pW')) values.set(entry.key, 4380);
      else if (entry.key.endsWith('.onlineRaw')) values.set(entry.key, true);
      else if (entry.key.endsWith('.dataFreshRaw')) values.set(entry.key, true);
      else if (entry.key.endsWith('.st')) values.set(entry.key, 'Charging');
      else if (entry.key.endsWith('.transactionActiveRaw')) values.set(entry.key, true);
      else if (entry.key.endsWith('.heartbeatRaw')) values.set(entry.key, Date.now());
      else if (entry.key.endsWith('.ocppAdapterAliveRaw')) values.set(entry.key, true);
      return entry;
    },
    getEntry(key) { return entries.get(key) || null; },
    getNumber(key, fallback = null) {
      const value = values.get(key);
      return Number.isFinite(Number(value)) ? Number(value) : fallback;
    },
    getRaw(key, fallback = null) { return values.has(key) ? values.get(key) : fallback; },
    getAgeMs() { return 0; },
    getMeasurementAgeMs() { return 0; },
    getConnectionStatus() { return true; },
    async writeNumber(key, value) { writes.push({ key, value: Number(value) }); values.set(key, Number(value)); return true; },
    async writeBoolean(key, value) { writes.push({ key, value: !!value }); values.set(key, !!value); return true; },
  };

  return { adapter, dp, states, writes };
}

(async () => {
  // 1) The productive contract is always the native OCPP21 tree.
  const native = inferIoBrokerOcppConnectorContext('ocpp21.0.CP_01.measurements.powerW');
  assert.equal(native.detected, true);
  assert.equal(native.contractVersion, 'nexowatt-ocpp21-0.4-native');
  assert.equal(native.adapterKind, 'nexowatt-ocpp21-native-compact');
  assert.equal(native.actualPowerId, 'ocpp21.0.CP_01.measurements.powerW');
  assert.equal(native.energyTotalId, 'ocpp21.0.CP_01.measurements.energyKWh');
  assert.equal(native.statusId, 'ocpp21.0.CP_01.info.status');
  assert.equal(native.transactionActiveId, 'ocpp21.0.CP_01.transactions.transactionActive');
  assert.equal(native.socketConnectedId, 'ocpp21.0.CP_01.info.socketConnected');
  assert.equal(native.dataFreshId, 'ocpp21.0.CP_01.health.dataFresh');
  assert.equal(native.heartbeatId, 'ocpp21.0.CP_01.health.lastSeenMs');
  assert.equal(native.vehicleSocId, 'ocpp21.0.CP_01.measurements.socPercent');
  assert.equal(native.setPowerId, 'ocpp21.0.CP_01.control.chargeLimit');
  assert.equal(native.availabilityId, 'ocpp21.0.CP_01.control.availability');

  // 2) Old aliases are accepted only to identify the station and are then
  // canonicalised to the direct native IDs.
  const alias = inferIoBrokerOcppConnectorContext('alias.0.nexowatt.ocpp.0.CP_01.powerW');
  assert.equal(alias.detected, true);
  assert.equal(alias.adapterKind, 'nexowatt-ocpp21-alias-migration');
  assert.equal(alias.actualPowerId, native.actualPowerId);
  assert.equal(alias.socketConnectedId, native.socketConnectedId);
  assert.equal(alias.setPowerId, native.setPowerId);
  assert.equal(belongsToOcppConnectorContext('alias.0.nexowatt.ocpp.0.CP_01.powerW', native), true);
  assert.equal(
    resolveOcppCanonicalObjectId('alias.0.nexowatt.ocpp.0.CP_01.powerW', native, 'power'),
    native.actualPowerId,
  );
  assert.equal(
    resolveOcppCanonicalObjectId('alias.0.nexowatt.ocpp.0.CP_01.chargeLimit', native, 'setPower'),
    native.setPowerId,
  );
  assert.equal(
    resolveOcppCanonicalObjectId('mqtt.0.customer.wallbox.power', native, 'power'),
    'mqtt.0.customer.wallbox.power',
    'Non-OCPP custom mappings must remain untouched',
  );
  assert.equal(
    resolveOcppCanonicalObjectId('ocpp21.0.OTHER.measurements.powerW', native, 'power'),
    'ocpp21.0.OTHER.measurements.powerW',
    'Another station must never be rewritten',
  );

  // 3) Run a complete charging tick with the native OCPP21 mapping. RC58 threw
  // ReferenceError here while creating the wallbox diagnostics, which made the
  // safety-critical module fail and consequently clamped the storage farm to 0 W.
  const { adapter, dp, states, writes } = makeTickHarness();
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
  await module.tick();
  module.stop();

  const migrationJson = states.get('chargingManagement.wallboxes.lp1.ocppDatapointMappingMigrations');
  assert.equal(typeof migrationJson, 'string');
  assert.deepEqual(JSON.parse(migrationJson), []);
  assert(writes.some((row) => row.key === 'cm.wb.lp1.setW' && row.value === 11000), 'Boost target must reach the single writer');

  // 4) A successful charging cycle must allow the next safety envelope to
  // recover. We deliberately keep the fail-safe design: storage is not allowed
  // to bypass a broken safety-critical charging module.
  beginSafetyCycle(adapter, 59, Date.now());
  markSafetyModuleResult(adapter, 'chargingManagement', true, '', 59, Date.now());
  adapter._nwSafetyCriticalFaults = {};
  const envelope = buildSafetyEnvelope({
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
    budgetSnapshot: { gates: { pv: { effectiveW: 0 } } },
    now: Date.now(),
    generation: 59,
  });
  assert.equal(envelope.valid, true, envelope.invalidReason || 'safety envelope must recover');
  const storagePermission = evaluateSafetyCommandPermission(adapter, {
    key: 'storage:farm',
    app: 'storage',
    requestedActive: true,
    now: Date.now(),
  });
  assert.equal(storagePermission.allowed, true, storagePermission.reason);

  // 5) Source guards prevent a repeat of the exact production fault and ensure
  // automatic discovery no longer uses aliases.
  const root = path.resolve(__dirname, '..');
  const chargingSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/charging-management.ts'), 'utf8');
  const mainSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/main.ts'), 'utf8');
  const uiSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/www/ems-apps.ts'), 'utf8');
  const managerSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/module-manager.ts'), 'utf8');
  const storageSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/storage-control.ts'), 'utf8');

  assert(chargingSource.includes('ocppDatapointMappingMigrations: Array.isArray(ocppDatapointMigrations)'));
  assert(!/^\s*ocppDatapointMappingMigrations,\s*$/m.test(chargingSource), 'Undefined shorthand must never return');
  assert(mainSource.includes("getForeignObjectsAsync('ocpp21.*', 'state')"));
  const discoveryBlock = mainSource.slice(mainSource.indexOf('// --- OCPP discovery'), mainSource.indexOf('let objects = {};', mainSource.indexOf('// --- OCPP discovery')));
  assert(!discoveryBlock.includes("'alias.0.nexowatt.ocpp.*'"));
  assert(!discoveryBlock.includes("'alias.0.ocpp21.*'"));
  assert(mainSource.includes("discoveryContract: 'nexowatt-ocpp21-0.4-native'"));
  assert(uiSource.includes('Alias paths of the same station are always migrated to the direct native'));
  assert(uiSource.includes('Fremde Ladepunkte wurden nicht überschrieben'));
  assert(uiSource.includes('function _ocppStationIdentityFromRow(row)'));
  assert(uiSource.includes('function _isEmptyEvcsMappingRow(row)'));
  assert(uiSource.includes('Never overwrite a Modbus/MQTT or'));
  const mapExistingBlock = uiSource.slice(
    uiSource.indexOf('async function ocppMapExisting()'),
    uiSource.indexOf('// ------------------------------', uiSource.indexOf('async function ocppMapExisting()')),
  );
  assert(!mapExistingBlock.includes('list[i] = _applyOcppConnectorToRow(list[i], connectors[i]'), 'Existing rows must not be paired with OCPP stations by list index');
  assert(mapExistingBlock.includes('_ocppStationIdentityFromRow(row) === connectorIdentity'));
  assert(mapExistingBlock.includes('_isEmptyEvcsMappingRow(row)'));
  assert(managerSource.includes("'chargingManagement'"), 'Charging management must remain safety-critical');
  assert(storageSource.includes('liveSafetyEnvelope(this.adapter, this.dp'), 'Storage final writer must retain the shared safety gate');

  console.log('[rc59-ocpp21-native-storage-safety] OK: direct OCPP21 mapping, charging tick diagnostics and storage-farm safety recovery are consistent.');
})().catch((error) => {
  console.error('[rc59-ocpp21-native-storage-safety] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
