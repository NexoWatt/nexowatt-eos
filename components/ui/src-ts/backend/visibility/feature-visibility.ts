/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Löst konfigurierte Geräte und Funktionsfreigaben in ein konsistentes Sichtbarkeitsmodell auf.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/backend/visibility/feature-visibility.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type { EvcsPresenceProof, FeatureVisibilityState, StorageFarmPresenceProof } from '../../contracts/features';
import { buildFeatureVisibilityState } from '../feature-visibility/feature-visibility';

/**
 * Datei: src-ts/backend/visibility/feature-visibility.ts
 *
 * Zweck:
 * Kompatibilitätsadapter für ältere TypeScript-Tests und frühe Migrationsschritte.
 * Die fachliche Quelle der Feature-Sichtbarkeit liegt jetzt zentral in:
 * `src-ts/backend/feature-visibility/feature-visibility.ts`.
 *
 * Warum diese Datei noch existiert:
 * Einige 0.7.63-Testdateien importieren noch aus `backend/visibility`. Damit diese
 * Tests nicht bei jedem Struktur-Refactoring angepasst werden müssen, leitet diese
 * Datei nur noch auf die kanonische Implementierung weiter.
 *
 * Wichtig für spätere Aufräumarbeiten:
 * Hier darf keine zweite Fachlogik entstehen. Wenn EVCS-/Speicherfarm-/KI-Sichtbarkeit
 * geändert wird, muss die Änderung in der kanonischen Datei passieren.
 */

/** Eingabe für die alte Import-Schnittstelle. */
export interface FeatureVisibilityInput {
  readonly evcsEnabled?: boolean | undefined;
  readonly smartHomeEnabled?: boolean | undefined;
  readonly weatherEnabled?: boolean | undefined;
  readonly aiAdvisorAppEnabled?: boolean | undefined;
  readonly aiAdvisorCustomerEnabled?: boolean | undefined;
  readonly storageFarmEnabled?: boolean | undefined;
  readonly evcsProofs?: readonly EvcsPresenceProof[] | undefined;
  readonly storageFarmProofs?: readonly StorageFarmPresenceProof[] | undefined;
}

/**
 * Code-Teil: hasRealEvcsProof
 *
 * Zweck:
 * Kompatibilitätsfunktion für ältere Tests. Die eigentliche Regel ist identisch zur
 * kanonischen Feature-Sichtbarkeit: EVCS zählt nur mit echtem Ladepunktnachweis.
 */
export function hasRealEvcsProof(proofs: readonly EvcsPresenceProof[] | undefined): boolean {
  return buildFeatureVisibilityState({ evcsProofs: proofs ?? [] }).hasEvcs;
}

/**
 * Code-Teil: hasRealStorageFarmProof
 *
 * Zweck:
 * Kompatibilitätsfunktion für ältere Tests. Die Farm wird nur sichtbar, wenn sie aktiv
 * ist und echte Farm-Speicher-Datenpunkte vorhanden sind.
 */
export function hasRealStorageFarmProof(proofs: readonly StorageFarmPresenceProof[] | undefined): boolean {
  return buildFeatureVisibilityState({ storageFarmEnabled: true, storageFarmProofs: proofs ?? [] }).hasStorageFarm;
}

/**
 * Code-Teil: deriveFeatureVisibility
 *
 * Zweck:
 * Alte API beibehalten, aber intern die kanonische TS-Implementierung nutzen.
 *
 * Zusammenhang:
 * Dieser Adapter verhindert doppelte Sichtbarkeitslogik. Später können alle Imports
 * direkt auf `backend/feature-visibility` umgestellt und diese Datei entfernt werden.
 */
export function deriveFeatureVisibility(input: FeatureVisibilityInput): FeatureVisibilityState {
  const canonicalInput: Record<string, unknown> = {
    weatherHasData: input.weatherEnabled === true,
  };

  if (input.evcsProofs !== undefined) canonicalInput.evcsProofs = input.evcsProofs;
  if (input.storageFarmEnabled !== undefined) canonicalInput.storageFarmEnabled = input.storageFarmEnabled;
  if (input.storageFarmProofs !== undefined) canonicalInput.storageFarmProofs = input.storageFarmProofs;
  if (input.smartHomeEnabled !== undefined) canonicalInput.smartHomeEnabled = input.smartHomeEnabled;
  if (input.weatherEnabled !== undefined) canonicalInput.weatherEnabled = input.weatherEnabled;
  if (input.aiAdvisorAppEnabled !== undefined) canonicalInput.aiAdvisorInstalled = input.aiAdvisorAppEnabled;
  if (input.aiAdvisorCustomerEnabled !== undefined) canonicalInput.aiAdvisorCustomerEnabled = input.aiAdvisorCustomerEnabled;

  return buildFeatureVisibilityState(canonicalInput as Parameters<typeof buildFeatureVisibilityState>[0]);
}
