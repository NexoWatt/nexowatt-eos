'use strict';
// Bounded CPU comparison for UI-MESH-PERF-20261001. No network/device writes.
// Wall time is reported, not used as a flaky pass/fail threshold. Deterministic
// operation-count and safety-equivalence assertions live in eos-mesh-timing.test.
const { performance } = require('node:perf_hooks');
const C = require('../lib/mesh-coordinator-contract');
const { MeshMasterProtocol } = require('../lib/mesh-coordinator-protocol');
const baselinePlan = require('../test/fixtures/mesh-plan-c211f1a.cjs');
const c = C.defaultConfig();
Object.assign(c, { role: 'master', mode: 'active', siteId: 'fixture', nodeId: 'master', masterId: 'master' });
c.nodes = Array.from({ length: 99 }, (_, i) => ({ id: `peer_${i}`, max: { ...C.ZERO }, fallback: { ...C.ZERO }, weight: 1, commissioned: true, watchdogVerified: true }));
const config = C.validateConfig(c);
const sample = { quality: 'ok', ageMs: 0, gridW: 0, phaseA: [0, 0, 0], devicesHealthy: true, controlledW: { ...C.ZERO } };
function run(label, reference) {
  let clock = 0;
  const master = new MeshMasterProtocol(config, () => clock);
  if (reference) master.plan = baselinePlan;
  for (let i = 0; i < 100; i++) { clock++; master.plan(sample); }
  const cpu = process.cpuUsage(); const started = performance.now();
  for (let i = 0; i < 5000; i++) { clock++; master.plan(sample); }
  const durationMs = performance.now() - started; const used = process.cpuUsage(cpu);
  return { label, calls: 5000, peers: 99, durationMs, cpuUserMs: used.user / 1000, cpuSystemMs: used.system / 1000, state: master.state };
}
const rows = [];
for (let i = 0; i < 3; i++) { rows.push(run('baseline-c211f1a', true)); rows.push(run('current', false)); }
console.log(JSON.stringify({ schemaVersion: 1, benchmark: 'degraded-plan-only', node: process.version, platform: process.platform, arch: process.arch, hardwareEvidence: false, rows }, null, 2));
