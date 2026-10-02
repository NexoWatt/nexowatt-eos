import type { LicenseState, LicenseValidationResult } from '../contracts/license';

/**
 * Datei: src-ts/test-fixtures/license-contract.examples.ts
 *
 * Zweck:
 * Beispielobjekte für die Lizenz-Typen.
 *
 * Kritische Regel:
 * Maskierte Admin-Werte wie "********" dürfen niemals als echter Key gespeichert werden.
 */

export const validHomeLicense: LicenseState = {
  status: 'valid',
  tier: 'home',
  expiresAt: '2027-12-31',
  owner: 'Kunde Beispiel',
  features: ['aiAdvisor', 'weather', 'history'],
  message: 'Lizenz gültig.',
};

export const maskedPlaceholderResult: LicenseValidationResult = {
  ok: false,
  status: 'masked-placeholder',
  tier: 'none',
  reason: 'Maskierter Platzhalter darf nicht gespeichert werden.',
};
