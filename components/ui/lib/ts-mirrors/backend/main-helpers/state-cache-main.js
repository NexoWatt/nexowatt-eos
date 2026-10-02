'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/backend/main-helpers/state-cache-main.ts
 * Quell-Hash: sha256:d6a843a37de5ad5d79edc3f46b73c9fc28adba232e597a78218b2532b19dca6f
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
exports.readMainStateValue = readMainStateValue;
exports.readMainNumber = readMainNumber;
exports.readMainBoolean = readMainBoolean;
exports.readMainString = readMainString;
exports.normalizeMainCacheEntry = normalizeMainCacheEntry;
const state_cache_1 = require("../state-cache/state-cache");
/**
 * Code-Teil: readMainStateValue
 *
 * Zweck:
 * Liest einen einzelnen StateCache-Eintrag so, wie `main.js` ihn später zentral lesen soll.
 *
 * Zusammenhang:
 * Das ist die Grundlage für `/api/state`, Feature-Sichtbarkeit und Diagnose. Wenn wir später
 * direkte Zugriffe wie `this.stateCache[key]?.value` ersetzen, soll diese Funktion die Regel
 * für fehlende und vorhandene Werte liefern.
 */
function readMainStateValue(cache, key, fallback = null) {
    const entry = cache[key];
    if ((0, state_cache_1.hasExplicitStateValue)(entry)) {
        return {
            key,
            value: (0, state_cache_1.getStateValue)(entry, fallback),
            found: true,
            ts: (0, state_cache_1.getStateTimestamp)(entry, null),
            source: 'state-cache',
        };
    }
    return {
        key,
        value: fallback,
        found: fallback !== null,
        ts: null,
        source: fallback === null ? 'missing' : 'fallback',
    };
}
/**
 * Code-Teil: readMainNumber
 *
 * Zweck:
 * Liest Zahlen aus dem `main.js`-StateCache. `0` bleibt ein gültiger Zahlenwert.
 *
 * Zusammenhang:
 * Dieser Helfer ist besonders wichtig für Speicherleistung, Netzleistung, SoC und Budgets.
 */
function readMainNumber(cache, key, fallback = null) {
    return (0, state_cache_1.readNumberFromCache)(cache, key, fallback);
}
/**
 * Code-Teil: readMainBoolean
 *
 * Zweck:
 * Liest boolesche Werte aus dem StateCache. `false` ist ein gültiger Wert.
 *
 * Zusammenhang:
 * Wird später für Feature-Sichtbarkeit, KI-Kundenschalter, Wetter aktiv und ähnliche Flags genutzt.
 */
function readMainBoolean(cache, key, fallback = false) {
    return (0, state_cache_1.readBooleanFromCache)(cache, key, fallback);
}
/**
 * Code-Teil: readMainString
 *
 * Zweck:
 * Liest Strings aus dem StateCache und behält bewusst leere Strings als Wertform bei.
 */
function readMainString(cache, key, fallback = '') {
    return (0, state_cache_1.readStringFromCache)(cache, key, fallback);
}
/**
 * Code-Teil: normalizeMainCacheEntry
 *
 * Zweck:
 * Erzeugt die einheitliche Cache-Darstellung für spätere `/api/state`- und SSE-Auslagerungen.
 */
function normalizeMainCacheEntry(cache, key) {
    return (0, state_cache_1.normalizeCachedState)(key, cache[key]);
}
