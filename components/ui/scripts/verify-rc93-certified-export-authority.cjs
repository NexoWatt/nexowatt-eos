#!/usr/bin/env node
'use strict';

/**
 * RC93 – Zertifizierte Einspeisevorgabe und eindeutige Regelhoheit
 *
 * Schützt die letzte Stable-Anforderung:
 * - lokale Verbraucher und freigegebene flexible Lasten vor Speicherladung,
 * - zertifizierter EZA-/Parkregler als bevorzugte Grenzquelle nur nach
 *   vollständiger App-/Installer-/Aktivfreigabe,
 * - bestehender Export Guard als einziger Anlagen-Sollwertschreiber,
 * - lokale Sicherheitsobergrenze, TTL und definierte Fail-Safe-Rückfälle,
 * - keine Nullinterpretation fehlender externer Werte,
 * - hashverkettetes Entscheidungsprotokoll.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const { GridConstraintsModule } = require(path.join(ROOT, 'ems/modules/grid-constraints.js'));
const { NetOperatorInterfaceModule } = require(path.join(ROOT, 'ems/modules/netoperator-interface.js'));

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function state(value, now = Date.now()) {
  return { val: value, ack: true, ts: now, lc: now, q: 0 };
}

function customStateProfile() {
  return {
    schema: 'nexowatt.netoperator-driver.v1',
    id: 'rc93-state-map',
    manufacturer: 'NexoWatt Test',
    model: 'Certified Export Authority',
    label: 'RC93 Testprofil',
    status: 'ready',
    mappingVersion: '1.0.0-rc93',
    protocols: ['state-map'],
    defaultProtocol: 'state-map',
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
      'grid.p.target_pct': { access: 'read', objectId: 'plant.pTargetPct', dataType: 'float32', scale: 1 },
      'grid.q.target_kvar': { access: 'read', objectId: 'plant.qTargetKvar', dataType: 'float32', scale: 1 },
      'controller.status': { access: 'read', required: true, objectId: 'plant.status', dataType: 'enum' },
      'controller.comm_ok': { access: 'read', required: true, objectId: 'plant.commOk', dataType: 'boolean' },
      'controller.timestamp': { access: 'read', objectId: 'plant.timestamp', dataType: 'datetime' },
      'controller.source': { access: 'read', objectId: 'plant.source', dataType: 'string' },
    },
    notes: ['RC93 automatisches Testprofil'],
  };
}

class FakeAdapter {
  constructor(config = {}, foreignStates = {}) {
    this.config = config;
    this.foreignStates = { ...foreignStates };
    this.foreignReads = [];
    this.foreignWrites = [];
    this.objects = new Map();
    this.states = new Map();
    this.stateCache = {};
    this._netOperatorEnvelope = null;
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
    throw new Error('RC93 read-only Reglerzugriff verletzt');
  }
}

function activeConfig(overrides = {}) {
  const config = {
    emsApps: { apps: { netOperator: { installed: true, enabled: true } } },
    enableNetOperatorInterface: true,
    gridConstraints: {
      zeroExportEnabled: true,
      zeroExportInstallerApproved: true,
      exportLimitRunMode: 'active',
      zeroExportMaxExportW: 30000,
      fallbackExportPowerW: 12000,
      zeroExportChargingCommandStateId: '0_userdata.0.nexowatt.zero.charging',
      zeroExportFlexLoadCommandStateId: '0_userdata.0.nexowatt.zero.flex',
      zeroExportStorageChargeCommandStateId: '0_userdata.0.nexowatt.zero.storage',
      zeroExportMeshCommandStateId: '0_userdata.0.nexowatt.zero.mesh',
      pvLimitWId: 'device.0.pv.limitW',
      pvRatedPowerW: 50000,
    },
    netOperatorInterface: {
      enabled: true,
      mode: 'active',
      commissioned: true,
      installerApproved: true,
      writebackEnabled: false,
      signalMaxAgeSec: 5,
      lastValidHoldSec: 60,
      auditLimit: 100,
      failSafePolicy: 'project-specific',
      profileSource: 'custom',
      customProfileJson: JSON.stringify(customStateProfile()),
      driverId: 'rc93-state-map',
      transport: { type: 'state-map', pollIntervalMs: 250 },
    },
  };
  const merge = (target, patch) => {
    for (const [key, value] of Object.entries(patch || {})) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        target[key] = merge(target[key] && typeof target[key] === 'object' ? target[key] : {}, value);
      } else target[key] = value;
    }
    return target;
  };
  return merge(config, overrides);
}

function externalEnvelope(now, allowedExportPowerW, overrides = {}) {
  const base = {
    schema: 'nexowatt.netoperator-operation-envelope.v2',
    generatedAt: now,
    receivedAt: now,
    lastUpdate: now,
    validUntil: now + 5000,
    maxAgeMs: 5000,
    source: 'Certified-EZA-1',
    quality: 'good',
    valid: true,
    fresh: true,
    commOk: true,
    command: {
      commandId: `Certified-EZA-1:${now}:active-power-constraint`,
      priority: 3,
      action: 'active-power-constraint',
      binding: true,
      reason: 'grid-active-power-command',
    },
    values: { 'grid.p.limit_kw': allowedExportPowerW === null ? null : allowedExportPowerW / 1000 },
    allowedExportPowerW,
    fallbackExportPowerW: 12000,
    certifiedControllerAuthority: true,
    externalExportLimitEligible: true,
    appEnabled: true,
    active: true,
    commissioned: true,
    installerApproved: true,
    readOnly: true,
    hardwareWrite: false,
    soleAssetWriter: 'gridConstraints.exportGuard',
    operationEngineIntegration: 'grid-export-limit-active',
    failSafePolicy: 'project-specific',
    lastValidHoldSec: 60,
  };
  return { ...base, ...overrides, command: { ...base.command, ...(overrides.command || {}) }, values: { ...base.values, ...(overrides.values || {}) } };
}

async function main() {
  const pkg = JSON.parse(read('package.json'));
  const io = JSON.parse(read('io-package.json'));
  assert.equal(pkg.version, io.common.version, 'Paket- und ioBroker-Version sind nicht synchron');

  // 1. Die feste EOS-Senkenreihenfolge steht vor Speicher und WR-Abregelung.
  const adapter = new FakeAdapter(activeConfig());
  const grid = new GridConstraintsModule(adapter, null);
  const cfg = adapter.config.gridConstraints;
  const plan = grid._zeroExportSinkPriorityPlan(cfg, 9000, 39000, 9000);
  assert.deepEqual(plan.order, [
    'localConsumption',
    'chargingStations',
    'flexLoads',
    'storageCharge',
    'meshMicrogrid',
    'inverterCurtailment',
  ]);
  assert.equal(plan.nextAction, 'chargingStations');
  assert.equal(plan.steps.find((entry) => entry.id === 'chargingStations').requestedPowerW, 9000);
  assert.equal(plan.steps.find((entry) => entry.id === 'storageCharge').requestedPowerW, 0);
  const availabilityApplied = grid._applyZeroExportAvailabilityToPlan(plan, {
    sinks: {
      chargingStations: { usable: false, commandStateId: cfg.zeroExportChargingCommandStateId },
      flexLoads: { usable: true, commandStateId: cfg.zeroExportFlexLoadCommandStateId },
      storageCharge: { usable: true, commandStateId: cfg.zeroExportStorageChargeCommandStateId },
      meshMicrogrid: { usable: true, commandStateId: cfg.zeroExportMeshCommandStateId },
    },
  });
  assert.equal(availabilityApplied.nextAction, 'flexLoads');
  assert.equal(availabilityApplied.steps.find((entry) => entry.id === 'flexLoads').requestedPowerW, 9000);
  assert.equal(availabilityApplied.steps.find((entry) => entry.id === 'storageCharge').requestedPowerW, 0);

  // 2. Ohne vollständig aktivierten zertifizierten Regler bleibt EOS führend.
  let now = 1_800_000_000_000;
  let authority = grid._resolveExportLimitAuthority(cfg, now);
  assert.equal(authority.controlSource, 'eos-local-fallback');
  assert.equal(authority.effectiveMaxFeedInW, 12000, 'Bei erwarteter, aber fehlender Reglerquelle muss der definierte Rückfall greifen');

  const localOnlyAdapter = new FakeAdapter(activeConfig({
    emsApps: { apps: { netOperator: { installed: false, enabled: false } } },
    enableNetOperatorInterface: false,
    netOperatorInterface: { enabled: false, mode: 'off', commissioned: false, installerApproved: false },
  }));
  const localOnlyGrid = new GridConstraintsModule(localOnlyAdapter, null);
  authority = localOnlyGrid._resolveExportLimitAuthority(localOnlyAdapter.config.gridConstraints, now);
  assert.equal(authority.controlSource, 'eos-local');
  assert.equal(authority.effectiveMaxFeedInW, 30000);
  assert.equal(authority.externalExpected, false);

  // 3. Frische bindende Reglergrenze hat Vorrang, bleibt aber durch die lokale
  // Sicherheitsobergrenze begrenzt.
  adapter._netOperatorEnvelope = externalEnvelope(now, 18000);
  authority = grid._resolveExportLimitAuthority(cfg, now + 100);
  assert.equal(authority.controlSource, 'certified-controller');
  assert.equal(authority.externalActive, true);
  assert.equal(authority.externalBinding, true);
  assert.equal(authority.allowedExportPowerW, 18000);
  assert.equal(authority.effectiveMaxFeedInW, 18000);

  adapter._netOperatorEnvelope = externalEnvelope(now, 50000);
  authority = grid._resolveExportLimitAuthority(cfg, now + 100);
  assert.equal(authority.allowedExportPowerW, 50000);
  assert.equal(authority.effectiveMaxFeedInW, 30000, 'Regler darf lokale Obergrenze nicht anheben');

  adapter._netOperatorEnvelope = externalEnvelope(now, 0);
  authority = grid._resolveExportLimitAuthority(cfg, now + 100);
  assert.equal(authority.effectiveMaxFeedInW, 0, '0 W muss echte Nulleinspeisung bleiben');

  // Prozentvorgabe wird anhand der installierten PV-Leistung auf Watt normiert.
  adapter._netOperatorEnvelope = externalEnvelope(now, null, {
    allowedExportPowerW: null,
    values: { 'grid.p.limit_kw': null, 'grid.p.target_pct': 40 },
  });
  authority = grid._resolveExportLimitAuthority(cfg, now + 100);
  assert.equal(authority.setpointKind, 'grid.p.target_pct');
  assert.equal(authority.allowedExportPowerW, 20000);
  assert.equal(authority.effectiveMaxFeedInW, 20000);

  // 4. Fehlende/mehrdeutige Werte sind niemals eine versehentliche 0-W-Vorgabe.
  adapter._netOperatorEnvelope = externalEnvelope(now, null, {
    allowedExportPowerW: null,
    values: { 'grid.p.limit_kw': null, 'grid.p.target_kw': null, 'grid.p.target_pct': null },
  });
  authority = grid._resolveExportLimitAuthority(cfg, now + 100);
  assert.equal(authority.controlSource, 'eos-local-fallback');
  assert.equal(authority.effectiveMaxFeedInW, 12000);
  assert.equal(authority.allowedExportPowerW, null);
  assert.notEqual(authority.effectiveMaxFeedInW, 0);

  // 5. Freigabe bzw. reine Q-Vorgabe überlässt P wieder der lokalen EOS-Grenze.
  adapter._netOperatorEnvelope = externalEnvelope(now, null, {
    allowedExportPowerW: null,
    command: { action: 'released', binding: false, priority: 5, reason: 'external-command-disabled' },
    values: { 'grid.p.limit_kw': null },
  });
  authority = grid._resolveExportLimitAuthority(cfg, now + 100);
  assert.equal(authority.controlSource, 'eos-local');
  assert.equal(authority.externalActive, true);
  assert.equal(authority.externalBinding, false);
  assert.equal(authority.effectiveMaxFeedInW, 30000);

  // 6. TTL-/Kommunikationsausfall folgt exakt dem gewählten Fail-Safe-Vertrag.
  adapter.config.netOperatorInterface.failSafePolicy = 'project-specific';
  adapter._netOperatorEnvelope = externalEnvelope(now, 18000, { valid: false, fresh: false, commOk: false, validUntil: now - 1 });
  authority = grid._resolveExportLimitAuthority(cfg, now + 10_000);
  assert.equal(authority.effectiveMaxFeedInW, 12000);
  assert.equal(authority.controlSource, 'eos-local-fallback');

  adapter.config.netOperatorInterface.failSafePolicy = 'block';
  authority = grid._resolveExportLimitAuthority(cfg, now + 10_000);
  assert.equal(authority.effectiveMaxFeedInW, 0);
  assert.equal(authority.controlSource, 'certified-controller-failsafe');

  adapter.config.netOperatorInterface.failSafePolicy = 'release';
  authority = grid._resolveExportLimitAuthority(cfg, now + 10_000);
  assert.equal(authority.effectiveMaxFeedInW, 30000);
  assert.equal(authority.controlSource, 'eos-local-fallback');

  // Letzten gültigen Wert nur innerhalb der expliziten Haltezeit verwenden.
  adapter.config.netOperatorInterface.failSafePolicy = 'last-valid';
  adapter.config.netOperatorInterface.lastValidHoldSec = 60;
  adapter._netOperatorEnvelope = externalEnvelope(now, 17000);
  authority = grid._resolveExportLimitAuthority(cfg, now + 100);
  assert.equal(authority.effectiveMaxFeedInW, 17000);
  adapter._netOperatorEnvelope = externalEnvelope(now, 17000, { valid: false, fresh: false, commOk: false, validUntil: now - 1 });
  authority = grid._resolveExportLimitAuthority(cfg, now + 30_000);
  assert.equal(authority.controlSource, 'certified-controller-last-valid');
  assert.equal(authority.effectiveMaxFeedInW, 17000);
  authority = grid._resolveExportLimitAuthority(cfg, now + 61_000);
  assert.equal(authority.controlSource, 'eos-local-fallback');
  assert.equal(authority.effectiveMaxFeedInW, 12000);
  adapter.config.netOperatorInterface.lastValidHoldSec = 0;
  authority = grid._resolveExportLimitAuthority(cfg, now + 1_000);
  assert.equal(authority.controlSource, 'eos-local-fallback', '0 s darf keinen letzten Wert unbegrenzt halten');

  // Diagnosemodus der Netzlimit-App darf die externe Führungsquelle nicht produktiv schalten.
  const diagnosticAdapter = new FakeAdapter(activeConfig({ gridConstraints: { exportLimitRunMode: 'diagnostic' } }));
  diagnosticAdapter._netOperatorEnvelope = externalEnvelope(now, 18000);
  const diagnosticGrid = new GridConstraintsModule(diagnosticAdapter, null);
  authority = diagnosticGrid._resolveExportLimitAuthority(diagnosticAdapter.config.gridConstraints, now + 100);
  assert.equal(authority.externalExpected, false);
  assert.equal(authority.controlSource, 'eos-local');
  assert.equal(authority.effectiveMaxFeedInW, 30000);

  // 7. Entscheidungen werden hashverkettet protokolliert.
  const first = grid._appendExportLimitAuthorityAudit({
    controlSource: 'eos-local', source: 'NexoWatt EOS Netzlimits', quality: 'local',
    configuredMaxFeedInW: 30000, allowedExportPowerW: null, fallbackExportPowerW: 12000,
    effectiveMaxFeedInW: 30000, validUntil: 0, commandId: '', reason: 'certified-controller-not-activated',
  });
  const second = grid._appendExportLimitAuthorityAudit({
    controlSource: 'certified-controller', source: 'Certified-EZA-1', quality: 'good',
    configuredMaxFeedInW: 30000, allowedExportPowerW: 18000, fallbackExportPowerW: 12000,
    effectiveMaxFeedInW: 18000, validUntil: now + 5000, commandId: 'cmd-1', reason: 'certified-controller-standardized-export-limit',
  });
  assert.ok(first && second);
  assert.equal(first.hash.length, 64);
  assert.equal(second.previousHash, first.hash);
  assert.equal(second.hash, grid._exportLimitAuditHash(second));

  // 8. Vollständiger State-Map-Lauf: Regler bleibt read-only und stellt nur den
  // validierten Envelope für den bestehenden Export Guard bereit.
  const plantNow = Date.now();
  const runtimeConfig = activeConfig();
  const runtimeAdapter = new FakeAdapter(runtimeConfig, {
    'plant.enable': state(true, plantNow),
    'plant.trip': state(false, plantNow),
    'plant.release': state(true, plantNow),
    'plant.pLimitKw': state(18, plantNow),
    'plant.status': state('ready', plantNow),
    'plant.commOk': state(true, plantNow),
    'plant.timestamp': state(plantNow, plantNow),
    'plant.source': state('Certified-EZA-Runtime', plantNow),
  });
  const netOperator = new NetOperatorInterfaceModule(runtimeAdapter, null);
  await netOperator.init();
  await netOperator.tick();
  assert.ok(runtimeAdapter._netOperatorEnvelope);
  assert.equal(runtimeAdapter._netOperatorEnvelope.externalExportLimitEligible, true);
  assert.equal(runtimeAdapter._netOperatorEnvelope.operationEngineIntegration, 'grid-export-limit-active');
  assert.equal(runtimeAdapter._netOperatorEnvelope.allowedExportPowerW, 18000);
  assert.equal(runtimeAdapter._netOperatorEnvelope.fallbackExportPowerW, 12000);
  assert.equal(runtimeAdapter._netOperatorEnvelope.soleAssetWriter, 'gridConstraints.exportGuard');
  assert.equal(runtimeAdapter._netOperatorEnvelope.readOnly, true);
  assert.equal(runtimeAdapter._netOperatorEnvelope.hardwareWrite, false);
  assert.ok(runtimeAdapter._netOperatorEnvelope.validUntil > runtimeAdapter._netOperatorEnvelope.lastUpdate);
  assert.equal(runtimeAdapter.foreignWrites.length, 0);
  assert.equal(runtimeAdapter.states.get('netoperator.commandBinding').val, true);
  assert.equal(runtimeAdapter.states.get('netoperator.operationEngineIntegration').val, 'grid-export-limit-active');
  netOperator.stop();

  // Prozentvorgaben werden bereits an der externen Schnittstelle auf Watt
  // standardisiert, damit nachgelagerte Logik keine Herstellersemantik raten muss.
  const percentAdapter = new FakeAdapter(activeConfig(), {
    'plant.enable': state(true, plantNow),
    'plant.trip': state(false, plantNow),
    'plant.release': state(true, plantNow),
    'plant.pTargetPct': state(40, plantNow),
    'plant.status': state('ready', plantNow),
    'plant.commOk': state(true, plantNow),
    'plant.timestamp': state(plantNow, plantNow),
    'plant.source': state('Certified-EZA-Percent', plantNow),
  });
  const percentInterface = new NetOperatorInterfaceModule(percentAdapter, null);
  await percentInterface.init();
  await percentInterface.tick();
  assert.equal(percentAdapter._netOperatorEnvelope.allowedExportPowerW, 20000);
  assert.equal(percentAdapter.states.get('netoperator.allowedExportPowerW').val, 20000);
  assert.equal(percentAdapter.states.get('netoperator.commandBinding').val, true);
  assert.equal(percentAdapter.foreignWrites.length, 0);
  percentInterface.stop();

  // Eine reine Q-Vorgabe ist im Rohvertrag bindend, darf im Export-Limit aber
  // nicht als aktive Wirkleistungsgrenze angezeigt oder ausgewertet werden.
  const reactiveAdapter = new FakeAdapter(activeConfig(), {
    'plant.enable': state(true, plantNow),
    'plant.trip': state(false, plantNow),
    'plant.release': state(true, plantNow),
    'plant.qTargetKvar': state(25, plantNow),
    'plant.status': state('ready', plantNow),
    'plant.commOk': state(true, plantNow),
    'plant.timestamp': state(plantNow, plantNow),
    'plant.source': state('Certified-EZA-Q', plantNow),
  });
  const reactiveInterface = new NetOperatorInterfaceModule(reactiveAdapter, null);
  await reactiveInterface.init();
  await reactiveInterface.tick();
  assert.equal(reactiveAdapter._netOperatorEnvelope.command.action, 'reactive-power-constraint');
  assert.equal(reactiveAdapter._netOperatorEnvelope.allowedExportPowerW, null);
  assert.equal(reactiveAdapter.states.get('netoperator.commandBinding').val, false);
  assert.equal(reactiveAdapter.foreignWrites.length, 0);
  reactiveInterface.stop();

  // 9. Statische Verträge: standardisierte Felder, eindeutiger Writer und UI-Freigaben.
  const gridSource = read('src-ts/runtime-executables/ems/modules/grid-constraints.ts');
  const netSource = read('src-ts/runtime-executables/ems/modules/netoperator-interface.ts');
  const appCenterSource = read('src-ts/runtime-executables/www/netoperator-appcenter.ts');
  const netOperatorUi = read('src-ts/runtime-executables/www/netoperator.ts');
  const emsAppsSource = read('src-ts/runtime-executables/www/ems-apps.ts');
  for (const token of [
    'allowedExportPowerW', 'validUntil', 'source', 'quality', 'lastUpdate', 'fallbackExportPowerW',
    'soleAssetWriter', 'gridConstraints.exportGuard', 'decisionAuditJson', 'auditHeadHash',
  ]) {
    assert(gridSource.includes(token) || netSource.includes(token), `RC93-Vertrag fehlt: ${token}`);
  }
  assert(gridSource.includes('this.adapter._netOperatorEnvelope'));
  assert(gridSource.includes("verified.length\n                ? String(verified[verified.length - 1].hash || '')"), 'Audit-Head darf nur auf verifizierte Einträge zeigen');
  assert(netSource.includes('const operationalExportBinding = externalExportLimitEligible'));
  assert(netSource.includes("canonicalValue(snapshot, 'grid.p.target_pct')"));
  assert(!netSource.includes('setForeignStateAsync('), 'Netzbetreiber-Modul enthält einen verbotenen Fremd-State-Write');
  assert(appCenterSource.includes('vorhandene Export Guard bleibt alleiniger Asset-Writer'));
  assert(appCenterSource.includes('netopLastValidHoldSec'));
  assert(emsAppsSource.includes('Lokale Sicherheitsobergrenze Einspeisung'));
  assert(emsAppsSource.includes('Rückfallgrenze bei Reglerausfall'));
  assert(netOperatorUi.includes('allowedExportPowerW'));

  console.log('[rc93-certified-export-authority] OK: EZA-/Parkregler-Priorität, alleiniger Export-Guard-Writer, lokale Obergrenze, TTL/Fail-Safe, Senkenfolge und Hash-Audit geprüft.');
}

main().catch((error) => {
  console.error('[rc93-certified-export-authority] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
