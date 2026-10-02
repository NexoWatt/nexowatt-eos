#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const releaseVersion = require(path.join(root, 'package.json')).version;
const auditRuntime = require(path.join(root, 'ems/services/charging-management-audit.js'));
const overviewRuntime = require(path.join(root, 'ems/services/admin-overview-publisher.js'));

function stateCache(values) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { value, ts: Date.now() }]));
}

function buildAdapter(values, version = releaseVersion) {
  return {
    version,
    packageVersion: version,
    config: { port: 8188 },
    stateCache: stateCache(values),
  };
}

const now = Date.now();

// A connected vehicle without confirmed charging demand is a local operating
// state. NVP monitoring remains active, but no real request is reduced.
const idleAudit = auditRuntime.buildChargingAuditSnapshot({
  ts: now,
  status: 'ok',
  mode: 'auto',
  controlActive: true,
  budgetW: 29_850,
  remainingPowerW: 29_850,
  gridImportW: -150,
  gridImportLimitW: 30_000,
  gridImportLimitEffW: 30_000,
  gridCapEvcsW: 30_150,
  gridCapBinding: false,
  gridSoftRampFactor: 1,
  gridDemandRequestedW: 0,
  gridAllowedDemandW: 0,
  gridReductionW: 0,
  safetyEnvelope: { valid: true, emergencyStop: false },
  wallboxes: [{
    safe: 'lp1',
    name: 'Test LP1',
    online: true,
    enabled: true,
    controlAvailable: true,
    connected: true,
    vehiclePlugged: true,
    vehicleDemandConfirmed: false,
    charging: false,
    actualPowerW: 0,
    targetW: 0,
  }],
  allocations: [{
    safe: 'lp1',
    targetW: 0,
    reason: 'explicit-no-charge-demand',
    applyStatus: 'unchanged',
  }],
});

assert.equal(idleAudit.wallboxes[0].limiter, 'no-charge-demand');
assert.equal(idleAudit.activeLimiter, 'none');
assert.equal(idleAudit.limitActive, false);
assert.equal(idleAudit.safetyStage, 'NORMAL');
assert.equal(idleAudit.grid.monitoring, true);
assert.equal(idleAudit.grid.binding, false);

const commonValues = {
  'chargingManagement.audit.snapshotJson': JSON.stringify(idleAudit),
  // Deliberately retain the old persisted value to prove upgrade compatibility.
  'chargingManagement.audit.activeLimiter': 'no-charge-demand',
  'chargingManagement.audit.safetyStage': 'NORMAL',
  'chargingManagement.audit.safetyActive': false,
  'chargingManagement.audit.problemCount': 0,
  'chargingManagement.wallboxCount': 1,
  'chargingManagement.summary.totalPowerW': 0,
  'chargingManagement.summary.totalTargetPowerW': 0,
  'chargingManagement.summary.totalReservedPowerW': 0,
  'chargingManagement.summary.lastUpdate': now,
  'chargingManagement.control.active': true,
  'chargingManagement.control.status': 'ok',
  'chargingManagement.control.mode': 'auto',
  'chargingManagement.control.gridCapBinding': false,
  'chargingManagement.control.phaseCapBinding': false,
  'chargingManagement.control.para14aActive': false,
  'chargingManagement.control.para14aBinding': false,
  'ems.core.lastTickStart': now - 1_000,
  'ems.core.lastTickDurationMs': 650,
  'ems.core.lastTickError': '',
  'ems.safety.valid': true,
  'ems.safety.emergencyStop': false,
  'ems.safety.reason': '',
  'ems.safety.gridHeadroomW': 30_150,
  'ems.safety.evcsCapW': 30_150,
  'ems.budget.active': true,
  'ems.budget.mode': 'central-background-ts-runtime',
  'ems.budget.source': 'core-limits',
  'ems.budget.lastUpdate': now,
  'ems.budget.totalBudgetW': 29_850,
  'ems.budget.remainingTotalW': 29_850,
  'ems.budget.flexUsedW': 0,
  'ems.budget.binding': 'grid-monitor',
  'ems.budget.gridW': -150,
  'ems.budget.gridImportW': 0,
  'ems.budget.gridExportW': 150,
  'ems.budget.pvPowerW': 800,
  'ems.budget.pvBudgetW': 0,
  'ems.budget.remainingPvW': 0,
  'gridConstraints.exportLimit.enabled': false,
  'gridConstraints.exportLimit.diagnosticOnly': false,
  'gridConstraints.exportLimit.exportOverLimitW': 0,
  'gridConstraints.exportLimit.statusLabel': 'inactive',
  'speicher.regelung.topologie': 'none',
  'tarif.aktiv': true,
  'tarif.state': 'expensive',
  'tarif.currentPriceFresh': true,
  'forecast.effective.source': 'open-meteo-gti',
  'forecast.effective.fresh': true,
};

const idleContract = overviewRuntime.buildOverviewContract(buildAdapter(commonValues), now);
assert.equal(idleContract.status, 'ok');
assert.equal(idleContract.binding, 'none');
assert.equal(idleContract.budget.binding, 'none');
assert.equal(idleContract.budget.rawBinding, 'grid-monitor');
assert.equal(idleContract.budget.gridMonitoring, true);
assert.equal(idleContract.budget.gridSoftActive, false);
assert.equal(idleContract.budget.gridHardActive, false);
assert.equal(idleContract.charging.limiter, 'none');
assert.equal(idleContract.charging.informationalState, 'no-charge-demand');
assert.match(idleContract.headline, /Kein aktiver Ladebedarf/);
assert.doesNotMatch(idleContract.headline, /begrenzt/i);
assert.match(idleContract.reason, /keine aktive Begrenzung|aktuell unter Soft- und Hardlimit/i);
assert.equal(idleContract.currentDecisions.find((row) => row.subsystem === 'budget').severity, 'ok');

// Negative NVP/export alone is never a limitation. Only a configured and
// exceeded export limit may turn the overview yellow.
const exportOnlyContract = overviewRuntime.buildOverviewContract(buildAdapter({
  ...commonValues,
  'ems.budget.gridW': -5_000,
  'ems.budget.gridExportW': 5_000,
}), now);
assert.equal(exportOnlyContract.status, 'ok');
assert.equal(exportOnlyContract.binding, 'none');

const exportLimitedContract = overviewRuntime.buildOverviewContract(buildAdapter({
  ...commonValues,
  'gridConstraints.exportLimit.enabled': true,
  'gridConstraints.exportLimit.exportOverLimitW': 750,
  'gridConstraints.exportLimit.statusLabel': 'limit active',
}), now);
assert.equal(exportLimitedContract.status, 'warning');
assert.equal(exportLimitedContract.binding, 'export-limit');
assert.match(exportLimitedContract.headline, /Export-Limit/);

const exportDiagnosticContract = overviewRuntime.buildOverviewContract(buildAdapter({
  ...commonValues,
  'gridConstraints.exportLimit.enabled': true,
  'gridConstraints.exportLimit.diagnosticOnly': true,
  'gridConstraints.exportLimit.exportOverLimitW': 750,
  'gridConstraints.exportLimit.statusLabel': 'diagnostic over limit',
}), now);
assert.equal(exportDiagnosticContract.status, 'warning');
assert.equal(exportDiagnosticContract.binding, 'none');
assert.equal(exportDiagnosticContract.budget.exportLimitExceeded, true);
assert.equal(exportDiagnosticContract.budget.exportLimitActive, false);
assert.match(exportDiagnosticContract.headline, /Diagnosemodus/);
assert.doesNotMatch(exportDiagnosticContract.headline, /begrenzt aktuell/i);

// The soft band is the first real warning state. Hard limit is the hard/error
// state. These tests affect only the overview interpretation, not control.
const softAudit = {
  ...idleAudit,
  grid: { ...idleAudit.grid, importW: 28_500, softRampFactor: 0.5, reductionW: 0, binding: false },
};
const softContract = overviewRuntime.buildOverviewContract(buildAdapter({
  ...commonValues,
  'chargingManagement.audit.snapshotJson': JSON.stringify(softAudit),
  'chargingManagement.audit.activeLimiter': 'none',
  'ems.budget.binding': 'grid-monitor',
  'ems.budget.gridW': 28_500,
  'ems.budget.gridImportW': 28_500,
  'ems.budget.gridExportW': 0,
}), now);
assert.equal(softContract.status, 'warning');
assert.equal(softContract.binding, 'grid-soft');
assert.match(softContract.headline, /Softlimit/);

const hardAudit = {
  ...idleAudit,
  grid: { ...idleAudit.grid, importW: 30_000, softRampFactor: 0, reductionW: 2_000, binding: true },
};
const hardContract = overviewRuntime.buildOverviewContract(buildAdapter({
  ...commonValues,
  'chargingManagement.audit.snapshotJson': JSON.stringify(hardAudit),
  'chargingManagement.audit.activeLimiter': 'grid-import',
  'chargingManagement.control.gridCapBinding': true,
  'ems.budget.binding': 'grid-hard',
  'ems.budget.gridW': 30_000,
  'ems.budget.gridImportW': 30_000,
  'ems.budget.gridExportW': 0,
}), now);
assert.equal(hardContract.status, 'error');
assert.equal(hardContract.binding, 'grid-hard');
assert.match(hardContract.headline, /Hardlimit/);

// Continuous watt fluctuations must update the live snapshot but must not add
// a new overview event unless the operating state actually changes.
const fluctuatingContract = overviewRuntime.buildOverviewContract(buildAdapter({
  ...commonValues,
  'ems.budget.totalBudgetW': 29_910,
  'ems.budget.remainingTotalW': 29_910,
  'speicher.regelung.topologie': 'single',
  'speicher.regelung.sollW': -820,
  'speicher.regelung.acceptedSollW': -820,
  'speicher.regelung.batteryPowerFeedbackMeasuredW': -745,
  'speicher.regelung.schreibStatus': 'applied',
}), now);
const fluctuatingContract2 = overviewRuntime.buildOverviewContract(buildAdapter({
  ...commonValues,
  'ems.budget.totalBudgetW': 29_780,
  'ems.budget.remainingTotalW': 29_780,
  'speicher.regelung.topologie': 'single',
  'speicher.regelung.sollW': -900,
  'speicher.regelung.acceptedSollW': -900,
  'speicher.regelung.batteryPowerFeedbackMeasuredW': -770,
  'speicher.regelung.schreibStatus': 'applied',
}), now + 2_000);
assert.equal(overviewRuntime.eventSignature(fluctuatingContract), overviewRuntime.eventSignature(fluctuatingContract2));

const legacyEvent = overviewRuntime.normalizeAuditEvent({
  ts: now,
  type: 'global',
  severity: 'warn',
  limiter: 'no-charge-demand',
  name: 'Lademanagement',
  message: 'Kein Fahrzeug-Ladebedarf begrenzt aktuell die Regelung',
});
assert(legacyEvent);
assert.equal(legacyEvent.severity, 'info');
assert.doesNotMatch(legacyEvent.message, /begrenzt aktuell/i);
assert.equal(legacyEvent.reason, 'Keine aktive Begrenzung');

const pkg = require(path.join(root, 'package.json'));
const io = require(path.join(root, 'io-package.json'));
assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
assert.equal(io.common.version, pkg.version);

console.log('[RC87] Monitoring-only NVP/no-demand display and real soft/hard/export limit states passed');
