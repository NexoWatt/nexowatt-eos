#!/usr/bin/env node
'use strict';

/**
 * Regression 0.8.145: EVCS-Speicherschutz ohne Standby- und 0-W-Pulse.
 *
 * Verbindliche Regeln:
 * - Wallbox-Eigenverbrauch unterhalb der Aktivitaetsschwelle (z. B. ABL eMH1
 *   mit rund 69 W im B2-Wartezustand) ist normale Gebaeudelast und darf nicht
 *   als geschuetzte Fahrzeugladeleistung veroeffentlicht werden.
 * - Nur frische, bestaetigte Fahrzeugleistung darf den Hauslastausgleich des
 *   Speichers begrenzen oder Speicher-Assist anfordern.
 * - Eine kurze asynchrone Luecke der Batterie-Istleistung darf einen bereits
 *   per Readback bestaetigten Entladebefehl nicht auf 0 W pulsen lassen.
 * - Ist die EVCS tatsaechlich die einzige Last, bleibt 0 W ein korrekter,
 *   ausdruecklicher Speicherstopp.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const {
  resolveEvcsStoragePolicyActualLoad,
} = require(path.join(root, 'ems', 'modules', 'charging-management.js'));
const {
  resolveEvcsProtectedStorageTarget,
} = require(path.join(root, 'ems', 'modules', 'storage-control.js'));

assert.strictEqual(typeof resolveEvcsStoragePolicyActualLoad, 'function', 'EVCS actual-load helper missing');
assert.strictEqual(typeof resolveEvcsProtectedStorageTarget, 'function', 'storage protection helper missing');

const standby = resolveEvcsStoragePolicyActualLoad({
  actualPowerW: 69,
  meterFresh: true,
  online: true,
  enabled: true,
  vehicleDemandConfirmed: true,
  vehicleStateNormalized: 'ready_to_charge',
  activityThresholdW: 200,
  storageProtectionRequested: true,
});
assert.strictEqual(standby.actualVehicleLoadW, 0, '69-W standby must not be treated as vehicle charging load');
assert.strictEqual(standby.protectedLoadW, 0, '69-W standby must not activate storage protection');
assert.strictEqual(standby.protectedWallbox, false, 'standby wallbox must not be counted as protected charging point');
assert.strictEqual(standby.reason, 'standby-below-activity-threshold');

const charging = resolveEvcsStoragePolicyActualLoad({
  actualPowerW: 4200,
  meterFresh: true,
  online: true,
  enabled: true,
  vehicleDemandConfirmed: true,
  vehicleStateNormalized: 'charging',
  activityThresholdW: 200,
  storageProtectionRequested: true,
});
assert.strictEqual(charging.protectedLoadW, 4200, 'real vehicle load must be protected');
assert.strictEqual(charging.protectedWallbox, true);
assert.strictEqual(charging.reason, 'protect-actual-vehicle-load');

const assist = resolveEvcsStoragePolicyActualLoad({
  actualPowerW: 4200,
  meterFresh: true,
  online: true,
  enabled: true,
  vehicleDemandConfirmed: true,
  vehicleStateNormalized: 'charging',
  activityThresholdW: 200,
  storageProtectionRequested: true,
  storageAssistRequested: true,
});
assert.strictEqual(assist.protectedLoadW, 0, 'assist must be exclusive and must not also protect the same load');
assert.strictEqual(assist.assistRequestedLoadW, 4200, 'assist receives only real vehicle load');

const stale = resolveEvcsStoragePolicyActualLoad({
  actualPowerW: 4200,
  meterFresh: false,
  online: true,
  enabled: true,
  vehicleDemandConfirmed: true,
  vehicleStateNormalized: 'charging',
  activityThresholdW: 200,
  storageProtectionRequested: true,
});
assert.strictEqual(stale.protectedLoadW, 0, 'stale power must not remain protected');
assert.strictEqual(stale.reason, 'meter-not-fresh');

const inactiveProtection = resolveEvcsProtectedStorageTarget({
  requestedTargetW: 1500,
  lastTargetW: 1500,
  protectedEvcsLoadW: standby.protectedLoadW,
  nvpW: 50,
  targetNvpW: 50,
  storageActualW: null,
  storageDischargeBasisW: 1500,
  storageDischargeBasisSource: 'confirmed-command-anchor',
  deadbandW: 20,
});
assert.strictEqual(inactiveProtection.active, false, 'standby must leave EVCS protection completely inactive');
assert.strictEqual(inactiveProtection.targetW, 1500, 'standby must not interrupt normal self-consumption discharge');

// Real EVCS load plus 1.5-kW house load. The battery feedback is currently
// between samples, but the last command was accepted and is still the valid
// discharge basis. NVP + command - EVCS - target = 1450 W house demand.
const heldDischarge = resolveEvcsProtectedStorageTarget({
  requestedTargetW: 1500,
  lastTargetW: 1500,
  protectedEvcsLoadW: 4200,
  nvpW: 4200,
  targetNvpW: 50,
  storageActualW: null,
  storageDischargeBasisW: 1500,
  storageDischargeBasisSource: 'confirmed-command-anchor',
  deadbandW: 20,
});
assert.strictEqual(Math.round(heldDischarge.targetW), 1450, `short telemetry gap must keep house discharge, got ${heldDischarge.targetW} W`);
assert.strictEqual(heldDischarge.explicitStop, false, 'short telemetry gap must not create an explicit 0-W stop');
assert.strictEqual(heldDischarge.storageDischargeBasisSource, 'confirmed-command-anchor');

// EVCS is the only effective load: 4.2 kW EVCS - 1.5 kW storage = 2.7 kW NVP.
// Even with command fallback, the battery must stop because otherwise it would
// explicitly supply the protected vehicle load.
const evcsOnly = resolveEvcsProtectedStorageTarget({
  requestedTargetW: 1500,
  lastTargetW: 1500,
  protectedEvcsLoadW: 4200,
  nvpW: 2700,
  targetNvpW: 50,
  storageActualW: null,
  storageDischargeBasisW: 1500,
  storageDischargeBasisSource: 'confirmed-command-anchor',
  deadbandW: 20,
});
assert.strictEqual(evcsOnly.targetW, 0, 'EVCS-only demand must still stop protected storage discharge');
assert.strictEqual(evcsOnly.dischargeStop, true);
assert.strictEqual(evcsOnly.explicitStop, true);

// Without any fresh/held/confirmed discharge basis the fail-safe remains active.
const noBasis = resolveEvcsProtectedStorageTarget({
  requestedTargetW: 1500,
  lastTargetW: 1500,
  protectedEvcsLoadW: 4200,
  nvpW: 4200,
  targetNvpW: 50,
  storageActualW: null,
  storageDischargeBasisW: null,
  deadbandW: 20,
});
assert.strictEqual(noBasis.targetW, 0, 'missing all storage feedback/command bases must remain fail-safe');
assert.strictEqual(noBasis.explicitStop, true);

const chargingSource = fs.readFileSync(path.join(root, 'src-ts', 'runtime-executables', 'ems', 'modules', 'charging-management.ts'), 'utf8');
const storageSource = fs.readFileSync(path.join(root, 'src-ts', 'runtime-executables', 'ems', 'modules', 'storage-control.ts'), 'utf8');
assert(!chargingSource.includes('if (pWFreshActualForGridW > 0) {\n                if (storageAssistRequested)'), 'legacy every-positive-watt protection block must be removed');
assert(chargingSource.includes('resolveEvcsStoragePolicyActualLoad({'), 'runtime must normalize actual vehicle load after demand classification');
assert(storageSource.includes('storageDischargeBasisW: protectionStorageDischargeBasisW'), 'storage runtime must pass held/confirmed discharge basis');
assert(storageSource.includes("'async-feedback-anchor'"), 'storage runtime must prefer the non-integrating async feedback anchor during telemetry gaps');
assert(storageSource.includes('num(cfg.evcsStoragePolicyMaxAgeMs, 5000)'), 'stale EVCS protection state fallback must be short');

console.log('[evcs-storage-protection-no-standby-pulse] OK: standby is normal house load, real EV load is protected, and short battery telemetry gaps no longer pulse 0 W.');
