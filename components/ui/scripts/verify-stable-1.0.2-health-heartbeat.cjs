#!/usr/bin/env node
'use strict';

/**
 * Stable 1.0.2 regression contract
 *
 * Reproduces the field symptom where EOS Admin switched to "Offline / veraltet"
 * after roughly 20 seconds although the adapter and EMS scheduler were alive.
 * It verifies independent adapter, scheduler, regulation-tick and diagnostics
 * heartbeats as well as a genuine offline state.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function versionAtLeast(actual, minimum) {
  const parse = (value) => String(value || '').split('.').map((part) => Number(part) || 0);
  const a = parse(actual);
  const b = parse(minimum);
  for (let index = 0; index < Math.max(a.length, b.length, 3); index += 1) {
    if ((a[index] || 0) > (b[index] || 0)) return true;
    if ((a[index] || 0) < (b[index] || 0)) return false;
  }
  return true;
}
const pkg = require(path.join(root, 'package.json'));
const {
  AdminOverviewPublisher,
  buildOverviewContract,
  newestTimestamp,
} = require(path.join(root, 'ems/services/admin-overview-publisher.js'));
const { EmsEngine } = require(path.join(root, 'ems/engine.js'));

function cache(values, now = Date.now()) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { value, ts: now }]));
}

function contractAdapter(values, extra = {}) {
  return {
    namespace: 'nexowatt-ui.0',
    version: pkg.version,
    packageVersion: pkg.version,
    config: { port: 8188 },
    stateCache: cache(values),
    ...extra,
  };
}

function baseValues(now) {
  return {
    'info.connection': true,
    'ems.core.schedulerHeartbeatAt': now - 500,
    'ems.core.schedulerAlive': true,
    'ems.core.tickRunning': true,
    'ems.core.lastTickStart': now - 25_000,
    'ems.core.lastTickEnd': now - 28_000,
    'ems.core.lastTickDurationMs': 2_608,
    'ems.core.lastTickError': '',
    'ems.safety.valid': true,
    'ems.safety.emergencyStop': false,
    'ems.budget.active': true,
    'ems.budget.totalBudgetW': 29_980,
    'ems.budget.remainingTotalW': 29_980,
    'ems.budget.binding': 'none',
  };
}

const now = Date.now();
const fieldCase = buildOverviewContract(contractAdapter(baseValues(now)), now);
assert.equal(fieldCase.adapter.online, true, 'field case adapter must remain online');
assert.equal(fieldCase.ems.schedulerFresh, true, 'independent scheduler heartbeat must be fresh');
assert.equal(fieldCase.ems.tickRunning, true, '25-second regulation cycle is still running');
assert.equal(fieldCase.ems.activeTickAgeMs, 25_000);
assert.equal(fieldCase.ems.tickStalled, false, '25 seconds is below the 30-second watchdog');
assert.equal(fieldCase.ems.tickFresh, true, 'running cycle remains healthy until watchdog threshold');
assert.equal(fieldCase.ems.health, 'ok');
assert.notEqual(fieldCase.status, 'error');
assert.doesNotMatch(fieldCase.headline, /offline|nicht aktuell|veraltet/i);

const stalledValues = baseValues(now);
stalledValues['ems.core.lastTickStart'] = now - 35_000;
stalledValues['ems.core.lastTickEnd'] = now - 38_000;
const stalled = buildOverviewContract(contractAdapter(stalledValues), now);
assert.equal(stalled.adapter.online, true);
assert.equal(stalled.ems.schedulerFresh, true);
assert.equal(stalled.ems.tickStalled, true);
assert.equal(stalled.ems.health, 'tick-stalled');
assert.equal(stalled.status, 'warning');
assert.match(stalled.headline, /Adapter online.*Regelzyklus.*Zeitlimit/i);
assert.doesNotMatch(stalled.headline, /offline/i);

const schedulerStaleValues = baseValues(now);
schedulerStaleValues['ems.core.schedulerHeartbeatAt'] = now - 20_000;
schedulerStaleValues['ems.core.tickRunning'] = false;
schedulerStaleValues['ems.core.lastTickEnd'] = now - 2_000;
const schedulerStale = buildOverviewContract(contractAdapter(schedulerStaleValues), now);
assert.equal(schedulerStale.adapter.online, true);
assert.equal(schedulerStale.ems.schedulerFresh, false);
assert.equal(schedulerStale.ems.health, 'scheduler-stale');
assert.equal(schedulerStale.status, 'warning');
assert.match(schedulerStale.headline, /Adapter online.*Scheduler/i);
assert.doesNotMatch(schedulerStale.headline, /offline/i);

const offlineValues = baseValues(now);
offlineValues['info.connection'] = false;
const offline = buildOverviewContract(contractAdapter(offlineValues), now);
assert.equal(offline.adapter.online, false, 'info.connection=false is authoritative');
assert.equal(offline.ems.online, false);
assert.equal(offline.status, 'error');
assert.match(offline.headline, /offline/i);

const timestampAdapter = contractAdapter({
  older: now - 25_000,
  newer: now - 500,
});
assert.equal(newestTimestamp(timestampAdapter, ['older', 'newer']), now - 500,
  'newest activity timestamp must win instead of first populated key');

function createPublisherMock() {
  const stateCache = cache(baseValues(Date.now()));
  const writes = [];
  const intervals = [];
  const cleared = [];
  const adapter = {
    namespace: 'nexowatt-ui.0',
    version: pkg.version,
    packageVersion: pkg.version,
    config: { port: 8188 },
    stateCache,
    _nwShuttingDown: false,
    log: { warn() {}, error() {}, debug() {} },
    subscribeForeignStatesAsync: async () => undefined,
    setObjectNotExistsAsync: async () => undefined,
    getStateAsync: async (id) => ({ val: stateCache[id]?.value ?? null, ts: stateCache[id]?.ts ?? Date.now() }),
    setStateAsync: async (id, payload) => {
      writes.push([id, payload, Date.now()]);
      stateCache[id] = { value: payload.val, ts: Date.now() };
    },
    updateValue: (id, value, ts) => { stateCache[id] = { value, ts }; },
    _nwSetInterval: (callback, ms) => {
      const timer = { callback, ms, id: intervals.length + 1 };
      intervals.push(timer);
      return timer;
    },
    _nwClearInterval: (timer) => { cleared.push(timer); },
  };
  return { adapter, stateCache, writes, intervals, cleared };
}

async function verifyPublisherHeartbeat() {
  const mock = createPublisherMock();
  const publisher = new AdminOverviewPublisher(mock.adapter, {
    intervalMs: 5_000,
    heartbeatIntervalMs: 4_000,
    readTimeoutMs: 100,
    writeTimeoutMs: 100,
    objectTimeoutMs: 100,
    tickFreshThresholdMs: 30_000,
    schedulerFreshThresholdMs: 12_000,
  });
  await publisher.initialize();

  assert(mock.intervals.some((timer) => timer.ms === 4_000), 'independent 4-second overview heartbeat timer missing');
  assert(mock.intervals.some((timer) => timer.ms === 5_000), 'full 5-second overview refresh timer missing');

  // Simulate the exact field window: the expensive full refresh is still active
  // after 25 seconds, while the independent scheduler heartbeat remains current.
  publisher.running = true;
  publisher.runningSince = Date.now() - 25_000;
  publisher.lastSummaryRefreshAt = Date.now() - 25_000;
  const t = Date.now();
  mock.stateCache['info.connection'] = { value: true, ts: t };
  mock.stateCache['ems.core.schedulerHeartbeatAt'] = { value: t - 300, ts: t - 300 };
  mock.stateCache['ems.core.tickRunning'] = { value: true, ts: t - 25_000 };
  mock.stateCache['ems.core.lastTickStart'] = { value: t - 25_000, ts: t - 25_000 };
  mock.stateCache['ems.core.lastTickEnd'] = { value: t - 28_000, ts: t - 28_000 };
  await publisher.heartbeat('field-25s', true);

  const updatedAt = mock.writes.filter(([id]) => id === 'info.adminOverview.updatedAt').at(-1);
  assert(updatedAt, 'updatedAt heartbeat was not written while full cycle was running');
  assert(Date.now() - Number(updatedAt[1].val) < 2_000, 'updatedAt heartbeat is not current');

  const summaryWrite = mock.writes.filter(([id]) => id === 'info.adminOverview.summaryJson').at(-1);
  assert(summaryWrite, 'compatibility summary heartbeat missing');
  const summary = JSON.parse(summaryWrite[1].val);
  assert.equal(summary.adapter.online, true);
  assert.equal(summary.ems.schedulerFresh, true);
  assert.equal(summary.ems.tickRunning, true);
  assert.equal(summary.ems.tickStalled, false);
  assert.doesNotMatch(summary.headline, /offline|nicht aktuell|veraltet/i);
  assert(Date.now() - Number(summary.updatedAt) < 2_000, 'summary heartbeat timestamp is not current');

  // Real loss of adapter connectivity must still be red/offline immediately.
  mock.stateCache['info.connection'] = { value: false, ts: Date.now() };
  await publisher.heartbeat('real-offline', true);
  const offlineSummaryWrite = mock.writes.filter(([id]) => id === 'info.adminOverview.summaryJson').at(-1);
  const offlineSummary = JSON.parse(offlineSummaryWrite[1].val);
  assert.equal(offlineSummary.adapter.online, false);
  assert.equal(offlineSummary.status, 'error');
  assert.match(offlineSummary.headline, /offline/i);

  publisher.running = false;
  publisher.stop();
  assert.equal(mock.cleared.length, 2, 'both heartbeat and full-refresh timers must be cleared on stop');
}

async function verifyEngineHeartbeat() {
  const writes = [];
  const intervals = [];
  const cleared = [];
  const adapter = {
    _nwShuttingDown: false,
    config: { diagnostics: { emsTickStaleAfterMs: 30_000 } },
    setStateAsync: async (id, payload) => { writes.push([id, payload]); },
    setInterval: (callback, ms) => {
      const timer = { callback, ms, id: intervals.length + 1 };
      intervals.push(timer);
      return timer;
    },
    clearInterval: (timer) => { cleared.push(timer); },
  };
  const engine = new EmsEngine(adapter);
  engine._tickRunning = true;
  engine._lastTickStartMs = Date.now() - 25_000;
  await engine._publishSchedulerHeartbeat('regression');
  assert(adapter._nwEmsSchedulerHealth, 'local scheduler health object missing');
  assert.equal(adapter._nwEmsSchedulerHealth.tickRunning, true);
  assert.equal(adapter._nwEmsSchedulerHealth.tickStalled, false);
  assert(writes.some(([id]) => id === 'ems.core.schedulerHeartbeatAt'));
  assert(writes.some(([id]) => id === 'ems.core.schedulerAlive'));

  engine._startSchedulerHeartbeat();
  assert(intervals.some((timer) => timer.ms === 4_000), 'engine scheduler heartbeat timer must use four seconds');
  engine.stop();
  assert(cleared.some((timer) => timer.ms === 4_000), 'engine scheduler heartbeat timer must be cleared');
}

async function main() {
  assert.equal(versionAtLeast(pkg.version, '1.0.2'), true, '1.0.2 health regression requires Stable 1.0.2 or newer');
  await verifyPublisherHeartbeat();
  await verifyEngineHeartbeat();

  const canonicalOverview = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/services/admin-overview-publisher.ts'), 'utf8');
  const runtimeOverview = fs.readFileSync(path.join(root, 'ems/services/admin-overview-publisher.js'), 'utf8');
  const canonicalEngine = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/engine.ts'), 'utf8');
  const canonicalMain = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/main.ts'), 'utf8');
  for (const source of [canonicalOverview, runtimeOverview]) {
    assert(source.includes('Independent compatibility heartbeat for EOS Admin'));
    assert(source.includes('summaryRefreshThresholdMs'));
    assert(source.includes('newestTimestamp'));
    assert(source.includes('emsSchedulerHeartbeatAt'));
  }
  assert(canonicalEngine.includes('_schedulerHeartbeatIntervalMs = 4000'));
  assert(canonicalEngine.includes("_publishSchedulerHeartbeat('timer')"));
  const heartbeatBlock = canonicalMain.slice(
    canonicalMain.indexOf('_nwStartConnectionHeartbeat()'),
    canonicalMain.indexOf('_nwStopConnectionHeartbeat()'),
  );
  assert(heartbeatBlock.includes('}, 4000);'), 'info.connection heartbeat must be four seconds');
  assert(!heartbeatBlock.includes('}, 30000);'), '30-second info.connection heartbeat must be removed');

  console.log(`[Stable 1.0.2 baseline on ${pkg.version}] OK: 25-s field cycle remains online; scheduler stall and genuine offline state stay distinguishable.`);
  console.log(`[Stable 1.0.2 baseline on ${pkg.version}] OK: independent 4-s adapter, scheduler and overview heartbeat lifecycle verified.`);
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
