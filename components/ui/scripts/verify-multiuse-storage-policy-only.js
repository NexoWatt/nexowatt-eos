#!/usr/bin/env node
'use strict';
/**
 * Regression 0.8.117: MultiUse ist standardmäßig ausschließlich Speicher-Policy.
 * storage-control bleibt der einzige Batteriesollwert-Schreiber; alte flexible
 * Verbraucher werden ohne expliziten Legacy-Schalter weder beschrieben noch budgetiert.
 */
const assert = require('assert');
const { MultiUseModule } = require('../ems/modules/multi-use');

class FakeDp {
  constructor() { this.entries = new Map(); this.writes = []; }
  async upsert(entry) { this.entries.set(entry.key, { ...entry }); }
  getEntry(key) { return this.entries.get(key) || null; }
  async writeNumber(key, value) { this.writes.push({ key, value: Number(value) }); return true; }
  async writeBoolean(key, value) { this.writes.push({ key, value: !!value }); return true; }
}
function makeAdapter() {
  const states = new Map();
  const budget = {
    remainingTotalW: 10000,
    remainingPvW: 10000,
    reserveCalls: [],
    getTotalGrant({ requestedW }) { return { grantW: requestedW }; },
    getPvGrant({ requestedW }) { return { grantW: requestedW }; },
    reserve(req) { this.reserveCalls.push(req); return req; },
  };
  return {
    namespace: 'nexowatt-ui.0',
    config: {
      enableMultiUse: true,
      installerConfig: { storageMultiUse: { enabled: true } },
      storage: {
        reserveEnabled: true, reserveMinSocPct: 15, reserveTargetSocPct: 20,
        lskEnabled: true, lskDischargeEnabled: true, lskMinSocPct: 25, lskMaxSocPct: 60,
        selfDischargeEnabled: true, selfMinSocPct: 20, selfMaxSocPct: 95,
      },
      multiUse: {
        consumers: [{ key: 'legacy', name: 'Legacy consumer', setWId: 'actor.legacy', budgetMode: 'pv' }],
      },
    },
    _emsBudget: budget,
    log: { debug() {}, info() {}, warn() {}, error() {} },
    async setObjectNotExistsAsync() {},
    async setStateAsync(id, value) { states.set(id, { val: value, ts: Date.now(), lc: Date.now() }); },
    async getStateAsync(id) { return states.get(id) || null; },
    _states: states,
  };
}

(async () => {
  const adapter = makeAdapter();
  const dp = new FakeDp();
  const module = new MultiUseModule(adapter, dp);
  await module.init();
  await module.tick();

  assert.strictEqual(dp.writes.length, 0, 'storage-policy-only darf keinen Hardware-DP schreiben');
  assert.strictEqual(adapter._emsBudget.reserveCalls.length, 0, 'storage-policy-only darf kein Verbraucherbudget reservieren');
  assert.strictEqual(adapter._states.get('multiUse.policy.active').val, true);
  assert.strictEqual(adapter._states.get('multiUse.policy.hardwareWriter').val, 'storage-control');
  assert.strictEqual(adapter._states.get('multiUse.policy.legacyConsumersConfigured').val, 1);
  assert.strictEqual(adapter._states.get('multiUse.policy.legacyConsumersEnabled').val, false);
  assert.strictEqual(adapter._states.get('multiUse.policy.legacyConsumersIgnored').val, true);
  assert.strictEqual(adapter._states.get('multiUse.control.status').val, 'storage-policy-only');
  assert.strictEqual(adapter._states.get('multiUse.control.centralReservedW').val, 0);
  assert.strictEqual(adapter._states.get('multiUse.summary.consumerCount').val, 0);

  // Der explizite Legacy-Migrationsmodus muss seine vorhandenen Zustände sauber
  // einlesen können. Er bleibt standardmäßig aus und ist kein Speicherwriter.
  const legacyAdapter = makeAdapter();
  legacyAdapter.config.multiUse.legacyFlexibleConsumersEnabled = true;
  legacyAdapter._states.set('multiUse.consumers.legacy.targetW', { val: 1234, ts: Date.now(), lc: Date.now() });
  const legacyModule = new MultiUseModule(legacyAdapter, new FakeDp());
  legacyModule._loadConsumersFromConfig();
  await legacyModule._seedLastFromStates();
  assert.strictEqual(legacyModule._last.get('legacy').reqTargetW, 1234, 'Legacy-Migrationszustand wird nicht eingelesen');

  console.log('[multiuse-storage-policy-only] OK: MultiUse veröffentlicht ausschließlich SoC-Policy; storage-control bleibt einziger Batterieschreiber.');
})().catch((error) => {
  console.error('[multiuse-storage-policy-only] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
