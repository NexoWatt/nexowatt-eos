#!/usr/bin/env node
'use strict';

/**
 * Regression 0.8.138:
 * Ein deaktiviertes MultiUse darf keine alten Reserve-/LSK-/SoC-Zonen in die
 * normale Speicherregelung oder Speicherfarm einschleusen.
 *
 * Feldfall:
 * - NVP +1.540 W Bezug
 * - SoC 19 %
 * - alter MultiUse-Spiegel selfMinSocPct=20 %
 * - MultiUse deaktiviert
 * Erwartung: Standalone-Minimum 10 %, Sollwert +1.490 W direkt zur Zielmitte (50 W).
 */

const assert = require('assert');
const fs = require('fs');
const { resolveStorageOperatingPolicy } = require('../ems/services/storage-self-consumption-policy');
const { SpeicherRegelungModule } = require('../ems/modules/storage-control');

const nowMs = () => Date.now();

class FakeDp {
  constructor(entries = {}) {
    this.entries = entries;
    this.writes = [];
  }
  getEntry(key) { return this.entries[key] || null; }
  getAgeMs(key) {
    const rec = this.entries[key];
    return rec && Number.isFinite(Number(rec.ts)) ? Math.max(0, nowMs() - Number(rec.ts)) : null;
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
    return rec.val === true || rec.val === 1 || rec.val === '1' || rec.val === 'true';
  }
  async writeNumber(key, value) {
    const val = Number(value);
    this.writes.push({ key, value: val });
    this.entries[key] = { ...(this.entries[key] || {}), val, ts: nowMs() };
    return true;
  }
  async writeBoolean(key, value) {
    const val = !!value;
    this.writes.push({ key, value: val });
    this.entries[key] = { ...(this.entries[key] || {}), val, ts: nowMs() };
    return true;
  }
  lastNumberWrite(key) {
    const rows = this.writes.filter((row) => row.key === key && typeof row.value === 'number');
    return rows.length ? rows[rows.length - 1].value : null;
  }
}

function makeEntry(val, objectId) {
  return { val, ts: nowMs(), objectId };
}

async function runStorageTick({ multiUseActive, soc = 19, gridW = 1540 }) {
  const states = new Map();
  const multiUse = {
    enabled: !!multiUseActive,
    reserveEnabled: false,
    peakEnabled: false,
    selfEnabled: true,
    selfMinSocPct: 20,
    selfMaxSocPct: 100,
    selfTargetGridImportW: 50,
    selfImportThresholdW: 50,
  };
  const config = {
    enableStorageControl: true,
    enableStorageFarm: false,
    enableMultiUse: !!multiUseActive,
    enablePeakShaving: false,
    enableGridConstraints: false,
    installerConfig: { storageMultiUse: multiUse },
    storage: {
      controlMode: 'targetPower',
      staleTimeoutSec: 15,
      maxDeltaWPerTick: 10000,
      pvMaxDeltaWPerTick: 10000,
      stepW: 1,
      pvEnabled: true,
      pvExportThresholdW: 50,
      // Historisch von MultiUse gespiegelte Werte:
      selfDischargeEnabled: true,
      selfMinSocPct: 20,
      selfMaxSocPct: 100,
      selfTargetGridImportW: 50,
      selfImportThresholdW: 50,
      multiUsePolicyApplied: true,
      multiUsePolicyActive: !!multiUseActive,
      datapoints: { targetPowerObjectId: 'battery.target' },
    },
  };
  const adapter = {
    config,
    stateCache: {},
    _nwLicenseInfo: { ok: true, edition: 'eos' },
    log: { warn() {}, info() {}, debug() {}, error() {} },
    async setObjectNotExistsAsync() {},
    async setStateAsync(id, value) { states.set(id, { val: value, ts: nowMs() }); },
    async getStateAsync(id) { return states.get(id) || null; },
    _nwGetNumberFromCache() { return null; },
    _nwGetStorageControlAuthority() {
      return {
        selectedTopology: 'single',
        writerActive: true,
        reason: 'single-active',
        singleAppActive: true,
        singleSuppressedByFarm: false,
        farmAggregationActive: false,
        farmDispatchActive: false,
        farm: { active: false, dispatchActive: false, rows: [] },
        multiUsePolicyActive: !!multiUseActive,
      };
    },
  };
  const dp = new FakeDp({
    'grid.powerW': makeEntry(gridW, 'grid.filtered'),
    'grid.powerRawW': makeEntry(gridW, 'grid.raw'),
    'st.socPct': makeEntry(soc, 'battery.soc'),
    'st.targetPowerW': makeEntry(0, 'battery.target'),
  });
  const module = new SpeicherRegelungModule(adapter, dp);
  await module.tick();
  const state = (id) => states.get(id)?.val;
  return { adapter, dp, module, state };
}

(async () => {
  const staleInactive = resolveStorageOperatingPolicy({
    storageConfig: {
      selfDischargeEnabled: true,
      selfMinSocPct: 20,
      selfMaxSocPct: 100,
      multiUsePolicyApplied: true,
    },
    multiUseConfig: { enabled: false, selfEnabled: true, selfMinSocPct: 20, selfMaxSocPct: 100 },
    multiUseActive: false,
    standaloneDefaultMinSocPct: 10,
    standaloneDefaultMaxSocPct: 100,
  });
  assert.strictEqual(staleInactive.mode, 'standalone');
  assert.strictEqual(staleInactive.reserve.enabled, false);
  assert.strictEqual(staleInactive.lsk.enabled, false);
  assert.strictEqual(staleInactive.self.enabled, true);
  assert.strictEqual(staleInactive.self.minSocPct, 10, 'alter MultiUse-20-%-Floor wurde nicht ignoriert');
  assert.strictEqual(staleInactive.self.maxSocPct, 100);
  assert.strictEqual(staleInactive.staleMultiUseIgnored, true);

  // Ein reiner Schema-/Versionsmarker ohne MultiUse-Datensatz ist kein Nachweis
  // eines frueheren Spiegels. Echte Legacy-Standalone-Werte bleiben dann erhalten.
  const versionOnlyStandalone = resolveStorageOperatingPolicy({
    storageConfig: {
      selfDischargeEnabled: true,
      selfMinSocPct: 7,
      selfMaxSocPct: 96,
      selfTargetGridImportW: 35,
      selfImportThresholdW: 25,
      multiUsePolicyVersion: 2,
      multiUsePolicyActive: false,
    },
    multiUseConfig: null,
    multiUseActive: false,
  });
  assert.strictEqual(versionOnlyStandalone.self.minSocPct, 7);
  assert.strictEqual(versionOnlyStandalone.self.maxSocPct, 96);
  assert.strictEqual(versionOnlyStandalone.self.targetGridImportW, 35);
  assert.strictEqual(versionOnlyStandalone.self.importThresholdW, 25);
  assert.strictEqual(versionOnlyStandalone.source, 'storage.self-legacy');
  assert.strictEqual(versionOnlyStandalone.previousMultiUseMirrorDetected, false);

  // Sobald ein inaktiver MultiUse-Datensatz vorhanden ist, sind die alten
  // storage.self*-SoC-Felder migrationsbedingt mehrdeutig. Ohne expliziten
  // Standalone-Snapshot gelten 10..100 %, waehrend echte NVP-Tuningwerte bleiben.
  const neverActiveMultiUse = resolveStorageOperatingPolicy({
    storageConfig: {
      selfDischargeEnabled: false,
      selfMinSocPct: 20,
      selfMaxSocPct: 100,
      selfTargetGridImportW: 35,
      selfImportThresholdW: 25,
      multiUsePolicyVersion: 2,
      multiUsePolicyActive: false,
    },
    multiUseConfig: { enabled: false, selfEnabled: false, selfMinSocPct: 20, selfMaxSocPct: 100 },
    multiUseActive: false,
  });
  assert.strictEqual(neverActiveMultiUse.mode, 'standalone');
  assert.strictEqual(neverActiveMultiUse.self.enabled, true);
  assert.strictEqual(neverActiveMultiUse.self.minSocPct, 10);
  assert.strictEqual(neverActiveMultiUse.self.maxSocPct, 100);
  assert.strictEqual(neverActiveMultiUse.self.targetGridImportW, 35);
  assert.strictEqual(neverActiveMultiUse.self.importThresholdW, 25);
  assert.strictEqual(neverActiveMultiUse.source, 'standalone-default-inactive-multiuse');
  assert.strictEqual(neverActiveMultiUse.previousMultiUseMirrorDetected, false);
  assert.strictEqual(neverActiveMultiUse.staleMultiUseIgnored, true);

  const explicitStandalone = resolveStorageOperatingPolicy({
    storageConfig: {
      selfMinSocPct: 50,
      multiUsePolicyApplied: true,
      standaloneSelfDischargeEnabled: true,
      standaloneSelfMinSocPct: 8,
      standaloneSelfMaxSocPct: 95,
      standaloneSelfTargetGridImportW: 35,
      standaloneSelfImportThresholdW: 25,
    },
    multiUseConfig: { enabled: false, selfMinSocPct: 50 },
    multiUseActive: false,
  });
  assert.strictEqual(explicitStandalone.self.minSocPct, 8);
  assert.strictEqual(explicitStandalone.self.maxSocPct, 95);
  assert.strictEqual(explicitStandalone.self.targetGridImportW, 35);
  assert.strictEqual(explicitStandalone.self.importThresholdW, 25);

  const activePolicy = resolveStorageOperatingPolicy({
    storageConfig: { selfMinSocPct: 5, standaloneSelfMinSocPct: 8 },
    multiUseConfig: {
      enabled: true,
      reserveEnabled: false,
      peakEnabled: false,
      selfEnabled: true,
      selfMinSocPct: 20,
      selfMaxSocPct: 100,
    },
    multiUseActive: true,
  });
  assert.strictEqual(activePolicy.mode, 'multiuse');
  assert.strictEqual(activePolicy.self.minSocPct, 20, 'aktive MultiUse-Policy muss direkt aus installerConfig stammen');

  const activePolicyWithLegacyNvp = resolveStorageOperatingPolicy({
    storageConfig: {
      standaloneSelfTargetGridImportW: 0,
      standaloneSelfImportThresholdW: 50,
      standaloneSelfMinSocPct: 8,
      standaloneSelfMaxSocPct: 95,
    },
    storageFarmConfig: {
      selfTargetGridImportW: 25,
      selfImportThresholdW: 40,
    },
    selectedTopology: 'single',
    multiUseConfig: {
      enabled: true,
      selfEnabled: true,
      selfMinSocPct: 20,
      selfMaxSocPct: 100,
      // Legacy-Felder duerfen keine zweite NVP-Abstimmung mehr bilden.
      selfTargetGridImportW: 900,
      selfImportThresholdW: 900,
    },
    multiUseActive: true,
  });
  assert.strictEqual(activePolicyWithLegacyNvp.self.targetGridImportW, 0);
  assert.strictEqual(activePolicyWithLegacyNvp.self.importThresholdW, 50);
  assert.strictEqual(activePolicyWithLegacyNvp.nvpTuning.topology, 'single');
  assert.strictEqual(activePolicyWithLegacyNvp.nvpTuning.multiUseTuningIgnored, true);

  const activeFarmPolicy = resolveStorageOperatingPolicy({
    storageConfig: {
      standaloneSelfTargetGridImportW: 500,
      standaloneSelfImportThresholdW: 500,
    },
    storageFarmConfig: {
      selfTargetGridImportW: 25,
      selfImportThresholdW: 40,
    },
    selectedTopology: 'farm',
    multiUseConfig: {
      enabled: true,
      selfEnabled: true,
      selfMinSocPct: 20,
      selfMaxSocPct: 100,
      selfTargetGridImportW: 900,
      selfImportThresholdW: 900,
    },
    multiUseActive: true,
  });
  assert.strictEqual(activeFarmPolicy.self.targetGridImportW, 25);
  assert.strictEqual(activeFarmPolicy.self.importThresholdW, 40);
  assert.strictEqual(activeFarmPolicy.nvpTuning.topology, 'farm');
  assert.strictEqual(activeFarmPolicy.nvpTuning.source, 'storageFarm');

  const inactiveTick = await runStorageTick({ multiUseActive: false });
  assert.strictEqual(inactiveTick.state('speicher.regelung.selfMinSocPct'), 10);
  assert.strictEqual(inactiveTick.state('speicher.regelung.selfSocPolicySource'), 'standalone-default-after-multiuse');
  assert.strictEqual(inactiveTick.state('speicher.regelung.requestW'), 1490);
  assert.strictEqual(inactiveTick.state('speicher.regelung.sollW'), 1490);
  assert.strictEqual(inactiveTick.dp.lastNumberWrite('st.targetPowerW'), 1490);
  assert.match(String(inactiveTick.state('speicher.regelung.requestGrund') || ''), /NVP-Balancing entladen/);

  const activeTick = await runStorageTick({ multiUseActive: true });
  assert.strictEqual(activeTick.state('speicher.regelung.selfMinSocPct'), 20);
  assert.strictEqual(activeTick.state('speicher.regelung.requestW'), 0);
  assert.strictEqual(activeTick.dp.lastNumberWrite('st.targetPowerW'), 0);
  assert.match(String(activeTick.state('speicher.regelung.requestGrund') || ''), /SoC 19% <= Min-SoC 20%/);
  assert.match(String(activeTick.state('speicher.regelung.requestGrund') || ''), /installerConfig\.storageMultiUse/);
  assert.strictEqual(activeTick.state('speicher.regelung.policyBlocked'), true);
  assert.match(String(activeTick.state('speicher.regelung.policyBlockReason') || ''), /SoC 19% <= Min-SoC 20%/);
  assert.strictEqual(activeTick.state('speicher.regelung.policySource'), 'installerConfig.storageMultiUse');
  assert.strictEqual(inactiveTick.state('speicher.regelung.policyBlocked'), false);

  // Verkabelungsvertrag: Farm, Einzelregelung, Core-Budget und MultiUse-Diagnose
  // muessen denselben Resolver verwenden. Der Adapterkern darf MultiUse-Werte
  // nicht mehr in storage.self*/reserve*/lsk* kopieren.
  const storageTs = fs.readFileSync('src-ts/runtime-executables/ems/modules/storage-control.ts', 'utf8');
  const mainTs = fs.readFileSync('src-ts/runtime-executables/main.ts', 'utf8');
  const coreTs = fs.readFileSync('src-ts/runtime-executables/ems/modules/core-limits.ts', 'utf8');
  const multiUseTs = fs.readFileSync('src-ts/runtime-executables/ems/modules/multi-use.ts', 'utf8');
  assert(storageTs.includes('resolveStorageOperatingPolicy({'), 'Einzel-Speicher nutzt nicht den zentralen Resolver');
  assert(mainTs.includes('const storageOperatingPolicy = resolveStorageOperatingPolicy({'), 'Speicherfarm nutzt nicht den zentralen Resolver');
  assert(coreTs.includes('resolveStorageOperatingPolicy({'), 'Core-Budget nutzt nicht den zentralen Resolver');
  assert(multiUseTs.includes('resolveStorageOperatingPolicy({'), 'MultiUse-Diagnose nutzt nicht den zentralen Resolver');
  const policyTs = fs.readFileSync('src-ts/runtime-executables/ems/services/storage-self-consumption-policy.ts', 'utf8');
  const uiTs = fs.readFileSync('src-ts/runtime-executables/www/ems-apps.ts', 'utf8');
  assert(!policyTs.includes('Number(storage.multiUsePolicyVersion) >= 1'), 'Eine reine Policy-Version darf keinen alten MultiUse-Spiegel vortaeuschen');
  assert(!uiTs.includes('Number(stSelf.multiUsePolicyVersion) >= 1'), 'Die UI darf Standalone-NVP-Werte nicht wegen einer Schema-Version verstecken');

  const applyStart = mainTs.indexOf('nwApplyStorageMultiUsePolicy(nativeObj) {');
  const applyEnd = mainTs.indexOf('Code-Teil: loadInstallerConfigFromState', applyStart);
  const applyBlock = mainTs.slice(applyStart, applyEnd);
  for (const forbidden of [
    'st.reserveEnabled = reserveEnabled',
    'st.lskEnabled = peakEnabled',
    'st.selfDischargeEnabled = selfEnabled',
    'st.selfMinSocPct = selfMin',
    'st.selfMaxSocPct = selfMax',
  ]) {
    assert(!applyBlock.includes(forbidden), `MultiUse wird weiterhin nach storage.* gespiegelt: ${forbidden}`);
  }

  console.log('[storage-multiuse-policy-isolation] OK: deaktiviertes MultiUse ist neutral; NVP-Ziel/Messtoleranz stammen nur aus der aktiven Speicher-Topologie und die SoC-Policy bleibt transparent.');
})().catch((error) => {
  console.error('[storage-multiuse-policy-isolation] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
