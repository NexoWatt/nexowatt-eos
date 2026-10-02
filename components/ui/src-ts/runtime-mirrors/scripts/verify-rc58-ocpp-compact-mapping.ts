// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-rc58-ocpp-compact-mapping.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-rc58-ocpp-compact-mapping.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Produktive Originalquellen liegen unter
 * src-ts/runtime-executables/ bzw. den im generierten JS genannten TS-Pfaden.
 * Dort ändern, Laufzeit erzeugen und danach die Spiegel synchronisieren.
 * Build-/Prüfskripte ohne TS-Original werden weiterhin unter scripts/ gepflegt.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: 715fcc25f1f6cce3e544217a62bf6a8a72f42b4d9a466ed44658c3dee213a34c
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

'use strict';

// Historical RC58 regression entry point. RC59 intentionally supersedes the
// alias-first contract with the native OCPP21 0.4 datapoint tree. The script is
// retained because it is part of the long-running release suite and now checks
// that old RC58 mappings migrate safely to the new native contract.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  inferOcppConnectorNoFromObjectId,
  inferIoBrokerOcppConnectorContext,
  belongsToOcppConnectorContext,
  isKnownOcppSemanticObjectId,
  resolveOcppCanonicalObjectId,
} = require('../ems/modules/charging-management');

const native = inferIoBrokerOcppConnectorContext('ocpp21.0.CP_01.measurements.powerW');
assert.equal(native.detected, true);
assert.equal(native.contractVersion, 'nexowatt-ocpp21-0.4-native');
assert.equal(native.adapterKind, 'nexowatt-ocpp21-native-compact');
assert.equal(native.actualPowerId, 'ocpp21.0.CP_01.measurements.powerW');
assert.equal(native.actualCurrentId, 'ocpp21.0.CP_01.measurements.currentA');
assert.equal(native.energyTotalId, 'ocpp21.0.CP_01.measurements.energyKWh');
assert.equal(native.energyTotalWhId, 'ocpp21.0.CP_01.measurements.energyWh');
assert.equal(native.vehicleSocId, 'ocpp21.0.CP_01.measurements.socPercent');
assert.equal(native.statusId, 'ocpp21.0.CP_01.info.status');
assert.equal(native.transactionActiveId, 'ocpp21.0.CP_01.transactions.transactionActive');
assert.equal(native.socketConnectedId, 'ocpp21.0.CP_01.info.socketConnected');
assert.equal(native.dataFreshId, 'ocpp21.0.CP_01.health.dataFresh');
assert.equal(native.heartbeatId, 'ocpp21.0.CP_01.health.lastSeenMs');
assert.equal(native.setPowerId, 'ocpp21.0.CP_01.control.chargeLimit');
assert.equal(native.availabilityId, 'ocpp21.0.CP_01.control.availability');
assert.equal(native.rfidId, 'ocpp21.0.CP_01.info.rfid');

const publicAlias = inferIoBrokerOcppConnectorContext('alias.0.nexowatt.ocpp.0.CP_01.powerW');
assert.equal(publicAlias.adapterKind, 'nexowatt-ocpp21-alias-migration');
assert.equal(publicAlias.actualPowerId, native.actualPowerId);
assert.equal(publicAlias.energyTotalId, native.energyTotalId);
assert.equal(publicAlias.statusId, native.statusId);
assert.equal(publicAlias.vehicleSocId, native.vehicleSocId);
assert.equal(publicAlias.rfidId, native.rfidId);
assert.equal(publicAlias.availabilityId, native.availabilityId);
assert.equal(publicAlias.heartbeatId, native.heartbeatId);

const technicalAlias = inferIoBrokerOcppConnectorContext('alias.0.ocpp21.0.CP_01.powerW');
assert.equal(technicalAlias.adapterKind, 'nexowatt-ocpp21-alias-migration');
assert.equal(technicalAlias.nativeDeviceRoot, native.nativeDeviceRoot);
assert.equal(technicalAlias.setPowerId, native.setPowerId);

assert.equal(inferOcppConnectorNoFromObjectId('ocpp21.0.CP_01.connectors.1_2.status'), 2);
const connector2 = inferIoBrokerOcppConnectorContext('ocpp21.0.CP_01.connectors.1_2.status');
assert.equal(connector2.connectorDetails, true);
assert.equal(connector2.evseNo, 1);
assert.equal(connector2.connectorNo, 2);
assert.equal(connector2.statusId, 'ocpp21.0.CP_01.connectors.1_2.status');

const migrations = [
  ['power', 'ocpp21.0.CP_01.meterValues.Power_Active_Import', native.actualPowerId],
  ['power', 'alias.0.nexowatt.ocpp.0.CP_01.powerW', native.actualPowerId],
  ['current', 'ocpp21.0.CP_01.meterValues.Current_Import', native.actualCurrentId],
  ['energy', 'ocpp21.0.CP_01.meterValues.Energy_Active_Import_Register_kWh', native.energyTotalId],
  ['status', 'ocpp21.0.CP_01.evse.1.connector.1.status', native.statusId],
  ['transactionActive', 'alias.0.nexowatt.ocpp.0.CP_01.txActive', native.transactionActiveId],
  ['online', 'alias.0.nexowatt.ocpp.0.CP_01.socketConnected', native.socketConnectedId],
  ['dataFresh', 'alias.0.nexowatt.ocpp.0.CP_01.dataFresh', native.dataFreshId],
  ['heartbeat', 'ocpp21.0.CP_01.health.lastSeenMs', native.heartbeatId],
  ['setPower', 'alias.0.nexowatt.ocpp.0.CP_01.chargeLimit', native.setPowerId],
  ['enable', 'alias.0.nexowatt.ocpp.0.CP_01.availability', native.availabilityId],
  ['vehicleSoc', 'ocpp21.0.CP_01.meterValues.SoC', native.vehicleSocId],
  ['rfid', 'alias.0.nexowatt.ocpp.0.CP_01.rfid', native.rfidId],
];
for (const [semantic, source, expected] of migrations) {
  assert.equal(isKnownOcppSemanticObjectId(source, native, semantic), true, `${semantic} legacy source must be known`);
  assert.equal(resolveOcppCanonicalObjectId(source, native, semantic), expected, `${semantic} must migrate to native contract`);
}
assert.equal(
  resolveOcppCanonicalObjectId('mqtt.0.wallbox.power', native, 'power'),
  'mqtt.0.wallbox.power',
  'Unrelated custom mappings must remain untouched',
);
assert.equal(
  resolveOcppCanonicalObjectId('ocpp21.0.OTHER.meterValues.Power_Active_Import', native, 'power'),
  'ocpp21.0.OTHER.meterValues.Power_Active_Import',
  'Another OCPP station must never be silently rewritten',
);
assert.equal(belongsToOcppConnectorContext('alias.0.nexowatt.ocpp.0.CP_01.powerW', native), true);

const root = path.resolve(__dirname, '..');
const chargingSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/charging-management.ts'), 'utf8');
const engineSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/engine.ts'), 'utf8');
const mainSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/main.ts'), 'utf8');
const uiSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/www/ems-apps.ts'), 'utf8');

for (const marker of [
  "contractVersion: 'nexowatt-ocpp21-0.4-native'",
  "`${nativeDeviceRoot}.measurements.powerW`",
  "`${nativeDeviceRoot}.measurements.energyKWh`",
  "`${nativeDeviceRoot}.measurements.socPercent`",
  'function resolveOcppCanonicalObjectId(configuredObjectId, ocppContext, semantic)',
  "mappingIssues.push('ocpp21_native_mapping_migrated')",
  'ocppDatapointMappingMigrations: Array.isArray(ocppDatapointMigrations)',
]) assert(chargingSource.includes(marker), `Charging source marker missing: ${marker}`);

for (const marker of [
  "getForeignObjectsAsync('ocpp21.*', 'state')",
  "discoveryContract: 'nexowatt-ocpp21-0.4-native'",
  "vehicleSocId: compactPick(nativeId('measurements.socPercent')",
  "rfidReadId: compactPick(nativeId('info.rfid'))",
  "enableWriteId: compactPick(nativeId('control.availability'))",
]) assert(mainSource.includes(marker), `Discovery source marker missing: ${marker}`);

const directDiscoveryBlock = mainSource.slice(
  mainSource.indexOf('// NexoWatt EOS uses the native compact datapoint contract'),
  mainSource.indexOf('let objects = {};', mainSource.indexOf('// NexoWatt EOS uses the native compact datapoint contract')),
);
assert(!directDiscoveryBlock.includes("'alias.0.nexowatt.ocpp.*'"));
assert(!directDiscoveryBlock.includes("'alias.0.ocpp21.*'"));

for (const marker of [
  "'vehicleSocId','rfidReadId'",
  'function _isKnownLegacyNexoWattOcppMapping(',
  'Alias paths of the same station are always migrated to the direct native',
  'Fremde Ladepunkte wurden nicht überschrieben',
]) assert(uiSource.includes(marker), `Frontend marker missing: ${marker}`);

for (const marker of [
  "const dataFreshId = (wb.dataFreshId || '').trim();",
  "const transactionActiveId = (wb.activeId || wb.transactionActiveId || '').trim();",
  '...(dataFreshId ? { dataFreshId } : {}),',
  '...(transactionActiveId ? { transactionActiveId } : {}),',
]) assert(engineSource.includes(marker), `Engine propagation marker missing: ${marker}`);

console.log('[rc58-ocpp-compact-mapping] OK: historical alias/0.3 mappings migrate to the direct native OCPP21 0.4 contract.');
