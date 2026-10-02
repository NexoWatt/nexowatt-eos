'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/backend/license/license-key-safety.ts
 * Quell-Hash: sha256:88facbd1be3babd07b02dfada246917836b5e25b3b12273c3c2c6e14b618b6fe
 * Erzeugung: npm run sync:ts-backend-mirrors
 *
 * Zweck:
 * Diese Datei ist ein CommonJS-Spiegel einer backendnahen TypeScript-Quelle.
 * Sie wird in 0.7.68 noch nicht von main.js genutzt, legt aber die spätere
 * sichere Migration für StateCache, Lizenz und Feature-Sichtbarkeit fest.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in den passenden Dateien unter src-ts/backend/ vornehmen.
 * 2. npm run sync:ts-backend-mirrors ausführen.
 * 3. npm run test:backend-mirrors prüfen.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeLicenseInput = normalizeLicenseInput;
exports.isMaskedLicenseValue = isMaskedLicenseValue;
exports.shouldStoreLicenseInput = shouldStoreLicenseInput;
exports.buildMaskedLicenseValidationResult = buildMaskedLicenseValidationResult;
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
function normalizeLicenseInput(input) {
    if (input === null || input === undefined)
        return '';
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
function isMaskedLicenseValue(input) {
    const normalized = normalizeLicenseInput(input);
    if (!normalized)
        return false;
    const lower = normalized.toLowerCase();
    if (MASKED_LICENSE_MARKERS.has(lower))
        return true;
    return /^\*{4,}$/.test(normalized);
}
/** Entscheidet, ob ein eingegebener Lizenzwert gespeichert werden darf. */
function shouldStoreLicenseInput(input) {
    const normalized = normalizeLicenseInput(input);
    if (!normalized)
        return false;
    return !isMaskedLicenseValue(normalized);
}
/**
 * Code-Teil: buildMaskedLicenseValidationResult
 *
 * Zweck:
 * Erstellt ein typisiertes Ergebnis für erkannte Lizenz-Platzhalter.
 */
function buildMaskedLicenseValidationResult() {
    const status = 'masked-placeholder';
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
