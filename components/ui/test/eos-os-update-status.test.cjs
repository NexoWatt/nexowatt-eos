'use strict';
/** Prüft Statusvertrag/Dateigrenze isoliert und Authentifizierung über echten TLS/Express-Server. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const Module = require('node:module');
const { statusFixture } = require('./os-update-status-fixture.cjs');
const real = require('../lib/os-update-status');
let reads = 0;
let summary = real.sanitizeStatus(statusFixture());
// Nur die root-Datei wird ersetzt; echte registrierte main.js-Route, TLS,
// Sitzung und Rollen bleiben Gegenstand des HTTP-Tests.
const originalLoad = Module._load;
let createHarness;
try {
  Module._load = function (request, ...args) {
    return request === './lib/os-update-status' ? { getOsUpdateStatus: async () => { reads++; return summary; } } : originalLoad.call(this, request, ...args);
  };
  ({ createHarness } = require('../scripts/verify-stable-1.0.9-access.cjs'));
} finally { Module._load = originalLoad; }

test('OS-UI: healthy typed summary excludes raw packages, errors, paths and vendor text', () => {
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
]) test('OS-UI rejects ' + name, () => { const data = statusFixture(); change(data); assert.equal(real.sanitizeStatus(data).availability, 'invalid'); });
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
]) test('OS-UI never reports healthy for ' + name, () => { const data = statusFixture(); change(data); assert.equal(real.sanitizeStatus(data).health, 'warning'); });
test('OS-UI stale, future and stale timer observations cannot remain healthy', () => {
  const now = Date.now();
  assert.equal(real.sanitizeStatus(statusFixture(now - 129601000), now).availability, 'stale');
  assert.equal(real.sanitizeStatus(statusFixture(now + 300001), now).availability, 'future');
  const data = statusFixture(now); data.timers.checkedAt = new Date(now - 129601000).toISOString();
  assert.equal(real.sanitizeStatus(data, now).availability, 'stale');
});
test('OS-UI installer initial status and early host errors remain explicit', () => {
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
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../lib/os-update-status.js'), 'utf8'), box);
  return { api: box.module.exports, closed: () => closed, opens: () => opens };
}
test('OS-UI file reader checks root ancestry/regular file and closes handles', async () => {
  const good = fileReader(); assert.equal((await good.api.readStatusFile()).schemaVersion, 1); assert.equal(good.closed(), true);
  for (const fixture of [{ directory: { uid: 1000 } }, { directory: { mode: 0o40777 } }, { directory: { isDirectory: () => false } },
    { file: { uid: 1000 } }, { file: { nlink: 2 } }, { file: { mode: 0o100666 } }, { file: { isFile: () => false } },
    { file: { size: 65537 } }, { body: '{' }, { body: Buffer.from([0xff]) }, { readError: true }, { grow: true }, { openError: true }]) {
    const reader = fileReader(fixture); await assert.rejects(reader.api.readStatusFile());
    assert.equal((await reader.api.getOsUpdateStatus()).availability, 'unavailable');
  }
});
test('OS-UI concurrent authenticated reads share bounded I/O', async () => {
  const reader = fileReader();
  const results = await Promise.all(Array.from({ length: 25 }, () => reader.api.getOsUpdateStatus()));
  assert.ok(results.every(value => value.health === 'ok')); assert.equal(reader.opens(), 1);
  assert.equal((await reader.api.getOsUpdateStatus()).health, 'ok'); assert.equal(reader.opens(), 1);
});
test('OS-UI actual endpoint denies anonymous, revoked, uninitialized and removed-role sessions before file access', async () => {
  const h = await createHarness();
  try {
    const before = reads;
    assert.equal((await h.request('/api/system/os-updates')).status, 401); assert.equal(reads, before);
    const token = await h.login('kunde');
    h.objects.get('system.user.kunde').common.enabled = false;
    assert.equal((await h.request('/api/system/os-updates', { token })).status, 401); assert.equal(reads, before);
    h.objects.get('system.user.kunde').common.enabled = true;
    h.objects.get('system.user.kunde').native.nexowattEosAccount.passwordInitialized = false;
    const pending = await h.login('kunde');
    assert.equal((await h.request('/api/system/os-updates', { token: pending })).status, 403); assert.equal(reads, before);
    h.objects.get('system.user.kunde').native.nexowattEosAccount.passwordInitialized = true;
    h.objects.get('system.group.endkunde').common.members = [];
    h.objects.set('system.group.display', { type: 'group', common: { members: ['system.user.kunde'] } });
    assert.equal((await h.request('/api/system/os-updates', { token: pending })).status, 401); assert.equal(reads, before);
  } finally { await h.close(); }
});
test('OS-UI actual endpoint supports service/installer/customer read-only and returns unavailable safely', async () => {
  const h = await createHarness();
  try {
    summary = real.sanitizeStatus(statusFixture());
    for (const user of ['admin', 'installer', 'kunde']) {
      const token = await h.login(user); const response = await h.request('/api/system/os-updates', { token });
      assert.equal(response.status, 200); assert.equal(response.data.health, 'ok'); assert.match(response.response.headers.get('cache-control'), /no-store/);
      assert.equal((await h.request('/api/system/os-updates', { token, method: 'POST', body: {} })).status, 404);
    }
    summary = { schemaVersion: 1, availability: 'unavailable', health: 'warning', summary: null };
    assert.equal((await h.request('/api/system/os-updates', { token: await h.login('kunde') })).status, 503);
  } finally { await h.close(); }
});
