#!/usr/bin/env node
'use strict';

/**
 * RC42 Regression fuer das rein lesende FENECON-NVP-Shadowmodell.
 * Die Berechnung darf weder einen Adapter noch einen Hardware-Datenpunkt kennen.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  calculateFeneconNvpShadow,
} = require('../ems/services/fenecon-hybrid-control');
const {
  normalizeStorageDatapointsConfig,
} = require('../ems/services/storage-datapoint-config');

const base = {
  enabled: true,
  eligible: true,
  exclusiveSingleStorage: true,
  nativeTargetMapped: true,
  nvpW: -1000,
  nvpFresh: true,
  safetyNvpFresh: true,
  essActualW: -2000,
  essFresh: true,
  batteryTargetW: -3000,
  zeroExportTargetW: 80,
  loadW: 1000,
  pvW: 4000,
  feedForwardUsable: true,
  loadSource: 'st.feneconConsumptionTotalW',
  pvSource: 'st.feneconPvTotalPowerW',
  source: 'eigenverbrauch',
  reason: 'Eigenverbrauch',
  currentAuthority: 'fems',
  commandFamily: 'no-write-fems-self',
};

// Restlast ohne Speicher = NVP + ESS-Ist = -3000 W. Die bestehende EOS-
// Batteriepolicy -3000 W entspraeche einem FEMS-Ziel von 0 W. Fuer einen
// kleinen Bezug von +80 W waeren -3080 W Batterieladung erforderlich.
let result = calculateFeneconNvpShadow(base);
assert.equal(result.ok, true, JSON.stringify(result));
assert.equal(result.valid, true);
assert.equal(result.active, true);
assert.equal(result.readOnly, true);
assert.equal(result.writeAttempted, false);
assert.equal(result.writePermitted, false);
assert.equal(result.writesHardware, false);
assert.equal(result.residualWithoutStorageW, -3000);
assert.equal(result.translatedGridTargetW, 0);
assert.equal(result.zeroExportTargetW, 80);
assert.equal(result.zeroExportBatteryTargetRawW, -3080);
assert.equal(result.zeroExportBatteryTargetW, -3080);
assert.equal(result.predictedNvpAtZeroExportW, 80);
assert.equal(result.zeroExportAchievable, true);
assert.equal(result.proposalMode, 'zero-export-nvp');
assert.equal(result.proposedGridTargetW, 80);
assert.equal(result.predictedBatteryWAtProposal, -3080);
assert.equal(result.batteryAdjustmentToZeroExportW, -80);
assert.equal(result.currentPolicyDeltaToZeroExportW, -80);
assert.equal(result.additionalSinkOrCurtailmentW, 0);
assert.equal(result.importReductionPotentialW, 0);
assert.equal(result.plausibilityAvailable, true);
assert.equal(result.plausibilityDeltaW, 0);
assert.equal(result.plausible, true);
assert.equal(result.readyForFutureWrite, true);

// Zweites Grundbeispiel: NVP 0 W, ESS entlaedt 2000 W. Der aktuelle EOS-
// Batteriesollwert +2000 W wird in ein FEMS-NVP-Ziel von 0 W uebersetzt. Fuer
// +80 W Zielbezug waeren +1920 W Entladung erforderlich.
result = calculateFeneconNvpShadow({
  ...base,
  nvpW: 0,
  essActualW: 2000,
  batteryTargetW: 2000,
  loadW: 3000,
  pvW: 1000,
});
assert.equal(result.residualWithoutStorageW, 2000);
assert.equal(result.translatedGridTargetW, 0);
assert.equal(result.zeroExportBatteryTargetRawW, 1920);
assert.equal(result.predictedNvpAtZeroExportW, 80);
assert.equal(result.plausibilityDeltaW, 0);

// Tarif-/Reserve-/Safety-Policies duerfen im Shadow nicht in eine andere
// Batteriepolicy umgedeutet werden. Sie werden nur in ein FEMS-Netzziel
// uebersetzt.
result = calculateFeneconNvpShadow({ ...base, source: 'tarif' });
assert.equal(result.proposalMode, 'preserve-eos-battery-policy');
assert.equal(result.proposedGridTargetW, 0);
assert.equal(result.predictedBatteryWAtProposal, -3000);

// Gesamtverbrauch und PV sind optional. NVP + echte ESS-Leistung bleiben die
// minimale Regelbasis.
result = calculateFeneconNvpShadow({
  ...base,
  loadW: null,
  pvW: null,
  feedForwardUsable: false,
});
assert.equal(result.valid, true);
assert.equal(result.plausibilityAvailable, false);
assert.equal(result.plausible, null);
assert.equal(result.readyForFutureWrite, true);

// Ist die unabhaengige Last-/PV-Bilanz vorhanden, aber widerspruechlich, bleibt
// die Berechnung sichtbar, wird jedoch nicht fuer einen spaeteren Schreibtest
// freigegeben.
result = calculateFeneconNvpShadow({
  ...base,
  loadW: 7000,
  pvW: 1000,
  plausibilityToleranceW: 500,
});
assert.equal(result.valid, true);
assert.equal(result.plausibilityAvailable, true);
assert.equal(result.plausible, false);
assert.equal(result.readyForFutureWrite, false);
assert.match(result.reason, /plausibility-mismatch/);

// Die neue FENECON-NVP-Messung wird gegen die zentrale Safety-NVP-Messung
// plausibilisiert. Eine deutliche Abweichung bleibt sichtbar, aber nicht bereit.
result = calculateFeneconNvpShadow({
  ...base,
  referenceNvpW: -500,
  referenceNvpFresh: true,
  nvpReferenceToleranceW: 300,
});
assert.equal(result.nvpReferenceAvailable, true);
assert.equal(result.nvpReferenceDeltaW, -500);
assert.equal(result.nvpReferencePlausible, false);
assert.equal(result.readyForFutureWrite, false);
assert.match(result.reason, /nvp-reference-mismatch/);

// Ohne frischen zentralen Safety-NVP darf die Shadow-Berechnung weiter sichtbar
// sein, aber niemals als spaeter schreibbereit markiert werden.
result = calculateFeneconNvpShadow({ ...base, safetyNvpFresh: false });
assert.equal(result.valid, true);
assert.equal(result.readyForFutureWrite, false);
assert.match(result.reason, /central-safety-nvp-missing/);

// Ohne echten FEMS-NVP-Aktor ist der Shadow weiterhin berechenbar, aber nicht
// fuer eine spaetere kontrollierte Aktivierung bereit.
result = calculateFeneconNvpShadow({ ...base, nativeTargetMapped: false });
assert.equal(result.valid, true);
assert.equal(result.readyForFutureWrite, false);
assert.match(result.reason, /native-target-missing/);

// Fehlende Pflichtmesswerte werden niemals als 0 W interpretiert.
for (const patch of [
  { nvpW: null, nvpFresh: false },
  { nvpW: '', nvpFresh: true },
  { essActualW: null, essFresh: false },
  { essActualW: '   ', essFresh: true },
  { batteryTargetW: null },
]) {
  result = calculateFeneconNvpShadow({ ...base, ...patch });
  assert.equal(result.valid, false, JSON.stringify({ patch, result }));
  assert.equal(result.readyForFutureWrite, false);
  assert.equal(result.proposedGridTargetW, null);
  assert.equal(result.writeAttempted, false);
}

// Widerspruechliche Leistungsgrenzen blockieren die Shadow-Berechnung.
result = calculateFeneconNvpShadow({ ...base, minBatteryW: 2000, maxBatteryW: -2000 });
assert.equal(result.valid, false);
assert.equal(result.reason, 'battery-limits-invalid');

// Reicht die Batterie-Ladeleistung fuer +80 W NVP nicht aus, wird der
// verbleibende Exportbedarf als zusaetzliche Senke/PV-Abregelung sichtbar.
result = calculateFeneconNvpShadow({ ...base, minBatteryW: -3000, maxBatteryW: 5000 });
assert.equal(result.valid, true);
assert.equal(result.zeroExportBatteryTargetRawW, -3080);
assert.equal(result.zeroExportBatteryTargetW, -3000);
assert.equal(result.predictedNvpAtZeroExportW, 0);
assert.equal(result.zeroExportWithinBatteryLimits, false);
assert.equal(result.zeroExportAchievable, false);
assert.equal(result.batteryLimitShortfallW, 80);
assert.equal(result.additionalSinkOrCurtailmentW, 80);
assert.equal(result.importReductionPotentialW, 0);
assert.equal(result.readyForFutureWrite, false);

// Ist die Entladeleistung begrenzt, zeigt der Shadow den verbleibenden Import,
// den andere flexible Quellen oder eine hoehere ESS-Freigabe reduzieren muessten.
result = calculateFeneconNvpShadow({
  ...base,
  nvpW: 500,
  essActualW: 1500,
  batteryTargetW: 1500,
  loadW: 3000,
  pvW: 1000,
  minBatteryW: -5000,
  maxBatteryW: 1500,
});
assert.equal(result.residualWithoutStorageW, 2000);
assert.equal(result.zeroExportBatteryTargetRawW, 1920);
assert.equal(result.zeroExportBatteryTargetW, 1500);
assert.equal(result.predictedNvpAtZeroExportW, 500);
assert.equal(result.additionalSinkOrCurtailmentW, 0);
assert.equal(result.importReductionPotentialW, 420);

// Statischer Vertrag der neuen Device-Aliase und read-only Mappings.
const root = path.join(__dirname, '..');
const appCenter = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/www/ems-apps.ts'), 'utf8');
const mapping = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/storage-mapping.ts'), 'utf8');
assert.match(appCenter, /r\.nvpPower/);
assert.match(appCenter, /r\.consumptionTotal/);
assert.match(mapping, /key:\s*'st\.feneconNvpPowerW'[\s\S]{0,260}direction:\s*'in'/);
assert.match(mapping, /key:\s*'st\.feneconConsumptionTotalW'[\s\S]{0,260}direction:\s*'in'/);

const normalizedMappings = normalizeStorageDatapointsConfig({
  datapoints: {
    feneconNvpPowerId: 'nexowatt-devices.0.fenecon.aliases.r.nvpPower',
    feneconLoadTotalId: 'nexowatt-devices.0.fenecon.aliases.r.consumptionTotal',
  },
});
assert.equal(
  normalizedMappings.feneconNvpPowerObjectId,
  'nexowatt-devices.0.fenecon.aliases.r.nvpPower',
);
assert.equal(
  normalizedMappings.feneconConsumptionTotalObjectId,
  'nexowatt-devices.0.fenecon.aliases.r.consumptionTotal',
);

console.log('[fenecon-nvp-shadow] OK: read-only Formel, Device-Aliase, 0-Einspeisung, Grenzen und Plausibilitaet geprueft');
