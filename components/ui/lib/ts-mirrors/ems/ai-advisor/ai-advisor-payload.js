'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/ems/ai-advisor/ai-advisor-payload.ts
 * Quell-Hash: sha256:b8437e1fe6c7d1084ef4589baa98530f310997a6adb96a0478daf774cacc6ee3
 * Erzeugung: npm run sync:ts-ems-mirrors
 *
 * Zweck:
 * KI-Berater-Publish-Payload für produktive, sichere Vorschlagsnormalisierung.
 *
 * Zusammenhang:
 * Dieser Spiegel ist die sichere Vorstufe für spätere Core-Limits-/Heizstab-
 * Shadow-Vergleiche. In 0.7.76 bleibt die produktive Runtime unverändert.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/ vornehmen.
 * 2. npm run sync:ts-ems-mirrors ausführen.
 * 3. npm run test:ems-mirrors prüfen.
 */
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Bereitet die Eingangsdaten des Energieberaters aus normierten Anlagenwerten auf.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/ems/ai-advisor/ai-advisor-payload.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.asText = asText;
exports.asNumber = asNumber;
exports.normalizeSeverity = normalizeSeverity;
exports.normalizeSuggestion = normalizeSuggestion;
exports.safeJson = safeJson;
exports.buildAiAdvisorPublishPayload = buildAiAdvisorPublishPayload;
/**
 * Code-Teil: asText
 *
 * Zweck:
 * Wandelt unbekannte Werte in sichere UI-/JSON-Texte um.
 *
 * Zusammenhang:
 * Die alte JS-Runtime liefert Vorschläge aus vielen Regeln. Einzelne Felder können
 * fehlen. Das darf die Veröffentlichung von `aiAdvisor.*` nicht abbrechen.
 */
function asText(value, fallback = '') {
    if (value === null || value === undefined)
        return fallback;
    const text = String(value);
    return text.trim() ? text : fallback;
}
/**
 * Code-Teil: asNumber
 *
 * Zweck:
 * Liest Zahlen aus alten JS-Vorschlägen, ohne NaN/Infinity in JSON-States zu schreiben.
 */
function asNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}
/**
 * Code-Teil: normalizeSeverity
 *
 * Zweck:
 * Normalisiert Schweregrade auf die Werte, die Dashboard und History sicher anzeigen können.
 */
function normalizeSeverity(value, fallback = 'info') {
    const raw = String(value === null || value === undefined ? '' : value).trim().toLowerCase();
    if (raw === 'success' || raw === 'info' || raw === 'warning' || raw === 'critical' || raw === 'neutral')
        return raw;
    return fallback;
}
/**
 * Code-Teil: normalizeSuggestion
 *
 * Zweck:
 * Macht aus einem alten JS-Vorschlag ein stabiles, typisiertes Ausgabeobjekt.
 *
 * Sicherheitsregel:
 * Fehlende Titel/Textfelder werden nicht als Runtimefehler behandelt. Der KI-Berater
 * soll beraten, aber niemals das EMS blockieren.
 */
function normalizeSuggestion(item, index = 0) {
    const priority = Math.max(0, Math.min(999, Math.round(asNumber(item && item.priority, 50))));
    const severity = normalizeSeverity(item && item.severity, 'info');
    return {
        id: asText(item && item.id, `suggestion-${index + 1}`),
        category: asText(item && item.category, 'system'),
        severity,
        priority,
        icon: asText(item && item.icon, severity === 'critical' ? '⚠️' : '💡'),
        title: asText(item && item.title, 'KI-Hinweis'),
        text: asText(item && item.text, ''),
        action: asText(item && item.action, ''),
        window: asText(item && item.window, ''),
        impact: asText(item && item.impact, ''),
        confidence: item && item.confidence !== undefined && item.confidence !== null ? Math.max(0, Math.min(100, asNumber(item.confidence, 0))) : null,
    };
}
/**
 * Code-Teil: safeJson
 *
 * Zweck:
 * Serialisiert KI-Ausgabe sicher. Fehlerhafte Sonderwerte dürfen die State-Schreibung
 * nicht abbrechen.
 */
function safeJson(value, fallback = '[]') {
    try {
        const json = JSON.stringify(value);
        return typeof json === 'string' ? json : fallback;
    }
    catch (_e) {
        return fallback;
    }
}
/**
 * Code-Teil: buildAiAdvisorPublishPayload
 *
 * Zweck:
 * Baut den produktiv verwendeten, typisierten Publish-Payload für den KI-Berater.
 *
 * Zusammenhang:
 * `ems/modules/ai-advisor.js` erzeugt weiterhin die fachlichen Vorschläge. Diese Funktion
 * übernimmt ab 0.7.115 die sichere Normalisierung für JSON, Top-Vorschlag, Count,
 * Severity, Headline und Hash-Eingang.
 */
function buildAiAdvisorPublishPayload(input) {
    const max = Math.max(0, Math.min(32, Math.round(asNumber(input.maxSuggestions, 8))));
    const rawList = Array.isArray(input.suggestions) ? input.suggestions : [];
    const suggestions = rawList.slice(0, max || rawList.length).map((item, index) => normalizeSuggestion(item, index));
    const top = suggestions.length ? (suggestions[0] || null) : null;
    const severity = top ? top.severity : 'neutral';
    const headline = top ? `${top.icon || '💡'} ${top.title}` : 'KI-Energieberater bereit';
    const summary = top ? top.text : 'Keine aktuellen Hinweise.';
    const score = Math.max(0, Math.min(100, Math.round(asNumber(input.score, 100))));
    const dailyPlanText = asText(input.dailyPlanText, '');
    const learning = input.learning && typeof input.learning === 'object' ? input.learning : {};
    return {
        source: 'ts-ai-advisor-payload-v1',
        ok: true,
        suggestions,
        top,
        severity,
        headline,
        summary,
        suggestionsJson: safeJson(suggestions, '[]'),
        count: suggestions.length,
        score,
        hashPayload: {
            suggestions,
            score,
            severity,
            show: input.showInLive !== false,
            plan: dailyPlanText,
            anomaly: asText(learning.anomalyText, ''),
            forecastQuality: learning.forecastQualityPct ?? null,
        },
    };
}
