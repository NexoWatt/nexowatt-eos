/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Bereitet die Wertehülle der Zustands-API für die konsumierenden Browserbereiche auf.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/main/api-state.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import { hasPresentMainValue, normalizeMainState, type MainRawState, type MainTimestampMs } from './state-cache';

/**
 * Datei: src-ts/main/api-state.ts
 *
 * Zweck:
 * Echte TypeScript-Helfer für die spätere Auslagerung des `/api/state`-Aufbaus aus main.js.
 *
 * Zusammenhang:
 * `/api/state` wird von LIVE-Dashboard, History, SmartHome, App-Center und teilweise
 * Diagnose-/KI-Bereichen gelesen. Feldnamen und Werte-Semantik müssen deshalb stabil bleiben.
 */

export interface MainApiStateEntry<T = unknown> {
  readonly value: T | null;
  readonly ack?: boolean;
  readonly ts?: MainTimestampMs;
  readonly lc?: MainTimestampMs;
  readonly q?: number;
}

export interface MainApiStateResponse {
  readonly states: Record<string, MainApiStateEntry | undefined>;
  readonly generatedAt: MainTimestampMs;
}

export interface MainApiStateBuildOptions {
  readonly generatedAt?: MainTimestampMs;
  readonly includeOnlyKeys?: readonly string[];
}

/**
 * Code-Teil: toMainApiStateEntry
 *
 * Zweck:
 * Wandelt einen rohen Cache-State in die öffentliche `/api/state`-Form.
 *
 * Wichtig:
 * 0 und false werden ausdrücklich behalten. Nur null/undefined werden ausgelassen.
 */
export function toMainApiStateEntry<T = unknown>(id: string, raw: MainRawState<T> | undefined): MainApiStateEntry<T> | undefined {
  const normalized = normalizeMainState<T>(id, raw);
  if (!hasPresentMainValue(normalized)) return undefined;
  return {
    value: normalized.value,
    ...(normalized.ack !== undefined ? { ack: normalized.ack } : {}),
    ...(normalized.ts !== undefined ? { ts: normalized.ts } : {}),
    ...(normalized.lc !== undefined ? { lc: normalized.lc } : {}),
    ...(normalized.q !== undefined ? { q: normalized.q } : {}),
  };
}

/**
 * Code-Teil: buildMainApiStateResponse
 *
 * Zweck:
 * Erstellt aus einem StateCache eine typisierte `/api/state`-Antwort.
 *
 * Zusammenhang:
 * Diese Funktion ist noch nicht produktiv an main.js angebunden. Sie ist die spätere
 * sichere Auslagerungsbasis, damit Frontend und History gleiche Werte erhalten.
 */
export function buildMainApiStateResponse(cache: Record<string, MainRawState | undefined>, options: MainApiStateBuildOptions = {}): MainApiStateResponse {
  const states: MainApiStateResponse['states'] = {};
  const include = Array.isArray(options.includeOnlyKeys) && options.includeOnlyKeys.length > 0 ? new Set(options.includeOnlyKeys) : null;
  for (const [id, raw] of Object.entries(cache)) {
    if (include && !include.has(id)) continue;
    const entry = toMainApiStateEntry(id, raw);
    if (entry !== undefined) states[id] = entry;
  }
  return { states, generatedAt: options.generatedAt ?? Date.now() };
}


export interface MainApiStateShadowMismatch {
  readonly key: string;
  readonly reason: 'missing-in-runtime' | 'missing-in-ts' | 'value-differs';
  readonly runtimeValue?: unknown;
  readonly tsValue?: unknown;
}

export interface MainApiStateShadowComparison {
  readonly available: boolean;
  readonly ok: boolean;
  readonly runtimeCount: number;
  readonly tsCount: number;
  readonly mismatchCount: number;
  readonly mismatches: readonly MainApiStateShadowMismatch[];
  readonly generatedAt: MainTimestampMs;
}

/**
 * Code-Teil: stableApiStateValueText
 *
 * Zweck:
 * Erzeugt einen stabil vergleichbaren Text für Werte aus `/api/state`.
 *
 * Zusammenhang:
 * Der Shadow-Vergleich darf `0`, `false` und leere Strings nicht verlieren. Deshalb
 * wird nicht mit Wahrheit/Falschheit verglichen, sondern mit expliziter JSON-Form.
 */
function stableApiStateValueText(value: unknown): string {
  if (value === undefined) return '__undefined__';
  try { return JSON.stringify(value); } catch (_err) { return String(value); }
}

/**
 * Code-Teil: compareMainApiStateResponseWithRuntime
 *
 * Zweck:
 * Vergleicht die bisherige `main.js`-Runtime-Antwort von `/api/state` mit der
 * TypeScript-Helferantwort. Diese Funktion ist bewusst nur ein Shadow-/Diagnosewerkzeug.
 *
 * Wichtig:
 * Die produktive API-Antwort bleibt in 0.7.99 unverändert. Abweichungen werden nur
 * protokolliert, damit wir die spätere Auslagerung sicher vorbereiten können.
 */
export function compareMainApiStateResponseWithRuntime(
  runtimeCache: Record<string, MainRawState | undefined>,
  tsResponse: MainApiStateResponse = buildMainApiStateResponse(runtimeCache),
): MainApiStateShadowComparison {
  const runtimeKeys = Object.keys(runtimeCache || {}).filter((key) => toMainApiStateEntry(key, runtimeCache[key]) !== undefined);
  const tsStates = tsResponse.states || {};
  const tsKeys = Object.keys(tsStates).filter((key) => tsStates[key] !== undefined);
  const allKeys = new Set<string>([...runtimeKeys, ...tsKeys]);
  const mismatches: MainApiStateShadowMismatch[] = [];

  for (const key of allKeys) {
    const runtimeEntry = toMainApiStateEntry(key, runtimeCache[key]);
    const tsEntry = tsStates[key];
    if (!runtimeEntry && tsEntry) {
      mismatches.push({ key, reason: 'missing-in-runtime', tsValue: tsEntry.value });
      continue;
    }
    if (runtimeEntry && !tsEntry) {
      mismatches.push({ key, reason: 'missing-in-ts', runtimeValue: runtimeEntry.value });
      continue;
    }
    if (runtimeEntry && tsEntry && stableApiStateValueText(runtimeEntry.value) !== stableApiStateValueText(tsEntry.value)) {
      mismatches.push({ key, reason: 'value-differs', runtimeValue: runtimeEntry.value, tsValue: tsEntry.value });
    }
  }

  return {
    available: true,
    ok: mismatches.length === 0,
    runtimeCount: runtimeKeys.length,
    tsCount: tsKeys.length,
    mismatchCount: mismatches.length,
    mismatches: mismatches.slice(0, 25),
    generatedAt: tsResponse.generatedAt,
  };
}

