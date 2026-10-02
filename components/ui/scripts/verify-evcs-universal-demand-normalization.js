#!/usr/bin/env node
'use strict';

/**
 * Regression RC19: Herstellerunabhängige EVCS-Zustände müssen auf eine
 * einheitliche Fahrzeug-/Ladebedarfssemantik abgebildet werden. Freie
 * AppCenter-DPs und Wertemappings bleiben autoritativ; OCPP `Available`
 * darf kein Budget reservieren. Verbundene/startbare Zustände wie Alfen B1/B2
 * und OCPP EVConnected/Occupied erhalten nur einen begrenzten Startversuch.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const charging = require(path.join(root, 'ems/modules/charging-management.js'));
const {
  classifyUniversalEvcsVehicleStatus,
  mergeUniversalEvcsStatusEvidence,
  resolveUniversalEvcsVehicleDemand,
  resolveEvcsSemanticFlag,
  parseEvcsSemanticValues,
  matchesEvcsSemanticStatus,
  isObservationOnlyEvcsDemandObjectId,
  isPersistentEvcsVehicleState,
  computePendingPvStartIntentW,
} = charging;

function classified(status, extra = {}) {
  return classifyUniversalEvcsVehicleStatus({ status, statusFresh: true, ...extra });
}

// ABL / IEC 61851 CP states.
let out = classified('B2 EV has the permission to charge');
assert.deepStrictEqual(
  { state: out.state, plugged: out.plugged, demand: out.demandConfirmed, startEligible: out.startEligible, reason: out.reason },
  { state: 'ready_to_charge', plugged: true, demand: false, startEligible: true, reason: 'mode3-b2-pwm-startable' },
);
out = classified('B1 EV connected');
assert.strictEqual(out.state, 'connected');
assert.strictEqual(out.plugged, true);
assert.strictEqual(out.demandConfirmed, false);
assert.strictEqual(out.startEligible, true);
out = classified('A1 no EV connected');
assert.strictEqual(out.state, 'disconnected');
assert.strictEqual(out.demandConfirmed, false);
assert.strictEqual(out.startEligible, false);
for (const state of ['C1', 'D1']) {
  out = classified(`${state} EV requests charging`);
  assert.strictEqual(out.state, 'ready_to_charge', `${state}: ready`);
  assert.strictEqual(out.demandConfirmed, true, `${state}: demand`);
  assert.strictEqual(out.startEligible, true, `${state}: start eligible`);
}
for (const state of ['C2', 'D2']) {
  out = classified(`${state} charging enabled`);
  assert.strictEqual(out.state, 'charging', `${state}: charging`);
  assert.strictEqual(out.demandConfirmed, true, `${state}: demand`);
  assert.strictEqual(out.startEligible, true, `${state}: start eligible`);
}
for (const state of ['E', 'F']) {
  out = classified(`${state} fault`);
  assert.strictEqual(out.state, 'faulted', `${state}: fault`);
  assert.strictEqual(out.startEligible, false, `${state}: no start`);
}

// OCPP semantics.
const ocppExpectations = new Map([
  ['Available', ['disconnected', false, false]],
  ['Preparing', ['ready_to_charge', false, true]],
  ['Occupied', ['connected', false, true]],
  ['EVConnected', ['connected', false, true]],
  ['Charging', ['charging', true, true]],
  ['SuspendedEVSE', ['paused_by_evse', true, true]],
  ['SuspendedEV', ['paused_by_vehicle', false, false]],
  ['Finishing', ['finishing', false, false]],
  ['Faulted', ['faulted', false, false]],
  ['Unavailable', ['unavailable', false, false]],
]);
for (const [status, [state, demand, startEligible]] of ocppExpectations) {
  out = classified(status);
  assert.strictEqual(out.state, state, `${status}: canonical state`);
  assert.strictEqual(out.demandConfirmed, demand, `${status}: demand`);
  assert.strictEqual(out.startEligible, startEligible, `${status}: start eligible`);
}

out = classified('Stopping');
assert.strictEqual(out.state, 'finishing');
assert.strictEqual(out.startEligible, false);

let merged = mergeUniversalEvcsStatusEvidence({
  evidence: [
    { status: 'Idle', fresh: true, source: 'chargingState' },
    { status: 'Occupied', fresh: true, source: 'connectorStatus' },
  ],
});
assert.strictEqual(merged.state, 'connected', 'Occupied must complement an early Idle chargingState.');
assert.strictEqual(merged.startEligible, true);
assert.strictEqual(merged.evidenceSource, 'connectorStatus');

merged = mergeUniversalEvcsStatusEvidence({
  evidence: [
    { status: 'EVConnected', fresh: true, source: 'chargingState' },
    { status: 'Faulted', fresh: true, source: 'connectorStatus' },
  ],
});
assert.strictEqual(merged.state, 'faulted', 'A fresh fault must dominate startable OCPP evidence.');
assert.strictEqual(merged.startEligible, false);

merged = mergeUniversalEvcsStatusEvidence({
  evidence: [
    { status: 'SuspendedEV', fresh: true, source: 'chargingState' },
    { status: 'Occupied', fresh: true, source: 'connectorStatus' },
  ],
});
assert.strictEqual(merged.state, 'paused_by_vehicle', 'Vehicle pause must dominate connector occupancy.');
assert.strictEqual(merged.startEligible, false);

out = resolveUniversalEvcsVehicleDemand({
  actualPowerW: 4500,
  classifiedStatus: merged,
});
assert.strictEqual(out.state, 'paused_by_vehicle', 'Residual power must not restart a vehicle-paused session.');
assert.strictEqual(out.demandConfirmed, false);

assert.strictEqual(isObservationOnlyEvcsDemandObjectId('nexowatt-devices.0.devices.lp.aliases.v1.r.charging'), true);
assert.strictEqual(isObservationOnlyEvcsDemandObjectId('ocpp21.0.CP.transactions.transactionActive'), true);
assert.strictEqual(isObservationOnlyEvcsDemandObjectId('custom.wallbox.active'), false);
assert.strictEqual(isObservationOnlyEvcsDemandObjectId('custom.wallbox.charging'), false);

// Generic/KEBA wording must not be misclassified merely because it contains
// the word `charging`.
for (const status of [
  'Not ready for charging',
  'Charging interrupted / rejected',
  'Fully charged',
]) {
  out = classified(status);
  assert.strictEqual(out.demandConfirmed, false, `${status}: no demand`);
  assert.strictEqual(out.startEligible, false, `${status}: no start`);
}
out = classified('Ready for charging / waiting for EV');
assert.strictEqual(out.state, 'disconnected');
assert.strictEqual(out.startEligible, false);
out = classified('Waiting for current release');
assert.strictEqual(out.state, 'ready_to_charge');
assert.strictEqual(out.demandConfirmed, true);
assert.strictEqual(out.startEligible, true);

// Generic healthy/disconnected wording must not become a fault/offline state.
out = classified('EV not connected');
assert.strictEqual(out.state, 'disconnected');
out = classified('No error');
assert.notStrictEqual(out.state, 'faulted');
// Bekannte Safety-Zustände dürfen niemals durch ein breites Installer-Mapping
// als Ladebedarf umgedeutet werden.
out = classified('Faulted', { statusDemandValues: '*' });
assert.strictEqual(out.state, 'faulted');
assert.strictEqual(out.demandConfirmed, false);
out = classified('Offline', { statusDemandValues: '*' });
assert.strictEqual(out.state, 'offline');
assert.strictEqual(out.demandConfirmed, false);

// Arbitrary vendor enums/text via AppCenter mappings, including wildcards.
out = classified('VENDOR_STATE_47', { statusDemandValues: 'STATE_1; VENDOR_STATE_47' });
assert.strictEqual(out.state, 'ready_to_charge');
assert.strictEqual(out.demandConfirmed, true);
out = classified('CAR_PRESENT_WAIT', { statusConnectedValues: '*PRESENT*' });
assert.strictEqual(out.state, 'connected');
out = classified('PORT_EMPTY_9', { statusDisconnectedValues: 'PORT_EMPTY*' });
assert.strictEqual(out.state, 'disconnected');
out = classified('VEHICLE_FULL', { statusNoDemandValues: '*FULL' });
assert.strictEqual(out.state, 'paused_by_vehicle');
assert.ok(matchesEvcsSemanticStatus('prefix-ABC-suffix', '*ABC*'));
assert.strictEqual(parseEvcsSemanticValues('["1", "2"]').length, 2);

// Free boolean/enum mappings.
let flag = resolveEvcsSemanticFlag(7, '2, 7, 9', '0');
assert.strictEqual(flag.known, true);
assert.strictEqual(flag.value, true);
flag = resolveEvcsSemanticFlag('NO_REQUEST', 'REQUEST', '*NO_REQUEST*');
assert.strictEqual(flag.known, true);
assert.strictEqual(flag.value, false);

// Explicit semantic DPs are authoritative. Explicit disconnected wins over a
// contradictory demand signal.
out = resolveUniversalEvcsVehicleDemand({
  explicitConnected: false,
  explicitConnectedKnown: true,
  explicitDemand: true,
  explicitDemandKnown: true,
  status: 'Preparing',
  statusFresh: true,
});
assert.strictEqual(out.plugged, false);
assert.strictEqual(out.demandConfirmed, false);
out = resolveUniversalEvcsVehicleDemand({
  explicitConnected: true,
  explicitConnectedKnown: true,
  explicitDemand: true,
  explicitDemandKnown: true,
});
assert.strictEqual(out.state, 'ready_to_charge');
assert.strictEqual(out.demandConfirmed, true);

out = resolveUniversalEvcsVehicleDemand({
  explicitConnected: true,
  explicitConnectedKnown: true,
  status: 'Ready',
  statusFresh: true,
});
assert.strictEqual(out.plugged, true);
assert.strictEqual(out.demandConfirmed, false);
assert.strictEqual(out.startEligible, true);
assert.strictEqual(out.state, 'connected');

// Alfen B2 must receive only the technical PV start reservation. Available must not.
const abl = resolveUniversalEvcsVehicleDemand({
  status: 'B2 EV has the permission to charge',
  statusFresh: true,
});
assert.strictEqual(abl.demandConfirmed, false);
assert.strictEqual(abl.startEligible, true);
let intent = computePendingPvStartIntentW({
  enabled: true,
  online: true,
  connected: abl.plugged,
  startEligible: abl.startEligible,
  mode: 'pv',
  controlBasis: 'currentA',
  status: 'B2 EV has the permission to charge',
  normalizedVehicleState: abl.state,
  minPowerW: 4140,
  technicalMinW: 4140,
  maxPowerW: 11000,
  totalRemainingW: 11000,
  stationRemainingW: 11000,
  pvRemainingW: 11000,
});
assert.strictEqual(intent.intentW, 4140);
intent = computePendingPvStartIntentW({
  enabled: true,
  online: true,
  connected: false,
  startEligible: false,
  mode: 'pv',
  controlBasis: 'currentA',
  status: 'Available',
  normalizedVehicleState: 'disconnected',
  minPowerW: 4140,
  technicalMinW: 4140,
  maxPowerW: 11000,
  totalRemainingW: 11000,
  stationRemainingW: 11000,
  pvRemainingW: 11000,
});
assert.strictEqual(intent.intentW, 0);

// Persistent event-driven states may be held by fresh device liveness, but
// stale safety/charging states are excluded from that contract.
for (const state of ['disconnected', 'connected', 'ready_to_charge', 'paused_by_evse', 'paused_by_vehicle', 'finishing', 'reserved']) {
  assert.strictEqual(isPersistentEvcsVehicleState(state), true, `${state} persistent`);
}
for (const state of ['faulted', 'offline', 'unavailable', 'charging']) {
  assert.strictEqual(isPersistentEvcsVehicleState(state), false, `${state} must not be revived`);
}

// Static end-to-end wiring contract.
const chargingSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/charging-management.ts'), 'utf8');
for (const needle of [
  'vehicleConnectedId',
  'chargeDemandId',
  'vehicleStartEligible',
  'vehicleStartProbeActive',
  'heartbeatId',
  'statusDemandValues',
  'freshPowerMeterLiveness',
  'statusHeldByLiveness',
  'normalizedVehicleState: w.vehicleStateNormalized',
  'vehicle-start-no-response',
]) assert.ok(chargingSource.includes(needle), `charging runtime missing: ${needle}`);

const engineSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/engine.ts'), 'utf8');
for (const needle of ['vehicleConnectedId', 'chargeDemandId', 'heartbeatId', 'statusDemandValues']) {
  assert.ok(engineSource.includes(needle), `engine wiring missing: ${needle}`);
}
const mainSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/main.ts'), 'utf8');
for (const needle of ['vehicleConnectedId', 'chargeDemandId', 'heartbeatId', 'statusDemandValues']) {
  assert.ok(mainSource.includes(needle), `main config wiring missing: ${needle}`);
}
const appCenterSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/www/ems-apps.ts'), 'utf8');
for (const needle of [
  'Fahrzeug verbunden (lesen, optional)',
  'Ladebedarf / Ladebereit (lesen, optional)',
  'Heartbeat / LastSeen (lesen, optional)',
  'Ladebedarf / Herstellerstatus (optional)',
  'statusDemandValues',
  'r.vehicleConnected',
  'r.chargeDemand',
]) assert.ok(appCenterSource.includes(needle), `AppCenter wiring missing: ${needle}`);

console.log('[evcs-universal-demand-normalization] OK: Alfen Mode 3, OCPP und freie Herstellerwerte nutzen eine gemeinsame Start-/Bedarfssemantik.');
