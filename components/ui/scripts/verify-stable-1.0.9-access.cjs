#!/usr/bin/env node
'use strict';
// Exercise the shipped Express server and middleware; only ioBroker storage,
// credentials and SMTP transport are fixtures. No real mail or device writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const vm = require('node:vm');
const realExpress = require('express');
const tlsFixture = require('./eos-tls-fixture.cjs');
const integrated = require('../lib/eos-integrated');
const realHttps = require('node:https');

function loadAdapter() {
  const filename = path.join(__dirname, 'verify-storage-farm-dispatch-recovery.js');
  const fixture = new Module(filename, module);
  fixture.filename = filename;
  fixture.paths = Module._nodeModulePaths(__dirname);
  const source = fs.readFileSync(filename, 'utf8');
  const originalLoad = Module._load;
  try {
    fixture._compile(source.slice(0, source.indexOf('(async () => {')) + '\nmodule.exports = { internal, foreign };', filename);
    const fixtureLoad = Module._load;
    const express = Object.assign(() => {
      const app = realExpress();
      const listen = app.listen.bind(app);
      app.listen = (_port, _bind, callback) => listen(0, '127.0.0.1', callback);
      return app;
    }, realExpress);
    Module._load = function (request, ...args) {
      if (request === './lib/eos-integrated') return { ...integrated, loadUiTlsOptions: () => integrated.validateTlsMaterial(tlsFixture.cert, tlsFixture.key) };
      if (request === 'https') return { ...realHttps, createServer(...options) {
        const server = realHttps.createServer(...options); const listen = server.listen.bind(server);
        server.listen = (_port, _bind, callback) => listen(0, '127.0.0.1', callback); return server;
      } };
      return request === 'express' ? express : fixtureLoad.call(this, request, ...args);
    };
    return { factory: require('../main'), ...fixture.exports };
  } finally { Module._load = originalLoad; }
}
const { factory, internal } = loadAdapter();

async function createHarness({ startServer = true, authEnabled = true, protectWrites = true, policy = 'session', accessControl = {}, auth = {} } = {}) {
  const testPassword = require('node:crypto').randomBytes(32).toString('hex');
  internal.clear();
  const adapter = factory({});
  adapter.config = { auth: { enabled: authEnabled, protectWrites, ...auth }, accessControl: { customerWritePolicy: policy, ...accessControl },
    smartHomeConfig: { version: 3, floors: [], rooms: [], functions: [], devices: [], pages: [], scenes: [], meta: {} } };
  adapter._nwLicenseOk = true;
  adapter._nwCentralLicense = { isAllowed: () => adapter._nwLicenseOk,
    getStatus: () => adapter._nwLicenseOk ? { valid: true, code: 'LICENSE_VALID', edition: 'home', features: ['energy','wallet','smartHome','microgridSlave'], limits: { chargePoints: 3, batteries: 2 } } : {valid:false,code:'LICENSE_DENIED'} };
  adapter.sendTo = (_target, _command, _message, callback) => callback({valid:false});
  adapter._nwLicenseInfo = { ok: true, edition: 'hems', type: 'full' };
  adapter._nwSystemUuid = 'private-fixture-uuid';
  adapter._nwRefreshLicenseFromConfiguredKey = async () => {};
  // Reale Auth-Gates lesen aktuelle Benutzer-/Gruppenobjekte. Nur Controller-
  // Speicherung und Passwortprüfung werden mit kurzlebigen Testdaten ersetzt.
  const objects = new Map(['admin', 'installer', 'kunde'].map(user => ['system.user.' + user,
    { type: 'user', common: { enabled: true, password: require('node:crypto').randomBytes(32).toString('hex') }, native: { nexowattEosAccount: { passwordInitialized: true } } }]));
  for (const [group, user] of [['administrator', 'admin'], ['installateur', 'installer'], ['endkunde', 'kunde']]) {
    objects.set('system.group.' + group, { type: 'group', common: { members: ['system.user.' + user] } });
  }
  adapter.extendForeignObjectAsync = async (id, patch) => {
    const object = objects.get(id); if (!object) throw new Error('fixture account missing');
    object.common = { ...object.common, ...patch.common };
    object.native = { ...object.native, ...patch.native, nexowattEosAccount: { ...object.native?.nexowattEosAccount, ...patch.native?.nexowattEosAccount } };
  };
  const originalObjectRead = adapter.getForeignObjectAsync.bind(adapter);
  adapter.getForeignObjectAsync = async id => id.startsWith('system.user.') || id.startsWith('system.group.')
    ? structuredClone(objects.get(id) || null) : originalObjectRead(id);
  adapter.checkPassword = (user, password, done) => {
    const hash = objects.get('system.user.' + user)?.common?.password;
    if (!hash?.startsWith('pbkdf2$')) return done(!!hash && password === testPassword);
    const [, rounds, expected, salt] = hash.split('$');
    require('node:crypto').pbkdf2(password, salt, Number(rounds), 256, 'sha256', (error, derived) => done(!error && derived.toString('hex') === expected));
  };
  adapter.getForeignObjectsAsync = async () => ({ 'fixture.light': { common: { name: 'Testlicht', type: 'boolean', role: 'switch', read: true, write: true } } });
  adapter.scheduleDerivedFlowUpdate = () => {};
  const saved = [];
  adapter.persistInstallerConfigToState = async patch => { saved.push(JSON.parse(JSON.stringify(patch))); };
  const mailWrites = [];
  adapter._getNotificationMail = () => ({ init: async () => {}, publicConfig: () => ({ enabled: false, passwordSet: false, from: 'info@nexowatt.com' }),
    configure: async config => { mailWrites.push(config); return { enabled: false, passwordSet: false }; } });
  if (startServer) await adapter.startServer();
  const getBase = () => `https://127.0.0.1:${adapter.server.address().port}`;
  const request = (url, options) => tlsFixture.request(getBase(), url, options);
  async function login(user, { strict = user !== 'kunde' } = {}) {
    const result = await request(strict ? '/api/strict-auth/login' : '/api/auth/login', { method: 'POST', body: { user, password: testPassword } });
    assert.equal(result.status, 200, result.text);
    return decodeURIComponent(result.response.headers.get('set-cookie').match(/nw_session=([^;]+)/)[1]);
  }
  const close = async () => {
    if (adapter._nwLicensePoll) clearInterval(adapter._nwLicensePoll);
    if (adapter._nwCentralLicense?.stop) await adapter._nwCentralLicense.stop();
    if (!adapter.server) return;
    adapter.server.closeAllConnections();
    await new Promise(resolve => adapter.server.close(resolve));
  };
  return { adapter, objects, testPassword, get base() { return getBase(); }, request, login, saved, mailWrites, close };
}


/**
 * Die echte Frontend-Freigabe bleibt unabhängig vom offenen Kundenbetrieb.
 * Prüft beide Einrichtungseinstiege im SmartHome-Bereich einschließlich
 * Rollenwechsel, fehlendem Strict-Status und alter Kunden-Wildcard.
 * Es werden weder Netzwerkverbindungen noch Gerätebefehle ausgelöst.
 */
function verifySmartHomeNavigation() {
  const root = path.join(__dirname, '..');
  const settings = fs.readFileSync(path.join(root, 'www/settings.html'), 'utf8');
  const smartHome = fs.readFileSync(path.join(root, 'www/smarthome.html'), 'utf8');
  assert.doesNotMatch(settings, /href=["'][^"']*smarthome-config|id=["']openSmartHomeSettingsBtn/, 'general settings must contain no technical SmartHome entry');
  const links = [...smartHome.matchAll(/<a\b[^>]*data-nw-config-link="smarthome\.configure"[^>]*>/g)];
  assert.equal(links.length, 2, 'SmartHome contains menu and visible page-action entry for experts');
  for (const [link] of links) assert.match(link, /hidden[^>]*display:none/, 'setup entry starts hidden before auth status');
  const source = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/www/auth.ts'), 'utf8');
  const fn = source.match(/  function updateConfigNavigation\(info\) \{[\s\S]*?\n  \}/);
  assert.ok(fn, 'actual frontend navigation guard available');
  const elements = links.map(() => ({ hidden: true, style: { display: 'none', removeProperty(key) { delete this[key]; } }, getAttribute: () => 'smarthome.configure' }));
  const context = vm.createContext({ document: { querySelectorAll: () => elements } });
  vm.runInContext(fn[0] + '; globalThis.update = updateConfigNavigation;', context);
  for (const [info, visible] of [
    [null, false],
    [{ authed: false, role: 'admin', capabilities: ['*'] }, false],
    [{ authed: true, role: 'customer', capabilities: ['*', 'smarthome.configure'] }, false],
    [{ authed: true, role: 'installer', capabilities: ['smarthome.configure'] }, true],
    [{ authed: true, role: 'installer', capabilities: [] }, false],
    [{ authed: true, role: 'admin', capabilities: ['*'] }, true],
    [null, false],
  ]) {
    context.update(info);
    for (const element of elements) {
      assert.equal(element.hidden, !visible);
      assert.equal(element.style.display === 'none', !visible);
    }
  }
}

async function verify() {
  verifySmartHomeNavigation();
  for (const authEnabled of [true, false]) {
    const h = await createHarness({ authEnabled });
    try {
      const admin = await h.login('admin');
      const installer = await h.login('installer');
      const customer = await h.login('kunde');
      // Old sessions with formerly granted license.manage (even wildcard) must
      // lose admin-only access without requiring logout or waiting for expiry.
      h.adapter._authSessions.set('legacy-installer', { role: 'installer', capabilities: ['*', 'license.manage'], exp: Date.now() + 60000 });
      h.adapter._authSessions.set('expired-admin', { role: 'admin', capabilities: ['*'], exp: Date.now() - 1 });
      for (const [token, code] of [[undefined, 401], [installer, 403], ['legacy-installer', 401], ['expired-admin', 401], ...(customer ? [[customer, 403]] : [])]) {
        for (const url of ['/api/license/info', '/api/installer/notification-mail', '/license.html', '/static/license.html', '/mail-setup/#/notification-mail']) {
          const result = await h.request(url, { token });
          assert.equal(result.status, code, `${authEnabled}/${token}/${url}: ${result.text.slice(0, 150)}`);
          assert.ok(!/private-fixture-(uuid|license)|id="mailHost"/.test(result.text), 'no sensitive response before authorization');
        }
        for (const url of ['/api/license/save', '/api/installer/notification-mail']) {
          assert.equal((await h.request(url, { token, method: 'POST', body: { licenseKey: 'changed', host: 'changed' } })).status, code, url);
        }
      }
      assert.equal(h.mailWrites.length, 0);
      assert.equal((await h.request('/api/license/info', { token: admin })).data.managedBy, 'eos-admin.0');
      assert.equal((await h.request('/mail-setup/', { token: admin })).status, 200);
      assert.equal((await h.request('/api/installer/notification-mail', { token: admin, method: 'POST', body: { enabled: false } })).status, 200);
      assert.equal(h.mailWrites.length, 1);
      const features = await h.request('/api/license/features', { token: installer });
      assert.equal(features.status, 200);
      assert.equal(features.data.maxStorages, 2);
      assert.ok(!/private-fixture|licenseKey|uuid/.test(features.text), 'installer feature limits contain no license secret');
      assert.equal((await h.request('/ems-apps.html', { token: installer })).status, 200);
      assert.equal((await h.request('/api/strict-auth/status', { token: installer })).data.capabilities.includes('license.manage'), false);
      // Einrichtung kann beliebige DPs zuweisen: weder Kunden noch offene
      // Bedienung oder alte Wildcard-Sessions dürfen diese APIs freigeben.
      h.adapter._authSessions.set('legacy-customer', { role: 'customer', capabilities: ['*', 'smarthome.configureCustomer', 'nexologic.configureCustomer'], exp: Date.now() + 60000 });
      h.adapter._authSessions.set('expired-installer', { role: 'installer', capabilities: ['*'], exp: Date.now() - 1 });
      const readRoutes = ['/smarthome-config.html', '/smarthome-config', '/static/smarthome-config.html',
        '/static/%73marthome-config.html', '/static/smarthome%2dconfig.html', '/static//smarthome-config.html', '/static/%5csmarthome-config.html', '/static/%6cogic.html',
        '/logic.html', '/logic', '/static/logic.html', '/api/smarthome/config', '/api/smarthome/dpsearch?q=fixture',
        '/api/smarthome/dpget?id=fixture.light', '/api/smarthome/type-detect', '/api/object/tree', '/api/smarthome/object/tree',
        '/api/smarthome/logic-clocks', '/api/logic/blocks', '/api/logic/editor', '/api/installer/config'];
      const writeRoutes = ['/api/smarthome/config', '/api/smarthome/logic-clocks', '/api/logic/editor', '/api/smarthome/dpset', '/api/installer/config'];
      const before = h.saved.length;
      for (const [token, code] of [[undefined, 401], ['legacy-customer', 401], ['expired-installer', 401], ...(customer ? [[customer, 403]] : [])]) {
        for (const url of readRoutes) assert.equal((await h.request(url, { token })).status, code, `${authEnabled}/${token}/${url}`);
        for (const url of writeRoutes) assert.equal((await h.request(url, { token, method: 'POST', body: { config: h.adapter.config.smartHomeConfig, id: 'fixture.light', val: true } })).status, code, url);
      }
      assert.equal(h.saved.length, before, 'denied writes never persist');
      const config = { ...h.adapter.config.smartHomeConfig, floors: [{ id: 'eg', name: 'Erdgeschoss' }], rooms: [{ id: 'wohnzimmer', name: 'Wohnzimmer', floorId: 'eg' }] };
      for (const token of [installer, admin]) {
        for (const url of ['/smarthome-config.html', '/static/smarthome-config.html', '/static/%73marthome-config.html', '/static//smarthome-config.html', '/static/%5csmarthome-config.html', '/logic.html', '/static/logic.html', '/static/%6cogic.html', '/api/smarthome/dpsearch?q=fixture']) {
          assert.equal((await h.request(url, { token })).status, 200, url);
        }
        const save = await h.request('/api/smarthome/config', { token, method: 'POST', body: { config } });
        assert.equal(save.status, 200, save.text); assert.equal(save.data.persisted, true);
        assert.equal(h.saved.at(-1).smartHomeConfig.rooms[0].name, 'Wohnzimmer');
        assert.equal((await h.request('/api/smarthome/config', { token })).data.config.rooms[0].name, 'Wohnzimmer');
      }
      // Die Pfad-Normalisierung schützt ausschließlich technische Seiten.
      // Kundenansicht und ihre statischen Ressourcen bleiben lesbar.
      for (const url of ['/smarthome.html', '/static/smarthome.html', '/static/%73marthome.html', '/static//smarthome.html', '/static/smarthome.js', '/static/styles.css']) {
        assert.equal((await h.request(url, { token: customer })).status, 200, url);
      }
      if (customer) {
        const layout = await h.request('/api/smarthome/layout', { token: customer });
        assert.equal(layout.status, 200);
        assert.equal(layout.data.config.rooms[0].name, 'Wohnzimmer');
        for (const key of ['devices', 'scenes', 'meta']) assert.equal(key in layout.data.config, false, key);
        assert.equal((await h.request('/api/smarthome/layout')).status, 401);
        const writes = [];
        h.adapter.smartHomeDevices = [{ id: 'fixture-light', type: 'switch', io: { switch: { readId: 'fixture.light', writeId: 'fixture.light' } }, behavior: {} }];
        h.adapter.setForeignStateAsync = async (...args) => { writes.push(args); };
        assert.equal((await h.request('/api/smarthome/toggle', { token: customer, method: 'POST', body: { id: 'fixture-light', value: true } })).status, 200, 'customer operates configured device');
        assert.equal(writes.length, 1); assert.equal(writes[0][0], 'fixture.light');
        assert.equal((await h.request('/api/smarthome/toggle', { token: customer, method: 'POST', body: { id: 'arbitrary.dp', value: true } })).status, 404);
        h.adapter.smartHomeDevices[0].behavior.readOnly = true;
        assert.equal((await h.request('/api/smarthome/toggle', { token: customer, method: 'POST', body: { id: 'fixture-light', value: true } })).status, 403);
        assert.equal(writes.length, 1, 'no arbitrary or read-only writes');
      }
      h.adapter._nwLicenseOk = false;
      assert.equal((await h.request('/license.html', { token: admin })).status, 200, 'admin can activate an unlicensed system');
      assert.equal((await h.request('/api/license/info', { token: admin })).status, 200);
      assert.equal((await h.request('/api/license/info', { token: installer })).status, 403);
    } finally { await h.close(); }
  }
  for (const policy of ['all', 'lan']) {
    const h = await createHarness({ authEnabled: false, policy });
    try {
      assert.equal((await h.request('/api/smarthome/config', { method: 'POST', body: { config: h.adapter.config.smartHomeConfig } })).status, 401, `${policy} customer policy never grants setup rights`);
      assert.equal((await h.request('/api/smarthome/layout')).status, 401, `${policy} never bypasses customer login`);
      assert.equal((await h.request('/api/smarthome/layout', { token: await h.login('kunde') })).status, 200, 'authenticated customer navigation stays usable');
      assert.equal((await h.request('/api/installer/notification-mail')).status, 401);
    } finally { await h.close(); }
  }
  console.log('[1.0.9 access] OK: real HTTPS server, Admin/Installer/customer roles, direct URLs, legacy/expired sessions, auth-disabled, unlicensed activation, Installer/Admin save/reload, customer layout/device control, SmartHome-only setup navigation, encoded static path guards, setup/DP/logic denial and feature limits.');
}
module.exports = { createHarness };
if (require.main === module) verify().catch(error => { console.error(error); process.exitCode = 1; });
