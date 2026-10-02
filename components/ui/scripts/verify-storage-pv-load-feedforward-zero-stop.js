#!/usr/bin/env node
'use strict';

/**
 * Regression 0.8.96: Direkter PV-/Gebaeudelast-Feed-forward fuer den
 * herstellerunabhaengigen NVP-Regelkreis.
 *
 * Fachliche Regeln:
 * - Primär bleibt: Soll = Batterie-Ist + (NVP-Ist - NVP-Ziel).
 * - PV wird NICHT auf diese Gleichung addiert; sonst wuerde PV doppelt wirken.
 * - Fehlt/stockt die Batterie-Istleistung, darf ein absoluter Ersatzwert nur aus
 *   direkt gemessener Last und direkt gemessener PV entstehen:
 *     Soll = direkte Last - direkte PV - NVP-Ziel.
 * - Ein aus PV + NVP + Speicher abgeleiteter Gebaeudeverbrauch ist als
 *   Feed-forward verboten, weil er einen zirkulaeren Regelpfad erzeugen wuerde.
 * - Im NVP-Zielband bleibt ein aktiver Nicht-Null-Sollwert erhalten. 0 W bleibt
 *   einem echten Stop-/Warte- oder Sicherheitszustand vorbehalten; ein
 *   Richtungswechsel wird direkt ohne 0-W-Zwischenrunde geschrieben.
 */

const assert = require('assert');
const { SpeicherRegelungModule } = require('../ems/modules/storage-control');

function nowMs() {
  return Date.now();
}

function entry(value, objectId, ageMs = 0) {
  return {
    val: value,
    objectId,
    ts: nowMs() - Math.max(0, Number(ageMs) || 0),
  };
}

class FakeDp {
  constructor(entries = {}) {
    this.entries = entries;
    this.writes = [];
  }

  getEntry(key) {
    return this.entries[key] || null;
  }

  getAgeMs(key) {
    const rec = this.entries[key];
    if (!rec || typeof rec.ts !== 'number') return null;
    return Math.max(0, nowMs() - rec.ts);
  }

  getNumberFresh(key, staleMs, fallback = null) {
    const rec = this.entries[key];
    if (!rec) return fallback;
    const age = this.getAgeMs(key);
    if (age !== null && Number.isFinite(Number(staleMs)) && age > Number(staleMs)) return fallback;
    const value = Number(rec.val);
    return Number.isFinite(value) ? value : fallback;
  }

  getNumber(key, fallback = null) {
    const rec = this.entries[key];
    if (!rec) return fallback;
    const value = Number(rec.val);
    return Number.isFinite(value) ? value : fallback;
  }

  getBoolean(key, fallback = false) {
    const rec = this.entries[key];
    if (!rec) return fallback;
    return rec.val === true || rec.val === 1 || rec.val === '1' || rec.val === 'true';
  }

  async writeNumber(key, value) {
    this.writes.push({ key, value: Number(value), ts: nowMs() });
    return true;
  }

  async writeBoolean(key, value) {
    this.writes.push({ key, value: !!value, ts: nowMs() });
    return true;
  }

  lastWrite(key) {
    const list = this.writes.filter((item) => item.key === key);
    return list.length ? list[list.length - 1].value : null;
  }
}

function makeAdapter({ profile = 'generic', coupling = 'ac', farm = false, stateCache = {} } = {}) {
  const states = new Map();
  const farmWrites = [];
  const datapoints = {
    consumptionTotal: 'meter.buildingPowerW',
    pvPower: 'inverter.pvPowerW',
  };
  const adapter = {
    config: {
      enableStorageControl: true,
      enableStorageFarm: farm,
      enableMultiUse: false,
      enablePeakShaving: false,
      enableGridConstraints: false,
      datapoints,
      storageFarm: farm ? {
        storages: [
          { enabled: true, setSignedPowerId: 'farm.storage.1.setPowerW' },
          { enabled: true, setSignedPowerId: 'farm.storage.2.setPowerW' },
        ],
      } : {},
      storage: {
        controlMode: 'targetPower',
        vendorProfile: profile,
        coupling,
        datapoints: coupling === 'dc' ? { dcPvPowerObjectId: 'hybrid.pvPowerW' } : {},
        staleTimeoutSec: 15,
        balanceFeedbackHoldSec: 45,
        balanceFeedForwardMaxAgeMs: 15000,
        balanceFeedForwardMaxSkewMs: 15000,
        balanceFeedForwardPlausibilityW: 1000,
        maxDeltaWPerTick: 5000,
        pvMaxDeltaWPerTick: 5000,
        stepW: 1,
        pvEnabled: true,
        pvExportThresholdW: 50,
        selfDischargeEnabled: true,
        selfTargetGridImportW: 50,
        selfImportThresholdW: 50,
        selfMinSocPct: 20,
        selfMaxSocPct: 100,
        maxChargeW: 30000,
        maxDischargeW: 30000,
        sungrowTargetGridImportW: 50,
        sungrowImportThresholdW: 50,
        sungrowAssistBufferW: 150,
        e3dcZeroMode: 'normal',
      },
    },
    stateCache,
    log: { warn() {}, info() {}, debug() {}, error() {} },
    async setObjectNotExistsAsync() {},
    async setStateAsync(id, value) {
      states.set(id, { val: value, ts: nowMs() });
    },
    async getStateAsync(id) {
      return states.get(id) || null;
    },
    _nwHasMappedDatapoint(key) {
      return !!String(this.config.datapoints && this.config.datapoints[key] || '').trim();
    },
    _nwGetNumberFromCache(key) {
      const rec = this.stateCache[key];
      const value = Number(rec && rec.value);
      return Number.isFinite(value) ? value : null;
    },
    _nwGetCacheAgeMs(key, now = nowMs()) {
      const rec = this.stateCache[key];
      if (!rec || !Number.isFinite(Number(rec.ts))) return null;
      return Math.max(0, Number(now) - Number(rec.ts));
    },
    _nwGetNumberFromCacheFresh(key, maxAgeMs, fallback = null, now = nowMs()) {
      const age = this._nwGetCacheAgeMs(key, now);
      if (age !== null && Number.isFinite(Number(maxAgeMs)) && age > Number(maxAgeMs)) return fallback;
      const value = this._nwGetNumberFromCache(key);
      return value === null ? fallback : value;
    },
    async applyStorageFarmTargetW(value, meta) {
      farmWrites.push({ value: Number(value), meta, ts: nowMs() });
      return { applied: true, reason: 'test-farm' };
    },
    _states: states,
    _farmWrites: farmWrites,
  };

  if (farm) {
    states.set('storageFarm.storagesOnline', { val: 2, ts: nowMs() });
    states.set('storageFarm.storagesDispatchAvailable', { val: 2, ts: nowMs() });
    states.set('storageFarm.totalSocOnline', { val: 60, ts: nowMs() });
  }

  return adapter;
}

function makeDp({ profile = 'generic', coupling = 'ac', actualW = -2700, includeActual = true, gridW = 1500 } = {}) {
  const entries = {
    'grid.powerW': entry(gridW, 'grid.filtered'),
    'grid.powerRawW': entry(gridW, 'grid.raw'),
    'st.socPct': entry(60, 'battery.soc'),
  };
  if (includeActual) entries['st.batteryPowerW'] = entry(actualW, 'battery.actualPower');
  if (coupling === 'dc') entries['st.dcPvPowerW'] = entry(5800, 'hybrid.pvPowerW');

  if (profile === 'sungrow-hybrid') {
    entries['st.targetChargePowerW'] = entry(0, 'sungrow.ctrl.chargePowerW');
    entries['st.targetDischargePowerW'] = entry(0, 'sungrow.ctrl.dischargePowerW');
    entries['st.run'] = entry(false, 'sungrow.ctrl.run');
  } else if (profile === 'e3dc-rscp') {
    entries['st.e3dcSetPowerMode'] = entry(0, 'e3dc.0.EMS.SET_POWER_MODE');
    entries['st.e3dcSetPowerValueW'] = entry(0, 'e3dc.0.EMS.SET_POWER_VALUE');
  } else {
    entries['st.targetPowerW'] = entry(0, 'battery.targetPowerW');
  }
  return new FakeDp(entries);
}

function directCache({ loadW = 4700, pvW = 5800, loadSource = 'mapped:consumptionTotal' } = {}) {
  const ts = nowMs();
  return {
    consumptionTotal: { value: loadW, ts },
    pvPower: { value: pvW, ts },
    'derived.core.building.loadTotalW': { value: loadW, ts },
    'derived.core.building.loadSource': { value: loadSource, ts },
  };
}

function writtenSignedTarget({ profile, adapter, dp }) {
  if (adapter.config.enableStorageFarm) {
    const list = adapter._farmWrites;
    return list.length ? list[list.length - 1].value : null;
  }
  if (profile === 'sungrow-hybrid') {
    const charge = Number(dp.lastWrite('st.targetChargePowerW')) || 0;
    const discharge = Number(dp.lastWrite('st.targetDischargePowerW')) || 0;
    return discharge - charge;
  }
  if (profile === 'e3dc-rscp') {
    const mode = dp.lastWrite('st.e3dcSetPowerMode');
    const value = Number(dp.lastWrite('st.e3dcSetPowerValueW')) || 0;
    if (mode === 2) return value;
    if (mode === 3 || mode === 4) return -value;
    return 0;
  }
  return dp.lastWrite('st.targetPowerW');
}

async function runTick({
  profile = 'generic',
  coupling = profile === 'sungrow-hybrid' ? 'dc' : 'ac',
  actualW = -2700,
  includeActual = true,
  gridW = 1500,
  loadW = 4700,
  pvW = 5800,
  lastTargetW = null,
  lastSource = 'pv',
  farm = false,
} = {}) {
  const cache = directCache({ loadW, pvW });
  const adapter = makeAdapter({ profile, coupling, farm, stateCache: cache });
  const dp = makeDp({ profile, coupling, actualW, includeActual, gridW });
  const mod = new SpeicherRegelungModule(adapter, dp);
  if (Number.isFinite(Number(lastTargetW))) {
    mod._lastTargetW = Number(lastTargetW);
    mod._lastSource = lastSource;
  }
  await mod.tick();
  return {
    adapter,
    dp,
    mod,
    targetW: writtenSignedTarget({ profile, adapter, dp }),
  };
}

(async () => {
  const helperAdapter = makeAdapter({ stateCache: directCache() });
  const helper = new SpeicherRegelungModule(helperAdapter, new FakeDp());

  const feedForward = helper._buildIndependentPvLoadFeedForward({
    nowMs: nowMs(),
    staleMs: 15000,
    maxSkewMs: 15000,
    rawNvpW: 1500,
    nvpAgeMs: 0,
    targetNvpW: 50,
    coupling: 'ac',
  });
  assert.strictEqual(feedForward.usable, true, 'direkte PV- und Lastmessungen muessen Feed-forward erlauben');
  assert.strictEqual(Math.round(feedForward.targetW), -1150, 'Feed-forward-Soll muss Last - PV - NVP-Ziel sein');
  assert.strictEqual(Math.round(feedForward.expectedActualW), -2600, 'erwartete Istleistung muss Last - PV - NVP-Ist sein');

  const plausible = helper._buildActualAwareNvpBalance({
    rawNvpW: 1500,
    fallbackNvpW: 1500,
    nvpAgeMs: 0,
    targetNvpW: 50,
    deadbandW: 50,
    batteryPowerW: -2700,
    batteryMeasuredW: -2700,
    batteryAgeMs: 0,
    batteryPowerTrusted: true,
    lastTargetW: -2700,
    lastTargetAllowed: true,
    holdLastNonZeroInDeadband: true,
    maxDischargeCorrectionW: 5000,
    maxChargeCorrectionW: 5000,
    feedbackMaxAgeMs: 45000,
    feedForwardUsable: true,
    feedForwardTargetW: feedForward.targetW,
    feedForwardExpectedActualW: feedForward.expectedActualW,
    feedForwardPvW: feedForward.pvW,
    feedForwardLoadW: feedForward.loadW,
    feedForwardPlausibilityW: 1000,
  });
  assert.strictEqual(plausible.feedbackUsed, true, 'plausible echte Batterie-Istleistung muss primaer bleiben');
  assert.strictEqual(plausible.feedForwardUsed, false, 'PV darf bei plausiblem Istwert nicht doppelt auf die NVP-Gleichung addiert werden');
  assert.strictEqual(Math.round(plausible.targetW), -1250, 'Ist -2700 W plus NVP-Differenz +1450 W muss -1250 W ergeben');

  const implausibleZero = helper._buildActualAwareNvpBalance({
    rawNvpW: 1500,
    fallbackNvpW: 1500,
    nvpAgeMs: 0,
    targetNvpW: 50,
    deadbandW: 50,
    batteryPowerW: 0,
    batteryMeasuredW: 0,
    batteryAgeMs: 0,
    batteryPowerTrusted: true,
    lastTargetW: -2700,
    lastTargetAllowed: true,
    holdLastNonZeroInDeadband: true,
    maxDischargeCorrectionW: 5000,
    maxChargeCorrectionW: 5000,
    feedbackMaxAgeMs: 45000,
    feedForwardUsable: true,
    feedForwardTargetW: feedForward.targetW,
    feedForwardExpectedActualW: feedForward.expectedActualW,
    feedForwardPvW: feedForward.pvW,
    feedForwardLoadW: feedForward.loadW,
    feedForwardPlausibilityW: 1000,
  });
  assert.strictEqual(implausibleZero.feedbackRejectedByFeedForward, true, '0-W-Telemetrie muss bei physikalisch erwarteter Ladung als unplausibel erkannt werden');
  assert.strictEqual(implausibleZero.feedForwardUsed, true, 'bei unplausibler Istleistung muss der absolute Feed-forward fuehren');
  assert.strictEqual(Math.round(implausibleZero.targetW), -1150, 'unplausibler 0-W-Istwert darf nicht zu einem 0-W-Stop oder Entladebefehl fuehren');

  // Abgeleitete Bilanzlast darf ohne direkte Mapping-Bestaetigung keinen Feed-forward bilden.
  const loopAdapter = makeAdapter({
    stateCache: directCache({ loadSource: 'balance:pv+nvp+storage' }),
  });
  loopAdapter.config.datapoints.consumptionTotal = '';
  const loopHelper = new SpeicherRegelungModule(loopAdapter, new FakeDp());
  const loopGuard = loopHelper._buildIndependentPvLoadFeedForward({
    nowMs: nowMs(),
    staleMs: 15000,
    maxSkewMs: 15000,
    rawNvpW: 1500,
    nvpAgeMs: 0,
    targetNvpW: 50,
    coupling: 'ac',
  });
  assert.strictEqual(loopGuard.usable, false, 'rueckgerechneter Gebaeudeverbrauch muss gegen Regel-Loops gesperrt bleiben');
  assert.strictEqual(loopGuard.reason, 'direct-load-missing-or-stale', 'Loop-Guard braucht eindeutige Diagnose');

  const generic = await runTick({ profile: 'generic', actualW: -2700, includeActual: true });
  assert(generic.targetW <= -1200 && generic.targetW >= -1300, `Generic muss mit Istleistung + NVP-Differenz weiterladen statt 0 W: ${generic.targetW}`);

  const genericZeroTelemetry = await runTick({ profile: 'generic', actualW: 0, includeActual: true, lastTargetW: -2700 });
  assert(genericZeroTelemetry.targetW <= -1100 && genericZeroTelemetry.targetW >= -1200, `Generic muss bei unplausibler 0-W-Telemetrie Feed-forward laden: ${genericZeroTelemetry.targetW}`);
  assert.strictEqual(genericZeroTelemetry.adapter._states.get('speicher.regelung.balanceFeedForwardVerwendet').val, true, 'Feed-forward-Nutzung muss diagnostiziert werden');
  assert.strictEqual(genericZeroTelemetry.adapter._states.get('speicher.regelung.balanceFeedbackDurchFeedForwardVerworfen').val, true, 'verworfenes 0-W-Feedback muss diagnostiziert werden');

  const noActual = await runTick({ profile: 'generic', includeActual: false, lastTargetW: -2700 });
  assert(noActual.targetW <= -1100 && noActual.targetW >= -1200, `ohne Batterie-Ist-DP muss direkter Feed-forward einen 0-W-Stop vermeiden: ${noActual.targetW}`);

  const sungrow = await runTick({ profile: 'sungrow-hybrid', coupling: 'dc', actualW: -2700, includeActual: true });
  assert(sungrow.targetW <= -1200 && sungrow.targetW >= -1300, `Sungrow muss im gemeinsamen NVP-Regelkreis weiterladen: ${sungrow.targetW}`);
  assert.notStrictEqual(sungrow.dp.lastWrite('st.targetChargePowerW'), 0, 'Sungrow darf bei dieser Bilanz keinen 0-W-Ladestopp schreiben');
  assert.strictEqual(sungrow.adapter._states.get('speicher.regelung.sungrowHybridSchreibmodus').val, 'write-nvp-balance-charge', 'Sungrow muss den geschlossenen Lade-Regelpfad melden');

  const e3dc = await runTick({ profile: 'e3dc-rscp', actualW: -2700, includeActual: true });
  assert(e3dc.targetW <= -1200 && e3dc.targetW >= -1300, `E3/DC muss denselben NVP-Regelkreis verwenden: ${e3dc.targetW}`);
  assert.strictEqual(e3dc.dp.lastWrite('st.e3dcSetPowerMode'), 3, 'E3/DC muss CHARGE schreiben');

  const farm = await runTick({ profile: 'generic', actualW: null, includeActual: false, farm: true, lastTargetW: -2700 });
  assert(farm.targetW <= -1100 && farm.targetW >= -1200, `Speicherfarm muss den direkten Feed-forward ebenfalls erhalten: ${farm.targetW}`);

  const hold = await runTick({
    profile: 'generic',
    actualW: 0,
    includeActual: false,
    gridW: 50,
    lastTargetW: -1150,
    loadW: 4700,
    pvW: 5800,
  });
  assert.strictEqual(hold.targetW, -1150, 'im NVP-Zielband muss der aktive Nicht-Null-Ladesollwert gehalten werden');
  assert.strictEqual(hold.adapter._states.get('speicher.regelung.balanceLetztenSollwertGehalten').val, true, 'Nicht-Null-Hold muss sichtbar sein');

  console.log('[storage-pv-load-feedforward-zero-stop] OK: PV/Last dienen nur als unabhaengiger Feed-forward; alle Schreibpfade vermeiden unberechtigte 0-W-Stopps ohne PV-Doppelzaehlung.');
})().catch((error) => {
  console.error('[storage-pv-load-feedforward-zero-stop] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
