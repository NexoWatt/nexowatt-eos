#!/usr/bin/env node
'use strict';

/**
 * RC50: Netzbetreiber-Schnittstellen-Grundlage.
 *
 * Prüft das kanonische Datenmodell, Herstellerprofil-SDK, read-only Runtime,
 * Modbus-Dekodierung, Qualitätsbehandlung, Platzhalterprofile, UI/API-Vertrag
 * und die strikte Trennung vom Asset-Write. Seit RC93 darf ausschließlich der
 * bestehende Grid-Constraints-/Export-Guard den validierten Envelope lesen.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const canonical = require(path.join(root, 'ems/services/netoperator-canonical-model.js'));
const registryApi = require(path.join(root, 'ems/services/netoperator-driver-registry.js'));
const modbus = require(path.join(root, 'ems/services/netoperator-modbus-tcp.js'));
const { NetOperatorInterfaceModule } = require(path.join(root, 'ems/modules/netoperator-interface.js'));

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function state(value, now = Date.now()) {
  return { val: value, ack: true, ts: now, lc: now, q: 0 };
}

function customStateProfile(protocols = ['state-map']) {
  return {
    schema: 'nexowatt.netoperator-driver.v1',
    id: 'test-state-map',
    manufacturer: 'NexoWatt Test',
    model: 'State Map',
    label: 'RC50 Testprofil',
    status: 'ready',
    mappingVersion: '1.0.0-test',
    protocols,
    defaultProtocol: protocols[0],
    addressBase: 0,
    commandSemantics: {
      authority: 'certified-controller-superior',
      eosRole: 'downstream-operational-orchestration',
      writesEnabled: false,
    },
    watchdog: { maxAgeMs: 5000, policy: 'project-specific' },
    signals: {
      'grid.command.enable': { access: 'read', required: true, objectId: 'plant.enable', dataType: 'boolean' },
      'grid.command.trip': { access: 'read', required: true, objectId: 'plant.trip', dataType: 'boolean' },
      'grid.command.release': { access: 'read', required: true, objectId: 'plant.release', dataType: 'boolean' },
      'grid.p.limit_kw': { access: 'read', objectId: 'plant.pLimitKw', dataType: 'float32', scale: 1 },
      'grid.q.target_kvar': { access: 'read', objectId: 'plant.qTargetKvar', dataType: 'float32', scale: 1 },
      'controller.status': { access: 'read', required: true, objectId: 'plant.status', dataType: 'enum' },
      'controller.comm_ok': { access: 'read', required: true, objectId: 'plant.commOk', dataType: 'boolean' },
      'controller.timestamp': { access: 'read', objectId: 'plant.timestamp', dataType: 'datetime' },
      'controller.source': { access: 'read', objectId: 'plant.source', dataType: 'string' },
      'pcc.p.actual_kw': { access: 'read', objectId: 'plant.pActualKw', dataType: 'float32' },
    },
    notes: ['RC50 automatisches Testprofil'],
  };
}

class FakeAdapter {
  constructor(config, foreignStates = {}) {
    this.config = config;
    this.foreignStates = { ...foreignStates };
    this.foreignReads = [];
    this.foreignWrites = [];
    this.objects = new Map();
    this.states = new Map();
    this.log = { debug() {}, info() {}, warn() {}, error() {} };
  }
  async setObjectNotExistsAsync(id, object) {
    if (!this.objects.has(id)) this.objects.set(id, object);
  }
  async setStateAsync(id, value, ack) {
    this.states.set(id, { val: value, ack: ack === true, ts: Date.now() });
  }
  async getStateAsync(id) {
    return this.states.get(id) || null;
  }
  async getForeignStateAsync(id) {
    this.foreignReads.push(id);
    return Object.prototype.hasOwnProperty.call(this.foreignStates, id) ? this.foreignStates[id] : null;
  }
  async setForeignStateAsync(id, value) {
    this.foreignWrites.push({ id, value });
    throw new Error('RC50 read-only contract violated');
  }
}

async function main() {
  // 1. Kanonisches Modell exakt nach dem freigegebenen Konzept.
  const expectedKeys = [
    'grid.command.enable', 'grid.command.trip', 'grid.command.release',
    'grid.p.limit_kw', 'grid.p.target_kw', 'grid.p.target_pct',
    'grid.q.target_kvar', 'grid.cosphi.target', 'grid.mode.p', 'grid.mode.q',
    'pcc.p.actual_kw', 'pcc.q.actual_kvar', 'pcc.u.actual_v',
    'controller.status', 'controller.comm_ok', 'controller.fault_code',
    'controller.timestamp', 'controller.source', 'eos.ack.command_id', 'eos.status.ready',
  ];
  assert.deepEqual([...canonical.CANONICAL_KEYS].sort(), [...expectedKeys].sort());
  assert.equal(canonical.CANONICAL_FIELDS['grid.command.trip'].priority, 1);
  assert.equal(canonical.CANONICAL_FIELDS['grid.p.limit_kw'].priority, 3);
  assert.equal(canonical.CANONICAL_FIELDS['grid.q.target_kvar'].priority, 4);

  // 2. Fehlende Werte werden nie als physikalische 0 interpretiert.
  assert.equal(canonical.strictFinite(null), null);
  assert.equal(canonical.strictFinite(undefined), null);
  assert.equal(canonical.strictFinite(''), null);
  assert.equal(canonical.strictFinite('   '), null);
  assert.equal(canonical.strictBoolean('trip'), true);
  assert.equal(canonical.strictBoolean('release'), true);
  assert.equal(canonical.strictBoolean('inhibit'), false);

  // 3. Prioritätsvertrag: Trip > Freigabe/Sperre > P > Q.
  const now = Date.now();
  const makeSnapshot = (overrides) => canonical.buildCanonicalSnapshot({
    rawValues: {
      'grid.command.enable': true,
      'grid.command.trip': false,
      'grid.command.release': true,
      'controller.status': 'ready',
      'controller.comm_ok': true,
      'controller.timestamp': now,
      'controller.source': 'test-grid-operator',
      ...overrides,
    },
    receivedAt: now,
    commOk: true,
    maxAgeMs: 5000,
  });
  assert.equal(makeSnapshot({ 'grid.q.target_kvar': 5 }).command.priority, 4);
  assert.equal(makeSnapshot({ 'grid.q.target_kvar': 5, 'grid.p.limit_kw': 80 }).command.priority, 3);
  assert.equal(makeSnapshot({ 'grid.q.target_kvar': 5, 'grid.p.limit_kw': 80, 'grid.command.release': false }).command.priority, 2);
  assert.equal(makeSnapshot({ 'grid.q.target_kvar': 5, 'grid.p.limit_kw': 80, 'grid.command.release': false, 'grid.command.trip': true }).command.priority, 1);

  // 4. Regler-Comm-Fehler gewinnt gegen erfolgreichen Transport; Zukunftszeit ist ungültig.
  const commBad = makeSnapshot({ 'controller.comm_ok': false });
  assert.equal(commBad.commOk, false);
  assert.equal(commBad.valid, false);
  const future = canonical.buildCanonicalSnapshot({
    rawValues: {
      'grid.command.enable': true,
      'grid.command.trip': false,
      'grid.command.release': true,
      'grid.p.limit_kw': 50,
      'controller.status': 'ready',
      'controller.comm_ok': true,
      'controller.timestamp': now + 60_000,
    },
    receivedAt: now,
    commOk: true,
    maxAgeMs: 5000,
    maxFutureSkewMs: 1000,
  });
  assert.equal(future.valid, false);
  assert.ok(future.errors.includes('controller-timestamp-in-future'));

  // 5. Acht herstellerneutrale Platzhalter – ohne erfundene Register.
  const registry = new registryApi.NetOperatorDriverRegistry();
  registry.load();
  const rows = registry.list();
  assert.equal(rows.length, 8);
  assert.ok(rows.every((row) => row.ready === false && row.status === 'mapping-required'));
  for (const row of rows) {
    const profile = registry.get(row.id);
    assert.ok(profile);
    assert.equal(profile.mappingVersion, '0.0.0');
    for (const mapping of Object.values(profile.signals || {})) {
      assert.equal(mapping.address, null);
      assert.equal(String(mapping.objectId || ''), '');
      if (mapping.quality) assert.equal(mapping.quality.address, null);
      if (mapping.timestamp) assert.equal(mapping.timestamp.address, null);
    }
  }

  // 6. Ein später nur mit Objekt-IDs/Registern befülltes Profil erfüllt den Vertrag.
  const custom = customStateProfile();
  const validation = registryApi.validateDriverProfile(registryApi.normalizeDriverProfile(custom));
  assert.equal(validation.ok, true);
  assert.equal(validation.ready, true);
  assert.deepEqual(validation.missingRequired, []);

  // 7. Modbus-Dekodierung, Skalierung, Endianness und Quality.
  const f = Buffer.alloc(4); f.writeFloatBE(12.5, 0);
  assert.equal(modbus.decodeModbusValue(f, { dataType: 'float32', byteOrder: 'ABCD' }), 12.5);
  const swappedWords = Buffer.from([f[2], f[3], f[0], f[1]]);
  assert.equal(modbus.decodeModbusValue(swappedWords, { dataType: 'float32', byteOrder: 'CDAB' }), 12.5);
  assert.equal(modbus.decodeModbusValue(Buffer.from([0x00, 0x64]), { dataType: 'uint16', scale: 0.1 }), 10);
  assert.equal(modbus.decodeModbusValue(Buffer.from([0x00, 0x08]), { dataType: 'boolean', bit: 3 }), true);
  assert.equal(modbus.classifyQuality(1, { goodValues: [1], badValues: [0] }), 'good');
  assert.equal(modbus.classifyQuality(2, { goodValues: [1], badValues: [0] }), 'bad');
  assert.equal(modbus.classifyQuality(9, { staleValues: [9], goodValues: [1] }), 'stale');
  assert.equal(modbus.classifyQuality(1, {}), 'bad');

  // 8. Runtime mit State-Map: gültiger read-only Envelope, keine Hardware-Writes.
  const profileJson = JSON.stringify(custom);
  const config = {
    netOperatorInterface: {
      enabled: true,
      mode: 'diagnostic',
      profileSource: 'custom',
      customProfileJson: profileJson,
      driverId: 'test-state-map',
      commissioned: false,
      installerApproved: false,
      writebackEnabled: false,
      signalMaxAgeSec: 5,
      auditLimit: 100,
      failSafePolicy: 'project-specific',
      transport: { type: 'state-map', pollIntervalMs: 250 },
    },
  };
  const plantNow = Date.now();
  const adapter = new FakeAdapter(config, {
    'plant.enable': state(true, plantNow),
    'plant.trip': state(false, plantNow),
    'plant.release': state(true, plantNow),
    'plant.pLimitKw': state(75, plantNow),
    'plant.qTargetKvar': state(2.5, plantNow),
    'plant.status': state('ready', plantNow),
    'plant.commOk': state(true, plantNow),
    'plant.timestamp': state(plantNow, plantNow),
    'plant.source': state('DSO-RTU-1', plantNow),
    'plant.pActualKw': state(63.2, plantNow),
  });
  const module = new NetOperatorInterfaceModule(adapter, null);
  await module.init();
  await module.tick();
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(adapter._netOperatorEnvelope);
  assert.equal(adapter._netOperatorEnvelope.valid, true);
  assert.equal(adapter._netOperatorEnvelope.readOnly, true);
  assert.equal(adapter._netOperatorEnvelope.hardwareWrite, false);
  assert.equal(adapter._netOperatorEnvelope.operationEngineIntegration, 'grid-export-limit-standby');
  assert.equal(adapter._netOperatorEnvelope.externalExportLimitEligible, false);
  assert.equal(adapter._netOperatorEnvelope.allowedExportPowerW, 75000);
  assert.equal(adapter._netOperatorEnvelope.soleAssetWriter, 'gridConstraints.exportGuard');
  assert.equal(adapter._netOperatorEnvelope.values['grid.p.limit_kw'], 75);
  assert.equal(adapter.foreignWrites.length, 0);
  assert.equal(adapter.states.get('netoperator.operationEngineIntegration').val, 'grid-export-limit-standby');
  assert.equal(adapter.states.get('netoperator.driver.ready').val, true);
  assert.equal(adapter.states.get('netoperator.commandPriority').val, 3);
  assert.ok(adapter.states.has('netoperator.audit.eventsJson'));
  const publicStatus = module.getPublicStatus();
  assert.equal(publicStatus.readOnly, true);
  assert.ok(publicStatus.lastReceivedAt > 0);
  assert.ok(publicStatus.lastValidAt > 0);

  // 9. Platzhalterprofil öffnet keine Netzwerkverbindung und liest keine Fremdstates.
  adapter.config.netOperatorInterface = {
    enabled: true,
    mode: 'diagnostic',
    profileSource: 'builtin',
    driverId: 'wago-power-plant-control',
    signalMaxAgeSec: 5,
    auditLimit: 100,
    failSafePolicy: 'project-specific',
    transport: { type: 'modbus-tcp', host: '192.0.2.1', port: 502, unitId: 1, timeoutMs: 250, pollIntervalMs: 250 },
  };
  const readsBefore = adapter.foreignReads.length;
  await module.tick();
  assert.equal(adapter.states.get('netoperator.status').val, 'mapping-required');
  assert.equal(adapter.foreignReads.length, readsBefore);
  assert.equal(adapter._netOperatorEnvelope.valid, false);
  assert.equal(adapter._netOperatorEnvelope.hardwareWrite, false);

  // 10. Reservierter, noch nicht implementierter Transport scheitert ausdrücklich.
  const unsupported = customStateProfile(['opc-ua']);
  const unsupportedResult = await module.testConnection({
    enabled: true,
    mode: 'diagnostic',
    profileSource: 'custom',
    customProfileJson: JSON.stringify(unsupported),
    transport: { type: 'opc-ua' },
  });
  assert.equal(unsupportedResult.ok, false);
  assert.equal(unsupportedResult.error, 'transport-not-implemented:opc-ua');
  assert.equal(unsupportedResult.readOnly, true);
  assert.equal(unsupportedResult.hardwareWrite, false);

  // 11. T01–T12 sind exakt als einheitliche Abnahmesuite hinterlegt.
  const acceptance = JSON.parse(read('ems/netoperator/acceptance-tests.json'));
  assert.equal(acceptance.schema, 'nexowatt.netoperator-acceptance-suite.v1');
  assert.deepEqual(acceptance.tests.map((entry) => entry.id), Array.from({ length: 12 }, (_unused, index) => `T${String(index + 1).padStart(2, '0')}`));
  assert.equal(acceptance.foundationStatus.operationEngineIntegration, 'prepared-not-active');

  // 12. UI/API/AppCenter-Vertrag vorhanden und sicher getrennt.
  const mainSource = read('main.js');
  const emsAppsHtml = read('www/ems-apps.html');
  const appCenterSource = read('www/netoperator-appcenter.js');
  const operatorHtml = read('www/netoperator.html');
  assert.match(mainSource, /app\.get\(\['\/netoperator'/);
  assert.match(mainSource, /app\.get\('\/api\/netoperator\/status', requireCustomerWorkspace/);
  assert.match(mainSource, /app\.get\('\/api\/netoperator\/raw', requireInstaller/);
  assert.match(mainSource, /app\.post\('\/api\/netoperator\/test', requireInstaller/);
  assert.match(emsAppsHtml, /data-tab="netoperator"/);
  assert.match(emsAppsHtml, /netOperatorConfigSlot/);
  assert.match(appCenterSource, /writebackEnabled:\s*false/);
  assert.match(appCenterSource, /vorhandene Export Guard bleibt alleiniger Asset-Writer/);
  assert.match(operatorHtml, /zertifizierten EZA-\/Parkregler/);
  assert.match(operatorHtml, /netopLastValidTelegram/);

  // 13. Der read-only Envelope darf ausschließlich vom bestehenden Export Guard
  // konsumiert werden. Das Netzbetreiber-Modul selbst führt keine Hardware-Writes aus.
  const envelopeConsumers = walk(path.join(root, 'ems'))
    .filter((file) => /\.(?:js|cjs|mjs)$/i.test(file))
    .filter((file) => !file.endsWith(path.join('ems', 'modules', 'netoperator-interface.js')))
    .filter((file) => read(path.relative(root, file)).includes('_netOperatorEnvelope'));
  assert.deepEqual(envelopeConsumers.map((file) => path.relative(root, file)), [path.join('ems', 'modules', 'grid-constraints.js')]);

  module.stop();
  assert.equal(adapter._netOperatorEnvelope, null);
  console.log('[rc50-netoperator-interface] OK: kanonisches Modell, acht Hersteller-Platzhalter, read-only Treiberlaufzeit, UI/API, T01–T12 und Asset-Trennung geprüft.');
}

main().catch((error) => {
  console.error('[rc50-netoperator-interface] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
