/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Löst konfigurierte Geräte und Funktionsfreigaben in ein konsistentes Sichtbarkeitsmodell auf.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/backend/feature-visibility/feature-visibility.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type { FeatureVisibilityState, EvcsPresenceProof, StorageFarmPresenceProof } from '../../contracts';

/**
 * Datei: src-ts/backend/feature-visibility/feature-visibility.ts
 *
 * Zweck:
 * Bereitet die spätere TypeScript-Migration der Feature-Sichtbarkeit aus `main.js` und `www/app.js` vor.
 *
 * Zusammenhang:
 * Das Kundenfrontend darf Funktionen wie EVCS, Speicherfarm oder SmartHome nur zeigen, wenn die
 * Anlage diese Funktionen wirklich besitzt. Alte Default-States dürfen keine Kacheln sichtbar machen.
 */

/** Prüft, ob ein Datenpunkt-Feld wirklich befüllt ist. */
function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Code-Teil: hasEvcsPresence
 *
 * Zweck:
 * Entscheidet, ob mindestens ein echter Ladepunkt mit Mess- oder Steuer-Datenpunkt vorhanden ist.
 *
 * Wichtig:
 * Ein altes Flag wie `evcsAvailable` reicht nicht. Ohne echten DP darf EVCS im Kundenfrontend nicht sichtbar sein.
 */
export function hasEvcsPresence(proofs: ReadonlyArray<EvcsPresenceProof | undefined>): boolean {
  return proofs.some((proof) => {
    if (!proof) return false;
    if (proof.hasAnyRealDatapoint) return true;
    return hasText(proof.measuredPowerDp) || hasText(proof.controlDp);
  });
}

/**
 * Code-Teil: hasStorageFarmPresence
 *
 * Zweck:
 * Entscheidet, ob wirklich ein Speicherfarm-Speicher konfiguriert ist.
 *
 * Wichtig:
 * Die Farm wird nur sichtbar, wenn mindestens zwei Farmspeicher echte Datenpunkte besitzen.
 * Einzel-Speicher-Anlagen laufen über die normale Speicherregelung und dürfen keinen
 * Speicherfarm-Menüpunkt im Kundenfrontend öffnen.
 */
export function hasStorageFarmPresence(proofs: ReadonlyArray<StorageFarmPresenceProof | undefined>): boolean {
  const realCount = proofs.filter((proof) => {
    if (!proof) return false;
    if (proof.hasAnyRealDatapoint) return true;
    return hasText(proof.socDp) || hasText(proof.chargeDp) || hasText(proof.dischargeDp) || hasText(proof.signedPowerDp);
  }).length;
  return realCount >= 2;
}

/** Eingaben für die zentrale Sichtbarkeitsentscheidung. */
export interface BuildFeatureVisibilityInput {
  readonly evcsProofs?: ReadonlyArray<EvcsPresenceProof | undefined>;
  readonly storageFarmEnabled?: boolean;
  readonly storageFarmProofs?: ReadonlyArray<StorageFarmPresenceProof | undefined>;
  readonly smartHomeEnabled?: boolean;
  readonly weatherEnabled?: boolean;
  readonly weatherHasData?: boolean;
  readonly aiAdvisorInstalled?: boolean;
  readonly aiAdvisorCustomerEnabled?: boolean;
}

/**
 * Code-Teil: buildFeatureVisibilityState
 *
 * Zweck:
 * Baut eine zentrale Feature-Sichtbarkeit für das Kundenfrontend.
 *
 * Zusammenhang:
 * Dieser Helfer ist der spätere Kandidat für die Zusammenführung verstreuter UI-Checks in
 * `main.js`, `www/app.js`, `www/cockpit-shell.js` und den Unterseiten.
 */
export function buildFeatureVisibilityState(input: BuildFeatureVisibilityInput): FeatureVisibilityState {
  const hasEvcs = hasEvcsPresence(input.evcsProofs ?? []);
  const hasStorageFarm = input.storageFarmEnabled === true && hasStorageFarmPresence(input.storageFarmProofs ?? []);

  return {
    hasEvcs,
    hasStorageFarm,
    hasSmartHome: input.smartHomeEnabled === true,
    hasWeather: input.weatherEnabled === true && input.weatherHasData === true,
    hasAiAdvisor: input.aiAdvisorInstalled === true && input.aiAdvisorCustomerEnabled !== false,
  };
}
