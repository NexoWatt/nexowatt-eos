#!/usr/bin/env node
'use strict';

/**
 * Regression 0.8.139:
 * - exactly one NVP target/hysteresis owner per active storage topology;
 * - MultiUse consumes the active topology tuning and never overrides it;
 * - Pro rated power scales ramps, not command resolution;
 * - the measurement tolerance only suppresses noise; outside it the controller targets the center;
 * - exact center corrections survive generic, Sungrow split and storage-farm paths.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  SpeicherRegelungModule,
  resolveNvpBandTarget,
} = require('../ems/modules/storage-control');
const {
  resolveStorageOperatingPolicy,
  resolveStorageNvpTuning,
} = require('../ems/services/storage-self-consumption-policy');
const { buildNvpCoordinatorSnapshot } = require('../ems/modules/nvp-coordinator');
const featureFlags = require('../ems/services/feature-flags');

const root = path.resolve(__dirname, '..');
const now = () => Date.now();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

function entry(val, objectId, ts = now()) {
  return { val, objectId, ts };
}

class FakeDp {
  constructor(entries = {}) {
    this.entries = entries;
    this.writes = [];
  }
  getEntry(key) { return this.entries[key] || null; }
  getMeasurementTimestampMs(key) {
    const rec = this.entries[key];
    return rec && Number.isFinite(Number(rec.ts)) ? Number(rec.ts) : null;
  }
  getAgeMs(key) {
    const ts = this.getMeasurementTimestampMs(key);
    return ts === null ? null : Math.max(0, now() - ts);
  }
  getNumberFresh(key, staleMs, fallback = null) {
    const rec = this.entries[key];
    if (!rec) return fallback;
    const age = this.getAgeMs(key);
    if (age !== null && Number.isFinite(Number(staleMs)) && age > Number(staleMs)) return fallback;
    const n = Number(rec.val);
    return Number.isFinite(n) ? n : fallback;
  }
  getNumber(key, fallback = null) {
    const rec = this.entries[key];
    const n = Number(rec && rec.val);
    return Number.isFinite(n) ? n : fallback;
  }
  getBoolean(key, fallback = false) {
    const rec = this.entries[key];
    if (!rec) return fallback;
    if (rec.val === true || rec.val === 1 || rec.val === '1' || rec.val === 'true') return true;
    if (rec.val === false || rec.val === 0 || rec.val === '0' || rec.val === 'false') return false;
    return fallback;
  }
  getRaw(key) { return this.entries[key] ? this.entries[key].val : null; }
  async writeNumber(key, value) {
    const val = Number(value);
    const previous = this.entries[key] || { objectId: `test.${key}` };
    this.entries[key] = { ...previous, val, ts: now() };
    this.writes.push({ key, value: val });
    return true;
  }
  async writeBoolean(key, value) {
    const val = !!value;
    const previous = this.entries[key] || { objectId: `test.${key}` };
    this.entries[key] = { ...previous, val, ts: now() };
    this.writes.push({ key, value: val });
    return true;
  }
  lastWrite(key) {
    const rows = this.writes.filter((row) => row.key === key);
    return rows.length ? rows[rows.length - 1].value : null;
  }
}

function buildAuthority(topology, multiUsePolicyActive = false, rows = []) {
  return {
    selectedTopology: topology,
    writerActive: topology !== 'none',
    reason: `${topology}-test`,
    singleAppActive: topology === 'single',
    singleSuppressedByFarm: topology === 'farm',
    farmAggregationActive: topology === 'farm',
    farmDispatchActive: topology === 'farm',
    farm: { active: topology === 'farm', dispatchActive: topology === 'farm', rows },
    multiUsePolicyActive,
  };
}

function makeAdapter({ topology = 'single', vendorProfile = 'generic', multiUseActive = false, farmTuning = null } = {}) {
  const states = new Map();
  const farmWrites = [];
  const farmRows = [
    { enabled: true, setSignedPowerId: 'farm.1.setPowerW' },
    { enabled: true, setSignedPowerId: 'farm.2.setPowerW' },
  ];
  if (topology === 'farm') {
    states.set('storageFarm.totalPowerW', { val: 0, ts: now(), ack: true });
    states.set('storageFarm.totalSocOnline', { val: 80, ts: now(), ack: true });
    states.set('storageFarm.totalSoc', { val: 80, ts: now(), ack: true });
  }

  const adapter = {
    _nwLicenseOk: true,
    _nwLicenseInfo: { ok: true, edition: 'eos' },
    config: {
      enableStorageControl: topology === 'single',
      enableStorageFarm: topology === 'farm',
      enableMultiUse: multiUseActive,
      enablePeakShaving: false,
      enableGridConstraints: false,
      installerConfig: {
        storageMultiUse: {
          enabled: multiUseActive,
          reserveEnabled: false,
          peakEnabled: false,
          selfEnabled: true,
          selfMinSocPct: 0,
          selfMaxSocPct: 100,
          // Legacy values must be ignored by the NVP resolver.
          selfTargetGridImportW: 500,
          selfImportThresholdW: 300,
        },
      },
      storageFarm: topology === 'farm' ? {
        selfTargetGridImportW: farmTuning ? farmTuning.targetW : 0,
        selfImportThresholdW: farmTuning ? farmTuning.hysteresisW : 50,
        storages: farmRows,
      } : {},
      storage: {
        controlMode: 'targetPower',
        vendorProfile,
        ratedPowerW: 62000,
        staleTimeoutSec: 15,
        maxDeltaWPerTick: 10000,
        pvMaxDeltaWPerTick: 10000,
        pvEnabled: true,
        selfDischargeEnabled: true,
        selfMinSocPct: 0,
        selfMaxSocPct: 100,
        standaloneSelfDischargeEnabled: true,
        standaloneSelfMinSocPct: 0,
        standaloneSelfMaxSocPct: 100,
        standaloneSelfTargetGridImportW: topology === 'farm' ? 200 : 0,
        standaloneSelfImportThresholdW: topology === 'farm' ? 100 : 50,
        selfTargetGridImportW: topology === 'farm' ? 200 : 0,
        selfImportThresholdW: topology === 'farm' ? 100 : 50,
        maxChargeW: 62000,
        maxDischargeW: 62000,
        sungrowTargetGridImportW: 900,
        sungrowImportThresholdW: 700,
      },
    },
    stateCache: {},
    log: { warn() {}, info() {}, debug() {}, error() {} },
    async setObjectNotExistsAsync() {},
    async setStateAsync(id, value) {
      const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val') ? value.val : value;
      states.set(String(id), { val, ts: now(), ack: true });
    },
    async getStateAsync(id) { return states.get(String(id)) || null; },
    _nwGetNumberFromCache() { return null; },
    _nwGetCacheAgeMs() { return null; },
    _nwGetNumberFromCacheFresh(_id, _age, fallback = null) { return fallback; },
    _nwGetStorageControlAuthority() { return buildAuthority(topology, multiUseActive, farmRows); },
    _nwGetStorageFarmRuntimeInfo() { return buildAuthority('farm', multiUseActive, farmRows).farm; },
    async applyStorageFarmTargetW(targetW) {
      farmWrites.push(Number(targetW));
      return {
        applied: true,
        commandEffective: true,
        writeOk: true,
        requestSatisfied: true,
        partiallyAccepted: false,
        status: 'farm-ok',
        reason: 'farm-ok',
        requestedW: Number(targetW),
        plannedDeliveredW: Number(targetW),
        acceptedDeliveredW: Number(targetW),
        deliveredW: Number(targetW),
        failedW: 0,
        unservedW: 0,
      };
    },
    _states: states,
    _farmWrites: farmWrites,
  };
  return adapter;
}

async function runRuntime({ topology = 'single', vendorProfile = 'generic', multiUseActive = false, farmTuning = null } = {}) {
  const adapter = makeAdapter({ topology, vendorProfile, multiUseActive, farmTuning });
  const entries = {
    'grid.powerW': entry(-65, 'meter.nvp.filtered'),
    'grid.powerRawW': entry(-65, 'meter.nvp.raw'),
    'st.socPct': entry(80, 'storage.soc'),
    'st.batteryPowerW': entry(0, 'storage.actualPower'),
  };
  if (vendorProfile === 'sungrow-hybrid') {
    entries['st.targetChargePowerW'] = entry(0, 'sungrow.ctrl.chargePowerW');
    entries['st.targetDischargePowerW'] = entry(0, 'sungrow.ctrl.dischargePowerW');
    entries['st.run'] = entry(false, 'sungrow.ctrl.run');
  } else {
    entries['st.targetPowerW'] = entry(0, 'storage.ctrl.signedPowerW');
  }
  const dp = new FakeDp(entries);
  const module = new SpeicherRegelungModule(adapter, dp);
  await module.tick();
  const state = (id) => adapter._states.get(id)?.val;
  return { adapter, dp, module, state };
}

(async () => {
  const below = resolveNvpBandTarget(-65, 0, 50);
  assert.deepStrictEqual(
    { active: below.activeTargetNvpW, error: below.bandErrorW, side: below.side },
    { active: 0, error: -65, side: 'below' },
  );
  const above = resolveNvpBandTarget(65, 0, 50);
  assert.deepStrictEqual(
    { active: above.activeTargetNvpW, error: above.bandErrorW, side: above.side },
    { active: 0, error: 65, side: 'above' },
  );
  assert.strictEqual(resolveNvpBandTarget(30, 0, 50).bandErrorW, 0, 'inside band must not create a new correction');

  const coordinatorBelow = buildNvpCoordinatorSnapshot({
    now: now(),
    nvpUsable: true,
    rawNvpW: -65,
    nvpTargetW: 0,
    deadbandW: 50,
    topology: 'none',
  });
  assert.strictEqual(coordinatorBelow.nvpCenterErrorW, -65, 'coordinator must retain center error for diagnostics');
  assert.strictEqual(coordinatorBelow.nvpErrorW, -65, 'coordinator control error must point to the target center outside tolerance');
  assert.strictEqual(coordinatorBelow.nvpBandLowerW, -50);
  assert.strictEqual(coordinatorBelow.nvpBandUpperW, 50);
  assert.strictEqual(coordinatorBelow.nvpActiveTargetW, 0);
  assert.strictEqual(coordinatorBelow.withinBand, false);
  const coordinatorInside = buildNvpCoordinatorSnapshot({
    now: now(),
    nvpUsable: true,
    rawNvpW: 30,
    nvpTargetW: 0,
    deadbandW: 50,
    topology: 'none',
  });
  assert.strictEqual(coordinatorInside.nvpErrorW, 0);
  assert.strictEqual(coordinatorInside.withinBand, true);

  const singleTuning = resolveStorageNvpTuning({
    storageConfig: { standaloneSelfTargetGridImportW: 0, standaloneSelfImportThresholdW: 50 },
    storageFarmConfig: { selfTargetGridImportW: 200, selfImportThresholdW: 100 },
    multiUseConfig: { enabled: true, selfTargetGridImportW: 500, selfImportThresholdW: 300 },
    multiUseActive: true,
    selectedTopology: 'single',
  });
  assert.strictEqual(singleTuning.targetGridImportW, 0);
  assert.strictEqual(singleTuning.importThresholdW, 50);
  assert.strictEqual(singleTuning.topology, 'single');
  assert.strictEqual(singleTuning.multiUseTuningIgnored, true);

  const farmTuning = resolveStorageNvpTuning({
    storageConfig: { standaloneSelfTargetGridImportW: 200, standaloneSelfImportThresholdW: 100 },
    storageFarmConfig: { selfTargetGridImportW: 0, selfImportThresholdW: 50 },
    multiUseConfig: { enabled: true, selfTargetGridImportW: 500, selfImportThresholdW: 300 },
    multiUseActive: true,
    selectedTopology: 'farm',
  });
  assert.strictEqual(farmTuning.targetGridImportW, 0);
  assert.strictEqual(farmTuning.importThresholdW, 50);
  assert.strictEqual(farmTuning.topology, 'farm');
  assert.strictEqual(farmTuning.source, 'storageFarm');

  const farmMigration = resolveStorageNvpTuning({
    storageConfig: { standaloneSelfTargetGridImportW: 25, standaloneSelfImportThresholdW: 40 },
    storageFarmConfig: {},
    selectedTopology: 'farm',
  });
  assert.strictEqual(farmMigration.targetGridImportW, 25);
  assert.strictEqual(farmMigration.importThresholdW, 40);
  assert.strictEqual(farmMigration.farm.fallbackFromSingle, true);

  const activeMultiUsePolicy = resolveStorageOperatingPolicy({
    storageConfig: { standaloneSelfTargetGridImportW: 0, standaloneSelfImportThresholdW: 50 },
    storageFarmConfig: { selfTargetGridImportW: 0, selfImportThresholdW: 50 },
    multiUseConfig: { enabled: true, selfEnabled: true, selfMinSocPct: 0, selfMaxSocPct: 100, selfTargetGridImportW: 500, selfImportThresholdW: 300 },
    multiUseActive: true,
    selectedTopology: 'farm',
  });
  assert.strictEqual(activeMultiUsePolicy.mode, 'multiuse');
  assert.strictEqual(activeMultiUsePolicy.self.targetGridImportW, 0);
  assert.strictEqual(activeMultiUsePolicy.self.importThresholdW, 50);
  assert.strictEqual(activeMultiUsePolicy.self.nvpTuningSource, 'storageFarm');

  const pro62 = featureFlags.storagePerformanceProfile('pro', 62000);
  assert.strictEqual(pro62.defaultStepW, 1, '62-kW rated power must not create a 62-W command grid');
  assert.strictEqual(pro62.defaultMaxDeltaWPerTick, 3100, 'rated power still scales dynamics');

  const generic = await runRuntime({ topology: 'single', vendorProfile: 'generic' });
  assert.strictEqual(generic.dp.lastWrite('st.targetPowerW'), -65, 'generic signed writer must correct the full 65 W to the target center');
  assert.strictEqual(generic.state('speicher.regelung.stepW'), 1);
  assert.strictEqual(generic.state('speicher.regelung.selfNvpTuningTopology'), 'single');
  assert.strictEqual(generic.state('speicher.regelung.balanceNvpBandFehlerW'), -65);

  const sungrow = await runRuntime({ topology: 'single', vendorProfile: 'sungrow-hybrid' });
  assert.strictEqual(sungrow.dp.lastWrite('st.targetChargePowerW'), 65, 'Sungrow split writer must correct the full 65 W to the target center');
  assert.strictEqual(sungrow.dp.lastWrite('st.targetDischargePowerW'), 0);
  assert.strictEqual(sungrow.dp.lastWrite('st.run'), true);
  assert.strictEqual(sungrow.state('speicher.regelung.selfNvpTuningSource'), 'storage.standaloneSelf');

  const farmRuntime = await runRuntime({
    topology: 'farm',
    vendorProfile: 'generic',
    multiUseActive: true,
    farmTuning: { targetW: 0, hysteresisW: 50 },
  });
  assert.strictEqual(farmRuntime.adapter._farmWrites.at(-1), -65, 'farm dispatcher must receive the same center-target correction');
  assert.strictEqual(farmRuntime.state('speicher.regelung.selfNvpTuningTopology'), 'farm');
  assert.strictEqual(farmRuntime.state('speicher.regelung.selfNvpTuningSource'), 'storageFarm');

  const html = read('www/ems-apps.html');
  const app = read('www/ems-apps.js');
  assert(html.includes('id="storageSelfTargetGridImportW" class="nw-config-input" type="number" min="0" step="1"'));
  assert(html.includes('id="storageSelfImportThresholdW" class="nw-config-input" type="number" min="0" step="1"'));
  assert(html.includes('id="storageFarmSelfTargetGridImportW"'));
  assert(html.includes('id="storageFarmSelfImportThresholdW"'));
  assert(!html.includes('id="muSelfTargetGridW"'), 'MultiUse must not expose a second NVP target');
  assert(!html.includes('id="muSelfDeadbandW"'), 'MultiUse must not expose a second NVP hysteresis');
  assert(app.includes('patch.storageFarm.selfTargetGridImportW = _clampInt('));
  assert(app.includes('patch.storageFarm.selfImportThresholdW = _clampInt('));
  assert(app.includes('NVP-Zielmitte/Messtoleranz: wird aus der aktiven App Speicher oder Speicherfarm übernommen'));

  console.log('[storage-nvp-topology-hysteresis] OK: 1-W resolution, center targeting outside tolerance, single/farm ownership and MultiUse inheritance are verified through real runtime writes.');
})().catch((err) => {
  console.error('[storage-nvp-topology-hysteresis] ERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
});
