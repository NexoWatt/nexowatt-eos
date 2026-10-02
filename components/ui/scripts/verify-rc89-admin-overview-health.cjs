#!/usr/bin/env node
'use strict';

/**
 * RC89 regression contract
 *
 * Verifies that adapter connectivity, EMS tick freshness and the read-only
 * diagnosis publisher are independent health signals. It also reproduces a
 * hanging state read/write and proves that the publisher keeps refreshing its
 * heartbeat without spawning duplicate unresolved operations.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const releaseVersion = require(path.join(root, 'package.json')).version;
const {
  AdminOverviewPublisher,
  buildOverviewContract,
} = require(path.join(root, 'ems/services/admin-overview-publisher.js'));

function cache(values, now = Date.now()) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { value, ts: now }]));
}

function contractAdapter(values, extra = {}) {
  return {
    version: releaseVersion,
    packageVersion: releaseVersion,
    config: { port: 8188 },
    stateCache: cache(values),
    ...extra,
  };
}

const now = Date.now();
const staleTick = buildOverviewContract(contractAdapter({
  'info.connection': true,
  'ems.core.lastTickStart': now - 45_000,
  'ems.core.lastTickEnd': now - 44_500,
  'ems.core.lastTickError': '',
  'ems.safety.valid': true,
  'ems.safety.emergencyStop': false,
}), now);
assert.equal(staleTick.adapter.online, true, 'adapter connectivity must remain online');
assert.equal(staleTick.ems.online, true, 'EMS overview must not redefine adapter online as tick freshness');
assert.equal(staleTick.ems.tickFresh, false, 'stale tick remains visible as its own health signal');
assert.equal(staleTick.status, 'warning');
assert.match(staleTick.headline, /Adapter online.*EMS-Regelschleife/i);
assert.doesNotMatch(staleTick.headline, /^.*offline.*$/i);

const offline = buildOverviewContract(contractAdapter({
  'info.connection': false,
  'ems.core.lastTickStart': now - 1_000,
  'ems.core.lastTickEnd': now - 500,
  'ems.safety.valid': true,
}), now);
assert.equal(offline.adapter.online, false);
assert.equal(offline.ems.online, false);
assert.equal(offline.status, 'error');
assert.match(offline.headline, /offline/i);

const publisherDelayed = buildOverviewContract(contractAdapter({
  'info.connection': true,
  'ems.core.lastTickStart': now - 1_000,
  'ems.safety.valid': true,
}, {
  _nwAdminOverviewPublisherHealth: {
    status: 'degraded',
    heartbeatAt: now,
    lastSuccessAt: now - 5_000,
    readTimeouts: 1,
    writeTimeouts: 0,
    pendingOperations: 1,
    lastError: 'test timeout',
    tickFreshThresholdMs: 30_000,
  },
}), now);
assert.equal(publisherDelayed.adapter.online, true);
assert.equal(publisherDelayed.ems.tickFresh, true);
assert.equal(publisherDelayed.publisher.healthy, false);
assert.equal(publisherDelayed.status, 'warning');
assert.match(publisherDelayed.headline, /Diagnoseaktualisierung verzögert/i);

function createPublisherMock({ hangReadId = '', hangWriteId = '' } = {}) {
  const nowLocal = Date.now();
  const stateCache = cache({
    'info.connection': true,
    'ems.core.lastTickStart': nowLocal,
    'ems.core.lastTickEnd': nowLocal,
    'ems.core.lastTickDurationMs': 250,
    'ems.core.lastTickError': '',
    'ems.safety.valid': true,
    'ems.safety.emergencyStop': false,
    'ems.budget.active': true,
    'ems.budget.totalBudgetW': 30_000,
    'ems.budget.remainingTotalW': 30_000,
    'ems.budget.binding': 'none',
  }, nowLocal);
  const writes = [];
  const readStarts = new Map();
  const writeStarts = new Map();
  const never = new Promise(() => {});
  const adapter = {
    namespace: 'nexowatt-ui.0',
    version: releaseVersion,
    packageVersion: releaseVersion,
    config: { port: 8188 },
    stateCache,
    _nwShuttingDown: false,
    log: { warn() {}, error() {}, debug() {} },
    subscribeForeignStatesAsync: async () => undefined,
    setObjectNotExistsAsync: async () => undefined,
    getStateAsync: async (id) => {
      readStarts.set(id, (readStarts.get(id) || 0) + 1);
      if (id === hangReadId) return never;
      return { val: stateCache[id]?.value ?? null, ts: stateCache[id]?.ts ?? Date.now() };
    },
    setStateAsync: async (id, payload) => {
      writeStarts.set(id, (writeStarts.get(id) || 0) + 1);
      if (id === hangWriteId) return never;
      writes.push([id, payload]);
      stateCache[id] = { value: payload.val, ts: Date.now() };
      return undefined;
    },
    updateValue: (id, value, ts) => { stateCache[id] = { value, ts }; },
    _nwSetInterval: () => ({ fake: true }),
    _nwClearInterval: () => undefined,
  };
  return { adapter, stateCache, writes, readStarts, writeStarts };
}

async function main() {
  const readCase = createPublisherMock({ hangReadId: 'chargingManagement.audit.snapshotJson' });
  const readPublisher = new AdminOverviewPublisher(readCase.adapter, {
    intervalMs: 1_000,
    readTimeoutMs: 25,
    writeTimeoutMs: 25,
    objectTimeoutMs: 50,
    ioConcurrency: 8,
    tickFreshThresholdMs: 30_000,
  });
  const readStart = Date.now();
  await readPublisher.initialize();
  assert(Date.now() - readStart < 1_500, 'hanging diagnostic read must not block initialization');
  await readPublisher.tick('rc89-read-retry');
  readPublisher.stop();
  assert.equal(readCase.readStarts.get('chargingManagement.audit.snapshotJson'), 1,
    'same unresolved read must be quarantined instead of duplicated each cycle');
  assert(readCase.writes.some(([id]) => id === 'info.adminOverview.updatedAt'),
    'lightweight publisher heartbeat must continue despite a delayed read');
  const readSummary = readCase.writes.filter(([id]) => id === 'info.adminOverview.summaryJson').at(-1);
  assert(readSummary, 'summary must still be published from the bounded state cache');
  const parsedReadSummary = JSON.parse(readSummary[1].val);
  assert.equal(parsedReadSummary.adapter.online, true);
  assert.notEqual(parsedReadSummary.headline, 'NexoWatt UI ist offline');

  const endOnlyCase = createPublisherMock();
  delete endOnlyCase.stateCache['ems.core.lastTickStart'];
  endOnlyCase.stateCache['ems.core.lastTickEnd'] = { value: Date.now(), ts: Date.now() };
  const endOnlyPublisher = new AdminOverviewPublisher(endOnlyCase.adapter, {
    intervalMs: 1_000,
    readTimeoutMs: 25,
    writeTimeoutMs: 25,
    objectTimeoutMs: 50,
    ioConcurrency: 8,
  });
  await endOnlyPublisher.initialize();
  endOnlyPublisher.stop();
  const endOnlyFreshWrite = endOnlyCase.writes
    .filter(([id]) => id === 'info.adminOverview.emsTickFresh')
    .at(-1);
  assert(endOnlyFreshWrite, 'health states must be published when only lastTickEnd is available');
  assert.equal(endOnlyFreshWrite[1].val, true,
    'lastTickEnd must keep the EMS tick health fresh when lastTickStart is not mirrored');

  const writeCase = createPublisherMock({ hangWriteId: 'info.adminOverview.summaryJson' });
  const writePublisher = new AdminOverviewPublisher(writeCase.adapter, {
    intervalMs: 1_000,
    readTimeoutMs: 25,
    writeTimeoutMs: 25,
    objectTimeoutMs: 50,
    ioConcurrency: 8,
  });
  const writeStart = Date.now();
  await writePublisher.initialize();
  await writePublisher.tick('rc89-write-retry');
  writePublisher.stop();
  assert(Date.now() - writeStart < 1_500, 'hanging summary write must not leave the publisher lock set');
  assert.equal(writeCase.writeStarts.get('info.adminOverview.summaryJson'), 1,
    'same unresolved summary write must not be started repeatedly');
  assert(writeCase.writes.filter(([id]) => id === 'info.adminOverview.updatedAt').length >= 2,
    'publisher heartbeat must remain refreshable when the full summary write is delayed');

  // The npm package intentionally excludes `src-ts`. Verify the generated
  // runtime unconditionally and, in a full repository checkout, verify the
  // canonical TypeScript source as an additional maintainability contract.
  const runtimeSource = fs.readFileSync(path.join(root, 'ems/services/admin-overview-publisher.js'), 'utf8');
  const canonicalPath = path.join(root, 'src-ts/runtime-executables/ems/services/admin-overview-publisher.ts');
  const sources = [runtimeSource];
  if (fs.existsSync(canonicalPath)) sources.push(fs.readFileSync(canonicalPath, 'utf8'));
  for (const source of sources) {
    assert(source.includes('Independent liveness heartbeat') || source.includes('Independent compatibility heartbeat'));
    assert(source.includes('adapter online'));
    assert(source.includes('read-only overview forever'));
    assert(!source.includes('const emsOnline ='));
    assert(!source.includes('lastTickAgeMs <= 20_000'));
  }

  const pkg = require(path.join(root, 'package.json'));
  const io = require(path.join(root, 'io-package.json'));
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
  assert.equal(io.common.version, pkg.version);
  console.log('[RC89] Adapter-, EMS-Tick- und Diagnose-Publisher-Status getrennt; I/O-Timeouts und Heartbeat-Recovery bestanden.');
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
