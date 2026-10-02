'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const compatibility = require('./helpers/compatibilityHarness.cjs');
const DeviceRuntime = compatibility.loadDeviceRuntime(path.join(root, 'lib/deviceRuntime.js'));
const templatesDoc = JSON.parse(fs.readFileSync(path.join(root, 'lib/templates.json'), 'utf8'));

function templateById(id) {
  const template = templatesDoc.templates.find((entry) => entry && entry.id === id);
  assert.ok(template, `missing template ${id}`);
  return template;
}

function createRuntime(templateId, deviceId = 'evcs1') {
  const writes = [];
  const adapter = {
    namespace: 'nexowatt-devices.0',
    log: { debug() {}, info() {}, warn() {}, error() {} },
    async setStateAsync(id, state) {
      writes.push({ id: String(id), val: state && state.val, ack: state && state.ack });
    },
  };
  const template = templateById(templateId);
  const runtime = new DeviceRuntime(adapter, {
    id: deviceId,
    templateId: template.id,
    category: template.category,
    manufacturer: template.manufacturer,
    protocol: (template.protocols || [])[0] || 'modbusTcp',
    connection: {},
  }, template, {});

  for (const dp of template.datapoints || []) {
    runtime.dpById.set(dp.id, dp);
    runtime.dpByStateRelId.set(runtime.relStateId(dp), dp);
  }
  const definitions = runtime._buildAliasDefinitions();
  runtime.aliasDefs = definitions;
  for (const def of definitions) runtime.aliasByStateRelId.set(def.relId, def);
  runtime._liveAliasRefreshMs = runtime._computeLiveAliasRefreshMs({ fastIntervalMs: 5000 });

  return {
    runtime,
    writes,
    count(id) {
      return writes.filter((entry) => entry.id === id).length;
    },
  };
}

function ageCachedState(runtime, relId, ageMs = 6000) {
  const cached = runtime._stateCache.get(relId);
  assert.ok(cached, `state was not cached: ${relId}`);
  cached.writtenAt = Date.now() - ageMs;
  runtime._stateCache.set(relId, cached);
}

function ageAllFreshnessAliases(runtime, ageMs = 6000) {
  for (const [relId, cached] of runtime._stateCache.entries()) {
    if (!runtime._isEvChargerFreshnessAlias(relId)) continue;
    cached.writtenAt = Date.now() - ageMs;
    runtime._stateCache.set(relId, cached);
  }
}

test('all EVCS/EVSE templates receive the generic live-status refresh while other device classes stay change-only', () => {
  const chargerTemplates = templatesDoc.templates.filter((entry) => ['EVCS', 'EVSE'].includes(String(entry.category || '').toUpperCase()));
  assert.ok(chargerTemplates.length >= 20, 'expected the complete EV charger template library');

  for (const template of chargerTemplates) {
    const runtime = compatibility.buildRuntime(DeviceRuntime, template, `fresh-${template.id}`);
    const refreshMs = runtime._computeLiveAliasRefreshMs({ fastIntervalMs: 5000 });
    assert.equal(runtime.aliasDeviceClass, 'evCharger', template.id);
    assert.equal(refreshMs, 5000, template.id);
  }

  const storage = templateById('ess.fenecon.FeneconHomeEssImpl');
  const storageRuntime = compatibility.buildRuntime(DeviceRuntime, storage, 'storage-freshness');
  assert.notEqual(storageRuntime.aliasDeviceClass, 'evCharger');
  assert.equal(storageRuntime._computeLiveAliasRefreshMs({ fastIntervalMs: 5000 }), 0);
});

test('idle MENNEKES status and measurement aliases are re-published after every fresh 5 s snapshot even when values remain unchanged', async () => {
  const { runtime, count } = createRuntime('evcs.mennekes.amtron4you500.4business700.modbusTcp');
  const values = {
    cHARGE_POINT_STATE: 1,
    vEHICLE_STATE: 0,
    cHARGE_POINT_AVAILABILITY: 1,
    aCTIVE_POWER: 0,
    cURRENT_L1: 0,
    cURRENT_L2: 0,
    cURRENT_L3: 0,
    aCTIVE_PRODUCTION_ENERGY: 10,
    eNERGY_SESSION: 0,
    sET_CHARGING_CURRENT: 0,
    eV_SET_CHARGE_POWER_LIMIT: 0,
  };
  const ctx = { connected: true, lastError: '' };

  await runtime._updateAliases(values, ctx);

  const legacyPower = 'devices.evcs1.aliases.r.power';
  const standardPower = 'devices.evcs1.aliases.v1.r.power';
  const legacyStatus = 'devices.evcs1.aliases.r.statusCode';
  const standardStatus = 'devices.evcs1.aliases.v1.r.statusCode';
  const legacyVehicle = 'devices.evcs1.aliases.r.vehicleConnected';
  const standardVehicle = 'devices.evcs1.aliases.v1.r.vehicleConnected';
  const legacyEnergy = 'devices.evcs1.aliases.r.energyTotal';
  const standardEnergy = 'devices.evcs1.aliases.v1.r.energyTotal';

  for (const id of [legacyPower, standardPower, legacyStatus, standardStatus, legacyVehicle, standardVehicle]) {
    assert.equal(count(id), 1, id);
  }
  assert.equal(count(legacyEnergy), 1);
  assert.equal(count(standardEnergy), 1);

  // An immediate duplicate snapshot is still coalesced; the refresh does not flood ioBroker.
  await runtime._updateAliases(values, ctx);
  assert.equal(count(legacyPower), 1);
  assert.equal(count(standardPower), 1);

  // Once the bounded freshness interval has elapsed, the same measured values are
  // deliberately written again. ioBroker therefore receives a new ts while lc can
  // remain unchanged, which is the required liveness signal for NexoWatt UI.
  ageAllFreshnessAliases(runtime);
  await runtime._updateAliases(values, ctx);

  for (const id of [legacyPower, standardPower, legacyStatus, standardStatus, legacyVehicle, standardVehicle]) {
    assert.equal(count(id), 2, id);
  }

  // Static/cumulative values remain change-only and are not periodically re-published.
  assert.equal(count(legacyEnergy), 1);
  assert.equal(count(standardEnergy), 1);
});

test('ABL idle zero values use the same generic EV-charger freshness path', async () => {
  const { runtime, count } = createRuntime('evcs.abl.emh1.evcc2_3.modbusAscii');
  const values = {
    eVSE_STATE: 0xA1,
    cURRENT_L1: null,
    cURRENT_L2: null,
    cURRENT_L3: null,
    iCMAX_DUTY_CYCLE_PCT: 100,
  };
  const ctx = { connected: true, lastError: '' };
  const legacyPower = 'devices.evcs1.aliases.r.power';
  const standardPower = 'devices.evcs1.aliases.v1.r.power';

  await runtime._updateAliases(values, ctx);
  assert.equal(count(legacyPower), 1);
  assert.equal(count(standardPower), 1);

  ageCachedState(runtime, legacyPower);
  ageCachedState(runtime, standardPower);
  await runtime._updateAliases(values, ctx);

  assert.equal(count(legacyPower), 2);
  assert.equal(count(standardPower), 2);
});

test('communication loss never fabricates a fresh power/status timestamp', async () => {
  const { runtime, count } = createRuntime('evcs.mennekes.amtron4you500.4business700.modbusTcp');
  const values = {
    cHARGE_POINT_STATE: 1,
    vEHICLE_STATE: 0,
    cHARGE_POINT_AVAILABILITY: 1,
    aCTIVE_POWER: 0,
    cURRENT_L1: 0,
    cURRENT_L2: 0,
    cURRENT_L3: 0,
  };
  const legacyPower = 'devices.evcs1.aliases.r.power';
  const standardPower = 'devices.evcs1.aliases.v1.r.power';

  await runtime._updateAliases(values, { connected: true, lastError: '' });
  ageCachedState(runtime, legacyPower);
  ageCachedState(runtime, standardPower);

  await runtime._updateAliases({}, { connected: false, lastError: 'timeout' });
  assert.equal(count(legacyPower), 1);
  assert.equal(count(standardPower), 1);
  assert.equal(count('devices.evcs1.aliases.comm.connected'), 2, 'connection alias must still switch to false');
});

test('heartbeat online state is periodically refreshed only after real EV charger data', async () => {
  const { runtime, count } = createRuntime('evcs.mennekes.amtron4you500.4business700.modbusTcp');
  runtime.started = true;
  runtime._liveAliasRefreshMs = 5000;
  runtime._hbLastWriteAt = 0;

  await runtime._tickHeartbeatFromIncomingData();
  const legacyOnline = 'devices.evcs1.aliases.r.online';
  const standardOnline = 'devices.evcs1.aliases.v1.r.online';
  assert.equal(count(legacyOnline), 1);
  assert.equal(count(standardOnline), 1);

  ageCachedState(runtime, legacyOnline);
  ageCachedState(runtime, standardOnline);
  runtime._hbLastWriteAt = 0;
  await runtime._tickHeartbeatFromIncomingData();

  assert.equal(count(legacyOnline), 2);
  assert.equal(count(standardOnline), 2);
});
