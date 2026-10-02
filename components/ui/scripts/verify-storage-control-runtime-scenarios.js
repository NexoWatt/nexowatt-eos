#!/usr/bin/env node
'use strict';
/**
 * Runtime-Szenariotest 0.8.94: Speichergrundlogik, NVP-Hold und Feldschutz.
 *
 * Zweck:
 * - Eigenverbrauch darf einen alten sehr hohen Entlade-Sollwert nicht weiterführen.
 * - Vertrauenswürdige Batterie-Istleistung muss stabile Eigenverbrauchsregelung erlauben.
 * - Ein am NVP-Ziel wirksamer Sollwert bleibt aktiv; 0 W bleibt ein expliziter Stop.
 * - Bei echtem Stop-/Wartebedarf sowie SoC-/Messwertschutz darf weiterhin sofort 0 W geschrieben werden.
 * - Richtungswechsel werden dagegen direkt ohne 0-W-Zwischenrunde ausgegeben.
 *
 * Dieser Test instanziiert das echte Storage-Modul mit einem kleinen ioBroker-/DP-Stub,
 * damit nicht nur Textmuster, sondern der produktive Tick-Pfad geprüft wird.
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
  lastWrite(key = 'st.targetPowerW') {
    const matches = this.writes.filter(w => w.key === key);
    return matches.length ? matches[matches.length - 1].value : null;
  }
}

function makeEntry(val, objectId) {
  return { val, ts: nowMs(), objectId: objectId || `test.${Math.random().toString(36).slice(2)}` };
}

function makeAdapter(extraConfig = {}) {
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
        ...(extraConfig.storage || {}),
      },
      ...(extraConfig.root || {}),
    },
    stateCache: {},
    log: { warn() {}, info() {}, debug() {}, error() {} },
    async setObjectNotExistsAsync() {},
    async setStateAsync(id, val) { states.set(id, { val, ts: nowMs() }); },
    async getStateAsync(id) { return states.get(id) || null; },
    _nwGetNumberFromCache(id) {
      const rec = this.stateCache && this.stateCache[id];
      const n = Number(rec && rec.value);
      return Number.isFinite(n) ? n : null;
    },
  };
}

async function runTick({ gridW, gridRawW = gridW, soc = 80, battPowerW = null, lastTargetW = null, lastSource = '', extraConfig = {} }) {
  const entries = {
    'grid.powerW': makeEntry(gridW, 'grid.filtered'),
    'grid.powerRawW': makeEntry(gridRawW, 'grid.raw'),
    'st.socPct': makeEntry(soc, 'battery.soc'),
    'st.targetPowerW': { objectId: 'battery.target', ts: nowMs(), val: 0 },
  };
  if (battPowerW !== null) entries['st.batteryPowerW'] = makeEntry(battPowerW, 'battery.actualPower');
  const dp = new FakeDp(entries);
  const adapter = makeAdapter(extraConfig);
  const mod = new SpeicherRegelungModule(adapter, dp);
  if (lastTargetW !== null) mod._lastTargetW = lastTargetW;
  mod._lastSource = lastSource;
  await mod.tick();
  return { targetW: dp.lastWrite(), dp, adapter };
}

(async () => {
  // Kritischer Feldfall: alter hoher Entlade-Sollwert + nur ca. 2,6 kW Import.
  // Ergebnis muss hart im Bereich des echten Netzbedarfs bleiben.
  const high = await runTick({ gridW: 2600, gridRawW: 2600, battPowerW: null, lastTargetW: 71600, lastSource: 'eigenverbrauch' });
  assert(high.targetW <= 3000, `alter Entlade-Sollwert wurde nicht hart gecappt: ${high.targetW}`);
  assert(high.targetW >= 2000, `Eigenverbrauch sollte bei 2,6 kW Import weiter sinnvoll entladen: ${high.targetW}`);

  // Mit echter Batterie-Istleistung darf die Regelung den Speicher stabil nahe Hauslast halten.
  const stable = await runTick({ gridW: 120, gridRawW: 120, battPowerW: 3000, lastTargetW: 3000, lastSource: 'eigenverbrauch' });
  assert(stable.targetW >= 2800 && stable.targetW <= 3400, `vertrauenswürdiges Batteriefeedback hält nicht stabil: ${stable.targetW}`);

  // Ohne Batterie-Istleistung bleibt der letzte nicht-null Sollwert aktiv, wenn der
  // frische NVP bereits im Zielband liegt. Der NVP ist hier der physikalische Beleg,
  // dass die laufende Vorgabe gerade passt; 0 W würde den Speicher ungewollt stoppen.
  const boundedHold = await runTick({ gridW: 80, gridRawW: 80, battPowerW: null, lastTargetW: 3000, lastSource: 'eigenverbrauch' });
  assert.strictEqual(boundedHold.targetW, 3000, `feedbackloser Deadband-Sollwert muss aktiv bleiben: ${boundedHold.targetW}`);

  // Auch ein größerer laufender Sollwert wird im Zielband nicht allein aufgrund seiner
  // Höhe verworfen. Sobald der NVP abweicht, greifen weiterhin Differenzregelung und Caps.
  const largeBalancedHold = await runTick({ gridW: 80, gridRawW: 80, battPowerW: null, lastTargetW: 8000, lastSource: 'eigenverbrauch' });
  assert.strictEqual(largeBalancedHold.targetW, 8000, `wirksamer Deadband-Sollwert wurde fälschlich gestoppt: ${largeBalancedHold.targetW}`);

  // PV-Überschuss-Laden wird auf den aktuellen RAW-Export begrenzt.
  const pv = await runTick({ gridW: -5000, gridRawW: -5000, battPowerW: null, lastTargetW: 0, lastSource: 'idle', extraConfig: { storage: { pvMaxDeltaWPerTick: 10000 } } });
  assert(pv.targetW <= -4500 && pv.targetW >= -5200, `PV-Laden folgt nicht dem Export-Cap: ${pv.targetW}`);

  // NVP im Zielband: Die laufende PV-Ladung bleibt aktiv. 0 W ist kein Regelergebnis,
  // sondern nur ein expliziter Stopbefehl.
  const holdCharge = await runTick({ gridW: 0, gridRawW: 0, battPowerW: null, lastTargetW: -10000, lastSource: 'pv' });
  assert.strictEqual(holdCharge.targetW, -10000, `NVP-Ziel darf laufende PV-Ladung nicht stoppen: ${holdCharge.targetW}`);

  // Echter Netzbezug bei laufender Ladung ist dagegen eine klare Stop-/Korrekturbedingung.
  const stopChargeOnImport = await runTick({ gridW: 1000, gridRawW: 1000, battPowerW: null, lastTargetW: -10000, lastSource: 'pv' });
  assert.strictEqual(stopChargeOnImport.targetW, 0, `Netzbezug muss feedbacklose PV-Ladung sicher stoppen: ${stopChargeOnImport.targetW}`);

  console.log('[storage-control-runtime-scenarios] OK: Speicher-Eigenverbrauch, NVP-Hold, Demand-Caps und explizite Stopbedingungen laufen durch echte Tick-Szenarien.');
})().catch((err) => {
  console.error('[storage-control-runtime-scenarios] ERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
});
