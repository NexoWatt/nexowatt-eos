'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/bridges/feature-visibility-shadow.ts
 * Quell-Hash: sha256:7763cd856015921ed81fa9ce6367350490606335cc7af99891d63275b6b4f630
 * Erzeugung: npm run sync:ts-shadow-bridges
 *
 * Zweck:
 * CommonJS-Spiegel der TypeScript-Shadow-Bridge. Diese Datei ist vorbereitet,
 * wird aber in 0.7.73 noch nicht produktiv von main.js/www/app.js genutzt.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeFeatureVisibilityState = normalizeFeatureVisibilityState;
exports.compareFeatureVisibility = compareFeatureVisibility;
exports.buildFeatureVisibilityShadowReport = buildFeatureVisibilityShadowReport;
const feature_visibility_1 = require("../backend/feature-visibility/feature-visibility");
const visibilityKeys = [
    'hasEvcs',
    'hasStorageFarm',
    'hasSmartHome',
    'hasWeather',
    'hasAiAdvisor',
];
/**
 * Code-Teil: normalizeFeatureVisibilityState
 *
 * Zweck:
 * Normalisiert eine teilweise Feature-Sichtbarkeit auf eindeutige boolesche Werte.
 *
 * Zusammenhang:
 * Später kann die alte JavaScript-Runtime einzelne Felder aus `main.js` oder `www/app.js`
 * liefern. Dieser Helfer verhindert, dass `undefined` unterschiedlich interpretiert wird.
 *
 * Wichtig:
 * `false` ist ein gültiger Wert und darf niemals als „fehlend“ behandelt werden.
 */
function normalizeFeatureVisibilityState(value) {
    return {
        hasEvcs: value?.hasEvcs === true,
        hasStorageFarm: value?.hasStorageFarm === true,
        hasSmartHome: value?.hasSmartHome === true,
        hasWeather: value?.hasWeather === true,
        hasAiAdvisor: value?.hasAiAdvisor === true,
    };
}
/**
 * Code-Teil: compareFeatureVisibility
 *
 * Zweck:
 * Vergleicht alte JavaScript-Sichtbarkeit und neue TypeScript-Sichtbarkeit feldweise.
 *
 * Zusammenhang:
 * Dieser Vergleich ist die spätere Grundlage für einen Shadow-Modus: Die Anzeige bleibt
 * zunächst bei der alten Runtime, während Abweichungen der TS-Logik nur diagnostiziert
 * werden. So vermeiden wir, dass EVCS/Speicherfarm wieder falsch sichtbar werden.
 */
function compareFeatureVisibility(legacy, next) {
    const normalizedLegacy = normalizeFeatureVisibilityState(legacy);
    const normalizedNext = normalizeFeatureVisibilityState(next);
    return visibilityKeys
        .filter((key) => normalizedLegacy[key] !== normalizedNext[key])
        .map((key) => ({
        key,
        legacyValue: normalizedLegacy[key],
        nextValue: normalizedNext[key],
        message: `Feature-Sichtbarkeit weicht ab: ${String(key)} legacy=${normalizedLegacy[key]} ts=${normalizedNext[key]}`,
    }));
}
/**
 * Code-Teil: buildFeatureVisibilityShadowReport
 *
 * Zweck:
 * Baut einen vollständigen Shadow-Bericht aus Eingabe-Nachweisen und altem Runtime-Ergebnis.
 *
 * Zusammenhang:
 * Später kann `main.js` oder `www/app.js` hier seine bisherige Sichtbarkeit übergeben.
 * Die TypeScript-Seite berechnet denselben Zustand aus den Nachweisen. Abweichungen werden
 * zuerst nur geloggt und nicht produktiv geschaltet.
 *
 * TypeScript-Migrationsregel:
 * Diese Funktion ist ein Bridge-Baustein. Sie darf die produktive Runtime erst ersetzen,
 * wenn Regressionstests und echte Anlagentests zeigen, dass `mismatches` leer bleiben.
 */
function buildFeatureVisibilityShadowReport(input, legacy) {
    const normalizedLegacy = normalizeFeatureVisibilityState(legacy);
    const next = (0, feature_visibility_1.buildFeatureVisibilityState)(input);
    const mismatches = compareFeatureVisibility(normalizedLegacy, next);
    return {
        legacy: normalizedLegacy,
        next,
        mismatches,
        isMatch: mismatches.length === 0,
    };
}
