'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/adapter/api-state.ts
 * Quell-Hash: sha256:297ec576fbb29ecaf0c559f0fad3d0087a97d9b76384f255d96edec61afe141a
 * Erzeugung: npm run sync:ts-adapter-helpers
 *
 * Zweck:
 * Diese Datei ist der CommonJS-Spiegel eines adapter-nahen TypeScript-Helfers.
 * main.js darf diese Datei nur mit Fallback laden, damit die produktive Runtime
 * nicht von einem Migrationsartefakt abhängig wird.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toApiStateEntry = toApiStateEntry;
exports.buildApiStateResponse = buildApiStateResponse;
const state_cache_1 = require("./state-cache");
/**
 * Datei: src-ts/adapter/api-state.ts
 *
 * Zweck:
 * TypeScript-Vorbereitung für den `/api/state`-Antwortaufbau.
 *
 * Zusammenhang:
 * `main.js` liefert über `/api/state` Werte an Dashboard, History, SmartHome und KI.
 * Diese Datei hält die spätere Antwortform fest, ohne die Runtime jetzt zu ändern.
 */
/**
 * Code-Teil: toApiStateEntry
 *
 * Zweck:
 * Wandelt einen Cache-Eintrag in das öffentliche API-Format um.
 *
 * Wichtig:
 * Nur wirklich fehlende Werte werden ausgelassen. `0` und `false` bleiben erhalten.
 */
function toApiStateEntry(id, raw) {
    const entry = (0, state_cache_1.normalizeStateEntry)(id, raw);
    if (!(0, state_cache_1.isStateValuePresent)(entry))
        return undefined;
    const out = { value: entry.value };
    if (entry.ack !== undefined)
        out.ack = entry.ack;
    if (entry.ts !== undefined)
        out.ts = entry.ts;
    if (entry.lc !== undefined)
        out.lc = entry.lc;
    if (entry.q !== undefined)
        out.q = entry.q;
    return out;
}
/** Code-Teil: shouldExposeStateKey. Zweck: Bereitet spätere API-Filter für interne/öffentliche States vor. */
function shouldExposeStateKey(key, options) {
    if (!Array.isArray(options.includeOnlyKeys) || options.includeOnlyKeys.length === 0)
        return true;
    return options.includeOnlyKeys.includes(key);
}
/**
 * Code-Teil: buildApiStateResponse
 *
 * Zweck:
 * Baut aus dem StateCache die typisierte Antwort für `/api/state`.
 */
function buildApiStateResponse(cache, options = {}) {
    const states = {};
    for (const [key, raw] of Object.entries(cache)) {
        if (!shouldExposeStateKey(key, options))
            continue;
        const entry = toApiStateEntry(key, raw);
        if (entry !== undefined)
            states[key] = entry;
    }
    return { states, generatedAt: (options.generatedAt ?? Date.now()) };
}
