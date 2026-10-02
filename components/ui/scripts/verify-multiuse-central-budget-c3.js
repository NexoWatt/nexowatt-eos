#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { MultiUseModule } = require('../ems/modules/multi-use');

class FakeDp {
  constructor() {
    this.entries = new Map();
    this.values = new Map();
    this.writes = [];
  }
  async upsert(entry) { this.entries.set(entry.key, { ...entry }); }
  getEntry(key) { return this.entries.get(key) || null; }
  getNumberFresh(key, _age, fallback) { return this.values.has(key) ? this.values.get(key) : fallback; }
  isStale() { return false; }
  async writeNumber(key, value) { this.writes.push({ key, value: Number(value) }); return true; }
  async writeBoolean(key, value) { this.writes.push({ key, value: !!value }); return true; }
}

function makeBudget(totalW, pvW) {
  return {
    remainingTotalW: totalW,
    remainingPvW: pvW,
    consumers: {},
    order: [],
    getTotalGrant({ requestedW }) { return { grantW: Math.min(Math.max(0, requestedW), this.remainingTotalW) }; },
    getPvGrant({ requestedW }) { return { grantW: Math.min(Math.max(0, requestedW), this.remainingTotalW, this.remainingPvW) }; },
    reserve(req) {
      const reserveW = Math.max(0, Number(req.reserveW) || 0);
      const pvReserveW = Math.max(0, Number(req.pvReserveW) || 0);
      this.remainingTotalW = Math.max(0, this.remainingTotalW - reserveW);
      this.remainingPvW = Math.max(0, this.remainingPvW - pvReserveW);
      this.consumers[req.key] = { ...req };
      this.order.push(req.key);
      return this.consumers[req.key];
    },
  };
}

function makeAdapter() {
  const states = new Map();
  const adapter = {
    config: {
      enableMultiUse: true,
      multiUse: {
        legacyFlexibleConsumersEnabled: true,
        pvBudgetMode: 'dp',
        pvBudgetWId: 'plant.pvDemand',
        comfortBudgetW: 0,
        stepW: 100,
        consumers: [
          { key: 'c1', name: 'Consumer 1', type: 'load', priority: 100, setWId: 'actor.c1', budgetMode: 'pv' },
          { key: 'c2', name: 'Consumer 2', type: 'load', priority: 200, setWId: 'actor.c2', budgetMode: 'pv' },
        ],
      },
    },
    log: { debug() {}, info() {}, warn() {}, error() {} },
    async setObjectNotExistsAsync() {},
    async setStateAsync(id, value) { states.set(id, { val: value, ts: Date.now(), lc: Date.now() }); },
    async getStateAsync(id) { return states.get(id) || null; },
    _states: states,
  };
  return adapter;
}

(async () => {
  const adapter = makeAdapter();
  const dp = new FakeDp();
  dp.values.set('mu.pvBudgetW', 8000);
  adapter._emsBudget = makeBudget(8000, 5000);
  const module = new MultiUseModule(adapter, dp);
  await module.init();
  await adapter.setStateAsync('multiUse.consumers.c1.targetW', 4000, true);
  await adapter.setStateAsync('multiUse.consumers.c2.targetW', 4000, true);
  await module.tick();

  assert.deepStrictEqual(dp.writes.filter((row) => row.key.endsWith('.setW')).map((row) => row.value), [4000, 1000], 'PV-Grant muss sequenziell 4 kW + 1 kW verteilen');
  assert.strictEqual(adapter._emsBudget.remainingPvW, 0);
  assert.strictEqual(adapter._emsBudget.remainingTotalW, 3000);
  assert.strictEqual(adapter._emsBudget.order.length, 2);
  assert.strictEqual(adapter._emsBudget.consumers['multiUse:c1'].pvOnly, true);
  assert.strictEqual(adapter._emsBudget.consumers['multiUse:c2'].reserveW, 1000);
  assert.strictEqual(adapter._states.get('multiUse.control.centralReservedW').val, 5000);
  assert.strictEqual(adapter._states.get('multiUse.control.centralPvReservedW').val, 5000);

  dp.writes.length = 0;
  await adapter.setStateAsync('multiUse.consumers.c1.targetW', 0, true);
  await adapter.setStateAsync('multiUse.consumers.c2.targetW', 0, true);
  adapter._emsBudget = makeBudget(8000, 5000);
  await module.tick();
  const firstStops = dp.writes.filter((row) => row.key.endsWith('.setW') && row.value === 0).length;
  assert.strictEqual(firstStops, 2, 'aktive Verbraucher müssen genau einmal auf 0 gesetzt werden');
  dp.writes.length = 0;
  await module.tick();
  assert.strictEqual(dp.writes.length, 0, 'bereits gestoppte Verbraucher dürfen nicht zyklisch mit 0 beschrieben werden');

  const source = fs.readFileSync(path.resolve(__dirname, '../src-ts/runtime-executables/ems/modules/multi-use.ts'), 'utf8');
  assert(source.includes('central.getPvGrant'), 'MultiUse muss zentralen PV-Grant verwenden');
  assert(source.includes('central.getTotalGrant'), 'MultiUse muss zentralen Gesamtgrant verwenden');
  assert(source.includes('central.reserve'), 'MultiUse muss tatsächliche Leistung zentral reservieren');
  assert(source.includes("owner,\n      module: 'multiUse'"), 'MultiUse-Write muss einen eindeutigen Arbiter-Owner besitzen');


  const managerSource = fs.readFileSync(path.resolve(__dirname, '../src-ts/runtime-executables/ems/module-manager.ts'), 'utf8');
  const chargingPos = managerSource.indexOf("key: 'chargingManagement'");
  const storagePos = managerSource.indexOf("key: 'speicherRegelung'");
  const multiUsePos = managerSource.indexOf("key: 'multiUse'");
  const thermalPos = managerSource.indexOf("key: 'thermalControl'");
  const heatingPos = managerSource.indexOf("key: 'heatingRodControl'");
  assert(chargingPos >= 0 && storagePos > chargingPos && multiUsePos > storagePos && thermalPos > multiUsePos && heatingPos > thermalPos,
    'Modulreihenfolge muss EVCS -> Speicher -> MultiUse -> Thermik -> Heizstab sein');

  console.log('[multiuse-central-budget-c3] OK: MultiUse verwendet zentrale Grants, reserviert tatsächlich verwendete Leistung, läuft in zentraler Reihenfolge und schreibt 0 nur einmal.');
})().catch((error) => {
  console.error('[multiuse-central-budget-c3] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
