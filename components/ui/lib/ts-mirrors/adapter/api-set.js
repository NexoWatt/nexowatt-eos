'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/adapter/api-set.ts
 * Quell-Hash: sha256:f267998f18c4b1bba6fcc808fa5ed05eb35e097cd07bb5452f2ee7465402e848
 * Erzeugung: npm run sync:ts-adapter-helpers
 *
 * Zweck:
 * Diese Datei ist der CommonJS-Spiegel eines adapter-nahen TypeScript-Helfers.
 * main.js darf diese Datei nur mit Fallback laden, damit die produktive Runtime
 * nicht von einem Migrationsartefakt abhängig wird.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeApiValue = normalizeApiValue;
exports.buildSettingsWritePlan = buildSettingsWritePlan;
/** Code-Teil: normalizeBoolean. Zweck: String-/Number-Toggles in echte Booleans wandeln. */
function normalizeBoolean(value) {
    if (typeof value === 'boolean')
        return value;
    const s = String(value ?? '').trim().toLowerCase();
    return ['true', '1', 'on', 'yes', 'ja', 'an'].includes(s);
}
/** Code-Teil: normalizeNumber. Zweck: Zahlenwerte mit Grenzen normalisieren. */
function normalizeNumber(value, def = 0, min, max) {
    let n = Number(value);
    if (!Number.isFinite(n))
        n = def;
    if (typeof min === 'number')
        n = Math.max(min, n);
    if (typeof max === 'number')
        n = Math.min(max, n);
    return Math.round(n * 1000) / 1000;
}
/**
 * Code-Teil: normalizeApiValue
 *
 * Zweck:
 * Wandelt API-Eingabewerte passend zum erwarteten Typ um.
 */
function normalizeApiValue(value, kind, def = null, min, max) {
    if (kind === 'boolean')
        return normalizeBoolean(value);
    if (kind === 'number')
        return normalizeNumber(value, Number(def ?? 0), min, max);
    if (kind === 'json') {
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            }
            catch (_err) {
                return def ?? null;
            }
        }
        return value ?? def ?? null;
    }
    if (kind === 'string')
        return String(value ?? def ?? '');
    return value ?? def ?? null;
}
/**
 * Code-Teil: buildSettingsWritePlan
 *
 * Zweck:
 * Erstellt einen typisierten Schreibplan für spätere `settings.*`-States.
 */
function buildSettingsWritePlan(request, definitions) {
    if (request.scope !== 'settings')
        return { ok: false, message: `Scope ${request.scope} ist kein settings-Schreibvorgang.` };
    const definition = definitions.find((item) => item.key === request.key);
    if (!definition)
        return { ok: false, message: `Unbekannte Einstellung: ${request.key}` };
    const normalizedValue = normalizeApiValue(request.value, definition.valueKind, null, definition.min, definition.max);
    return {
        ok: true,
        stateId: definition.stateId,
        normalizedValue,
        plan: { stateId: definition.stateId, value: normalizedValue, ack: false, reason: 'Kundeneinstellung aus Frontend-API' },
    };
}
