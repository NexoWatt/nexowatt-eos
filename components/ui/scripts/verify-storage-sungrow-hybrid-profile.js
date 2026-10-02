#!/usr/bin/env node
'use strict';
/**
 * Regression 0.8.86: Sungrow Hybrid ESS Herstellerprofil.
 *
 * Zweck:
 * - Sungrow SH/RS/RT/MG-Hybrid-ESS wird im Tagesbetrieb nicht blind nach
 *   Gebaeudelast oder PV-Deckung gefuehrt, sondern am NVP bilanziert.
 * - Wenn der NVP ausserhalb des Zielbandes liegt, wird der alte/aktuelle
 *   Batteriefluss mit der neuen NVP-Abweichung verrechnet: neue Vorgabe =
 *   Batterie-Istleistung + (NVP-Ist - Ziel).
 * - Im NVP-Zielband bleibt eine wirksame Nicht-Null-Vorgabe erhalten; direkte
 *   PV-/Lastmessungen duerfen einen unplausiblen 0-W-Istwert ersetzen.
 * - Alte PV-Deckungszweige duerfen keinen zyklischen 0-W-Stop mehr schreiben.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { SpeicherRegelungModule } = require('../ems/modules/storage-control');

function nowMs() { return Date.now(); }

class FakeDp {
  constructor(entries) {
    this.entries = entries || {};
    this.writes = [];
  }
  getEntry(key) { return this.entries[key] || null; }
  _rec(key) { return this.entries[key] || null; }
  getAgeMs(key) {
    const rec = this._rec(key);
    if (!rec || typeof rec.ts !== 'number') return null;
    return Math.max(0, nowMs() - rec.ts);
  }
  getNumberFresh(key, staleMs, fallback = null) {
    const rec = this._rec(key);
    if (!rec) return fallback;
    const age = this.getAgeMs(key);
    if (age !== null && Number.isFinite(Number(staleMs)) && age > Number(staleMs)) return fallback;
    const n = Number(rec.val);
    return Number.isFinite(n) ? n : fallback;
  }
  getNumber(key, fallback = null) {
    const rec = this._rec(key);
    if (!rec) return fallback;
    const n = Number(rec.val);
    return Number.isFinite(n) ? n : fallback;
  }
  getBoolean(key, fallback = false) {
    const rec = this._rec(key);
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
  writesFor(key) { return this.writes.filter(w => w.key === key); }
  lastWrite(key) {
    const matches = this.writesFor(key);
    return matches.length ? matches[matches.length - 1].value : null;
  }
  clearWrites() { this.writes.length = 0; }
  setValue(key, value, objectId) {
    const previous = this.entries[key] || {};
    this.entries[key] = {
      ...previous,
      val: value,
      ts: nowMs(),
      objectId: objectId || previous.objectId || `test.${key}`,
    };
  }
  remove(key) { delete this.entries[key]; }
}

function makeEntry(val, objectId) {
  return { val, ts: nowMs(), objectId: objectId || `test.${Math.random().toString(36).slice(2)}` };
}

function makeAdapter(extraConfig = {}, stateCache = {}) {
  const states = new Map();
  return {
    config: {
      enableStorageControl: true,
      enableStorageFarm: false,
      enableMultiUse: false,
      enablePeakShaving: false,
      enableGridConstraints: false,
      storageFarm: {},
      datapoints: {
        consumptionTotal: 'meter.buildingPowerW',
        pvPower: 'inverter.pvPowerW',
      },
      storage: {
        controlMode: 'targetPower',
        coupling: 'dc',
        dcPvPowerObjectId: 'pv.dc',
        staleTimeoutSec: 15,
        maxDeltaWPerTick: 50000,
        pvMaxDeltaWPerTick: 50000,
        stepW: 1,
        pvEnabled: true,
        pvExportThresholdW: 50,
        selfTargetGridImportW: 50,
        selfImportThresholdW: 50,
        selfMinSocPct: 20,
        selfMaxSocPct: 100,
        vendorProfile: 'sungrow-hybrid',
        sungrowPvThresholdW: 300,
        sungrowLoadCoverReserveW: 300,
        sungrowImportThresholdW: 50,
        sungrowTargetGridImportW: 50,
        sungrowAssistBufferW: 150,
        ...(extraConfig.storage || {}),
      },
      ...(extraConfig.root || {}),
    },
    stateCache,
    log: { warn() {}, info() {}, debug() {}, error() {} },
    async setObjectNotExistsAsync() {},
    async setStateAsync(id, val) { states.set(id, { val, ts: nowMs() }); },
    async getStateAsync(id) { return states.get(id) || null; },
    _nwHasMappedDatapoint(key) {
      return !!String(this.config.datapoints && this.config.datapoints[key] || '').trim();
    },
    _nwGetNumberFromCache(id) {
      const rec = this.stateCache && this.stateCache[id];
      const n = Number(rec && rec.value);
      return Number.isFinite(n) ? n : null;
    },
    _nwGetCacheAgeMs(id, now = nowMs()) {
      const rec = this.stateCache && this.stateCache[id];
      if (!rec || !Number.isFinite(Number(rec.ts))) return null;
      return Math.max(0, Number(now) - Number(rec.ts));
    },
    _nwGetNumberFromCacheFresh(id, maxAgeMs, fallback = null, now = nowMs()) {
      const age = this._nwGetCacheAgeMs(id, now);
      if (age !== null && Number.isFinite(Number(maxAgeMs)) && age > Number(maxAgeMs)) return fallback;
      const value = this._nwGetNumberFromCache(id);
      return value === null ? fallback : value;
    },
    _states: states,
  };
}

async function runTick({
  gridW,
  gridRawW = gridW,
  soc = 77,
  battPowerW = null,
  pvW = 0,
  loadW = 0,
  extraConfig = {},
  emsBudget = null,
  runtimePolicy = null,
  lastTargetW = 0,
  lastSource = 'sungrow-assist',
}) {
  const entries = {
    'grid.powerW': makeEntry(gridW, 'grid.filtered'),
    'grid.powerRawW': makeEntry(gridRawW, 'grid.raw'),
    'st.socPct': makeEntry(soc, 'battery.soc'),
    'st.dcPvPowerW': makeEntry(pvW, 'pv.dc'),
    'st.targetChargePowerW': { objectId: 'battery.chargeTarget', ts: nowMs(), val: 0 },
    'st.targetDischargePowerW': { objectId: 'battery.dischargeTarget', ts: nowMs(), val: 0 },
    'st.run': { objectId: 'battery.run', ts: nowMs(), val: false },
  };
  if (battPowerW !== null) entries['st.batteryPowerW'] = makeEntry(battPowerW, 'battery.actualPower');
  const stateCache = {
    consumptionTotal: { value: loadW, ts: nowMs() },
    pvPower: { value: pvW, ts: nowMs() },
    'derived.core.pv.totalW': { value: pvW, ts: nowMs() },
    'derived.core.building.loadTotalW': { value: loadW, ts: nowMs() },
    'derived.core.building.loadSource': { value: 'mapped:consumptionTotal', ts: nowMs() },
  };
  const dp = new FakeDp(entries);
  const adapter = makeAdapter(extraConfig, stateCache);
  if (emsBudget) adapter._emsBudget = emsBudget;
  if (runtimePolicy) {
    adapter._emsCaps = {
      evcsStoragePolicy: {
        ...runtimePolicy,
        ts: nowMs(),
      },
    };
  }
  const mod = new SpeicherRegelungModule(adapter, dp);
  mod._lastTargetW = lastTargetW;
  mod._lastSource = lastSource;
  await mod.tick();
  return { dp, adapter, mod };
}


function makeSharedPvBudget({ totalW = 10100, evcsCapW = 8080, evcsReservedW = 8080, remainingPvW = 2020 } = {}) {
  const reservations = [];
  return {
    ts: Date.now(),
    gates: {
      pvAllocation: {
        mode: 'both',
        evcsSharePct: 80,
        totalW,
        evcsCapW,
        storageGuaranteedW: Math.max(0, totalW - evcsCapW),
      },
    },
    remainingTotalW: totalW,
    remainingPvW,
    consumers: {
      evcs: {
        pvReserveW: evcsReservedW,
        pvUsedW: evcsReservedW,
      },
    },
    order: ['evcs'],
    reservations,
    getPvGrant(req = {}) {
      const requestedW = Number.isFinite(Number(req.requestedW)) ? Math.max(0, Number(req.requestedW)) : Number.MAX_SAFE_INTEGER;
      const maxW = Number.isFinite(Number(req.maxW)) ? Math.max(0, Number(req.maxW)) : Number.POSITIVE_INFINITY;
      const grantW = Math.max(0, Math.min(requestedW, maxW, Number(this.remainingPvW) || 0));
      return { grantW, remainingPvW: Math.max(0, Number(this.remainingPvW) || 0), source: 'central-ems-budget' };
    },
    grant(req = {}) {
      return req.pvOnly === false
        ? { grantW: Math.max(0, Number(req.requestedW) || 0), source: 'central-ems-budget' }
        : this.getPvGrant(req);
    },
    reserve(req) {
      reservations.push({ ...req });
      const reserveW = Math.max(0, Number(req && req.reserveW) || 0);
      const pvReserveW = Math.max(0, Number(req && req.pvReserveW) || 0);
      this.remainingTotalW = Math.max(0, Number(this.remainingTotalW || 0) - reserveW);
      this.remainingPvW = Math.max(0, Number(this.remainingPvW || 0) - pvReserveW);
    },
  };
}

function makePersistentSungrowScenario() {
  const dp = new FakeDp({
    'grid.powerW': makeEntry(-2900, 'grid.filtered'),
    'grid.powerRawW': makeEntry(-2900, 'grid.raw'),
    'st.socPct': makeEntry(62, 'battery.soc'),
    'st.batteryPowerW': makeEntry(-2900, 'battery.actualPower'),
    'st.dcPvPowerW': makeEntry(12000, 'pv.dc'),
    'st.targetChargePowerW': { objectId: 'battery.chargeTarget', ts: nowMs(), val: 0 },
    'st.targetDischargePowerW': { objectId: 'battery.dischargeTarget', ts: nowMs(), val: 0 },
    'st.run': { objectId: 'battery.run', ts: nowMs(), val: false },
  });
  const stateCache = {
    consumptionTotal: { value: 3000, ts: nowMs() },
    pvPower: { value: 12000, ts: nowMs() },
    'derived.core.pv.totalW': { value: 12000, ts: nowMs() },
    'derived.core.building.loadTotalW': { value: 3000, ts: nowMs() },
    'derived.core.building.loadSource': { value: 'mapped:consumptionTotal', ts: nowMs() },
  };
  const adapter = makeAdapter({}, stateCache);
  const mod = new SpeicherRegelungModule(adapter, dp);
  return { dp, adapter, mod, stateCache };
}

(async () => {
  const root = path.resolve(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'www/ems-apps.html'), 'utf8');
  const ui = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/www/ems-apps.ts'), 'utf8');
  const control = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/storage-control.ts'), 'utf8');
  assert(html.includes('id="storageVendorProfile"'), 'AppCenter braucht das Herstellerprofil-Dropdown im Speicher-Reiter');
  assert(html.includes('Sungrow Hybrid ESS'), 'AppCenter muss Sungrow Hybrid ESS anbieten');
  assert(ui.includes('patch.storage.vendorProfile = getStorageVendorProfile();'), 'UI muss das Herstellerprofil speichern');
  assert(control.includes('_buildSungrowHybridContext'), 'Backend muss Sungrow-Kontext berechnen');
  assert(control.includes('sungrowHybridPvDecktLast'), 'Backend muss PV-deckt-Last diagnostizieren');
  assert(!control.includes('write-zero-pv-covered'), 'Alter Sungrow-PV-Deckungs-Nullzweig muss entfernt sein');
  assert(!control.includes('write-zero-pv-internal'), 'Alter Sungrow-PV-intern-Nullzweig muss entfernt sein');
  assert(!control.includes('write-zero-nvp-balanced'), 'Alter Sungrow-NVP-Nullzweig muss entfernt sein');
  assert(!html.includes('id="storageSungrowZeroOnPvCoverage"'), 'Alter 0-W-PV-Deckungs-Schalter darf nicht mehr sichtbar sein');
  assert(!html.includes('id="storageSungrowPvPassthrough"'), 'Alter Sungrow-Passthrough-Schalter darf nicht mehr sichtbar sein');

  // Kundenszenario aus dem Screenshot: PV ca. 17 kW, Last ca. 5,5 kW,
  // NVP zeigt Import, Batterie laedt. Sungrow darf hier nicht blind 0 W setzen:
  // die aktuelle Batterieladung muss um den NVP-Import reduziert werden.
  const pvCoveredImport = await runTick({ gridW: 2500, gridRawW: 2500, pvW: 17000, loadW: 5500, battPowerW: -14100 });
  const pvCoveredCharge = pvCoveredImport.dp.lastWrite('st.targetChargePowerW');
  assert(pvCoveredCharge > 11000 && pvCoveredCharge < 12000, `Sungrow muss laufende Ladung + NVP-Fehler bilanzieren, erwartet ca. 11650 W Laden: ${pvCoveredCharge}`);
  assert.strictEqual(pvCoveredImport.dp.lastWrite('st.targetDischargePowerW'), 0, 'Sungrow NVP-Balancing Laden darf keinen Entlade-Sollwert setzen');
  assert.strictEqual(pvCoveredImport.dp.lastWrite('st.run'), true, 'Sungrow NVP-Balancing muss Run/extern aktivieren');
  assert.strictEqual(pvCoveredImport.adapter._states.get('speicher.regelung.sungrowHybridPvDecktLast').val, true, 'Diagnose muss PV-deckt-Last anzeigen');
  assert.strictEqual(pvCoveredImport.adapter._states.get('speicher.regelung.sungrowHybridSchreibmodus').val, 'write-nvp-balance-charge', 'Schreibmodus muss NVP-Balancing Laden anzeigen');

  // Baustein 7 / realer Sungrow-Kundenfall: Speicher-Schutz aktiv, EVCS laedt,
  // NVP importiert und der Speicher folgt noch einem alten Ladebefehl. Der gemeinsame
  // finale Schutzpfad muss beide Split-Sollwerte auf 0 setzen; kein Hersteller-Hold.
  const protectedCustomer = await runTick({
    gridW: 3200,
    gridRawW: 3200,
    pvW: 6400,
    loadW: 7180,
    battPowerW: -2300,
    lastTargetW: -1869,
    lastSource: 'sungrow-assist',
    runtimePolicy: {
      protectedLoadW: 3580,
      protectedWallboxes: 4,
      assistRequestedLoadW: 0,
      source: 'charging-runtime-global-protect',
    },
  });
  assert.strictEqual(protectedCustomer.dp.lastWrite('st.targetChargePowerW'), 0, 'Sungrow muss alte Ladung ohne Gesamtueberschuss explizit stoppen');
  assert.strictEqual(protectedCustomer.dp.lastWrite('st.targetDischargePowerW'), 0, 'Sungrow-Schutzstop darf keine Gegenrichtung starten');
  assert.strictEqual(protectedCustomer.adapter._states.get('speicher.regelung.zeroWriteFirewallExplicitStop').val, true, 'Sungrow-Kundenfall muss die 0-W-Firewall passieren');
  assert(String(protectedCustomer.adapter._states.get('speicher.regelung.sungrowHybridSchreibmodus').val).includes('write-stop'), 'Sungrow-Diagnose muss echten EVCS-Schutzstop zeigen');

  // Trotz geschuetzter Wallbox darf Sungrow den Haus-/sonstigen Bedarf ausgleichen.
  const protectedHouse = await runTick({
    gridW: 5000,
    gridRawW: 5000,
    pvW: 6400,
    loadW: 11400,
    battPowerW: 0,
    runtimePolicy: {
      protectedLoadW: 3000,
      protectedWallboxes: 1,
      assistRequestedLoadW: 0,
      source: 'charging-runtime-protect',
    },
  });
  assert.strictEqual(protectedHouse.dp.lastWrite('st.targetDischargePowerW'), 1950, 'Sungrow darf nur das 1,95-kW-Hausdefizit entladen');

  // Nur realer Export darf unter Speicherschutz laden.
  const protectedSurplus = await runTick({
    gridW: -400,
    gridRawW: -400,
    pvW: 9000,
    loadW: 8600,
    battPowerW: 0,
    runtimePolicy: {
      protectedLoadW: 3000,
      protectedWallboxes: 1,
      assistRequestedLoadW: 0,
      source: 'charging-runtime-protect',
    },
  });
  assert.strictEqual(protectedSurplus.dp.lastWrite('st.targetChargePowerW'), 450, 'Sungrow muss realen Export direkt zur NVP-Zielmitte +50 W ausregeln');

  // Rest-Netzbezug trotz laufender Entladung: Ziel ist nicht nur der neue Import,
  // sondern aktuelle Batterie-Istentladung + aktuelle NVP-Abweichung.
  const importAssist = await runTick({ gridW: 700, gridRawW: 700, pvW: 15600, loadW: 12700, battPowerW: 400 });
  const dchg = importAssist.dp.lastWrite('st.targetDischargePowerW');
  assert(dchg >= 1000 && dchg <= 1100, `Sungrow muss aktuelle Entladung plus NVP-Fehler schreiben, erwartet ca. 1050 W: ${dchg}`);
  assert.strictEqual(importAssist.adapter._states.get('speicher.regelung.sungrowHybridSchreibmodus').val, 'write-nvp-balance-discharge', 'Schreibmodus muss NVP-Balancing Entladung anzeigen');

  // Ohne ausreichende PV-Deckung darf bei echtem Netzbezug ein NVP-begrenzter
  // Entlade-Assist geschrieben werden.
  const assist = await runTick({ gridW: 2300, gridRawW: 2300, pvW: 100, loadW: 5500, battPowerW: 0 });
  const dchgNoPv = assist.dp.lastWrite('st.targetDischargePowerW');
  assert(dchgNoPv > 0, `Sungrow muss bei Netzbezug ohne PV-Deckung entladen duerfen: ${dchgNoPv}`);
  assert(dchgNoPv <= 2400, `Sungrow-Assist muss am NVP begrenzt bleiben: ${dchgNoPv}`);
  assert.strictEqual(assist.adapter._states.get('speicher.regelung.sungrowHybridSchreibmodus').val, 'write-nvp-balance-discharge', 'Schreibmodus muss NVP-Balancing Entladung anzeigen');

  // Gemeinsame Schutzlogik bleibt hoeher priorisiert als die Hersteller-Neuberechnung.
  // Bei zu niedrigem SoC muss ein echter 0-W-Stop geschrieben werden; die Sungrow-
  // Firewall darf diesen Stop nicht in No-Write/Halten des letzten Werts umwandeln.
  const lowSocStop = await runTick({ gridW: 2300, gridRawW: 2300, pvW: 100, loadW: 5500, battPowerW: 500, soc: 10 });
  assert.strictEqual(lowSocStop.dp.lastWrite('st.targetChargePowerW'), 0, 'SoC-Schutz darf keine Ladung anfordern');
  assert.strictEqual(lowSocStop.dp.lastWrite('st.targetDischargePowerW'), 0, 'SoC-Schutz muss die Entladung mit 0 W stoppen');
  assert.strictEqual(lowSocStop.adapter._states.get('speicher.regelung.sungrowHybridSchreibmodus').val, 'write-stop-upstream-safety', 'Gemeinsamer SoC-/Reserve-Stopp muss als expliziter Sungrow-Stop erhalten bleiben');

  // Rest-Export trotz laufender Ladung: die alte Ladeleistung und der aktuelle
  // NVP-Export werden addiert, damit 2,9 kW Ladung + 2,9 kW Export zu ca. 5,85 kW werden.
  const pvCharge = await runTick({ gridW: -2900, gridRawW: -2900, pvW: 12000, loadW: 3000, battPowerW: -2900 });
  const chg = pvCharge.dp.lastWrite('st.targetChargePowerW');
  assert(chg >= 5800 && chg <= 5900, `Sungrow muss laufende Ladung plus NVP-Export schreiben, erwartet ca. 5850 W: ${chg}`);
  assert.strictEqual(pvCharge.dp.lastWrite('st.targetDischargePowerW'), 0, 'Sungrow PV-Export darf keinen Entlade-Sollwert setzen');
  assert.strictEqual(pvCharge.adapter._states.get('speicher.regelung.sungrowHybridSchreibmodus').val, 'write-nvp-balance-charge', 'Schreibmodus muss NVP-Balancing Laden anzeigen');

  // NVP im Zielband, aber direkter PV-/Lastabgleich zeigt weiterhin eine deutliche
  // Batterieladung. Ein unplausibler 0-W-Istwert darf deshalb keinen Stop ausloesen.
  const pvStable = await runTick({ gridW: 80, gridRawW: 80, pvW: 12000, loadW: 3000, battPowerW: 0 });
  const stableCharge = pvStable.dp.lastWrite('st.targetChargePowerW');
  assert(stableCharge >= 9000 && stableCharge <= 9100, `Sungrow muss im Zielband den direkten PV-/Last-Feed-forward nutzen statt 0 W: ${stableCharge}`);
  assert.strictEqual(pvStable.dp.lastWrite('st.targetDischargePowerW'), 0, 'Sungrow Feed-forward-Laden darf keinen Entlade-Sollwert setzen');
  assert.strictEqual(pvStable.adapter._states.get('speicher.regelung.sungrowHybridSchreibmodus').val, 'write-pv-load-feed-forward-charge', 'Schreibmodus muss direkten PV-/Last-Feed-forward anzeigen');


  // 80/20-Feldszenario: Nach 8,08 kW EVCS-PV-Reservierung bleiben von
  // 10,1 kW zentralem PV-Budget exakt 2,02 kW fuer den Speicher. Der nachgelagerte
  // Sungrow-Regelkreis darf diesen Cap nicht wieder auf den vollen Export aufweiten.
  const sharedBudget = makeSharedPvBudget();
  const sharedPriority = await runTick({
    gridW: -2500,
    gridRawW: -2500,
    pvW: 17000,
    loadW: 6400,
    battPowerW: 0,
    emsBudget: sharedBudget,
  });
  assert.strictEqual(sharedPriority.dp.lastWrite('st.targetChargePowerW'), 2020, 'Sungrow muss bei 80 % E-Mobilitaet auf das verbleibende 20-%-PV-Budget begrenzt werden');
  assert.strictEqual(sharedPriority.adapter._states.get('speicher.regelung.pvBudgetPostVendorCapped').val, true, 'Finaler Hersteller-Cap muss diagnostiziert werden');
  assert.strictEqual(sharedPriority.adapter._states.get('speicher.regelung.pvBudgetPostVendorCapW').val, 2020, 'Diagnose muss den finalen 2,02-kW-Cap zeigen');
  assert(sharedPriority.adapter._states.get('speicher.regelung.sungrowHybridSchreibmodus').val.includes('pv-budget-capped'), 'Sungrow-Schreibmodus muss den finalen PV-Cap ausweisen');
  assert.strictEqual(sharedBudget.reservations.length, 1, 'Speicher muss nur den final begrenzten PV-Anteil reservieren');
  assert.strictEqual(sharedBudget.reservations[0].reserveW, 2020, 'PV-Speicherladung muss auch das zentrale Gesamtbudget reduzieren');
  assert.strictEqual(sharedBudget.reservations[0].pvReserveW, 2020, 'Speicherreservierung darf nicht den EVCS-Anteil doppelt verwenden');
  assert.strictEqual(sharedBudget.remainingTotalW, 8080, 'PV-Speicherladung muss nachfolgenden Verbrauchern im Gesamtbudget entzogen werden');

  // Bereits ueberladender Speicher im selben 80/20-Szenario: Der laufende
  // Batterie-Istwert darf die Hersteller-Neuberechnung nicht erneut auf mehrere
  // Kilowatt aufweiten. Die aktuelle NVP-Differenz reduziert den Istwert auf den
  // verbleibenden Speicheranteil; der finale Budget-Cap bleibt die letzte Schranke.
  const overdrawingBudget = makeSharedPvBudget();
  const overdrawingStorage = await runTick({
    gridW: 6380,
    gridRawW: 6380,
    pvW: 17000,
    loadW: 6400,
    battPowerW: -8400,
    emsBudget: overdrawingBudget,
  });
  const overdrawingChargeW = overdrawingStorage.dp.lastWrite('st.targetChargePowerW');
  assert(overdrawingChargeW > 0 && overdrawingChargeW <= 2020, `Sungrow muss eine bereits zu hohe Ladung auf den 20-%-Speicheranteil zuruecknehmen, nicht auf 0 oder wieder auf Volllast: ${overdrawingChargeW}`);
  assert(!overdrawingStorage.dp.writes.some((row) => row.key === 'st.targetChargePowerW' && row.value === 0), '80/20-Ruecknahme darf keinen zwischengeschobenen 0-W-Ladestopp erzeugen');
  assert.strictEqual(overdrawingStorage.adapter._states.get('speicher.regelung.pvBudgetPostVendorCapped').val, true, 'Ueberhoehte laufende Sungrow-Ladung muss final durch das PV-Budget begrenzt werden');

  // Die zentrale Runtime ist jetzt die einzige autoritative Budgetquelle. Ein
  // lokal aus Prozentwerten rekonstruiertes Parallelbudget ist ausdrücklich
  // verboten: meldet der zentrale Grant 0 W, darf der Herstellerpfad nicht aus
  // dem Allocation-Gate selbst wieder 2,02 kW erzeugen.
  const exhaustedBudget = makeSharedPvBudget({ remainingPvW: 0 });
  const exhaustedPriority = await runTick({
    gridW: -2500,
    gridRawW: -2500,
    pvW: 17000,
    loadW: 6400,
    battPowerW: 0,
    emsBudget: exhaustedBudget,
  });
  assert.strictEqual(exhaustedPriority.dp.lastWrite('st.targetChargePowerW'), null, 'Ein zentral erschoepftes PV-Budget darf lokal weder neu rekonstruiert noch als grundloser 0-W-Stop geschrieben werden');
  assert(!exhaustedPriority.dp.writes.some((row) => (row.key === 'st.targetChargePowerW' || row.key === 'st.targetPowerW') && row.value === 0), 'Ohne vorher aktive Speicherladung bleibt ein erschoepftes Budget im No-Write-Leerlauf');
  assert.strictEqual(exhaustedPriority.adapter._states.get('speicher.regelung.pvBudgetResolution').val, 'central-grant-after-evcs', 'Diagnose muss den zentralen Grant als Quelle ausweisen');
  assert.strictEqual(exhaustedBudget.reservations.length, 0, 'Ohne zentralen Speicher-Grant darf kein PV-Anteil erneut reserviert werden');

  // Sequenzieller Regeltest: Laden, NVP-Zielband und kurzer NVP-Aussetzer duerfen
  // keinen zwischengeschobenen 0-W-Befehl auf charge/discharge/run erzeugen.
  const persistent = makePersistentSungrowScenario();
  await persistent.mod.tick();
  const firstChargeW = persistent.dp.lastWrite('st.targetChargePowerW');
  assert(firstChargeW > 5000, `Erster Sungrow-Ladesollwert muss aktiv sein: ${firstChargeW}`);

  persistent.dp.clearWrites();
  persistent.dp.setValue('grid.powerW', 50, 'grid.filtered');
  persistent.dp.setValue('grid.powerRawW', 50, 'grid.raw');
  persistent.dp.setValue('st.batteryPowerW', -firstChargeW, 'battery.actualPower');
  persistent.dp.setValue('st.dcPvPowerW', 3000 + firstChargeW + 50, 'pv.dc');
  persistent.stateCache.consumptionTotal = { value: 3000, ts: nowMs() };
  persistent.stateCache.pvPower = { value: 3000 + firstChargeW + 50, ts: nowMs() };
  persistent.stateCache['derived.core.pv.totalW'] = { value: 3000 + firstChargeW + 50, ts: nowMs() };
  await persistent.mod.tick();
  const heldChargeW = persistent.dp.lastWrite('st.targetChargePowerW');
  assert(heldChargeW > 0, `Im NVP-Zielband muss der aktive Ladewert erhalten bleiben: ${heldChargeW}`);
  assert(!persistent.dp.writes.some((row) => (row.key === 'st.targetChargePowerW' || row.key === 'st.targetPowerW') && row.value === 0), 'NVP-Zielband darf keinen 0-W-Ladestopp schreiben');

  persistent.dp.clearWrites();
  persistent.dp.remove('grid.powerW');
  persistent.dp.remove('grid.powerRawW');
  await persistent.mod.tick();
  assert.strictEqual(persistent.dp.writes.length, 0, 'Kurzer Sungrow-NVP-Aussetzer muss No-Write statt 0 W ausloesen');
  assert.strictEqual(persistent.adapter._states.get('speicher.regelung.schreibStatus').val, 'sungrow-hybrid:no-write-nvp-grace', 'NVP-Grace muss im Schreibstatus sichtbar sein');

  console.log('[storage-sungrow-hybrid-profile] OK: Sungrow bilanziert am NVP, unterdrueckt unbeabsichtigte 0-W-Zyklen und respektiert die zentrale 80/20-PV-Prioritaet auch nach der Herstellerlogik.');
})().catch((err) => {
  console.error('[storage-sungrow-hybrid-profile] ERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
});
