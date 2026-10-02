/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Definiert den gemeinsamen TypeScript-Datenvertrag „testing“, auf den sich die importierenden Bereiche beim Austausch ihrer Werte beziehen.
 * Daten und Wirkung: Verknüpft die unten sichtbaren Typen/Exporte mit ihren Importierenden. Die Gegenrichtung und die Originaldateien sind im Quellcode-Verzeichnis dokumentiert.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/contracts/testing.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Code-Teil: TypeScript-Verträge für spätere Regressionstests.
 * Zweck: Beschreibt Testfälle, mit denen kritische Adapterlogik später
 *        abgesichert wird, ohne die produktive JavaScript-Logik schon jetzt
 *        umzubauen.
 * Zusammenhang: Diese Typen werden in den nächsten Versionen genutzt, um Tests
 *        für Speicher-DP, Energiefluss, Heizstab, EVCS/Farm-Sichtbarkeit,
 *        Lizenz und info.connection sauber aufzubauen.
 * Wichtig: Die Datei ist noch kein Runtime-Test. Sie definiert nur die Struktur,
 *          damit Tests später Schritt für Schritt in TypeScript entstehen.
 */

import type { EnergyFlowSnapshot, StorageFlowResult } from './energy-flow';
import type { FeatureVisibilityState } from './features';
import type { LicenseValidationResult } from './license';

export type RegressionArea =
  | 'energy-flow'
  | 'storage-flow'
  | 'heating-rod'
  | 'feature-visibility'
  | 'license'
  | 'connection'
  | 'history'
  | 'ai-advisor';

export interface RegressionCaseBase {
  /** Eindeutiger technischer Name des Testfalls. */
  id: string;
  /** Fachlicher Bereich, damit Testausgaben später verständlich gruppiert werden können. */
  area: RegressionArea;
  /** Deutsche Kurzbeschreibung: was soll dieser Test beweisen? */
  descriptionDe: string;
}

export interface StorageFlowRegressionCase extends RegressionCaseBase {
  area: 'storage-flow';
  input: Partial<EnergyFlowSnapshot>;
  expected: Partial<StorageFlowResult>;
}

export interface FeatureVisibilityRegressionCase extends RegressionCaseBase {
  area: 'feature-visibility';
  input: Partial<FeatureVisibilityState>;
  expectedVisible: Partial<Record<keyof FeatureVisibilityState, boolean>>;
}

export interface LicenseRegressionCase extends RegressionCaseBase {
  area: 'license';
  rawLicenseKey: string | null;
  expected: Pick<LicenseValidationResult, 'ok' | 'status'>;
}

export type RegressionCase =
  | StorageFlowRegressionCase
  | FeatureVisibilityRegressionCase
  | LicenseRegressionCase
  | RegressionCaseBase;
