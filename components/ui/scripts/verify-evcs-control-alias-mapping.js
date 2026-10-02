#!/usr/bin/env node
'use strict';

/**
 * Regression 0.8.106:
 * - nexowatt-devices EVCS-Profile mit `targetCurrentA`/`targetPowerW` werden
 *   auch ohne erneutes manuelles AppCenter-Mapping als steuerbar erkannt.
 * - Explizite Installer-Zuordnungen bleiben unverändert.
 * - Fehlende oder nicht existierende Kandidaten werden nicht blind übernommen.
 * - Nach der Auflösung zählt die Ladeinfrastruktur alle Ports und der finale
 *   Write-Plan enthält einen echten Sollwert-Schreibauftrag.
 */
const assert = require('assert');
const path = require('path');

const root = path.resolve(__dirname, '..');
const {
  deriveNexowattDeviceBaseId,
  buildEvcsControlCandidates,
  buildEvcsTelemetryCandidates,
  normalizeEvcsChargeDemandObjectId,
  resolveEvcsControlMapping,
} = require(path.join(root, 'ems/evcs-control-mapping'));
const {
  computeChargingInfrastructureCapacity,
} = require(path.join(root, 'ems/charging-budget-helpers'));
const { EmsEngine } = require(path.join(root, 'ems/engine'));
const {
  buildChargingSetpointWritePlan,
} = require(path.join(root, 'lib/ts-mirrors/ems/charging-management/charging-write-plan'));
const {
  applyEvcsSetpoint,
} = require(path.join(root, 'ems/consumers/evcs'));

(async () => {
  const base = 'nexowatt-devices.0.devices.marius_lp2';
  assert.strictEqual(
    deriveNexowattDeviceBaseId(`${base}.aliases.r.power`),
    base,
    'Gerätebasis wird aus dem Mess-DP nicht korrekt abgeleitet.',
  );

  const candidates = buildEvcsControlCandidates(base);
  const telemetryCandidates = buildEvcsTelemetryCandidates(base);
  assert.strictEqual(candidates.current[0], `${base}.aliases.v1.ctrl.targetCurrentA`);
  assert.strictEqual(candidates.power[0], `${base}.aliases.v1.ctrl.targetPowerW`);
  assert.strictEqual(telemetryCandidates.status[0], `${base}.aliases.v1.r.mode3State`);
  assert.strictEqual(telemetryCandidates.vehicleConnected[0], `${base}.aliases.v1.r.vehicleConnected`);

  const existingWrite = new Set([
    // Versionierter Vertrag und Legacy-Pfade sind absichtlich gleichzeitig
    // vorhanden. Der stabile v1-Vertrag muss immer bevorzugt werden.
    `${base}.aliases.v1.ctrl.targetCurrentA`,
    `${base}.aliases.v1.ctrl.targetPowerW`,
    `${base}.aliases.v1.ctrl.run`,
    `${base}.aliases.ctrl.targetCurrentA`,
    `${base}.aliases.ctrl.targetPowerW`,
    `${base}.aliases.ctrl.run`,
  ]);
  const existingRead = new Set([
    `${base}.aliases.v1.r.power`,
    `${base}.aliases.v1.r.energyTotal`,
    `${base}.aliases.v1.r.mode3State`,
    `${base}.aliases.v1.r.vehicleConnected`,
    `${base}.aliases.v1.r.online`,
    `${base}.aliases.v1.r.lastSeenMs`,
  ]);
  const writeExists = async (id) => existingWrite.has(id);
  const readExists = async (id) => existingRead.has(id);

  const resolved = await resolveEvcsControlMapping({
    name: 'Marius LP2',
    enabled: true,
    powerId: `${base}.aliases.v1.r.power`,
    statusId: `${base}.aliases.v1.r.mode3State`,
    onlineId: `${base}.aliases.v1.r.online`,
    phases: 3,
    voltageV: 230,
    maxCurrentA: 16,
  }, writeExists, readExists);

  assert.strictEqual(resolved.changed, true);
  assert.strictEqual(resolved.row.setCurrentAId, `${base}.aliases.v1.ctrl.targetCurrentA`);
  assert.strictEqual(resolved.row.setPowerWId, `${base}.aliases.v1.ctrl.targetPowerW`);
  assert.strictEqual(resolved.row.enableWriteId, `${base}.aliases.v1.ctrl.run`);

  const baseOnly = await resolveEvcsControlMapping({
    baseId: base,
    name: 'Marius LP2',
    enabled: true,
  }, writeExists, readExists);
  assert.strictEqual(baseOnly.row.setCurrentAId, `${base}.aliases.v1.ctrl.targetCurrentA`);
  assert.strictEqual(baseOnly.row.setPowerWId, `${base}.aliases.v1.ctrl.targetPowerW`);
  assert.strictEqual(baseOnly.row.enableWriteId, `${base}.aliases.v1.ctrl.run`);
  assert.strictEqual(baseOnly.row.powerId, `${base}.aliases.v1.r.power`);
  assert.strictEqual(baseOnly.row.energyTotalId, `${base}.aliases.v1.r.energyTotal`);
  assert.strictEqual(baseOnly.row.energyTotalInputIsWh, true);
  assert.strictEqual(baseOnly.row.statusId, `${base}.aliases.v1.r.mode3State`);
  assert.strictEqual(baseOnly.row.vehicleConnectedId, `${base}.aliases.v1.r.vehicleConnected`);
  assert.strictEqual(baseOnly.row.onlineId, `${base}.aliases.v1.r.online`);
  assert.strictEqual(baseOnly.row.heartbeatId, `${base}.aliases.v1.r.lastSeenMs`);
  assert.strictEqual(String(baseOnly.row.chargeDemandId || ''), '', 'Beobachtungsstatus darf nicht als Ladebedarf inferiert werden.');
  assert.strictEqual(baseOnly.baseId, base);

  const observationDemand = await resolveEvcsControlMapping({
    baseId: base,
    chargeDemandId: `${base}.aliases.v1.r.charging`,
  }, writeExists, readExists);
  assert.strictEqual(String(observationDemand.row.chargeDemandId || ''), '');
  assert.strictEqual(observationDemand.ignoredObservationDemand, true);
  assert.strictEqual(normalizeEvcsChargeDemandObjectId(`${base}.aliases.v1.r.active`), '');
  assert.strictEqual(normalizeEvcsChargeDemandObjectId('custom.wallbox.transactionActive'), '');
  assert.strictEqual(
    normalizeEvcsChargeDemandObjectId('custom.wallbox.active'),
    'custom.wallbox.active',
    'Ein frei zugeordneter echter Ladebedarfs-DP mit dem Namen active darf nicht pauschal gelöscht werden.',
  );
  assert.strictEqual(
    normalizeEvcsChargeDemandObjectId('custom.wallbox.charging'),
    'custom.wallbox.charging',
    'Ein frei zugeordneter echter Ladebedarfs-DP mit dem Namen charging bleibt Installer-autorisiert.',
  );
  const explicitDemandNamedActive = await resolveEvcsControlMapping({
    baseId: base,
    chargeDemandId: 'custom.wallbox.active',
  }, writeExists, readExists);
  assert.strictEqual(explicitDemandNamedActive.row.chargeDemandId, 'custom.wallbox.active');
  assert.strictEqual(explicitDemandNamedActive.ignoredObservationDemand, false);

  const upgradedStatus = await resolveEvcsControlMapping({
    powerId: `${base}.aliases.v1.r.power`,
    statusId: `${base}.aliases.v1.r.statusCode`,
  }, writeExists, readExists);
  assert.strictEqual(upgradedStatus.row.statusId, `${base}.aliases.v1.r.mode3State`);
  assert.strictEqual(upgradedStatus.upgradedStatus, true, 'Generischer Auto-Status wird nicht auf den semantischen Mode-3-Status angehoben.');


  const otherBase = 'nexowatt-devices.0.devices.other_lp';
  const noCrossDeviceMix = await resolveEvcsControlMapping({
    powerId: `${base}.aliases.r.power`,
    statusId: `${otherBase}.aliases.r.statusCode`,
  }, async (id) => id === `${base}.aliases.v1.ctrl.targetCurrentA`
    || id === `${otherBase}.aliases.v1.ctrl.targetPowerW`, async () => false);
  assert.strictEqual(noCrossDeviceMix.row.setCurrentAId, `${base}.aliases.v1.ctrl.targetCurrentA`);
  assert.strictEqual(String(noCrossDeviceMix.row.setPowerWId || ''), '', 'Steuerpfade verschiedener Ladepunkte dürfen nicht vermischt werden.');
  assert.strictEqual(noCrossDeviceMix.baseId, base);

  const explicit = await resolveEvcsControlMapping({
    powerId: `${base}.aliases.r.power`,
    setCurrentAId: 'installer.manual.current',
    setPowerWId: 'installer.manual.power',
  }, async () => true);
  assert.strictEqual(explicit.row.setCurrentAId, 'installer.manual.current');
  assert.strictEqual(explicit.row.setPowerWId, 'installer.manual.power');

  const missing = await resolveEvcsControlMapping({
    powerId: 'other-adapter.0.power',
  }, async () => false);
  assert.strictEqual(missing.changed, false);
  assert.strictEqual(String(missing.row.setCurrentAId || ''), '');
  assert.strictEqual(String(missing.row.setPowerWId || ''), '');

  const legacyNone = await resolveEvcsControlMapping({
    powerId: `${base}.aliases.r.power`,
    setCurrentAId: `${base}.aliases.ctrl.targetCurrentA`,
    controlPreference: 'none',
  }, writeExists, readExists);
  assert.strictEqual(legacyNone.changed, true, 'Legacy-none-Migration wird nicht als Konfigurationsänderung gemeldet.');
  assert.strictEqual(legacyNone.preferenceMigrated, true);
  assert.strictEqual(legacyNone.row.controlPreference, 'auto', 'Vorhandener Sollwert-DP bleibt durch controlPreference=none versteckt deaktiviert.');

  const wallboxes = [1, 2, 3, 4].map((index) => ({
    enabled: true,
    controlBasis: 'currentA',
    setCurrentAId: `${base.replace('marius_lp2', `lp${index}`)}.aliases.ctrl.targetCurrentA`,
    phases: 3,
    voltageV: 230,
    maxA: 16,
  }));
  const infrastructure = computeChargingInfrastructureCapacity({
    wallboxes,
    fallbackPerConnectorW: 11000,
  });
  assert.strictEqual(infrastructure.wallboxCount, 4);
  assert.strictEqual(infrastructure.rawCapacityW, 44160);
  assert.strictEqual(infrastructure.effectiveCapacityW, 44160);


  const engineRows = [];
  for (let index = 1; index <= 4; index++) {
    const deviceBase = `nexowatt-devices.0.devices.lp${index}`;
    const rowResolved = await resolveEvcsControlMapping({
      index,
      name: `LP${index}`,
      enabled: true,
      baseId: deviceBase,
      powerId: `${deviceBase}.aliases.v1.r.power`,
      statusId: `${deviceBase}.aliases.v1.r.mode3State`,
      onlineId: `${deviceBase}.aliases.v1.r.online`,
      phases: 3,
      voltageV: 230,
      minCurrentA: 6,
      maxCurrentA: 16,
      maxPowerW: 11040,
      controlPreference: 'auto',
    }, async (id) => [
      `${deviceBase}.aliases.v1.ctrl.targetCurrentA`,
      `${deviceBase}.aliases.v1.ctrl.targetPowerW`,
      `${deviceBase}.aliases.v1.ctrl.run`,
    ].includes(id), async (id) => [
      `${deviceBase}.aliases.v1.r.power`,
      `${deviceBase}.aliases.v1.r.mode3State`,
      `${deviceBase}.aliases.v1.r.vehicleConnected`,
      `${deviceBase}.aliases.v1.r.online`,
      `${deviceBase}.aliases.v1.r.lastSeenMs`,
    ].includes(id));
    engineRows.push(rowResolved.row);
  }
  const engine = new EmsEngine({
    namespace: 'nexowatt-ui.0',
    evcsList: engineRows,
    config: {
      settingsConfig: { evcsMaxPowerKw: 11, stationGroups: [] },
      datapoints: {},
      chargingManagement: {},
    },
  });
  const built = engine._buildChargingConfig();
  assert.strictEqual(built.anyControl, true, 'EMS-Engine erkennt die automatisch aufgelösten Ladepunkte nicht als steuerbar.');
  assert.strictEqual(built.chargingCfg.infrastructureWallboxCount, 4);
  assert.strictEqual(built.chargingCfg.infrastructureCapacityW, 44160);
  assert.strictEqual(built.chargingCfg.wallboxes[1].controlBasis, 'auto');
  assert.strictEqual(built.chargingCfg.wallboxes[1].setCurrentAId, 'nexowatt-devices.0.devices.lp2.aliases.v1.ctrl.targetCurrentA');
  assert.strictEqual(built.chargingCfg.wallboxes[1].statusId, 'nexowatt-devices.0.devices.lp2.aliases.v1.r.mode3State');
  assert.strictEqual(built.chargingCfg.wallboxes[1].vehicleConnectedId, 'nexowatt-devices.0.devices.lp2.aliases.v1.r.vehicleConnected');

  const setAKey = 'cm.wb.lp2.setA';
  const writePlan = buildChargingSetpointWritePlan({
    wallboxes: [{
      safe: 'lp2',
      name: 'Marius LP2',
      enabled: true,
      online: true,
      controlBasis: 'currentA',
      setAKey,
      setWKey: '',
    }],
    allocationPlan: {
      wallboxes: [{
        safe: 'lp2',
        targetPowerW: 11040,
        targetCurrentA: 16,
        reason: 'LIMITED_BY_USER_LIMIT',
      }],
    },
  });
  const writeEntry = writePlan.entries.find((entry) => entry.safe === 'lp2' && entry.type === 'setpoint');
  assert(writeEntry, 'Write-Plan enthält LP2 nicht.');
  assert.strictEqual(writeEntry.writeRequired, true);
  assert.strictEqual(writeEntry.setpointKey, setAKey);
  assert.strictEqual(writeEntry.targetCurrentA, 16);

  const writes = [];
  const dp = {
    getEntry(key) {
      return key === setAKey ? { objectId: `${base}.aliases.v1.ctrl.targetCurrentA` } : null;
    },
    async writeNumber(key, value) {
      writes.push({ key, value });
      return true;
    },
  };
  const apply = await applyEvcsSetpoint(
    { adapter: { log: { debug() {} } }, dp },
    { type: 'evcs', key: 'lp2', controlBasis: 'currentA', setAKey },
    { targetW: 11040, targetA: 16, basis: 'currentA' },
  );
  assert.strictEqual(apply.applied, true);
  assert.deepStrictEqual(writes, [{ key: setAKey, value: 16 }]);

  const mainRuntime = require('fs').readFileSync(path.join(root, 'main.js'), 'utf8');
  const appCenterRuntime = require('fs').readFileSync(path.join(root, 'www/ems-apps.js'), 'utf8');
  assert(mainRuntime.includes("require('./ems/evcs-control-mapping')"), 'Adapterstart bindet die feldkompatible Mapping-Auflösung nicht ein.');
  assert(
    mainRuntime.includes("writeAlias('ctrl.currentLimitA', 'ctrl.targetCurrentA', 'ctrl.setCurrentA')")
      || mainRuntime.includes("aliases['ctrl.targetCurrentA']"),
    'Backend-Geräteerkennung kennt targetCurrentA nicht.',
  );
  assert(
    appCenterRuntime.includes("_nwGetWritableAlias(dev, 'ctrl.targetCurrentA')")
      || appCenterRuntime.includes("_nwGetAlias(dev, 'ctrl.targetCurrentA')"),
    'AppCenter-Schnellerkennung kennt targetCurrentA nicht.',
  );
  assert(
    appCenterRuntime.includes("_nwGetWritableAlias(dev, 'ctrl.targetPowerW')")
      || appCenterRuntime.includes("_nwGetAlias(dev, 'ctrl.targetPowerW')"),
    'AppCenter-Schnellerkennung kennt targetPowerW nicht.',
  );
  assert(
    appCenterRuntime.includes("_nwGetAlias(dev, 'r.mode3State')")
      && appCenterRuntime.includes("_nwGetAlias(dev, 'r.mode3Code')")
      && appCenterRuntime.includes("_nwGetAlias(dev, 'r.evState')"),
    'AppCenter-Schnellerkennung priorisiert die universellen Mode-3-/EV-Zustände nicht.',
  );
  assert(!appCenterRuntime.includes('<option value="none">none</option>'), 'AppCenter bietet den versteckten zweiten Ladepunkt-Abschalter weiterhin an.');
  assert(mainRuntime.includes("controlPreferenceToken === 'none' || controlPreferenceToken === 'off'"), 'Backend migriert alte controlPreference=none/off-Konfigurationen nicht.');

  console.log('[evcs-control-alias-mapping] OK: NexoWatt-Devices EVCS-Telemetrie und -Steuerung werden aus einem stabilen Gerätevertrag aufgelöst.');
})().catch((error) => {
  console.error('[evcs-control-alias-mapping] FAILED:', error && error.stack ? error.stack : error);
  process.exit(1);
});
