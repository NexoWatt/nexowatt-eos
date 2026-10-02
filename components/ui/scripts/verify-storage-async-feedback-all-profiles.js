#!/usr/bin/env node
'use strict';
/**
 * Regression 0.8.130: Herstellerunabhaengiger Speicher-Istwert-Anker.
 *
 * Reale Speicher melden NVP und Batterie-Istleistung oft asynchron. Der Test
 * bildet deshalb einen 20 Sekunden alten Batterie-Istwert bei sekundenaktuellem
 * NVP ab und prueft, dass derselbe Messwert nicht durch den zuletzt geschriebenen
 * Sollwert hochintegriert wird. Ein unveraenderter NVP muss einen unveraenderten
 * Sollwert ergeben. Eine NVP-Aenderung wird gegen den zuletzt akzeptierten
 * Kommando-Anker genau einmal in erwartete Speicherreaktion und externe
 * Last-/PV-Aenderung aufgeteilt.
 *
 * Abgedeckte Schreibpfade:
 * - Generic signed Sollwert
 * - Generic getrennte Lade-/Entlade-Sollwerte
 * - Sungrow Hybrid ESS
 * - E3/DC RSCP SET_POWER_MODE/SET_POWER_VALUE
 * - Speicherfarm-Verteilung
 *
 * Sicherheitsfall:
 * Ohne jemals vorhandenen echten Batterie-Istwert darf ein alter extremer
 * Sollwert weiterhin nicht hochintegriert werden.
 */
const assert = require('assert');
const { SpeicherRegelungModule } = require('../ems/modules/storage-control');

function nowMs() { return Date.now(); }

class MutableDp {
  constructor(entries = {}) {
    this.entries = entries;
    this.writes = [];
  }

  getEntry(key) { return this.entries[key] || null; }

  getMeasurementTimestampMs(key) {
    const rec = this.entries[key];
    return rec && typeof rec.ts === 'number' && Number.isFinite(rec.ts) ? rec.ts : null;
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
    const n = Number(rec.val);
    return Number.isFinite(n) ? n : fallback;
  }

  getNumber(key, fallback = null) {
    const rec = this.entries[key];
    if (!rec) return fallback;
    const n = Number(rec.val);
    return Number.isFinite(n) ? n : fallback;
  }

  getBoolean(key, fallback = false) {
    const rec = this.entries[key];
    if (!rec) return fallback;
    return rec.val === true || rec.val === 1 || rec.val === '1' || rec.val === 'true';
  }

  setValue(key, value, { keepTimestamp = false } = {}) {
    const rec = this.entries[key] || { objectId: `test.${key}` };
    rec.val = value;
    if (!keepTimestamp || typeof rec.ts !== 'number') rec.ts = nowMs();
    this.entries[key] = rec;
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
    const list = this.writes.filter((w) => w.key === key);
    return list.length ? list[list.length - 1].value : null;
  }
}

function entry(value, objectId, ageMs = 0) {
  return {
    val: value,
    objectId,
    ts: nowMs() - Math.max(0, Number(ageMs) || 0),
  };
}

function makeAdapter({ profile = 'generic', farm = false } = {}) {
  const states = new Map();
  const farmWrites = [];
  const adapter = {
    config: {
      enableStorageControl: true,
      enableStorageFarm: farm,
      enableMultiUse: false,
      enablePeakShaving: false,
      enableGridConstraints: false,
      storageFarm: farm ? {
        // Eine Speicherfarm ist fachlich erst ab zwei realen Speicherzeilen aktiv.
        // Der Regressionstest bildet deshalb zwei steuerbare Speicher ab, auch wenn
        // die aggregierte Istleistung zentral über storageFarm.totalPowerW kommt.
        storages: [
          { enabled: true, setSignedPowerId: 'farm.storage.1.setPowerW' },
          { enabled: true, setSignedPowerId: 'farm.storage.2.setPowerW' },
        ],
      } : {},
      storage: {
        controlMode: 'targetPower',
        vendorProfile: profile,
        staleTimeoutSec: 15,
        balanceFeedbackHoldSec: 45,
        // Legacy-Konfiguration bleibt lesbar, wird seit 0.8.130 aber nicht mehr
        // als Sollwert->Istwert-Rueckkopplung verwendet.
        balanceFeedbackPredictionSteps: 4,
        maxDeltaWPerTick: 500,
        pvMaxDeltaWPerTick: 500,
        stepW: 1,
        pvEnabled: false,
        selfDischargeEnabled: true,
        selfTargetGridImportW: 50,
        selfImportThresholdW: 50,
        selfMinSocPct: 20,
        selfMaxSocPct: 100,
        maxChargeW: 30000,
        maxDischargeW: 30000,
        sungrowPvThresholdW: 300,
        sungrowLoadCoverReserveW: 300,
        sungrowTargetGridImportW: 50,
        sungrowImportThresholdW: 50,
        sungrowAssistBufferW: 150,
        e3dcZeroMode: 'normal',
      },
    },
    stateCache: {
      'derived.core.pv.totalW': { value: 0, ts: nowMs() },
      'derived.core.building.loadTotalW': { value: 10000, ts: nowMs() },
    },
    log: { warn() {}, info() {}, debug() {}, error() {} },
    async setObjectNotExistsAsync() {},
    async setStateAsync(id, value) { states.set(id, { val: value, ts: nowMs() }); },
    async getStateAsync(id) { return states.get(id) || null; },
    _nwGetNumberFromCache(id) {
      const rec = this.stateCache[id];
      const n = Number(rec && rec.value);
      return Number.isFinite(n) ? n : null;
    },
    async applyStorageFarmTargetW(value, meta) {
      farmWrites.push({ value: Number(value), meta, ts: nowMs() });
      return {
        applied: true,
        commandEffective: true,
        writeOk: true,
        requestSatisfied: true,
        partiallyAccepted: false,
        requestedW: Number(value),
        plannedDeliveredW: Number(value),
        acceptedDeliveredW: Number(value),
        failedW: 0,
        unservedW: 0,
        status: 'farm',
        reason: 'test-farm',
      };
    },
    _states: states,
    _farmWrites: farmWrites,
  };

  if (farm) {
    const oldTs = nowMs() - 20000;
    states.set('storageFarm.storagesOnline', { val: 2, ts: nowMs() });
    states.set('storageFarm.storagesDispatchAvailable', { val: 2, ts: nowMs() });
    states.set('storageFarm.totalSocOnline', { val: 80, ts: nowMs() });
    states.set('storageFarm.totalChargePowerW', { val: 0, ts: oldTs });
    states.set('storageFarm.totalDischargePowerW', { val: 8400, ts: oldTs });
  }

  return adapter;
}

function makeDp({ targetMode = 'signed', profile = 'generic', includeActual = true } = {}) {
  const entries = {
    'grid.powerW': entry(1800, 'grid.filtered'),
    'grid.powerRawW': entry(1800, 'grid.raw'),
    'st.socPct': entry(80, 'battery.soc'),
  };
  if (includeActual) entries['st.batteryPowerW'] = entry(8400, 'battery.actualPower', 20000);

  if (targetMode === 'signed') {
    entries['st.targetPowerW'] = entry(0, 'battery.targetPowerW');
  } else if (targetMode === 'split') {
    entries['st.targetChargePowerW'] = entry(0, 'battery.chargePowerW');
    entries['st.targetDischargePowerW'] = entry(0, 'battery.dischargePowerW');
    entries['st.run'] = entry(false, 'battery.run');
  } else if (targetMode === 'e3dc') {
    entries['st.e3dcSetPowerMode'] = entry(0, 'e3dc.0.EMS.SET_POWER_MODE');
    entries['st.e3dcSetPowerValueW'] = entry(0, 'e3dc.0.EMS.SET_POWER_VALUE');
  }

  // Sungrow uses split targets in the customer setup.
  if (profile === 'sungrow-hybrid' && targetMode !== 'split') {
    entries['st.targetChargePowerW'] = entry(0, 'sungrow.ctrl.chargePowerW');
    entries['st.targetDischargePowerW'] = entry(0, 'sungrow.ctrl.dischargePowerW');
    entries['st.run'] = entry(false, 'sungrow.ctrl.run');
  }

  return new MutableDp(entries);
}

function getWrittenTarget({ profile, targetMode, dp, adapter }) {
  if (adapter.config.enableStorageFarm) {
    const list = adapter._farmWrites;
    return list.length ? list[list.length - 1].value : null;
  }
  if (profile === 'e3dc-rscp') return dp.lastWrite('st.e3dcSetPowerValueW');
  if (targetMode === 'split' || profile === 'sungrow-hybrid') return dp.lastWrite('st.targetDischargePowerW');
  return dp.lastWrite('st.targetPowerW');
}

async function runPersistentDischargeProfile({ name, profile = 'generic', targetMode = 'signed', farm = false }) {
  const adapter = makeAdapter({ profile, farm });
  const dp = makeDp({ targetMode, profile, includeActual: !farm });
  const mod = new SpeicherRegelungModule(adapter, dp);

  await mod.tick();
  const first = getWrittenTarget({ profile, targetMode, dp, adapter });
  assert.strictEqual(first, 10150, `${name}: erster Schnellregler-Sollwert muss Ist 8,4 kW + 1,75 kW Fehler zur Zielmitte sein: ${first}`);

  // Batterie-Istwert bleibt absichtlich 20 s alt. Nur der NVP wird aktualisiert.
  dp.setValue('grid.powerW', 300);
  dp.setValue('grid.powerRawW', 300);
  await mod.tick();
  const second = getWrittenTarget({ profile, targetMode, dp, adapter });
  assert(second >= first && second <= (first + 300), `${name}: NVP-Bewegung darf den Sollwert nur einmal und begrenzt nachfuehren (${first} -> ${second})`);

  // Derselbe reale Batterie-Messwert und derselbe NVP duerfen ueber beliebig
  // viele EMS-Ticks keinen begrenzten Integrator bilden.
  for (let i = 0; i < 8; i += 1) {
    await mod.tick();
    const repeated = getWrittenTarget({ profile, targetMode, dp, adapter });
    assert.strictEqual(repeated, second, `${name}: unveraenderte Messwerte muessen den Sollwert halten (Tick ${i + 1})`);
  }

  dp.setValue('grid.powerW', 50);
  dp.setValue('grid.powerRawW', 50);
  await mod.tick();
  const held = getWrittenTarget({ profile, targetMode, dp, adapter });
  assert(held >= 8400 && held <= second, `${name}: im NVP-Zielband muss ein plausibler Nicht-Null-Haltewert bestehen bleiben (${second} -> ${held})`);
  for (let i = 0; i < 4; i += 1) {
    await mod.tick();
    assert.strictEqual(getWrittenTarget({ profile, targetMode, dp, adapter }), held, `${name}: Zielband-Haltewert muss stabil bleiben (Tick ${i + 1})`);
  }

  const modeState = adapter._states.get('speicher.regelung.batteryPowerFeedbackMode');
  assert(modeState && String(modeState.val).includes('battery-held-anchor'), `${name}: Diagnose muss den gehaltenen echten Messanker melden`);
  const predictedState = adapter._states.get('speicher.regelung.batteryPowerFeedbackPredicted');
  assert(predictedState && predictedState.val === false, `${name}: Sollwert darf nicht als Batterie-Istleistung prognostiziert werden`);
  const predictionDeltaState = adapter._states.get('speicher.regelung.batteryPowerFeedbackPredictionDeltaW');
  assert(predictionDeltaState && predictionDeltaState.val === 0, `${name}: Legacy-Prognosedelta muss 0 W bleiben`);
  const asyncAnchorState = adapter._states.get('speicher.regelung.balanceAsyncAnchorAktiv');
  assert(asyncAnchorState && asyncAnchorState.val === true, `${name}: der akzeptierte Kommando-Anker muss fuer asynchrone Telemetrie aktiv sein`);
  const asyncDiagState = adapter._states.get('speicher.regelung.balanceAsyncJson');
  const asyncDiag = asyncDiagState ? JSON.parse(String(asyncDiagState.val || '{}')) : {};
  assert(asyncDiag.active === true, `${name}: Async-Diagnose muss den aktiven Anker melden`);
  assert(Math.abs(Number(asyncDiag.estimatedActualW) - Number(second)) <= 300, `${name}: geschaetzte Istleistung muss plausibel zum stabilen Sollwert bleiben`);

  if (profile === 'e3dc-rscp') {
    assert.strictEqual(dp.lastWrite('st.e3dcSetPowerMode'), 2, `${name}: E3/DC muss DISCHARGE-Modus schreiben`);
  }
  if (profile === 'sungrow-hybrid') {
    const writeMode = adapter._states.get('speicher.regelung.sungrowHybridSchreibmodus');
    assert(writeMode && String(writeMode.val).includes('hold'), `${name}: Sungrow muss im Zielband einen Hold-Schreibmodus melden`);
  }
}

async function runChargeSequence() {
  const adapter = makeAdapter({ profile: 'generic', farm: false });
  adapter.config.storage.pvEnabled = true;
  const dp = new MutableDp({
    'grid.powerW': entry(-2900, 'grid.filtered'),
    'grid.powerRawW': entry(-2900, 'grid.raw'),
    'st.socPct': entry(60, 'battery.soc'),
    'st.batteryPowerW': entry(-2900, 'battery.actualPower', 20000),
    'st.targetPowerW': entry(0, 'battery.targetPowerW'),
  });
  const mod = new SpeicherRegelungModule(adapter, dp);

  await mod.tick();
  const first = dp.lastWrite('st.targetPowerW');
  assert.strictEqual(first, -5850, `Generic Laden: erster Schnellregler-Sollwert muss laufende Ladung plus vollen Exportfehler enthalten: ${first}`);

  dp.setValue('grid.powerW', -300);
  dp.setValue('grid.powerRawW', -300);
  await mod.tick();
  const second = dp.lastWrite('st.targetPowerW');
  assert.strictEqual(second, -5850, `Generic Laden: erwartete Speicherreaktion plus verbleibender Export muss den stabilen absoluten Sollwert halten: ${second}`);

  for (let i = 0; i < 8; i += 1) {
    await mod.tick();
    assert.strictEqual(dp.lastWrite('st.targetPowerW'), second, `Generic Laden: unveraenderte Messwerte duerfen nicht hochintegrieren (Tick ${i + 1})`);
  }

  dp.setValue('grid.powerW', 50);
  dp.setValue('grid.powerRawW', 50);
  await mod.tick();
  const held = dp.lastWrite('st.targetPowerW');
  assert.strictEqual(held, second, `Generic Laden: im Zielband muss die laufende Beladung gehalten werden: ${held}`);
}

async function runNoFeedbackSafety() {
  const adapter = makeAdapter({ profile: 'generic', farm: false });
  const dp = makeDp({ targetMode: 'signed', profile: 'generic', includeActual: false });
  const mod = new SpeicherRegelungModule(adapter, dp);
  mod._lastTargetW = 71600;
  mod._lastTargetWriteMs = nowMs();
  mod._lastSource = 'eigenverbrauch';

  dp.setValue('grid.powerW', 2600);
  dp.setValue('grid.powerRawW', 2600);
  await mod.tick();
  const target = dp.lastWrite('st.targetPowerW');
  assert(target >= 2500 && target <= 2800, `Ohne echten Istwert darf alter 71,6-kW-Sollwert nicht integriert werden: ${target}`);
  const feedback = adapter._states.get('speicher.regelung.batteryPowerBalanceTrusted');
  assert(feedback && feedback.val === false, 'Ohne Batterie-Istwert muss der Feedback-Puffer inaktiv bleiben');
}

async function runEvcsProtectionAsyncNoPulse() {
  const adapter = makeAdapter({ profile: 'generic', farm: false });
  adapter.config.storage.selfImportThresholdW = 20;
  adapter._emsCaps = {
    evcsStoragePolicy: {
      protectedLoadW: 4200,
      protectedWallboxes: 1,
      assistRequestedLoadW: 0,
      source: 'test-real-vehicle-load',
      ts: nowMs(),
    },
  };

  // Batterie-Istleistung ist 20 s alt, liegt aber noch innerhalb des sicheren
  // Async-Haltefensters. Der NVP kommt weiterhin sekundenaktuell. Genau in diesem
  // Zwischenraum erzeugte der EVCS-Speicherschutz frueher 0-W-Pulse bzw. eine
  // schrittweise Absenkung bis 0 W.
  const sampleTs = nowMs() - 20000;
  const dp = new MutableDp({
    'grid.powerW': { val: 4200, objectId: 'grid.filtered', ts: nowMs() },
    'grid.powerRawW': { val: 4200, objectId: 'grid.raw', ts: nowMs() },
    'st.socPct': { val: 80, objectId: 'battery.soc', ts: nowMs() },
    'st.batteryPowerW': { val: 1500, objectId: 'battery.actualPower', ts: sampleTs },
    'st.targetPowerW': entry(0, 'battery.targetPowerW'),
  });
  const mod = new SpeicherRegelungModule(adapter, dp);

  for (let i = 0; i < 8; i += 1) {
    dp.entries['grid.powerW'].ts = nowMs();
    dp.entries['grid.powerRawW'].ts = nowMs();
    dp.entries['st.batteryPowerW'].ts = sampleTs;
    await mod.tick();
    const target = dp.lastWrite('st.targetPowerW');
    assert.strictEqual(target, 1450, `EVCS-Schutz Async-Tick ${i + 1}: Hausentladung muss stabil 1450 W bleiben, erhalten ${target}`);
    const diagState = adapter._states.get('speicher.regelung.evcsSpeicherSchutzJson');
    const diag = diagState ? JSON.parse(String(diagState.val || '{}')) : {};
    assert.strictEqual(diag.explicitStop, false, `EVCS-Schutz Async-Tick ${i + 1}: kein expliziter 0-W-Stopp zulaessig`);
    assert.strictEqual(diag.storageDischargeBasisSource, 'async-feedback-anchor', `EVCS-Schutz Async-Tick ${i + 1}: Async-Messanker muss verwendet werden`);
  }

  // Reagiert der NVP auf die um 50 W reduzierte Speicherleistung, attribuiert der
  // vorhandene Async-Regler diese Reaktion genau einmal. Der Zielwert bleibt
  // weiterhin bei 1450 W und pendelt weder auf 1500 W zurueck noch Richtung 0 W.
  dp.setValue('grid.powerW', 4250);
  dp.setValue('grid.powerRawW', 4250);
  dp.entries['st.batteryPowerW'].ts = sampleTs;
  await mod.tick();
  assert.strictEqual(dp.lastWrite('st.targetPowerW'), 1450, 'EVCS-Schutz: erwartete NVP-Reaktion muss den bestaetigten Hausentlade-Sollwert stabil halten');
}

async function runExactSungrowCustomerCase() {
  const adapter = makeAdapter({ profile: 'sungrow-hybrid', farm: false });
  const sampleTs = nowMs() - 2000;
  const dp = new MutableDp({
    'grid.powerW': { val: 526, objectId: 'grid.filtered', ts: nowMs() },
    'grid.powerRawW': { val: 526, objectId: 'grid.raw', ts: nowMs() },
    'st.socPct': { val: 80, objectId: 'battery.soc', ts: nowMs() },
    'st.batteryPowerW': { val: 2000, objectId: 'sungrow.actualPower', ts: sampleTs },
    'st.targetChargePowerW': entry(0, 'sungrow.ctrl.chargePowerW'),
    'st.targetDischargePowerW': entry(0, 'sungrow.ctrl.dischargePowerW'),
    'st.run': entry(false, 'sungrow.ctrl.run'),
  });
  const mod = new SpeicherRegelungModule(adapter, dp);

  const identicalTargets = [];
  for (let i = 0; i < 10; i += 1) {
    // NVP bleibt frisch, die Sungrow-Batterietelemetrie behaelt absichtlich exakt
    // denselben Wert und Zeitstempel wie im Kundenfall.
    dp.setValue('grid.powerW', 526);
    dp.setValue('grid.powerRawW', 526);
    dp.entries['st.batteryPowerW'].ts = sampleTs;
    await mod.tick();
    identicalTargets.push(dp.lastWrite('st.targetDischargePowerW'));
    if (i === 0) {
      const firstInterval = adapter._states.get('speicher.regelung.batteryPowerFeedbackSampleIntervalMs');
      const firstCadence = adapter._states.get('speicher.regelung.batteryPowerFeedbackCadenceMs');
      assert(firstInterval && firstInterval.val === null, 'Erstes Speicher-Sample darf kein kuenstliches Epoch-Intervall erzeugen');
      assert(firstCadence && firstCadence.val === null, 'Erstes Speicher-Sample darf noch keine Telemetrieperiode vortaeuschen');
    }
  }
  identicalTargets.forEach((value, index) => {
    assert.strictEqual(value, 2476, `Sungrow Kundenfall: Tick ${index + 1} muss bei 2.476 W zur Zielmitte bleiben, erhalten ${value}`);
  });
  assert(Math.max(...identicalTargets) < 2600, `Sungrow Kundenfall darf niemals auf 4.426 W hochlaufen: ${identicalTargets.join(', ')}`);

  // Eine echte neue Last am NVP wird genau einmal nachgefuehrt.
  dp.setValue('grid.powerW', 726);
  dp.setValue('grid.powerRawW', 726);
  dp.entries['st.batteryPowerW'].ts = sampleTs;
  await mod.tick();
  assert.strictEqual(dp.lastWrite('st.targetDischargePowerW'), 2676, 'Sungrow Kundenfall: +200 W neue NVP-Last muss den akzeptierten Sollwert genau einmal auf 2.676 W anheben');
  await mod.tick();
  assert.strictEqual(dp.lastWrite('st.targetDischargePowerW'), 2676, 'Sungrow Kundenfall: unveraenderte Last darf den Sollwert nicht erneut anheben');

  // Sinkt der NVP durch die erwartete Speicherreaktion auf das Ziel, bleibt der
  // akzeptierte Sollwert bestehen, obwohl der echte Batterie-Istwert noch alt ist.
  dp.setValue('grid.powerW', 50);
  dp.setValue('grid.powerRawW', 50);
  dp.entries['st.batteryPowerW'].ts = sampleTs;
  await mod.tick();
  assert.strictEqual(dp.lastWrite('st.targetDischargePowerW'), 2676, 'Sungrow Kundenfall: NVP-Reaktion darf den akzeptierten Sollwert nicht durch einen doppelten Generic-Cap zurueckpendeln lassen');

  // Erst eine neue physische Speicherprobe setzt den Messanker neu.
  dp.entries['st.batteryPowerW'] = { val: 2500, objectId: 'sungrow.actualPower', ts: nowMs() };
  dp.setValue('grid.powerW', 180);
  dp.setValue('grid.powerRawW', 180);
  await mod.tick();
  assert.strictEqual(dp.lastWrite('st.targetDischargePowerW'), 2630, 'Sungrow Kundenfall: neue Istprobe 2.500 W + 130 W Zielfehler muss 2.630 W ergeben');
  const learnedInterval = adapter._states.get('speicher.regelung.batteryPowerFeedbackSampleIntervalMs');
  const learnedCadence = adapter._states.get('speicher.regelung.batteryPowerFeedbackCadenceMs');
  assert(learnedInterval && Number(learnedInterval.val) >= 1500, `Zweites reales Sample muss ein plausibles Intervall liefern: ${learnedInterval && learnedInterval.val}`);
  assert(learnedCadence && Number(learnedCadence.val) >= 1500, `Zweites reales Sample muss die Telemetrieperiode anlernen: ${learnedCadence && learnedCadence.val}`);
}

(async () => {
  await runPersistentDischargeProfile({ name: 'Generic signed', profile: 'generic', targetMode: 'signed' });
  await runPersistentDischargeProfile({ name: 'Generic split', profile: 'generic', targetMode: 'split' });
  await runPersistentDischargeProfile({ name: 'Sungrow Hybrid', profile: 'sungrow-hybrid', targetMode: 'split' });
  await runPersistentDischargeProfile({ name: 'E3/DC RSCP', profile: 'e3dc-rscp', targetMode: 'e3dc' });
  await runPersistentDischargeProfile({ name: 'Speicherfarm', profile: 'generic', targetMode: 'signed', farm: true });
  await runChargeSequence();
  await runExactSungrowCustomerCase();
  await runEvcsProtectionAsyncNoPulse();
  await runNoFeedbackSafety();

  console.log('[storage-async-feedback-all-profiles] OK: Async-Telemetrie und EVCS-Speicherschutz nutzen stabile Mess-/Kommandoanker ohne 0-W-Pulse oder Sollwertintegration; Sungrow, signed, split, E3/DC und Farm bleiben stabil.');
})().catch((err) => {
  console.error('[storage-async-feedback-all-profiles] ERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
});
