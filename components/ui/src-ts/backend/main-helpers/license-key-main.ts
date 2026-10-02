/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Verbindet die Lizenzschlüssel-Prüfung mit den dafür vorgesehenen Adapter-Kern-Hilfen.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/backend/main-helpers/license-key-main.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import { buildMaskedLicenseValidationResult, isMaskedLicenseValue, normalizeLicenseInput, shouldStoreLicenseInput } from '../license/license-key-safety';

/**
 * Datei: src-ts/backend/main-helpers/license-key-main.ts
 *
 * Zweck:
 * TypeScript-Helfer für die spätere Auslagerung der Lizenz-Key-Sicherheitslogik aus `main.js`.
 *
 * Zusammenhang:
 * Die Lizenz-API darf maskierte Admin-Platzhalter wie `********` nie als echten Lizenzschlüssel
 * speichern. Dieser Helfer bündelt die fachliche Regel für spätere Runtime-Übernahme.
 */

export interface MainLicenseInputDecision {
  readonly normalized: string;
  readonly masked: boolean;
  readonly canStore: boolean;
  readonly reason: 'empty' | 'masked-placeholder' | 'store-allowed';
}

/**
 * Code-Teil: decideMainLicenseInput
 *
 * Zweck:
 * Bewertet einen Lizenzwert, bevor `main.js` ihn speichert.
 *
 * Wichtig:
 * `********`, `protected`, `encrypted` usw. dürfen nicht gespeichert werden, weil sonst ein
 * gültiger Lizenzschlüssel überschrieben werden könnte.
 */
export function decideMainLicenseInput(input: unknown): MainLicenseInputDecision {
  const normalized = normalizeLicenseInput(input);
  const masked = isMaskedLicenseValue(normalized);
  const canStore = shouldStoreLicenseInput(normalized);
  return {
    normalized,
    masked,
    canStore,
    reason: !normalized ? 'empty' : (masked ? 'masked-placeholder' : 'store-allowed'),
  };
}

/**
 * Code-Teil: buildMainMaskedLicenseResult
 *
 * Zweck:
 * Liefert das bekannte Validierungsergebnis für maskierte Lizenzwerte an main.js-kompatible Stellen.
 */
export function buildMainMaskedLicenseResult() {
  return buildMaskedLicenseValidationResult();
}
