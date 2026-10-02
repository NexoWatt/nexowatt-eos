#!/usr/bin/env node
'use strict';

/**
 * Verifiziert die RC41-Härtung des Heizstab-TS-Shadowpfads.
 *
 * Sicherheitsziel:
 * - TS und Runtime verwenden dieselbe kumulierte, angelernte Stufenleistung.
 * - Eine reine Watt-Diagnose bei identischer Zielstufe blockiert den Normalpfad nicht.
 * - Eine echte Zielstufenabweichung bleibt blockierend und warnwürdig.
 * - Manuelle/§14a-/0-W-Sonderpfade werden nicht mit dem normalen PV-Autopfad verglichen.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { HeatingRodControlModule } = require('../ems/modules/heating-rod-control');

const runtimeText = fs.readFileSync(path.join(__dirname, '..', 'ems', 'modules', 'heating-rod-control.js'), 'utf8');
assert.ok(
  runtimeText.includes('const heatingRodTsShadowEntries = (heatingRodTsProductiveEntries || []).map'),
  'Shadow-Diagnose darf nur Geräte des tatsächlich erreichten produktiven PV-Autopfads vergleichen.',
);
assert.ok(
  runtimeText.includes("para14aLimitedAuto\n                    ? 'para14a-limited-after-decision'"),
  'Eine nachgelagerte §14a-Stufenbegrenzung muss den allgemeinen Shadowvergleich überspringen.',
);
assert.ok(
  runtimeText.includes("'ts-js-stage-mismatch', 'storage-protect-blocks-ts-normal'"),
  'Die veröffentlichte Fallbackdiagnose muss Zielstufenabweichungen als harten Grund ausweisen.',
);

const warnings = [];
const adapter = {
  config: { heatingRod: {} },
  log: {
    warn(message) { warnings.push(String(message)); },
    debug() {},
  },
  async setStateAsync() {},
  updateValue() {},
};

const control = new HeatingRodControlModule(adapter, null);
const device = {
  id: 'c2',
  name: 'Heizstab 2',
  enabled: true,
  mode: 'pvAuto',
  maxPowerW: 6000,
  stageCount: 3,
  wiredStages: 3,
  stages: [
    { index: 1, powerW: 2000 },
    { index: 2, powerW: 2000 },
    { index: 3, powerW: 2000 },
  ],
};

control._stageCtl.set(device.id, {
  targetStage: 2,
  lastIncreaseMs: 0,
  lastDecreaseMs: 0,
  stagePowerScale: 0.5,
});

function shadowEntry(overrides = {}) {
  return {
    device,
    deviceId: device.id,
    jsTargetStage: 2,
    jsTargetW: 2000,
    jsStatus: 'pv_auto',
    observedStage: 2,
    measuredW: null,
    effectiveMode: 'pvAuto',
    zeroExportActive: false,
    availablePvW: 2500,
    availableTotalW: 2500,
    allowGridImport: false,
    storageProtectActive: false,
    storageSocPct: 80,
    storageReserveSocPct: 20,
    storageReserveW: 0,
    ...overrides,
  };
}

const modeledStages = control._buildHeatingRodTsStageModel(device, 2, null);
assert.deepEqual(modeledStages, [
  { stage: 1, powerW: 1000 },
  { stage: 2, powerW: 2000 },
  { stage: 3, powerW: 3000 },
], 'Das TS-Stufenmodell muss kumulierte Leistung und angelernten Faktor 0,5 verwenden.');

const exact = control._runHeatingRodTsShadowComparison([shadowEntry()]);
assert.equal(exact.ok, true);
assert.equal(exact.exactMatch, true);
assert.equal(exact.blockingMismatchCount, 0);
assert.equal(exact.diagnosticMismatchCount, 0);
assert.equal(warnings.length, 0, 'Bei identischem Schaltentscheid darf keine Warnung entstehen.');

const powerOnly = control._runHeatingRodTsShadowComparison([shadowEntry({ jsTargetW: 1900 })]);
assert.equal(powerOnly.ok, true, 'Eine reine Watt-Diagnose darf den Shadowpfad nicht blockieren.');
assert.equal(powerOnly.exactMatch, false);
assert.equal(powerOnly.mismatches.length, 0);
assert.equal(powerOnly.diagnosticMismatches.length, 1);
assert.equal(powerOnly.diagnosticMismatches[0].field, 'targetPowerW');
assert.equal(warnings.length, 0, 'Eine reine targetPowerW-Abweichung darf kein Warn-Log erzeugen.');

const productivePowerOnly = control._evaluateHeatingRodTsProductiveDecision(shadowEntry({ jsTargetW: 1900 }));
assert.equal(productivePowerOnly.active, true);
assert.equal(productivePowerOnly.fallback, false);
assert.equal(productivePowerOnly.targetStage, 2);
assert.equal(productivePowerOnly.targetW, 2000);
assert.equal(productivePowerOnly.mismatches.length, 0);
assert.equal(productivePowerOnly.blockingReferenceMismatches.length, 0);
assert.equal(productivePowerOnly.diagnosticReferenceMismatches.length, 1);

const stageMismatch = control._runHeatingRodTsShadowComparison([
  shadowEntry({ jsTargetStage: 1, jsTargetW: 1000 }),
]);
assert.equal(stageMismatch.ok, false, 'Eine Zielstufenabweichung muss blockierend bleiben.');
assert.equal(stageMismatch.blockingMismatchCount, 1);
assert.equal(stageMismatch.mismatches[0].field, 'targetStage');
assert.equal(warnings.length, 1, 'Eine echte Zielstufenabweichung muss genau eine Warnung erzeugen.');

const productiveStageMismatch = control._evaluateHeatingRodTsProductiveDecision(
  shadowEntry({ normalPathReady: true, jsTargetStage: 1, jsTargetW: 1000 }),
);
assert.equal(productiveStageMismatch.active, false);
assert.equal(productiveStageMismatch.fallback, true);
assert.equal(productiveStageMismatch.fallbackReason, 'ts-js-stage-mismatch');
assert.equal(productiveStageMismatch.normalPathTakenOver, false);
assert.equal(productiveStageMismatch.jsReferenceBlocking, true);
assert.equal(productiveStageMismatch.blockingReferenceMismatches.length, 1);

const skipped = control._runHeatingRodTsShadowComparison([
  shadowEntry({ jsStatus: 'para14a_limited_pv_auto' }),
  shadowEntry({ effectiveMode: 'manual', jsStatus: 'external_manual_knx_observed' }),
  shadowEntry({ zeroExportActive: true, jsStatus: 'zero_export_forecast_auto' }),
  shadowEntry({ skipReason: 'storage-protect-blocks-ts-normal' }),
]);
assert.equal(skipped.ok, true);
assert.equal(skipped.skippedCount, 4);
assert.equal(skipped.mismatches.length, 0);
assert.equal(warnings.length, 1, 'Übersprungene Sonderpfade dürfen keine weitere Warnung erzeugen.');

console.log('[heating-rod-shadow-calibration-parity] OK: Modellparität, Diagnoseklassifikation und Warnbegrenzung sind stabil.');
