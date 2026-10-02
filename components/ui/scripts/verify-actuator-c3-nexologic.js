#!/usr/bin/env node
'use strict';

/**
 * Regression C3.4:
 * - stabiler Owner pro Graph/Node,
 * - zentraler Arbiter + Readback-/Retry-Vertrag,
 * - optionales zentrales PV-/Gesamtbudget,
 * - keine direkte unkontrollierte NexoLogic-Hardwareausgabe.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { NexoLogicEngine } = require('../ems/nexologic-engine');
const { NexoLogicBudgetModule } = require('../ems/modules/nexologic-budget');
const { StageADiagnosticsModule } = require('../ems/modules/stage-a-diagnostics');
const { installActuatorShadowArbiter, withActuatorShadowContext, priorityForOwner } = require('../ems/services/actuator-shadow-arbiter');

class FakeAdapter {
  constructor() {
    this.namespace = 'nexowatt-ui.0';
    this.config = { diagnostics: { actuatorArbiterMode: 'enforce-safety' }, enableNexoLogic: true, logicEditor: { graphs: [] }, datapoints: {} };
    this.foreign = new Map();
    this.local = new Map();
    this.objects = new Map();
    this.log = { debug() {}, info() {}, warn() {}, error() {} };
    this._nwShuttingDown = false;
    this.logicEngine = null;
  }
  async setObjectNotExistsAsync(id, obj) { if (!this.objects.has(id)) this.objects.set(id, obj); }
  async setStateAsync(id, state, ack) {
    const row = state && typeof state === 'object' && Object.prototype.hasOwnProperty.call(state, 'val') ? state : { val: state, ack: ack === true };
    this.local.set(id, { ...row, ts: Date.now(), lc: Date.now() });
    return true;
  }
  async getStateAsync(id) { return this.local.get(id) || null; }
  async setForeignStateAsync(id, state, ack) {
    const row = state && typeof state === 'object' && Object.prototype.hasOwnProperty.call(state, 'val') ? state : { val: state, ack: ack === true };
    this.foreign.set(id, { ...row, ts: Date.now(), lc: Date.now() });
    return true;
  }
  async getForeignStateAsync(id) { return this.foreign.get(id) || null; }
  async subscribeForeignStatesAsync() {}
  async unsubscribeForeignStatesAsync() {}
  _nwSetTimeout(fn, ms) { return setTimeout(fn, ms); }
  _nwClearTimeout(timer) { clearTimeout(timer); }
  getSmartHomeConfig() { return { devices: [] }; }
}

function graphWithOutput({ id = 'g1', nodeId = 'out1', targetId, value, params = {} }) {
  return {
    version: 1,
    graphs: [{
      id,
      name: id,
      enabled: true,
      nodes: [
        { id: 'value', type: 'const', enabled: true, params: { valueType: typeof value === 'boolean' ? 'bool' : 'number', value } },
        { id: nodeId, type: 'dp_out', enabled: true, params: { dpId: targetId, ack: 'false', minIntervalMs: 0, ...params } },
      ],
      links: [{ id: 'l1', from: { node: 'value', port: 'out' }, to: { node: nodeId, port: 'in' } }],
    }],
  };
}

async function wait(ms = 20) { await new Promise((resolve) => setTimeout(resolve, ms)); }

(async () => {
  // 1) Stufe A erkennt einen eindeutigen NexoLogic-Owner pro Graph/Node.
  const adapter = new FakeAdapter();
  const target = 'device.0.logicRelay';
  adapter.config.logicEditor = graphWithOutput({ targetId: target, value: true });
  const stageA = new StageADiagnosticsModule(adapter, null);
  await stageA.init();
  const ownerRow = adapter._stageAActuatorOwnerById[target];
  assert(ownerRow, 'NexoLogic-Ausgang muss in der Owner-Matrix erscheinen');
  assert.deepStrictEqual(ownerRow.activeOwners, ['nexoLogic.g1.out1']);

  // 2) Direkter DP-Ausgang verwendet den eindeutigen Owner und bestaetigt Readback.
  installActuatorShadowArbiter(adapter);
  const engine = new NexoLogicEngine(adapter);
  adapter.logicEngine = engine;
  await engine.init(graphWithOutput({
    targetId: target,
    value: true,
    params: { requireReadback: 'true', readbackId: target, maxRetries: 1, ackTimeoutMs: 20, retryDelayMs: 20 },
  }));
  await wait();
  assert.strictEqual(adapter.foreign.get(target).val, true, 'NexoLogic muss den Hardware-DP schreiben');
  const status = await adapter.getStateAsync('nexoLogic.outputs.g1.out1.status');
  assert(status && /applied/.test(String(status.val)), `unerwarteter NexoLogic-Status: ${status && status.val}`);
  const snapshot = adapter._actuatorShadowArbiter.snapshot();
  assert(snapshot.recentWrites.some((row) => row.owner === 'nexoLogic.g1.out1' && row.targetId === target), 'Shadow-Arbiter muss eindeutigen NexoLogic-Owner sehen');
  await engine.stop();

  // 2b) Ein alter, zufaellig passender Readback darf einen notwendigen Write nicht bestaetigen.
  const staleAdapter = new FakeAdapter();
  staleAdapter.foreign.set(target, { val: true, ack: true, ts: Date.now() - 60000, lc: Date.now() - 60000 });
  staleAdapter._stageAActuatorOwnerById = { [target]: { owners: ['nexoLogic.g1.out1'], activeOwners: ['nexoLogic.g1.out1'] } };
  installActuatorShadowArbiter(staleAdapter);
  const staleEngine = new NexoLogicEngine(staleAdapter);
  staleAdapter.logicEngine = staleEngine;
  await staleEngine.init(graphWithOutput({
    targetId: target,
    value: true,
    params: { requireReadback: 'true', readbackId: target, readbackMaxAgeMs: 1000, maxRetries: 0, ackTimeoutMs: 20 },
  }));
  await wait();
  const staleSnapshot = staleAdapter._actuatorShadowArbiter.snapshot();
  assert(staleSnapshot.recentWrites.some((row) => row.owner === 'nexoLogic.g1.out1' && row.targetId === target && row.status === 'accepted'), 'staler Readback darf den echten Hardware-Write nicht ueberspringen');
  await staleEngine.stop();

  // 3) Hoeher priorisierte Safety-Steuerhoheit blockiert NexoLogic sauber.
  const blockedAdapter = new FakeAdapter();
  blockedAdapter.config.logicEditor = graphWithOutput({ targetId: target, value: true });
  blockedAdapter._stageAActuatorOwnerById = { [target]: { owners: ['nexoLogic.g1.out1'], activeOwners: ['nexoLogic.g1.out1'] } };
  installActuatorShadowArbiter(blockedAdapter);
  await withActuatorShadowContext(blockedAdapter, {
    owner: 'para14a.test', module: 'para14a', priority: priorityForOwner('para14a.test'), reason: 'test-safety', leaseMs: 60000, enforceAuthority: true,
  }, () => blockedAdapter.setForeignStateAsync(target, { val: false, ack: false }));
  const blockedEngine = new NexoLogicEngine(blockedAdapter);
  blockedAdapter.logicEngine = blockedEngine;
  await blockedEngine.init(graphWithOutput({ targetId: target, value: true, params: { retryDelayMs: 10000, maxRetries: 0 } }));
  await wait();
  assert.strictEqual(blockedAdapter.foreign.get(target).val, false, 'Safety-Wert darf nicht von NexoLogic ueberschrieben werden');
  const blockedStatus = await blockedAdapter.getStateAsync('nexoLogic.outputs.g1.out1.status');
  assert.strictEqual(blockedStatus.val, 'authority-blocked');
  await blockedEngine.stop();

  // 4) Budgetierter numerischer Ausgang wird erst nach zentralem Grant geschrieben und reserviert.
  const budgetAdapter = new FakeAdapter();
  const budgetTarget = 'device.0.flexPowerW';
  const budgetCfg = graphWithOutput({
    targetId: budgetTarget,
    value: 5000,
    params: { budgetMode: 'pv', budgetAction: 'clamp', budgetPowerW: 0, budgetPriority: 900, maxRetries: 0 },
  });
  budgetAdapter.config.logicEditor = budgetCfg;
  budgetAdapter._stageAActuatorOwnerById = { [budgetTarget]: { owners: ['nexoLogic.g1.out1'], activeOwners: ['nexoLogic.g1.out1'] } };
  installActuatorShadowArbiter(budgetAdapter);
  const budgetEngine = new NexoLogicEngine(budgetAdapter);
  budgetAdapter.logicEngine = budgetEngine;
  await budgetEngine.init(budgetCfg);
  await wait();
  assert.strictEqual(budgetAdapter.foreign.has(budgetTarget), false, 'Budgetierter Ausgang darf vor dem zentralen Grant nicht schreiben');
  const reservations = [];
  budgetAdapter._emsBudget = {
    getPvGrant(req) { return { grantW: Math.min(2000, Number(req.requestedW) || 0), source: 'test-pv' }; },
    getTotalGrant(req) { return { grantW: Number(req.requestedW) || 0, source: 'test-total' }; },
    reserve(req) { reservations.push(req); return req; },
  };
  const budgetModule = new NexoLogicBudgetModule(budgetAdapter, null);
  await budgetModule.init();
  await budgetModule.tick();
  assert.strictEqual(budgetAdapter.foreign.get(budgetTarget).val, 2000, 'Numerischer PV-Ausgang muss auf den zentralen Grant begrenzt werden');
  assert.strictEqual(reservations.length, 1, 'NexoLogic muss die akzeptierte Leistung zentral reservieren');
  assert.strictEqual(Math.round(reservations[0].pvReserveW), 2000);
  const reservedState = await budgetAdapter.getStateAsync('nexoLogic.control.reservedW');
  assert.strictEqual(Math.round(reservedState.val), 2000);

  // 4b) Wird ein notwendiger Aus-Befehl durch eine Safety-Lease blockiert, muss die
  // reale noch aktive Leistung weiterhin im zentralen Budget reserviert bleiben.
  await withActuatorShadowContext(budgetAdapter, {
    owner: 'para14a.test', module: 'para14a', priority: priorityForOwner('para14a.test'), reason: 'hold-active-load', leaseMs: 60000, enforceAuthority: true,
  }, () => budgetAdapter.setForeignStateAsync(budgetTarget, { val: 2000, ack: false }));
  const outputMeta = {
    graphId: 'g1', nodeId: 'out1', targetId: budgetTarget, ack: false,
    params: { ...budgetCfg.graphs[0].nodes.find((node) => node.id === 'out1').params, requireReadback: 'true', readbackId: budgetTarget, readbackMaxAgeMs: 1000 },
    reason: 'test-release', kind: 'nexologic-output',
  };
  const blockedStop = await budgetEngine.outputController.request(outputMeta, 0);
  assert.strictEqual(blockedStop.status, 'authority-blocked');
  await budgetModule.tick();
  const heldReservation = await budgetAdapter.getStateAsync('nexoLogic.control.reservedW');
  assert.strictEqual(Math.round(heldReservation.val), 2000, 'blockierter Stop muss die real aktive Last weiter reservieren');
  await budgetEngine.stop();

  // 5) Quellanker: keine unkontrollierten Direktwrites mehr in dp_out/scene_trigger.
  const source = fs.readFileSync(path.join(__dirname, '../src-ts/runtime-executables/ems/nexologic-engine.ts'), 'utf8');
  const ui = fs.readFileSync(path.join(__dirname, '../src-ts/runtime-executables/www/logic.ts'), 'utf8');
  assert(!source.includes('function writeNexoLogicForeign'), 'alter generischer NexoLogic-Schreibhelfer muss entfernt sein');
  assert(source.includes('NexoLogicOutputController'));
  assert(ui.includes("key: 'budgetMode'"));
  assert(ui.includes("key: 'readbackId'"));

  console.log('[actuator-c3-nexologic] OK');
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
