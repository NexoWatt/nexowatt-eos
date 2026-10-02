#!/usr/bin/env node
'use strict';

/**
 * Regression 0.8.144:
 * - outside the small measurement tolerance the storage controller targets the
 *   configured NVP center, not a tolerance edge;
 * - the closed NVP servo bypasses the generic 500-W/tick software ramp;
 * - unchanged NVP/battery samples do not integrate the same error repeatedly;
 * - single storage and storage farm receive the same absolute total target;
 * - a fresh external NVP sample starts one debounced central EMS tick.
 */

const assert = require('assert');
const { SpeicherRegelungModule, resolveNvpBandTarget } = require('../ems/modules/storage-control');
const { EmsEngine } = require('../ems/engine');

const now = () => Date.now();
const entry = (val, objectId, ts = now()) => ({ val, objectId, ts });

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
    if ([true, 1, '1', 'true'].includes(rec.val)) return true;
    if ([false, 0, '0', 'false'].includes(rec.val)) return false;
    return fallback;
  }
  getRaw(key) { return this.entries[key] ? this.entries[key].val : null; }
  async writeNumber(key, value) {
    const val = Number(value);
    const prev = this.entries[key] || { objectId: `test.${key}` };
    this.entries[key] = { ...prev, val, ts: now() };
    this.writes.push({ key, value: val });
    return true;
  }
  async writeBoolean(key, value) {
    const val = !!value;
    const prev = this.entries[key] || { objectId: `test.${key}` };
    this.entries[key] = { ...prev, val, ts: now() };
    this.writes.push({ key, value: val });
    return true;
  }
  lastWrite(key) {
    const rows = this.writes.filter((row) => row.key === key);
    return rows.length ? rows.at(-1).value : null;
  }
}

function authority(topology, rows = []) {
  return {
    selectedTopology: topology,
    writerActive: topology !== 'none',
    reason: `${topology}-fast-nvp-test`,
    singleAppActive: topology === 'single',
    singleSuppressedByFarm: topology === 'farm',
    farmAggregationActive: topology === 'farm',
    farmDispatchActive: topology === 'farm',
    farm: { active: topology === 'farm', dispatchActive: topology === 'farm', rows },
    multiUsePolicyActive: false,
  };
}

function makeAdapter(topology = 'single') {
  const states = new Map();
  const farmTargets = [];
  const farmRows = [{ enabled: true, setSignedPowerId: 'farm.1.targetW' }];
  if (topology === 'farm') {
    states.set('storageFarm.totalPowerW', { val: 1000, ts: now(), ack: true });
    states.set('storageFarm.totalSocOnline', { val: 80, ts: now(), ack: true });
    states.set('storageFarm.totalSoc', { val: 80, ts: now(), ack: true });
    states.set('storageFarm.storagesOnline', { val: 1, ts: now(), ack: true });
    states.set('storageFarm.storagesDispatchAvailable', { val: 1, ts: now(), ack: true });
  }
  return {
    _nwLicenseOk: true,
    _nwLicenseInfo: { ok: true, edition: 'eos' },
    config: {
      enableStorageControl: topology === 'single',
      enableStorageFarm: topology === 'farm',
      enableMultiUse: false,
      enablePeakShaving: false,
      enableGridConstraints: false,
      installerConfig: { storageMultiUse: { enabled: false } },
      storageFarm: topology === 'farm'
        ? { selfTargetGridImportW: 50, selfImportThresholdW: 20, storages: farmRows }
        : {},
      storage: {
        controlMode: 'targetPower',
        vendorProfile: 'generic',
        staleTimeoutSec: 15,
        ratedPowerW: 50000,
        maxDeltaWPerTick: 500,
        pvMaxDeltaWPerTick: 500,
        stepW: 1,
        pvEnabled: true,
        selfDischargeEnabled: true,
        selfMinSocPct: 0,
        selfMaxSocPct: 100,
        standaloneSelfDischargeEnabled: true,
        standaloneSelfMinSocPct: 0,
        standaloneSelfMaxSocPct: 100,
        standaloneSelfTargetGridImportW: 50,
        standaloneSelfImportThresholdW: 20,
        selfTargetGridImportW: 50,
        selfImportThresholdW: 20,
        selfNvpFastServoEnabled: true,
        maxChargeW: 50000,
        maxDischargeW: 50000,
      },
    },
    stateCache: {},
    log: { warn() {}, info() {}, debug() {}, error() {} },
    async setObjectNotExistsAsync() {},
    async setStateAsync(id, value) {
      const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val')
        ? value.val
        : value;
      states.set(String(id), { val, ts: now(), ack: true });
    },
    async getStateAsync(id) { return states.get(String(id)) || null; },
    _nwGetNumberFromCache() { return null; },
    _nwGetCacheAgeMs() { return null; },
    _nwGetNumberFromCacheFresh(_id, _age, fallback = null) { return fallback; },
    _nwGetStorageControlAuthority() { return authority(topology, farmRows); },
    _nwGetStorageFarmRuntimeInfo() { return authority('farm', farmRows).farm; },
    async applyStorageFarmTargetW(targetW) {
      const value = Number(targetW);
      farmTargets.push(value);
      return {
        applied: true,
        commandEffective: true,
        writeOk: true,
        requestSatisfied: true,
        partiallyAccepted: false,
        status: 'farm-ok',
        reason: 'farm-ok',
        requestedW: value,
        plannedDeliveredW: value,
        acceptedDeliveredW: value,
        deliveredW: value,
        failedW: 0,
        unservedW: 0,
      };
    },
    _states: states,
    _farmTargets: farmTargets,
  };
}

async function runRuntime(topology = 'single') {
  const sampleTs = now();
  const dp = new FakeDp({
    'grid.powerW': entry(1550, 'meter.filtered', sampleTs),
    'grid.powerRawW': entry(1550, 'meter.raw', sampleTs),
    'st.socPct': entry(80, 'storage.soc', sampleTs),
    'st.batteryPowerW': entry(1000, 'storage.actualW', sampleTs),
    'st.targetPowerW': entry(0, 'storage.targetW', sampleTs),
  });
  const adapter = makeAdapter(topology);
  const module = new SpeicherRegelungModule(adapter, dp);
  await module.tick();
  return { adapter, dp, module, sampleTs };
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  const band = resolveNvpBandTarget(1550, 50, 20);
  assert.strictEqual(band.outsideBand, true);
  assert.strictEqual(band.activeTargetNvpW, 50);
  assert.strictEqual(band.bandErrorW, 1500);
  assert.strictEqual(resolveNvpBandTarget(65, 50, 20).bandErrorW, 0, 'inside tolerance must not create a correction');

  const directModule = new SpeicherRegelungModule(makeAdapter('single'), new FakeDp());
  const fast = directModule._buildActualAwareNvpBalance({
    rawNvpW: 1550,
    fallbackNvpW: 1550,
    nvpAgeMs: 0,
    targetNvpW: 50,
    deadbandW: 20,
    batteryPowerW: 1000,
    batteryMeasuredW: 1000,
    batteryAgeMs: 0,
    batteryPowerTrusted: true,
    batteryFeedbackKey: 'single|actual',
    batterySampleTs: 1000,
    balanceControlKey: 'storage-nvp',
    lastTargetW: 1000,
    lastTargetAllowed: true,
    maxDischargeCorrectionW: 500,
    maxChargeCorrectionW: 500,
    fastServoActive: true,
    preferRawNvp: true,
    stepW: 1,
  });
  assert.strictEqual(Math.round(fast.targetW), 2500, 'fast servo must write the full absolute NVP correction');
  assert(fast.mode.includes('fast-servo'));

  const legacyRamp = directModule._buildActualAwareNvpBalance({
    rawNvpW: 1550,
    fallbackNvpW: 1550,
    nvpAgeMs: 0,
    targetNvpW: 50,
    deadbandW: 20,
    batteryPowerW: 1000,
    batteryMeasuredW: 1000,
    batteryAgeMs: 0,
    batteryPowerTrusted: true,
    batteryFeedbackKey: 'single|legacy',
    batterySampleTs: 1000,
    balanceControlKey: 'storage-nvp-legacy',
    lastTargetW: 1000,
    lastTargetAllowed: true,
    maxDischargeCorrectionW: 500,
    maxChargeCorrectionW: 500,
    fastServoActive: false,
    stepW: 1,
  });
  assert.strictEqual(Math.round(legacyRamp.targetW), 1500, 'legacy path demonstrates the former 500-W/tick limitation');

  const single = await runRuntime('single');
  assert.strictEqual(single.dp.lastWrite('st.targetPowerW'), 2500, 'single storage must receive the full center target in one tick');
  assert.strictEqual(single.adapter._states.get('speicher.regelung.selfNvpFastServoActive')?.val, true);
  assert.strictEqual(single.adapter._states.get('speicher.regelung.selfNvpMeasurementToleranceW')?.val, 20);

  single.dp.writes.length = 0;
  await single.module.tick();
  assert.strictEqual(single.dp.lastWrite('st.targetPowerW'), 2500, 'unchanged samples must not integrate the same NVP error twice');

  single.dp.entries['grid.powerW'] = entry(1750, 'meter.filtered', single.sampleTs + 1000);
  single.dp.entries['grid.powerRawW'] = entry(1750, 'meter.raw', single.sampleTs + 1000);
  single.dp.writes.length = 0;
  await single.module.tick();
  assert.strictEqual(single.dp.lastWrite('st.targetPowerW'), 2700, 'a new 200-W NVP change must be followed once and absolutely');

  const farm = await runRuntime('farm');
  assert.strictEqual(farm.adapter._farmTargets.at(-1), 2500, 'farm dispatcher must receive the same absolute total target');

  let tickCount = 0;
  const timerAdapter = {
    config: { enableStorageControl: true, enableStorageFarm: false },
    _nwShuttingDown: false,
    log: { warn() {}, info() {}, debug() {}, error() {} },
    async setStateAsync() {},
  };
  const engine = new EmsEngine(timerAdapter);
  engine.dp = {};
  engine.mm = {};
  engine._nvpSourceIds = new Set(['meter.grid.import', 'meter.grid.export']);
  engine.tick = async () => { tickCount += 1; };
  assert.strictEqual(engine.handleExternalStateChange('internal.ems.gridPowerRawW', { val: 100, ts: now() }), false);
  assert.strictEqual(engine.handleExternalStateChange('meter.grid.import', { val: 500, ts: now() }), true);
  assert.strictEqual(engine.handleExternalStateChange('meter.grid.export', { val: 0, ts: now() }), true);
  await sleep(130);
  assert.strictEqual(tickCount, 1, 'paired NVP updates must be coalesced into one debounced central tick');
  engine.stop();

  console.log('[storage-nvp-fast-controller] OK: target-center servo, ramp bypass, no repeated integration, farm parity and debounced NVP ticks verified.');
})().catch((err) => {
  console.error('[storage-nvp-fast-controller] ERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
});
