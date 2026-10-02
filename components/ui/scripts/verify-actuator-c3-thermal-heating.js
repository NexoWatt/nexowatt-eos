#!/usr/bin/env node
'use strict';

/**
 * Regression 0.8.113 – C3.2 Thermik/Heizstab:
 * - eindeutige Owner-Kontexte,
 * - blockierte/fehlgeschlagene Writes gelten nicht als umgesetzt,
 * - optionales Readback,
 * - begrenzte Wiederholungen/Fehlerverriegelung,
 * - Budgetreservierung nur für gemessene oder akzeptierte Anforderungen.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { ActuatorCommandContract } = require('../ems/services/actuator-command-contract');
const { ThermalControlModule } = require('../ems/modules/thermal-control');
const { HeatingRodControlModule } = require('../ems/modules/heating-rod-control');

class FakeAdapter {
  constructor() {
    this.namespace = 'nexowatt-ui.0';
    this.config = { enableThermalControl: true, enableHeatingRodControl: true };
    this.states = new Map();
    this.foreign = new Map();
    this.log = { debug() {}, info() {}, warn() {}, error() {} };
  }
  async getStateAsync(id) { return this.states.has(id) ? { val: this.states.get(id) } : null; }
  async setStateAsync(id, val) { this.states.set(id, val); }
  async setObjectNotExistsAsync() {}
  async getForeignStateAsync(id) { return this.foreign.has(id) ? { val: this.foreign.get(id), ack: true, ts: Date.now() } : null; }
  async setForeignStateAsync(id, val) { this.foreign.set(id, val); if (this.dp) this.dp.setByObjectId(id, val); return true; }
}

class FakeDp {
  constructor(adapter) {
    this.adapter = adapter;
    this.entries = new Map();
    this.values = new Map();
    this.objectToKey = new Map();
    this.failWrites = false;
    this.lastWriteByObjectId = new Map();
    adapter.dp = this;
  }
  add(key, objectId, value = null) { this.entries.set(key, { objectId, invert: false }); this.objectToKey.set(objectId, key); if (value !== null) { this.values.set(key, value); this.adapter.foreign.set(objectId, value); } }
  setByObjectId(id, val) { const key = this.objectToKey.get(id); if (key) this.values.set(key, val); }
  getEntry(key) { return this.entries.get(key) || null; }
  getBoolean(key, fallback = null) { return this.values.has(key) ? !!this.values.get(key) : fallback; }
  getNumber(key, fallback = null) { const n = Number(this.values.get(key)); return Number.isFinite(n) ? n : fallback; }
  getRaw(key, fallback = null) { return this.values.has(key) ? this.values.get(key) : fallback; }
  async writeBoolean(key, value) { if (this.failWrites) return false; this.values.set(key, !!value); const e=this.getEntry(key); if(e) this.adapter.foreign.set(e.objectId, !!value); return true; }
  async writeNumber(key, value) { if (this.failWrites) return false; this.values.set(key, Number(value)); const e=this.getEntry(key); if(e) this.adapter.foreign.set(e.objectId, Number(value)); return true; }
}

(async () => {
  // Typed contract: bounded retries and lock.
  const contract = new ActuatorCommandContract();
  const cfg = { requireReadback: true, ackTimeoutMs: 1, retryDelayMs: 1, maxRetries: 1, faultLockMs: 1000 };
  assert.strictEqual(contract.prepare('x', 1, 1000, cfg).allowed, true);
  let r = contract.complete('x', 1, false, null, null, 1000, cfg);
  assert.strictEqual(r.faultLocked, false);
  assert.strictEqual(contract.prepare('x', 1, 1300, cfg).allowed, true);
  r = contract.complete('x', 1, false, null, null, 1300, cfg);
  assert.strictEqual(r.faultLocked, true, 'second failed attempt must lock same target');
  assert.strictEqual(contract.prepare('x', 2, 1301, cfg).allowed, true, 'changed target clears fault lock');

  // Thermal: accepted write + readback confirms; failed write does not apply.
  const ta = new FakeAdapter(); const td = new FakeDp(ta);
  td.add('th.c1.setW', 'device.thermal.setW', 0); td.add('th.c1.en', 'device.thermal.enable', false);
  const thermal = new ThermalControlModule(ta, td);
  const device = { id:'c1', setWKey:'th.c1.setW', enableKey:'th.c1.en', sg1Key:'', sg2Key:'', requireReadback:true, readbackTimeoutSec:1, retryDelaySec:1, maxRetries:1, faultLockSec:1 };
  let tr = await thermal._applyThermalCommand(device, 'power', { type:'load', key:'c1', setWKey:'th.c1.setW', enableKey:'th.c1.en' }, { targetW:3200 }, 'test');
  assert.strictEqual(tr.accepted, true);
  assert.strictEqual(tr.applied, true);
  td.failWrites = true;
  tr = await thermal._applyThermalCommand(device, 'power', { type:'load', key:'c1', setWKey:'th.c1.setW', enableKey:'th.c1.en' }, { targetW:1500 }, 'test-fail');
  assert.strictEqual(tr.accepted, false);
  assert.strictEqual(tr.applied, false);

  // Heating rod: stage readback confirms and failed write stays unapplied.
  const ha = new FakeAdapter(); const hd = new FakeDp(ha);
  hd.add('hr.c1.s1.w', 'device.rod.s1', false); hd.add('hr.c1.s1.r', 'device.rod.s1r', false);
  // Simulate readback relay following write.
  const originalSet = ha.setForeignStateAsync.bind(ha);
  ha.setForeignStateAsync = async (id, val) => { await originalSet(id, val); if (id === 'device.rod.s1') { hd.values.set('hr.c1.s1.r', !!val); ha.foreign.set('device.rod.s1r', !!val); } return true; };
  const rod = new HeatingRodControlModule(ha, hd);
  const rodDevice = { id:'c1', wiredStages:1, stageCount:1, maxPowerW:3000, requireReadback:true, readbackTimeoutSec:1, retryDelaySec:1, maxRetries:1, faultLockSec:1, stages:[{ powerW:3000, writeKey:'hr.c1.s1.w', readKey:'hr.c1.s1.r', writeId:'device.rod.s1', readId:'device.rod.s1r' }] };
  let feedback = rod._readStageFeedback(rodDevice, null);
  let hr = await rod._applyStageState(rodDevice, 1, feedback, { force:true, reason:'test' });
  assert.strictEqual(hr.accepted, true);
  assert.strictEqual(hr.applied, true);
  // Failure on target change to OFF.
  ha.setForeignStateAsync = async () => { throw new Error('simulated write failure'); };
  feedback = rod._readStageFeedback(rodDevice, null);
  hr = await rod._applyStageState(rodDevice, 0, feedback, { force:true, reason:'test-fail' });
  assert.strictEqual(hr.accepted, false);
  assert.strictEqual(hr.applied, false);

  const thermalSource = fs.readFileSync(path.join(__dirname, '../src-ts/runtime-executables/ems/modules/thermal-control.ts'), 'utf8');
  const heatingSource = fs.readFileSync(path.join(__dirname, '../src-ts/runtime-executables/ems/modules/heating-rod-control.ts'), 'utf8');
  assert.match(thermalSource, /res\.accepted \? Math\.max/, 'thermal budget fallback must require accepted write');
  assert.match(heatingSource, /res\.accepted \? targetW/, 'heating budget must reserve target only after accepted write');
  assert.match(thermalSource, /module: 'thermalControl'/);
  assert.match(heatingSource, /module: 'heatingRodControl'/);

  console.log('[actuator-c3-thermal-heating] OK');
})().catch((error) => { console.error(error && error.stack || error); process.exit(1); });
