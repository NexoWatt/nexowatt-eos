'use strict';
// UI-MESH-PERF-20261001: deterministic safety equivalence and attempt diagnostics.
// No network/device writes. The separate legacy workload keeps real HTTP + fsync.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const C = require('../lib/mesh-coordinator-contract');
const { MeshMasterProtocol, MeshSlaveLease } = require('../lib/mesh-coordinator-protocol');
const { MeshCoordinator } = require('../lib/mesh-coordinator');
const baselinePlan = require('./fixtures/mesh-plan-c211f1a.cjs');
const sample = () => ({ quality: 'ok', ageMs: 0, gridW: 0, phaseA: [0, 0, 0], devicesHealthy: true, controlledW: { ...C.ZERO } });
function config(strategy = 'fixed', count = 5) {
  const c = C.defaultConfig();
  Object.assign(c, { role: 'master', mode: 'active', siteId: 'site', nodeId: 'master', masterId: 'master', intervalMs: 250, requestTimeoutMs: 200 });
  c.allocation.strategy = strategy;
  c.site.limit = { importW: count * 500, exportW: count * 500, l1A: count * 5, l2A: count * 5, l3A: count * 5 };
  c.nodes = Array.from({ length: count }, (_, i) => ({ id: `peer_${i}`, max: Object.fromEntries(C.LIMIT_KEYS.map(k => [k, k.endsWith('A') ? 10 : 1000])), fallback: Object.fromEntries(C.LIMIT_KEYS.map(k => [k, k.endsWith('A') ? .001 : .3])), weight: 1, commissioned: true, watchdogVerified: true }));
  return C.validateConfig(c);
}
function slaveConfig(c, local) { return C.validateConfig({ ...C.clone(c), role: 'slave', nodeId: local.id, local, feedback: Object.fromEntries(['evW', 'chargeW', 'dischargeW', 'pvW', 'flexW'].map(k => [k, 'fixture.' + k])), masterUrl: 'http://127.0.0.1' }); }
function projection(m) { return { state: m.state, reason: m.reason, lastPlan: m.lastPlan, records: [...m.records.values()].map(r => ({ id: r.member.id, target: r.target, reserved: r.reserved, confirmed: r.confirmed, stableCycles: r.stableCycles, commandSeq: r.commandSeq, lastChange: Math.max(r.lastChange, m.lastDegradedAt ?? -Infinity), command: r.lastCommand ? { limits: r.lastCommand.limits, state: r.lastCommand.state, active: r.lastCommand.active, commandSeq: r.lastCommand.commandSeq, leaseMs: r.lastCommand.leaseMs } : null })) }; }
for (const strategy of ['fixed', 'transformer'])
  test(`differential ${strategy}: fallback/recovery/hello/missing peer/199-200ms remain equivalent`, () => {
    let clock = 0;
    const c = config(strategy);
    const current = new MeshMasterProtocol(C.clone(c), () => clock), reference = new MeshMasterProtocol(C.clone(c), () => clock);
    reference.plan = baselinePlan;
    const systems = [current, reference].map(master => ({ master, slaves: c.nodes.map(n => new MeshSlaveLease(slaveConfig(c, n), () => clock)) }));
    const equal = label => assert.deepEqual(projection(current), projection(reference), label);
    for (const s of systems)
      for (const slave of s.slaves)
        slave.acceptHello(s.master.hello(slave.hello()));
    equal('hello');
    let normal = 0;
    function round({ skip = -1, ack = true, site = sample() } = {}) { for (let i = 0; i < c.nodes.length; i++) {
      if (i === skip)
        continue;
      for (const s of systems) {
        const slave = s.slaves[i];
        slave.accept(s.master.exchange(slave.request(sample(), ack ? slave.command?.commandSeq || 0 : 0, 2), site));
      }
      equal('request ' + i);
    } if (current.state === 'NORMAL')
      normal++; clock += 250; }
    for (let i = 0; i < 22; i++)
      round();
    assert.equal(current.state, 'NORMAL');
    assert([...current.records.values()].some(r => r.target.importW > c.nodes[0].fallback.importW));
    clock = current.lastPlan + 199;
    for (const s of systems)
      s.master.plan(sample());
    equal('199ms no replan');
    const last = current.lastPlan;
    clock = last + 200;
    for (const s of systems)
      s.master.plan(sample());
    equal('200ms plan');
    assert.equal(current.lastPlan, clock);
    for (const s of systems)
      s.master.plan({ quality: 'missing' });
    equal('immediate meter loss');
    for (let i = 0; i < 40; i++) {
      clock += 1000;
      for (const s of systems)
        s.master.plan({ quality: 'missing' });
      equal('long degraded phase');
    }
    for (let i = 0; i < 22; i++)
      round();
    assert.equal(current.state, 'NORMAL');
    // A new hello must not discard the proof that raised targets still need clamp.
    for (const s of systems) {
      s.slaves[0] = new MeshSlaveLease(slaveConfig(c, c.nodes[0]), () => clock);
      s.slaves[0].acceptHello(s.master.hello(s.slaves[0].hello()));
    }
    equal('new boot');
    round();
    assert.equal(current.state, 'SITE_DEGRADED');
    for (let i = 0; i < 22; i++)
      round();
    for (let i = 0; i < 12; i++)
      round({ skip: 0 });
    assert.equal(current.state, 'SITE_DEGRADED');
    for (let i = 0; i < 22; i++)
      round({ ack: false });
    for (let i = 0; i < 22; i++)
      round();
    for (const s of systems) {
      s.master.operatorLimits = { importW: 100, exportW: 100 };
      s.master.lastPlan = -Infinity;
      s.master.plan(sample());
    }
    equal('operating cap reduction');
    // Explicit fixture state models a rounded target below its fractional fallback.
    for (const s of systems) {
      s.master.records.get('peer_0').target.importW = .1;
      s.master.targetsAtFallback = false;
      s.master.plan({ quality: 'missing' });
    }
    equal('fallback cannot raise rounded value');
    assert.equal(current.records.get('peer_0').target.importW, .1);
    assert(normal > 10, 'both strategies actually exercised NORMAL, not only safe fallback');
  });
test('idle degraded target inspections are independent of repeated messages; budgets remain reserved', () => {
  const c = config('fixed', 99);
  let clock = 0;
  function measured(plan) { const m = new MeshMasterProtocol(C.clone(c), () => clock); if (plan)
    m.plan = plan; let reads = 0; for (const r of m.records.values()) {
    const target = r.target;
    r.target = new Proxy(target, { get(o, k) { if (C.LIMIT_KEYS.includes(k))
        reads++; return o[k]; } });
  } const before = [...m.records.values()].map(r => C.clone(r.reserved)); for (let i = 0; i < 1000; i++) {
    clock++;
    m.plan(sample());
  } assert.deepEqual([...m.records.values()].map(r => r.reserved), before); return reads; }
  const oldReads = measured(baselinePlan), newReads = measured();
  assert.equal(oldReads, 99 * 10 * 1000);
  assert.equal(newReads, 0);
});
function harness() {
  let clock = 0, delay = 20, failure = '';
  const c = config('fixed', 1), master = new MeshMasterProtocol(c, () => clock), key = crypto.randomBytes(32).toString('base64url');
  const a = { namespace: 'fixture.0', config: { emsApps: { apps: { meshMicrogrid: { installed: true, enabled: true } } } }, emsEngine: { requestImmediateTick() { } } };
  const sc = new MeshCoordinator(a, { now: () => clock, sample, transport: async (_origin, packet) => { const req = packet.payload; const answer = req.kind === 'hello' ? master.hello(req) : master.exchange(req, sample()); clock += delay; if (failure === 'transport')
      throw new Error('master_timeout'); const signed = C.sign(answer, key); if (failure === 'signature')
      signed.signature = '0'.repeat(64); return signed; } });
  sc.config = slaveConfig(c, c.nodes[0]);
  sc.initialized = true;
  sc.slaveKey = key;
  sc.resetProtocols();
  return { sc, setDelay: n => delay = n, setFailure: f => failure = f, tick: n => clock += n };
}
test('current failed duration is reported independently of the previous successful RTT', async () => { const h = harness(); try {
  await h.sc.cycle();
  await h.sc.cycle();
  assert.equal(h.sc.latencies.at(-1), 20);
  h.setDelay(201);
  await h.sc.cycle();
  assert.equal(h.sc.error, 'stale_or_invalid_lease');
  assert.equal(h.sc.currentLimits().valid, false);
  assert.equal(h.sc.latencies.at(-1), 20);
  assert.deepEqual(h.sc.lastAttempt, { kind: 'exchange', durationMs: 201, timeoutMs: 200, outcome: 'rejected', phase: 'lease' });
}
finally {
  h.sc.stop();
} });
test('200ms accepted, 201ms rejected; receipt never restarts the 3000ms lease', async () => { const h = harness(); try {
  await h.sc.cycle();
  h.setDelay(200);
  await h.sc.cycle();
  assert.equal(h.sc.lastAttempt.outcome, 'accepted');
  assert.equal(h.sc.currentLimits().remainingMs, 2800);
  h.tick(2800);
  assert.equal(h.sc.currentLimits().valid, false);
  h.setDelay(201);
  await h.sc.cycle();
  assert.equal(h.sc.lastAttempt.outcome, 'rejected');
  assert.equal(h.sc.currentLimits().valid, false);
}
finally {
  h.sc.stop();
} });
for (const [failure, phase] of [['transport', 'transport'], ['signature', 'signature']])
  test(`bounded current attempt identifies ${phase} rejection and retains failsafe`, async () => { const h = harness(); try {
    await h.sc.cycle();
    h.setFailure(failure);
    h.setDelay(201);
    await h.sc.cycle();
    assert.equal(h.sc.lastAttempt.durationMs, 201);
    assert.equal(h.sc.lastAttempt.phase, phase);
    assert.equal(h.sc.lastAttempt.outcome, 'rejected');
    assert.equal(h.sc.currentLimits().valid, false);
    assert.equal(Object.keys(h.sc.lastAttempt).length, 5);
    h.sc.resetProtocols();
    assert.equal(h.sc.lastAttempt, null);
  }
  finally {
    h.sc.stop();
  } });

test('late HELLO has current attempt evidence and cannot establish a session', async () => {
  const h = harness();
  try {
    h.setDelay(201);
    await h.sc.cycle();
    assert.equal(h.sc.error, 'invalid_handshake');
    assert.equal(h.sc.currentLimits().valid, false);
    assert.deepEqual(h.sc.lastAttempt, { kind: 'hello', durationMs: 201, timeoutMs: 200, outcome: 'rejected', phase: 'lease' });
  } finally { h.sc.stop(); }
});

test('protocol reset during pending transport cannot restore stale attempt or lease', async () => {
  const h = harness();
  const transport = h.sc.options.transport;
  let release;
  h.sc.options.transport = async (...args) => {
    const packet = await transport(...args);
    await new Promise(resolve => { release = resolve; });
    return packet;
  };
  const pending = h.sc.cycle();
  try {
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.sc.lastAttempt.outcome, 'pending');
    h.sc.resetProtocols();
    release();
    await pending;
    assert.equal(h.sc.lastAttempt, null);
    assert.equal(h.sc.currentLimits().valid, false);
    assert.equal(h.sc.failedRequests, 0);
  } finally { release?.(); await pending; h.sc.stop(); }
});
