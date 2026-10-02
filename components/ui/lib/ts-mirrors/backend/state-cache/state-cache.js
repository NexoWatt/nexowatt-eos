'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/backend/state-cache/state-cache.ts
 * Quell-Hash: sha256:a20a68a67874b5e67a8f092ed25f8831a72432349c0c428fdaee6f56f7bdd90b
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
exports.getStateValue = getStateValue;
exports.getStateTimestamp = getStateTimestamp;
exports.hasExplicitStateValue = hasExplicitStateValue;
exports.normalizeCachedState = normalizeCachedState;
exports.readNumberFromCache = readNumberFromCache;
exports.readBooleanFromCache = readBooleanFromCache;
exports.readStringFromCache = readStringFromCache;
/**
 * Code-Teil: getStateValue
 *
 * Zweck:
 * Liest aus einem Cache-Eintrag den fachlichen Wert. `value` hat Vorrang, `val` ist der
 * Legacy-Fallback aus ioBroker-State-Objekten.
 *
 * Kritische Regel:
 * `0` und `false` sind gültig. Deshalb wird bewusst auf Property-Vorhandensein geprüft und
 * nicht auf Wahrheit des Werts.
 */
function getStateValue(entry, fallback = null) {
    if (!entry || typeof entry !== 'object')
        return fallback;
    if (Object.prototype.hasOwnProperty.call(entry, 'value'))
        return entry.value ?? fallback;
    if (Object.prototype.hasOwnProperty.call(entry, 'val'))
        return entry.val ?? fallback;
    return fallback;
}
/**
 * Code-Teil: getStateTimestamp
 *
 * Zweck:
 * Holt den besten verfügbaren Zeitstempel aus `ts` oder `lc`.
 *
 * Zusammenhang:
 * Diese Information wird später für Diagnose und Aktualitätsanzeigen gebraucht. Sie darf aber
 * nicht allein entscheiden, ob ein konfigurierter Speicher-DP mit 0 W ungültig ist.
 */
function getStateTimestamp(entry, fallback = null) {
    if (!entry || typeof entry !== 'object')
        return fallback;
    const ts = Number(entry.ts);
    if (Number.isFinite(ts) && ts >= 0)
        return ts;
    const lc = Number(entry.lc);
    if (Number.isFinite(lc) && lc >= 0)
        return lc;
    return fallback;
}
/**
 * Code-Teil: hasExplicitStateValue
 *
 * Zweck:
 * Prüft, ob ein Cache-Eintrag wirklich einen Wert enthält.
 *
 * Wichtig:
 * Diese Funktion gibt für `0` und `false` true zurück. Genau diese Regel schützt Split-DPs,
 * signed DPs und Feature-Sichtbarkeiten vor falschen Fallbacks.
 */
function hasExplicitStateValue(entry) {
    if (!entry || typeof entry !== 'object')
        return false;
    if (Object.prototype.hasOwnProperty.call(entry, 'value'))
        return entry.value !== null && entry.value !== undefined;
    if (Object.prototype.hasOwnProperty.call(entry, 'val'))
        return entry.val !== null && entry.val !== undefined;
    return false;
}
/**
 * Code-Teil: normalizeCachedState
 *
 * Zweck:
 * Wandelt unterschiedliche Rohformen in eine einheitliche Cache-Form.
 *
 * Zusammenhang:
 * Später kann `main.js` diese Form für `/api/state`, SSE, History und EMS-Module nutzen,
 * damit jeder Bereich dieselbe Interpretation von Werten sieht.
 */
function normalizeCachedState(id, entry) {
    const result = { id, value: getStateValue(entry, null) };
    const ts = getStateTimestamp(entry, null);
    if (ts !== null)
        result.ts = ts;
    if (entry && typeof entry === 'object' && typeof entry.ack === 'boolean')
        result.ack = entry.ack;
    const q = entry && typeof entry === 'object' ? Number(entry.q ?? entry.quality) : NaN;
    if (Number.isFinite(q))
        result.quality = q;
    return result;
}
/**
 * Code-Teil: readNumberFromCache
 *
 * Zweck:
 * Liest eine Zahl aus dem Cache. `0` wird als gültige Zahl zurückgegeben.
 */
function readNumberFromCache(cache, key, fallback = null) {
    const raw = getStateValue(cache[key], null);
    if (raw === null || raw === undefined || raw === '')
        return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
}
/**
 * Code-Teil: readBooleanFromCache
 *
 * Zweck:
 * Liest Boolean-Werte aus echten Booleans, Zahlen oder typischen Textwerten.
 */
function readBooleanFromCache(cache, key, fallback = false) {
    const raw = getStateValue(cache[key], null);
    if (raw === null || raw === undefined || raw === '')
        return fallback;
    if (typeof raw === 'boolean')
        return raw;
    if (typeof raw === 'number')
        return raw !== 0;
    const s = String(raw).trim().toLowerCase();
    if (['true', '1', 'yes', 'ja', 'on', 'an'].includes(s))
        return true;
    if (['false', '0', 'no', 'nein', 'off', 'aus'].includes(s))
        return false;
    return fallback;
}
/**
 * Code-Teil: readStringFromCache
 *
 * Zweck:
 * Liest einen String aus dem Cache und hält die Fallback-Regel zentral.
 */
function readStringFromCache(cache, key, fallback = '') {
    const raw = getStateValue(cache[key], null);
    if (raw === null || raw === undefined)
        return fallback;
    return String(raw);
}
