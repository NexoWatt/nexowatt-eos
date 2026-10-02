#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
  classifyUniversalEvcsVehicleStatus,
  inferIoBrokerOcppConnectorContext,
  resolveEvcsTelemetryProfile,
  resolveEvcsEffectivePower,
  reconcileOcppTransactionDemand,
  isOcppAuthoritativeZeroState,
  isOcppEventStatusPersistentState,
  strictFiniteEvcsNumber,
} = require('../ems/modules/charging-management');

const OCPP = 'ocpp-1.6-event-driven';

// Automatische Erkennung erfolgt über den Adapter-/Connector-Objektpfad und
// nicht nur über common.type=number (das wäre bei Modbus/HTTP/MQTT identisch).
{
  const ctx = inferIoBrokerOcppConnectorContext(
    'ocpp.0.DC_CHARGER_01.1.meterValues.Power_Active_Import',
  );
  assert.strictEqual(ctx.detected, true);
  assert.strictEqual(ctx.profile, OCPP);
  assert.strictEqual(ctx.connectorNo, 1);
  assert.strictEqual(ctx.connectorRoot, 'ocpp.0.DC_CHARGER_01.1');
  assert.strictEqual(ctx.statusId, 'ocpp.0.DC_CHARGER_01.1.status');
  assert.strictEqual(ctx.transactionActiveId, 'ocpp.0.DC_CHARGER_01.1.transactionActive');
  assert.strictEqual(ctx.connectedId, 'ocpp.0.DC_CHARGER_01.connected');
  assert.strictEqual(ctx.adapterAliveId, 'system.adapter.ocpp.0.alive');

  const main = inferIoBrokerOcppConnectorContext('ocpp.2.station_x.0.status');
  assert.strictEqual(main.detected, true);
  assert.strictEqual(main.connectorNo, 0);
  assert.strictEqual(main.transactionActiveId, '', 'Connector 0 besitzt im OCPP-Adapter keinen Transaktions-State');

  const generic = inferIoBrokerOcppConnectorContext('modbus.0.holdingRegisters.40001');
  assert.strictEqual(generic.detected, false);
  assert.strictEqual(resolveEvcsTelemetryProfile('', ctx), OCPP);
  assert.strictEqual(resolveEvcsTelemetryProfile('generic', ctx), 'generic', 'Expliziter Installer-Override muss gewinnen');
  assert.strictEqual(resolveEvcsTelemetryProfile('', generic), 'generic');
}

// Strikte Zahlenbehandlung: fehlende Werte sind keine reale 0.
assert.strictEqual(strictFiniteEvcsNumber(null), null);
assert.strictEqual(strictFiniteEvcsNumber(undefined), null);
assert.strictEqual(strictFiniteEvcsNumber(''), null);
assert.strictEqual(strictFiniteEvcsNumber('   '), null);
assert.strictEqual(strictFiniteEvcsNumber('0'), 0);
assert.strictEqual(strictFiniteEvcsNumber('12500.5'), 12500.5);
assert.strictEqual(strictFiniteEvcsNumber('invalid'), null);

// Bestehende zyklisch abgefragte EVCS behalten ihren bisherigen Vertrag.
{
  const fresh = resolveEvcsEffectivePower({
    telemetryProfile: 'generic', rawPowerW: 4700, rawMeterStale: false, online: true, enabled: true,
  });
  assert.strictEqual(fresh.effectivePowerW, 4700);
  assert.strictEqual(fresh.powerSource, 'measured');

  const stale = resolveEvcsEffectivePower({
    telemetryProfile: 'generic', rawPowerW: 4700, rawMeterStale: true, online: true, enabled: true, lastCommandW: 6200,
  });
  assert.strictEqual(stale.effectivePowerW, 6200);
  assert.strictEqual(stale.powerSource, 'generic-command-fallback');
}

// StopTransaction setzt transactionActive=false, während ein alter MeterValue
// positiv stehen bleiben kann. Ein terminaler Connectorstatus bestätigt dann
// unmittelbar 0 W. Ein frischer Charging-Status mit positivem Messwert darf
// dagegen wegen möglicher OCPP-Ereignisreihenfolge kurz vor der Transaktion liegen.
{
  const ended = resolveEvcsEffectivePower({
    telemetryProfile: OCPP,
    rawPowerW: 60000,
    rawMeterStale: true,
    online: true,
    enabled: true,
    normalizedState: 'finishing',
    statusAuthoritative: true,
    transactionActive: false,
    transactionKnown: true,
    lastCommandW: 100000,
  });
  assert.strictEqual(ended.rawPowerW, 60000);
  assert.strictEqual(ended.effectivePowerW, 0);
  assert.strictEqual(ended.powerSource, 'ocpp-transaction-ended-zero');
  assert.strictEqual(ended.authoritativeZero, true);
  assert.strictEqual(ended.sessionEnded, true);

  const eventOrderHeld = resolveEvcsEffectivePower({
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
  assert.strictEqual(eventOrderHeld.effectivePowerW, 4380);
  assert.strictEqual(eventOrderHeld.powerSource, 'ocpp-meter-charging-status-held');
  assert.strictEqual(eventOrderHeld.authoritativeZero, false);
  assert.strictEqual(eventOrderHeld.sessionEnded, false);
}

// Terminale bzw. leistungslose Connectorzustände setzen unabhängig vom alten
// MeterValue die Effektivleistung auf 0 W und geben Reservierungen frei.
for (const [state, sessionEnded] of [
  ['finishing', true],
  ['disconnected', true],
  ['faulted', true],
  ['unavailable', true],
  ['ready_to_charge', false],
  ['paused_by_evse', false],
  ['paused_by_vehicle', false],
  ['reserved', false],
]) {
  const result = resolveEvcsEffectivePower({
    telemetryProfile: OCPP,
    rawPowerW: 42000,
    rawMeterStale: true,
    online: true,
    enabled: true,
    normalizedState: state,
    statusAuthoritative: true,
    transactionActive: true,
    transactionKnown: true,
    lastCommandW: 90000,
  });
  assert.strictEqual(result.effectivePowerW, 0, `${state}: Effektivleistung muss 0 W sein`);
  assert.strictEqual(result.authoritativeZero, true, `${state}: Null muss autoritativ sein`);
  assert.strictEqual(result.sessionEnded, sessionEnded, `${state}: falscher Session-Endvertrag`);
  assert.ok(result.powerSource.includes(`ocpp-status-${state}-zero`));
}

// Unveränderte MeterValues dürfen während einer bestätigten aktiven OCPP-
// Transaktion weiter als Messwert gelten. Der letzte EOS-Sollwert wird dabei nie
// als Istleistung übernommen.
{
  const held = resolveEvcsEffectivePower({
    telemetryProfile: OCPP,
    rawPowerW: 73500,
    rawMeterStale: true,
    online: true,
    enabled: true,
    normalizedState: 'charging',
    statusAuthoritative: true,
    transactionActive: true,
    transactionKnown: true,
    lastCommandW: 120000,
  });
  assert.strictEqual(held.effectivePowerW, 73500);
  assert.strictEqual(held.powerSource, 'ocpp-meter-event-held');
  assert.strictEqual(held.effectiveMeterStale, false);
  assert.notStrictEqual(held.effectivePowerW, 120000);

  const missing = resolveEvcsEffectivePower({
    telemetryProfile: OCPP,
    rawPowerW: null,
    rawMeterStale: true,
    online: true,
    enabled: true,
    normalizedState: 'charging',
    statusAuthoritative: true,
    transactionActive: true,
    transactionKnown: true,
    lastCommandW: 120000,
  });
  assert.strictEqual(missing.effectivePowerW, 0);
  assert.strictEqual(missing.effectiveMeterStale, true);
  assert.strictEqual(missing.powerSource, 'ocpp-active-without-power');
}


// OCPP Preparing kann vor StartTransaction auftreten. Der Zustand bestätigt
// noch keine reale Fahrzeug-Leistungsanforderung, muss aber als verbunden und
// kontrolliert startfähig erhalten bleiben. So darf Auto/PV/Min+PV über den
// zeitlich begrenzten Start-Handshake die Mindestleistung anbieten, ohne eine
// bereits laufende Transaktion zu halluzinieren. Ein widersprüchliches Charging
// bei inaktiver Transaktion wird dagegen sicher zurückgestuft.
{
  const preparing = reconcileOcppTransactionDemand({
    telemetryProfile: OCPP,
    transactionKnown: true,
    transactionActive: false,
    vehicleDemand: classifyUniversalEvcsVehicleStatus({ status: 'Preparing', statusFresh: true }),
  });
  assert.strictEqual(preparing.state, 'ready_to_charge');
  assert.strictEqual(preparing.plugged, true);
  assert.strictEqual(preparing.startEligible, true, 'Preparing muss den kontrollierten Auto-/PV-/Min+PV-Start erlauben');
  assert.strictEqual(preparing.demandConfirmed, false, 'Preparing darf vor Transaktionsstart keinen bereits bestätigten Ladebedarf vortäuschen');

  const suspendedEvse = reconcileOcppTransactionDemand({
    telemetryProfile: OCPP,
    transactionKnown: true,
    transactionActive: false,
    vehicleDemand: classifyUniversalEvcsVehicleStatus({ status: 'SuspendedEVSE', statusFresh: true }),
  });
  assert.strictEqual(suspendedEvse.demandConfirmed, true, 'SuspendedEVSE darf Ladebedarf behalten');

  const earlyCharging = reconcileOcppTransactionDemand({
    telemetryProfile: OCPP,
    transactionKnown: true,
    transactionActive: false,
    vehicleDemand: classifyUniversalEvcsVehicleStatus({ status: 'Charging', statusFresh: true }),
  });
  assert.strictEqual(earlyCharging.demandConfirmed, false);
  assert.strictEqual(earlyCharging.startEligible, true, 'Charging darf bei verzögertem TransactionEvent kontrolliert startfähig bleiben');
  assert.strictEqual(earlyCharging.state, 'ready_to_charge');
}

assert.strictEqual(isOcppAuthoritativeZeroState('finishing'), true);
assert.strictEqual(isOcppAuthoritativeZeroState('charging'), false);
for (const state of ['charging', 'faulted', 'unavailable', 'finishing', 'disconnected']) {
  assert.strictEqual(isOcppEventStatusPersistentState(state), true, `${state} muss im ereignisbasierten OCPP-Profil gehalten werden`);
}

// Standard-OCPP-Zustände werden connectorbezogen normalisiert.
assert.strictEqual(classifyUniversalEvcsVehicleStatus({ status: 'Charging', statusFresh: true }).state, 'charging');
assert.strictEqual(classifyUniversalEvcsVehicleStatus({ status: 'Finishing', statusFresh: true }).state, 'finishing');
assert.strictEqual(classifyUniversalEvcsVehicleStatus({ status: 'Available', statusFresh: true }).state, 'disconnected');
assert.strictEqual(classifyUniversalEvcsVehicleStatus({ status: 'SuspendedEVSE', statusFresh: true }).state, 'paused_by_evse');
assert.strictEqual(classifyUniversalEvcsVehicleStatus({ status: 'SuspendedEV', statusFresh: true }).state, 'paused_by_vehicle');

// Integrationsvertrag in der kanonischen Runtimequelle.
{
  const root = path.resolve(__dirname, '..');
  const source = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/charging-management.ts'), 'utf8');
  for (const required of [
    'inferIoBrokerOcppConnectorContext(',
    "transactionActiveId: Number(parts[3]) > 0",
    "adapterAliveId: `system.adapter.${parts[0]}.${parts[1]}.alive`",
    "if (transactionActiveId) await this.dp.upsert",
    "if (ocppAdapterAliveId) await this.dp.upsert",
    'const effectivePower = resolveEvcsEffectivePower({',
    "await this._queueState(`${ch}.powerRawW`",
    "await this._queueState(`${ch}.powerEffectiveW`",
    "await this._queueState(`${ch}.actualPowerRawW`",
    "await this._queueState(`${ch}.actualPowerW`, pWNum",
    'vehicleDemand = reconcileOcppTransactionDemand({',
    "source: 'ocpp-transaction-state'",
    "onlineSource = 'ocpp-adapter-not-alive'",
  ]) {
    assert.ok(source.includes(required), `Integrationsmarker fehlt: ${required}`);
  }
  assert.ok(source.includes('const pWUsed = pWNum;'), 'Budgetierung muss die Effektivleistung verwenden');
  assert.ok(source.includes('effectivePower.authoritativeZero !== true'), 'Terminaler OCPP-Nullzustand darf keine Lade-Gnadenzeit behalten');
}

console.log('[rc51-ocpp-telemetry] OK: OCPP-Datenpunkte werden automatisch erkannt; Rohwert, Effektivleistung, Status, Transaktion und Adapter-Liveness sind getrennt.');
