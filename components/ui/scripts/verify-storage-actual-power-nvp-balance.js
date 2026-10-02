#!/usr/bin/env node
'use strict';
/**
 * Regression 0.8.94: Istleistungsbasiertes Speicher-NVP-Balancing mit
 * stabilem Halten des letzten nicht-null Sollwerts im NVP-Zielband.
 *
 * Geprueft wird die zentrale Regelgleichung fuer Laden und Entladen:
 *   Soll = Batterie-Ist + (NVP-Ist - Zielmitte), sobald die Messtoleranz verlassen ist
 *
 * Zusaetzlich prueft der Test:
 * - kontrollierter Leistungsaufbau im Legacy-Helfer und direkter Aufbau im produktiven Schnellregler,
 * - schnelle Ruecknahme bei Lastabwurf/Wolken,
 * - Richtungswechsel ohne 0-W-Zwischenrunde direkt zum Speicher,
 * - RAW-NVP bei frischer oder begrenzt gehaltener Batterie-Istleistung,
 * - asynchrone Batterie-/NVP-Zeitstempel ohne Sollwert-Absturz,
 * - sicherer Fallback ohne Hochintegration alter Entlade-Sollwerte,
 * - keine zweite Rampe relativ zu einem alten Sollwert im produktiven Tick,
 * - 0 W bleibt ein ausdruecklicher Stop und wird nicht bei erreichtem NVP-Ziel
 *   versehentlich als neuer Lade-/Entladesollwert geschrieben.
 */
const assert = require('assert');
const { SpeicherRegelungModule } = require('../ems/modules/storage-control');

function nowMs() { return Date.now(); }

class FakeDp {
  constructor(entries) {
    this.entries = entries || {};
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
    return rec.val === true || rec.val === 'true' || rec.val === 1 || rec.val === '1';
  }
  async writeNumber(key, value) {
    this.writes.push({ key, value: Number(value) });
    return true;
  }
  async writeBoolean(key, value) {
    this.writes.push({ key, value: !!value });
    return true;
  }
  lastWrite(key = 'st.targetPowerW') {
    const list = this.writes.filter((w) => w.key === key);
    return list.length ? list[list.length - 1].value : null;
  }
}

function entry(val, objectId, ageMs = 0) {
  return {
    val,
    objectId,
    ts: nowMs() - Math.max(0, Number(ageMs) || 0),
  };
}

function makeAdapter(storagePatch = {}) {
  const states = new Map();
  return {
    config: {
      enableStorageControl: true,
      enableStorageFarm: false,
      enableMultiUse: false,
      enablePeakShaving: false,
      enableGridConstraints: false,
      storage: {
        controlMode: 'targetPower',
        staleTimeoutSec: 15,
        maxDeltaWPerTick: 500,
        pvMaxDeltaWPerTick: 1500,
        stepW: 1,
        pvEnabled: true,
        pvExportThresholdW: 50,
        selfTargetGridImportW: 50,
        selfImportThresholdW: 50,
        selfMinSocPct: 20,
        selfMaxSocPct: 100,
        ...storagePatch,
      },
    },
    stateCache: {},
    log: { warn() {}, info() {}, debug() {}, error() {} },
    async setObjectNotExistsAsync() {},
    async setStateAsync(id, val) { states.set(id, { val, ts: nowMs() }); },
    async getStateAsync(id) { return states.get(id) || null; },
    _nwGetNumberFromCache() { return null; },
    _states: states,
  };
}

function buildBalance(mod, patch = {}) {
  return mod._buildActualAwareNvpBalance({
    rawNvpW: 700,
    fallbackNvpW: 700,
    nvpAgeMs: 100,
    targetNvpW: 50,
    deadbandW: 50,
    batteryPowerW: 500,
    batteryAgeMs: 100,
    batteryPowerTrusted: true,
    lastTargetW: 500,
    lastTargetAllowed: true,
    maxDischargeCorrectionW: 500,
    maxChargeCorrectionW: 1500,
    feedbackMaxAgeMs: 8000,
    feedbackMaxSkewMs: 5000,
    stepW: 1,
    ...patch,
  });
}

async function runTick({
  gridW,
  gridRawW = gridW,
  battPowerW,
  battAgeMs = 0,
  gridAgeMs = 0,
  socPct = 80,
  lastTargetW = 0,
  lastSource = 'eigenverbrauch',
  storagePatch = {},
  tarifVis = null,
}) {
  const dp = new FakeDp({
    'grid.powerW': entry(gridW, 'grid.filtered', gridAgeMs),
    'grid.powerRawW': entry(gridRawW, 'grid.raw', gridAgeMs),
    'st.socPct': entry(socPct, 'battery.soc'),
    'st.batteryPowerW': entry(battPowerW, 'battery.actualPower', battAgeMs),
    'st.targetPowerW': entry(0, 'battery.target'),
  });
  const adapter = makeAdapter(storagePatch);
  if (tarifVis && typeof tarifVis === 'object') adapter._tarifVis = tarifVis;
  const mod = new SpeicherRegelungModule(adapter, dp);
  mod._lastTargetW = lastTargetW;
  mod._lastSource = lastSource;
  await mod.tick();
  return { targetW: dp.lastWrite(), adapter, mod, dp };
}

(async () => {
  const mod = new SpeicherRegelungModule(makeAdapter(), new FakeDp());

  const discharge = buildBalance(mod);
  assert.strictEqual(discharge.feedbackUsed, true, 'frische Batterie-Istleistung muss verwendet werden');
  assert.strictEqual(Math.round(discharge.rawTargetW), 1150, 'Rohziel muss Ist 500 W + 650 W Fehler zur Zielmitte sein');
  assert.strictEqual(Math.round(discharge.targetW), 1000, 'Entladeaufbau muss auf +500 W Korrektur begrenzt werden');

  const follow = buildBalance(mod, {
    rawNvpW: 150,
    fallbackNvpW: 150,
    batteryPowerW: 900,
    lastTargetW: 1000,
  });
  assert.strictEqual(Math.round(follow.targetW), 1000, '900 W Ist + 100 W Restfehler zur Zielmitte muss 1000 W ergeben');

  // Kundenfall 19.07.2026 (Sungrow/asynchrone Telemetrie): Derselbe echte
  // Batterie-Messwert darf bei unveraendertem NVP exakt einmal als Regelanker
  // dienen. Der zuletzt geschriebene Sollwert darf nicht als neue Istleistung
  // zurueckgefuehrt werden (2,45 -> 2,95 -> 3,43 -> 4,45 kW).
  {
    const anchorMod = new SpeicherRegelungModule(makeAdapter(), new FakeDp());
    let now = 1_000_000;
    let lastTargetW = 0;
    let lastWriteMs = 0;
    const runAnchorCycle = (nvpW, measuredW, measuredAgeMs) => {
      const feedback = anchorMod._resolveBatteryBalanceFeedback({
        nowMs: now,
        measuredW,
        measuredAgeMs,
        mappingTrusted: true,
        objectId: 'customer.sungrow.actualPowerW',
        source: 'single-storage',
        freshAgeMs: 8000,
        holdAgeMs: 45000,
        lastTargetW,
        lastTargetWriteMs: lastWriteMs,
        lastTargetAllowed: true,
        maxPredictionDeltaW: 2000,
        zeroToleranceW: 100,
      });
      const balance = anchorMod._buildActualAwareNvpBalance({
        rawNvpW: nvpW,
        fallbackNvpW: nvpW,
        nvpAgeMs: 0,
        targetNvpW: 50,
        deadbandW: 30,
        batteryPowerW: feedback.feedbackW,
        batteryMeasuredW: feedback.measuredW,
        batteryAgeMs: feedback.sampleAgeMs,
        batteryPowerTrusted: true,
        batteryFeedbackSource: feedback.source,
        batteryFeedbackHeld: feedback.held,
        batteryFeedbackPredicted: feedback.predicted,
        batteryFeedbackPredictionDeltaW: feedback.predictionDeltaW,
        lastTargetW,
        lastTargetAllowed: true,
        maxDischargeCorrectionW: 1000,
        maxChargeCorrectionW: 1500,
        feedbackMaxAgeMs: 45000,
        nvpFeedbackMaxAgeMs: 8000,
        stepW: 1,
      });
      lastTargetW = Math.round(balance.targetW);
      lastWriteMs = now;
      now += 1000;
      return { feedback, balance };
    };

    for (let i = 0; i < 10; i += 1) {
      const cycle = runAnchorCycle(526, 2000, i * 1000);
      assert.strictEqual(Math.round(cycle.balance.targetW), 2476, `unveraenderter Kundenfall darf nicht hochintegrieren (Tick ${i + 1})`);
      assert.strictEqual(cycle.feedback.feedbackW, 2000, 'der echte 2-kW-Messwert muss unveraenderlicher Regelanker bleiben');
      assert.strictEqual(cycle.feedback.predicted, false, 'Sollwertprognose in die Batterie-Istleistung ist deaktiviert');
    }

    const changedNvp = runAnchorCycle(726, 2000, 10000);
    assert.strictEqual(Math.round(changedNvp.balance.targetW), 2676, 'NVP-Aenderung muss absolut zum gleichen Messanker nachgefuehrt werden');
    const changedNvpRepeat = runAnchorCycle(726, 2000, 11000);
    assert.strictEqual(Math.round(changedNvpRepeat.balance.targetW), 2676, 'auch der neue NVP-Fehler darf nicht mehrfach addiert werden');

    const newActual = runAnchorCycle(180, 2350, 0);
    assert.strictEqual(Math.round(newActual.balance.targetW), 2480, 'erst ein neuer echter Istwert darf den Regelanker neu setzen');
    assert.strictEqual(newActual.feedback.sampleUpdated, true, 'neuer Batterie-Zeitstempel muss als neuer Messanker erkannt werden');
  }

  const stable = buildBalance(mod, {
    rawNvpW: 50,
    fallbackNvpW: 50,
    batteryPowerW: 1000,
    lastTargetW: 1000,
  });
  assert.strictEqual(Math.round(stable.targetW), 1000, 'im Zielband muss der passende Sollwert stabil bleiben');
  assert.strictEqual(stable.mode, 'feedback-hold-command', 'Zielband muss ohne Messwertzittern halten');

  const explicitChargeHold = buildBalance(mod, {
    rawNvpW: 50,
    fallbackNvpW: 50,
    batteryPowerW: 0,
    batteryAgeMs: 9000,
    lastTargetW: -3000,
    holdLastNonZeroInDeadband: true,
  });
  assert.strictEqual(explicitChargeHold.feedbackUsed, false, 'Hold-Test muss ohne Istfeedback laufen');
  assert.strictEqual(explicitChargeHold.targetW, -3000, 'letzte Ladeanforderung muss im Zielband aktiv bleiben');
  assert.strictEqual(explicitChargeHold.holdingLastCommand, true, 'Lade-Hold muss diagnostiziert werden');
  assert.strictEqual(explicitChargeHold.mode, 'fallback-hold-last-command', 'Lade-Hold braucht eindeutigen Diagnosemodus');

  const explicitDischargeHold = buildBalance(mod, {
    rawNvpW: 50,
    fallbackNvpW: 50,
    batteryPowerW: 0,
    batteryAgeMs: 9000,
    lastTargetW: 2500,
    holdLastNonZeroInDeadband: true,
  });
  assert.strictEqual(explicitDischargeHold.targetW, 2500, 'letzte Entladeanforderung muss im Zielband aktiv bleiben');
  assert.strictEqual(explicitDischargeHold.holdingLastCommand, true, 'Entlade-Hold muss diagnostiziert werden');

  const release = buildBalance(mod, {
    rawNvpW: -600,
    fallbackNvpW: -600,
    batteryPowerW: 1000,
    lastTargetW: 1000,
  });
  assert.strictEqual(Math.round(release.targetW), 350, 'Export muss laufende Entladung direkt zur Zielmitte reduzieren');
  assert(release.mode.includes('fast-release'), 'Ruecknahme in Richtung 0 muss schnell erfolgen');

  const reverseDirect = buildBalance(mod, {
    rawNvpW: -1200,
    fallbackNvpW: -1200,
    batteryPowerW: 1000,
    lastTargetW: 1000,
  });
  assert.strictEqual(reverseDirect.targetW, -250, 'Entladen -> Laden muss den neuen negativen Sollwert zur Zielmitte direkt schreiben');
  assert(reverseDirect.mode.includes('direct-reverse'), 'direkter Richtungswechsel muss diagnostiziert werden');

  const charge = buildBalance(mod, {
    rawNvpW: -1000,
    fallbackNvpW: -1000,
    batteryPowerW: -2000,
    lastTargetW: -2000,
  });
  assert.strictEqual(Math.round(charge.rawTargetW), -3050, 'Laderohziel muss -2000 W Ist plus -1050 W Fehler zur Zielmitte sein');
  assert.strictEqual(Math.round(charge.targetW), -3050, 'Ladekorrektur innerhalb 1500 W muss bis zur Zielmitte voll uebernommen werden');

  const directChargeToDischarge = buildBalance(mod, {
    rawNvpW: 2500,
    fallbackNvpW: 2500,
    batteryPowerW: -2000,
    lastTargetW: -2000,
  });
  assert.strictEqual(directChargeToDischarge.targetW, 450, 'Laden -> Entladen muss den neuen positiven Sollwert zur Zielmitte direkt schreiben');
  assert(directChargeToDischarge.mode.includes('direct-reverse'), 'Laden -> Entladen braucht den direkten Diagnosemodus');

  // Feldfall 18.07.2026: Der Speicher misst noch -35 W Laden, waehrend am
  // Netzanschlusspunkt 1092 W Bezug anliegen. Der neue Entladesollwert darf
  // nicht auf 0 W geklemmt werden.
  const fieldReverse = buildBalance(mod, {
    rawNvpW: 1092,
    fallbackNvpW: 1092,
    batteryPowerW: -35,
    batteryMeasuredW: -35,
    lastTargetW: -35,
  });
  assert.strictEqual(fieldReverse.rawTargetW, 1007, 'Feldfall muss -35 W Ist + 1042 W Fehler zur Zielmitte ergeben');
  assert.strictEqual(fieldReverse.targetW, 1007, 'Feldfall muss direkt auf Entladen zur Zielmitte wechseln, nicht auf 0 W');
  assert(fieldReverse.mode.includes('direct-reverse'), 'Feldfall muss als direkter Richtungswechsel sichtbar sein');

  const stale = buildBalance(mod, {
    rawNvpW: 2600,
    fallbackNvpW: 2600,
    batteryPowerW: 3000,
    batteryAgeMs: 9000,
    lastTargetW: 71600,
  });
  assert.strictEqual(stale.feedbackUsed, false, 'alte Batterie-Istleistung darf nicht verwendet werden');
  assert(stale.targetW >= 2500 && stale.targetW <= 2600, `Fallback muss nur aktuellen NVP-Bedarf kommandieren: ${stale.targetW}`);
  assert.strictEqual(stale.baseW, 0, 'alter positiver Entlade-Sollwert darf keine Fallback-Basis sein');

  const staleCharge = buildBalance(mod, {
    rawNvpW: -1000,
    fallbackNvpW: -1000,
    batteryPowerW: -3000,
    batteryAgeMs: 9000,
    lastTargetW: -71600,
  });
  assert.strictEqual(staleCharge.feedbackUsed, false, 'alte Lade-Istleistung darf nicht verwendet werden');
  assert.strictEqual(Math.round(staleCharge.targetW), -1050, 'ohne Istfeedback darf nur die aktuelle Exportdifferenz zur Zielmitte gelten');
  assert.strictEqual(staleCharge.baseW, 0, 'alter negativer Ladesollwert darf nicht als Istleistung hochintegriert werden');
  assert.strictEqual(staleCharge.mode, 'fallback-direct-export', 'sicherer Lade-Fallback muss diagnostiziert werden');

  const rawWins = buildBalance(mod, {
    rawNvpW: 700,
    fallbackNvpW: -500,
    batteryPowerW: 500,
  });
  assert.strictEqual(rawWins.nvpW, 700, 'bei frischem Istfeedback muss RAW-NVP statt verzoegertem Filter fuehren');
  assert.strictEqual(Math.round(rawWins.targetW), 1000, 'RAW-NVP muss in Istleistung plus Differenz eingehen');

  const skewed = buildBalance(mod, {
    rawNvpW: 700,
    fallbackNvpW: 700,
    batteryPowerW: 500,
    batteryAgeMs: 7000,
    nvpAgeMs: 100,
    feedbackMaxAgeMs: 8000,
    feedbackMaxSkewMs: 5000,
  });
  assert.strictEqual(skewed.feedbackUsed, true, 'asynchrone Speicher-/NVP-Werte muessen standardmaessig gemeinsam bilanziert werden');
  assert.strictEqual(Math.round(skewed.targetW), 1000, 'Zeitversatz darf die Istleistung-plus-NVP-Regelung nicht auf den NVP-Einzelwert abwerfen');

  const alignmentOptIn = buildBalance(mod, {
    rawNvpW: 700,
    fallbackNvpW: 700,
    batteryPowerW: 500,
    batteryAgeMs: 7000,
    nvpAgeMs: 100,
    feedbackMaxAgeMs: 8000,
    feedbackMaxSkewMs: 5000,
    feedbackRequireAligned: true,
  });
  assert.strictEqual(alignmentOptIn.feedbackUsed, false, 'explizit angeforderte Zeitgleichheit muss weiterhin als Experten-Sicherheitsoption funktionieren');

  // Produktiver Tick: Ein alter 5-kW-Sollwert darf den neuen, aus 500 W Ist +
  // 650 W Fehler zur Zielmitte im Legacy-Helfer; produktiv wird der Schnellregler nicht durch 500 W ausgebremst nicht durch
  // eine zweite Sollwert-Rampe wieder nach oben ziehen.
  const tick = await runTick({
    gridW: 700,
    battPowerW: 500,
    lastTargetW: 5000,
  });
  assert.strictEqual(tick.targetW, 1150, `produktiver Schnellregler muss die volle Korrektur zur Zielmitte schreiben: ${tick.targetW}`);
  assert.strictEqual(tick.adapter._states.get('speicher.regelung.balanceFeedbackVerwendet').val, true, 'Diagnose muss verwendetes Istfeedback anzeigen');
  assert.strictEqual(tick.adapter._states.get('speicher.regelung.balanceNvpFehlerW').val, 650, 'Diagnose muss den Fehler zur Zielmitte anzeigen');
  assert.strictEqual(tick.adapter._states.get('speicher.regelung.balanceNvpBandFehlerW').val, 650, 'Diagnose muss den wirksamen Fehler zur Zielmitte anzeigen');
  assert.strictEqual(tick.adapter._states.get('speicher.regelung.balanceNvpAktivZielW').val, 50, 'aktive Zielmitte muss sichtbar sein');
  assert.strictEqual(tick.adapter._states.get('speicher.regelung.balanceNvpBandUnterW').val, 0);
  assert.strictEqual(tick.adapter._states.get('speicher.regelung.balanceNvpBandOberW').val, 100);
  assert.strictEqual(tick.adapter._states.get('speicher.regelung.balanceIstLeistungW').val, 500, 'Diagnose muss die Istleistung anzeigen');

  const staleTick = await runTick({
    gridW: 2600,
    battPowerW: 3000,
    battAgeMs: 9000,
    lastTargetW: 71600,
  });
  assert.strictEqual(staleTick.adapter._states.get('speicher.regelung.balanceFeedbackVerwendet').val, true, '9 s alter Speicher-Istwert muss innerhalb der neuen Haltezeit weiter verwendet werden');
  assert.strictEqual(staleTick.adapter._states.get('speicher.regelung.balanceFeedbackGehalten').val, true, 'gehaltener Istwert muss diagnostiziert werden');
  assert.strictEqual(staleTick.adapter._states.get('speicher.regelung.balanceIstLeistungW').val, 3000, 'gehaltener echter Istwert muss als Regelbasis sichtbar bleiben');
  assert.strictEqual(staleTick.targetW, 5550, `gehaltener Istwert plus volle Schnellregler-Korrektur erwartet: ${staleTick.targetW}`);

  const tickCharge = await runTick({
    gridW: -1000,
    battPowerW: -2000,
    lastTargetW: -500,
    lastSource: 'pv',
  });
  assert.strictEqual(tickCharge.targetW, -3050, `Lade-Tick muss Istleistung plus Zielfehler schreiben: ${tickCharge.targetW}`);

  const tickReverse = await runTick({
    gridW: -1200,
    battPowerW: 1000,
    lastTargetW: 1000,
  });
  assert.strictEqual(tickReverse.targetW, -250, `Richtungswechsel muss im produktiven Tick direkt zur Zielmitte Laden schreiben: ${tickReverse.targetW}`);

  const fieldTick = await runTick({
    gridW: 1092,
    battPowerW: -35,
    lastTargetW: -35,
    lastSource: 'pv',
  });
  assert.strictEqual(fieldTick.targetW, 1007, `Feldfall darf im produktiven Tick nicht auf 0 W klemmen: ${fieldTick.targetW}`);

  // Nicht nur der NVP-Helfer, sondern auch die allgemeine Dispatcher-Rampe
  // muss einen echten Richtungswechsel direkt durchlassen. Dieser Tariffall
  // wechselt von 3 kW Entladen unmittelbar auf 4 kW Netzladen. Ohne den globalen
  // Bypass wuerde die Standardrampe faelschlich noch +2,5 kW weiter entladen.
  // RC63 setzt fuer diesen reinen Rampentest die vollstaendige, bereits extern
  // validierte Speicher-Netzladefreigabe explizit auf true; ein guenstiger Tarif
  // oder Negativpreis allein darf diesen Pfad nicht mehr oeffnen.
  const tariffChargeReverse = await runTick({
    gridW: 1000,
    battPowerW: 3000,
    lastTargetW: 3000,
    lastSource: 'eigenverbrauch',
    storagePatch: { pvEnabled: false, tariffPermissionHoldSec: 0, allowGridCharge: true },
    tarifVis: {
      ts: Date.now(),
      aktiv: true,
      tarifAktiv: true,
      currentPriceFresh: true,
      state: 'guenstig',
      speicherSollW: -4000,
      negativeActive: true,
      gridImportPreferred: true,
      netzbezugBevorzugt: true,
      storageGridChargeAllowed: true,
      storageGridChargeSource: 'dynamic-tariff-cheap',
      storageGridChargeBlockReason: '',
      netFeeEnabled: false,
      netFeeMode: 'off',
      storageManualWindowActive: false,
      storageChargeWindowOk: false,
    },
  });
  assert.strictEqual(tariffChargeReverse.targetW, -4000, `Tarif-Richtungswechsel muss direkt Netzladen schreiben: ${tariffChargeReverse.targetW}`);

  const holdChargeTick = await runTick({
    gridW: 50,
    battPowerW: 0,
    battAgeMs: 9000,
    lastTargetW: -3000,
    lastSource: 'pv',
  });
  assert.strictEqual(holdChargeTick.targetW, -3000, `NVP-Ziel darf laufende Beladung nicht mit 0 W stoppen: ${holdChargeTick.targetW}`);
  assert.strictEqual(holdChargeTick.adapter._states.get('speicher.regelung.balanceLetztenSollwertGehalten').val, true, 'produktiver Lade-Hold muss sichtbar sein');

  const holdDischargeTick = await runTick({
    gridW: 50,
    battPowerW: 0,
    battAgeMs: 9000,
    lastTargetW: 2500,
    lastSource: 'eigenverbrauch',
  });
  assert.strictEqual(holdDischargeTick.targetW, 2500, `NVP-Ziel darf laufende Entladung nicht mit 0 W stoppen: ${holdDischargeTick.targetW}`);
  assert.strictEqual(holdDischargeTick.adapter._states.get('speicher.regelung.balanceGehaltenSollW').val, 2500, 'gehaltener Entladesollwert muss sichtbar sein');

  const chargeSocStop = await runTick({
    gridW: 50,
    battPowerW: 0,
    battAgeMs: 9000,
    socPct: 100,
    lastTargetW: -3000,
    lastSource: 'pv',
  });
  assert.strictEqual(chargeSocStop.targetW, 0, 'Max-SoC bleibt ein ausdruecklicher Lade-Stop mit 0 W');

  const dischargeSocStop = await runTick({
    gridW: 50,
    battPowerW: 0,
    battAgeMs: 9000,
    socPct: 20,
    lastTargetW: 2500,
    lastSource: 'eigenverbrauch',
  });
  assert.strictEqual(dischargeSocStop.targetW, 0, 'Min-SoC bleibt ein ausdruecklicher Entlade-Stop mit 0 W');

  console.log('[storage-actual-power-nvp-balance] OK: Istleistung plus Fehler zur NVP-Zielmitte regelt stabil; Richtungswechsel werden direkt geschrieben, Schutz- und Wartezustaende bleiben echte 0-W-Stopps.');
})().catch((err) => {
  console.error('[storage-actual-power-nvp-balance] ERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
});
