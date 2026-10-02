#!/usr/bin/env node
'use strict';

/**
 * RC42 Laufzeitregression: Das Shadowmodell liest reale Runtime-Mappings und
 * schreibt ausschliesslich interne Diagnose-States. Kein FEMS-/ESS-Aktor darf
 * durch den Shadow beruehrt werden.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { SpeicherRegelungModule } = require('../ems/modules/storage-control');

const now = () => Date.now();

function strictNumber(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string' && !value.trim()) return fallback;
  if (typeof value !== 'number' && typeof value !== 'string') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

class RuntimeDp {
  constructor(entries) {
    this.entries = entries;
    this.writes = [];
  }
  getEntry(key) { return this.entries[key] || null; }
  getAgeMs(key) {
    const rec = this.entries[key];
    return rec ? Math.max(0, now() - Number(rec.ts || now())) : null;
  }
  getNumberFresh(key, staleMs, fallback = null) {
    const rec = this.entries[key];
    if (!rec) return fallback;
    const ageMs = this.getAgeMs(key);
    if (Number.isFinite(Number(staleMs)) && Number.isFinite(Number(ageMs)) && ageMs > Number(staleMs)) return fallback;
    return strictNumber(rec.val, fallback);
  }
  async writeNumber(key, value) {
    const rec = this.entries[key];
    if (!rec || !rec.objectId) return false;
    const parsed = strictNumber(value, null);
    if (parsed === null) return false;
    rec.val = parsed;
    rec.ts = now();
    this.writes.push({ key, value: parsed, objectId: rec.objectId });
    return true;
  }
  async writeBoolean(key, value) {
    const rec = this.entries[key];
    if (!rec || !rec.objectId) return false;
    rec.val = !!value;
    rec.ts = now();
    this.writes.push({ key, value: !!value, objectId: rec.objectId });
    return true;
  }
}

function entry(objectId, value, ageMs = 0) {
  return { objectId, val: value, ts: now() - ageMs, scale: 1, offset: 0, invert: false, unitScale: 1 };
}

function makeRuntime() {
  const states = new Map();
  const stateCache = {
    consumptionTotal: { value: 1000, ts: now(), ack: true },
  };
  const dp = new RuntimeDp({
    'st.feneconNvpPowerW': entry('fems._sum.GridActivePower', -1000),
    'st.feneconConsumptionTotalW': entry('fems._sum.ConsumptionActivePower', 1000),
    'grid.powerRawW': entry('plant.grid.power', -1000),
    'grid.powerW': entry('plant.grid.filtered', -1000),
    'st.feneconEssActualPowerW': entry('fems.ess0.ActivePower', -2000),
    'st.feneconGridSetpointW': entry('fems.ctrlBalancing0.SetGridActivePower', 0),
    'st.feneconPvTotalPowerW': entry('fems._sum.ProductionActivePower', 4000),
    'st.feneconMinPowerW': entry('fems.ess0.MinActivePower', -10000),
    'st.feneconMaxPowerW': entry('fems.ess0.MaxActivePower', 10000),
  });
  const adapter = {
    config: {
      enableStorageControl: true,
      enableStorageFarm: false,
      storage: {
        controlMode: 'targetPower',
        vendorProfile: 'fenecon-openems',
        coupling: 'dc',
        staleTimeoutSec: 15,
        feneconNvpShadowZeroExportTargetW: 80,
        feneconNvpShadowPlausibilityToleranceW: 500,
      },
      storageFarm: { storages: [] },
      datapoints: { consumptionTotal: 'plant.load.total' },
    },
    stateCache,
    log: { debug() {}, info() {}, warn() {}, error() {} },
    _nwHasMappedDatapoint(key) {
      return key === 'consumptionTotal';
    },
    _nwGetCacheAgeMs(key, at = now()) {
      const rec = this.stateCache[key];
      return rec && Number.isFinite(Number(rec.ts)) ? Math.max(0, Number(at) - Number(rec.ts)) : null;
    },
    _nwGetNumberFromCacheFresh(key, staleMs, fallback = null, at = now()) {
      const rec = this.stateCache[key];
      if (!rec) return fallback;
      const ageMs = this._nwGetCacheAgeMs(key, at);
      if (Number.isFinite(Number(ageMs)) && ageMs > Number(staleMs)) return fallback;
      return strictNumber(rec.value, fallback);
    },
    _nwGetStorageControlAuthority() {
      return {
        selectedTopology: 'single',
        writerActive: true,
        reason: 'single-active',
        singleAppActive: true,
        singleSuppressedByFarm: false,
        farmAggregationActive: false,
        farmDispatchActive: false,
        multiUsePolicyActive: false,
        farm: { active: false, dispatchActive: false, rows: [] },
      };
    },
    async setObjectNotExistsAsync() {},
    async getStateAsync(id) { return states.get(String(id)) || null; },
    async setStateAsync(id, value, ack = true) {
      const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val') ? value.val : value;
      const rec = {
        val,
        ack: value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'ack') ? value.ack : ack,
        ts: now(),
        lc: now(),
      };
      states.set(String(id), rec);
      this.stateCache[String(id)] = { value: val, ack: rec.ack, ts: rec.ts, lc: rec.lc };
    },
  };
  const module = new SpeicherRegelungModule(adapter, dp);
  return { adapter, dp, module, states };
}

function stateValue(states, id) {
  const rec = states.get(id);
  return rec ? rec.val : undefined;
}

(async () => {
  const { dp, module, states } = makeRuntime();

  const result = await module._updateFeneconNvpShadow({
    force: true,
    cfg: module._getCfg(),
    storageAuthority: module._getStorageControlAuthority(),
    targetW: -3000,
    source: 'eigenverbrauch',
    reason: 'RC42 shadow runtime test',
    currentAuthority: 'fems',
    commandFamily: 'no-write-fems-self',
    nvpW: -1000,
  });

  assert.equal(dp.writes.length, 0, 'shadow must not write a FEMS/ESS hardware datapoint');
  assert.equal(result.readOnly, true);
  assert.equal(result.writeAttempted, false);
  assert.equal(result.valid, true, JSON.stringify(result));
  assert.equal(result.readyForFutureWrite, true, JSON.stringify(result));
  assert.equal(result.residualWithoutStorageW, -3000);
  assert.equal(result.translatedGridTargetW, 0);
  assert.equal(result.proposedGridTargetW, 80);
  assert.equal(result.zeroExportBatteryTargetW, -3080);
  assert.equal(result.predictedNvpAtZeroExportW, 80);
  assert.equal(result.additionalSinkOrCurtailmentW, 0);
  assert.equal(result.plausible, true);

  assert.equal(stateValue(states, 'speicher.regelung.feneconNvpShadowAktiv'), true);
  assert.equal(stateValue(states, 'speicher.regelung.feneconNvpShadowReadOnly'), true);
  assert.equal(stateValue(states, 'speicher.regelung.feneconNvpShadowSchreibversuch'), false);
  assert.equal(stateValue(states, 'speicher.regelung.feneconNvpShadowGueltig'), true);
  assert.equal(stateValue(states, 'speicher.regelung.feneconNvpShadowBereit'), true);
  assert.equal(stateValue(states, 'speicher.regelung.feneconNvpShadowFemsSollW'), 80);
  assert.equal(stateValue(states, 'speicher.regelung.feneconNvpShadowRestlastOhneSpeicherW'), -3000);
  const json = JSON.parse(String(stateValue(states, 'speicher.regelung.feneconNvpShadowJson')));
  assert.equal(json.productWriterChanged, false);
  assert.equal(json.writeAttempted, false);
  assert.equal(json.inputSources.nvp, 'st.feneconNvpPowerW');
  assert.equal(json.inputSources.centralNvp, 'grid.powerRawW');
  assert.equal(json.inputSources.load, 'st.feneconConsumptionTotalW');
  assert.match(json.inputSources.ess, /feneconEssActualPowerW/);

  // Die Diagnose darf den normalen Sekunden-Tick nicht mit JSON-Schreibvorgaengen
  // fluten. Gleiche Eingaben werden innerhalb des Shadow-Intervalls aus dem
  // read-only Cache beantwortet; eine relevante Policy-/Sollwertaenderung wird
  // dagegen sofort neu berechnet.
  const cached = await module._updateFeneconNvpShadow({
    cfg: module._getCfg(),
    storageAuthority: module._getStorageControlAuthority(),
    targetW: -3000,
    source: 'eigenverbrauch',
    reason: 'same inputs',
    currentAuthority: 'fems',
    commandFamily: 'no-write-fems-self',
  });
  assert.strictEqual(cached, result, 'unchanged shadow inputs should reuse the cached diagnosis');

  const changedTarget = await module._updateFeneconNvpShadow({
    cfg: module._getCfg(),
    storageAuthority: module._getStorageControlAuthority(),
    targetW: -2500,
    source: 'eigenverbrauch',
    reason: 'target changed',
    currentAuthority: 'fems',
    commandFamily: 'no-write-fems-self',
  });
  assert.notStrictEqual(changedTarget, result);
  assert.equal(changedTarget.effectiveBatteryTargetW, -2500);
  assert.equal(changedTarget.translatedGridTargetW, -500);
  assert.equal(dp.writes.length, 0);

  // Stale ESS-Istwert: Diagnose wird fail-closed ungueltig, der Hardware-Writer
  // bleibt weiterhin unberuehrt.
  dp.entries['st.feneconEssActualPowerW'].ts = now() - 60_000;
  const stale = await module._updateFeneconNvpShadow({
    force: true,
    cfg: module._getCfg(),
    storageAuthority: module._getStorageControlAuthority(),
    targetW: -3000,
    source: 'eigenverbrauch',
    reason: 'stale ESS',
    currentAuthority: 'fems',
    commandFamily: 'no-write-fems-self',
  });
  assert.equal(stale.valid, false);
  assert.match(stale.reason, /ess-actual-missing-or-stale/);
  assert.equal(dp.writes.length, 0);
  assert.equal(stateValue(states, 'speicher.regelung.feneconNvpShadowGueltig'), false);

  // Statischer Guard: Der Legacy-Controller delegiert nur an die typisierte
  // Shadow-Orchestrierung. Weder Wrapper noch Service duerfen Hardware-Write-
  // APIs oder den produktiven FEMS-/ESS-Writer aufrufen.
  const storageSource = fs.readFileSync(path.join(__dirname, '..', 'src-ts/runtime-executables/ems/modules/storage-control.ts'), 'utf8');
  const methodStart = storageSource.indexOf('async _updateFeneconNvpShadow');
  const methodEnd = storageSource.indexOf('\n    /**\n     */\n    async _setFeneconHybridDiag', methodStart);
  assert.ok(methodStart >= 0 && methodEnd > methodStart, 'shadow wrapper source range missing');
  const methodSource = storageSource.slice(methodStart, methodEnd);
  assert.match(methodSource, /updateFeneconNvpShadowRuntime\(this, ctx\)/);
  assert.doesNotMatch(methodSource, /\.writeNumber\s*\(/);
  assert.doesNotMatch(methodSource, /\.writeBoolean\s*\(/);

  const serviceSource = fs.readFileSync(path.join(__dirname, '..', 'src-ts/runtime-executables/ems/services/fenecon-nvp-shadow-runtime.ts'), 'utf8');
  assert.doesNotMatch(serviceSource, /\.writeNumber\s*\(/);
  assert.doesNotMatch(serviceSource, /\.writeBoolean\s*\(/);
  assert.doesNotMatch(serviceSource, /_applyFeneconGridSetpointW\s*\(/);
  assert.doesNotMatch(serviceSource, /_applyTargetW\s*\(/);
  assert.match(serviceSource, /readFresh\('st\.feneconNvpPowerW'\)/);
  assert.match(serviceSource, /readFresh\('st\.feneconConsumptionTotalW'\)/);
  assert.match(serviceSource, /feneconNvpShadowIntervalSec/);

  console.log('[fenecon-nvp-shadow-runtime] OK: neue FENECON-Mappings, Diagnose-States und strikter No-Hardware-Write-Vertrag geprueft');
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
