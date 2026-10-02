import type { EnergyFlowSnapshot } from '../contracts/energy-flow';
import {
  calculateBuildingLoadFromBalance,
  createEnergyFlowSnapshot,
  resolveGridFlow,
  resolveStorageFlow,
} from '../resolvers/energy-flow-resolver';

/**
 * Datei: src-ts/tests/energy-flow-resolver-regression-smoke.ts
 *
 * Zweck:
 * Produktionsnahe Compile-only Regression-Fälle für die Energiefluss-Resolver-Vorbereitung
 * aus 0.7.61.
 *
 * Zusammenhang:
 * Die Datei wird nicht vom Adapter geladen. Sie beschreibt aber genau die Fälle, die vor
 * einer späteren produktiven Migration zwingend stabil bleiben müssen: Split-DP, signed DP,
 * echte 0-Werte, Bilanz-Fallback und Netzauflösung.
 */

/**
 * Code-Teil: Split-Speicher mit 0 W schlägt signed und Fallback.
 * Zweck: Schützt die History vor falschen Bilanzwerten, wenn ein echter Speicher-DP 0 W meldet.
 */
const splitStorageZeroBeatsFallback = resolveStorageFlow({
  chargeW: 0,
  dischargeW: 0,
  socPct: 44,
  hasConfiguredSplitDp: true,
  signedW: -1400,
  hasConfiguredSignedDp: true,
  calculatedSignedW: -1400,
  calculatedReason: 'Dieser Fallback darf wegen Split-DP nicht gewinnen.',
});

/**
 * Code-Teil: Signed Speicher-DP wird genutzt, wenn kein Split-DP konfiguriert ist.
 * Zweck: Unterstützt Speichersysteme mit einem einzigen Leistungs-DP mit Vorzeichen.
 */
const signedStorageFallbackToSigned = resolveStorageFlow({
  signedW: -2200,
  socPct: 51,
  hasConfiguredSignedDp: true,
  signedConvention: 'positive-discharge',
  calculatedSignedW: 400,
});

/**
 * Code-Teil: Bilanz-Fallback nur ohne Speicher-DP.
 * Zweck: Anlagen ohne Speicherleistungs-DP erhalten trotzdem eine plausible Anzeige,
 * ohne echte DPs zu überschreiben.
 */
const calculatedStorageOnlyWithoutDp = resolveStorageFlow({
  socPct: 49,
  calculatedSignedW: -900,
  calculatedReason: 'Kein Speicher-DP vorhanden, Bilanz-Fallback ist erlaubt.',
});

/**
 * Code-Teil: Netz Split-DPs behalten 0 W als gültig.
 * Zweck: Verhindert, dass 0 W Netzbezug oder 0 W Einspeisung als fehlender Wert gilt.
 */
const gridSplitZeroImport = resolveGridFlow({
  importW: 0,
  exportW: 2400,
  hasConfiguredSplitDp: true,
});

/**
 * Code-Teil: signed Netz-DP wird korrekt aufgeteilt.
 * Zweck: Unterstützt Anlagen mit einem signed Netzanschlusspunkt.
 */
const gridSignedExport = resolveGridFlow({
  signedW: -2400,
  hasConfiguredSignedDp: true,
  signedConvention: 'positive-import',
});

/**
 * Code-Teil: Gebäudeverbrauch aus belastbarer Bilanz.
 * Zweck: Der Verbrauch darf nur gerechnet werden, wenn alle Basiswerte vorhanden sind.
 */
const buildingLoadCalculated = calculateBuildingLoadFromBalance({
  pvW: 6500,
  grid: resolveGridFlow({ importW: 0, exportW: 2000, hasConfiguredSplitDp: true }),
  storage: resolveStorageFlow({ chargeW: 2800, dischargeW: 0, hasConfiguredSplitDp: true }),
});

/**
 * Code-Teil: Gemeinsamer Snapshot als Zielstruktur.
 * Zweck: Zeigt, wie die späteren produktiven Resolver LIVE, History und EMS-Budget mit
 * derselben Momentaufnahme versorgen können.
 */
const snapshotExample: EnergyFlowSnapshot = createEnergyFlowSnapshot({
  ts: 1710000000000,
  pvW: 6500,
  buildingLoadW: 1700,
  grid: {
    importW: 0,
    exportW: 2000,
    hasConfiguredSplitDp: true,
  },
  storage: {
    chargeW: 2800,
    dischargeW: 0,
    socPct: 44,
    hasConfiguredSplitDp: true,
  },
  evcsW: 0,
  heatingRodW: 0,
  thermalW: 0,
});

export const energyFlowResolverRegressionExamples = {
  splitStorageZeroBeatsFallback,
  signedStorageFallbackToSigned,
  calculatedStorageOnlyWithoutDp,
  gridSplitZeroImport,
  gridSignedExport,
  buildingLoadCalculated,
  snapshotExample,
};
