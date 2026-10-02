#!/usr/bin/env node
'use strict';
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Prüft Kundenanmeldung, Sitzungswiderruf und Cookie-Eingaben über den ausgelieferten HTTP-Server.
 * Daten und Wirkung: Express und main.js sind echt; Controller, Benutzer und Gerätebefehle sind lokale Fixtures.
 * Bei Änderungen: Positive Bedienfälle und verweigerte Schreibwirkungen gemeinsam prüfen. Kein Hardware-/Tailscale-Nachweis.
 * Verknüpfung: docs/security/EOS_UI_AUTH_2026-10-01_DE.md
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { createHarness } = require('./verify-stable-1.0.9-access.cjs');
const fixtureRevision = () => crypto.randomBytes(32).toString('hex');

/** Stellt ausschließlich einen simulierten schaltbaren Datenpunkt bereit. */
function addSwitch(h) {
  const writes = [];
  h.adapter.smartHomeDevices = [{ id: 'test-switch', type: 'switch', io: { switch: { writeId: 'fixture.switch' } }, behavior: {} }];
  h.adapter.setForeignStateAsync = async (...args) => { writes.push(args); };
  return writes;
}
const toggle = { method: 'POST', body: { id: 'test-switch', value: true } };

for (const policy of [undefined, 'all', 'lan', 'session', 'invalid']) {
  for (const flags of [true, false]) {
    test(`UI-AUTH: ${String(policy)} / alte Auth-Flags=${flags}: anonym gesperrt, Kunde bedient`, async () => {
      const h = await createHarness({ policy, authEnabled: flags, protectWrites: flags });
      try {
        const writes = addSwitch(h);
        assert.equal((await h.request('/api/smarthome/toggle', toggle)).status, 401);
        assert.equal(writes.length, 0);
        const status = (await h.request('/api/auth/status')).data;
        assert.equal(status.enabled, true); assert.equal(status.protectWrites, true); assert.equal(status.authed, false);
        const token = await h.login('kunde');
        assert.equal((await h.request('/api/smarthome/toggle', { ...toggle, token })).status, 200);
        assert.deepEqual(writes.map(row => row.slice(0, 2)), [['fixture.switch', true]]);
        assert.equal((await h.request('/api/set', { token, method: 'POST', body: { scope: 'installer', key: 'test', value: true } })).status, 403);
        assert.equal((await h.request('/api/installer/config', { token })).status, 403);
      } finally { await h.close(); }
    });
  }
}

test('UI-AUTH: Kunden-Schreibfamilien verweigern vor jeder Handler-Wirkung', async () => {
  const h = await createHarness({ policy: 'all', authEnabled: false, protectWrites: false });
  try {
    const writes = addSwitch(h);
    for (const url of ['/api/set', '/api/smarthome/toggle', '/api/smarthome/level', '/api/smarthome/color', '/api/smarthome/cover', '/api/smarthome/player', '/api/smarthome/rtrSetpoint', '/api/smarthome/climate', '/api/smarthome/value']) {
      assert.equal((await h.request(url, toggle)).status, 401, url);
    }
    assert.equal(writes.length, 0); assert.equal(h.saved.length, 0);
  } finally { await h.close(); }
});

/** Fachrolle nur über ein veränderbares Controller-Gruppenobjekt vergeben. */
function addTechnician(h) {
  h.objects.set('system.user.technician', { type: 'user', common: { enabled: true, password: fixtureRevision() }, native: { nexowattEosAccount: { passwordInitialized: true } } });
  h.objects.set('system.group.administrator', { type: 'group', common: { members: ['system.user.technician'] } });
}
for (const change of ['group-removal', 'group-disabled', 'account-disabled', 'account-deleted', 'password-changed', 'group-read-error', 'account-read-error']) {
  test(`UI-SESSION: ${change} widerruft eine echte angemeldete Admin-Sitzung`, async () => {
    const h = await createHarness();
    try {
      addTechnician(h);
      const token = await h.login('technician');
      assert.equal((await h.request('/api/license/info', { token })).status, 200);
      if (change === 'group-removal') h.objects.get('system.group.administrator').common.members = [];
      if (change === 'group-disabled') h.objects.get('system.group.administrator').common.enabled = false;
      if (change === 'account-disabled') h.objects.get('system.user.technician').common.enabled = false;
      if (change === 'account-deleted') h.objects.delete('system.user.technician');
      if (change === 'password-changed') h.objects.get('system.user.technician').common.password = fixtureRevision();
      if (change.endsWith('read-error')) {
        const read = h.adapter.getForeignObjectAsync;
        h.adapter.getForeignObjectAsync = async id => {
          if (id.startsWith(change === 'group-read-error' ? 'system.group.' : 'system.user.')) throw new Error('fixture database unavailable');
          return read(id);
        };
      }
      assert.equal((await h.request('/api/license/save', { token, method: 'POST', body: { licenseKey: 'fixture-not-saved' } })).status, 401);
      assert.equal(h.adapter._authSessions.has(token), false);
      assert.equal((await h.request('/api/auth/status', { token })).data.authed, false);
    } finally { await h.close(); }
  });
}

test('UI-SESSION: neue Gruppenrechte verlangen ebenfalls eine neue Anmeldung', async () => {
  const h = await createHarness();
  try {
    const token = await h.login('kunde');
    h.objects.set('system.group.administrator', { type: 'group', common: { members: ['system.user.kunde'] } });
    h.objects.get('system.group.endkunde').common.members = [];
    assert.equal((await h.request('/api/license/info', { token })).status, 401);
    const newToken = await h.login('kunde', { strict: true });
    assert.equal((await h.request('/api/license/info', { token: newToken })).status, 200);
  } finally { await h.close(); }
});

for (const event of ['logout', 'expiry']) {
  test(`UI-SESSION: ${event} während laufender Kontoprüfung wird nicht rückgängig gemacht`, async () => {
    const h = await createHarness();
    try {
      const token = await h.login('admin');
      let release, entered;
      const paused = new Promise(resolve => { entered = resolve; });
      const resume = new Promise(resolve => { release = resolve; });
      const read = h.adapter.getForeignObjectAsync;
      h.adapter.getForeignObjectAsync = async id => {
        if (id === 'system.user.admin') { entered(); await resume; }
        return read(id);
      };
      const pending = h.request('/api/license/info', { token });
      await paused;
      if (event === 'logout') assert.equal((await h.request('/api/auth/logout', { token, method: 'POST' })).status, 200);
      else h.adapter._authSessions.get(token).exp = Date.now() - 1;
      release();
      assert.equal((await pending).status, 401);
    } finally { await h.close(); }
  });
}

test('UI-LOGIN: Typ-/Längenprüfung, falsche Passwörter, Rate-Limit und alte Bypass-Flags', async () => {
  const h = await createHarness({ authEnabled: false, protectWrites: false });
  try {
    for (const endpoint of ['/api/auth/login', '/api/strict-auth/login', '/api/installer/login']) {
      for (const body of [{}, { user: {}, password: 'x' }, { user: ['admin'], password: 'x' }, { user: 'admin', password: {} }, { user: 'a'.repeat(257), password: 'x' }, { user: 'admin', password: 'x'.repeat(4097) }]) {
        assert.equal((await h.request(endpoint, { method: 'POST', body })).status, 400);
      }
    }
    assert.equal(h.adapter._authSessions.size, 0);
    for (let i = 0; i < 5; i++) {
      const result = await h.request('/api/auth/login', { method: 'POST', body: { user: 'admin', password: fixtureRevision() } });
      assert.equal(result.status, i < 4 ? 401 : 429);
    }
    assert.equal((await h.request('/api/strict-auth/login', { method: 'POST', body: { user: 'admin', password: h.testPassword } })).status, 429);
    assert.equal(h.adapter._authSessions.size, 0);
  } finally { await h.close(); }
});

test('UI-LOGIN: Passwortänderung während Passwortprüfung erzeugt keine Sitzung', async () => {
  const h = await createHarness();
  try {
    h.adapter.checkPassword = (_user, _password, done) => {
      h.objects.get('system.user.admin').common.password = fixtureRevision(); done(true);
    };
    assert.equal((await h.request('/api/auth/login', { method: 'POST', body: { user: 'admin', password: h.testPassword } })).status, 401);
    assert.equal(h.adapter._authSessions.size, 0);
  } finally { await h.close(); }
});

test('UI-SESSION: Passwortänderung während Gruppenprüfung sperrt den laufenden Zugriff', async () => {
  const h = await createHarness();
  try {
    const token = await h.login('admin');
    const read = h.adapter.getForeignObjectAsync;
    h.adapter.getForeignObjectAsync = async id => {
      if (id === 'system.group.administrator') h.objects.get('system.user.admin').common.password = fixtureRevision();
      return read(id);
    };
    assert.equal((await h.request('/api/license/info', { token })).status, 401);
    assert.equal(h.adapter._authSessions.has(token), false);
  } finally { await h.close(); }
});

test('UI-COOKIE: fehlerhafte/mehrdeutige Cookies verweigern; Server und gültige Sitzung bleiben nutzbar', async () => {
  const h = await createHarness();
  try {
    const token = await h.login('admin');
    const cookies = ['nw_session=%', 'nw_session=%E0%A4%A', `nw_session=${token}; nw_session=${token}`, `nw_session=${token}; installer_session=different`, `other=%; nw_session=${token}`, `nw_session=${token}; broken`, `nw_session=${token}; other=${'x'.repeat(8200)}`, `nw_session=${token};` + Array.from({ length: 64 }, (_, i) => `k${i}=v`).join(';')];
    for (const Cookie of cookies) {
      assert.equal((await h.request('/api/license/info', { headers: { Cookie } })).status, 401);
      assert.equal((await h.request('/api/auth/status')).status, 200);
    }
    for (const Cookie of [`nw_session=${token}`, `installer_session=${token}`, `nw_session=${token}; installer_session=${token}`]) {
      assert.equal((await h.request('/api/license/info', { headers: { Cookie } })).status, 200);
    }
    const session = (await h.request('/api/auth/status', { token })).text;
    assert.ok(!/accountRevision|roleRevision|fixture-revision/.test(session));
  } finally { await h.close(); }
});

test('UI-COOKIE: Parser hat keinen Objekt-Prototyp und wirft bei beliebigen Header-Typen nicht', () => {
  const source = fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8');
  const begin = source.indexOf('function parseCookies(req) {');
  const end = source.indexOf('/** Code-Teil: createToken', begin);
  assert.ok(begin >= 0 && end > begin);
  const parse = vm.runInNewContext(source.slice(begin, end) + '; parseCookies', { Buffer }, { timeout: 1000 });
  for (const cookie of [undefined, null, [], {}, 42, 'nw_session=%FF', '__proto__=value; constructor=value', 'nw_session=%']) {
    const result = parse({ headers: { cookie } });
    assert.equal(Object.getPrototypeOf(result), null);
  }
});

test('UI-NETZ: Anmeldung besitzt keine LAN-/Tailscale-IP-Beschränkung', () => {
  // Gemeinsamer Auth-Gate mit dem echten Quellcode und synthetischen Transport-
  // Adressen. Tailscale-Tunnel, Grants und ein Raspberry Pi sind hier nicht vorhanden.
  const source = fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8');
  const begin = source.indexOf('    const requireAuth = async');
  const end = source.indexOf('    const requireInstaller =', begin);
  assert.ok(begin > 0 && end > begin);
  const requireAuth = vm.runInNewContext(source.slice(begin, end) + '; requireAuth', {
    resolveStrictAccess: async req => req.fixtureAccess,
    hasCapability: info => info.capabilities.includes('*'),
    sendForbidden: res => res.status(403).json({}),
  });
  return (async () => {
    for (const ip of ['127.0.0.1', '192.168.10.5', '100.100.10.20', '203.0.113.10', 'fd7a:115c:a1e0::1']) {
      let allowed = false;
      await requireAuth({ socket: { remoteAddress: ip }, fixtureAccess: { role: 'admin', capabilities: ['*'] } }, {}, () => { allowed = true; });
      assert.equal(allowed, true, ip);
    }
    const metadata = JSON.parse(fs.readFileSync(path.join(__dirname, '../io-package.json')));
    assert.equal(metadata.native.ip, '0.0.0.0');
  })();
});

test('UI-DEPENDENCY: Express-Parser verarbeiten den gemeldeten Sonderfall und weisen ungültige Limits ab', () => {
  const expressRequire = require('node:module').createRequire(require.resolve('express/package.json'));
  const qs = expressRequire('qs');
  const bodyParser = expressRequire('body-parser');
  assert.deepEqual(qs.parse('scope=settings&key=example'), { scope: 'settings', key: 'example' });
  const parsed = qs.parse('x%5Bconstructor%5D%5BisBuffer%5D=y', { plainObjects: true });
  assert.doesNotThrow(() => qs.stringify(parsed));
  assert.throws(() => bodyParser.json({ limit: 'invalid-fixture-limit' }));
});
