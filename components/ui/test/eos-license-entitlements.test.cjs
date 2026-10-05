'use strict';
// Real NWL2 verification, encrypted store, Admin service and shipped lease client;
// exact shipped UI method/function bodies, isolated from ioBroker and hardware.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const ts = require('typescript');
const flags = require('../ems/services/feature-flags');
const storage = require('../ems/modules/storage-control');
const core = require('../../admin/src/lib/eosLicenseCore');
// Root-protected platform admission is explicitly substituted only in this isolated fixture.
const { loadLicenseModule } = require('../scripts/eos-license-fixture.cjs');
const { EosLicenseService } = loadLicenseModule(path.join(__dirname, '../../admin/src/lib/eosLicenseService.js'));
const { createLicenseGuard } = loadLicenseModule(path.join(__dirname, '../packages/eos-license-client/index.js'));
const firstStart = require('../../../runtime/bootstrap/first-start-configuration.cjs');
const planPolicy = require('../../../runtime/onboarding/configuration.cjs');
const { configuredSettings } = require('../../../tests/onboarding/fixtures.cjs');

function syntaxBodies(file, names, kind) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const found = new Map();
  function visit(node) {
    if ((kind === 'method' ? ts.isMethodDeclaration(node) : ts.isFunctionDeclaration(node)) && node.name && names.includes(node.name.getText(source))) {
      const name = node.name.getText(source); assert.equal(found.has(name), false, name); found.set(name, node.getText(source));
    }
    ts.forEachChild(node, visit);
  }
  visit(source); assert.equal(found.size, names.length); return names.map(name => found.get(name));
}
const methods = ['_nwNormalizeLicenseEdition', '_nwCurrentLicenseEdition', '_nwLicenseFeaturesForEdition', '_nwLicenseAppFeature',
  '_nwIsFeatureLicensed', '_nwLicenseAllowsAppId', '_nwLicenseMaxWallboxes', '_nwLicenseMaxStorages', '_nwBuildLicenseFeatureInfo',
  '_nwApplyLicenseLimitsToEmsApps', '_nwApplyLicenseLimitsToInstallerPatch', '_nwValidateStorageFarmLicense', '_nwRefreshLicenseFromConfiguredKey'];
const runtime = path.join(__dirname, '../main.js');
const backendBodies = syntaxBodies(runtime, methods, 'method');
const managerBodies = syntaxBodies(path.join(__dirname, '../ems/module-manager.js'), ['_licenseEdition', '_licenseAllowsApp'], 'method');
function manager(adapter) {
  return Object.assign(vm.runInNewContext('({' + managerBodies.join(',\n') + '})', { featureFlags: flags }), { adapter });
}
function backend(guard) {
  const adapter = vm.runInNewContext('({' + backendBodies.join(',\n') + '})', { nwFeatureFlagsService: flags });
  Object.assign(adapter, { _nwCentralLicense: guard, log: { info() {} }, setStateAsync: async () => {},
    _nwNormalizeStorageFarmRows: rows => Array.isArray(rows) ? rows : [] });
  return adapter;
}
const frontendFile = path.join(__dirname, '../www/ems-apps.js');
const frontNames = ['_licenseEdition', '_maxStorageCount', '_appLicenseFeature', '_isFeatureLicensed', '_isAppLicensed', '_maxEvcsCount',
  '_licenseLabel', '_storagePowerProfileInfo', 'normalizeLicenseInfo', 'fetchLicenseInfoFallback', 'refreshLicenseForAppCenter'];
const frontBodies = syntaxBodies(frontendFile, frontNames, 'function');
function frontend(raw, transport = async () => raw) {
  let now = Date.now(), redraws = 0;
  const context = vm.createContext({ Date: { now: () => now }, fetchJson: transport, APP_LICENSE_FEATURES: flags.APP_FEATURE_MAP || { charging: 'chargingManagement', peak: 'peakShaving', storagefarm: 'storageFarm' },
    buildAppsUI() { redraws++; }, buildEvcsUI() {}, updateStorageLicensePowerUi() {}, scheduleValidation() {}, setStatus() {} });
  vm.runInContext('let currentLicenseInfo, currentConfig = {}, _licenseLiveRefreshInFlight = false;\n' + frontBodies.join('\n'), context);
  context.input = raw; vm.runInContext('currentLicenseInfo = normalizeLicenseInfo(input);', context);
  return { context, call: (name, value) => { context.argument = value; return vm.runInContext(name + '(argument)', context); },
    advance: ms => { now += ms; }, get redraws() { return redraws; } };
}
async function fixture(t, { firstRun = false } = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-ui-licensing-'));
  const issuer = crypto.generateKeyPairSync('ed25519');
  const publicKeys = { fixture: issuer.publicKey.export({ type: 'spki', format: 'pem' }).toString() };
  const uuid = '550e8400-e29b-41d4-a716-446655440000'; let wall = Date.now(), mono = 0, loss = 0;
  const objects = new Map([['system.meta.uuid', { native: { uuid } }], ['system.adapter.nexowatt-ui.0', { type: 'instance', common: { name: 'nexowatt-ui', enabled: true } }]]);
  const service = new EosLicenseService({ log: { info() {} }, getForeignObjectAsync: async id => objects.get(id) },
    { directory, publicKeys, now: () => wall, monotonic: () => mono });
  const issue = (edition, overrides = {}) => {
    const payload = { v: 2, kid: 'fixture', licenseId: 'fixture', uuid, edition, issuedAt: wall - 1000, notBefore: wall - 1000, expiresAt: null,
      adapters: ['nexowatt-ui', 'nexowatt-devices'], limits: { chargePoints: edition === 'home' ? 3 : 1000, batteries: edition === 'home' ? 2 : 10 }, ...overrides };
    const message = 'NWL2.' + Buffer.from(JSON.stringify(payload)).toString('base64url');
    return message + '.' + crypto.sign(null, Buffer.from(message), issuer.privateKey).toString('base64url');
  };
  if (firstRun) await firstStart.persistLicense({ mode: 'activate', token: issue('home') }, { uuid, publicKeys, core, directory, now: wall });
  await service.start();
  const guard = createLicenseGuard({ name: 'nexowatt-ui', namespace: 'nexowatt-ui.0', sendTo: (target, command, request, callback) => {
    assert.equal(target, 'eos-admin.0'); assert.equal(command, 'eos.license.check');
    service.check('system.adapter.nexowatt-ui.0', request).then(callback);
  } }, { onLost() { loss++; } });
  const adapter = backend(guard);
  t.after(async () => { await guard.stop(); service.stop(); fs.rmSync(directory, { recursive: true, force: true }); });
  return { service, guard, adapter, issue, directory, objects, uuid, publicKeys, get loss() { return loss; },
    advance: ms => { wall += ms; mono += ms; }, now: () => wall };
}

test('NWL2 initial denial, Home and Pro activate the existing UI matrix and signed narrower quotas', async t => {
  const f = await fixture(t); await f.adapter._nwRefreshLicenseFromConfiguredKey(false);
  assert.equal(f.adapter._nwCurrentLicenseEdition(), 'none'); assert.equal(f.adapter._nwLicenseMaxWallboxes(), 0);
  assert.equal(f.adapter._nwLicenseMaxStorages(), 0); assert.equal(f.adapter._nwIsFeatureLicensed('storageControl'), false);
  for (const edition of ['home', 'pro']) {
    await f.service.activate(f.issue(edition, { limits: { chargePoints: 2, batteries: 1 } }));
    await f.adapter._nwRefreshLicenseFromConfiguredKey(false);
    const view = f.adapter._nwBuildLicenseFeatureInfo();
    assert.equal(view.valid, true); assert.equal(view.editionLabel, edition === 'home' ? 'Home' : 'Pro');
    assert.equal(view.maxWallboxes, 2); assert.equal(view.maxStorages, 1); assert.equal(view.maxStoragePowerW, edition === 'home' ? 50000 : 0);
    assert.equal(view.expiresAt, 0); assert.ok(view.validUntil > Date.now());
    for (const [name, allowed] of Object.entries(flags.buildFeatureMap(edition))) assert.equal(view.features[name], allowed, edition + ':' + name);
    assert.equal(f.adapter._nwLicenseAllowsAppId('peak'), edition === 'pro');
    assert.equal(f.adapter._nwLicenseAllowsAppId('storagefarm'), true);
    const front = frontend(view); assert.equal(front.call('_maxStorageCount'), 1); assert.equal(front.call('_maxEvcsCount'), 2);
    assert.equal(front.call('_isFeatureLicensed', 'peakShaving'), edition === 'pro');
    assert.equal(front.call('_storagePowerProfileInfo').maxCommandW, edition === 'home' ? 50000 : 0);
    assert.equal(manager(f.adapter)._licenseAllowsApp('peak'), edition === 'pro');
    assert.equal(manager(f.adapter)._licenseAllowsApp('storagefarm'), true);
    const profile = storage.resolveStorageLicensePowerProfile(f.adapter, { ratedPowerW: 750000 });
    assert.equal(storage.applyStorageLicensePowerLimit(750000, profile).targetW, edition === 'home' ? 50000 : 750000);
    const retained = { storageFarm: { storages: [{ id: 'one' }, { id: 'two' }] } };
    assert.equal(f.adapter._nwValidateStorageFarmLicense(retained).ok, false); assert.equal(retained.storageFarm.storages.length, 2);
  }
  await f.service.activate(f.issue('pro')); await f.adapter._nwRefreshLicenseFromConfiguredKey(false);
  assert.equal(f.adapter._nwLicenseMaxWallboxes(), 50, 'Existing UI editing limit stays distinct from the signed quota of 1000');
  assert.equal(f.adapter._nwLicenseMaxStorages(), 10);
});
test('first-start encrypted handoff feeds identical Admin and UI entitlements without creating physical permissions', async t => {
  const f = await fixture(t, { firstRun: true }); await f.adapter._nwRefreshLicenseFromConfiguredKey(false);
  assert.equal(f.adapter._nwCurrentLicenseEdition(), 'hems');
  const selected = firstStart.validateLicenseSelection({ mode: 'activate', token: f.issue('home') }, { uuid: f.uuid, publicKeys: f.publicKeys, core, now: f.now() });
  assert.equal(planPolicy.licenseCapacity(configuredSettings.devicePlan, selected), true);
  assert.equal(planPolicy.summarize(configuredSettings, { mode: 'activate' }).physicalControlEnabled, false);
  const noBattery = firstStart.validateLicenseSelection({ mode: 'activate', token: f.issue('home', { limits: { chargePoints: 1, batteries: 0 } }) }, { uuid: f.uuid, publicKeys: f.publicKeys, core, now: f.now() });
  assert.throws(() => planPolicy.licenseCapacity(configuredSettings.devicePlan, noBattery));
  assert.equal(f.adapter._nwIsFeatureLicensed('microgridMaster'), false);
});
test('revocation, expiry, changed identity and tampered encrypted record clear all UI entitlements', async t => {
  for (const mode of ['remove', 'expiry', 'identity', 'tamper']) {
    const f = await fixture(t); await f.service.activate(f.issue('pro', { expiresAt: mode === 'expiry' ? f.now() + 1000 : null }));
    await f.adapter._nwRefreshLicenseFromConfiguredKey(false); assert.equal(f.adapter._nwLicenseAllowsAppId('peak'), true);
    if (mode === 'remove') await f.service.remove();
    if (mode === 'expiry') f.advance(1001);
    if (mode === 'identity') f.objects.get('system.meta.uuid').native.uuid = '550e8400-e29b-41d4-a716-446655440001';
    if (mode === 'tamper') fs.writeFileSync(path.join(f.directory, 'license.enc'), 'invalid encrypted record');
    await f.adapter._nwRefreshLicenseFromConfiguredKey(false);
    const view = f.adapter._nwBuildLicenseFeatureInfo(); assert.equal(view.valid, false, mode);
    assert.equal(view.edition, 'none'); assert.equal(view.maxWallboxes, 0); assert.equal(view.maxStorages, 0);
    assert.equal(view.features.peakShaving, false); assert.equal(view.features.storageControl, false); assert.ok(f.loss >= 1);
    assert.equal(manager(f.adapter)._licenseAllowsApp('storage'), false);
    assert.equal(storage.applyStorageLicensePowerLimit(750000, storage.resolveStorageLicensePowerProfile(f.adapter)).targetW, 0);
    const front = frontend(view); assert.equal(front.call('_licenseEdition'), 'none'); assert.equal(front.call('_maxEvcsCount'), 0);
  }
});
test('signed malformed, unsupported editions and wrong UUID never become Pro; legacy labels do not grant UI rights', async t => {
  const f = await fixture(t);
  for (const edition of ['farm', 'business', 'eos', 'hems']) await assert.rejects(f.service.activate(f.issue(edition)));
  await assert.rejects(f.service.activate(f.issue('home', { limits: { chargePoints: 4, batteries: 2 } })));
  await assert.rejects(f.service.activate(f.issue('home', { uuid: '550e8400-e29b-41d4-a716-446655440001' })));
  const validUntil = Date.now() + 10000;
  for (const raw of [{ valid: false, edition: 'pro', validUntil }, { valid: true, edition: 'business', validUntil },
    { ok: true, editionLabel: 'Pro', validUntil }, { valid: true, licenseKey: 'NW1.legacy', validUntil },
    { valid: true, proFullAccess: true, validUntil }, { valid: true, edition: 'pro', validUntil: Date.now() - 1 },
    { valid: true, edition: 'pro', validUntil: Date.now() + 999999 }, { valid: 'true', edition: 'pro', validUntil }]) {
    const front = frontend(raw); assert.equal(front.call('_licenseEdition'), 'none'); assert.equal(front.call('_maxStorageCount'), 0);
    assert.equal(front.call('_isFeatureLicensed', 'peakShaving'), false);
  }
  const unknown = backend({ getStatus: () => ({ valid: true, edition: 'business', limits: { chargePoints: 99, batteries: 99 } }) });
  assert.equal(unknown._nwCurrentLicenseEdition(), 'none'); assert.equal(unknown._nwLicenseMaxStorages(), 0);
  const legacy = { _nwLicenseInfo: { ok: true, edition: 'eos' }, _nwLicenseOk: true };
  assert.equal(manager(legacy)._licenseAllowsApp('storage'), false);
  assert.equal(storage.resolveStorageLicensePowerProfile(legacy).id, 'none');
});
test('frontend live denial or transport loss wins over stale config and explicit false feature remains false even for Pro', async () => {
  const base = { valid: true, edition: 'pro', validUntil: Date.now() + 14000, maxWallboxes: 2, maxStorages: 1, features: { peakShaving: false, storageFarm: true } };
  const front = frontend(base, async () => { throw new Error('Admin unavailable'); });
  assert.equal(front.call('_isFeatureLicensed', 'peakShaving'), false); assert.equal(front.call('_maxStorageCount'), 1);
  await front.call('refreshLicenseForAppCenter', 'test'); assert.equal(front.call('_licenseEdition'), 'none'); assert.equal(front.redraws, 1);
  const denied = frontend(base, async () => ({ valid: false, edition: 'pro', validUntil: base.validUntil }));
  await denied.call('refreshLicenseForAppCenter', 'test'); assert.equal(denied.call('_maxEvcsCount'), 0);
  const expired = frontend(base); expired.advance(15000); assert.equal(expired.call('_licenseEdition'), 'none'); assert.equal(expired.call('_maxEvcsCount'), 0);
  const renewed = frontend(base, async () => ({ ...base, validUntil: base.validUntil + 500 }));
  await renewed.call('refreshLicenseForAppCenter', 'test'); assert.equal(renewed.redraws, 0, 'Lease renewal must not erase in-progress form edits');
  const text = fs.readFileSync(frontendFile, 'utf8');
  assert.doesNotMatch(text, /_inferLicenseFromSuccessfulInstallerGate|fetchLicenseInfoFromStateFallback/);
});
test('server applies zero and narrower wallbox quotas and keeps grid safety core separate from paid functions', async () => {
  const guard = { getStatus: () => ({ valid: false }), isAllowed: () => false };
  const adapter = backend(guard);
  const patch = adapter._nwApplyLicenseLimitsToInstallerPatch({ settingsConfig: { evcsCount: 8, evcsList: [1, 2, 3] },
    emsApps: { apps: { grid: { installed: true, enabled: true }, charging: { installed: true, enabled: true } } } });
  assert.equal(patch.settingsConfig.evcsCount, 0); assert.equal(patch.settingsConfig.evcsList.length, 0);
  assert.equal(patch.emsApps.apps.grid.enabled, true); assert.equal(patch.emsApps.apps.charging.enabled, false);
});

test('authentic zero battery entitlement also blocks a single storage, and narrower limits are rechecked by module manager', async t => {
  const f = await fixture(t); await f.service.activate(f.issue('pro', { limits: { chargePoints: 1, batteries: 0 } }));
  await f.adapter._nwRefreshLicenseFromConfiguredKey(false);
  assert.equal(f.adapter._nwLicenseMaxStorages(), 0);
  for (const feature of ['storageControl', 'storageFarm']) assert.equal(f.adapter._nwIsFeatureLicensed(feature), false);
  for (const app of ['storage', 'storagefarm']) assert.equal(manager(f.adapter)._licenseAllowsApp(app), false);
  assert.equal(storage.resolveStorageLicensePowerProfile(f.adapter).id, 'none');
  const front = frontend(f.adapter._nwBuildLicenseFeatureInfo());
  assert.equal(front.call('_maxStorageCount'), 0); assert.equal(front.call('_isAppLicensed', 'storagefarm'), false);
  assert.equal(front.call('_maxEvcsCount'), 1);
  const patch = f.adapter._nwApplyLicenseLimitsToInstallerPatch({ settingsConfig: { evcsCount: 8, evcsList: [1, 2, 3] } });
  assert.equal(patch.settingsConfig.evcsCount, 1); assert.equal(patch.settingsConfig.evcsList.length, 1);
});

test('license status page reads central entitlement, contains no key submission and expires its display', async () => {
  const elements = new Map(['nw-license-status', 'nw-license-back', 'nw-license-reload'].map(id => [id, { textContent: '', href: '', addEventListener() {} }]));
  const timers = [], intervals = [], requests = [];
  let authed = true;
  let response = { valid: true, edition: 'hems', validUntil: Date.now() + 14000 };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../www/license.js'), 'utf8'), {
    window: { location: { href: 'https://fixture.invalid:8188/license.html' }, NW_AUTH: { requireCapability: async capability => { assert.equal(capability, 'license.manage'); return authed; } } },
    document: { getElementById: id => elements.get(id) }, URL, Date, AbortSignal,
    fetch: async (url, options) => { requests.push({ url, options }); return { ok: true, json: async () => response }; },
    setInterval: fn => { intervals.push(fn); return intervals.length; },
    setTimeout: fn => { timers.push(fn); return timers.length; }, clearTimeout() {},
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(elements.get('nw-license-back').href, 'https://fixture.invalid:8081/');
  assert.match(elements.get('nw-license-status').textContent, /Zentrale Home-Lizenz aktiv/);
  assert.equal(requests[0].url, '/api/license/info'); assert.equal(requests[0].options.body, undefined);
  timers[0](); assert.match(elements.get('nw-license-status').textContent, /abgelaufen/);
  response = { valid: false, edition: 'eos', validUntil: Date.now() + 14000 };
  intervals[0](); await new Promise(resolve => setImmediate(resolve));
  assert.match(elements.get('nw-license-status').textContent, /Keine aktuelle Lizenzfreigabe/);
  authed = false; intervals[0](); await new Promise(resolve => setImmediate(resolve));
  assert.match(elements.get('nw-license-status').textContent, /Admin-Anmeldung erforderlich/);
  assert.equal(requests.length, 2, 'no license request before Admin capability');
});
