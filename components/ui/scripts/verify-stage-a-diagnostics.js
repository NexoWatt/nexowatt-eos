#!/usr/bin/env node
'use strict';

/**
 * Regression 0.8.108: Stufe A ist read-only, erkennt Aktor-Doppelbelegungen,
 * trennt Messwert-/Connected-/Heartbeat-Alter und meldet NVP-Zeitversatz.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const stage = require(path.join(root, 'ems/modules/stage-a-diagnostics.js'));

function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

const config = {
  enableChargingManagement: true,
  enableThresholdControl: true,
  enableStorageControl: true,
  datapoints: {
    gridBuyPower: 'meter.import',
    gridSellPower: 'meter.export',
    gridPointConnected: 'meter.connected',
    gridPointWatchdog: 'meter.heartbeat',
    batteryPower: 'battery.actual',
  },
  chargingManagement: { wallboxes: [{ enabled: true, setPowerWId: 'shared.actor' }] },
  thresholdRules: [{ enabled: true, writeId: 'shared.actor' }],
};
const mappings = stage.collectActuatorMappings(config, []);
const matrix = stage.buildOwnerMatrix(mappings);
const shared = matrix.find((row) => row.objectId === 'shared.actor');
assert.ok(shared && shared.duplicate, 'Doppelbelegung muss erkannt werden');
assert.ok(shared.conflict, 'gleichzeitig aktive Besitzer müssen Konflikt sein');

const now = Date.now();
const states = new Map([
  ['meter.import', { val: 500, ts: now - 1000, lc: now - 1000, ack: true }],
  ['meter.export', { val: 0, ts: now - 9000, lc: now - 9000, ack: true }],
  ['meter.connected', { val: true, ts: now - 100, lc: now - 100000, ack: true }],
  ['meter.heartbeat', { val: 1, ts: now - 2000, lc: now - 2000, ack: true }],
  ['battery.actual', { val: 1200, ts: now - 500, lc: now - 500, ack: true }],
]);
const writes = [];
const adapter = {
  config,
  evcsList: [],
  log: { warn() {}, debug() {}, info() {}, error() {} },
  async setObjectNotExistsAsync(id) { assert.ok(id.startsWith('ems.diagnostics.stageA.'), `unerlaubtes Diagnoseobjekt: ${id}`); },
  async setStateAsync(id, value) { writes.push({ id, value }); assert.ok(id.startsWith('ems.diagnostics.stageA.'), `unerlaubter Write: ${id}`); },
  async getStateAsync() { return null; },
  async getForeignStateAsync(id) { return states.get(id) || null; },
  _actuatorShadowArbiter: {
    snapshot() {
      return {
        active: true,
        mode: 'shadow-read-only',
        behaviorChanged: false,
        requestsTotal: 2,
        recentWriteCount: 2,
        activeConflictCount: 1,
        activeConflicts: [{ targetId: 'runtime.shared.actor', owners: ['storage', 'peakShaving'], values: [4200, 0] }],
        lastWrite: { targetId: 'runtime.shared.actor', owner: 'peakShaving', value: 0 },
      };
    },
  },
  _nwGetStorageFarmRuntimeInfo() { return { active: false, configuredCount: 0 }; },
  _nwResolveBatteryFlowFromCache() { return { src: 'batterySigned' }; },
  _nvpFreshnessSnapshot: {
    ts: now, mode: 'split', status: 'degraded', source: 'split-newer-import',
    usable: true, coherent: false, connected: true, skewMs: 8000,
    measurementAgeMs: 1000, heartbeatAgeMs: 2000, reason: 'split-skew>5000ms',
  },
};

(async () => {
  const mod = new stage.StageADiagnosticsModule(adapter, null);
  await mod.init();
  assert.ok(adapter._stageADiagnostics, 'Snapshot muss am Adapter bereitstehen');
  assert.strictEqual(adapter._stageADiagnostics.nvp.mode, 'split');
  assert.strictEqual(adapter._stageADiagnostics.nvp.coherent, false, '9-s-Zeitversatz muss inkohärent sein');
  assert.ok(adapter._stageADiagnostics.concurrentControlPathsCount >= 1, 'statischer Aktorkonflikt muss gezählt werden');
  assert.strictEqual(adapter._stageADiagnostics.shadowWriteConflictCount, 1, 'Laufzeit-Schreibkonflikt muss gezählt werden');
  assert.strictEqual(adapter._stageADiagnostics.activeActuatorConflictCount, 2, 'Statische und Laufzeitkonflikte müssen kompakt zusammengeführt werden');
  assert.ok(writes.length > 0, 'Diagnose muss eigene States schreiben');

  const main = read('src-ts/runtime-executables/main.ts');
  const ui = read('src-ts/runtime-executables/www/ems-apps.ts');
  assert.ok(main.includes("lower.startsWith('ems.diagnostics.stagea.')"), 'öffentlicher Snapshot muss Stage-A-Objektpfade sperren');
  assert.ok(main.includes('stageA: this._stageADiagnostics || null'), 'Installerdiagnose muss Stage-A-Snapshot liefern');
  assert.ok(ui.includes('EMS Überwachung'), 'AppCenter muss die kompakte EMS-Überwachung anzeigen');
  assert.ok(ui.includes('Aktor-Konflikte'), 'AppCenter muss nur eine kompakte Konfliktzeile anzeigen');
  assert.ok(!ui.includes('Stufe A – Messwert-Frische'), 'Status-Reiter darf nicht mit separaten Detailkarten überladen werden');

  // Ein durch C2 erfolgreich verhinderter Safety-Konflikt ist ein Schutzereignis,
  // aber kein dauerhafter WARN-/Fehlerzustand der kompakten EMS-Überwachung.
  const safeConfig = {
    enableStorageControl: true,
    datapoints: { gridPointPower: 'meter.signed', batteryPower: 'battery.actual' },
  };
  const safeStates = new Map([
    ['meter.signed', { val: 0, ts: now - 500, lc: now - 500, ack: true }],
    ['battery.actual', { val: 0, ts: now - 500, lc: now - 500, ack: true }],
  ]);
  const safeAdapter = {
    config: safeConfig,
    evcsList: [],
    log: { warn() {}, debug() {}, info() {}, error() {} },
    async setObjectNotExistsAsync() {},
    async setStateAsync() {},
    async getStateAsync() { return null; },
    async getForeignStateAsync(id) { return safeStates.get(id) || null; },
    _actuatorShadowArbiter: {
      snapshot() {
        return {
          active: true, mode: 'enforce-safety', behaviorChanged: true,
          requestsTotal: 2, recentWriteCount: 1, blockedWriteCount: 1,
          activeAuthorityCount: 1, preventedConflictCount: 1, unresolvedConflictCount: 0,
          preemptionsTotal: 0,
          activeAuthorities: [{ targetId: 'device.safe', owner: 'para14a', priority: 950 }],
          activeConflicts: [{ targetId: 'device.safe', owners: ['para14a', 'chargingManagement'], lastResolvedByArbiter: true }],
          blockedWrites: [{ targetId: 'device.safe', owner: 'chargingManagement', blockedByOwner: 'para14a' }],
          lastWrite: { targetId: 'device.safe', owner: 'para14a', value: 0 },
        };
      },
    },
    _nwGetStorageFarmRuntimeInfo() { return { active: false, configuredCount: 0 }; },
    _nwResolveBatteryFlowFromCache() { return { src: 'batterySigned' }; },
    _nvpFreshnessSnapshot: {
      ts: now, mode: 'signed', status: 'ok', source: 'signed', usable: true,
      coherent: true, connected: true, skewMs: 0, measurementAgeMs: 500,
      heartbeatAgeMs: 500, reason: 'fresh-signed',
    },
  };
  const safeMod = new stage.StageADiagnosticsModule(safeAdapter, null);
  await safeMod.init();
  assert.strictEqual(safeAdapter._stageADiagnostics.status, 'ok', 'Verhinderter Safety-Konflikt setzt die EMS-Überwachung unnötig auf WARN');
  assert.strictEqual(safeAdapter._stageADiagnostics.activeActuatorConflictCount, 0, 'Verhinderter Safety-Konflikt wird als offener Aktorkonflikt gezählt');
  assert.strictEqual(safeAdapter._stageADiagnostics.authorityPreventedConflictCount, 1, 'Verhinderter Safety-Konflikt fehlt in der internen Diagnose');

  console.log('[stage-a-diagnostics] OK: read-only Owner-/Frische-Diagnose ist aktiv, zentral aufgelöst und im AppCenter kompakt dargestellt.');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
