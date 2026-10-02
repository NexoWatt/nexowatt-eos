#!/usr/bin/env node
'use strict';

/**
 * Regression 0.8.124: Herstellerunabhängiger AppCenter-Ausgangsvertrag.
 *
 * Jeder manuell zugeordnete beschreibbare DP muss
 * 1) unverändert in der zentralen Owner-/Konfliktmatrix erscheinen,
 * 2) über den globalen Authority-/Safety-Gate laufen,
 * 3) bei Watchdog-Ausgängen trotz unverändertem Wert erneut geschrieben werden,
 * 4) eine Arbiter-Blockade nicht als erfolgreichen Hardware-Write verbuchen.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  collectActuatorMappings,
  buildOwnerMatrix,
} = require('../ems/modules/stage-a-diagnostics');
const { DatapointRegistry } = require('../ems/datapoints');
const { GridConstraintsModule } = require('../ems/modules/grid-constraints');

const root = path.resolve(__dirname, '..');
const free = (name) => `custom-vendor.77/site-a/${name}`;

function verifyOwnerInventory() {
  const ids = {
    storageSigned: free('storage/signed-target'),
    storageCharge: free('storage/charge-target'),
    storageDischarge: free('storage/discharge-target'),
    storageRun: free('storage/external-run'),
    storageMaxCharge: free('storage/max-charge'),
    storageMaxDischarge: free('storage/max-discharge'),
    storageChargeEnable: free('storage/charge-enable'),
    storageDischargeEnable: free('storage/discharge-enable'),
    storageReserve: free('storage/reserve-soc'),
    storageLegacySigned: free('storage/legacy-power-setpoint'),
    storageLegacyCharge: free('storage/legacy-charge-setpoint'),
    storageLegacyDischarge: free('storage/legacy-discharge-setpoint'),
    e3dcMode: free('storage/e3dc-mode'),
    e3dcValue: free('storage/e3dc-value'),
    e3dcLimitsUsed: free('storage/e3dc-limits-used'),
    e3dcMaxCharge: free('storage/e3dc-max-charge'),
    e3dcMaxDischarge: free('storage/e3dc-max-discharge'),

    farmSigned: free('farm/signed-target'),
    farmCharge: free('farm/charge-target'),
    farmDischarge: free('farm/discharge-target'),

    thermalSwitch: free('thermal/switch'),
    thermalSetpoint: free('thermal/setpoint'),
    thermalSgA: free('thermal/sg-a'),
    thermalSgB: free('thermal/sg-b'),
    thermalLegacySgA: free('thermal/sg-1'),
    thermalLegacySgB: free('thermal/sg-2'),

    heatingStage1: free('heating-rod/stage-1'),
    heatingStage2: free('heating-rod/stage-2'),
    heatingLegacy: free('heating-rod/legacy-stage'),

    threshold: free('threshold/output'),
    relay: free('relay/output'),
    bhkwStart: free('bhkw/start'),
    bhkwStop: free('bhkw/stop'),
    bhkwRun: free('bhkw/run'),
    generatorStart: free('generator/start'),
    generatorStop: free('generator/stop'),
    generatorRun: free('generator/run'),

    gridFeedIn: free('grid/feed-in-limit'),
    gridLimitW: free('grid/pv-limit-w'),
    gridLimitPct: free('grid/pv-limit-pct'),
    gridStorageCommand: free('grid/storage-command'),
    gridChargingCommand: free('grid/charging-command'),
    gridFlexCommand: free('grid/flex-command'),
    gridMeshCommand: free('grid/mesh-command'),

    para14aCentral: free('para14a/central-setpoint'),
    para14aLoadSet: free('para14a/load-setpoint'),
    para14aLoadEnable: free('para14a/load-enable'),

    chargeKioskCommand: free('charge-kiosk/command'),
    meshCommand: free('mesh/command'),
    meshReceiver: free('mesh/receiver-command'),
    meshBridge: free('mesh/bridge-command'),

    smartSwitch: free('smart-home/switch'),
    smartSetpoint: free('smart-home/thermostat-setpoint'),
    logicOutput: free('logic/output'),

    evcsCurrent: free('evcs/current-a'),
    evcsPower: free('evcs/power-w'),
    evcsEnable: free('evcs/enable'),
    evcsLock: free('evcs/lock'),
    evcsPhase: free('evcs/phase'),
    evcsSoftLock: free('evcs/active-soft-lock'),
  };

  const config = {
    enableStorageControl: true,
    enableMultiUse: true,
    enableChargingManagement: true,
    enableThermalControl: true,
    enableHeatingRodControl: true,
    enableThresholdControl: true,
    enableRelayControl: true,
    enableBhkwControl: true,
    enableGeneratorControl: true,
    enableGridConstraints: true,
    enableChargeKiosk: true,
    enableMeshMicrogrid: true,
    enableNexoLogic: true,
    emsApps: { apps: { storagefarm: { installed: true, enabled: true } } },
    storage: {
      datapoints: {
        targetPowerObjectId: ids.storageSigned,
        targetChargePowerObjectId: ids.storageCharge,
        targetDischargePowerObjectId: ids.storageDischarge,
        runObjectId: ids.storageRun,
        maxChargeObjectId: ids.storageMaxCharge,
        maxDischargeObjectId: ids.storageMaxDischarge,
        chargeEnableObjectId: ids.storageChargeEnable,
        dischargeEnableObjectId: ids.storageDischargeEnable,
        reserveSocObjectId: ids.storageReserve,
        e3dcSetPowerModeObjectId: ids.e3dcMode,
        e3dcSetPowerValueObjectId: ids.e3dcValue,
        e3dcPowerLimitsUsedObjectId: ids.e3dcLimitsUsed,
        e3dcMaxChargePowerObjectId: ids.e3dcMaxCharge,
        e3dcMaxDischargePowerObjectId: ids.e3dcMaxDischarge,
      },
      // Legacy-only aliases are intentionally present beside current mappings.
      powerSetpointId: ids.storageLegacySigned,
      chargeSetpointId: ids.storageLegacyCharge,
      dischargeSetpointId: ids.storageLegacyDischarge,
    },
    storageFarm: {
      storages: [{
        id: 'farm-a', enabled: true,
        setSignedPowerId: ids.farmSigned,
        setChargePowerId: ids.farmCharge,
        setDischargePowerId: ids.farmDischarge,
      }],
    },
    thermal: {
      devices: [{
        id: 't1', enabled: true,
        switchWriteId: ids.thermalSwitch,
        setpointWriteId: ids.thermalSetpoint,
        sgReadyAWriteId: ids.thermalSgA,
        sgReadyBWriteId: ids.thermalSgB,
        sgReady1WriteId: ids.thermalLegacySgA,
        sgReady2WriteId: ids.thermalLegacySgB,
      }],
    },
    heatingRod: {
      devices: [{
        id: 'hr1', enabled: true,
        stages: [
          { writeId: ids.heatingStage1 },
          { dpWriteId: ids.heatingStage2 },
          { writeDp: ids.heatingLegacy },
        ],
      }],
    },
    threshold: { rules: [{ idx: 1, enabled: true, outputObjectId: ids.threshold }] },
    relay: { relays: [{ idx: 1, enabled: true, writeId: ids.relay }] },
    bhkw: { devices: [{ idx: 1, enabled: true, startWriteId: ids.bhkwStart, stopWriteId: ids.bhkwStop, runWriteId: ids.bhkwRun }] },
    generator: { devices: [{ idx: 1, enabled: true, startObjectId: ids.generatorStart, stopObjectId: ids.generatorStop, runObjectId: ids.generatorRun }] },
    gridConstraints: {
      pvFeedInLimitWId: ids.gridFeedIn,
      pvLimitWId: ids.gridLimitW,
      pvLimitPctId: ids.gridLimitPct,
      zeroExportStorageChargeCommandStateId: ids.gridStorageCommand,
      zeroExportChargingCommandStateId: ids.gridChargingCommand,
      zeroExportFlexLoadCommandStateId: ids.gridFlexCommand,
      zeroExportMeshCommandStateId: ids.gridMeshCommand,
    },
    installerConfig: { para14a: true, para14aEmsSetpointWId: ids.para14aCentral },
    para14a: { enabled: true, loads: [{ id: 'load1', enabled: true, setWId: ids.para14aLoadSet, enableId: ids.para14aLoadEnable }] },
    chargeKiosk: { enabled: true, stations: [{ id: 'dc1', enabled: true, commandStateId: ids.chargeKioskCommand }] },
    meshMicrogrid: {
      enabled: true,
      commandStateDp: ids.meshCommand,
      receiver: { localCommandStateDp: ids.meshReceiver },
      localBridgeMappings: [{ id: 'bridge1', commandStateDp: ids.meshBridge }],
    },
    smartHomeConfig: {
      devices: [{
        id: 'room1',
        io: {
          switch: { writeId: ids.smartSwitch },
          rtr: { setId: ids.smartSetpoint },
        },
      }],
    },
    logicEditor: {
      graphs: [{ id: 'g1', enabled: true, nodes: [{ id: 'n1', type: 'dp_out', enabled: true, params: { dpId: ids.logicOutput, ack: false } }] }],
    },
  };

  const evcsList = [
    {
      index: 1, enabled: true,
      setCurrentAId: ids.evcsCurrent,
      setPowerWId: ids.evcsPower,
      enableWriteId: ids.evcsEnable,
      lockWriteId: ids.evcsLock,
      phaseSwitchId: ids.evcsPhase,
      rfidReadId: free('evcs/rfid-read'),
      activeId: free('evcs/status-active-not-output'),
    },
    {
      index: 2, enabled: true,
      setCurrentAId: free('evcs2/current-a'),
      rfidReadId: free('evcs2/rfid-read'),
      activeId: ids.evcsSoftLock,
    },
  ];

  const mappings = collectActuatorMappings(config, evcsList);
  const mappedIds = new Set(mappings.map((row) => row.objectId));
  for (const [name, id] of Object.entries(ids)) {
    assert(mappedIds.has(id), `Beschreibbarer AppCenter-DP fehlt in Owner-/Gate-Matrix: ${name} => ${id}`);
  }
  assert(!mappedIds.has(evcsList[0].activeId), 'EVCS activeId darf bei eigenem lockWriteId nicht fälschlich als Ausgang gelten');

  const duplicate = free('conflict/shared-output');
  const matrix = buildOwnerMatrix(collectActuatorMappings({
    enableStorageControl: true,
    enableThermalControl: true,
    storage: { datapoints: { targetPowerObjectId: duplicate } },
    thermal: { devices: [{ id: 't1', enabled: true, switchWriteId: duplicate }] },
  }, []));
  const conflict = matrix.find((row) => row.objectId === duplicate);
  assert(conflict && conflict.conflict === true, 'Echte Doppelbelegung wird von der Owner-Matrix nicht als aktiver Konflikt erkannt');
  assert(conflict.activeOwners.some((owner) => owner.startsWith('storage.')));
  assert(conflict.activeOwners.some((owner) => owner.startsWith('thermal.')));

  return { outputCount: Object.keys(ids).length, mappingCount: mappings.length };
}

async function verifyDatapointKeepalive() {
  const writes = [];
  const adapter = {
    log: { warn() {}, debug() {}, info() {}, error() {} },
    async getForeignObjectAsync() { return { type: 'state', common: { unit: '' }, native: {} }; },
    async getForeignStateAsync() { return null; },
    async setForeignStateAsync(id, value, ack) { writes.push({ id, value, ack, ts: Date.now() }); return undefined; },
    subscribeForeignStates() {},
  };
  const dp = new DatapointRegistry(adapter, []);
  const boolId = free('watchdog/run');
  const numberId = free('watchdog/target');
  await dp.upsert({ key: 'watchdog.run', objectId: boolId, dataType: 'boolean', direction: 'out', maxWriteIntervalMs: 900 });
  await dp.upsert({ key: 'watchdog.target', objectId: numberId, dataType: 'number', direction: 'out', deadband: 0 });

  const originalNow = Date.now;
  let now = 1_000_000;
  Date.now = () => now;
  try {
    assert.strictEqual(await dp.writeBoolean('watchdog.run', true), true);
    now += 500;
    assert.strictEqual(await dp.writeBoolean('watchdog.run', true), null, 'Bool-Ausgang darf vor Keepalive unnötig neu schreiben');
    now += 400;
    assert.strictEqual(await dp.writeBoolean('watchdog.run', true), true, 'Bool-Ausgang wird nach 900 ms nicht erneuert');

    assert.strictEqual(await dp.writeNumber('watchdog.target', 0), true);
    now += 100;
    assert.strictEqual(await dp.writeNumber('watchdog.target', 0), true, '0-W-Sollwert mit deadband=0 muss als echter Keepalive geschrieben werden');
  } finally {
    Date.now = originalNow;
  }

  assert.strictEqual(writes.filter((row) => row.id === boolId).length, 2);
  assert.strictEqual(writes.filter((row) => row.id === numberId).length, 2);
}

async function verifyBlockedNeutralCommand() {
  const blocked = {
    __nexowattActuatorAuthorityBlocked: true,
    targetId: free('grid/storage-command'),
    owner: 'gridConstraints',
    blockedByOwner: 'para14a',
    blockedByPriority: 950,
    reason: 'active safety authority',
  };
  const adapter = {
    config: { gridConstraints: {} },
    log: { warn() {}, debug() {}, info() {}, error() {} },
    async setForeignStateAsync() { return blocked; },
    async setStateAsync() { throw new Error('local fallback must not be used'); },
  };
  const mod = new GridConstraintsModule(adapter, null);
  const result = await mod._writeZeroExportSinkCommands({
    order: ['storageCharge'],
    nextAction: 'storageCharge',
    commandEnvelope: {
      commands: [{
        sink: 'storageCharge',
        label: 'Speicher laden',
        requestedPowerW: 1200,
        commandStateId: blocked.targetId,
      }],
    },
  }, { exportOverLimitW: 1200, currentExportW: 1200, maxFeedInW: 0 });

  assert.strictEqual(result.writtenCount, 0, 'Arbiter-blockierter Command-State wurde als geschrieben gezählt');
  assert.strictEqual(result.blockedCount, 1);
  assert.strictEqual(result.status, 'blocked');
  assert.strictEqual(result.results[0].status, 'blocked-by-actuator-authority');
  assert.strictEqual(result.results[0].blockedByOwner, 'para14a');
}

function verifyGatePlumbing() {
  const moduleManager = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/module-manager.ts'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/main.ts'), 'utf8');
  const storage = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/storage-control.ts'), 'utf8');
  const engine = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/engine.ts'), 'utf8');

  assert(moduleManager.includes("reason: 'module-tick'"), 'EMS-Modul-Ticks laufen nicht durch den zentralen Actuator-Kontext');
  assert(moduleManager.includes('withActuatorShadowContext(this.adapter'), 'Module sind nicht an den zentralen Authority-Gate gekoppelt');
  assert(main.includes('buildHttpActuatorShadowContext'), 'AppCenter-/VIS-HTTP-Schreibpfade besitzen keinen zentralen Gate-Kontext');
  assert(main.includes('isActuatorAuthorityBlockedResult(writeResult)'), 'Farm-Executor erkennt eine Arbiter-Blockade nicht');
  assert(main.includes("error: 'blocked_by_actuator_authority'"), 'HTTP-/Schnellsteuerungen propagieren Authority-Blockaden nicht');
  assert(main.includes('const stageWriteResult = await this.setForeignStateAsync(objectId, raw, false);'), 'Heizstab-Schnellstufen umgehen die Blockade-Auswertung');
  assert(main.includes('const sgBlocked = sgWrites.filter'), 'SG-Ready-Schnellsteuerung wertet Gate-Blockaden nicht aus');
  const mesh = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/mesh-microgrid.ts'), 'utf8');
  assert(mesh.includes('blocked-by-actuator-authority'), 'Mesh-Command-States propagieren Authority-Blockaden nicht');
  assert(mesh.includes("if (!anyAuthorityBlock && effectiveStatus !== 'error') this._lastCommandHash = hash;"), 'Blockierte Mesh-Commands werden fälschlich gecacht');
  assert(engine.includes('clampNumber(cfgInterval, 250, 1000, 1000)'), 'EMS-Tick kann weiterhin langsamer als 1 s konfiguriert werden');
  assert(storage.includes('validateSingleConfig: validateFeneconSingleConfig'), 'FENECON-Hybrid besitzt keine zentrale Einzelkonfigurationsvalidierung');
  assert(main.includes('nwValidateFeneconSingleConfig'), 'AppCenter-Speichern validiert den FENECON-Einzelpfad nicht zentral');
  assert(storage.includes("'fenecon-config-invalid'"), 'Ungültige FENECON-Kommandorollen werden im Runtime-Writer nicht fail-safe blockiert');
  assert(storage.includes("this.dp.getEntry('st.feneconEssActualPowerW')"), 'FENECON-Hybrid verwendet keine eigene AC-ESS-Aktor-Rückmeldung');
  assert(!storage.includes('_handleFeneconHybridPassThrough'), 'Der veraltete PV-/Tag-No-Write-Pfad ist noch produktiv verdrahtet');
  assert(!main.includes('hybridAutoFeneconRows'), 'Die Speicherfarm enthält noch die veraltete PV-/Tag-Reglerhoheit');
  assert(storage.includes("storageZeroWriteStatus = 'write-fenecon-eos-idle-keepalive'"),
    'FENECON unter EOS-Regelhoheit besitzt keinen expliziten 0-W-Leerlauf-Keepalive');
  assert(storage.includes("'no-write-fems-idle'"),
    'FENECON unter FEMS-Regelhoheit trennt Leerlauf nicht als echten No-Write vom EOS-Keepalive');
  assert(storage.includes("'write-zero-override'"),
    'Ein echter Sicherheits-/Sperr-0-W-Befehl kann die FEMS-No-Write-Phase nicht explizit übersteuern');
}

(async () => {
  const inventory = verifyOwnerInventory();
  await verifyDatapointKeepalive();
  await verifyBlockedNeutralCommand();
  verifyGatePlumbing();
  console.log(`[appcenter-writable-dp-contract] OK: ${inventory.outputCount} freie AppCenter-Ausgänge sind inventarisiert, gegatet und watchdog-/blockadefest.`);
})().catch((error) => {
  console.error('[appcenter-writable-dp-contract] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
