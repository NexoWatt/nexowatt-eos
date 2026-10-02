#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const vm = require('node:vm');
const ts = require('typescript');
const flags = require('../ems/services/feature-flags');

// Reuse isolated ioBroker I/O fixtures; license, normalization, telemetry,
// allocator and physical write/readback paths remain the shipped runtime.
const filename = path.join(__dirname, 'verify-storage-farm-dispatch-recovery.js');
const fixture = new Module(filename, module);
fixture.filename = filename;
fixture.paths = Module._nodeModulePaths(__dirname);
const fixtureSource = fs.readFileSync(filename, 'utf8');
const originalLoad = Module._load;
fixture._compile(fixtureSource.slice(0, fixtureSource.indexOf('(async () => {'))
  + '\nmodule.exports = { internal, foreign, writes, writeAttempts };', filename);
const factory = require('../main');
Module._load = originalLoad;
const { internal, foreign, writes } = fixture.exports;
const license = (adapter, edition) => {
  // Fixture only the central issuer boundary. All feature/limit enforcement and
  // actual allocation below remain production code; no local key unlock exists.
  const valid = edition !== 'none';
  const status = { valid, edition: ['home', 'hems'].includes(edition) ? 'home' : 'pro',
    features: valid ? ['energy', 'wallet', 'smartHome', 'microgridMaster', 'billing', 'multisite'] : [],
    limits: { batteries: flags.maxStorages(edition), chargePoints: flags.maxWallboxes(edition) } };
  adapter._nwCentralLicense = { getStatus: () => status, isAllowed: () => valid };
};
function rows(count, split = false) {
  return Array.from({ length: count }, (_, i) => ({
    enabled: true, name: `Storage ${i + 1}`, socId: `farm.${i}.soc`, signedPowerId: `farm.${i}.actual`,
    ...(split ? { setChargePowerId: `farm.${i}.charge.set`, setDischargePowerId: `farm.${i}.discharge.set` } : { setSignedPowerId: `farm.${i}.set` }),
    capacityKWh: 10, maxChargeW: 1000, maxDischargeW: 1000,
  }));
}
function harness(edition, count, split = false, mode = 'pool') {
  internal.clear(); foreign.clear(); writes.length = 0;
  const adapter = factory({}); license(adapter, edition);
  adapter.scheduleDerivedFlowUpdate = () => {};
  adapter.config = { emsApps: { apps: { storagefarm: { installed: true, enabled: true } } },
    storageFarm: { mode, storages: rows(count, split), groups: [{ enabled: true, name: 'A', priority: 1 }] } };
  for (const row of adapter.config.storageFarm.storages) {
    row.group = 'A';
    for (const [id, val] of [[row.socId, 50], [row.signedPowerId, 125]]) {
      foreign.set(id, { val, ack: true, ts: Date.now(), lc: Date.now() });
    }
  }
  return adapter;
}
async function dispatchTests() {
  const denied = harness('none', 0);
  denied._nwLicenseOk = true;
  denied._nwLicenseInfo = { ok: true, edition: 'eos', type: 'full' };
  assert.equal(denied._nwLicenseMaxStorages(), 0, 'Retired local license flags cannot unlock storage slots');
  assert.equal(denied._nwBuildLicenseFeatureInfo().valid, false, 'A central denial overrides old local status');
  for (const [edition, max] of [['home', 2], ['hems', 2], ['pro', 10], ['eos', 10], ['none', 0]]) {
    assert.equal(flags.maxStorages(edition), max);
    assert.equal(flags.allowsApp(edition, 'storagefarm'), max > 0);
    assert.equal(flags.allowsFeature(edition, 'storageFarm'), max > 0);
  }
  assert.equal(flags.allowsFeature('home', 'peakShaving'), false, 'Other Pro modules stay gated');
  for (const edition of ['hems', 'eos']) {
    const cap = flags.maxStorages(edition);
    for (const split of [false, true]) for (const mode of ['pool', 'groups']) {
      const adapter = harness(edition, cap + 1, split, mode);
      assert.equal(adapter._nwBuildLicenseFeatureInfo().maxStorages, cap);
      assert.equal(adapter._nwApplyLicenseLimitsToEmsApps(adapter.config.emsApps).apps.storagefarm.enabled, true);
      const snapshot = JSON.stringify(adapter.config.storageFarm.storages);
      assert.equal(adapter._nwValidateStorageFarmLicense(adapter.config).ok, false);
      await adapter.updateStorageFarmDerived();
      const status = JSON.parse(internal.get('storageFarm.storagesStatusJson').val);
      assert.equal(status.length, cap + 1, 'All telemetry remains visible');
      assert.equal(status[cap].licenseBlocked, true);
      assert.ok(status[cap].chargeBlockedReasons.includes('license_storage_limit'));
      assert.equal(adapter._nwGetStorageFarmRuntimeInfo().licenseExceeded, true);
      // Even a still-positive status from before downgrade cannot unlock an extra row.
      for (const st of status) Object.assign(st, { licenseBlocked: false, dispatchAvailable: true,
        chargeDispatchAvailable: true, dischargeDispatchAvailable: true });
      await adapter.setStateAsync('storageFarm.storagesStatusJson', JSON.stringify(status), true);
      for (const target of [-20000, 20000]) {
        writes.length = 0;
        await adapter.applyStorageFarmTargetW(target, { source: 'eigenverbrauch' });
        for (let i = 0; i <= cap; i++) {
          const expected = i < cap ? 1000 : 0;
          if (split) {
            assert.equal(Math.abs(foreign.get(`farm.${i}.${target < 0 ? 'charge' : 'discharge'}.set`).val), expected);
            assert.equal(Math.abs(foreign.get(`farm.${i}.${target < 0 ? 'discharge' : 'charge'}.set`).val), 0);
          } else assert.equal(Math.abs(foreign.get(`farm.${i}.set`).val), expected);
        }
      }
      assert.equal(JSON.stringify(adapter.config.storageFarm.storages), snapshot, 'No mappings silently removed');
    }
  }
  const adapter = harness('eos', 3);
  await adapter.updateStorageFarmDerived();
  await adapter.applyStorageFarmTargetW(3000, { source: 'eigenverbrauch' });
  assert.equal(foreign.get('farm.2.set').val, 1000);
  license(adapter, 'hems');
  await adapter.applyStorageFarmTargetW(3000, { source: 'eigenverbrauch' });
  assert.equal(foreign.get('farm.2.set').val, 0, 'Downgrade actively clears an old nonzero target');
  license(adapter, 'none');
  await adapter.applyStorageFarmTargetW(-3000, { source: 'eigenverbrauch' });
  for (let i = 0; i < 3; i++) assert.equal(Math.abs(foreign.get(`farm.${i}.set`).val), 0);
  license(adapter, 'hems');
  const migrated = adapter.config.storageFarm.storages;
  adapter.config.storageFarm.storages = [];
  adapter.stateCache['storageFarm.configJson'] = { value: JSON.stringify(migrated) };
  assert.equal(adapter._sfGetNormalizedFarmConfig().storages[2].licenseBlocked, true, 'Runtime migration also enforces license');
  // FEMS grid mode must neutralize ESS power using the NVP conversion, not
  // mistake a literal 0-W grid target for a stopped battery.
  const native = harness('hems', 3);
  for (const row of native.config.storageFarm.storages) delete row.setSignedPowerId;
  const nativeRow = native.config.storageFarm.storages[2];
  Object.assign(nativeRow, { vendorProfile: 'fenecon-openems', coupling: 'dc', feneconControlMode: 'fems-grid',
    feneconGridSetpointId: 'native.grid.set', feneconEssActualPowerId: nativeRow.signedPowerId });
  internal.set('ems.gridPowerRawW', { val: 2000, ack: true, ts: Date.now() });
  foreign.set(nativeRow.signedPowerId, { val: -3000, ack: true, ts: Date.now(), lc: Date.now() });
  await native.updateStorageFarmDerived();
  await native.applyStorageFarmTargetW(-1050, { source: 'eigenverbrauch' });
  assert.equal(foreign.get('native.grid.set').val, -1000, 'Licensed-out native ESS gets zero battery target via NVP conversion');
  const disabled = { storageFarm: { storages: rows(3).map(r => ({ ...r, enabled: false })) } };
  assert.equal(adapter._nwValidateStorageFarmLicense(disabled).ok, false, 'Disabled configured systems still occupy slots');
}

// Execute the actual POST handler bodies up to the persistence boundary.
// Surrounding server dependencies are fixture functions; merge/normalization and
// license checks are real. Never open network ports or write an adapter config.
async function apiTests() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
  const ast = ts.createSourceFile('main.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const handlers = new Map();
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'app.post'
      && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
      handlers.set(node.arguments[0].text, node.arguments[node.arguments.length - 1].getText(ast));
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  for (const endpoint of ['/api/installer/config', '/api/installer/backup/import']) {
    assert.ok(handlers.has(endpoint));
    for (const [edition, count, accepted] of [['hems', 2, true], ['hems', 3, false], ['eos', 10, true], ['eos', 11, false]]) {
      const adapter = harness(edition, 0);
      let persisted = false;
      adapter._nwInstallerConfigPatch = {};
      adapter.persistInstallerConfigToState = async () => { persisted = true; throw new Error('fixture-persistence-boundary'); };
      const saveToken = {};
      let saveReleased = false;
      const scope = {
        // Server-Speichersperre als Fixture; ihre echten Parallelitätsregeln prüft
        // verify-mesh-app-lifecycle.cjs. Auch Lizenzfehler müssen sie freigeben.
        beginMeshAppSave: () => saveToken,
        endMeshAppSave: token => { assert.equal(token, saveToken); saveReleased = true; },
        sendNoStore() {}, _nwProtectStorageFarmPatchFromEmptySubmit: async () => {},
        _nwApplyInstallerRegressionSafetyGate: async p => ({ patch: p }),
        nwValidateFeneconSingleConfig: () => ({ ok: true }), nwValidateFeneconFarmRows: () => ({ ok: true }),
      };
      // Arrow handlers capture this from their creation context.
      const bound = vm.runInNewContext('(function () { return ' + handlers.get(endpoint) + '; })', scope).call(adapter);
      const response = { code: 200, status(n) { this.code = n; return this; }, json(data) { this.body = data; return this; } };
      await bound({ body: { patch: { storageFarm: { storages: rows(count) } }, restartEms: false } }, response);
      assert.equal(saveReleased, true, `${endpoint}: Speichersperre bleibt nach Abschluss nicht bestehen`);
      assert.equal(persisted, accepted, `${endpoint}: ${edition}/${count}: ${JSON.stringify(response.body)}`);
      if (!accepted) {
        assert.equal(response.code, 400);
        assert.equal(response.body.error, 'storage_farm_license_limit');
        assert.equal(response.body.maxStorages, flags.maxStorages(edition));
      }
    }
  }
}
(async () => {
  await dispatchTests(); await apiTests();
  console.log('[1.0.8 storage licenses] OK: Home 2 / Pro 10, API save/import, signed/split, pool/groups, stale status, downgrade, no license and migration.');
})().catch(error => { console.error(error); process.exitCode = 1; });
