#!/usr/bin/env node
'use strict';

/**
 * Universelle EVCS-Regressionsprüfung: Ladepunkte ohne bestaetigten Bedarf
 * duerfen kein laufendes Ladebudget blockieren. Ein semantisch eindeutig
 * verbundenes/startbereites Fahrzeug darf jedoch in Auto, Min+PV oder PV einen
 * zeitlich begrenzten technischen Startversuch erhalten. Alte Sollwerte, stale
 * Stati, Cooldowns und OCPP `Reserved` bleiben fail-closed.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const charging = require(path.join(root, 'ems/modules/charging-management.js'));
const budgetHelpers = require(path.join(root, 'ems/charging-budget-helpers.js'));

const {
  resolveConfirmedEvcsVehicleDemand,
  resolveUniversalEvcsVehicleDemand,
  classifyUniversalEvcsVehicleStatus,
  resolveEvcsSemanticFlag,
  isPersistentEvcsVehicleState,
  computePendingPvStartIntentW,
  isChargingCommandDemandAllowed,
  shouldPauseChargingForGoalSoc,
  applyChargingModeRamp,
} = charging;
const { computeChargingMinimumServicePlan } = budgetHelpers;

function demand(input) {
  return resolveConfirmedEvcsVehicleDemand({ activityThresholdW: 100, ...input });
}

// OCPP Reserved reserviert nur den Ladepunkt, bestaetigt aber kein physisches
// Fahrzeug und keinen Ladebedarf.
let out = demand({ status: 'Reserved', statusFresh: true });
assert.strictEqual(out.plugged, false);
assert.strictEqual(out.demandConfirmed, false);
assert.strictEqual(out.reason, 'status-reserved-no-vehicle');

// Available/Idle/Offline duerfen ebenfalls kein Budget blockieren.
for (const status of ['Available', 'Idle', 'Unplugged', 'Offline']) {
  out = demand({ status, statusFresh: true });
  assert.strictEqual(out.demandConfirmed, false, `${status} darf keinen Ladebedarf bestaetigen`);
}

// SuspendedEVSE bedeutet: Fahrzeug wartet auf Energie vom EMS und darf einen
// technisch fahrbaren Start-Intent reservieren.
out = demand({ status: 'SuspendedEVSE', statusFresh: true });
assert.strictEqual(out.plugged, true);
assert.strictEqual(out.demandConfirmed, true);

// SuspendedEV bedeutet dagegen: Fahrzeug fordert selbst keine Leistung an.
out = demand({ status: 'SuspendedEV', statusFresh: true });
assert.strictEqual(out.plugged, true);
assert.strictEqual(out.demandConfirmed, false);

// Charging bestaetigt laufenden Bedarf. Preparing/Occupied bestaetigen nur
// Fahrzeugkontakt bzw. Startbereitschaft und duerfen deshalb ausschliesslich
// einen begrenzten Startversuch freigeben.
out = resolveUniversalEvcsVehicleDemand({ status: 'Charging', statusFresh: true });
assert.strictEqual(out.demandConfirmed, true);
assert.strictEqual(out.startEligible, true);
for (const status of ['Preparing', 'Occupied']) {
  out = resolveUniversalEvcsVehicleDemand({ status, statusFresh: true });
  assert.strictEqual(out.plugged, true, `${status} muss den Fahrzeugkontakt bestaetigen`);
  assert.strictEqual(out.demandConfirmed, false, `${status} darf noch keinen laufenden Ladebedarf vortaeuschen`);
  assert.strictEqual(out.startEligible, true, `${status} muss einen begrenzten Startversuch erlauben`);
}


// Herstellerunabhängige Normalisierung: ABL eMH1/IEC-61851-Zustände müssen
// ohne herstellerspezifischen Umbau im EMS erkannt werden.
out = resolveUniversalEvcsVehicleDemand({
  status: 'B2 EV has the permission to charge',
  statusFresh: true,
  activityThresholdW: 100,
});
assert.strictEqual(out.state, 'ready_to_charge');
assert.strictEqual(out.plugged, true);
assert.strictEqual(out.demandConfirmed, false);
assert.strictEqual(out.startEligible, true);
assert.strictEqual(out.reason, 'mode3-b2-pwm-startable');

out = resolveUniversalEvcsVehicleDemand({ status: 'B1 EV connected', statusFresh: true });
assert.strictEqual(out.state, 'connected');
assert.strictEqual(out.plugged, true);
assert.strictEqual(out.demandConfirmed, false);
assert.strictEqual(out.startEligible, true);

out = resolveUniversalEvcsVehicleDemand({ status: 'C2 charging', statusFresh: true });
assert.strictEqual(out.state, 'charging');
assert.strictEqual(out.demandConfirmed, true);

out = resolveUniversalEvcsVehicleDemand({ status: 'Available', statusFresh: true });
assert.strictEqual(out.state, 'disconnected');
assert.strictEqual(out.demandConfirmed, false);

out = resolveUniversalEvcsVehicleDemand({ status: 'Faulted', statusFresh: true, statusDemandValues: '*' });
assert.strictEqual(out.state, 'faulted');
assert.strictEqual(out.demandConfirmed, false);

// Beliebige Hersteller-/Enumwerte lassen sich im AppCenter semantisch abbilden.
out = resolveUniversalEvcsVehicleDemand({
  status: 'STATE_47',
  statusFresh: true,
  statusDemandValues: 'STATE_47; READY_VENDOR_X',
});
assert.strictEqual(out.state, 'ready_to_charge');
assert.strictEqual(out.demandConfirmed, true);
assert.strictEqual(out.reason, 'configured-status-ready');

out = resolveUniversalEvcsVehicleDemand({
  status: 'CAR_PRESENT_WAIT',
  statusFresh: true,
  statusConnectedValues: '*PRESENT*',
});
assert.strictEqual(out.state, 'connected');
assert.strictEqual(out.plugged, true);
assert.strictEqual(out.demandConfirmed, false);

// Explizite semantische DPs sind autoritativ und vom Legacy-activeId getrennt.
out = resolveUniversalEvcsVehicleDemand({
  explicitConnected: true,
  explicitConnectedKnown: true,
  explicitDemand: false,
  explicitDemandKnown: true,
});
assert.strictEqual(out.plugged, true);
assert.strictEqual(out.demandConfirmed, false);

out = resolveUniversalEvcsVehicleDemand({
  explicitConnected: true,
  explicitConnectedKnown: true,
  explicitDemand: true,
  explicitDemandKnown: true,
});
assert.strictEqual(out.demandConfirmed, true);
assert.strictEqual(out.source, 'explicit-demand-dp');

out = resolveUniversalEvcsVehicleDemand({
  explicitConnected: false,
  explicitConnectedKnown: true,
  explicitDemand: true,
  explicitDemandKnown: true,
});
assert.strictEqual(out.plugged, false, 'explizit nicht verbunden muss widersprüchlichen Demand sicher blockieren');
assert.strictEqual(out.demandConfirmed, false);

let semantic = resolveEvcsSemanticFlag('2', '1,2,3', '0');
assert.deepStrictEqual({ known: semantic.known, value: semantic.value }, { known: true, value: true });
semantic = resolveEvcsSemanticFlag('NO_DEMAND', 'YES', '*NO_DEMAND*');
assert.deepStrictEqual({ known: semantic.known, value: semantic.value }, { known: true, value: false });

const classifiedB2 = classifyUniversalEvcsVehicleStatus({
  status: 'B2 EV has the permission to charge',
  statusFresh: true,
});
assert.strictEqual(isPersistentEvcsVehicleState(classifiedB2.state), true, 'B2 darf bei frischem Geräte-Heartbeat eventbasiert gültig bleiben');
assert.strictEqual(isPersistentEvcsVehicleState('faulted'), false, 'ein alter Fault darf nicht durch Heartbeat wiederbelebt werden');
assert.strictEqual(isPersistentEvcsVehicleState('charging'), false, 'ein alter Charging-Text darf nicht als aktuelle Leistung gelten');

// Stale Stati erzeugen ohne frischen expliziten Plug-DP keinen Bedarf.
out = demand({ status: 'SuspendedEVSE', statusFresh: false });
assert.strictEqual(out.demandConfirmed, false);

// Frische reale Leistung ist immer autoritativ, auch wenn der Status hinterherhinkt.
out = demand({ actualPowerW: 4200, status: 'Available', statusFresh: true });
assert.strictEqual(out.demandConfirmed, true);
assert.strictEqual(out.source, 'fresh-power');

// Ein explizit frischer Plug-DP darf bei fehlendem/unklarem Status den Bedarf
// bestaetigen; ein explizites FALSE muss sicher freigeben.
out = demand({ explicitPlug: true, explicitPlugKnown: true, statusFresh: false });
assert.strictEqual(out.demandConfirmed, true);
out = demand({ explicitPlug: false, explicitPlugKnown: true, status: 'SuspendedEVSE', statusFresh: false });
assert.strictEqual(out.demandConfirmed, false);

// Pending-PV-Intent: kein bestaetigter Bedarf = 0 W, unabhaengig von alten
// Sollwerten oder einer theoretischen Wallboxleistung.
let intent = computePendingPvStartIntentW({
  enabled: true,
  online: true,
  connected: false,
  mode: 'pv',
  controlBasis: 'powerW',
  status: 'Reserved',
  minPowerW: 4140,
  technicalMinW: 4140,
  maxPowerW: 11000,
  totalRemainingW: 11000,
  stationRemainingW: 11000,
  pvRemainingW: 11000,
});
assert.strictEqual(intent.intentW, 0);

intent = computePendingPvStartIntentW({
  enabled: true,
  online: true,
  connected: true,
  mode: 'pv',
  controlBasis: 'powerW',
  status: 'SuspendedEVSE',
  minPowerW: 4140,
  technicalMinW: 4140,
  maxPowerW: 11000,
  totalRemainingW: 11000,
  stationRemainingW: 11000,
  pvRemainingW: 11000,
});
assert.strictEqual(intent.intentW, 4140);

const ablDemand = resolveUniversalEvcsVehicleDemand({
  status: 'B2 EV has the permission to charge',
  statusFresh: true,
});
intent = computePendingPvStartIntentW({
  enabled: true,
  online: true,
  connected: ablDemand.plugged,
  startEligible: ablDemand.startEligible,
  mode: 'pv',
  controlBasis: 'currentA',
  status: 'B2 EV has the permission to charge',
  normalizedVehicleState: ablDemand.state,
  minPowerW: 4140,
  technicalMinW: 4140,
  maxPowerW: 11000,
  totalRemainingW: 11000,
  stationRemainingW: 11000,
  pvRemainingW: 11000,
});
assert.strictEqual(intent.intentW, 4140, 'ABL B2 muss die technische PV-Startleistung reservieren');

// Mindestleistungs-Plan: Ein nur scheinbar verbundener Ladepunkt ohne
// Bedarfs- oder Startnachweis bleibt ausgeschlossen. Ein startbereites Fahrzeug
// darf in Auto/Min+PV seine technische Mindestleistung reservieren; im Cooldown
// wird die Reservierung wieder sicher entfernt.
const plan = computeChargingMinimumServicePlan({
  totalBudgetW: 25000,
  wallboxes: [
    {
      safe: 'ghost', enabled: true, online: true, vehiclePlugged: true,
      vehicleDemandConfirmed: false, vehicleStartEligible: false,
      controlBasis: 'powerW', effectiveMode: 'minpv',
      minPW: 4140, maxPW: 11000,
    },
    {
      safe: 'startable', enabled: true, online: true, vehiclePlugged: true,
      vehicleDemandConfirmed: false, vehicleStartEligible: true,
      vehicleStartCooldownActive: false,
      controlBasis: 'powerW', effectiveMode: 'minpv',
      minPW: 4140, maxPW: 11000,
    },
    {
      safe: 'cooldown', enabled: true, online: true, vehiclePlugged: true,
      vehicleDemandConfirmed: false, vehicleStartEligible: true,
      vehicleStartCooldownActive: true,
      controlBasis: 'powerW', effectiveMode: 'auto',
      minPW: 4140, maxPW: 11000,
    },
    {
      safe: 'real', enabled: true, online: true, vehiclePlugged: true,
      vehicleDemandConfirmed: true, vehicleStartEligible: true,
      controlBasis: 'powerW', effectiveMode: 'minpv',
      minPW: 4140, maxPW: 11000,
    },
  ],
});
assert.strictEqual(plan.eligibleCount, 2);
assert.strictEqual(plan.minimumBySafe.get('ghost'), 0);
assert.strictEqual(plan.minimumBySafe.get('startable'), 4140);
assert.strictEqual(plan.minimumBySafe.get('cooldown'), 0);
assert.strictEqual(plan.minimumBySafe.get('real'), 4140);

// Boost darf weiterhin ohne Fahrzeugstatus vorrüsten. Auto bleibt ohne
// Startnachweis bei 0, darf mit semantisch startbereitem Fahrzeug jedoch exakt
// die technische Mindestleistung reservieren.
const prearmPlan = computeChargingMinimumServicePlan({
  totalBudgetW: 20000,
  wallboxes: [
    {
      safe: 'boost_prearm', enabled: true, online: true, vehiclePlugged: false,
      vehicleDemandConfirmed: false, vehicleStartEligible: false,
      controlBasis: 'currentA', effectiveMode: 'boost',
      setAKey: 'test.boost.setA', minPW: 4140, maxPW: 11040,
    },
    {
      safe: 'auto_no_demand', enabled: true, online: true, vehiclePlugged: false,
      vehicleDemandConfirmed: false, vehicleStartEligible: false,
      controlBasis: 'currentA', effectiveMode: 'auto',
      setAKey: 'test.auto.setA', minPW: 4140, maxPW: 11040,
    },
    {
      safe: 'auto_startable', enabled: true, online: true, vehiclePlugged: true,
      vehicleDemandConfirmed: false, vehicleStartEligible: true,
      vehicleStartCooldownActive: false,
      controlBasis: 'currentA', effectiveMode: 'auto',
      setAKey: 'test.auto.startable.setA', minPW: 4140, maxPW: 11040,
    },
  ],
});
assert.strictEqual(prearmPlan.eligibleCount, 2);
assert.strictEqual(prearmPlan.minimumBySafe.get('boost_prearm'), 4140);
assert.strictEqual(prearmPlan.minimumBySafe.get('auto_no_demand'), 0);
assert.strictEqual(prearmPlan.minimumBySafe.get('auto_startable'), 4140);

// Betriebsartenvertrag: Boost darf immer vorruesten. Auto/PV/Min+PV duerfen
// ohne bestaetigten Bedarf nur waehrend eines aktiven, positiv budgetierten
// Startversuchs schreiben. Off bleibt immer gesperrt.
assert.strictEqual(isChargingCommandDemandAllowed('boost', false), true);
assert.strictEqual(isChargingCommandDemandAllowed('turbo', false), true);
for (const mode of ['auto', 'normal', 'pv', 'minpv', 'off']) {
  assert.strictEqual(isChargingCommandDemandAllowed(mode, false, false, false), false, `${mode} darf ohne Ladebedarf oder Startprobe nicht vorladen`);
}
assert.strictEqual(isChargingCommandDemandAllowed('auto', false, true, false), false, 'Startbereitschaft allein darf noch keinen Befehl erzeugen');
assert.strictEqual(isChargingCommandDemandAllowed('auto', false, true, true), true, 'Auto darf waehrend einer positiven Startprobe die Mindestleistung schreiben');
assert.strictEqual(isChargingCommandDemandAllowed('minpv', false, true, true), true);
assert.strictEqual(isChargingCommandDemandAllowed('pv', false, true, true), true);
assert.strictEqual(isChargingCommandDemandAllowed('auto', true), true);
assert.strictEqual(shouldPauseChargingForGoalSoc('boost', true, 'waiting_soc'), false);
assert.strictEqual(shouldPauseChargingForGoalSoc('boost', true, 'soc_stale'), false);
assert.strictEqual(shouldPauseChargingForGoalSoc('auto', true, 'waiting_soc'), true);
assert.strictEqual(applyChargingModeRamp(0, 16, 2, 'boost'), 16, 'Boost muss die bereits hart begrenzte Maximalvorgabe sofort erreichen');
assert.strictEqual(applyChargingModeRamp(0, 16, 2, 'auto'), 2, 'Auto muss die konfigurierte Hochlauframpe behalten');

// Statische Produktivanker: Allocation, Reservierung und Write-Plan nutzen die
// bestaetigte Bedarfsentscheidung statt `online !== false` oder alten Sollwerten.
const source = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/charging-management.ts'), 'utf8');
for (const needle of [
  'resolveConfirmedEvcsVehicleDemand',
  'resolveUniversalEvcsVehicleDemand',
  'classifyUniversalEvcsVehicleStatus',
  'mode3-b2-pwm-startable',
  'vehicleConnectedId',
  'chargeDemandId',
  'statusDemandValues',
  'pvStartResponseTimeoutMs',
  'vehicle-start-no-response',
  'vehicleDemandConfirmed = vehicleDemand.demandConfirmed === true',
  'w.vehicleDemandConfirmed === true',
  'const demandReserveThisW = activeChargingDemand ?',
  'vehicleDemandReason',
  'isChargingCommandDemandAllowed(effMode, w.vehicleDemandConfirmed, w.vehicleStartEligible, w.vehicleStartProbeActive)',
  'shouldPauseChargingForGoalSoc(effMode, w.goalEnabled, w.goalStatus)',
  'applyChargingModeRamp(prevCmdA, cmdA, wbMaxDeltaA, effMode)',
  'applyChargingModeRamp(prevCmdW, cmdW, wbMaxDeltaW, effMode)',
  'vehiclePlugged: !!(w && w.vehiclePlugged === true)',
  'vehicleDemandConfirmed: !!(w && w.vehicleDemandConfirmed === true)',
  'vehicleStartEligible: !!(w && w.vehicleStartEligible === true)',
  "boostPrearmAllowed: !!(w && normalizeWallboxModeOverride(w.effectiveMode) === 'boost')",
]) {
  assert.ok(source.includes(needle), `Produktivanker fehlt: ${needle}`);
}
assert.ok(source.includes('`evcs.N.active` ist die Kunden-/RFID-Freigabe'), 'Freigabe und Fahrzeugkontakt muessen fachlich getrennt sein');
assert.ok(!source.includes("this._getStateCached(`evcs.${Math.round(evcsIndex)}.active`)"), 'evcs.N.active darf nicht als Fahrzeug-/Plug-Signal gelesen werden');

const allocationSource = fs.readFileSync(path.join(root, 'src-ts/ems/charging-management/charging-allocation.ts'), 'utf8');
assert.ok(/const connected = boolValue\([\s\S]*?wallbox\.vehiclePlugged[\s\S]*?false[\s\S]*?\);/.test(allocationSource), 'TS-Allocator muss physischen Fahrzeuganschluss und Ladebedarf getrennt sowie fail-closed erfassen');
assert.ok(/const demandConfirmed = boolValue\([\s\S]*?wallbox\.vehicleDemandConfirmed[\s\S]*?connected[\s\S]*?\);/.test(allocationSource), 'TS-Allocator muss den bestaetigten Ladebedarf getrennt und mit konservativem Legacy-Fallback erfassen');
assert.ok(allocationSource.includes('modeAllowsPrearmedSetpoint(wb)'), 'TS-Allocator besitzt keine explizite Boost-Ausnahme fuer den optionalen Bedarfsnachweis');
assert.ok(allocationSource.includes('vehicleStartProbeActive'), 'TS-Allocator muss den zeitlich begrenzten universellen Startversuch transportieren');
assert.ok(allocationSource.includes('commandDemandAllowed(wb)'), 'TS-Allocator trennt bestaetigten Ladebedarf, Boost-Vorruestung und universelle Startprobe nicht zentral');


const mainSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/main.ts'), 'utf8');
for (const needle of ['vehicleConnectedId', 'chargeDemandId', 'heartbeatId', 'statusDemandValues']) {
  assert.ok(mainSource.includes(needle), `main.ts muss ${needle} bis zur Runtime durchreichen`);
}
const appCenterSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/www/ems-apps.ts'), 'utf8');
for (const needle of [
  'Fahrzeug verbunden (lesen, optional)',
  'Ladebedarf / Ladebereit (lesen, optional)',
  'Ladebedarf / Herstellerstatus (optional)',
  'statusDemandValues',
  'r.vehicleConnected',
  'r.chargeDemand',
]) {
  assert.ok(appCenterSource.includes(needle), `AppCenter-Universalität fehlt: ${needle}`);
}

console.log('[evcs-confirmed-demand-reservation] OK: Universelle Herstellerstatus-, Semantic-DP- und PV-Startreservierungslogik ist abgesichert.');
