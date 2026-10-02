'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/backend/main-helpers/license-key-main.ts
 * Quell-Hash: sha256:1cba973add0e24761a3589b77c0899380f4fc852c94af3541e74ce106886e9c4
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
exports.decideMainLicenseInput = decideMainLicenseInput;
exports.buildMainMaskedLicenseResult = buildMainMaskedLicenseResult;
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Verbindet die Lizenzschlüssel-Prüfung mit den dafür vorgesehenen Adapter-Kern-Hilfen.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/backend/main-helpers/license-key-main.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
const license_key_safety_1 = require("../license/license-key-safety");
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
function decideMainLicenseInput(input) {
    const normalized = (0, license_key_safety_1.normalizeLicenseInput)(input);
    const masked = (0, license_key_safety_1.isMaskedLicenseValue)(normalized);
    const canStore = (0, license_key_safety_1.shouldStoreLicenseInput)(normalized);
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
function buildMainMaskedLicenseResult() {
    return (0, license_key_safety_1.buildMaskedLicenseValidationResult)();
}
