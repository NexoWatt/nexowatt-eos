import type { EnergyFlowSnapshot, GridFlowResult, StorageFlowResult } from '../contracts/energy-flow';
import type { Percent, StateId, TimestampMs, Watt } from '../contracts/units';

/**
 * Datei: src-ts/quality/regression-cases.ts
 *
 * Zweck:
 * Beschreibt Typen für spätere Regressionstests. Diese Datei enthält noch keine
 * produktive Logik. Sie legt nur fest, welche kritischen Fälle wir beim Umbau
 * nach TypeScript immer wieder prüfen müssen.
 *
 * Wichtig:
 * Diese Testfälle sind aus den bisherigen Fehlern entstanden: Speicher 0 W,
 * Split-DPs, signed DPs, Feature-Sichtbarkeit, History-Schutz und Heizstab-Reserve.
 */

/** Fachbereich, den ein Regressionstest absichern soll. */
export type RegressionDomain =
  | 'energy-flow'
  | 'storage-dp'
  | 'grid-dp'
  | 'heating-rod'
  | 'history'
  | 'feature-visibility'
  | 'license'
  | 'connection'
  | 'ai-advisor';

/** Ergebnis, das ein einzelner Regressionstest später erwarten soll. */
export interface RegressionExpectation<T = unknown> {
  /** Menschlich lesbare Beschreibung der Erwartung. */
  description: string;

  /** Erwarteter Wert oder Ergebnisvertrag. */
  expected: T;

  /** Warum diese Erwartung fachlich kritisch ist. */
  reason: string;
}

/** Gemeinsame Metadaten für spätere Regressionstestfälle. */
export interface QualityRegressionCase<TInput = unknown, TExpected = unknown> {
  id: string;
  domain: RegressionDomain;
  title: string;
  input: TInput;
  expectations: Array<RegressionExpectation<TExpected>>;
  relatedFiles: string[];
}

/** Eingabe für spätere Speicher-DP-Resolver-Tests. */
export interface StorageDpRegressionInput {
  ts: TimestampMs;
  signedPowerW?: Watt | null;
  chargeW?: Watt | null;
  dischargeW?: Watt | null;
  socPct?: Percent | null;
  hasSignedDp: boolean;
  hasSplitChargeDp: boolean;
  hasSplitDischargeDp: boolean;
  hasBuildingLoadDp: boolean;
  pvW?: Watt | null;
  gridImportW?: Watt | null;
  gridExportW?: Watt | null;
  buildingLoadW?: Watt | null;
}

/** Erwartetes Ergebnis eines späteren Speicher-DP-Resolver-Tests. */
export interface StorageDpRegressionExpected {
  storage: StorageFlowResult;
  grid?: GridFlowResult;
  snapshot?: EnergyFlowSnapshot;
}

/** Eingabe für spätere Feature-Sichtbarkeits-Tests. */
export interface FeatureVisibilityRegressionInput {
  evcsConfigured: boolean;
  evcsDatapointIds: StateId[];
  storageFarmEnabled: boolean;
  storageFarmDeviceCount: number;
  smartHomeEnabled: boolean;
}

/** Erwartete Sichtbarkeit im Kundenfrontend. */
export interface FeatureVisibilityRegressionExpected {
  showEvcs: boolean;
  showStorageFarm: boolean;
  showSmartHome: boolean;
}
