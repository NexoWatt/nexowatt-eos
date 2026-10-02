/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Unterscheidet echte Lizenzschlüssel von leeren oder maskierten Werten vor dem Speichern.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/backend/license/license-key-safety.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type { LicenseStatus, LicenseValidationResult } from '../../contracts';

/**
 * Datei: src-ts/backend/license/license-key-safety.ts
 *
 * Zweck:
 * Bereitet die spätere TypeScript-Migration der Lizenz-Helfer aus `main.js` vor.
 *
 * Zusammenhang:
 * ioBroker/Admin kann geschützte Felder als maskierte Platzhalter wie `********` zurückgeben.
 * Diese Werte dürfen niemals als echter Lizenzschlüssel gespeichert werden.
 */

const MASKED_LICENSE_MARKERS = new Set([
  '******',
  '*******',
  '********',
  '*********',
  '**********',
  'protected',
  'encrypted',
  'hidden',
  'redacted',
  'maskiert',
]);

/**
 * Code-Teil: normalizeLicenseInput
 *
 * Zweck:
 * Entfernt Whitespace und wandelt unbekannte Werte in einen sicheren String um.
 */
export function normalizeLicenseInput(input: unknown): string {
  if (input === null || input === undefined) return '';
  return String(input).trim();
}

/**
 * Code-Teil: isMaskedLicenseValue
 *
 * Zweck:
 * Erkennt maskierte Admin-/UI-Platzhalter.
 *
 * Wichtig:
 * `********` und ähnliche Werte müssen blockiert werden, damit sie keinen echten Schlüssel überschreiben.
 */
export function isMaskedLicenseValue(input: unknown): boolean {
  const normalized = normalizeLicenseInput(input);
  if (!normalized) return false;
  const lower = normalized.toLowerCase();
  if (MASKED_LICENSE_MARKERS.has(lower)) return true;
  return /^\*{4,}$/.test(normalized);
}

/** Entscheidet, ob ein eingegebener Lizenzwert gespeichert werden darf. */
export function shouldStoreLicenseInput(input: unknown): boolean {
  const normalized = normalizeLicenseInput(input);
  if (!normalized) return false;
  return !isMaskedLicenseValue(normalized);
}

/**
 * Code-Teil: buildMaskedLicenseValidationResult
 *
 * Zweck:
 * Erstellt ein typisiertes Ergebnis für erkannte Lizenz-Platzhalter.
 */
export function buildMaskedLicenseValidationResult(): LicenseValidationResult {
  const status: LicenseStatus = 'masked-placeholder';
  return {
    ok: false,
    valid: false,
    status,
    tier: 'none',
    reason: 'masked-placeholder',
    message: 'Maskierter Lizenz-Platzhalter darf nicht als echter Lizenzschlüssel gespeichert werden.',
    isMaskedInput: true,
    mustNotStore: true,
  };
}
