#!/usr/bin/env node
'use strict';

/**
 * Regression 0.8.136: Speicherentladung darf den NVP nicht dauerhaft in die
 * Einspeisung druecken. Die Korrektur erfolgt proportional und mit 2-s-Grace,
 * nicht als pauschaler Sofort-Stopp. Derselbe NVP-Messwert darf nach der Grace
 * nicht in jedem EMS-Tick erneut integriert werden.
 */
const assert = require('assert');
const fs = require('fs');
const {
  SpeicherRegelungModule,
  resolveStorageAntiExportTarget,
} = require('../ems/modules/storage-control');

function step(input, state) {
  return resolveStorageAntiExportTarget({
    requestedTargetW: 3000,
    commandAnchorW: input.commandAnchorW,
    storageActualW: input.storageActualW,
    nvpW: input.nvpW,
    nvpSampleTs: input.nvpSampleTs,
    targetNvpW: 50,
    deadbandW: 50,
    graceMs: 2000,
    now: input.now,
    state,
  });
}

// 1) Feldfall: 3 kW Entladung erzeugen 1 kW Export. Nicht sofort auf 0 W,
// sondern innerhalb der 2-s-Grace proportional auf 1,95 kW reduzieren.
let state = {};
const t0 = step({ commandAnchorW: 3000, storageActualW: 3000, nvpW: -1000, nvpSampleTs: 100, now: 1_000_000 }, state);
assert(t0.targetW > 1950 && t0.targetW < 3000, `erste Anti-Export-Korrektur muss weich abregeln: ${t0.targetW}`);
assert.strictEqual(t0.explicitStop, false, 'erste Exportprobe darf kein Sofort-Stopp sein');
assert.strictEqual(t0.status, 'ramp-down-export-grace');
state = t0.nextState;

const t1 = step({ commandAnchorW: t0.targetW, storageActualW: 3000, nvpW: -1000, nvpSampleTs: 100, now: 1_001_000 }, state);
assert(t1.targetW < t0.targetW && t1.targetW > 1950, `zweite Grace-Stufe muss weiter reduzieren: ${t1.targetW}`);
assert.strictEqual(t1.explicitStop, false);
state = t1.nextState;

const t2 = step({ commandAnchorW: t1.targetW, storageActualW: 3000, nvpW: -1000, nvpSampleTs: 100, now: 1_002_000 }, state);
assert(Math.abs(t2.targetW - 1950) < 1, `nach 2 s muss der physikalische NVP-Cap gelten: ${t2.targetW}`);
assert.strictEqual(t2.explicitStop, false, 'Restentladung ist physikalisch noch zulaessig');
state = t2.nextState;

// 2) Eine neue NVP-Probe darf den akzeptierten Befehl genau einmal weiter senken.
const t3 = step({ commandAnchorW: t2.targetW, storageActualW: 3000, nvpW: -1000, nvpSampleTs: 200, now: 1_003_000 }, state);
assert(Math.abs(t3.targetW - 900) < 1, `neue Exportprobe muss Sollwert weiter reduzieren: ${t3.targetW}`);
assert.strictEqual(t3.sampleRatchetApplied, true);
state = t3.nextState;

const sameSample = step({ commandAnchorW: t3.targetW, storageActualW: 3000, nvpW: -1000, nvpSampleTs: 200, now: 1_004_000 }, state);
assert(Math.abs(sameSample.targetW - 900) < 1, `derselbe NVP-Messwert darf nicht erneut integriert werden: ${sameSample.targetW}`);
assert.strictEqual(sameSample.sampleRatchetApplied, false);
state = sameSample.nextState;

// 3) Erst eine weitere neue Probe kann nach der Grace rechnerisch 0 W ergeben.
const stop = step({ commandAnchorW: sameSample.targetW, storageActualW: 3000, nvpW: -1000, nvpSampleTs: 300, now: 1_005_000 }, state);
assert.strictEqual(stop.targetW, 0, 'anhaltende Einspeisung muss schliesslich auf 0 W reduzieren');
assert.strictEqual(stop.explicitStop, true, '0 W nach Grace ist ein echter Sicherheitsstopp');
assert.strictEqual(stop.status, 'stop-after-grace');

// 4) Verschwindet die kurze Einspeisung vor Ablauf der Grace, wird der Zustand
// zurueckgesetzt und die normale NVP-Regelung uebernimmt wieder.
const cleared = resolveStorageAntiExportTarget({
  requestedTargetW: 3000,
  commandAnchorW: t0.targetW,
  storageActualW: 2500,
  nvpW: 200,
  nvpSampleTs: 400,
  targetNvpW: 50,
  deadbandW: 50,
  graceMs: 2000,
  now: 1_001_500,
  state: t0.nextState,
});
assert.strictEqual(cleared.explicitStop, false);
assert.strictEqual(cleared.nextState.activeSinceMs, 0, 'Anti-Export-Zustand muss nach Rueckkehr ueber Ziel resetten');
assert(cleared.targetW > 0, 'normale Entladung darf nach kurzer Einspeisung weiterlaufen');

// 5) Auch ohne aktuelle Einspeisung darf ein Feed-forward-/Hold-Request nicht
// groesser als der physikalisch sichtbare NVP-Headroom werden.
const preemptive = resolveStorageAntiExportTarget({
  requestedTargetW: 8000,
  commandAnchorW: 0,
  storageActualW: 0,
  nvpW: 1000,
  nvpSampleTs: 500,
  targetNvpW: 50,
  deadbandW: 50,
  graceMs: 2000,
  now: 2_000_000,
  state: {},
});
assert(Math.abs(preemptive.targetW - 950) < 1, `Entladung muss auf NVP-Headroom begrenzt werden: ${preemptive.targetW}`);
assert.strictEqual(preemptive.status, 'cap-to-nvp-headroom');

// 6) Ladebefehle werden von der Entlade-Anti-Export-Schranke nicht veraendert.
const charge = resolveStorageAntiExportTarget({ requestedTargetW: -1500, nvpW: -500, targetNvpW: 50 });
assert.strictEqual(charge.targetW, -1500);
assert.strictEqual(charge.status, 'inactive-no-discharge');

// 7) Der produktive Gate-Pfad liegt zwingend nach Vendor/Budget und vor der
// allgemeinen 0-W-Firewall. Sungrow-No-Write muss bei Korrektur aufgehoben werden.
for (const file of [
  'src-ts/runtime-executables/ems/modules/storage-control.ts',
  'ems/modules/storage-control.js',
]) {
  const text = fs.readFileSync(file, 'utf8');
  const gate = text.indexOf('Finale proportionale Speicher-Anti-Export-Regelung');
  const zero = text.indexOf('Herstellerunabhaengige 0-W-Firewall nach allen Policies/Caps');
  assert(gate >= 0 && zero > gate, `${file}: Anti-Export-Gate muss vor der 0-W-Firewall liegen`);
  assert(text.includes("sungrowWriteMode = storageAntiExportExplicitStop"), `${file}: Sungrow-Schreibmodus muss Anti-Export explizit uebernehmen`);
  assert(text.includes("'write-anti-export-ramp-down'"), `${file}: proportionaler Sungrow-Write-Modus fehlt`);
  assert(text.includes("'write-stop-anti-export-after-grace'"), `${file}: Stop erst nach Grace fehlt`);
}


async function runSungrowRuntimeSequence() {
  let fakeNow = 1_000_000;
  const originalNow = Date.now;
  Date.now = () => fakeNow;

  class RuntimeDp {
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
      const rec = this.entries[key];
      return rec && Number.isFinite(Number(rec.ts)) ? Math.max(0, fakeNow - Number(rec.ts)) : null;
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
      const value = Number(this.entries[key] && this.entries[key].val);
      return Number.isFinite(value) ? value : fallback;
    }
    getRaw(key) {
      return this.entries[key] ? this.entries[key].val : null;
    }
    getBoolean(key, fallback = false) {
      const value = this.entries[key] && this.entries[key].val;
      if (value === true || value === 1 || value === '1' || value === 'true') return true;
      if (value === false || value === 0 || value === '0' || value === 'false') return false;
      return fallback;
    }
    async writeNumber(key, value) {
      const next = Number(value);
      this.writes.push({ key, value: next, ts: fakeNow });
      const previous = this.entries[key] || { objectId: `runtime.${key}` };
      this.entries[key] = { ...previous, val: next, ts: fakeNow };
      return true;
    }
    async writeBoolean(key, value) {
      const next = !!value;
      this.writes.push({ key, value: next, ts: fakeNow });
      const previous = this.entries[key] || { objectId: `runtime.${key}` };
      this.entries[key] = { ...previous, val: next, ts: fakeNow };
      return true;
    }
    setMeasurement(key, value, updateTs = true) {
      const previous = this.entries[key] || { objectId: `runtime.${key}` };
      this.entries[key] = {
        ...previous,
        val: value,
        ts: updateTs ? fakeNow : previous.ts,
      };
    }
    lastWrite(key) {
      const row = [...this.writes].reverse().find((entry) => entry.key === key);
      return row ? row.value : null;
    }
  }

  const states = new Map();
  const adapter = {
    config: {
      enableStorageControl: true,
      enableStorageFarm: false,
      enableMultiUse: false,
      enablePeakShaving: false,
      enableGridConstraints: false,
      storage: {
        controlMode: 'targetPower',
        vendorProfile: 'sungrow-hybrid',
        staleTimeoutSec: 15,
        maxDeltaWPerTick: 50000,
        pvMaxDeltaWPerTick: 50000,
        stepW: 1,
        pvEnabled: false,
        selfTargetGridImportW: 50,
        selfImportThresholdW: 50,
        selfMinSocPct: 20,
        selfMaxSocPct: 100,
        sungrowImportThresholdW: 50,
        sungrowTargetGridImportW: 50,
        sungrowAssistBufferW: 150,
        antiExportGraceSec: 2,
      },
    },
    stateCache: {},
    log: { warn() {}, info() {}, debug() {}, error() {} },
    async setObjectNotExistsAsync() {},
    async setStateAsync(id, val) { states.set(id, { val, ts: fakeNow }); },
    async getStateAsync(id) { return states.get(id) || null; },
    _nwHasMappedDatapoint() { return false; },
    _nwGetNumberFromCache() { return null; },
    _nwGetCacheAgeMs() { return null; },
    _nwGetNumberFromCacheFresh(id, maxAgeMs, fallback = null) { return fallback; },
  };

  const dp = new RuntimeDp({
    'grid.powerW': { val: -1000, ts: fakeNow, objectId: 'grid.filtered' },
    'grid.powerRawW': { val: -1000, ts: fakeNow, objectId: 'grid.raw' },
    'st.socPct': { val: 80, ts: fakeNow, objectId: 'battery.soc' },
    'st.batteryPowerW': { val: 3000, ts: fakeNow, objectId: 'sungrow.actualPower' },
    'st.targetChargePowerW': { val: 0, ts: fakeNow, objectId: 'sungrow.ctrl.chargePowerW' },
    'st.targetDischargePowerW': { val: 3000, ts: fakeNow, objectId: 'sungrow.ctrl.dischargePowerW' },
    'st.run': { val: true, ts: fakeNow, objectId: 'sungrow.ctrl.run' },
  });

  const mod = new SpeicherRegelungModule(adapter, dp);
  mod._lastTargetW = 3000;
  mod._lastSource = 'eigenverbrauch';
  mod._lastTargetWriteMs = fakeNow - 1000;

  try {
    await mod.tick();
    const first = dp.lastWrite('st.targetDischargePowerW');
    assert(first > 0 && first < 3000, `Runtime: erste NVP-Korrektur muss passend reduzieren, nicht sofort stoppen: ${first}`);
    assert.strictEqual(dp.lastWrite('st.targetChargePowerW'), 0, 'Runtime: Anti-Export darf keine Gegenrichtung laden');

    fakeNow += 1000;
    dp.setMeasurement('grid.powerW', -1000, true);
    dp.setMeasurement('grid.powerRawW', -1000, true);
    dp.setMeasurement('st.batteryPowerW', 3000, false);
    await mod.tick();
    const duringGrace = dp.lastWrite('st.targetDischargePowerW');
    assert(duringGrace > 0 && duringGrace <= first, `Runtime: innerhalb der Grace muss die Entladung positiv, aber nicht hoeher bleiben: ${duringGrace}`);

    fakeNow += 1000;
    dp.setMeasurement('grid.powerW', -1000, true);
    dp.setMeasurement('grid.powerRawW', -1000, true);
    dp.setMeasurement('st.batteryPowerW', 3000, false);
    await mod.tick();
    const afterGrace = dp.lastWrite('st.targetDischargePowerW');
    assert(afterGrace >= 0 && afterGrace < duringGrace, `Runtime: anhaltender Export muss nach 2 s weiter abregeln: ${afterGrace}`);
    assert.strictEqual(states.get('speicher.regelung.commandDpReadbackOk').val, true, 'Runtime: reduzierter Split-Befehl muss per Readback bestaetigt sein');

    fakeNow += 1000;
    dp.setMeasurement('grid.powerW', -1000, true);
    dp.setMeasurement('grid.powerRawW', -1000, true);
    dp.setMeasurement('st.batteryPowerW', 3000, false);
    await mod.tick();
    assert.strictEqual(dp.lastWrite('st.targetDischargePowerW'), 0, 'Runtime: dauerhaft nicht reagierender Speicher muss nach der Grace sicher auf 0 W reduziert werden');
    assert.strictEqual(states.get('speicher.regelung.antiExportStatus').val, 'stop-after-grace');
    assert.strictEqual(states.get('speicher.regelung.zeroWriteFirewallExplicitStop').val, true, 'Runtime: 0 W nach Grace muss als expliziter Sicherheitsstopp die Firewall passieren');
    assert.strictEqual(states.get('speicher.regelung.commandDpReadbackOk').val, true, 'Runtime: auch der 0-W-Stopp muss am Kommandodatenpunkt bestaetigt sein');
  } finally {
    Date.now = originalNow;
  }
}

runSungrowRuntimeSequence()
  .then(() => {
    console.log('[storage-anti-export-ramp] OK: NVP-basierte Entladung wird proportional reduziert; ein Sungrow-Runtimepfad toleriert kurze Ueberschwinger, verhindert Dauerexport und bestaetigt den finalen Befehl per Readback.');
  })
  .catch((err) => {
    console.error('[storage-anti-export-ramp] ERROR:', err && err.stack ? err.stack : err);
    process.exit(1);
  });
