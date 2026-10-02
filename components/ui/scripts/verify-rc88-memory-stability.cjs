#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');

const root = path.resolve(__dirname, '..');
const { SseRuntimeGuard } = require(path.join(root, 'lib/sse-runtime-guard.js'));
const hardening = require(path.join(root, 'ems/rc85-runtime-hardening.js'));

class FakeRequest extends EventEmitter {
  constructor() {
    super();
    this.destroyed = false;
    this.aborted = false;
    this.socket = new FakeSocket();
  }
}

class FakeSocket extends EventEmitter {
  constructor() {
    super();
    this.destroyed = false;
    this.writableLength = 0;
  }
  setKeepAlive() {}
  setNoDelay() {}
  destroy() {
    this.destroyed = true;
    this.emit('close');
  }
}

class FakeResponse extends EventEmitter {
  constructor(req) {
    super();
    this.socket = req.socket;
    this.destroyed = false;
    this.writableEnded = false;
    this.writableLength = 0;
    this.blocked = false;
    this.writes = [];
    this.timeoutMs = null;
  }
  setTimeout(ms) { this.timeoutMs = ms; }
  write(chunk) {
    if (this.destroyed || this.writableEnded) throw new Error('closed');
    const text = String(chunk);
    this.writes.push(text);
    if (this.blocked) {
      this.writableLength += Buffer.byteLength(text);
      this.socket.writableLength = this.writableLength;
      return false;
    }
    return true;
  }
  drain() {
    this.blocked = false;
    this.writableLength = 0;
    this.socket.writableLength = 0;
    this.emit('drain');
  }
  end() {
    this.writableEnded = true;
  }
}

async function testSseBackpressure() {
  let snapshotCount = 0;
  const logs = [];
  const guard = new SseRuntimeGuard({
    log: { warn: (message) => logs.push(message) },
    maxClients: 8,
    maxBufferedBytes: 512 * 1024,
    backpressureTimeoutMs: 1000,
    heartbeatMs: 60_000,
    getSnapshotChunk: () => {
      snapshotCount += 1;
      return `data: ${JSON.stringify({ type: 'init', payload: { resync: snapshotCount } })}\n\n`;
    },
  });

  const req = new FakeRequest();
  const res = new FakeResponse(req);
  const client = guard.addClient({ req, res, internal: false });
  assert(client, 'SSE client must be accepted');
  assert.equal(res.timeoutMs, 0, 'SSE response timeout must be disabled');

  res.blocked = true;
  assert.equal(guard.write(client, 'data: first\n\n', { kind: 'update' }), false);
  assert.equal(res.writes.length, 1, 'first blocked write is the only buffered frame');

  const heapBeforeStress = process.memoryUsage().heapUsed;
  const repeatedFrame = 'data: repeated-update\n\n';
  for (let i = 0; i < 1_000_000; i += 1) {
    guard.write(client, repeatedFrame, { kind: 'update' });
  }
  if (typeof global.gc === 'function') global.gc();
  const heapAfterStress = process.memoryUsage().heapUsed;
  const retainedStressBytes = Math.max(0, heapAfterStress - heapBeforeStress);
  assert.equal(res.writes.length, 1, 'backpressured client must not receive additional buffered writes');
  assert.equal(guard.getStats().droppedUpdates, 1_000_000, 'coalesced updates must be counted without buffering');
  if (typeof global.gc === 'function') {
    assert(retainedStressBytes < 16 * 1024 * 1024, `blocked SSE writes retained too much heap: ${retainedStressBytes}`);
  }
  assert.equal(guard.getStats().backpressured, 1);

  const baseListenerRows = client.listeners.length;
  res.drain();
  assert.equal(snapshotCount, 1, 'client must receive one full resync after drain');
  assert.equal(res.writes.length, 2, 'drain must produce exactly one resync frame');
  assert(client.listeners.length <= baseListenerRows, 'fired drain listeners must not accumulate in bookkeeping');

  // Repeated short backpressure cycles must keep the listener registry bounded.
  for (let i = 0; i < 100; i += 1) {
    res.blocked = true;
    guard.write(client, `data: cycle-${i}\n\n`, { kind: 'update' });
    res.drain();
  }
  assert(client.listeners.length < 16, `SSE listener rows leaked: ${client.listeners.length}`);

  // A client that never drains is closed instead of retaining data forever.
  res.blocked = true;
  guard.write(client, 'data: stuck\n\n', { kind: 'update' });
  client.backpressuredAt = Date.now() - 2000;
  guard.write(client, 'data: still-stuck\n\n', { kind: 'update' });
  assert.equal(guard.getStats().clients, 0, 'stuck SSE client must be removed');

  // A response/socket buffer above the configured hard ceiling is closed before
  // another frame is admitted.
  const bufferReq = new FakeRequest();
  const bufferRes = new FakeResponse(bufferReq);
  const bufferClient = guard.addClient({ req: bufferReq, res: bufferRes, internal: false });
  bufferRes.writableLength = 600 * 1024;
  bufferRes.socket.writableLength = bufferRes.writableLength;
  assert.equal(guard.write(bufferClient, 'data: over-buffer-limit\n\n', { kind: 'update' }), false);
  assert.equal(bufferClient.closed, true, 'client above the writable-buffer ceiling must be closed');
  assert(guard.getStats().closedBufferLimit >= 1);
  guard.closeAll('test-finished');

  // A realistic full-state initialization can be larger than Node's normal
  // high-water mark. It may enter backpressure, but must stay connected long
  // enough to drain instead of being rejected by an unrealistically small cap.
  const largeGuard = new SseRuntimeGuard({ heartbeatMs: 60_000 });
  const largeReq = new FakeRequest();
  const largeRes = new FakeResponse(largeReq);
  const largeClient = largeGuard.addClient({ req: largeReq, res: largeRes, internal: true });
  largeRes.blocked = true;
  const largeInitialFrame = `data: ${'x'.repeat(1024 * 1024)}\n\n`;
  assert.equal(largeGuard.write(largeClient, largeInitialFrame, { kind: 'init' }), false);
  assert.equal(largeClient.closed, false, '1 MiB initial snapshot must be allowed to drain');
  assert.equal(largeGuard.mitigatePressure('pressure'), 0,
    'normal heap pressure must not close a fresh initialization snapshot');
  assert.equal(largeGuard.getStats().clients, 1);
  assert.equal(largeGuard.getStats().pressureCooldownMs, 0,
    'normal heap pressure must not block EventSource reconnects');
  largeRes.drain();
  largeGuard.closeAll('test-finished');

  // Small ordinary socket buffers are normal and must not be interpreted as a
  // blocked browser. The former > 0 byte check closed healthy clients here.
  const healthyGuard = new SseRuntimeGuard({ heartbeatMs: 60_000 });
  const healthyReq = new FakeRequest();
  const healthyRes = new FakeResponse(healthyReq);
  const healthyClient = healthyGuard.addClient({ req: healthyReq, res: healthyRes });
  healthyRes.writableLength = 32 * 1024;
  healthyRes.socket.writableLength = healthyRes.writableLength;
  assert.equal(healthyGuard.mitigatePressure('pressure'), 0);
  assert.equal(healthyClient.closed, false, '32 KiB writable buffer must remain connected');
  assert.equal(healthyGuard.getStats().pressureCooldownMs, 0);
  healthyGuard.closeAll('test-finished');

  // A genuinely blocked update client is still removed, but another browser
  // may reconnect immediately because normal pressure has no global cooldown.
  const blockedGuard = new SseRuntimeGuard({ heartbeatMs: 60_000 });
  const blockedReq = new FakeRequest();
  const blockedRes = new FakeResponse(blockedReq);
  const blockedClient = blockedGuard.addClient({ req: blockedReq, res: blockedRes });
  blockedRes.blocked = true;
  assert.equal(blockedGuard.write(blockedClient, 'data: blocked-update\n\n', { kind: 'update' }), false);
  assert.equal(blockedGuard.mitigatePressure('pressure'), 1);
  assert.equal(blockedClient.closed, true);
  assert.equal(blockedGuard.getStats().pressureCooldownMs, 0);
  const replacementReq = new FakeRequest();
  const replacementRes = new FakeResponse(replacementReq);
  assert(blockedGuard.addClient({ req: replacementReq, res: replacementRes }),
    'normal pressure must permit immediate SSE recovery');
  blockedGuard.closeAll('test-finished');

  // Client count is a hard bound. An old half-open connection is destroyed
  // instead of letting reconnecting browsers grow the live-client set forever.
  const bounded = new SseRuntimeGuard({ maxClients: 2, heartbeatMs: 60_000 });
  const pairs = Array.from({ length: 3 }, () => {
    const request = new FakeRequest();
    const response = new FakeResponse(request);
    return { request, response, client: bounded.addClient({ req: request, res: response }) };
  });
  assert.equal(bounded.getStats().clients, 2);
  assert.equal(pairs[0].response.socket.destroyed, true, 'oldest SSE socket must be destroyed at the client cap');
  bounded.mitigatePressure('critical');
  const pressureReq = new FakeRequest();
  const pressureRes = new FakeResponse(pressureReq);
  assert.equal(bounded.addClient({ req: pressureReq, res: pressureRes }), null, 'SSE reconnects must be rejected during critical pressure cooldown');
  const criticalCooldownMs = bounded.getStats().pressureCooldownMs;
  assert(criticalCooldownMs > 0 && criticalCooldownMs <= 10_000,
    `critical reconnect cooldown must stay within 10 seconds, got ${criticalCooldownMs}`);
  bounded.closeAll('test-finished');
}

function testHeapPressureClassification() {
  assert.equal(typeof hardening.rc88ClassifyHeapPressure, 'function', 'heap classifier export missing');
  const fieldSample = hardening.rc88ClassifyHeapPressure({
    ratio: 0.111,
    growthBytes: 141 * 1048576,
    warnRatio: 0.65,
    pressureRatio: 0.75,
    restartRatio: 0.86,
    emergencyRatio: 0.92,
  });
  assert.equal(fieldSample.fastGrowth, true, 'field sample must retain rapid growth as telemetry');
  assert.equal(fieldSample.warn, false, '11.1% heap must not emit a memory warning');
  assert.equal(fieldSample.pressure, false, '11.1% heap must not close SSE clients');
  assert.equal(fieldSample.restart, false);
  assert.equal(fieldSample.emergency, false);

  const realPressure = hardening.rc88ClassifyHeapPressure({
    ratio: 0.76,
    growthBytes: 0,
    warnRatio: 0.65,
    pressureRatio: 0.75,
    restartRatio: 0.86,
    emergencyRatio: 0.92,
  });
  assert.equal(realPressure.fastGrowth, false);
  assert.equal(realPressure.warn, true);
  assert.equal(realPressure.pressure, true);
  assert.equal(realPressure.restart, false);
}

async function testWatchdogDeduplication() {
  const baseline = hardening.rc88RuntimeHardeningSnapshot();
  const silentLog = { warn() {}, error() {} };
  const never = () => new Promise(() => {});

  const keepAlive = setInterval(() => {}, 1000);
  const first = await hardening.rc85RunIsolatedResult('rc88-test-hung', 20, never, silentLog);
  clearInterval(keepAlive);
  assert.equal(first.ok, false);
  assert.equal(first.timedOut, true);

  for (let i = 0; i < 10_000; i += 1) {
    const duplicate = await hardening.rc85RunIsolatedResult('rc88-test-hung', 20, never, silentLog);
    assert.equal(duplicate.skipped, true);
  }

  const snapshot = hardening.rc88RuntimeHardeningSnapshot();
  assert.equal(snapshot.active, baseline.active + 1, 'one unresolved label must retain exactly one operation');
  assert.equal(snapshot.started, baseline.started + 1, 'duplicate calls must not start new orphan promises');
  assert(snapshot.skippedInFlight >= baseline.skippedInFlight + 10_000);
  assert(snapshot.labels.includes('rc88-test-hung'));
  hardening.rc88ClearRuntimeHardening();

  // A late-settling operation is released only when the original Promise really
  // settles, not merely because the timeout elapsed.
  let release;
  const delayed = new Promise((resolve) => { release = resolve; });
  const lateKeepAlive = setInterval(() => {}, 1000);
  const late = await hardening.rc85RunIsolatedResult('rc88-test-late-settle', 20, () => delayed, silentLog);
  clearInterval(lateKeepAlive);
  assert.equal(late.timedOut, true);
  assert.equal(hardening.rc88RuntimeHardeningSnapshot().active, 1);
  release(true);
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(hardening.rc88RuntimeHardeningSnapshot().active, 0, 'settled quarantined operation must be released');
  hardening.rc88ClearRuntimeHardening();
}

async function main() {
  await testSseBackpressure();
  testHeapPressureClassification();
  await testWatchdogDeduplication();

  // Repository checks prefer the canonical TS sources. The same test is also
  // shipped in the npm package, where only generated runtime JS is present.
  const readSourceOrRuntime = (sourceRel, runtimeRel) => {
    const source = path.join(root, sourceRel);
    const runtime = path.join(root, runtimeRel);
    return fs.readFileSync(fs.existsSync(source) ? source : runtime, 'utf8');
  };
  const mainTs = readSourceOrRuntime('src-ts/runtime-executables/main.ts', 'main.js');
  const hardeningTs = readSourceOrRuntime('src-ts/runtime-executables/ems/rc85-runtime-hardening.ts', 'ems/rc85-runtime-hardening.js');
  const sseTs = readSourceOrRuntime('src-ts/runtime-executables/lib/sse-runtime-guard.ts', 'lib/sse-runtime-guard.js');
  const managerTs = readSourceOrRuntime('src-ts/runtime-executables/ems/module-manager.ts', 'ems/module-manager.js');
  const engineTs = readSourceOrRuntime('src-ts/runtime-executables/ems/engine.ts', 'ems/engine.js');
  const mainRuntime = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  const managerRuntime = fs.readFileSync(path.join(root, 'ems/module-manager.js'), 'utf8');
  assert(fs.existsSync(path.join(root, 'lib/sse-runtime-guard.js')), 'generated SSE guard runtime missing');
  assert(mainTs.includes('RC88_SSE_BACKPRESSURE_GUARD'));
  assert(mainTs.includes("this._nwSseGuard.broadcast({ internalChunk, publicChunk })"));
  assert(!mainTs.includes('client.res.write("data: " + JSON.stringify({ type: \'update\''), 'legacy unbounded SSE update loop remains');
  assert(hardeningTs.includes('RC88_NO_DUPLICATE_HUNG_WORK'));
  assert(hardeningTs.includes('RC88_LIGHTWEIGHT_QUARANTINE'));
  assert(!hardeningTs.includes('promise: Promise<unknown>'), 'watchdog map must not strongly retain unresolved Promise chains');
  assert(hardeningTs.includes('controlled adapter restart requested before V8 OOM'));
  assert(hardeningTs.includes('rc88ClassifyHeapPressure'));
  assert(hardeningTs.includes('[memory-guard]'));
  assert(!hardeningTs.includes('ratio >= warnRatio || fastGrowth'), 'rapid growth must not trigger warnings by itself');
  assert(!hardeningTs.includes('ratio >= pressureRatio || fastGrowth'), 'rapid growth must not trigger pressure mitigation by itself');
  assert(!hardeningTs.includes('[RC88 heap]'), 'legacy RC warning prefix must not remain in operational logs');
  assert(sseTs.includes('freshSnapshotBackpressure'));
  assert(sseTs.includes('criticalReconnectCooldownMs'));
  assert(sseTs.includes('[sse-guard]'));
  assert(!sseTs.includes("Date.now() + (closeAll ? 60_000 : 30_000)"), 'legacy 30/60 second reconnect lockout remains');
  assert(hardeningTs.includes('process.exit(11)'), 'controlled restart must use the ioBroker adapter termination code');
  assert(managerTs.includes('RC88_MEMORY_GUARD'));
  assert(!engineTs.includes('startRc85HeapMonitor(console)'), 'heap monitor must start only after the real adapter is available');

  const pkg = require(path.join(root, 'package.json'));
  const io = require(path.join(root, 'io-package.json'));
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
  assert.equal(io.common.version, pkg.version);
  console.log('[RC88/1.0.1] SSE backpressure, healthy-client retention, 10-second critical recovery and ratio-based heap guard passed');
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
