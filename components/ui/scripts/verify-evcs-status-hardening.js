#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  normalizeEvcsOnlineFlag,
  normalizeEvcsStatusReachability,
  isPersistentEvcsReadyStatus,
  resolveEvcsStatusAgePolicy,
  classifyEvcsConnectorStatus,
  inferOcppConnectorNoFromObjectId,
  resolveAcceptedStorageAssistBudget,
} = require('../ems/modules/charging-management');

// Faulted/Unavailable sind erreichbare, aber betrieblich blockierte Zustände.
{
  const faulted = classifyEvcsConnectorStatus('Faulted', true);
  assert.strictEqual(faulted.reachable, true);
  assert.strictEqual(faulted.faultActive, true);
  assert.strictEqual(faulted.unavailableActive, false);
  assert.strictEqual(faulted.operationalBlocked, true);
  assert.strictEqual(faulted.statusClass, 'faulted');
  assert.strictEqual(normalizeEvcsStatusReachability('Faulted', null), true);
  assert.strictEqual(normalizeEvcsOnlineFlag('Faulted', null), null);

  const unavailable = classifyEvcsConnectorStatus('Unavailable', true);
  assert.strictEqual(unavailable.reachable, true);
  assert.strictEqual(unavailable.faultActive, false);
  assert.strictEqual(unavailable.unavailableActive, true);
  assert.strictEqual(unavailable.operationalBlocked, true);
  assert.strictEqual(unavailable.statusClass, 'unavailable');
  assert.strictEqual(normalizeEvcsStatusReachability('Unavailable', null), true);

  const available = classifyEvcsConnectorStatus('Available', true);
  assert.strictEqual(available.statusClass, 'available');
  assert.strictEqual(available.operationalBlocked, false);

  const offline = classifyEvcsConnectorStatus('Offline', true);
  assert.strictEqual(offline.reachable, false);
  assert.strictEqual(offline.statusClass, 'offline');

  const staleFault = classifyEvcsConnectorStatus('Faulted', false);
  assert.strictEqual(staleFault.faultActive, false);
  assert.strictEqual(staleFault.operationalBlocked, false);
}

// OCPP Available ist ein stabiler Bereitschaftszustand. Eventbasierte Adapter
// duerfen den Zeitstempel bis zum naechsten Zustandswechsel unveraendert lassen,
// ohne dass die Kundenansicht dadurch "Status veraltet" meldet.
{
  assert.strictEqual(isPersistentEvcsReadyStatus('Available'), true);
  assert.strictEqual(isPersistentEvcsReadyStatus('Ready'), true);
  assert.strictEqual(isPersistentEvcsReadyStatus('Idle'), true);
  for (const transient of ['Preparing', 'Charging', 'SuspendedEV', 'Unavailable', 'Faulted', 'Offline']) {
    assert.strictEqual(isPersistentEvcsReadyStatus(transient), false, `${transient} darf nicht zeitlos gueltig sein`);
  }

  const oldAvailable = resolveEvcsStatusAgePolicy('Available', 3922 * 60 * 1000, 300 * 1000);
  assert.strictEqual(oldAvailable.ageExceeded, true);
  assert.strictEqual(oldAvailable.persistentReady, true);
  assert.strictEqual(oldAvailable.stale, false, 'Alter Available-State muss als stabile Bereitschaft gelten');

  const oldCharging = resolveEvcsStatusAgePolicy('Charging', 10 * 60 * 1000, 300 * 1000);
  assert.strictEqual(oldCharging.persistentReady, false);
  assert.strictEqual(oldCharging.stale, true, 'Alter Charging-State muss weiterhin stale sein');

  const oldFaulted = resolveEvcsStatusAgePolicy('Faulted', 10 * 60 * 1000, 300 * 1000);
  assert.strictEqual(oldFaulted.stale, true, 'Alter Faulted-State darf nicht dauerhaft blockieren');

  assert.strictEqual(resolveEvcsStatusAgePolicy('Charging', null, 300 * 1000).stale, true, 'Fehlendes Alter darf Charging nicht als frisch behandeln');
  assert.strictEqual(resolveEvcsStatusAgePolicy('Available', null, 300 * 1000).stale, false, 'Available bleibt auch ohne zyklischen Zeitstempel ein stabiler Bereitschaftsstatus');
}

assert.strictEqual(inferOcppConnectorNoFromObjectId('ocpp.0.stationA.0.status'), 0);
assert.strictEqual(inferOcppConnectorNoFromObjectId('ocpp.0.stationA.1.status'), 1);
assert.strictEqual(inferOcppConnectorNoFromObjectId('vendor.station.connectors.2.state'), 2);

// EVCS darf nur tatsächlich akzeptierte, frische und topology-/quellenrichtige
// Speicherentladung als zusätzliches Ladebudget verwenden.
{
  const now = 100000;
  const valid = resolveAcceptedStorageAssistBudget({
    now,
    requestedW: 6000,
    acceptedW: 4000,
    acceptedTs: now - 500,
    requestedTopology: 'farm',
    acceptedTopology: 'farm',
    acceptedSource: 'evcs',
    commandEffective: true,
    maxAgeMs: 5000,
  });
  assert.strictEqual(valid.valid, true);
  assert.strictEqual(valid.acceptedW, 4000);

  assert.strictEqual(resolveAcceptedStorageAssistBudget({
    now,
    requestedW: 6000,
    acceptedW: 6000,
    acceptedTs: now - 6000,
    requestedTopology: 'farm',
    acceptedTopology: 'farm',
    acceptedSource: 'evcs',
    commandEffective: true,
    maxAgeMs: 5000,
  }).acceptedW, 0);

  assert.strictEqual(resolveAcceptedStorageAssistBudget({
    now,
    requestedW: 6000,
    acceptedW: 6000,
    acceptedTs: now - 500,
    requestedTopology: 'farm',
    acceptedTopology: 'single',
    acceptedSource: 'evcs',
    commandEffective: true,
  }).status, 'storage-topology-mismatch');

  assert.strictEqual(resolveAcceptedStorageAssistBudget({
    now,
    requestedW: 6000,
    acceptedW: 6000,
    acceptedTs: now - 500,
    requestedTopology: 'farm',
    acceptedTopology: 'farm',
    acceptedSource: 'tariff',
    commandEffective: true,
  }).status, 'storage-source-mismatch');
}

const root = path.resolve(__dirname, '..');
const mainSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/main.ts'), 'utf8');
const chargingSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/charging-management.ts'), 'utf8');
const frontendSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/www/evcs.ts'), 'utf8');
const reasonsSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/reasons.ts'), 'utf8');

const propagationStart = mainSource.indexOf('// Propagate only true station-level IDs.');
const propagationEnd = mainSource.indexOf('// Filter: drop connector 0', propagationStart);
assert(propagationStart >= 0 && propagationEnd > propagationStart, 'Connector-0-Propagationsblock fehlt');
const propagationBlock = mainSource.slice(propagationStart, propagationEnd);
assert(propagationBlock.includes('cx.ids.onlineId'), 'Connector 0 darf Stations-Online weitergeben');
assert(!/cx\.ids\.(statusId|enableWriteId|activeId)\s*=/.test(propagationBlock), 'Connector 0 darf Status/Enable/Active nicht an Connectoren vererben');

assert(chargingSource.includes("await mk('unavailableActive'"), 'Unavailable-Diagnose-State fehlt');
assert(chargingSource.includes("await mk('operationalBlocked'"), 'Operational-Block-State fehlt');
assert(chargingSource.includes('const statusTimestampFresh = !!(statusId && !statusStale && !statusConnectorMismatch && !statusSharedAcrossConnectors'), 'Nur zeitlich frischer connectorrichtiger Status darf direkt wirken');
assert(chargingSource.includes('const statusHeldByLiveness = !!('), 'Eventbasierte Bereitschaft muss bei frischem Geräte-Heartbeat gehalten werden können');
assert(chargingSource.includes('isPersistentEvcsVehicleState(semanticPreview.state)'), 'Generische EVCS dürfen nur sichere persistente Zustände durch Liveness halten');
assert(chargingSource.includes('isOcppEventStatusPersistentState(semanticPreview.state)'), 'Der ereignisbasierte OCPP-Pfad braucht einen eigenen ereignisbasierten Statusvertrag');
assert(chargingSource.includes("const safetyStatusFresh = telemetryProfile === 'ocpp-1.6-event-driven'"), 'OCPP-Sicherheitsstatus muss während bestätigter Adapter-Liveness wirksam bleiben');
assert(chargingSource.includes('const statusFresh = statusTimestampFresh || statusHeldByLiveness;'), 'Finale Statusfreigabe muss Timestamp oder sichere Liveness verwenden');
assert(chargingSource.includes('const statusAgePolicy = resolveEvcsStatusAgePolicy(statusRawText, statusAgeRawMs, wbStatusStaleTimeoutMs);'), 'Zentrale Altersregel fuer EVCS-Status fehlt');
assert(chargingSource.includes('const statusStale = !!(statusId && statusAgePolicy.stale);'), 'Persistentes Available darf nicht pauschal stale werden');
assert(!chargingSource.includes("status: 'failsafe_stale_meter', active: true, budgetW: 0, usedW: 0, remainingW: 0"), 'Mode-off darf keinen falschen Failsafe-Shadow veröffentlichen');

assert(frontendSource.includes('statusEffective'), 'EVCS-UI muss den bestätigten Status lesen');
assert(frontendSource.includes('Status nicht bestätigt'), 'Ignorierter Connector-/Stationsstatus braucht neutrale Anzeige');
assert(frontendSource.includes("return 'nw-tile--state-warning'"), 'Faulted/Unavailable müssen als Warnung statt Offline erscheinen');
assert(!frontendSource.includes("st === 'faulted' || st === 'error'"), 'Faulted darf nicht mehr als Offline klassifiziert werden');
assert(reasonsSource.includes("UNAVAILABLE: 'UNAVAILABLE'"), 'Eigener UNAVAILABLE-Grund fehlt');

console.log('[evcs-status-hardening] OK: Connectorstatus, Erreichbarkeit, Faulted/Unavailable und akzeptierte Speicherunterstützung sind fachlich getrennt.');
