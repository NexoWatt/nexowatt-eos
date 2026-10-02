import type { BuildEnergyFlowSnapshotInput, ResolveStorageFlowInput } from '../resolvers/energy-flow-resolver';

/**
 * Datei: src-ts/test-fixtures/energy-flow-resolver.cases.ts
 *
 * Zweck:
 * Fachliche Testfälle für die kommende produktive Energiefluss-Migration.
 *
 * Zusammenhang:
 * Diese Fälle bilden reale Fehlerbilder aus dem Projekt ab: Split-Speicher-DPs mit
 * 0 W, signed DPs, Fallback-Rechnung, Netz Import/Export und die Regel, dass echte
 * DPs niemals durch Bilanzwerte überschrieben werden dürfen.
 */

export interface StorageResolverCase {
  name: string;
  input: ResolveStorageFlowInput;
  expectedSource: 'split-dp' | 'signed-dp' | 'calculated' | 'default-zero' | 'missing';
  expectedChargeW: number;
  expectedDischargeW: number;
}

/**
 * Code-Teil: storageResolverCases
 * Zweck: Definiert die wichtigsten Speicherfälle für spätere Runtime-Regressionstests.
 */
export const storageResolverCases: StorageResolverCase[] = [
  {
    name: 'Split-DPs mit 0 W bleiben gültige Quelle der Wahrheit',
    input: {
      hasConfiguredSplitDp: true,
      hasConfiguredSignedDp: false,
      chargeW: 0,
      dischargeW: 0,
      socPct: 44,
    },
    expectedSource: 'split-dp',
    expectedChargeW: 0,
    expectedDischargeW: 0,
  },
  {
    name: 'Signed Speicher-DP positiv bedeutet Entladen bei positive-discharge',
    input: {
      hasConfiguredSplitDp: false,
      hasConfiguredSignedDp: true,
      signedW: 1800,
      socPct: 61,
      signedConvention: 'positive-discharge',
    },
    expectedSource: 'signed-dp',
    expectedChargeW: 0,
    expectedDischargeW: 1800,
  },
  {
    name: 'Konfigurierter signed DP ohne Momentwert verhindert Rechenfallback',
    input: {
      hasConfiguredSplitDp: false,
      hasConfiguredSignedDp: true,
      signedW: null,
      calculatedSignedW: -2300,
      socPct: 50,
      signedConvention: 'positive-discharge',
    },
    expectedSource: 'default-zero',
    expectedChargeW: 0,
    expectedDischargeW: 0,
  },
  {
    name: 'Fallback wird nur ohne konfigurierten Speicher-DP genutzt',
    input: {
      hasConfiguredSplitDp: false,
      hasConfiguredSignedDp: false,
      calculatedSignedW: -2300,
      socPct: 50,
    },
    expectedSource: 'calculated',
    expectedChargeW: 2300,
    expectedDischargeW: 0,
  },
];

/**
 * Code-Teil: snapshotCases
 * Zweck: Liefert erste vollständige Energiefluss-Snapshot-Beispiele für TypeScript.
 */
export const snapshotCases: BuildEnergyFlowSnapshotInput[] = [
  {
    ts: 1710000000000,
    pvW: 6500,
    buildingLoadW: 1700,
    grid: {
      hasConfiguredSplitDp: true,
      importW: 0,
      exportW: 2000,
    },
    storage: {
      hasConfiguredSplitDp: false,
      hasConfiguredSignedDp: false,
      calculatedSignedW: -2800,
      socPct: 44,
    },
    evcsW: 0,
    heatingRodW: 0,
    thermalW: 0,
  },
  {
    ts: 1710000001000,
    pvW: 2800,
    buildingLoadW: 400,
    grid: {
      hasConfiguredSplitDp: true,
      importW: 0,
      exportW: 2400,
    },
    storage: {
      hasConfiguredSplitDp: true,
      hasConfiguredSignedDp: false,
      chargeW: 0,
      dischargeW: 0,
      calculatedSignedW: -1400,
      socPct: 44,
    },
    evcsW: 0,
    heatingRodW: 0,
    thermalW: 0,
  },
];
