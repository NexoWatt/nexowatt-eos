'use strict';
// Isolated Admin read boundary: no actual package install, systemd or Pi execution.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const real = require('../src/lib/eosOsUpdateStatus');
function statusFixture(now = Date.now()) {
  const stamp = new Date(now).toISOString();
  return { schemaVersion: 1, generatedAt: stamp, state: 'ok', lastAttemptAt: stamp, lastSuccessAt: stamp, lastError: null,
    freshness: { maxAgeSeconds: 129600 }, policy: { automatic: true, rebootAutomatic: false, debianMajor: '13', serviceRestartsPossible: true },
    timers: { enabled: true, active: true, checkedAt: stamp }, pending: { securityCount: 0, heldSecurityCount: 0, blockedSecurityCount: 0 },
    activation: { state: 'not-required', serviceRestartCount: 0, sessionRestartCount: 0 }, reboot: { state: 'not-required' },
    coverage: { state: 'complete-for-configured-origins', gaps: [] } };
}
test('OS-Admin: healthy typed summary excludes raw packages, errors, paths and vendor text', () => {
  const input = statusFixture(); input.pending.packages = [{ name: 'private-data' }]; input.sbom = { path: '/private' }; input.policy.origins = ['private'];
  const output = real.sanitizeStatus(input);
  assert.equal(output.health, 'ok'); assert.equal(output.availability, 'available');
  assert.doesNotMatch(JSON.stringify(output), /private|"packages"|"origins"|"sbom"/);
});
for (const [name, change] of [
  ['unknown-version', s => { s.schemaVersion = 2; }], ['negative-count', s => { s.pending.securityCount = -1; }],
  ['string-count', s => { s.pending.securityCount = '0'; }], ['boolean-string', s => { s.timers.enabled = 'true'; }],
  ['bad-date', s => { s.generatedAt = '2026-02-30T12:00:00Z'; }], ['unknown-error', s => { s.lastError = { code: '<script>', message: 'private' }; }],
  ['freshness-relaxed', s => { s.freshness.maxAgeSeconds = 999999; }], ['unexpected-reboot-policy', s => { s.policy.rebootAutomatic = true; }],
]) test('OS-Admin rejects ' + name, () => { const data = statusFixture(); change(data); assert.equal(real.sanitizeStatus(data).availability, 'invalid'); });
for (const [name, change] of [
  ['pending', s => { s.pending.securityCount = 1; }], ['held', s => { s.pending.heldSecurityCount = 1; }],
  ['blocked', s => { s.pending.blockedSecurityCount = 1; }], ['pending-unknown', s => { s.pending.securityCount = null; }],
  ['timer-disabled', s => { s.timers.enabled = false; }], ['timer-inactive', s => { s.timers.active = false; }],
  ['timer-unknown', s => { s.timers.enabled = null; }], ['policy-disabled', s => { s.policy.automatic = false; }],
  ['activation-required', s => { s.activation.state = 'required'; }], ['activation-unknown', s => { s.activation.state = 'unknown'; }],
  ['activation-count-unknown', s => { s.activation.serviceRestartCount = null; }],
  ['reboot-required', s => { s.reboot.state = 'required'; }], ['reboot-unknown', s => { s.reboot.state = 'unknown'; }],
  ['coverage-gap', s => { s.coverage.gaps = ['unknown-source']; }], ['coverage-unknown', s => { s.coverage.state = 'unknown'; }],
  ['never-run', s => { s.state = 'never-run'; s.lastSuccessAt = null; }], ['running', s => { s.state = 'running'; }],
  ['error', s => { s.state = 'error'; s.lastError = { code: 'upgrade-failed', message: 'private details' }; }],
  ['disabled', s => { s.state = 'disabled'; }],
]) test('OS-Admin never reports healthy for ' + name, () => { const data = statusFixture(); change(data); assert.equal(real.sanitizeStatus(data).health, 'warning'); });
test('OS-Admin stale, future and stale timer observations cannot remain healthy', () => {
  const now = Date.now();
  assert.equal(real.sanitizeStatus(statusFixture(now - 129601000), now).availability, 'stale');
  assert.equal(real.sanitizeStatus(statusFixture(now + 300001), now).availability, 'future');
  const data = statusFixture(now); data.timers.checkedAt = new Date(now - 129601000).toISOString();
  assert.equal(real.sanitizeStatus(data, now).availability, 'stale');
});
test('OS-Admin installer initial status and early host errors remain explicit', () => {
  const initial = statusFixture(); initial.state = 'never-run'; initial.generatedAt = null; initial.lastAttemptAt = null;
  initial.lastSuccessAt = null; initial.policy.debianMajor = null; initial.timers = { enabled: null, active: null, checkedAt: null };
  assert.equal(real.sanitizeStatus(initial).summary.state, 'never-run');
  const early = statusFixture(); early.policy.debianMajor = null; early.state = 'error'; early.lastError = { code: 'prerequisite-missing' };
  assert.equal(real.sanitizeStatus(early).summary.errorCode, 'prerequisite-missing');
  assert.equal(real.sanitizeStatus(early).health, 'warning');
  const shipped = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../system/test-base/os-updates/initial-status.json'), 'utf8'));
  assert.equal(real.sanitizeStatus(shipped).summary.state, 'never-run');
});

function fileReader({ directory = {}, file = {}, readError = false, body = JSON.stringify(statusFixture()), grow = false, openError = false } = {}) {
  const bytes = Buffer.from(body); let closed = false; let statCalls = 0; let opens = 0;
  const metadata = { uid: 0, mode: 0o100644, nlink: 1, size: bytes.length, mtimeMs: 1, ctimeMs: 1, isFile: () => true, ...file };
  const fake = { constants: fs.constants, promises: {
    lstat: async () => ({ uid: 0, mode: 0o40755, isDirectory: () => true, ...directory }),
    open: async (filename, flags) => {
      opens++;
      assert.equal(filename, '/var/lib/nexowatt-eos-os-updates/status.json');
      assert.ok(flags & fs.constants.O_NOFOLLOW); assert.ok(flags & fs.constants.O_NONBLOCK);
      if (openError) throw new Error('private symlink target');
      return { stat: async () => { statCalls++; return { ...metadata, ...(grow && statCalls > 1 ? { size: metadata.size + 1 } : {}) }; },
        read: async (buffer, offset, length, position) => { if (readError) throw new Error('private path'); const amount = Math.min(length, Math.max(0, bytes.length - position)); bytes.copy(buffer, offset, position, position + amount); return { bytesRead: amount }; },
        close: async () => { closed = true; } };
    },
  } };
  const box = { module: { exports: {} }, require: request => request === 'node:fs' ? fake : require(request), Buffer, TextDecoder, Date };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/lib/eosOsUpdateStatus.js'), 'utf8'), box);
  return { api: box.module.exports, closed: () => closed, opens: () => opens };
}
test('OS-Admin file reader checks root ancestry/regular file and closes handles', async () => {
  const good = fileReader(); assert.equal((await good.api.readStatusFile()).schemaVersion, 1); assert.equal(good.closed(), true);
  for (const fixture of [{ directory: { uid: 1000 } }, { directory: { mode: 0o40777 } }, { directory: { isDirectory: () => false } },
    { file: { uid: 1000 } }, { file: { nlink: 2 } }, { file: { mode: 0o100666 } }, { file: { isFile: () => false } },
    { file: { size: 65537 } }, { body: '{' }, { body: Buffer.from([0xff]) }, { readError: true }, { grow: true }, { openError: true }]) {
    const reader = fileReader(fixture); await assert.rejects(reader.api.readStatusFile());
    assert.equal((await reader.api.getOsUpdateStatus()).availability, 'unavailable');
  }
});
test('OS-Admin concurrent authenticated reads share bounded I/O', async () => {
  const reader = fileReader();
  const results = await Promise.all(Array.from({ length: 25 }, () => reader.api.getOsUpdateStatus()));
  assert.ok(results.every(value => value.health === 'ok')); assert.equal(reader.opens(), 1);
  assert.equal((await reader.api.getOsUpdateStatus()).health, 'ok'); assert.equal(reader.opens(), 1);
});

test('OS-Admin exposes only fixed deferred-maintenance and restart-policy values', () => {
  const input = statusFixture(); input.state = 'attention'; input.policy.serviceRestartPolicy = 'defer-package-service-actions';
  input.coverage.gaps = ['eos-maintenance-in-progress', 'PRIVATE_FIXTURE']; input.coverage.state = 'gap';
  const result = real.sanitizeStatus(input);
  assert.equal(result.summary.coverage.maintenanceDeferred, true);
  assert.equal(result.summary.policy.serviceRestartPolicy, 'defer-package-service-actions');
  assert.equal(result.health, 'warning'); assert.doesNotMatch(JSON.stringify(result), /PRIVATE_FIXTURE/);
  input.policy.serviceRestartPolicy = 'PRIVATE_FIXTURE';
  assert.equal(real.sanitizeStatus(input).availability, 'invalid');
});

test('OS-Admin cannot report fully active when package service actions were deferred', () => {
  const input = statusFixture(); input.activation.serviceActionsDeferred = true;
  const result = real.sanitizeStatus(input);
  assert.equal(result.health, 'warning'); assert.equal(result.summary.activation.serviceActionsDeferred, true);
  input.activation.serviceActionsDeferred = 'true'; assert.equal(real.sanitizeStatus(input).availability, 'invalid');
});
