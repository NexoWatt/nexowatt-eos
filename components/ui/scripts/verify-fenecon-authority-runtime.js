#!/usr/bin/env node
'use strict';

/**
 * RC38 Laufzeitregression fuer die FENECON-Reglerhoheit im echten
 * Speicherregelungs-Tick:
 * - hohe PV: FEMS-No-Write,
 * - niedrige PV nach Entprellung: EOS schreibt,
 * - EOS -> FEMS: alter Nicht-Null-Sollwert wird einmal auf 0 W neutralisiert,
 * - ein echter SoC-/Sicherheitsstopp schreibt auch unter FEMS-Hoheit 0 W.
 */
const assert = require('node:assert/strict');
const { SpeicherRegelungModule } = require('../ems/modules/storage-control');
const { beginSafetyCycle } = require('../ems/services/safety-envelope');

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
  getNumber(key, fallback = null) {
    const rec = this.entries[key];
    return rec ? strictNumber(rec.val, fallback) : fallback;
  }
  getBoolean(key, fallback = false) {
    const rec = this.entries[key];
    if (!rec) return fallback;
    if (rec.val === true || rec.val === 1 || rec.val === '1' || rec.val === 'true') return true;
    if (rec.val === false || rec.val === 0 || rec.val === '0' || rec.val === 'false') return false;
    return fallback;
  }
  getRaw(key) { return this.entries[key] ? this.entries[key].val : null; }
  setValue(key, value, ageMs = 0) {
    assert.ok(this.entries[key], `missing runtime datapoint ${key}`);
    this.entries[key].val = value;
    this.entries[key].ts = now() - ageMs;
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

function runtimeEntry(objectId, value) {
  return { objectId, val: value, ts: now(), scale: 1, offset: 0, invert: false, unitScale: 1 };
}

function makeRuntime() {
  const states = new Map();
  const dp = new RuntimeDp({
    'grid.powerW': runtimeEntry('plant.grid.filtered', 2000),
    'grid.powerRawW': runtimeEntry('plant.grid.raw', 2000),
    'st.socPct': runtimeEntry('fems.ess0.Soc', 80),
    'st.batteryPowerW': runtimeEntry('fems.ess0.ActivePower', 0),
    'st.feneconEssActualPowerW': runtimeEntry('fems.ess0.ActivePower', 0),
    'st.feneconPvTotalPowerW': runtimeEntry('fems._sum.ProductionActivePower', 800),
    'st.targetPowerW': runtimeEntry('fems.ess0.SetActivePowerEquals', 0),
  });
  const adapter = {
    config: {
      enableStorageControl: true,
      enableStorageFarm: false,
      enableMultiUse: false,
      enablePeakShaving: false,
      enableGridConstraints: false,
      emsApps: {
        apps: {
          storage: { installed: true, enabled: true },
          storagefarm: { installed: false, enabled: false },
          storagemultiuse: { installed: false, enabled: false },
        },
      },
      storage: {
        controlMode: 'targetPower',
        vendorProfile: 'fenecon-openems',
        coupling: 'dc',
        feneconControlMode: 'auto',
        feneconPvPassthroughThresholdW: 500,
        feneconPvReleaseThresholdW: 500,
        feneconPvPassthroughDelaySec: 10,
        feneconPvReleaseDelaySec: 120,
        feneconApiTimeoutSec: 60,
        staleTimeoutSec: 15,
        modeHoldSec: 0,
        tariffPermissionHoldSec: 0,
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
        standaloneSelfDischargeEnabled: true,
        standaloneSelfMinSocPct: 10,
        standaloneSelfMaxSocPct: 100,
        standaloneSelfTargetGridImportW: 50,
        standaloneSelfImportThresholdW: 20,
        selfMinSocPct: 10,
        selfMaxSocPct: 100,
        selfTargetGridImportW: 50,
        selfImportThresholdW: 20,
        maxChargeW: 0,
        maxDischargeW: 0,
      },
      storageFarm: { storages: [] },
      peakShaving: {},
      installerConfig: { gridConnectionPower: 10000 },
    },
    stateCache: {},
    log: { debug() {}, info() {}, warn() {}, error() {} },
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
      const rec = { val, ack: value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'ack') ? value.ack : ack, ts: now(), lc: now() };
      states.set(String(id), rec);
      this.stateCache[String(id)] = { value: val, ack: rec.ack, ts: rec.ts, lc: rec.lc };
    },
    _states: states,
  };
  const module = new SpeicherRegelungModule(adapter, dp);
  return { adapter, dp, module, states };
}

function stateValue(states, id) {
  const rec = states.get(id);
  return rec ? rec.val : undefined;
}

(async () => {
  // 1) Hohe PV beim Start: FEMS besitzt die Hoheit; EOS schreibt weder einen
  // Nicht-Null-Sollwert noch einen zyklischen 0-W-Keepalive.
  {
    const { dp, module, states } = makeRuntime();
    await module.tick();
    assert.equal(dp.writes.filter((row) => row.key === 'st.targetPowerW').length, 0,
      'high PV under FEMS authority must not write the direct ESS target');
    assert.equal(stateValue(states, 'speicher.regelung.feneconHybridRegelhoheit'), 'fems');
    assert.equal(stateValue(states, 'speicher.regelung.feneconHybridNoWrite'), true);
    assert.match(String(stateValue(states, 'speicher.regelung.schreibStatus') || ''), /fenecon:no-write-fems/);
    assert.equal(stateValue(states, 'speicher.regelung.feneconNvpShadowAktiv'), true,
      'RC42 shadow must also run during real FEMS no-write authority');
    assert.equal(stateValue(states, 'speicher.regelung.feneconNvpShadowReadOnly'), true);
    assert.equal(stateValue(states, 'speicher.regelung.feneconNvpShadowSchreibversuch'), false);
    const shadowJson = JSON.parse(String(stateValue(states, 'speicher.regelung.feneconNvpShadowJson') || '{}'));
    assert.equal(shadowJson.writeAttempted, false);
    assert.equal(shadowJson.productWriterChanged, false);
  }

  // 2) PV laenger als 120 s unter 500 W: EOS uebernimmt und schreibt den aus
  // dem NVP berechneten Entladesollwert.
  {
    const { dp, module, states } = makeRuntime();
    dp.setValue('st.feneconPvTotalPowerW', 300);
    module._feneconHybridAuthority = 'fems';
    module._feneconHybridPvBelowSinceMs = now() - 120_100;
    await module.tick();
    const targetWrites = dp.writes.filter((row) => row.key === 'st.targetPowerW');
    assert.ok(targetWrites.length > 0, 'low PV after debounce must activate the EOS writer');
    assert.ok(targetWrites.at(-1).value > 0, `EOS must request discharge for 2 kW import, got ${targetWrites.at(-1).value} W`);
    assert.equal(stateValue(states, 'speicher.regelung.feneconHybridRegelhoheit'), 'nexowatt');
    assert.equal(stateValue(states, 'speicher.regelung.feneconHybridNoWrite'), false);
  }

  // 3) EOS -> FEMS: Ein aktiver Sollwert wird exakt einmal auf 0 W gesetzt;
  // der Folgetick ist echtes No-Write.
  {
    const { dp, module, states } = makeRuntime();
    module._feneconHybridAuthority = 'nexowatt';
    module._feneconHybridPvAboveSinceMs = now() - 10_100;
    module._feneconHybridWasExternal = true;
    module._lastTargetW = 1900;
    module._lastSource = 'eigenverbrauch';
    dp.setValue('st.targetPowerW', 1900);
    await module.tick();
    let targetWrites = dp.writes.filter((row) => row.key === 'st.targetPowerW');
    assert.equal(targetWrites.at(-1).value, 0, 'handover to FEMS must neutralize the old EOS command with 0 W');
    assert.equal(stateValue(states, 'speicher.regelung.feneconHybridSchreibmodus'), 'write-handover-zero');
    assert.equal(stateValue(states, 'speicher.regelung.feneconHybridRegelhoheit'), 'eos-zero-override');

    dp.writes.length = 0;
    await module.tick();
    targetWrites = dp.writes.filter((row) => row.key === 'st.targetPowerW');
    assert.equal(targetWrites.length, 0, 'after successful neutralization the FEMS phase must stop refreshing the command');
    assert.equal(stateValue(states, 'speicher.regelung.feneconHybridRegelhoheit'), 'fems');
    assert.equal(stateValue(states, 'speicher.regelung.feneconHybridNoWrite'), true);
  }

  // 4) Echter SoC-Stopp unter FEMS-Hoheit: Die 0-W-Firewall darf No-Write
  // uebersteuern und den alten Ladebefehl sicher beenden.
  {
    const { dp, module, states } = makeRuntime();
    module._feneconHybridAuthority = 'fems';
    module._feneconHybridWasExternal = true;
    module._lastTargetW = -1500;
    module._lastSource = 'pv';
    dp.setValue('st.targetPowerW', -1500);
    dp.setValue('grid.powerW', -2000);
    dp.setValue('grid.powerRawW', -2000);
    dp.setValue('st.socPct', 100);
    dp.setValue('st.feneconPvTotalPowerW', 1800);
    await module.tick();
    const targetWrites = dp.writes.filter((row) => row.key === 'st.targetPowerW');
    assert.ok(targetWrites.length > 0, 'explicit SoC stop must write even while FEMS normally owns the controller');
    assert.equal(targetWrites.at(-1).value, 0, 'explicit SoC stop must write exactly 0 W');
    assert.equal(stateValue(states, 'speicher.regelung.feneconHybridSchreibmodus'), 'write-zero-override');
    assert.equal(stateValue(states, 'speicher.regelung.feneconHybridRegelhoheit'), 'eos-zero-override');
    assert.equal(stateValue(states, 'speicher.regelung.zeroWriteFirewallExplicitStop'), true);
  }

  // 5) RC39: Der zentrale SafetyEnvelope muss auch den FEMS-No-Write-Pfad
  // uebersteuern. Ein stale/ungueltiger NVP erzwingt einen echten 0-W-Write,
  // obwohl FEMS bei hoher PV normalerweise ohne EOS-Refresh regelt.
  {
    const { adapter, dp, module, states } = makeRuntime();
    beginSafetyCycle(adapter, 1, now());
    adapter._nvpFreshnessSnapshot = {
      ts: now() - 60000,
      sampleTs: now() - 60000,
      valueTs: now() - 60000,
      netW: null,
      usable: false,
      connected: false,
      status: 'stale',
      reason: 'test-stale-nvp',
      source: 'test',
    };
    module._feneconHybridAuthority = 'fems';
    module._feneconHybridWasExternal = false;
    module._lastTargetW = 0;
    module._lastSource = 'fenecon';
    dp.setValue('st.targetPowerW', 1800);
    await module.tick();
    const targetWrites = dp.writes.filter((row) => row.key === 'st.targetPowerW');
    assert.ok(targetWrites.length > 0, 'stale SafetyEnvelope must override FEMS no-write with a real stop write');
    assert.equal(targetWrites.at(-1).value, 0, 'FEMS safety override must write exactly 0 W');
    assert.equal(stateValue(states, 'speicher.regelung.feneconHybridSchreibmodus'), 'write-safety-zero-override');
    assert.match(String(stateValue(states, 'speicher.regelung.safetyReason') || ''), /nvp|safety/i);
  }

  console.log('[fenecon-authority-runtime] OK: real storage ticks verify FEMS no-write, delayed EOS takeover, one-shot handover, explicit stops and RC39 SafetyEnvelope override.');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
