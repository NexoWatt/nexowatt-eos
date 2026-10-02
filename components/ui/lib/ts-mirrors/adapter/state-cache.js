'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/adapter/state-cache.ts
 * Quell-Hash: sha256:8a4e03412274f261ed082e3c558b149b89b139958034749fec7817ca807f8b8b
 * Erzeugung: npm run sync:ts-adapter-helpers
 *
 * Zweck:
 * Diese Datei ist der CommonJS-Spiegel eines adapter-nahen TypeScript-Helfers.
 * main.js darf diese Datei nur mit Fallback laden, damit die produktive Runtime
 * nicht von einem Migrationsartefakt abhängig wird.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeStateEntry = normalizeStateEntry;
exports.isStateValuePresent = isStateValuePresent;
exports.isStateFreshEnough = isStateFreshEnough;
exports.readFirstAvailableState = readFirstAvailableState;
exports.readCachedNumber = readCachedNumber;
exports.readCachedBoolean = readCachedBoolean;
exports.readCachedString = readCachedString;
exports.buildApiStateResponse = buildApiStateResponse;
exports.createInfoConnectionUpdate = createInfoConnectionUpdate;
/**
 * Code-Teil: hasOwn
 *
 * Zweck:
 * Prüft sicher, ob ein Objekt eine eigene Eigenschaft besitzt.
 *
 * Zusammenhang:
 * State-Objekte können aus ioBroker (`val`) oder unserer API (`value`) kommen. Wir prüfen
 * ausdrücklich die Eigenschaft, damit Werte wie 0 oder false erhalten bleiben.
 */
function hasOwn(obj, key) {
    return !!obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, key);
}
/**
 * Code-Teil: pickRawValue
 *
 * Zweck:
 * Liest den echten Nutzwert aus historischen `{ val }`- oder API-ähnlichen `{ value }`-Objekten.
 *
 * Wichtig:
 * 0 W, false und '' sind gültig. Nur fehlende Properties gelten als nicht vorhanden.
 */
function pickRawValue(raw) {
    if (!raw)
        return { value: null, hasValue: false };
    if (hasOwn(raw, 'value'))
        return { value: raw.value ?? null, hasValue: true };
    if (hasOwn(raw, 'val'))
        return { value: raw.val ?? null, hasValue: true };
    return { value: null, hasValue: false };
}
/**
 * Code-Teil: normalizeStateEntry
 *
 * Zweck:
 * Normalisiert ein rohes Cache-/ioBroker-State-Objekt in eine einheitliche TypeScript-Form.
 *
 * Zusammenhang:
 * Späterer Kandidat für die Migration aus `main.js`. Alle API- und Diagnosebereiche sollen
 * dieselbe Wert-/Zeitstempelregel verwenden.
 */
function normalizeStateEntry(id, raw) {
    const picked = pickRawValue(raw);
    const rawObj = raw && typeof raw === 'object' ? raw : undefined;
    const out = {
        id,
        value: picked.hasValue ? picked.value : null,
        source: hasOwn(raw, 'val') ? 'api-state' : 'state-cache',
    };
    if (rawObj?.ack !== undefined)
        out.ack = rawObj.ack;
    if (rawObj?.ts !== undefined)
        out.ts = rawObj.ts;
    if (rawObj?.lc !== undefined)
        out.lc = rawObj.lc;
    const quality = rawObj?.q ?? rawObj?.quality;
    if (quality !== undefined)
        out.q = quality;
    return out;
}
/**
 * Code-Teil: isStateValuePresent
 *
 * Zweck:
 * Prüft, ob ein normalisierter State fachlich einen Wert enthält.
 *
 * Wichtig:
 * 0 und false sind vorhanden. Nur null/undefined gelten als fehlend.
 */
function isStateValuePresent(entry) {
    return !!entry && entry.value !== null && entry.value !== undefined;
}
/**
 * Code-Teil: isStateFreshEnough
 *
 * Zweck:
 * Prüft die Zeitstempel-Frische eines States.
 *
 * Zusammenhang:
 * Für Speicher-/Budget-0-Werte kann `treatZeroAsFresh` gesetzt werden. So bleibt ein
 * korrekter 0-W-Wert gültig, auch wenn sein `lc` lange alt ist.
 */
function isStateFreshEnough(entry, options = {}) {
    if (!isStateValuePresent(entry))
        return false;
    const staleAfterMs = Math.max(0, Number(options.staleAfterMs ?? 0));
    if (staleAfterMs <= 0)
        return true;
    if (options.treatZeroAsFresh && Number(entry?.value) === 0)
        return true;
    const now = Number(options.nowMs ?? Date.now());
    const stamp = Number(entry?.ts ?? entry?.lc ?? 0);
    if (!Number.isFinite(stamp) || stamp <= 0)
        return false;
    return now - stamp <= staleAfterMs;
}
/**
 * Code-Teil: readFirstAvailableState
 *
 * Zweck:
 * Liest aus mehreren Alias-Schlüsseln den ersten vorhandenen Statewert.
 *
 * Zusammenhang:
 * Viele Werte haben historische Namen. Dieser Helfer dokumentiert, wie Aliase später
 * typisiert und nachvollziehbar gelesen werden.
 */
function readFirstAvailableState(cache, keys, fallback = null) {
    for (const key of keys) {
        const raw = cache[key];
        const entry = normalizeStateEntry(key, raw);
        if (isStateValuePresent(entry)) {
            return { value: entry.value, key, stateId: entry.id, found: true, source: 'cache' };
        }
    }
    return { value: fallback, key: null, stateId: null, found: fallback !== null, source: fallback === null ? 'missing' : 'fallback' };
}
/** Code-Teil: readCachedNumber. Zweck: Liest Zahlenwerte für spätere API-/State-Helfer robust aus dem Cache. */
function readCachedNumber(cache, key, fallback = null) {
    const value = readFirstAvailableState(cache, [key], fallback).value;
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : fallback;
}
/** Code-Teil: readCachedBoolean. Zweck: Liest boolesche Werte, ohne false als fehlend zu behandeln. */
function readCachedBoolean(cache, key, fallback = false) {
    const value = readFirstAvailableState(cache, [key], fallback).value;
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'number')
        return value !== 0;
    if (typeof value === 'string') {
        const v = value.trim().toLowerCase();
        if (['true', '1', 'on', 'yes', 'ja', 'an'].includes(v))
            return true;
        if (['false', '0', 'off', 'no', 'nein', 'aus'].includes(v))
            return false;
    }
    return fallback;
}
/** Code-Teil: readCachedString. Zweck: Liest Stringwerte und erhält auch leere Strings als bewusste Werte. */
function readCachedString(cache, key, fallback = '') {
    const value = readFirstAvailableState(cache, [key], fallback).value;
    return value === null || value === undefined ? fallback : String(value);
}
/**
 * Code-Teil: buildApiStateResponse
 *
 * Zweck:
 * Baut eine typisierte `/api/state`-ähnliche Antwort aus ausgewählten Cache-Werten.
 *
 * Zusammenhang:
 * Der produktive Endpunkt bleibt in `main.js`. Dieser Helfer ist die spätere
 * Auslagerungsbasis und schützt, dass 0/false nicht verloren gehen.
 */
function buildApiStateResponse(input) {
    const states = {};
    const include = input.includeKeys;
    for (const [key, raw] of Object.entries(input.states)) {
        if (Array.isArray(include) && include.length && !include.includes(key))
            continue;
        const entry = normalizeStateEntry(key, raw);
        if (isStateValuePresent(entry))
            states[key] = entry;
    }
    return { states, generatedAt: input.generatedAt ?? Date.now() };
}
/**
 * Code-Teil: createInfoConnectionUpdate
 *
 * Zweck:
 * Baut eine nachvollziehbare `info.connection`-Aktualisierung.
 *
 * Zusammenhang:
 * Später soll `main.js` diesen State nicht mehr verstreut schreiben, sondern über eine
 * zentrale, testbare Regel setzen.
 */
function createInfoConnectionUpdate(value, reason, ts = Date.now()) {
    return { id: 'info.connection', value, ack: true, reason, ts };
}
