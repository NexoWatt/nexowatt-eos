#!/usr/bin/env node
'use strict';
// Software-only regression. Real policy, charging tick, storage tick and output
// planner, using simulated ioBroker states and device writes. No hardware access.
const assert = require('node:assert/strict');
const {
  resolveEvcsStoragePolicy, resolveEvcsStoragePolicyActualLoad, resolveEvcsEffectivePower,
} = require('../ems/modules/charging-management');
const {
  SpeicherRegelungModule, resolveEvcsProtectedStorageTarget, resolveEvcsStorageProtectionSnapshot,
} = require('../ems/modules/storage-control');
const { makeHarness } = require('./verify-rc60-universal-auto-wallbox');
const { decideStorageZeroWrite } = require('../ems/services/storage-zero-write-policy');
let scenarios = 0;
const actualBase = { actualPowerW: 4500, meterFresh: true, online: true, enabled: true,
  vehicleDemandConfirmed: true, vehicleStateNormalized: 'charging', activityThresholdW: 200 };
const protect = resolveEvcsStoragePolicy(true, false, 'auto');
const reading = (patch = {}, policy = protect) => resolveEvcsStoragePolicyActualLoad({
  ...actualBase, storageProtectionRequested: policy.protectionRequested,
  storageAssistRequested: policy.assistRequested, ...patch,
});
const snapshotFrom = rows => ({ ts: Date.now(), complete: true, source: 'charging-runtime',
  protectedLoadW: rows.reduce((v, r) => v + r.protectedLoadW, 0),
  protectedWallboxes: rows.filter(r => r.protectedWallbox).length,
  protectedUnknownWallboxes: rows.filter(r => r.protectedLoadUnknown).length,
  protectionRequestedWallboxes: rows.filter(r => r.protectionRequested).length,
  assistRequestedLoadW: rows.reduce((v, r) => v + r.assistRequestedLoadW, 0),
});
const target = patch => resolveEvcsProtectedStorageTarget({
  requestedTargetW: 6450, lastTargetW: 1950, nvpW: 4550, targetNvpW: 50,
  storageActualW: 1950, protectedEvcsLoadW: 0, protectedLoadUnknown: true,
  deadbandW: 50, ...patch,
});

for (const mode of ['auto', 'boost', 'minpv', 'pv']) {
  for (const allowed of [false, true]) for (const assist of [false, true]) {
    const policy = resolveEvcsStoragePolicy(allowed, assist, mode);
    const fresh = reading({}, policy);
    const stale = reading({ meterFresh: false }, policy);
    assert.equal(fresh.protectedLoadW, policy.protectionRequested ? 4500 : 0);
    assert.equal(fresh.protectedLoadUnknown, false);
    assert.equal(stale.protectedLoadW, 0, 'old watts are not fresh physical load');
    assert.equal(stale.protectedLoadUnknown, policy.protectionRequested);
    assert.equal(stale.assistRequestedLoadW, 0, 'stale data must not fabricate assist');
    scenarios++;
  }
}
for (const patch of [{ meterFresh: false }, { online: false }, { enabled: false },
  { actualPowerW: NaN }, { actualPowerW: null }, { actualPowerW: '' }, { actualPowerW: Infinity }]) {
  assert.equal(reading(patch).protectedLoadUnknown, true);
  scenarios++;
}
for (const power of [0, 69, 199]) {
  const idle = reading({ actualPowerW: power, vehicleStateNormalized: 'ready_to_charge' });
  assert.equal(idle.protectedLoadW, 0);
  assert.equal(idle.protectedLoadUnknown, false, 'fresh standby must not interrupt house supply');
  scenarios++;
}
assert.equal(reading({ online: false, meterFresh: false, physicalIdleConfirmed: true }).protectedLoadUnknown, false);
scenarios++;

const time = 100000;
for (const badTs of [time - 5001, time + 1, 0, null, NaN]) {
  const old = resolveEvcsStorageProtectionSnapshot({ ...snapshotFrom([reading()]), ts: badTs }, { now: time });
  assert.equal(old.protectedLoadW, 0);
  assert.equal(old.protectedLoadUnknown, true, 'expired/future/invalid timestamp must not lift protection');
  scenarios++;
}
const pending = resolveEvcsStorageProtectionSnapshot({ ts: time, complete: false, protectionRequestedWallboxes: 1 }, { now: time });
assert.equal(pending.protectedLoadUnknown, true);
const missing = resolveEvcsStorageProtectionSnapshot(null, { now: time, configuredCandidates: 1 });
assert.equal(missing.protectedLoadUnknown, true);
for (const corrupt of [{}, { ts: time, protectedLoadW: 'invalid', protectedWallboxes: 0 },
  { ts: time, protectedLoadW: null, protectedWallboxes: 0 },
  { ts: time, protectedLoadW: 0, protectedWallboxes: 0, protectedUnknownWallboxes: 'invalid', protectionRequestedWallboxes: 1 }]) {
  assert.equal(resolveEvcsStorageProtectionSnapshot(corrupt, { now: time, configuredCandidates: 1 }).protectedLoadUnknown, true);
  scenarios++;
}
const recovered = resolveEvcsStorageProtectionSnapshot(snapshotFrom([reading()]), { now: Date.now() });
assert.equal(recovered.protectedLoadW, 4500);
assert.equal(recovered.protectedLoadUnknown, false);
const changed = resolveEvcsStorageProtectionSnapshot({ ...snapshotFrom([]), ts: time }, { now: time });
assert.equal(changed.protectedLoadUnknown, false, 'explicit fresh mode change releases protection');
scenarios += 4;

for (const requestedTargetW of [0, 1500, 6450, -2500]) {
  const result = target({ requestedTargetW });
  assert.equal(result.targetW, 0, 'no storage discharge/grid charging while protected EV load unknown');
  assert.equal(result.dischargeAllowanceW, 0);
  assert.equal(result.houseDesiredW, null, 'unknown household split must not be presented as measured');
  assert.equal(result.explicitStop, true);
  const zero = decideStorageZeroWrite({ targetW: result.targetW, lastTargetW: 1950,
    explicitStop: result.explicitStop, reason: result.reason, nvpW: 4550, nvpTargetW: 50, nvpDeadbandW: 50 });
  assert.equal(zero.action, 'write-stop', 'no-write firewall may not hold an old discharge');
  scenarios++;
}
assert.equal(target({ nvpW: -2500, storageActualW: 0, requestedTargetW: -2000, lastTargetW: 0 }).targetW, -2000);
assert.equal(target({ nvpW: 50, storageActualW: -2000, requestedTargetW: -2000, lastTargetW: -2000 }).targetW, -2000,
  'existing physical PV charge must remain stable');
assert.equal(target({ nvpW: -1950, storageActualW: 1950, requestedTargetW: -2000 }).targetW, 0,
  'export manufactured by storage discharge is not chargeable PV');
scenarios += 3;

// Deterministic property grid: all combinations are bounded, no accidental
// discharge, and charge can never exceed total physical surplus.
let properties = 0;
for (const nvpW of [-12000, -3000, -50, 0, 50, 2500, 6500, 30000]) {
  for (const storageActualW of [-8000, -1950, 0, 1950, 8000, null]) {
    for (const lastTargetW of [-8000, 0, 1950, 8000]) {
      for (const requestedTargetW of [-10000, -500, 0, 500, 10000]) {
        const out = target({ nvpW, storageActualW, lastTargetW, requestedTargetW });
        assert(out.targetW <= 0);
        if (out.targetW < 0) assert(-out.targetW <= out.chargeAllowanceW + 1e-8);
        properties++;
      }
    }
  }
}

// OCPP's existing event-driven contract is retained: session/connector evidence
// may validate an unchanged meter value; offline is NOT a physical stop proof.
const held = resolveEvcsEffectivePower({ telemetryProfile: 'ocpp-1.6-event-driven', rawPowerW: 4500,
  rawMeterStale: true, online: true, enabled: true, transactionKnown: true, transactionActive: true,
  normalizedState: 'charging', statusAuthoritative: true });
assert.equal(held.effectiveMeterStale, false);
assert.equal(reading({ actualPowerW: held.effectivePowerW, meterFresh: !held.effectiveMeterStale }).protectedLoadW, 4500);
const ended = resolveEvcsEffectivePower({ telemetryProfile: 'ocpp-1.6-event-driven', rawPowerW: 4500,
  rawMeterStale: true, online: true, enabled: true, transactionKnown: true, transactionActive: false,
  normalizedState: 'finishing', statusAuthoritative: true });
assert.equal(reading({ actualPowerW: ended.effectivePowerW, meterFresh: !ended.effectiveMeterStale,
  vehicleDemandConfirmed: false, vehicleStateNormalized: 'finishing' }).protectedLoadUnknown, false);
scenarios += 2;

class FakeDp {
  constructor(entries) { this.entries = entries; this.writes = []; }
  getEntry(key) { return this.entries[key] || null; }
  getAgeMs(key) { const r = this.getEntry(key); return r ? Date.now() - r.ts : null; }
  getNumber(key, fallback = null) { const r = this.getEntry(key); return r && Number.isFinite(Number(r.val)) ? Number(r.val) : fallback; }
  getNumberFresh(key, age, fallback = null) { return this.getAgeMs(key) > age ? fallback : this.getNumber(key, fallback); }
  getBoolean(key, fallback = false) { const r = this.getEntry(key); return r ? r.val === true : fallback; }
  async writeNumber(key, value) { this.writes.push({ key, value }); return true; }
  async writeBoolean(key, value) { this.writes.push({ key, value }); return true; }
}
async function storageTick({ policy, persistedPolicy, legacyPolicy, gridW = 6500, batteryW = 0,
  lastTargetW = 0, profile = 'generic', configuredCandidates = 0 } = {}) {
  const now = Date.now();
  const entry = (val, id) => ({ val, objectId: id, ts: now });
  const entries = { 'grid.powerW': entry(gridW, 'grid.filtered'), 'grid.powerRawW': entry(gridW, 'grid.raw'),
    'st.socPct': entry(80, 'battery.soc'), 'st.batteryPowerW': entry(batteryW, 'battery.actual') };
  if (profile === 'generic') entries['st.targetPowerW'] = entry(0, 'battery.target');
  else if (profile === 'e3dc') {
    entries['st.e3dcSetPowerMode'] = entry(0, 'e3dc.0.EMS.SET_POWER_MODE');
    entries['st.e3dcSetPowerValueW'] = entry(0, 'e3dc.0.EMS.SET_POWER_VALUE');
  } else {
    entries['st.targetChargePowerW'] = entry(0, 'battery.charge');
    entries['st.targetDischargePowerW'] = entry(0, 'battery.discharge');
    entries['st.run'] = entry(false, 'battery.run');
    entries['st.dcPvPowerW'] = entry(Math.max(0, -gridW), 'pv.dc');
  }
  const dp = new FakeDp(entries);
  const states = new Map();
  if (persistedPolicy) states.set('chargingManagement.control.storagePolicyJson', entry(JSON.stringify(persistedPolicy), 'policy'));
  if (legacyPolicy) states.set('chargingManagement.control.storageProtectedLoadW', { val: 4500, ts: now - 6000 });
  const adapter = {
    config: { enableStorageControl: true, enableStorageFarm: false, enableMultiUse: false,
      enablePeakShaving: false, enableGridConstraints: false,
      chargingManagement: { wallboxes: Array.from({ length: configuredCandidates }, () => ({ storageAssistCustomerAllowed: true })) },
      storage: { controlMode: 'targetPower',
        vendorProfile: profile === 'sungrow' ? 'sungrow-hybrid' : profile === 'e3dc' ? 'e3dc-rscp' : 'generic',
        e3dcZeroMode: 'normal',
        coupling: profile === 'sungrow' ? 'dc' : 'ac',
        staleTimeoutSec: 15, maxDeltaWPerTick: 10000, pvMaxDeltaWPerTick: 10000,
        stepW: 1, pvEnabled: true, pvExportThresholdW: 50, selfTargetGridImportW: 50,
        selfImportThresholdW: 50, selfMinSocPct: 20, selfMaxSocPct: 100 } },
    _emsCaps: policy ? { evcsStoragePolicy: policy } : {}, stateCache: {},
    log: { warn() {}, info() {}, debug() {}, error() {} },
    async setObjectNotExistsAsync() {},
    async setStateAsync(id, val) { states.set(id, { val, ts: Date.now() }); },
    async getStateAsync(id) { return states.get(id) || null; },
    _nwGetNumberFromCache() { return null; },
  };
  const mod = new SpeicherRegelungModule(adapter, dp);
  mod._lastTargetW = lastTargetW;
  mod._lastSource = lastTargetW < 0 ? 'pv' : 'eigenverbrauch';
  await mod.tick();
  const diag = JSON.parse(states.get('speicher.regelung.evcsSpeicherSchutzJson')?.val || '{}');
  return { diag, writes: dp.writes, states, configuredZeroMode: adapter.config.storage.e3dcZeroMode,
    signed: dp.writes.filter(w => w.key === 'st.targetPowerW').at(-1)?.value,
    splitDischarge: dp.writes.filter(w => w.key === 'st.targetDischargePowerW').at(-1)?.value };
}

async function main() {
  let out = await storageTick({ policy: snapshotFrom([reading()]) });
  assert.equal(out.signed, 1950, 'fresh: only 2kW house minus 50W grid target');
  scenarios++;
  const unknown = snapshotFrom([reading({ meterFresh: false })]);
  for (const context of [
    { policy: unknown },
    { policy: unknown, batteryW: 1950, gridW: 4550, lastTargetW: 1950 },
    { policy: { ...snapshotFrom([reading()]), ts: Date.now() - 20000 } },
    { persistedPolicy: unknown },
    { persistedPolicy: { ...snapshotFrom([reading()]), ts: Date.now() - 60000 } },
    { legacyPolicy: true },
    { configuredCandidates: 1 },
    { policy: snapshotFrom([reading(), reading({ meterFresh: false })]) },
  ]) {
    out = await storageTick(context);
    assert.equal(out.signed, 0, JSON.stringify({ context, diag: out.diag, writes: out.writes }));
    assert.equal(out.diag.protectedLoadUnknown, true);
    assert.equal(out.states.get('speicher.regelung.evcsSpeicherSchutzLastUnbekannt')?.val, true);
    scenarios++;
  }
  for (const profile of ['generic', 'split', 'sungrow']) {
    out = await storageTick({ policy: unknown, profile, lastTargetW: 1950, batteryW: 1950, gridW: 4550 });
    assert.equal(profile === 'generic' ? out.signed : out.splitDischarge, 0, JSON.stringify(out.writes));
    out = await storageTick({ policy: unknown, profile, gridW: -2500 });
    assert(out.diag.targetW < 0, JSON.stringify(out.diag));
    assert(out.writes.every(w => w.key !== 'st.targetDischargePowerW' || w.value <= 0));
    scenarios += 2;
  }
  // E3/DC NORMAL releases control to its own self-consumption logic. An
  // unknown-protected-load stop must instead use the existing IDLE=1 command,
  // without changing the installer's normal zero-mode preference permanently.
  out = await storageTick({ policy: unknown, profile: 'e3dc', gridW: 4550, batteryW: 1950, lastTargetW: 1950 });
  assert.equal(out.writes.filter(w => w.key === 'st.e3dcSetPowerMode').at(-1)?.value, 1);
  assert.equal(out.writes.filter(w => w.key === 'st.e3dcSetPowerValueW').at(-1)?.value, 0);
  assert.equal(out.configuredZeroMode, 'normal');
  out = await storageTick({ policy: unknown, profile: 'e3dc', gridW: -2500 });
  assert.equal(out.writes.filter(w => w.key === 'st.e3dcSetPowerMode').at(-1)?.value, 3);
  assert(out.writes.filter(w => w.key === 'st.e3dcSetPowerValueW').at(-1)?.value > 0);
  out = await storageTick({ policy: snapshotFrom([reading()]), profile: 'e3dc' });
  assert.equal(out.writes.filter(w => w.key === 'st.e3dcSetPowerMode').at(-1)?.value, 2);
  assert.equal(out.writes.filter(w => w.key === 'st.e3dcSetPowerValueW').at(-1)?.value, 1950);
  scenarios += 3;
  out = await storageTick({ policy: snapshotFrom([reading()]), persistedPolicy: unknown });
  assert.equal(out.signed, 1950, 'fresh runtime supersedes an old persisted unknown state');
  out = await storageTick({ policy: snapshotFrom([reading({}, resolveEvcsStoragePolicy(true, true, 'auto'))]) });
  assert.equal(out.signed, 6450, 'assist stays normal storage self-consumption');
  out = await storageTick({ policy: snapshotFrom([reading({ actualPowerW: 69 })]), gridW: 2069 });
  assert.equal(out.signed, 2019, 'fresh idle does not block house supply');
  scenarios += 3;

  // Full live charging -> same-cycle policy -> storage output, then recovery and
  // deliberate mode change. Enable real final allocation/phase/executor methods.
  for (const mode of ['auto', 'boost', 'minpv', 'pv']) {
    const h = makeHarness({ userMode: mode, actualPowerW: 4500, status: 'C2', vehicleConnected: true,
      chargeDemand: true, gridAllowed: true, wallbox: { storageAssistCustomerAllowed: true } });
    try {
      delete h.module._publishChargingAllocationTsShadow;
      delete h.module._publishChargingPhaseSelectionRuntimeStates;
      delete h.module._publishChargingStationDiagnosticsFromAllocationPlan;
      await h.tick();
      assert.equal(h.adapter._emsCaps.evcsStoragePolicy.protectedLoadW, mode === 'pv' ? 0 : 4500);
      h.setObject(h.wallbox.dataFreshId, false);
      h.setObject(h.wallbox.actualPowerWId, 4500, Date.now() - 360000);
      await h.tick();
      const stale = h.adapter._emsCaps.evcsStoragePolicy;
      assert.equal(stale.protectedUnknownWallboxes, mode === 'pv' ? 0 : 1);
      if (mode !== 'pv') {
        out = await storageTick({ policy: stale });
        assert.equal(out.signed, 0);
      }
      h.setObject(h.wallbox.dataFreshId, true);
      h.setObject(h.wallbox.actualPowerWId, 4500);
      await h.tick();
      assert.equal(h.adapter._emsCaps.evcsStoragePolicy.protectedUnknownWallboxes, 0);
      h.setLocal('chargingManagement.wallboxes.lp1.userStorageAssistEnabled', true);
      await h.tick();
      assert.equal(h.adapter._emsCaps.evcsStoragePolicy.protectionRequestedWallboxes, 0);
      scenarios += 4;
    } finally { h.stop(); }
  }
  const interrupted = makeHarness({ wallbox: { storageAssistCustomerAllowed: true } });
  try {
    interrupted.module._ensureWallboxChannel = async () => { throw Error('simulated state read failure'); };
    await assert.rejects(interrupted.tick(), /simulated state read failure/);
    assert.equal(interrupted.adapter._emsCaps.evcsStoragePolicy.complete, false);
    out = await storageTick({ policy: interrupted.adapter._emsCaps.evcsStoragePolicy });
    assert.equal(out.signed, 0, 'incomplete tick may not publish a false protection release');
    scenarios++;
  } finally { interrupted.stop(); }
  console.log(`[stable-1.0.5-storage-protection-telemetry] OK: ${scenarios} scenario groups + ${properties} deterministic bound checks; fresh/stale/recovery, modes, OCPP, persisted policy and real charging/storage ticks.`);
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
