#!/usr/bin/env node
'use strict';

/**
 * Regression 0.8.137:
 * - Home begrenzt den finalen Speicherbefehl auf 50 kW.
 * - Pro bleibt lizenzseitig frei skalierbar.
 * - Eine Pro-Nennleistung skaliert Regelrampen, Async-Prognose und
 *   Energiefluss-Plausibilität, ohne die 1-W-Sollwertauflösung zu vergrobern
 *   oder selbst ein Hardware-Sollwert zu sein.
 * - Backend, Runtime und AppCenter verwenden dasselbe Profil.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const flags = require('../ems/services/feature-flags');
const storage = require('../ems/modules/storage-control');

assert.strictEqual(flags.normalizeEdition('home'), 'hems');
assert.strictEqual(flags.normalizeEdition('hems'), 'hems');
assert.strictEqual(flags.normalizeEdition('pro'), 'eos');
assert.strictEqual(flags.normalizeEdition('eos'), 'eos');
assert.strictEqual(flags.editionLabel('hems'), 'Home');
assert.strictEqual(flags.editionLabel('eos'), 'Pro');

const home = flags.storagePerformanceProfile('hems', 500000);
assert.strictEqual(home.id, 'home');
assert.strictEqual(home.maxCommandW, 50000);
assert.strictEqual(home.effectiveRatedPowerW, 50000, 'Home-Nennleistung muss auf 50 kW begrenzt werden');
assert.strictEqual(home.defaultStepW, 1, 'Home muss kleine NVP-Korrekturen mit 1 W Aufloesung zulassen');
assert.strictEqual(home.defaultMaxDeltaWPerTick, 500);
assert.strictEqual(home.defaultPvMaxDeltaWPerTick, 1500);
assert.strictEqual(home.defaultBalancePredictionMaxW, 10000);
assert.strictEqual(home.energyFlowPlausibilityMaxW, 1000000);

const pro = flags.storagePerformanceProfile('pro', 500000);
assert.strictEqual(pro.id, 'pro');
assert.strictEqual(pro.maxCommandW, 0, '0 bedeutet: kein Lizenz-Hardcap');
assert.strictEqual(pro.unrestricted, true);
assert.strictEqual(pro.industrial, true);
assert.strictEqual(pro.effectiveRatedPowerW, 500000);
assert.strictEqual(pro.defaultStepW, 1, 'Pro-Nennleistung darf die Sollwertaufloesung nicht vergrobern');
assert.strictEqual(pro.defaultMaxDeltaWPerTick, 25000);
assert.strictEqual(pro.defaultPvMaxDeltaWPerTick, 50000);
assert.strictEqual(pro.defaultBalancePredictionMaxW, 125000);
assert.strictEqual(pro.energyFlowPlausibilityMaxW, 2000000);

const pro62 = flags.storagePerformanceProfile('pro', 62000);
assert.strictEqual(pro62.defaultStepW, 1, '62-kW-Profil darf keinen 62-W-Raster erzeugen');
assert.strictEqual(pro62.defaultMaxDeltaWPerTick, 3100, '62-kW-Profil skaliert nur die Dynamik');

const homeDischarge = storage.applyStorageLicensePowerLimit(120000, home);
assert.deepStrictEqual(
  { targetW: homeDischarge.targetW, limited: homeDischarge.limited, limitW: homeDischarge.limitW },
  { targetW: 50000, limited: true, limitW: 50000 },
);
const homeCharge = storage.applyStorageLicensePowerLimit(-120000, home);
assert.strictEqual(homeCharge.targetW, -50000);
assert.strictEqual(homeCharge.limited, true);
const proCommand = storage.applyStorageLicensePowerLimit(750000, pro);
assert.strictEqual(proCommand.targetW, 750000);
assert.strictEqual(proCommand.limited, false);

assert.strictEqual(storage.deriveStorageRatedPowerW({ ratedPowerW: 420000 }, [], 'single'), 420000);
assert.strictEqual(storage.deriveStorageRatedPowerW({}, [
  { enabled: true, maxChargeW: 200000, maxDischargeW: 250000 },
  { enabled: true, maxChargeW: 300000, maxDischargeW: 280000 },
  { enabled: false, maxChargeW: 900000, maxDischargeW: 900000 },
], 'farm'), 550000);

const resolvedHome = storage.resolveStorageLicensePowerProfile(
  { _nwLicenseInfo: { ok: true, edition: 'hems' }, _nwLicenseOk: true },
  { ratedPowerW: 120000 },
  [],
  'single',
);
assert.strictEqual(resolvedHome.id, 'home');
assert.strictEqual(resolvedHome.maxCommandW, 50000);
assert.strictEqual(resolvedHome.effectiveRatedPowerW, 50000);

const resolvedPro = storage.resolveStorageLicensePowerProfile(
  { _nwLicenseInfo: { ok: true, edition: 'eos' }, _nwLicenseOk: true },
  { ratedPowerW: 900000 },
  [],
  'single',
);
assert.strictEqual(resolvedPro.id, 'pro');
assert.strictEqual(resolvedPro.maxCommandW, 0);
assert.strictEqual(resolvedPro.defaultMaxDeltaWPerTick, 45000);

const storageSource = read('ems/modules/storage-control.js');
const zeroFirewallIdx = storageSource.indexOf("zeroWriteFirewallMeasurementGapAgeMs");
const finalLicenseIdx = storageSource.indexOf('const storageLicensePowerDecision = applyStorageLicensePowerLimit(targetW, storageLicensePowerProfile)');
const writerDiagIdx = storageSource.indexOf('if (sungrowDiagPayload)', finalLicenseIdx);
assert(finalLicenseIdx > zeroFirewallIdx, 'Lizenzcap muss nach Hersteller-/0-W-Policy liegen');
assert(writerDiagIdx > finalLicenseIdx, 'Lizenzcap muss vor Writer-/Diagnoseübergabe liegen');
assert(storageSource.includes("storageZeroNoWrite = false"), 'Home-Cap muss einen alten höheren Hold-Befehl aktiv zurückschreiben');
assert(storageSource.includes("speicher.regelung.licensePowerLimited"));
assert(storageSource.includes("speicher.regelung.licensePowerJson"));

const main = read('main.js');
assert(main.includes('license.storagePowerProfile'));
assert(main.includes('license.maxStoragePowerW'));
assert(main.includes('_nwApplyLicenseLimitsToInstallerPatch'));
assert(main.includes('p.storage.ratedPowerW = normalizePositiveW(p.storage.ratedPowerW)'));
assert(main.includes('storagePerformanceProfile(this._nwCurrentLicenseEdition(), storageRatedPowerW)'));

const html = read('www/ems-apps.html');
const app = read('www/ems-apps.js');
assert(html.includes('id="storageLicensePowerProfile"'));
assert(html.includes('id="storageRatedPowerKW"'));
assert(html.includes('<b>Home</b> begrenzt den finalen Speicherbefehl auf 50&nbsp;kW'));
assert(html.includes('<b>Pro</b> ist lizenzseitig frei skalierbar'));
assert(app.includes("els.storageRatedPowerKW.max = '50'"));
assert(app.includes("patch.storage.ratedPowerW = Math.round(storageRatedPowerKw * 1000)"));
assert(app.includes("'Pro · frei skalierbar'"));



function runtimeEntry(val, objectId) {
  return { val, objectId, ts: Date.now() };
}

class LicenseRuntimeDp {
  constructor(entries) {
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
    return ts === null ? null : Math.max(0, Date.now() - ts);
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
    const next = Number(value);
    const previous = this.entries[key] || { objectId: `runtime.${key}` };
    this.entries[key] = { ...previous, val: next, ts: Date.now() };
    this.writes.push({ key, value: next });
    return true;
  }
  async writeBoolean(key, value) {
    const next = !!value;
    const previous = this.entries[key] || { objectId: `runtime.${key}` };
    this.entries[key] = { ...previous, val: next, ts: Date.now() };
    this.writes.push({ key, value: next });
    return true;
  }
  lastWrite(key) {
    const rows = this.writes.filter((row) => row.key === key);
    return rows.length ? rows[rows.length - 1].value : null;
  }
}

async function runLicenseProfileTick({ edition, ratedPowerW, gridW, targetGridImportW = 50, importThresholdW = 50, stepW }) {
  const states = new Map();
  const adapter = {
    _nwLicenseOk: true,
    _nwLicenseInfo: { ok: true, type: 'full', edition },
    config: {
      enableStorageControl: true,
      enableStorageFarm: false,
      enableMultiUse: false,
      enablePeakShaving: false,
      enableGridConstraints: false,
      storage: {
        controlMode: 'targetPower',
        ratedPowerW,
        staleTimeoutSec: 15,
        ...(stepW !== undefined ? { stepW } : {}),
        maxDeltaWPerTick: 200000,
        pvMaxDeltaWPerTick: 200000,
        pvEnabled: false,
        standaloneSelfTargetGridImportW: targetGridImportW,
        standaloneSelfImportThresholdW: importThresholdW,
        selfMinSocPct: 20,
        selfMaxSocPct: 100,
      },
    },
    stateCache: {},
    log: { warn() {}, info() {}, debug() {}, error() {} },
    async setObjectNotExistsAsync() {},
    async setStateAsync(id, value) {
      const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val') ? value.val : value;
      states.set(String(id), { val, ts: Date.now(), ack: true });
    },
    async getStateAsync(id) { return states.get(String(id)) || null; },
    _nwGetNumberFromCache() { return null; },
    _nwGetCacheAgeMs() { return null; },
    _nwGetNumberFromCacheFresh(_id, _maxAgeMs, fallback = null) { return fallback; },
    _states: states,
  };
  const dp = new LicenseRuntimeDp({
    'grid.powerW': runtimeEntry(gridW, 'meter.nvp.filtered'),
    'grid.powerRawW': runtimeEntry(gridW, 'meter.nvp.raw'),
    'st.socPct': runtimeEntry(80, 'storage.soc'),
    'st.batteryPowerW': runtimeEntry(0, 'storage.actualPower'),
    'st.targetPowerW': runtimeEntry(0, 'storage.command.signed'),
  });
  const mod = new storage.SpeicherRegelungModule(adapter, dp);
  await mod.tick();
  const getState = (id) => {
    const rec = states.get(id);
    return rec ? rec.val : undefined;
  };
  return { adapter, dp, mod, getState };
}

(async () => {
  const homeDischargeTick = await runLicenseProfileTick({ edition: 'hems', ratedPowerW: 500000, gridW: 120000 });
  assert.strictEqual(homeDischargeTick.dp.lastWrite('st.targetPowerW'), 50000, 'Home muss den realen Entlade-Write auf 50 kW begrenzen');
  assert.strictEqual(homeDischargeTick.getState('speicher.regelung.licensePowerProfile'), 'home');
  assert.strictEqual(homeDischargeTick.getState('speicher.regelung.licensePowerLimited'), true);
  assert.strictEqual(homeDischargeTick.getState('speicher.regelung.sollW'), 50000);

  const homeChargeTick = await runLicenseProfileTick({ edition: 'home', ratedPowerW: 500000, gridW: -120000 });
  assert.strictEqual(homeChargeTick.dp.lastWrite('st.targetPowerW'), -50000, 'Home muss auch den realen Lade-Write auf 50 kW begrenzen');
  assert.strictEqual(homeChargeTick.getState('speicher.regelung.licensePowerLimited'), true);

  const proDischargeTick = await runLicenseProfileTick({ edition: 'pro', ratedPowerW: 500000, gridW: 120000 });
  assert.strictEqual(proDischargeTick.dp.lastWrite('st.targetPowerW'), 119950, 'Pro darf den physikalischen NVP-Headroom oberhalb 50 kW direkt bis zur Zielmitte nutzen');
  assert.strictEqual(proDischargeTick.getState('speicher.regelung.licensePowerProfile'), 'pro');
  assert.strictEqual(proDischargeTick.getState('speicher.regelung.licensePowerLimited'), false);

  const proPreciseChargeTick = await runLicenseProfileTick({
    edition: 'pro',
    ratedPowerW: 62000,
    gridW: -65,
    targetGridImportW: 0,
    importThresholdW: 50,
  });
  assert.strictEqual(
    proPreciseChargeTick.dp.lastWrite('st.targetPowerW'),
    -65,
    '62-kW-Pro-Speicher muss eine 65-W-Zielmittenkorrektur mit 1-W-Aufloesung statt 62-W-Raster schreiben',
  );
  assert.strictEqual(proPreciseChargeTick.getState('speicher.regelung.stepW'), 1);

  console.log('[storage-license-power-profiles] OK: Home 50 kW, Pro frei skalierbar und Industrie-Defaults sind bis zum realen Runtime-Write geprüft.');
})().catch((err) => {
  console.error('[storage-license-power-profiles] ERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
});
