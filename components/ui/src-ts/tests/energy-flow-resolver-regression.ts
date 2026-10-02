import type { GridFlowResult, StorageFlowResult } from '../contracts/energy-flow';
import type { Watt } from '../contracts/units';
import {
  buildEnergyFlowSnapshot,
  calculateBuildingLoadFromBalance,
  resolveGridFlow,
  resolveStorageFlow,
} from '../resolvers/energy-flow-resolver';

/**
 * Datei: src-ts/tests/energy-flow-resolver-regression.ts
 *
 * Zweck:
 * Compile-only Regression-Beispiele für den produktionsnahen TypeScript-
 * Energiefluss-Resolver aus 0.7.61.
 *
 * Zusammenhang:
 * Diese Beispiele laufen nicht im Adapter. Sie zwingen TypeScript aber, die
 * wichtigsten Speicher-/Netz-/Fallback-Fälle zu prüfen, bevor wir später die
 * Runtime-Resolver aus `main.js`, `www/app.js`, `core-limits.js` und Heizstablogik
 * schrittweise ersetzen.
 */

/**
 * Code-Teil: splitStorageZeroIsValid
 * Zweck: Getrennte Speicher-DPs mit 0 W müssen als gültige Messwerte gelten.
 */
const splitStorageZeroIsValid: StorageFlowResult = resolveStorageFlow({
  hasConfiguredSplitDp: true,
  hasConfiguredSignedDp: false,
  chargeW: 0,
  dischargeW: 0,
  socPct: 44,
});

/**
 * Code-Teil: signedStoragePositiveDischarge
 * Zweck: Ein signed Speicher-DP bleibt gültig, wenn keine Split-DPs konfiguriert sind.
 */
const signedStoragePositiveDischarge: StorageFlowResult = resolveStorageFlow({
  hasConfiguredSignedDp: true,
  hasConfiguredSplitDp: false,
  signedW: 1800,
  signedConvention: 'positive-discharge',
  socPct: 51,
});

/**
 * Code-Teil: configuredDpBlocksFallback
 * Zweck: Ein konfigurierter Speicher-DP ohne Zahlenwert darf nicht durch Bilanzrechnung ersetzt werden.
 */
const configuredDpBlocksFallback: StorageFlowResult = resolveStorageFlow({
  hasConfiguredSplitDp: true,
  hasConfiguredSignedDp: false,
  chargeW: undefined,
  dischargeW: undefined,
  socPct: 44,
  balance: {
    pvW: 6000,
    gridImportW: 0,
    gridExportW: 3000,
    additionalKnownLoadW: 1000,
  },
});

/**
 * Code-Teil: storageFallbackOnlyWithoutDp
 * Zweck: Bilanz-Fallback ist nur erlaubt, wenn kein Speicher-DP konfiguriert ist.
 */
const storageFallbackOnlyWithoutDp: StorageFlowResult = resolveStorageFlow({
  hasConfiguredSplitDp: false,
  hasConfiguredSignedDp: false,
  calculatedSignedW: -2800,
  socPct: 44,
});

/**
 * Code-Teil: splitGridResolver
 * Zweck: Getrennte Netz-DPs bleiben Quelle der Wahrheit und führen positive Werte.
 */
const splitGridResolver: GridFlowResult = resolveGridFlow({
  hasConfiguredSplitDp: true,
  importW: 0,
  exportW: 2400,
});

/**
 * Code-Teil: signedGridResolver
 * Zweck: Signed Netzanschlusspunkt wird je nach Vorzeichenkonvention auf Bezug/Einspeisung aufgeteilt.
 */
const signedGridResolver: GridFlowResult = resolveGridFlow({
  hasConfiguredSignedDp: true,
  signedW: -2400,
  signedConvention: 'positive-import',
});

/**
 * Code-Teil: buildingLoadBalance
 * Zweck: Gebäudelast kann aus PV, Netz und Speicher berechnet werden, wenn kein direkter Verbrauchs-DP vorhanden ist.
 */
const buildingLoadBalance: Watt | null = calculateBuildingLoadFromBalance({
  pvW: 6500,
  grid: splitGridResolver,
  storage: storageFallbackOnlyWithoutDp,
});

/**
 * Code-Teil: snapshotFromResolver
 * Zweck: Vollständiger Snapshot-Vertrag für spätere produktive Aufrufstellen.
 */
const snapshotFromResolver = buildEnergyFlowSnapshot({
  ts: 1710000000000,
  pvW: 6500,
  buildingLoadW: 1700,
  grid: { hasConfiguredSplitDp: true, importW: 0, exportW: 2000 },
  storage: { hasConfiguredSplitDp: false, hasConfiguredSignedDp: false, calculatedSignedW: -2800, socPct: 44 },
  evcsW: 0,
  heatingRodW: 0,
  thermalW: 0,
});

export const energyFlowResolverRegressionExamples = {
  splitStorageZeroIsValid,
  signedStoragePositiveDischarge,
  configuredDpBlocksFallback,
  storageFallbackOnlyWithoutDp,
  splitGridResolver,
  signedGridResolver,
  buildingLoadBalance,
  snapshotFromResolver,
};
