#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'src-ts', 'runtime-executables', 'main.ts');
const runtimePath = path.join(root, 'main.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const runtime = fs.readFileSync(runtimePath, 'utf8');

function verify(label, text) {
  assert(text.includes('this._nwEvcsInputBindingsBySourceId = new Map();'), `${label}: EVCS source multi-map missing`);
  assert(text.includes('this._nwEvcsInputBindingsByConfiguredId = new Map();'), `${label}: EVCS configured-ID multi-map missing`);
  assert(text.includes('async _nwBuildEvcsInputBindings()'), `${label}: binding builder missing`);
  assert(text.includes('const list = map.get(sid) || [];'), `${label}: multi-binding list missing`);
  assert(text.includes('if (!duplicate) list.push(binding);'), `${label}: shared station source must retain all connectors`);
  assert(text.includes("for (const key of ['read', 'id', 'source'])"), `${label}: alias read-source resolver missing`);

  for (const field of [
    'wb.powerId',
    'wb.energyTotalId',
    'wb.statusId',
    'wb.onlineId',
    'wb.activeId',
    'wb.vehicleConnectedId',
    'wb.chargeDemandId',
    'wb.heartbeatId',
    'wb.phaseFeedbackId',
    'wb.vehicleSocId',
  ]) {
    assert(text.includes(`configuredId: ${field}`), `${label}: ${field} missing from unified input registry`);
  }

  assert(text.includes('const sourceIds = Array.from(this._nwEvcsInputBindingsBySourceId.keys());'), `${label}: source/alias subscriptions are not registry-driven`);
  assert(text.includes("await this._nwReadAndApplyEvcsConfiguredId(id, 'subscribe-prime');"), `${label}: configured alias prime-read missing`);
  assert(text.includes('evcsBindings: entry.evcsBindings ? Array.from(entry.evcsBindings.values()) : []'), `${label}: 3s plan does not carry all EVCS bindings`);
  assert(text.includes('await this._nwPublishEvcsInputBinding(binding, st, entry.id, `poll:${reason}`);'), `${label}: 3s fallback does not repair EVCS mirror states`);
  assert(text.includes("const evcsHandledKeys = this._nwApplyEvcsInputSourceState(id, state, 'state-change');"), `${label}: stateChange multi-binding path missing`);
  assert(text.includes('&& this._nwIsReadOnlyEvcsMirrorKey(key)'), `${label}: own mirror events can still refresh source timestamps`);
  assert(text.includes('ownState && state.ack === false'), `${label}: local writable EVCS states are not safely acknowledged`);

  for (const stateName of ['vehicleConnected', 'chargeDemand', 'heartbeat', 'phaseFeedback']) {
    assert(new RegExp(`${stateName}:\\s+\\{ type: 'string'`).test(text), `${label}: evcs.<n>.${stateName} mirror object missing`);
  }

  assert(!/this\.evcsIdToKey\[wb\.(powerId|energyTotalId|statusId|onlineId|activeId|vehicleConnectedId|chargeDemandId|heartbeatId)\]\s*=/.test(text), `${label}: lossy single-key EVCS assignment still present`);
}

verify('TypeScript source', source);
verify('runtime JS', runtime);

assert(runtime.includes('AUTO-GENERATED RUNTIME FILE'), 'runtime JS must remain generated from TypeScript');
assert(runtime.includes('Quelle: src-ts/runtime-executables/main.ts'), 'runtime JS source header missing');


function extractHarnessClass() {
  const sf = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const cls = sf.statements.find((node) => ts.isClassDeclaration(node) && node.name && node.name.text === 'NexoWattVis');
  assert(cls, 'NexoWattVis class missing');
  const names = new Set([
    '_nwEvcsInputSpecsForWallbox',
    '_nwExtractAliasReadId',
    '_nwBuildEvcsInputBindings',
    '_nwIsReadOnlyEvcsMirrorKey',
    '_nwEvcsMirrorValue',
    '_nwPublishEvcsInputBinding',
    '_nwReadAndApplyEvcsConfiguredId',
    '_nwScheduleEvcsAliasRefresh',
    '_nwApplyEvcsInputSourceState',
  ]);
  const methods = cls.members
    .filter((node) => ts.isMethodDeclaration(node) && node.name && names.has(node.name.getText(sf)))
    .map((node) => source.slice(node.getStart(sf), node.end));
  assert.strictEqual(methods.length, names.size, 'not all EVCS runtime methods could be extracted');
  const code = `
    class Harness {
      constructor() {
        this.namespace = 'nexowatt-ui.0';
        this.evcsList = [];
        this.stateCache = {};
        this._nwShuttingDown = false;
        this._nwEvcsInputBindingsBySourceId = new Map();
        this._nwEvcsInputBindingsByConfiguredId = new Map();
        this._nwEvcsAliasRefreshPending = new Map();
        this._nwEvcsMirrorStampByKey = new Map();
        this.objects = new Map();
        this.states = new Map();
        this.writes = [];
        this.log = { debug() {}, warn() {}, info() {} };
      }
      _nwScaleMappedValue(key, objectId, value) {
        if (/energyTotalKwh$/.test(key) && /energyWh$/.test(objectId)) return Number(value) / 1000;
        return value;
      }
      updateValue(key, value, stamp) { this.stateCache[key] = { value, ts: stamp }; }
      async getForeignObjectAsync(id) { return this.objects.get(id) || null; }
      async getForeignStateAsync(id) { return this.states.get(id) || null; }
      async setStateAsync(id, state) {
        const normalized = state && typeof state === 'object' && Object.prototype.hasOwnProperty.call(state, 'val')
          ? state
          : { val: state, ack: arguments[2] === true };
        this.writes.push({ id, val: normalized.val, ack: normalized.ack === true });
      }
      ${methods.join('\n\n')}
    }
    Harness;
  `;
  return vm.runInNewContext(code, { Map, Set, Promise, Date, Number, String, Object, JSON, Math, RegExp });
}

async function behavioralRegression() {
  const Harness = extractHarnessClass();
  const h = new Harness();
  h.evcsList = [
    {
      index: 1,
      powerId: 'alias.0.wb1.power',
      statusId: 'vendor.wb1.status',
      onlineId: 'vendor.station.online',
      vehicleConnectedId: 'vendor.wb1.connected',
      chargeDemandId: 'vendor.wb1.demand',
      heartbeatId: 'vendor.station.heartbeat',
      phaseFeedbackId: 'vendor.wb1.phase',
      energyTotalId: 'vendor.wb1.energyWh',
      modeId: 'nexowatt-ui.0.evcs.1.mode',
    },
    {
      index: 2,
      powerId: 'vendor.wb2.power',
      statusId: 'vendor.wb2.status',
      onlineId: 'vendor.station.online',
      heartbeatId: 'vendor.station.heartbeat',
      modeId: 'nexowatt-ui.0.evcs.2.mode',
    },
  ];
  h.objects.set('alias.0.wb1.power', { common: { alias: { id: 'vendor.wb1.power' } } });
  h.states.set('alias.0.wb1.power', { val: 7350, ts: 200 });

  await h._nwBuildEvcsInputBindings();
  assert.strictEqual(h._nwEvcsInputBindingsBySourceId.get('vendor.station.online').length, 2, 'shared station online ID must keep both connectors');
  assert.strictEqual(h._nwEvcsInputBindingsBySourceId.get('vendor.station.heartbeat').length, 2, 'shared heartbeat ID must keep both connectors');
  const aliasTargetBindings = h._nwEvcsInputBindingsBySourceId.get('vendor.wb1.power');
  assert(aliasTargetBindings && aliasTargetBindings.some((binding) => binding.aliasSource === true), 'alias target subscription missing');

  h._nwApplyEvcsInputSourceState('vendor.station.online', { val: true, ts: 100 }, 'test');
  await new Promise((resolve) => setImmediate(resolve));
  assert.strictEqual(h.stateCache['evcs.1.online'].value, true);
  assert.strictEqual(h.stateCache['evcs.2.online'].value, true);
  assert(h.writes.some((write) => write.id === 'evcs.1.online' && write.val === true), 'connector 1 online mirror missing');
  assert(h.writes.some((write) => write.id === 'evcs.2.online' && write.val === true), 'connector 2 online mirror missing');

  h._nwApplyEvcsInputSourceState('vendor.wb1.power', { val: 9999, ts: 190 }, 'alias-target');
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
  assert.strictEqual(h.stateCache['evcs.1.powerW'].value, 7350, 'alias target must re-read configured alias instead of using raw target blindly');

  const powerBinding = h._nwEvcsInputBindingsByConfiguredId.get('vendor.wb2.power')[0];
  h.writes.length = 0;
  await h._nwPublishEvcsInputBinding(powerBinding, { val: 4200, ts: 300 }, 'vendor.wb2.power', 'poll');
  await h._nwPublishEvcsInputBinding(powerBinding, { val: 4200, ts: 300 }, 'vendor.wb2.power', 'poll');
  assert.strictEqual(h.writes.filter((write) => write.id === 'evcs.2.powerW').length, 1, 'same source sample must not spam mirror writes');
  await h._nwPublishEvcsInputBinding(powerBinding, { val: 4200, ts: 301 }, 'vendor.wb2.power', 'poll');
  assert.strictEqual(h.writes.filter((write) => write.id === 'evcs.2.powerW').length, 2, 'new source timestamp must repair/refresh mirror even when value is unchanged');

  const energyBinding = h._nwEvcsInputBindingsByConfiguredId.get('vendor.wb1.energyWh')[0];
  await h._nwPublishEvcsInputBinding(energyBinding, { val: 12500, ts: 400 }, 'vendor.wb1.energyWh', 'poll');
  assert.strictEqual(h.stateCache['evcs.1.energyTotalKwh'].value, 12.5, 'normalization must still run through configured source ID');
}

behavioralRegression()
  .then(() => {
    console.log('[evcs-input-refresh-hardening] OK: subscriptions, aliases, shared station IDs, 3s repair and local EVCS mirrors use one lossless input registry.');
  })
  .catch((error) => {
    console.error(error && error.stack ? error.stack : error);
    process.exit(1);
  });
