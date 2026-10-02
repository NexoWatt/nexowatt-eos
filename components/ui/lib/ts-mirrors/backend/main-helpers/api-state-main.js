'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/backend/main-helpers/api-state-main.ts
 * Quell-Hash: sha256:3a58f9e3f84605fe917277aea4ea9e29beed76572870cccd8ffd161746676804
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
exports.toMainApiStateEntry = toMainApiStateEntry;
exports.buildMainApiStateResponse = buildMainApiStateResponse;
const state_cache_1 = require("../state-cache/state-cache");
/**
 * Code-Teil: toMainApiStateEntry
 *
 * Zweck:
 * Wandelt einen Cache-Eintrag in ein API-fähiges Objekt um.
 *
 * Wichtig:
 * `0` und `false` werden übernommen. Nur wirklich fehlende Werte erzeugen `undefined`.
 */
function toMainApiStateEntry(raw) {
    if (!(0, state_cache_1.hasExplicitStateValue)(raw))
        return undefined;
    const out = {
        value: (0, state_cache_1.getStateValue)(raw, null),
    };
    const ts = (0, state_cache_1.getStateTimestamp)(raw, null);
    if (ts !== null)
        out.ts = ts;
    if (raw && typeof raw === 'object' && typeof raw.lc === 'number')
        out.lc = raw.lc;
    if (raw && typeof raw === 'object' && typeof raw.ack === 'boolean')
        out.ack = raw.ack;
    const q = raw && typeof raw === 'object' ? Number(raw.q ?? raw.quality) : NaN;
    if (Number.isFinite(q))
        out.q = q;
    return out;
}
/**
 * Code-Teil: buildMainApiStateResponse
 *
 * Zweck:
 * Baut eine typisierte `/api/state`-Teilantwort aus dem StateCache.
 *
 * Zusammenhang:
 * Diese Funktion schreibt nichts und verändert keine Werte. Sie ist ein risikoarmer Schritt,
 * um den großen `/api/state`-Block in `main.js` später zu ersetzen.
 */
function buildMainApiStateResponse(cache, includeKeys, generatedAt = Date.now()) {
    const states = {};
    const keys = includeKeys && includeKeys.length ? includeKeys : Object.keys(cache);
    for (const key of keys) {
        const entry = toMainApiStateEntry(cache[key]);
        if (entry !== undefined)
            states[key] = entry;
    }
    return { generatedAt, states };
}
