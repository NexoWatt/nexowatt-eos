#!/usr/bin/env node
'use strict';

/**
 * Regression 0.8.124: Herstellerunabhängiger AppCenter-Aktorvertrag.
 *
 * Jede im AppCenter manuell zugeordnete beschreibbare Objekt-ID muss
 * 1. unverändert in der Runtime ankommen,
 * 2. in der zentralen Owner-/Konfliktmatrix auftauchen und
 * 3. über den Modul-/Aktor-Gate-Pfad geschrieben werden.
 *
 * Fachlich absichtliche Ausnahmen bleiben sichtbar und sicher:
 * - §14a schreibt standardmäßig als zentraler Constraint; Direktwrites sind opt-in.
 * - MultiUse-Flexverbraucher sind nur im expliziten Legacy-Migrationsmodus aktiv.
 * - Mesh/Kiosk schreiben neutrale Command-States, keine Hersteller-Rohbefehle.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  collectActuatorMappings,
  buildOwnerMatrix,
} = require('../ems/modules/stage-a-diagnostics');
const {
  installActuatorShadowArbiter,
} = require('../ems/services/actuator-shadow-arbiter');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const need = (condition, message) => assert(condition, message);
const needAll = (source, needles, label) => {
  for (const needle of needles) need(source.includes(needle), `${label}: Vertrag fehlt: ${needle}`);
};
const verifyPair = (tsRel, jsRel, needles, label) => {
  needAll(read(tsRel), needles, `${label} (TS)`);
  needAll(read(jsRel), needles, `${label} (Runtime-JS)`);
};

// ---------------------------------------------------------------------------
// 1) Reale, frei benannte AppCenter-IDs müssen unverändert in der zentralen
//    Aktor-/Owner-Matrix erscheinen. Es gibt bewusst keine Hersteller-, Adapter-
//    oder Objektpfad-Whitelist.
// ---------------------------------------------------------------------------
const config = {
  enableChargingManagement: true,
  enableStorageControl: true,
  enableThermalControl: true,
  enableHeatingRodControl: true,
  enableThresholdControl: true,
  enableGridConstraints: true,
  enablePeakShaving: true,
  enableChargeKiosk: true,
  enableBhkwControl: true,
  enableGeneratorControl: true,
  enableRelayControl: true,
  enableMultiUse: true,
  enableMeshMicrogrid: true,
  enableNexoLogic: true,
  emsApps: { apps: { storagefarm: { installed: true, enabled: true } } },
  storage: {
    targetPowerObjectId: 'custom.vendor.ctrl.signedTarget',
    targetChargePowerObjectId: 'modbus.17.free.chargeTarget',
    targetDischargePowerObjectId: 'mqtt.0/site/storage/dischargeTarget',
    runObjectId: 'javascript.0.storage.externalControl',
    maxChargeObjectId: 'free.adapter.0.command.maxCharge',
    maxDischargeObjectId: 'another.vendor.9.limit.maxDischarge',
    chargeEnableObjectId: 'vendor.independent.chargeAllowed',
    dischargeEnableObjectId: 'vendor.independent.dischargeAllowed',
    reserveSocObjectId: 'openems.0.edge.controller.reserveSoc',
  },
  storageFarm: {
    storages: [{
      id: 'farm_free_1',
      targetPowerObjectId: 'farm.bridge.0.command.signed',
      targetChargePowerObjectId: 'farm.bridge.0.command.charge',
      targetDischargePowerObjectId: 'farm.bridge.0.command.discharge',
    }],
  },
  thermal: {
    devices: [{
      id: 'c1',
      switchWriteId: 'thermal.any.0.switch',
      setpointWriteId: 'thermal.any.0.setpoint',
      sgReadyAWriteId: 'thermal.any.0.sgReadyA',
      sgReadyBWriteId: 'thermal.any.0.sgReadyB',
    }],
  },
  heatingRod: {
    devices: [{
      id: 'c2',
      stages: [
        { writeId: 'heater.any.0.stage1' },
        { dpWriteId: 'heater.any.0.stage2' },
      ],
    }],
  },
  threshold: {
    rules: [{ idx: 1, outputId: 'rules.any.0.output' }],
  },
  peakShaving: {
    enabled: true,
    actuators: [{ id: 'load_1', setpointId: 'peak.any.0.setpoint', enableId: 'peak.any.0.enable' }],
  },
  gridConstraints: {
    inverters: [{
      id: 'inv_free_1',
      feedInLimitWId: 'inverter.any.0.feedInLimitW',
      pvLimitWId: 'inverter.any.0.pvLimitW',
      pvLimitPctId: 'inverter.any.0.pvLimitPct',
    }],
    pvFeedInLimitWId: 'legacy.grid.0.feedInLimitW',
    pvLimitWId: 'legacy.grid.0.pvLimitW',
    pvLimitPctId: 'legacy.grid.0.pvLimitPct',
  },
  chargeKiosk: {
    enabled: true,
    stations: [{ id: 'dc_1', commandStateId: 'bridge.any.0.dcCommand' }],
  },
  bhkw: {
    devices: [{ idx: 1, startWriteId: 'bhkw.any.0.start', stopWriteId: 'bhkw.any.0.stop', runWriteId: 'bhkw.any.0.run' }],
  },
  generator: {
    devices: [{ idx: 1, startWriteId: 'generator.any.0.start', stopWriteId: 'generator.any.0.stop', runWriteId: 'generator.any.0.run' }],
  },
  relay: {
    relays: [{ idx: 1, writeId: 'relay.any.0.output' }],
  },
  multiUse: {
    legacyFlexibleConsumersEnabled: true,
    consumers: [{ id: 'legacy_1', setWId: 'multiuse.any.0.setW', setAId: 'multiuse.any.0.setA' }],
  },
  meshMicrogrid: {
    enabled: true,
    commandStateDp: 'mesh.any.0.command',
    localBridge: { mappings: [{ id: 'mesh_map_1', commandStateDp: 'mesh.any.0.localCommand' }] },
  },
  installerConfig: {
    para14a: true,
    para14aConsumers: [{ id: 'hp_1', setPowerWId: 'para14a.any.0.setW', enableId: 'para14a.any.0.enable' }],
  },
  logicEditor: {
    graphs: [{
      id: 'free_graph',
      enabled: true,
      nodes: [{ id: 'free_out', type: 'dp_out', enabled: true, params: { dpId: 'logic.any.0.output', ack: false } }],
    }],
  },
};
const evcsList = [{
  index: 1,
  enabled: true,
  setCurrentAId: 'wallbox.any.0.current',
  setPowerWId: 'wallbox.any.0.power',
  enableWriteId: 'wallbox.any.0.enable',
  lockWriteId: 'wallbox.any.0.lock',
  phaseSwitchId: 'wallbox.any.0.phase',
}];

const mappings = collectActuatorMappings(config, evcsList);
const mappingById = new Map(mappings.map((row) => [row.objectId, row]));
const expectedOwners = {
  'custom.vendor.ctrl.signedTarget': 'storage.',
  'modbus.17.free.chargeTarget': 'storage.',
  'mqtt.0/site/storage/dischargeTarget': 'storage.',
  'javascript.0.storage.externalControl': 'storage.',
  'free.adapter.0.command.maxCharge': 'storage.',
  'another.vendor.9.limit.maxDischarge': 'storage.',
  'vendor.independent.chargeAllowed': 'storage.',
  'vendor.independent.dischargeAllowed': 'storage.',
  'openems.0.edge.controller.reserveSoc': 'storage.',
  'farm.bridge.0.command.signed': 'storageFarm.',
  'farm.bridge.0.command.charge': 'storageFarm.',
  'farm.bridge.0.command.discharge': 'storageFarm.',
  'wallbox.any.0.current': 'charging.lp1',
  'wallbox.any.0.power': 'charging.lp1',
  'wallbox.any.0.enable': 'charging.lp1',
  'wallbox.any.0.lock': 'charging.lp1',
  'wallbox.any.0.phase': 'charging.lp1',
  'thermal.any.0.switch': 'thermal.',
  'thermal.any.0.setpoint': 'thermal.',
  'thermal.any.0.sgReadyA': 'thermal.',
  'thermal.any.0.sgReadyB': 'thermal.',
  'heater.any.0.stage1': 'heatingRod.',
  'heater.any.0.stage2': 'heatingRod.',
  'rules.any.0.output': 'threshold.',
  'peak.any.0.setpoint': 'peakShaving.',
  'peak.any.0.enable': 'peakShaving.',
  'inverter.any.0.feedInLimitW': 'gridConstraints.',
  'inverter.any.0.pvLimitW': 'gridConstraints.',
  'inverter.any.0.pvLimitPct': 'gridConstraints.',
  'legacy.grid.0.feedInLimitW': 'gridConstraints.',
  'legacy.grid.0.pvLimitW': 'gridConstraints.',
  'legacy.grid.0.pvLimitPct': 'gridConstraints.',
  'bridge.any.0.dcCommand': 'chargeKiosk.',
  'bhkw.any.0.start': 'bhkw.',
  'bhkw.any.0.stop': 'bhkw.',
  'bhkw.any.0.run': 'bhkw.',
  'generator.any.0.start': 'generator.',
  'generator.any.0.stop': 'generator.',
  'generator.any.0.run': 'generator.',
  'relay.any.0.output': 'relay.',
  'multiuse.any.0.setW': 'multiUse.',
  'multiuse.any.0.setA': 'multiUse.',
  'mesh.any.0.command': 'mesh.',
  'mesh.any.0.localCommand': 'mesh.',
  'para14a.any.0.setW': 'para14a.',
  'para14a.any.0.enable': 'para14a.',
  'logic.any.0.output': 'nexoLogic.',
};
for (const [objectId, ownerPrefix] of Object.entries(expectedOwners)) {
  const row = mappingById.get(objectId);
  need(row, `Frei benannter AppCenter-DP fehlt in Owner-Matrix: ${objectId}`);
  need(row.objectId === objectId, `AppCenter-DP wurde verändert: ${objectId} -> ${row.objectId}`);
  need(row.owner.startsWith(ownerPrefix), `Falscher Gate-Owner für ${objectId}: ${row.owner}`);
}

// Echte Doppelbelegung bleibt eine Sicherheitsblockade, aber niemals ein
// Hersteller-/Pfadfilter.
const duplicateMappings = mappings.concat([
  { objectId: 'shared.any.0.output', owner: 'storage.test', path: 'config.storage', field: 'targetPowerObjectId', active: true },
  { objectId: 'shared.any.0.output', owner: 'charging.lp1', path: 'evcsList[0]', field: 'setPowerWId', active: true },
]);
const duplicate = buildOwnerMatrix(duplicateMappings).find((row) => row.objectId === 'shared.any.0.output');
need(duplicate && duplicate.conflict === true, 'Echte aktive DP-Doppelbelegung wird nicht als Sicherheitskonflikt erkannt.');

// Ein kontextloser Direktpfad (z. B. SmartHome-/Command-State-Brücke) wird über
// die Owner-Matrix ebenfalls in den zentralen Arbiter aufgenommen.
(async () => {
  const calls = [];
  const adapter = {
    namespace: 'nexowatt-ui.0',
    config: { diagnostics: { actuatorArbiterMode: 'shadow' } },
    _stageAActuatorOwnerById: {
      'relay.any.0.output': { owners: ['relay.r1'], activeOwners: ['relay.r1'] },
    },
    log: { debug() {}, info() {}, warn() {}, error() {} },
    async setForeignStateAsync(...args) { calls.push(args); return true; },
  };
  const arbiter = installActuatorShadowArbiter(adapter);
  await adapter.setForeignStateAsync('relay.any.0.output', true, false);
  const event = arbiter.snapshot().recentWrites.find((row) => row.targetId === 'relay.any.0.output');
  need(event && event.owner === 'relay.r1' && event.inferredOwner === true, 'Direkter AppCenter-DP-Pfad erreicht den zentralen Arbiter nicht.');
  need(calls.length === 1 && calls[0][0] === 'relay.any.0.output', 'Arbiter verändert oder verschluckt den frei zugeordneten Ziel-DP.');
  arbiter.stop();

  // -------------------------------------------------------------------------
  // 2) Statische Brückenverträge: AppCenter-Feld -> Runtime-Mapping -> Gate ->
  //    Executor. Jede Prüfung gilt für kanonische TS-Quelle und ausgeliefertes JS.
  // -------------------------------------------------------------------------
  const engineTs = read('src-ts/runtime-executables/ems/engine.ts');
  const engineJs = read('ems/engine.js');
  for (const source of [engineTs, engineJs]) {
    need(source.indexOf('installActuatorShadowArbiter(adapter)') < source.indexOf('new DatapointRegistry(adapter'), 'Aktor-Arbiter wird nicht vor der DP-Registry installiert.');
  }
  verifyPair('src-ts/runtime-executables/ems/module-manager.ts', 'ems/module-manager.js', [
    'withActuatorShadowContext',
    "reason: 'module-tick'",
    'priorityForOwner(key)',
  ], 'Zentraler Modul-Gate-Kontext');

  verifyPair('src-ts/runtime-executables/ems/modules/storage-control.ts', 'ems/modules/storage-control.js', [
    "controlMode === 'targetPower'",
    "controlMode === 'limits'",
    "controlMode === 'enableFlags'",
    "'dp-zuordnung-konflikt'",
    'feneconNoWrite = false',
  ], 'Speicher-Ausgänge/FENECON-Keepalive');

  verifyPair('src-ts/runtime-executables/ems/modules/storage-mapping.ts', 'ems/modules/storage-mapping.js', [
    'maxWriteIntervalMs: 900',
    "key: 'st.run'",
    "key: 'st.chargeEnable'",
    "key: 'st.dischargeEnable'",
  ], 'Speicher-DP-Refreshvertrag');

  verifyPair('src-ts/runtime-executables/ems/engine.ts', 'ems/engine.js', [
    'setCurrentAId', 'setPowerWId', 'enableWriteId',
    'phaseSwitchId', 'phaseFeedbackId', 'phaseSwitchValue1p', 'phaseSwitchValue3p',
    'phaseSwitchUpThresholdW', 'phaseSwitchDownThresholdW',
    'storageAssistCustomerAllowed',
  ], 'Wallbox AppCenter->Charging-Gate');

  verifyPair('src-ts/runtime-executables/ems/modules/thermal-control.ts', 'ems/modules/thermal-control.js', [
    "String(ctrl.switchWriteId || '').trim()",
    "String(ctrl.setpointWriteId || '').trim()",
    'sgReadyAWriteId', 'sgReadyBWriteId',
    "direction: 'out'",
    'withActuatorShadowContext',
  ], 'Thermik/Wärmepumpe');

  verifyPair('src-ts/runtime-executables/ems/modules/heating-rod-control.ts', 'ems/modules/heating-rod-control.js', [
    'prev.writeId || prev.dpWriteId || prev.writeDp',
    'stage.writeId',
    "direction: 'out'",
    'withActuatorShadowContext',
    "status: 'no_stage_write_dp'",
  ], 'Heizstab-Stufen');

  verifyPair('src-ts/runtime-executables/ems/modules/threshold-control.ts', 'ems/modules/threshold-control.js', [
    'r.outputId || r.outputObjectId',
    "key: `thr.${r.id}.out`",
    "direction: 'out'",
    'withActuatorShadowContext',
  ], 'Schwellwert-Ausgang');

  verifyPair('src-ts/runtime-executables/ems/modules/prime-mover-control.ts', 'ems/modules/prime-mover-control.js', [
    'row.startWriteId || row.startObjectId || row.startId',
    'row.stopWriteId || row.stopObjectId || row.stopId',
    'row.runWriteId || row.runObjectId || row.enableWriteId || row.enableId',
    'withActuatorShadowContext',
    'blocked-by-authority',
  ], 'BHKW/Generator');

  verifyPair('src-ts/runtime-executables/ems/modules/peak-shaving.ts', 'ems/modules/peak-shaving.js', [
    "setpointId: String(row.setpointId || '').trim()",
    "enableId: String(row.enableId || '').trim()",
    "direction: 'out'",
    'withActuatorShadowContext',
    "kind: 'peak-shaving-actuator'",
  ], 'Peak-Shaving-Aktoren');

  verifyPair('src-ts/runtime-executables/ems/modules/grid-constraints.ts', 'ems/modules/grid-constraints.js', [
    'feedInLimitWId', 'pvLimitWId', 'pvLimitPctId',
    "direction: 'out'",
    'this.dp.writeNumber',
  ], 'Netz-/Wechselrichter-Gates');

  verifyPair('src-ts/runtime-executables/ems/modules/para14a.ts', 'ems/modules/para14a.js', [
    'r.setPowerWId || r.setWId',
    'r.enableId || r.enableWriteId',
    "direction: 'out'",
    'para14aLegacyDirectWritesEnabled',
    "'constraint-only'", 
  ], '§14a-Constraint/Direktwrite-Vertrag');

  verifyPair('src-ts/runtime-executables/ems/modules/multi-use.ts', 'ems/modules/multi-use.js', [
    'legacyFlexibleConsumersEnabled === true',
    'r.setAId || r.setCurrentAId',
    'r.setWId || r.setPowerWId',
    "direction: 'out'",
  ], 'MultiUse-Migrationsausgänge');

  verifyPair('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'ems/modules/mesh-microgrid.js', [
    'commandStateDp',
    'fieldTestApproved',
    'setForeignStateAsync',
    'bridgeWrites',
  ], 'Mesh-Command-State-Gate');

  const mainTs = read('src-ts/runtime-executables/main.ts');
  const mainJs = read('main.js');
  for (const source of [mainTs, mainJs]) {
    needAll(source, [
      'buildHttpActuatorShadowContext',
      'withActuatorShadowContext(this, context',
      'manual.relay.r${idx}',
      "kind: 'manual-relay'",
      "kind: 'charging-rfid-lock'",
      'wb.lockWriteId',
      'commandStateId',
      '_sfWriteIfChanged',
      '900',
    ], 'Main/API/Farm-Gates');
  }

  const uiFields = [
    'targetPowerObjectId', 'targetChargePowerObjectId', 'targetDischargePowerObjectId',
    'maxChargeObjectId', 'maxDischargeObjectId', 'chargeEnableObjectId', 'dischargeEnableObjectId',
    'setCurrentAId', 'setPowerWId', 'enableWriteId', 'phaseSwitchId', 'lockWriteId',
    'switchWriteId', 'setpointWriteId', 'sgReadyAWriteId', 'sgReadyBWriteId',
    'stage.writeId', 'startWriteId', 'stopWriteId', 'runWriteId',
    'feedInLimitWId', 'pvLimitWId', 'pvLimitPctId',
    'setPowerWId', 'enableId', 'commandStateId',
  ];
  verifyPair('src-ts/runtime-executables/www/ems-apps.ts', 'www/ems-apps.js', uiFields, 'AppCenter-Schreibfeldvertrag');

  console.log(`[appcenter-writable-dp-gates] OK: ${Object.keys(expectedOwners).length} frei benannte Schreib-DPs und alle Geräte-Gate-Brücken sind vertraglich abgesichert.`);
})().catch((error) => {
  console.error('[appcenter-writable-dp-gates] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
