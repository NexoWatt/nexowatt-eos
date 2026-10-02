import type { StorageFlowResult } from '../contracts/energy-flow';
import {
  calculateStorageFromBalance,
  chooseStorageFlowResult,
  resolveSplitGridDps,
  resolveSplitStorageDps,
  splitSignedGridPower,
  splitSignedStoragePower,
} from '../utils/energy-flow';

/**
 * Datei: src-ts/tests/energy-flow-utils-smoke.ts
 *
 * Zweck:
 * Compile-only Smoke-Test für die neuen TypeScript-Energiefluss-Helfer aus 0.7.60.
 *
 * Zusammenhang:
 * Diese Datei wird nicht vom Adapter geladen. Sie sorgt nur dafür, dass TypeScript die
 * Helfer, Verträge und Beispielwerte zusammen prüfen kann. Fachliche Runtime-Tests für
 * den produktiven Resolver folgen in einer späteren Migrationsversion.
 */

/**
 * Code-Teil: signed Speicher-DP Beispiel.
 * Zweck: Positive Leistung bedeutet Entladen, negative Leistung Laden.
 */
const signedStorageExample: StorageFlowResult = splitSignedStoragePower({
  signedW: -1400,
  socPct: 44,
  convention: 'positive-discharge',
});

/**
 * Code-Teil: Split-Speicher-DP Beispiel.
 * Zweck: Getrennte Lade-/Entlade-DPs müssen 0 W als gültigen Messwert behalten.
 */
const splitStorageExample = resolveSplitStorageDps({
  chargeW: 0,
  dischargeW: 0,
  socPct: 44,
  hasChargeDp: true,
  hasDischargeDp: true,
});

/**
 * Code-Teil: Bilanz-Fallback Beispiel.
 * Zweck: Nur ohne echten Speicher-DP darf aus PV, Verbrauch und Netz gerechnet werden.
 */
const calculatedStorageExample = calculateStorageFromBalance({
  pvW: 6500,
  buildingLoadW: 1700,
  gridImportW: 0,
  gridExportW: 2000,
  socPct: 44,
});

/**
 * Code-Teil: Quellenpriorität Beispiel.
 * Zweck: Split-DPs schlagen signed DP und Fallback, weil echte gemappte DPs Quelle der
 * Wahrheit sind.
 */
const chosenStorageExample = chooseStorageFlowResult({
  split: splitStorageExample,
  signed: signedStorageExample,
  calculated: calculatedStorageExample,
});

/**
 * Code-Teil: signed Netz-DP Beispiel.
 * Zweck: Negative signed Netzleistung bedeutet bei `positive-import` Einspeisung.
 */
const signedGridExample = splitSignedGridPower(-2400, 'positive-import');

/**
 * Code-Teil: Split-Netz-DP Beispiel.
 * Zweck: Getrennte Import-/Export-DPs werden als positive Werte geführt.
 */
const splitGridExample = resolveSplitGridDps(0, 2400, true, true);

export const energyFlowUtilsSmokeExamples = {
  signedStorageExample,
  splitStorageExample,
  calculatedStorageExample,
  chosenStorageExample,
  signedGridExample,
  splitGridExample,
};
