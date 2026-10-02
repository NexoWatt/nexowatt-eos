#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const hardening = require(path.join(root, 'ems/rc85-runtime-hardening.js'));
const charging = require(path.join(root, 'ems/modules/charging-management.js'));
const audit = require(path.join(root, 'ems/services/charging-management-audit.js'));

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

// 40 kW is the import-only hard limit. Export and local support increase the
// usable EVCS target without ever increasing the permitted NVP import.
const exportEnvelope = hardening.rc85GridEnvelope({
  hardLimitW: 40_000,
  signedNvpW: -1_250,
  currentControlledLoadW: 0,
  offlineReserveW: 0,
});
assert.equal(exportEnvelope.hardLimitW, 40_000);
assert.equal(exportEnvelope.softLimitW, 36_000);
assert.equal(exportEnvelope.reserveW, 4_000);
assert.equal(exportEnvelope.hardHeadroomRawW, 41_250);
assert.equal(exportEnvelope.maxControlledLoadW, 41_250);
assert.equal(exportEnvelope.softRampFactor, 1);
assert.equal(exportEnvelope.predictedNvpAtMaximumW, 40_000);

// Inside the 36...40 kW soft band only the positive ramp is tapered. The
// absolute hard safety remains 40 kW.
const softEnvelope = hardening.rc85GridEnvelope({
  hardLimitW: 40_000,
  signedNvpW: 38_000,
  currentControlledLoadW: 20_000,
});
assert.equal(softEnvelope.softRampFactor, 0.5);
assert.equal(softEnvelope.hardHeadroomRawW, 2_000);
assert.equal(softEnvelope.progressiveIncrementW, 1_000);
assert.equal(softEnvelope.maxControlledLoadW, 21_000);
assert.equal(softEnvelope.predictedNvpAtMaximumW, 39_000);

// With no demand Gate A is monitoring only. A finite cap must never create a
// false GRID-IMPORT-LIMIT status.
let binding = hardening.rc86GridBinding({
  requestedW: 0,
  gridCapW: 41_250,
  finalTargetW: 0,
  activePoints: 0,
});
assert.equal(binding.binding, false);
assert.equal(binding.reductionW, 0);
assert.equal(binding.allowedW, 0);

// Missing optional phase/§14a caps are not zero-watt limits. `Number(null)`
// must never collapse a valid Grid-A allowance to 0 W.
binding = hardening.rc86GridBinding({
  requestedW: 11_000,
  gridCapW: 33_380,
  phaseCapW: null,
  para14aCapW: null,
  finalTargetW: 11_000,
  activePoints: 1,
});
assert.equal(binding.binding, false);
assert.equal(binding.allowedW, 11_000);
assert.equal(binding.reductionW, 0);

// A real 44 kW request is limited to the signed hard headroom.
binding = hardening.rc86GridBinding({
  requestedW: 44_000,
  gridCapW: 41_250,
  finalTargetW: 41_250,
  activePoints: 1,
});
assert.equal(binding.binding, true);
assert.equal(binding.allowedW, 41_250);
assert.equal(binding.reductionW, 2_750);

// An independent phase limit has priority and Gate A must not claim the same
// reduction a second time.
binding = hardening.rc86GridBinding({
  requestedW: 44_000,
  gridCapW: 41_250,
  phaseCapW: 30_000,
  finalTargetW: 30_000,
  activePoints: 1,
});
assert.equal(binding.binding, false);
assert.equal(binding.allowedW, 30_000);
assert.equal(binding.reductionW, 0);

// Offline/no vehicle/confirmed zero reserves no power. An offline connector
// that vanished during a real charge keeps its last known power reserved.
assert.equal(hardening.rc85OfflineReserveW([
  { status: 'offline', actualW: 0, vehicleConnected: false },
]), 0);
assert.equal(hardening.rc85OfflineReserveW([
  { status: 'offline', actualW: 9_500, vehicleConnected: true },
]), 9_500);

// A stale historical setpoint must not turn an unplugged connector into current
// demand and must therefore not activate Gate A.
const historicalCommands = new Map([['lp3', 44_000]]);
let demand = charging.estimateGridRelevantEvcsDemandW([
  {
    safe: 'lp3', online: true, controlAvailable: true, enabled: true,
    vehiclePlugged: false, connected: false, charging: false,
    vehicleDemandConfirmed: false, actualPowerW: 0, maxPW: 44_000,
    minPW: 4_140, effectiveMode: 'auto',
  },
], historicalCommands, 100);
assert.deepEqual(demand, { totalW: 0, activePoints: 0 });

demand = charging.estimateGridRelevantEvcsDemandW([
  {
    safe: 'lp1', online: true, controlAvailable: true, enabled: true,
    vehiclePlugged: true, connected: true, charging: true,
    vehicleDemandConfirmed: true, actualPowerW: 11_000, maxPW: 44_000,
    minPW: 4_140, effectiveMode: 'auto',
  },
], new Map(), 100);
assert.deepEqual(demand, { totalW: 44_000, activePoints: 1 });

// A single offline connector remains a local issue. It does not promote the
// whole EMS to GRID-IMPORT-LIMIT or EOS-SAFETY-STOP.
const snapshot = audit.buildChargingAuditSnapshot({
  ts: Date.now(),
  status: 'ok',
  safetyStop: false,
  gridImportLimitW: 40_000,
  gridImportLimitEffW: 40_000,
  gridCapEvcsW: 41_250,
  gridCapBinding: false,
  gridDemandRequestedW: 0,
  gridAllowedDemandW: 0,
  gridReductionW: 0,
  safetyEnvelope: { valid: true, emergencyStop: false },
  wallboxes: [{
    safe: 'lp3', name: 'Matthias LP3', online: false, enabled: true,
    controlAvailable: false, vehiclePlugged: false, actualPowerW: 0,
  }],
  allocations: [{ safe: 'lp3', reason: 'Ladepunkt ist offline', targetW: 0 }],
});
assert.equal(snapshot.activeLimiter, 'none');
assert.equal(snapshot.safetyStage, 'NORMAL');
assert.equal(snapshot.grid.binding, false);
assert.equal(snapshot.grid.reductionW, 0);
assert.equal(snapshot.wallboxes[0].limiter, 'offline');

const chargingSource = read('src-ts/runtime-executables/ems/modules/charging-management.ts');
const coreSource = read('src-ts/runtime-executables/ems/modules/core-limits.ts');
const mainSource = read('src-ts/runtime-executables/main.ts');
const emsUiSource = read('src-ts/runtime-executables/www/ems-apps.ts');
const diagnosticsUiSource = read('src-ts/runtime-executables/www/charging-diagnostics-appcenter.ts');

assert(chargingSource.includes('resolveCurrentNvpSnapshot(\n            this.adapter && this.adapter._nvpFreshnessSnapshot'), 'Gate A canonical NVP source missing');
assert(chargingSource.includes('hardLimitW: gridImportLimitEffW'), 'Gate A must use effective hard limit');
assert(chargingSource.includes('gridCapBinding = gridBindingDecision.binding'), 'demand-based binding result missing');
assert(chargingSource.includes('RC86_AUTO_ONLY_SOFT_GUARD'), 'Auto-only soft guard marker missing');
assert(chargingSource.includes("gridCapBinding', false"), 'monitoring state must initialize non-binding');
assert(coreSource.includes("gridImportRequiredReductionW > 0"), 'central grid-monitor distinction missing');
assert(mainSource.includes("gridDemandRequestedW: await getOwn('chargingManagement.control.gridDemandRequestedW')"), 'API demand diagnostic missing');
assert(emsUiSource.includes('überwacht – kein Eingriff'), 'Gate A monitoring label missing');
assert(diagnosticsUiSource.includes('Durch Netz-Gate reduziert'), 'charging audit reduction diagnostic missing');

const pkg = require(path.join(root, 'package.json'));
const io = require(path.join(root, 'io-package.json'));
assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
assert.equal(io.common.version, pkg.version);

console.log('[RC86] Gate A demand binding, signed hard headroom and partial-offline isolation passed');
