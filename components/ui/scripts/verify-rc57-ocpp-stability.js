#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
  inferIoBrokerOcppConnectorContext,
  isOcppDataFreshObjectId,
  isOcppVolatileOnlineObjectId,
  resolveOcppOnlineObjectId,
  resolveEvcsEffectivePower,
  resolveEvcsSetpointRefreshMs,
} = require('../ems/modules/charging-management');

const OCPP = 'ocpp-1.6-event-driven';

// Native NexoWatt OCPP 2.x/1.6 runtime contract.
const native = inferIoBrokerOcppConnectorContext(
  'ocpp21.0.CP_01.meterValues.Power_Active_Import',
);
assert.strictEqual(native.detected, true);
assert.strictEqual(native.profile, OCPP);
assert.strictEqual(native.adapterKind, 'nexowatt-ocpp21-native-compact');
assert.strictEqual(native.nativeDeviceRoot, 'ocpp21.0.CP_01');
assert.strictEqual(native.connectorRoot, 'ocpp21.0.CP_01');
assert.strictEqual(native.statusId, 'ocpp21.0.CP_01.info.status');
assert.strictEqual(native.transactionActiveId, 'ocpp21.0.CP_01.transactions.transactionActive');
assert.strictEqual(native.socketConnectedId, 'ocpp21.0.CP_01.info.socketConnected');
assert.strictEqual(native.dataFreshId, 'ocpp21.0.CP_01.health.dataFresh');
assert.strictEqual(native.actualPowerId, 'ocpp21.0.CP_01.measurements.powerW');
assert.strictEqual(native.setPowerId, 'ocpp21.0.CP_01.control.chargeLimit');

// Historical aliases are accepted only as migration input and resolve to native OCPP21 IDs.
const alias = inferIoBrokerOcppConnectorContext(
  'alias.0.nexowatt.ocpp.0.CP_01.powerW',
);
assert.strictEqual(alias.detected, true);
assert.strictEqual(alias.adapterKind, 'nexowatt-ocpp21-alias-migration');
assert.strictEqual(alias.nativeDeviceRoot, 'ocpp21.0.CP_01');
assert.strictEqual(alias.deviceRoot, 'ocpp21.0.CP_01');
assert.strictEqual(alias.statusId, 'ocpp21.0.CP_01.info.status');
assert.strictEqual(alias.socketConnectedId, 'ocpp21.0.CP_01.info.socketConnected');
assert.strictEqual(alias.dataFreshId, 'ocpp21.0.CP_01.health.dataFresh');
assert.strictEqual(alias.actualPowerId, 'ocpp21.0.CP_01.measurements.powerW');
assert.strictEqual(alias.setPowerId, 'ocpp21.0.CP_01.control.chargeLimit');

const compat = inferIoBrokerOcppConnectorContext(
  'alias.0.ocpp21.0.CP_01.powerW',
);
assert.strictEqual(compat.detected, true);
assert.strictEqual(compat.adapterKind, 'nexowatt-ocpp21-alias-migration');
assert.strictEqual(compat.nativeDeviceRoot, 'ocpp21.0.CP_01');

// Physical WebSocket connectivity must replace only volatile OCPP activity or
// freshness sources belonging to the same station. Unrelated mappings remain
// untouched.
for (const configured of [
  'ocpp21.0.CP_01.info.connection',
  'ocpp21.0.CP_01.health.online',
  'ocpp21.0.CP_01.health.dataFresh',
  'ocpp21.0.CP_01.health.powerFresh',
  'alias.0.nexowatt.ocpp.0.CP_01.connected',
  'alias.0.nexowatt.ocpp.0.CP_01.dataFresh',
  'alias.0.ocpp21.0.CP_01.connected',
]) {
  assert.strictEqual(
    isOcppVolatileOnlineObjectId(configured, native),
    true,
    `${configured} must be recognized as volatile OCPP online/freshness`,
  );
  assert.strictEqual(
    resolveOcppOnlineObjectId(configured, native),
    native.socketConnectedId,
    `${configured} must resolve to physical socketConnected`,
  );
}
assert.strictEqual(
  resolveOcppOnlineObjectId('', native),
  native.socketConnectedId,
  'Missing OCPP online mapping must use socketConnected',
);
assert.strictEqual(
  resolveOcppOnlineObjectId(native.socketConnectedId, native),
  native.socketConnectedId,
  'Already correct socketConnected mapping must remain unchanged',
);
assert.strictEqual(
  resolveOcppOnlineObjectId('mqtt.0.wallbox.connected', native),
  'mqtt.0.wallbox.connected',
  'Unrelated generic online mapping must never be rewritten',
);
assert.strictEqual(
  resolveOcppOnlineObjectId('alias.0.nexowatt.ocpp.0.OTHER.connected', native),
  'alias.0.nexowatt.ocpp.0.OTHER.connected',
  'A different OCPP station must never be silently remapped',
);
assert.strictEqual(isOcppDataFreshObjectId(native.dataFreshId, native), true);
assert.strictEqual(isOcppDataFreshObjectId('alias.0.nexowatt.ocpp.0.CP_01.dataFresh', native), true, 'Native and alias paths of the same station may be mixed during migration');
assert.strictEqual(isOcppDataFreshObjectId('mqtt.0.wallbox.dataFresh', native), false);

// OCPP event order: a fresh Charging status and a real positive meter sample
// are stronger than a transactionActive=false event that arrives a few seconds
// earlier. Terminal statuses remain authoritative zero.
{
  const delayedTransaction = resolveEvcsEffectivePower({
    telemetryProfile: OCPP,
    rawPowerW: 4380,
    rawMeterStale: true,
    online: true,
    enabled: true,
    normalizedState: 'charging',
    statusAuthoritative: true,
    transactionActive: false,
    transactionKnown: true,
    lastCommandW: 11000,
  });
  assert.strictEqual(delayedTransaction.effectivePowerW, 4380);
  assert.strictEqual(delayedTransaction.powerSource, 'ocpp-meter-charging-status-held');
  assert.strictEqual(delayedTransaction.authoritativeZero, false);

  const preparing = resolveEvcsEffectivePower({
    telemetryProfile: OCPP,
    rawPowerW: 0,
    rawMeterStale: true,
    online: true,
    enabled: true,
    normalizedState: 'ready_to_charge',
    statusAuthoritative: true,
    transactionActive: false,
    transactionKnown: true,
    lastCommandW: 11000,
  });
  assert.strictEqual(preparing.effectivePowerW, 0);
  assert.strictEqual(preparing.powerSource, 'ocpp-awaiting-transaction-zero');
  assert.strictEqual(preparing.authoritativeZero, false);
  assert.strictEqual(preparing.sessionEnded, false);

  const finished = resolveEvcsEffectivePower({
    telemetryProfile: OCPP,
    rawPowerW: 4380,
    rawMeterStale: true,
    online: true,
    enabled: true,
    normalizedState: 'finishing',
    statusAuthoritative: true,
    transactionActive: false,
    transactionKnown: true,
    lastCommandW: 11000,
  });
  assert.strictEqual(finished.effectivePowerW, 0);
  assert.strictEqual(finished.powerSource, 'ocpp-transaction-ended-zero');
  assert.strictEqual(finished.authoritativeZero, true);
  assert.strictEqual(finished.sessionEnded, true);
}

// Source-level integration contract: OCPP gets longer start/settling windows,
// but the global scheduler and the proven 45-second setpoint keepalive remain.
{
  const root = path.resolve(__dirname, '..');
  const source = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/charging-management.ts'), 'utf8');
  const mainSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/main.ts'), 'utf8');
  const uiSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/www/ems-apps.ts'), 'utf8');

  for (const marker of [
    'function belongsToOcppConnectorContext(',
    'function isOcppVolatileOnlineObjectId(objectId, ocppContext = null)',
    'function resolveOcppOnlineObjectId(configuredOnlineId, ocppContext)',
    'const setpointRefreshMs = resolveEvcsSetpointRefreshMs(',
    "const ocppStartResponseTimeoutMs = clamp(num(cfg.ocppStartResponseTimeoutSec, 75)",
    "const ocppStartSettleMs = clamp(num(cfg.ocppStartSettleSec, 60)",
    "mappingIssues.push('ocpp_online_source_migrated')",
    "await this._queueState(`${ch}.onlineSourceMigrated`",
    "await this._queueState(`${ch}.dataFresh`",
  ]) {
    assert.ok(source.includes(marker), `Charging runtime marker missing: ${marker}`);
  }
  assert.strictEqual(resolveEvcsSetpointRefreshMs({}, OCPP), 45000, 'OCPP must keep the proven 45-second write refresh contract');
  assert.ok(mainSource.includes("setNumber('chargingManagement.ocppStartResponseTimeoutSec', 75);"));
  assert.ok(mainSource.includes("setNumber('chargingManagement.ocppStartSettleSec', 60);"));
  assert.ok(mainSource.includes("setNumber('schedulerIntervalMs', 1000);"), 'Global EMS tick must stay unchanged');
  assert.ok(mainSource.includes('dataFreshId'), 'Backend installer mapping must persist dataFreshId');
  assert.ok(uiSource.includes('Messwerte aktuell / OCPP dataFresh'), 'AppCenter must expose separate OCPP freshness mapping');
}

console.log('[rc57-ocpp-stability] OK: socketConnected, telemetry freshness, OCPP event order and start latency are safely separated.');
