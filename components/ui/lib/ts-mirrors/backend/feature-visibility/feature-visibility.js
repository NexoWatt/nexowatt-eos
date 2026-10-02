'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/backend/feature-visibility/feature-visibility.ts
 * Quell-Hash: sha256:9e686465af5a910435f7ded565b376123b15b502a3b8887bbf1cae69f0552fc3
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
exports.hasEvcsPresence = hasEvcsPresence;
exports.hasStorageFarmPresence = hasStorageFarmPresence;
exports.buildFeatureVisibilityState = buildFeatureVisibilityState;
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
function hasText(value) {
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
function hasEvcsPresence(proofs) {
    return proofs.some((proof) => {
        if (!proof)
            return false;
        if (proof.hasAnyRealDatapoint)
            return true;
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
function hasStorageFarmPresence(proofs) {
    const realCount = proofs.filter((proof) => {
        if (!proof)
            return false;
        if (proof.hasAnyRealDatapoint)
            return true;
        return hasText(proof.socDp) || hasText(proof.chargeDp) || hasText(proof.dischargeDp) || hasText(proof.signedPowerDp);
    }).length;
    return realCount >= 2;
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
function buildFeatureVisibilityState(input) {
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
