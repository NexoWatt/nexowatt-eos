import {
  buildEnergyFlowSnapshot,
  calculateBuildingLoadFromBalance,
  resolveGridFlow,
  resolveStorageFlow,
} from '../resolvers/energy-flow-resolver';
import { snapshotCases, storageResolverCases } from '../test-fixtures/energy-flow-resolver.cases';

/**
 * Datei: src-ts/tests/energy-flow-resolver-smoke.ts
 *
 * Zweck:
 * Compile-only Smoke-Test für den produktionsnahen Energiefluss-Resolver aus 0.7.61.
 *
 * Zusammenhang:
 * Dieser Test läuft im TypeScript-Typecheck. Er ersetzt noch keinen echten Runtime-Test,
 * legt aber fachliche Fälle fest, die bei der späteren Produktivmigration nicht
 * gebrochen werden dürfen.
 */

/**
 * Code-Teil: Speicherfälle typisiert ausführen.
 * Zweck: Stellt sicher, dass Split, signed, default-zero und Fallback-Fälle typisiert
 * durch denselben Resolver laufen.
 */
const resolvedStorageCases = storageResolverCases.map((testCase) => {
  const result = resolveStorageFlow(testCase.input);
  return {
    name: testCase.name,
    source: result.source,
    chargeW: result.chargeW,
    dischargeW: result.dischargeW,
    expectedSource: testCase.expectedSource,
  };
});

/**
 * Code-Teil: Netzfälle typisiert ausführen.
 * Zweck: Bereitet Split- und signed-Netzwerte für spätere Snapshot-Tests vor.
 */
const splitGrid = resolveGridFlow({
  hasConfiguredSplitDp: true,
  importW: 0,
  exportW: 2400,
});

const signedGrid = resolveGridFlow({
  hasConfiguredSignedDp: true,
  signedW: -2400,
  signedConvention: 'positive-import',
});

/**
 * Code-Teil: Gebäudeverbrauch aus Bilanz berechnen.
 * Zweck: Prüft die Formel, ohne produktive Runtime-Werte zu verändern.
 */
const calculatedBuildingLoadW = calculateBuildingLoadFromBalance({
  pvW: 6500,
  grid: splitGrid,
  storage: resolveStorageFlow({
    hasConfiguredSplitDp: false,
    hasConfiguredSignedDp: false,
    calculatedSignedW: -2800,
    socPct: 44,
  }),
});

/**
 * Code-Teil: vollständige Snapshots typisiert bauen.
 * Zweck: Zeigt, wie spätere Runtime-Aufrufer Rohwerte in den gemeinsamen Vertrag
 * `EnergyFlowSnapshot` überführen sollen.
 */
const snapshots = snapshotCases.map((input) => buildEnergyFlowSnapshot(input));

export const energyFlowResolverSmokeExamples = {
  resolvedStorageCases,
  splitGrid,
  signedGrid,
  calculatedBuildingLoadW,
  snapshots,
};
