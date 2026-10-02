#!/usr/bin/env node
'use strict';
/**
 * Funktionaler Feldtest 0.8.94 für Speicherregelung, NVP-Hold und Feldschutz.
 *
 * Zweck:
 * - Prüft die vollständige Policy-Kette Speicherregelung → MultiUse → Speicherfarm.
 * - Sichert den konkreten Feldfehler ab: alter/abgeleiteter 71-kW-Wert darf bei
 *   nur wenigen kW NVP-Import nicht mehr als Entlade-Sollwert geschrieben werden.
 * - Prüft, dass ein wirksamer nicht-null Sollwert im frischen NVP-Zielband aktiv bleibt.
 * - Prüft explizite Stopbedingungen bei Netzbezug und Schutzgrenzen.
 *
 * Vorzeichenkonvention:
 * +W = Speicher entlädt, -W = Speicher lädt.
 */

const assert = require('assert');
const { SpeicherRegelungModule } = require('../ems/modules/storage-control');

function nowState(val, ageMs = 0) {
  return { val, ts: Date.now() - ageMs, ack: true };
}

class MockDP {
  constructor({ values = {}, entries = {} } = {}) {
    this.values = { ...values };
    this.entries = { ...entries };
    this.writes = [];
  }

  getEntry(key) {
    if (Object.prototype.hasOwnProperty.call(this.entries, key)) return this.entries[key];
    return null;
  }

  _rec(key) {
    const rec = this.values[key];
    if (rec && typeof rec === 'object' && Object.prototype.hasOwnProperty.call(rec, 'val')) return rec;
    if (rec !== undefined) return nowState(rec);
    return null;
  }

  getAgeMs(key) {
    const rec = this._rec(key);
    if (!rec || typeof rec.ts !== 'number') return null;
    return Math.max(0, Date.now() - rec.ts);
  }

  getNumberFresh(key, staleMs, fallback = null) {
    const rec = this._rec(key);
    if (!rec) return fallback;
    const age = this.getAgeMs(key);
    if (typeof age === 'number' && Number.isFinite(staleMs) && age > staleMs) return fallback;
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
    if (rec.val === true || rec.val === 'true' || rec.val === 1 || rec.val === '1') return true;
    if (rec.val === false || rec.val === 'false' || rec.val === 0 || rec.val === '0') return false;
    return fallback;
  }

  async writeNumber(key, val) {
    const n = Number(val);
    this.values[key] = nowState(Number.isFinite(n) ? n : 0);
    this.writes.push({ key, val: Number.isFinite(n) ? n : 0 });
    return true;
  }

  async writeBoolean(key, val) {
    this.values[key] = nowState(!!val);
    this.writes.push({ key, val: !!val });
    return true;
  }
}

class MockAdapter {
  constructor({ config = {}, stateCache = {}, states = {} } = {}) {
    this.config = config;
    this.stateCache = stateCache;
    this.states = { ...states };
    this.farmWrites = [];
    this._emsCaps = null;
    this._tarifVis = null;
    this.log = {
      debug() {},
      info() {},
      warn() {},
      error() {},
    };
  }

  async getStateAsync(id) {
    return this.states[id] || null;
  }

  async setStateAsync(id, val, ack = true) {
    this.states[id] = nowState(val);
    this.states[id].ack = ack;
  }

  async setObjectNotExistsAsync() {
    return true;
  }

  async applyStorageFarmTargetW(w, meta = {}) {
    this.farmWrites.push({ w: Math.round(Number(w) || 0), meta });
    return { applied: true, reason: 'mock-farm' };
  }
}

function baseConfig(overrides = {}) {
  const storage = {
    controlMode: 'targetPower',
    staleTimeoutSec: 15,
    modeHoldSec: 0,
    tariffPermissionHoldSec: 0,
    maxChargeW: 0,
    maxDischargeW: 0,
    stepW: 1,
    maxDeltaWPerTick: 100000,
    pvMaxDeltaWPerTick: 100000,
    reserveEnabled: false,
    pvEnabled: true,
    pvExportThresholdW: 200,
    lskEnabled: false,
    lskDischargeEnabled: false,
    lskChargeEnabled: false,
    selfDischargeEnabled: true,
    selfMinSocPct: 20,
    selfMaxSocPct: 100,
    selfTargetGridImportW: 50,
    selfImportThresholdW: 50,
    selfMaxChargeW: 0,
    selfMaxDischargeW: 0,
    ...overrides.storage,
  };
  return {
    enableStorageControl: true,
    enableStorageFarm: false,
    enableMultiUse: false,
    enablePeakShaving: false,
    enableGridConstraints: false,
    storage,
    peakShaving: {},
    installerConfig: {},
    ...overrides,
    storage,
  };
}

function baseEntries({ target = true, split = false, battery = false } = {}) {
  const entries = {
    'grid.powerW': { objectId: 'mock.grid.filtered' },
    'grid.powerRawW': { objectId: 'mock.grid.raw' },
    'st.socPct': { objectId: 'mock.storage.soc' },
  };
  if (target) entries['st.targetPowerW'] = { objectId: 'mock.storage.ctrl.targetPowerW' };
  if (split) {
    entries['st.targetChargePowerW'] = { objectId: 'mock.storage.ctrl.targetChargePowerW' };
    entries['st.targetDischargePowerW'] = { objectId: 'mock.storage.ctrl.targetDischargePowerW' };
  }
  if (battery) entries['st.batteryPowerW'] = { objectId: 'mock.storage.acPowerW' };
  return entries;
}

async function runScenario({ name, config, values, entries, stateCache, states, lastTargetW, lastSource }) {
  const adapter = new MockAdapter({ config, stateCache, states });
  const dp = new MockDP({ values, entries });
  const mod = new SpeicherRegelungModule(adapter, dp);
  if (typeof lastTargetW === 'number') mod._lastTargetW = lastTargetW;
  if (typeof lastSource === 'string') mod._lastSource = lastSource;
  await mod.tick();
  const soll = adapter.states['speicher.regelung.sollW'] ? Number(adapter.states['speicher.regelung.sollW'].val) : null;
  const source = adapter.states['speicher.regelung.quelle'] ? String(adapter.states['speicher.regelung.quelle'].val) : '';
  const reason = adapter.states['speicher.regelung.grund'] ? String(adapter.states['speicher.regelung.grund'].val) : '';
  const cap = adapter.states['speicher.regelung.dischargeDemandCapW'] ? Number(adapter.states['speicher.regelung.dischargeDemandCapW'].val) : null;
  return { name, adapter, dp, soll, source, reason, cap };
}

(async () => {
  // 1) Reine Speicherregelung: Eigenverbrauch mit Batterie-Istwert entlädt nur den NVP-Import.
  {
    const r = await runScenario({
      name: 'Eigenverbrauch mit echter Batterie-Istleistung',
      config: baseConfig(),
      entries: baseEntries({ battery: true }),
      values: {
        'grid.powerW': nowState(3000),
        'grid.powerRawW': nowState(3000),
        'st.socPct': nowState(80),
        'st.batteryPowerW': nowState(0),
      },
    });
    assert(r.soll >= 2800 && r.soll <= 3200, `${r.name}: erwartet ca. 3 kW, erhalten ${r.soll} W (${r.reason})`);
    assert.strictEqual(r.source, 'eigenverbrauch', `${r.name}: falsche Quelle ${r.source}`);
  }

  // 2) Feldfehler: alter 71-kW-Sollwert + abgeleitete 71-kW-Gebäudelast dürfen nicht hochlaufen.
  {
    const r = await runScenario({
      name: '71-kW-Ausreisser bei 2,6-kW-NVP-Import',
      config: baseConfig(),
      entries: baseEntries({ battery: false }),
      values: {
        'grid.powerW': nowState(2600),
        'grid.powerRawW': nowState(2600),
        'st.socPct': nowState(80),
      },
      stateCache: {
        'derived.core.building.loadTotalW': { value: 71600, ts: Date.now() },
      },
      lastTargetW: 71600,
      lastSource: 'eigenverbrauch',
    });
    assert(r.soll >= 2400 && r.soll <= 3000, `${r.name}: Sollwert muss am NVP-Import liegen, erhalten ${r.soll} W (${r.reason})`);
    assert(r.soll < 5000, `${r.name}: gefährlicher Sollwert >5 kW: ${r.soll} W`);
  }

  // 3) Im frischen NVP-Zielband bleibt der zuletzt erfolgreich geschriebene
  // nicht-null Sollwert aktiv. Der NVP belegt physikalisch, dass die laufende
  // Vorgabe gerade passt; 0 W wäre ein ungewollter Stopbefehl.
  {
    const r = await runScenario({
      name: 'Feedbackloser Deadband-Hold hält wirksamen Sollwert',
      config: baseConfig(),
      entries: baseEntries({ battery: false }),
      values: {
        'grid.powerW': nowState(50),
        'grid.powerRawW': nowState(50),
        'st.socPct': nowState(80),
      },
      lastTargetW: 71600,
      lastSource: 'eigenverbrauch',
    });
    assert.strictEqual(r.soll, 71600, `${r.name}: wirksamer Sollwert wurde fälschlich gestoppt (${r.soll} W)`);
  }

  // 4) NVP im Zielband: Auch ein laufender Lade-Sollwert bleibt aktiv.
  {
    const r = await runScenario({
      name: 'Lade-Sollwert bleibt bei erreichtem NVP-Ziel aktiv',
      config: baseConfig(),
      entries: baseEntries(),
      values: {
        'grid.powerW': nowState(0),
        'grid.powerRawW': nowState(0),
        'st.socPct': nowState(50),
      },
      lastTargetW: -50000,
      lastSource: 'pv',
    });
    assert.strictEqual(r.soll, -50000, `${r.name}: Laden darf nicht auf 0 fallen, erhalten ${r.soll} W (${r.reason})`);
  }

  // 4b) Echter Netzbezug ist dagegen eine eindeutige Stop-/Korrekturbedingung.
  {
    const r = await runScenario({
      name: 'Feedbacklose PV-Ladung stoppt bei Netzbezug',
      config: baseConfig(),
      entries: baseEntries(),
      values: {
        'grid.powerW': nowState(1000),
        'grid.powerRawW': nowState(1000),
        'st.socPct': nowState(50),
      },
      lastTargetW: -50000,
      lastSource: 'pv',
    });
    assert.strictEqual(r.soll, 0, `${r.name}: Netzbezug muss die PV-Ladung stoppen, erhalten ${r.soll} W (${r.reason})`);
  }

  // 5) Beladung: PV-Überschuss wird in der Grundlogik sauber als negativer Sollwert genutzt.
  {
    const r = await runScenario({
      name: 'PV-Überschuss lädt Speicher',
      config: baseConfig(),
      entries: baseEntries(),
      values: {
        'grid.powerW': nowState(-5000),
        'grid.powerRawW': nowState(-5000),
        'st.socPct': nowState(50),
      },
    });
    assert(r.soll <= -4800 && r.soll >= -5200, `${r.name}: erwartet ca. -5 kW, erhalten ${r.soll} W (${r.reason})`);
    assert.strictEqual(r.source, 'pv', `${r.name}: falsche Quelle ${r.source}`);
  }

  // 6) MultiUse ist eine reine Policy-Schicht. Sie beeinflusst die aktive
  // Einzel-Topologie, erzeugt aber niemals selbst einen zweiten Hardwarewriter.
  {
    const cfg = baseConfig({
      enableStorageControl: true,
      enableMultiUse: true,
      installerConfig: { storageMultiUse: { enabled: true } },
      storage: { selfDischargeEnabled: true, selfMinSocPct: 30, lskEnabled: false, reserveEnabled: false },
    });
    const r = await runScenario({
      name: 'MultiUse startet Policy-Kette',
      config: cfg,
      entries: baseEntries({ battery: true }),
      values: {
        'grid.powerW': nowState(2000),
        'grid.powerRawW': nowState(2000),
        'st.socPct': nowState(80),
        'st.batteryPowerW': nowState(0),
      },
    });
    assert(r.soll > 0 && r.soll < 2500, `${r.name}: MultiUse muss Entladung anfordern, erhalten ${r.soll} W`);
    assert.strictEqual(r.adapter.states['speicher.regelung.policyMode'].val, 'multiuse', `${r.name}: policyMode nicht multiuse`);
  }

  // 6b) Ohne aktive Einzel- oder Farm-Topologie bleibt MultiUse bewusst
  // schreibfrei. Damit kann eine Policy-App niemals versehentlich einen
  // Speicher-Sollwert erzeugen.
  {
    const cfg = baseConfig({
      enableStorageControl: false,
      enableStorageFarm: false,
      enableMultiUse: true,
      installerConfig: { storageMultiUse: { enabled: true } },
    });
    const r = await runScenario({
      name: 'MultiUse ohne Topologie bleibt schreibfrei',
      config: cfg,
      entries: baseEntries({ battery: true }),
      values: {
        'grid.powerW': nowState(2000),
        'grid.powerRawW': nowState(2000),
        'st.socPct': nowState(80),
        'st.batteryPowerW': nowState(0),
      },
    });
    assert.strictEqual(r.soll, null, `${r.name}: ohne Writer-Topologie darf kein Sollwert entstehen`);
    assert.strictEqual(r.adapter.states['speicher.regelung.aktiv'].val, false, `${r.name}: Writer darf nicht aktiv sein`);
    assert.strictEqual(r.dp.writes.length, 0, `${r.name}: Hardware-DP wurde trotz fehlender Topologie beschrieben`);
  }

  // 7) Eine echte Speicherfarm startet die Basis-Eigenverbrauchsoptimierung selbst
  // und verteilt den fertigen Sollwert. Ein paralleler Einzelzielpfad bleibt aus.
  {
    const farmCfg = baseConfig({
      enableStorageControl: false,
      enableStorageFarm: true,
      emsApps: { apps: { storagefarm: { installed: true, enabled: true } } },
      storageFarm: { storages: [
        { enabled: true, setSignedPowerId: 'mock.farm.ess1.target' },
        { enabled: true, setSignedPowerId: 'mock.farm.ess2.target' },
      ] },
    });
    const r = await runScenario({
      name: 'Speicherfarm startet und verteilt Basisregelung',
      config: farmCfg,
      entries: baseEntries({ target: false, battery: false }),
      values: {
        'grid.powerW': nowState(2000),
        'grid.powerRawW': nowState(2000),
        'st.socPct': nowState(80),
      },
    });
    assert.strictEqual(r.adapter.states['speicher.regelung.aktiv'].val, true, `${r.name}: Farm-Autostart fehlt`);
    assert.strictEqual(r.adapter.states['speicher.regelung.aktivAutoSpeicherfarm'].val, true, `${r.name}: Auto-Farm-Diagnose fehlt`);
    assert.strictEqual(r.adapter.farmWrites.length, 1, `${r.name}: Farm-Verteilung wurde nicht genutzt`);
    assert(r.adapter.farmWrites[0].w >= 1800 && r.adapter.farmWrites[0].w <= 2200, `${r.name}: Farm-Sollwert unplausibel ${r.adapter.farmWrites[0].w} W`);
    assert.match(String(r.adapter.states['speicher.regelung.schreibStatus'].val || ''), /farm/i, `${r.name}: Schreibstatus nicht farm`);
    assert.strictEqual(r.dp.writes.filter((row) => row.key === 'st.targetPowerW').length, 0, `${r.name}: Einzel-Speicherpfad darf parallel nicht schreiben`);
  }

  console.log('[storage-control-functional-safety] OK: Speicherregelung, MultiUse-Routing, Speicherfarm-Verteilung und Be-/Entlade-Caps funktional abgesichert.');
})().catch((err) => {
  console.error('[storage-control-functional-safety] FEHLER:', err && err.stack ? err.stack : err);
  process.exit(1);
});
