#!/usr/bin/env node
'use strict';
/**
 * Prüft Speicher-Anlauf und Rücknahme unter dem echten Speicherregler.
 * Nur die zentrale Lease-Grenze ist injiziert; SOC-/Policy-/Budgetprüfung,
 * Nullwertbehandlung und der bestehende Split-Writer laufen unverändert.
 * Die kanonische JS-kompatible TS-Quelle wird ohne Artefaktänderung geladen.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const root = path.resolve(__dirname, '..');
const requests = [];
let grant = true;
let grantValidAtWriter = true;
const runtimePath = path.join(root, 'ems/modules/storage-control.js');
const isolated = new Module(runtimePath, module);
isolated.filename = runtimePath;
isolated.paths = Module._nodeModulePaths(path.dirname(runtimePath));
const normalRequire = isolated.require.bind(isolated);
isolated.require = name => name === '../services/zero-export-pv-coordinator' ? {
  readZeroExportMode: () => ({ active: true }),
  isZeroExportGrantValid: (_adapter, key, leaseId) => grantValidAtWriter && key === 'storage' && leaseId === 'fixture',
  requestZeroExportProbe: (_adapter, request) => {
    requests.push({ ...request });
    const granted = grant && request.eligible;
    return { active: true, granted, extraW: granted ? request.nextW - request.baseW : 0,
      targetW: granted ? request.nextW : request.baseW, validUntil: Date.now() + 5000, leaseId: 'fixture' };
  },
} : normalRequire(name);
isolated._compile(fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/storage-control.ts'), 'utf8'), runtimePath);
const { SpeicherRegelungModule, resolveStorageZeroExportProbeRequest: decide } = isolated.exports;

const base = {
  modeActive: true, writerActive: true, controlMode: 'targetPower', noWrite: false,
  pvEnabled: true, policyBlocked: false, evPriorityBlocked: false,
  source: 'idle', policySource: 'idle', targetW: 0,
  soc: 50, socAgeMs: 0, maxSoc: 90, maxW: 5000, provenPvW: 0,
  actualSignedW: 0, actualAgeMs: 0, actualTrusted: true, stepW: 1,
};
assert.equal(decide(base).nextW, 250);
assert.equal(decide({ ...base, stepW: 500 }).nextW, 500);
assert.equal(decide({ ...base, stepW: 500, maxW: 400 }).eligible, false);
assert.equal(decide({ ...base, targetW: -800, provenPvW: 500 }).baseW, 500);
for (const change of [
  { modeActive: false }, { writerActive: false }, { noWrite: true },
  { controlMode: 'limits' }, { controlMode: 'enableFlags' },
  { pvEnabled: false }, { policyBlocked: true }, { evPriorityBlocked: true },
  { soc: null }, { soc: 90 }, { socAgeMs: null }, { socAgeMs: 15001 },
  { actualSignedW: null }, { actualSignedW: 1 }, { actualAgeMs: 5001 }, { actualTrusted: false },
  { maxW: Infinity }, { maxW: 0 }, { source: 'tarif' }, { policySource: 'reserve' }, { targetW: 100 },
]) assert.equal(decide({ ...base, ...change }).eligible, false, JSON.stringify(change));

const now = () => Date.now();
const rec = (val, objectId) => ({ val, objectId, ts: now() });
function fixture() {
  const records = {
    'grid.powerW': rec(0, 'grid.filtered'), 'grid.powerRawW': rec(0, 'grid.raw'),
    'st.socPct': rec(50, 'battery.soc'), 'st.batteryPowerW': rec(0, 'battery.actual'),
    'st.targetChargePowerW': rec(0, 'battery.charge'),
    'st.targetDischargePowerW': rec(0, 'battery.discharge'), 'st.run': rec(false, 'battery.run'),
  };
  const writes = [];
  const dp = {
    getEntry: key => records[key] || null,
    getAgeMs: key => records[key] ? now() - records[key].ts : null,
    getNumber: (key, fallback = null) => records[key] && Number.isFinite(Number(records[key].val)) ? Number(records[key].val) : fallback,
    getNumberFresh(key, maxAge, fallback = null) { return this.getAgeMs(key) <= maxAge ? this.getNumber(key, fallback) : fallback; },
    getBoolean: (key, fallback = false) => records[key] ? !!records[key].val : fallback,
    async writeNumber(key, value) { writes.push({ key, value }); return true; },
    async writeBoolean(key, value) { writes.push({ key, value }); return true; },
  };
  const states = new Map();
  const reservations = [];
  const adapter = {
    config: { enableStorageControl: true, enableStorageFarm: false, enableMultiUse: false, enablePeakShaving: false,
      storageFarm: {}, gridConstraints: { zeroExportEnabled: true },
      storage: { controlMode: 'targetPower', vendorProfile: 'generic', coupling: 'ac', staleTimeoutSec: 15,
        maxChargeW: 5000, maxDischargeW: 5000, maxDeltaWPerTick: 5000, pvMaxDeltaWPerTick: 5000,
        stepW: 1, pvEnabled: true, selfTargetGridImportW: 0, selfImportThresholdW: 50,
        selfMinSocPct: 20, selfMaxSocPct: 90 } },
    stateCache: {}, log: { warn() {}, info() {}, debug() {}, error() {} },
    async setObjectNotExistsAsync() {},
    async setStateAsync(id, val) { states.set(id, { val, ts: now() }); },
    async getStateAsync(id) { return states.get(id) || null; },
    _emsBudget: { ts: now(), remainingPvW: 0, remainingTotalW: 2000, consumers: {}, gates: {},
      getPvGrant() { return { grantW: this.remainingPvW }; },
      getTotalGrant() { return { grantW: this.remainingTotalW }; },
      reserve(request) { reservations.push(request); } },
  };
  const controller = new SpeicherRegelungModule(adapter, dp);
  return { adapter, controller, records, writes, states, reservations };
}

(async () => {
  const f = fixture();
  await f.controller.tick();
  assert.equal(requests.at(-1).eligible, true, JSON.stringify(requests.at(-1)));
  assert.equal(f.writes.filter(w => w.key === 'st.targetChargePowerW').at(-1).value, 250);
  assert.equal(f.controller._lastSource, 'zero-export-probe');
  assert.equal(f.reservations.at(-1).reserveW, 250);
  assert.equal(f.reservations.at(-1).pvReserveW, 0, 'Unbestätigte Testleistung darf kein PV-Budget beanspruchen');
  assert.equal(f.reservations.at(-1).pvOnly, false);

  f.adapter._emsBudget.ts = now();
  await f.controller.tick();
  assert.equal(requests.at(-1).eligible, true, 'Noch nicht beantwortete Probe bleibt ausschließlich mit erneuerter Lease erlaubt');
  assert.equal(f.writes.filter(w => w.key === 'st.targetChargePowerW').at(-1).value, 250);

  grant = false;
  f.writes.length = 0;
  f.adapter._emsBudget.ts = now();
  await f.controller.tick();
  assert.equal(f.writes.filter(w => w.key === 'st.targetChargePowerW').at(-1).value, 0,
    'Widerruf muss Testladung sofort beenden; kein letzter PV-Sollwertanker');

  grant = true;
  const capped = fixture();
  capped.adapter._emsBudget.remainingTotalW = 100;
  await capped.controller.tick();
  assert.equal(capped.writes.filter(w => w.key === 'st.targetChargePowerW').at(-1).value, 100,
    'Auch Testleistung hält den nach EVCS verbliebenen Gesamt-Grant ein');

  const stale = fixture();
  stale.records['st.batteryPowerW'].ts -= 6000;
  await stale.controller.tick();
  assert.equal(requests.at(-1).eligible, false, 'Veraltete direkte Batterie-Istleistung sperrt die Probe');
  assert.equal(stale.writes.some(w => w.key === 'st.targetChargePowerW' && w.value > 0), false);

  grantValidAtWriter = false;
  const revokedDuringAwait = fixture();
  await revokedDuringAwait.controller.tick();
  assert.equal(requests.at(-1).eligible, true, 'Probe war bei Berechnung freigegeben');
  assert.equal(revokedDuringAwait.writes.some(w => w.key === 'st.targetChargePowerW' && w.value > 0), false,
    'Widerruf zwischen Berechnung und Writer darf trotz künftigem Ablaufzeitpunkt keine Testleistung schreiben');
  assert.equal(revokedDuringAwait.controller._lastSource, 'idle');
  grantValidAtWriter = true;
  console.log('[zero-export-storage] OK: Schutzvoraussetzungen, echter Split-Writer, getrennte Budgetreservierung, Total-Cap und Lease-Widerruf.');
})().catch(error => { console.error(error); process.exitCode = 1; });
