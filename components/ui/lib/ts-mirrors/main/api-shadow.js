'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/main/api-shadow.ts
 * Quell-Hash: sha256:8957402112a36c66e4ce99ba05b3adac346b04af9fb2e2cfaddb083a0f476677
 * Erzeugung: npm run sync:ts-main-helpers
 *
 * Zweck:
 * Diese Datei ist ein CommonJS-Spiegel eines echten TypeScript-Helfers für main.js.
 * main.js nutzt diese Helfer in 0.7.98 noch nicht produktiv; sie bilden die sichere
 * Grundlage für die spätere schrittweise Auslagerung.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildMainApiStateShadowSummary = buildMainApiStateShadowSummary;
exports.buildMainApiSetShadowSummary = buildMainApiSetShadowSummary;
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Vergleicht Zustands-/Schreibpläne im Shadow-Pfad, damit typisierte Helfer mit dem bisherigen Verhalten abgeglichen werden können.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/main/api-shadow.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
const api_state_1 = require("./api-state");
const api_set_1 = require("./api-set");
const state_cache_1 = require("./state-cache");
/**
 * Code-Teil: valuesEqualForApiShadow
 *
 * Zweck:
 * Vergleicht Werte aus der aktuellen JS-API und der TS-Vorschau robust.
 *
 * Zusammenhang:
 * Der `/api/state`-Shadow darf nicht wegen Objektidentität anschlagen. Für einfache
 * Werte vergleichen wir direkt, für Objekte stabil über JSON.
 *
 * Wichtig:
 * 0, false und leere Strings bleiben gültige Werte und dürfen nicht als fehlend gelten.
 */
function valuesEqualForApiShadow(a, b) {
    if (Object.is(a, b))
        return true;
    if (typeof a === 'number' && typeof b === 'number' && Number.isNaN(a) && Number.isNaN(b))
        return true;
    const aObj = a !== null && typeof a === 'object';
    const bObj = b !== null && typeof b === 'object';
    if (aObj || bObj) {
        try {
            return JSON.stringify(a) === JSON.stringify(b);
        }
        catch (_err) {
            return false;
        }
    }
    return false;
}
/**
 * Code-Teil: runtimeApiValue
 *
 * Zweck:
 * Extrahiert den Wert aus der aktuellen Runtime-Antwortform.
 *
 * Zusammenhang:
 * `main.js` liefert aktuell direkt `stateCache` aus. Je nach Quelle kann der Wert als
 * `{ value }` oder `{ val }` vorliegen. Der Shadow nutzt dieselbe Semantik wie die
 * bestehenden StateCache-Helfer.
 */
function runtimeApiValue(raw) {
    const picked = (0, state_cache_1.extractRawValue)(raw);
    return { present: picked.hasValue, value: picked.value };
}
/**
 * Code-Teil: buildMainApiStateShadowSummary
 *
 * Zweck:
 * Baut parallel zur bestehenden `/api/state`-Antwort eine TypeScript-Vorschau und
 * vergleicht beide Wertemengen.
 *
 * Zusammenhang:
 * Diese Funktion ist der sichere Zwischenschritt vor einer späteren produktiven
 * Auslagerung von `/api/state`. Die Runtime bleibt dabei unverändert.
 */
function buildMainApiStateShadowSummary(cache, generatedAt = Date.now()) {
    const tsResponse = (0, api_state_1.buildMainApiStateResponse)(cache, { generatedAt });
    const mismatches = [];
    const runtimeKeys = Object.keys(cache).filter((key) => runtimeApiValue(cache[key]).present);
    const tsKeys = Object.keys(tsResponse.states || {});
    const allKeys = new Set([...runtimeKeys, ...tsKeys]);
    for (const key of allKeys) {
        const runtime = runtimeApiValue(cache[key]);
        const tsEntry = tsResponse.states[key];
        const tsPresent = !!tsEntry && Object.prototype.hasOwnProperty.call(tsEntry, 'value') && tsEntry.value !== null && tsEntry.value !== undefined;
        if (runtime.present && !tsPresent) {
            mismatches.push({ key, runtimeValue: runtime.value, tsValue: undefined, reason: 'missing-in-ts' });
        }
        else if (!runtime.present && tsPresent) {
            mismatches.push({ key, runtimeValue: undefined, tsValue: tsEntry ? tsEntry.value : undefined, reason: 'extra-in-ts' });
        }
        else if (runtime.present && tsPresent && !valuesEqualForApiShadow(runtime.value, tsEntry ? tsEntry.value : undefined)) {
            mismatches.push({ key, runtimeValue: runtime.value, tsValue: tsEntry ? tsEntry.value : undefined, reason: 'value-mismatch' });
        }
    }
    return {
        ok: mismatches.length === 0,
        source: 'ts-main-api-state-shadow',
        generatedAt,
        runtimeCount: runtimeKeys.length,
        tsCount: tsKeys.length,
        mismatchCount: mismatches.length,
        mismatches: mismatches.slice(0, 20),
        note: 'Diagnose: /api/state wird weiterhin von main.js geliefert; TypeScript vergleicht nur parallel.',
    };
}
/**
 * Code-Teil: buildMainApiSetShadowSummary
 *
 * Zweck:
 * Erstellt für `/api/set` einen TypeScript-Schreibplan, ohne diesen produktiv auszuführen.
 *
 * Zusammenhang:
 * Damit sehen wir früh, ob die spätere TypeScript-Auslagerung von `settings.*` dieselbe
 * Normalisierung liefern würde wie main.js. Nicht unterstützte Scopes sind kein Fehler.
 */
function buildMainApiSetShadowSummary(request, generatedAt = Date.now()) {
    const result = (0, api_set_1.buildMainSettingsWritePlan)(request);
    return {
        ok: result.ok || request.scope !== 'settings',
        source: 'ts-main-api-set-shadow',
        generatedAt,
        scope: request.scope,
        key: request.key,
        supported: !!result.ok,
        ...(result.plan ? { plan: result.plan } : {}),
        ...(result.message ? { message: result.message } : {}),
        note: 'Diagnose: /api/set wird weiterhin von main.js ausgeführt; TypeScript erstellt nur einen Vergleichs-Schreibplan.',
    };
}
