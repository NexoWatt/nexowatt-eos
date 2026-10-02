'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/main/state-cache.ts
 * Quell-Hash: sha256:920479f4deae97ba4c65c2334e3d9eb7e7c8eabcc7054c2b490bcc1623dbf45d
 * Erzeugung: npm run sync:ts-main-helpers
 *
 * Zweck:
 * Diese Datei ist ein CommonJS-Spiegel eines echten TypeScript-Helfers für main.js.
 * main.js nutzt diese Helfer in 0.7.98 noch nicht produktiv; sie bilden die sichere
 * Grundlage für die spätere schrittweise Auslagerung.
 */
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Normalisiert Zugriffe auf gespeicherte ioBroker-Werte und unterscheidet fehlende Werte von gültigen Null-/False-Werten.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/main/state-cache.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Datei: src-ts/main/state-cache.ts
 *
 * Zweck:
 * Enthält die ersten echten TypeScript-Helfer für die StateCache-Auswertung aus main.js.
 *
 * Zusammenhang:
 * main.js hält heute die ioBroker-/Adapterwerte dynamisch in einem Cache. Frontend,
 * History, KI-Berater, Energiefluss und Diagnose lesen daraus indirekt über APIs.
 * Diese Helfer sind die spätere Auslagerungsbasis, damit 0, false und leere Strings
 * nicht mehr versehentlich als "fehlend" behandelt werden.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractRawValue = extractRawValue;
exports.normalizeMainState = normalizeMainState;
exports.hasPresentMainValue = hasPresentMainValue;
exports.isMainStateFresh = isMainStateFresh;
exports.readFirstMainState = readFirstMainState;
exports.readMainNumber = readMainNumber;
exports.readMainBoolean = readMainBoolean;
exports.readMainString = readMainString;
/**
 * Code-Teil: hasOwn
 *
 * Zweck:
 * Prüft sicher, ob ein rohes State-Objekt eine bestimmte Eigenschaft besitzt.
 *
 * Zusammenhang:
 * main.js verarbeitet Werte aus mehreren Quellen. Manche nutzen `{ val }`, andere
 * `{ value }`. Wir prüfen die Property selbst, damit `0` oder `false` nicht verloren gehen.
 */
function hasOwn(obj, key) {
    return !!obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, key);
}
/**
 * Code-Teil: extractRawValue
 *
 * Zweck:
 * Extrahiert den echten Nutzwert aus `{ value }` oder `{ val }`.
 *
 * Wichtig:
 * `0`, `false` und `''` sind gültige Werte. Nur eine fehlende Property bedeutet
 * wirklich: kein Wert vorhanden.
 */
function extractRawValue(raw) {
    if (!raw)
        return { hasValue: false, value: null, source: 'missing' };
    if (hasOwn(raw, 'value'))
        return { hasValue: true, value: (raw.value ?? null), source: 'state-cache' };
    if (hasOwn(raw, 'val'))
        return { hasValue: true, value: (raw.val ?? null), source: 'api-state' };
    return { hasValue: false, value: null, source: 'missing' };
}
/**
 * Code-Teil: normalizeMainState
 *
 * Zweck:
 * Wandelt einen rohen Cache-State in eine einheitliche Form.
 *
 * Zusammenhang:
 * Dieser Helfer ist der spätere Kandidat für die Auslagerung aus main.js. Alle APIs
 * und Diagnosebereiche sollen dieselbe Semantik für Wert, Zeitstempel und Qualität nutzen.
 */
function normalizeMainState(id, raw) {
    const picked = extractRawValue(raw);
    const qRaw = raw ? (raw.q ?? raw.quality) : undefined;
    const out = {
        id,
        value: picked.hasValue ? picked.value : null,
        source: picked.source === 'missing' ? 'missing' : picked.source,
        ...(raw?.ack !== undefined ? { ack: raw.ack } : {}),
        ...(raw?.ts !== undefined ? { ts: raw.ts } : {}),
        ...(raw?.lc !== undefined ? { lc: raw.lc } : {}),
        ...(qRaw !== undefined ? { q: qRaw } : {}),
    };
    return out;
}
/**
 * Code-Teil: hasPresentMainValue
 *
 * Zweck:
 * Prüft, ob ein State fachlich einen vorhandenen Wert hat.
 *
 * Wichtig:
 * 0 und false gelten als vorhanden. Nur null/undefined gelten als fehlend.
 */
function hasPresentMainValue(entry) {
    return !!entry && entry.value !== null && entry.value !== undefined;
}
/**
 * Code-Teil: isMainStateFresh
 *
 * Zweck:
 * Bewertet die Frische eines States.
 *
 * Wichtig:
 * Für Speicher-/Energieflusswerte kann `treatZeroAsFresh` gesetzt werden. Damit bleibt
 * ein korrekt dauerhaft stehender 0-W-Wert gültig, auch wenn sich sein Zeitstempel nicht ändert.
 */
function isMainStateFresh(entry, options = {}) {
    if (!hasPresentMainValue(entry))
        return false;
    const staleAfterMs = Math.max(0, Number(options.staleAfterMs ?? 0));
    if (staleAfterMs <= 0)
        return true;
    if (options.treatZeroAsFresh && Number(entry?.value) === 0)
        return true;
    const nowMs = Number(options.nowMs ?? Date.now());
    const stamp = Number(entry?.ts ?? entry?.lc ?? 0);
    return Number.isFinite(stamp) && stamp > 0 && nowMs - stamp <= staleAfterMs;
}
/**
 * Code-Teil: readFirstMainState
 *
 * Zweck:
 * Liest aus mehreren Alias-IDs den ersten wirklich vorhandenen State.
 *
 * Zusammenhang:
 * main.js hat historisch viele Aliasnamen für dieselben Werte. Dieser Helfer macht
 * später nachvollziehbar, welcher Alias tatsächlich verwendet wurde.
 */
function readFirstMainState(cache, ids, fallback = null) {
    for (const id of ids) {
        const entry = normalizeMainState(id, cache[id]);
        if (hasPresentMainValue(entry))
            return { found: true, id, value: entry.value, entry };
    }
    return { found: fallback !== null, id: null, value: fallback, entry: fallback === null ? null : { id: '', value: fallback, source: 'fallback' } };
}
/** Code-Teil: readMainNumber. Zweck: Liest einen Zahlenwert, ohne 0 als fehlend zu behandeln. */
function readMainNumber(cache, ids, fallback = null) {
    const raw = readFirstMainState(cache, ids, fallback).value;
    const n = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(n) ? n : fallback;
}
/** Code-Teil: readMainBoolean. Zweck: Liest einen Boolean-Wert, ohne false als fehlend zu behandeln. */
function readMainBoolean(cache, ids, fallback = false) {
    const raw = readFirstMainState(cache, ids, fallback).value;
    if (typeof raw === 'boolean')
        return raw;
    if (typeof raw === 'number')
        return raw !== 0;
    const s = String(raw ?? '').trim().toLowerCase();
    if (['true', '1', 'on', 'yes', 'ja', 'an'].includes(s))
        return true;
    if (['false', '0', 'off', 'no', 'nein', 'aus'].includes(s))
        return false;
    return fallback;
}
/** Code-Teil: readMainString. Zweck: Liest Strings und erhält auch leere Strings bewusst. */
function readMainString(cache, ids, fallback = '') {
    const raw = readFirstMainState(cache, ids, fallback).value;
    return raw === null || raw === undefined ? fallback : String(raw);
}
