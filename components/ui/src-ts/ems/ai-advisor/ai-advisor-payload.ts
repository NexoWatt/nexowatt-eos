/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Bereitet die Eingangsdaten des Energieberaters aus normierten Anlagenwerten auf.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/ems/ai-advisor/ai-advisor-payload.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */

/**
 * Datei: src-ts/ems/ai-advisor/ai-advisor-payload.ts
 *
 * Zweck:
 * Erster produktiv nutzbarer TypeScript-Helfer für den KI-Energieberater. Diese Datei
 * normalisiert Vorschläge und baut den Publish-Payload, den `ems/modules/ai-advisor.js`
 * später in `aiAdvisor.*` States schreibt.
 *
 * Zusammenhang:
 * Der KI-Berater bleibt beratend und darf keine Verbraucher schalten. Diese Helfer
 * betreffen nur Ausgabeform, JSON-Stabilität, Top-Vorschlag und Anzeige-Fallbacks.
 *
 * Wichtig:
 * 0.7.115 schaltet nicht die komplette KI-Logik auf TypeScript um. Die Vorschläge werden
 * weiterhin in der bestehenden JS-Runtime erzeugt. TypeScript übernimmt nur die sichere
 * Normalisierung der Ausgabe.
 */

/** Erlaubte Priorität/Schwere eines KI-Vorschlags. */
export type AiAdvisorPayloadSeverity = 'success' | 'info' | 'warning' | 'critical' | 'neutral';

/** Minimaler Rohvorschlag aus der bestehenden JS-Runtime. */
export interface AiAdvisorRawSuggestion {
  readonly id?: unknown;
  readonly category?: unknown;
  readonly severity?: unknown;
  readonly priority?: unknown;
  readonly icon?: unknown;
  readonly title?: unknown;
  readonly text?: unknown;
  readonly action?: unknown;
  readonly window?: unknown;
  readonly impact?: unknown;
  readonly confidence?: unknown;
  readonly [key: string]: unknown;
}

/** Normalisierter Vorschlag, der gefahrlos als JSON-State und UI-Kachel geschrieben wird. */
export interface AiAdvisorNormalizedSuggestion {
  readonly id: string;
  readonly category: string;
  readonly severity: AiAdvisorPayloadSeverity;
  readonly priority: number;
  readonly icon: string;
  readonly title: string;
  readonly text: string;
  readonly action: string;
  readonly window: string;
  readonly impact: string;
  readonly confidence: number | null;
}

/** Eingaben für die TS-Publish-Normalisierung. */
export interface AiAdvisorPublishInput {
  readonly suggestions?: readonly AiAdvisorRawSuggestion[] | null;
  readonly score?: unknown;
  readonly showInLive?: unknown;
  readonly dailyPlanText?: unknown;
  readonly learning?: Record<string, unknown> | null;
  readonly maxSuggestions?: unknown;
}

/** Ergebnis der TS-Normalisierung. */
export interface AiAdvisorPublishPayload {
  readonly source: 'ts-ai-advisor-payload-v1';
  readonly ok: boolean;
  readonly suggestions: readonly AiAdvisorNormalizedSuggestion[];
  readonly top: AiAdvisorNormalizedSuggestion | null;
  readonly severity: AiAdvisorPayloadSeverity;
  readonly headline: string;
  readonly summary: string;
  readonly suggestionsJson: string;
  readonly count: number;
  readonly score: number;
  readonly hashPayload: Record<string, unknown>;
}

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
export function asText(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  const text = String(value);
  return text.trim() ? text : fallback;
}

/**
 * Code-Teil: asNumber
 *
 * Zweck:
 * Liest Zahlen aus alten JS-Vorschlägen, ohne NaN/Infinity in JSON-States zu schreiben.
 */
export function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Code-Teil: normalizeSeverity
 *
 * Zweck:
 * Normalisiert Schweregrade auf die Werte, die Dashboard und History sicher anzeigen können.
 */
export function normalizeSeverity(value: unknown, fallback: AiAdvisorPayloadSeverity = 'info'): AiAdvisorPayloadSeverity {
  const raw = String(value === null || value === undefined ? '' : value).trim().toLowerCase();
  if (raw === 'success' || raw === 'info' || raw === 'warning' || raw === 'critical' || raw === 'neutral') return raw;
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
export function normalizeSuggestion(item: AiAdvisorRawSuggestion | null | undefined, index = 0): AiAdvisorNormalizedSuggestion {
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
export function safeJson(value: unknown, fallback = '[]'): string {
  try {
    const json = JSON.stringify(value);
    return typeof json === 'string' ? json : fallback;
  } catch (_e) {
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
export function buildAiAdvisorPublishPayload(input: AiAdvisorPublishInput): AiAdvisorPublishPayload {
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
