'use strict';

// Read-only, hash-bound reproduction of selected UI 1.0.21 source fragments.
// No Express server, adapter process, device, installer or real account is used.
// A passing finding test confirms the observed defect; it does not close it.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const sourceRoot = process.env.EOS_UI_SOURCE;
if (!sourceRoot) throw new Error('EOS_UI_SOURCE must point to the reviewed UI 1.0.21 extraction.');
const source = fs.readFileSync(path.join(sourceRoot, 'main.js'), 'utf8');
const metadataBytes = fs.readFileSync(path.join(sourceRoot, 'io-package.json'));
const metadata = JSON.parse(metadataBytes);
assert.equal(crypto.createHash('sha256').update(source).digest('hex'), '67d3ef9b866ea9903cf932109ea37ba8c63f5f1ea51130f682981e25c66c241b', 'Reviewed runtime hash required.');
assert.equal(crypto.createHash('sha256').update(metadataBytes).digest('hex'), '4c898a905f24276048e20cde187ae37e43fb52558d2c63fddd1093aff34244e7', 'Reviewed metadata hash required.');

function fragment(start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, 'Source boundaries must match the reviewed source.');
  return source.slice(a, b);
}
const cookieSource = fragment('function parseCookies(req) {', '/** Code-Teil: createToken');
const authSource = fragment('    const authCfg = (this.config && this.config.auth) || {};', '    // App-Center needs edition/feature limits, never UUID or the license key.');
function response() {
  return { code: 200, headers: {}, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; }, setHeader(key, value) { this.headers[key] = value; } };
}
function authFixture(policy = metadata.native.accessControl.customerWritePolicy, enabled = true) {
  const groups = new Map();
  const adapter = { config: { auth: { ...metadata.native.auth, enabled }, accessControl: { ...metadata.native.accessControl, customerWritePolicy: policy } }, _authSessions: new Map(), getForeignObjectAsync: async id => groups.get(id) || null };
  const context = { adapter, groups, Date, Map, Set, URL, nwRequestRemoteIp: req => req.socket.remoteAddress, nwIsTrustedLanIp: () => false };
  const result = vm.runInNewContext(`${cookieSource}\n(function(){${authSource}\nreturn { requireAuth, requireInstaller, requireAdmin, computeRoleInfo, resolveStrictAccess, setSessionCookie, getStoredSession, parseCookies }; }).call(adapter)`, context, { timeout: 1000 });
  return { adapter, groups, ...result };
}
function anonymousRequest() { return { headers: {}, socket: { remoteAddress: '203.0.113.17' }, body: { id: 'test-device', value: true } }; }

test('UI-TEST-001 metadata declares HTTP-wide binding and default anonymous customer policy', () => {
  assert.equal(metadata.common.version, '1.0.21');
  assert.equal(metadata.native.ip, '0.0.0.0');
  assert.equal(metadata.native.port, 8188);
  assert.equal(metadata.native.auth.enabled, true);
  assert.equal(metadata.native.auth.protectWrites, true);
  assert.equal(metadata.native.accessControl.customerWritePolicy, 'all');
  assert.ok(source.includes('this.server = app.listen(port, bind, finishOk);'));
});

test('UI-TEST-002 anonymous request passes actual default auth gate and reaches a stubbed configured switch write', async () => {
  const auth = authFixture(); const writes = []; const req = anonymousRequest(); const res = response();
  const adapter = { smartHomeDevices: [{ id: 'test-device', type: 'switch', io: { switch: { writeId: 'fixture.switch' } }, behavior: {} }], setForeignStateAsync: async (...args) => { writes.push(args); }, log: { warn() {} } };
  let handler;
  const app = { post(_route, _gate, callback) { handler = callback; } };
  const route = fragment("app.post('/api/smarthome/toggle', requireAuth, async (req, res) => {", '// Level-API für Dimmer');
  vm.runInNewContext(`(function(){${route}}).call(adapter)`, { adapter, app, requireAuth: auth.requireAuth }, { timeout: 1000 });
  let passed = false;
  await auth.requireAuth(req, res, () => { passed = true; });
  if (passed) await handler(req, res);
  assert.equal(passed, true); assert.equal(res.code, 200);
  assert.equal(writes.length, 1); assert.equal(writes[0][0], 'fixture.switch'); assert.equal(writes[0][1], true);
});

test('UI-TEST-003 explicit session policy denies anonymous customer writes', async () => {
  const auth = authFixture('session'); const res = response(); let passed = false;
  await auth.requireAuth(anonymousRequest(), res, () => { passed = true; });
  assert.equal(passed, false); assert.equal(res.code, 401);
});

test('UI-TEST-004 installer and license gates remain closed even when general auth is disabled', async () => {
  const auth = authFixture('all', false);
  for (const gate of [auth.requireInstaller, auth.requireAdmin]) {
    const res = response(); let passed = false;
    await gate(anonymousRequest(), res, () => { passed = true; });
    assert.equal(passed, false); assert.equal(res.code, 401);
  }
});

test('UI-TEST-005 HTTP sockets create cookies without Secure; encrypted sockets add Secure', () => {
  const auth = authFixture();
  for (const encrypted of [false, true]) {
    const res = response(); auth.setSessionCookie(res, 'test-only-token', 1000, { socket: { encrypted } });
    for (const cookie of res.headers['Set-Cookie']) {
      assert.equal(cookie.includes('; Secure'), encrypted);
      assert.equal(cookie.includes('; HttpOnly'), true);
    }
  }
});

test('UI-TEST-006 removing an admin group does not revoke the existing cached admin session', async () => {
  const auth = authFixture('session'); const name = 'test-technician';
  auth.groups.set('system.group.administrator', { common: { members: [`system.user.${name}`] } });
  const initial = await auth.computeRoleInfo(name); assert.equal(initial.role, 'admin');
  auth.adapter._authSessions.set('test-only-session', { ...initial, exp: Date.now() + 60_000 });
  auth.groups.clear(); assert.equal((await auth.computeRoleInfo(name)).role, 'none');
  const req = anonymousRequest(); req.headers.cookie = 'nw_session=test-only-session';
  assert.equal((await auth.resolveStrictAccess(req)).role, 'admin');
});

test('UI-TEST-007 expired cached sessions are rejected', async () => {
  const auth = authFixture('session');
  auth.adapter._authSessions.set('expired', { role: 'admin', capabilities: ['*'], exp: Date.now() - 1 });
  const req = anonymousRequest(); req.headers.cookie = 'nw_session=expired';
  assert.equal((await auth.resolveStrictAccess(req)).role, 'none');
});

test('UI-TEST-008 delivered HMAC routines can generate and accept a synthetic full license locally', () => {
  // Key material remains inside the VM. Never print a generated key or secret.
  const normalizer = fragment('  _nwNormalizeLicenseKey(key) {', '  /**');
  const licensing = fragment('  _nwExpectedLicenseKey(uuid) {', '  _nwExpectedEditionTrialSig(uuid, daysStr, edition) {');
  const result = vm.runInNewContext(`(() => { const verifier = new (class {${normalizer}\n${licensing}})(); const uuid = '00000000-0000-4000-8000-000000000001'; const key = verifier._nwExpectedEditionLicenseKey(uuid, 'eos'); const accepted = verifier._nwResolveFullLicense(uuid, key); const rejected = verifier._nwResolveFullLicense('00000000-0000-4000-8000-000000000002', key); return { accepted: accepted?.ok === true && accepted?.edition === 'eos', otherUuidRejected: rejected === null }; })()`, { crypto }, { timeout: 1000 });
  assert.equal(result.accepted, true); assert.equal(result.otherUuidRejected, true);
});

test('UI-TEST-009 authorized save stores the supplied fixture key as plain native data', async () => {
  let saved; let handler;
  const adapter = { namespace: 'fixture.0', config: {}, _nwLooksLikeMaskedLicenseKey: () => false, getForeignObjectAsync: async () => ({ native: {} }), setForeignObjectAsync: async (_id, obj) => { saved = obj; }, _nwInitLicense: async () => {}, _nwBuildLicenseFeatureInfo: () => ({}) };
  const app = { post(_route, _parser, callback) { handler = callback; } };
  const route = fragment("    app.post('/api/license/save', express.json({ limit: '64kb' }), async (req, res) => {", '    // -------------------------------------------------------------------\n    // License gate:');
  vm.runInNewContext(`(function(){${route}}).call(adapter)`, { adapter, app, express: { json: () => () => {} }, sendLicenseCors: () => {}, resolveStrictAccess: async () => ({ role: 'admin' }), hasCapability: () => true }, { timeout: 1000 });
  const res = response(); await handler({ body: { licenseKey: 'fixture-not-a-real-license' } }, res);
  assert.equal(res.code, 200); assert.equal(saved.native.licenseKey === 'fixture-not-a-real-license', true);
  assert.equal(metadata.encryptedNative, undefined); assert.equal(metadata.protectedNative, undefined);
});

test('UI-TEST-010 malformed cookie raises an exception in the actual parser (server effect untested)', () => {
  const auth = authFixture(); let raised = false;
  try { auth.parseCookies({ headers: { cookie: 'nw_session=%' } }); } catch (error) { raised = error.name === 'URIError'; }
  assert.equal(raised, true);
});
