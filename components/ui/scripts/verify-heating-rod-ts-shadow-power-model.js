#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-heating-rod-ts-shadow-power-model.js
 *
 * Zweck:
 * Reproduziert die Feldmeldung `c2.targetPowerW` und prüft, dass JS-Referenz,
 * TS-Entscheidung und das angelernte/kumulierte Stufenmodell dieselbe Datenbasis
 * verwenden. Zusätzlich wird abgesichert, dass reine Watt-Diagnoseabweichungen
 * nicht warnen, echte Zielstufenabweichungen aber weiterhin fail-closed blockieren.
 */

const assert = require('assert');
const path = require('path');
const { HeatingRodControlModule } = require(path.join('..', 'ems', 'modules', 'heating-rod-control'));

function createFixture() {
  const warnings = [];
  const adapter = {
    config: {},
    log: {
      warn: (message) => warnings.push(String(message)),
      debug: () => undefined,
      info: () => undefined,
      error: () => undefined,
    },
  };
  const module = new HeatingRodControlModule(adapter, null);
  const device = {
    id: 'c2',
    enabled: true,
    mode: 'pvAuto',
    maxPowerW: 4000,
    stageCount: 2,
    wiredStages: 2,
    stages: [
      { index: 1, powerW: 2000, writeId: 'relay.1', readId: 'relay.1' },
      { index: 2, powerW: 2000, writeId: 'relay.2', readId: 'relay.2' },
    ],
  };
  module._stageCtl.set('c2', {
    targetStage: 1,
    lastIncreaseMs: 0,
    lastDecreaseMs: 0,
    stagePowerScale: 0.9,
  });
  const baseEntry = {
    normalPathReady: true,
    device,
    deviceId: 'c2',
    jsTargetStage: 1,
    jsTargetW: 1800,
    jsStatus: 'pv_auto',
    observedStage: 1,
    measuredW: 1800,
    effectiveMode: 'pvAuto',
    availablePvW: 2100,
    availableTotalW: 2100,
    allowGridImport: false,
    storageProtectActive: false,
    storageSocPct: 80,
    storageReserveSocPct: 20,
    storageReserveW: 0,
  };
  return { module, device, baseEntry, warnings };
}

function verifyCalibratedCumulativeModel() {
  const { module, baseEntry, warnings } = createFixture();
  const productive = module._evaluateHeatingRodTsProductiveDecision(baseEntry);
  assert.strictEqual(productive.fallback, false, 'Kalibriertes Modell darf nicht auf JS zurückfallen.');
  assert.strictEqual(productive.targetStage, 1, '2100 W Budget darf bei real 1800/3600 W nur Stufe 1 wählen.');
  assert.strictEqual(productive.targetW, 1800, 'TS-Zielwert muss den angelernten 0,9-Faktor verwenden.');
  assert.deepStrictEqual(productive.input.device.stages, [
    { stage: 1, powerW: 1800 },
    { stage: 2, powerW: 3600 },
  ], 'TS muss kumulierte und angelernte Stufenleistungen erhalten.');

  const shadow = module._runHeatingRodTsShadowComparison([baseEntry]);
  assert.strictEqual(shadow.ok, true, 'Kalibriertes Shadow-Modell muss schaltseitig OK sein.');
  assert.strictEqual(shadow.exactMatch, true, 'Kalibriertes Shadow-Modell muss exakt übereinstimmen.');
  assert.deepStrictEqual(shadow.mismatches, []);
  assert.deepStrictEqual(shadow.diagnosticMismatches, []);
  assert.deepStrictEqual(warnings, [], 'Exakter Gleichstand darf keine Warnung ausgeben.');
}

function verifyPowerOnlyMismatchIsDiagnostic() {
  const { module, baseEntry, warnings } = createFixture();
  const entry = { ...baseEntry, normalPathReady: false, jsTargetW: 1750 };
  const productive = module._evaluateHeatingRodTsProductiveDecision(entry);
  assert.strictEqual(productive.fallback, false, 'Reine Watt-Diagnoseabweichung darf die identische Zielstufe nicht blockieren.');
  assert.strictEqual(productive.targetStage, 1);
  assert.strictEqual(productive.referenceMismatches.length, 1);
  assert.strictEqual(productive.referenceMismatches[0].field, 'targetPowerW');
  assert.deepStrictEqual(productive.blockingReferenceMismatches, []);

  const shadow = module._runHeatingRodTsShadowComparison([entry]);
  assert.strictEqual(shadow.ok, true, 'Reine Watt-Abweichung ist kein Schaltblocker.');
  assert.strictEqual(shadow.exactMatch, false, 'Diagnoseabweichung muss sichtbar bleiben.');
  assert.deepStrictEqual(shadow.mismatches, []);
  assert.strictEqual(shadow.diagnosticMismatches.length, 1);
  assert.strictEqual(shadow.diagnosticMismatches[0].field, 'targetPowerW');
  assert.deepStrictEqual(warnings, [], 'Reine Watt-Diagnose darf das Warnlog nicht füllen.');
}

function verifyStageMismatchStillBlocks() {
  const { module, baseEntry, warnings } = createFixture();
  const entry = {
    ...baseEntry,
    normalPathReady: true,
    jsTargetStage: 0,
    jsTargetW: 0,
  };
  const productive = module._evaluateHeatingRodTsProductiveDecision(entry);
  assert.strictEqual(productive.fallback, true, 'Zielstufenabweichung muss auch im TS-Normalpfad blockieren.');
  assert.strictEqual(productive.fallbackReason, 'ts-js-stage-mismatch');
  assert.strictEqual(productive.targetStage, 0, 'Fail-closed muss der JS-Referenzwert bestehen bleiben.');
  assert.strictEqual(productive.normalPathTakenOver, false, 'Bei Schaltkonflikt darf der TS-Normalpfad nicht übernehmen.');
  assert.strictEqual(productive.jsReferenceBlocking, true, 'Die JS-Referenz muss den Schaltkonflikt blockieren.');
  assert.ok(productive.blockingReferenceMismatches.some((item) => item.field === 'targetStage'));

  const shadow = module._runHeatingRodTsShadowComparison([entry]);
  assert.strictEqual(shadow.ok, false, 'Zielstufenabweichung muss Shadow blockieren.');
  assert.ok(shadow.mismatches.some((item) => item.field === 'targetStage'));
  assert.strictEqual(warnings.length, 1, 'Echte Schaltabweichung muss einmal gewarnt werden.');
  assert.match(warnings[0], /c2\.targetStage/);
}

verifyCalibratedCumulativeModel();
verifyPowerOnlyMismatchIsDiagnostic();
verifyStageMismatchStillBlocks();
console.log('[heating-rod-ts-shadow-power-model] OK: kalibriertes Stufenmodell, logarme Diagnose und blockierende Zielstufensicherheit geprüft.');
