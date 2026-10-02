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

export type MainStateId = string;
export type MainTimestampMs = number;

export interface MainRawState<T = unknown> {
  readonly val?: T;
  readonly value?: T;
  readonly ack?: boolean;
  readonly ts?: MainTimestampMs;
  readonly lc?: MainTimestampMs;
  readonly q?: number;
  readonly quality?: number;
}

export interface MainNormalizedState<T = unknown> {
  readonly id: MainStateId;
  readonly value: T | null;
  readonly ack?: boolean;
  readonly ts?: MainTimestampMs;
  readonly lc?: MainTimestampMs;
  readonly q?: number;
  readonly source: 'state-cache' | 'api-state' | 'fallback' | 'missing';
}

export interface MainStateReadOptions {
  readonly nowMs?: MainTimestampMs;
  readonly staleAfterMs?: number;
  readonly treatZeroAsFresh?: boolean;
}

export interface MainStateReadResult<T = unknown> {
  readonly found: boolean;
  readonly id: MainStateId | null;
  readonly value: T | null;
  readonly entry: MainNormalizedState<T> | null;
}

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
function hasOwn(obj: unknown, key: string): boolean {
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
export function extractRawValue<T = unknown>(raw: MainRawState<T> | undefined): { hasValue: boolean; value: T | null; source: 'state-cache' | 'api-state' | 'missing' } {
  if (!raw) return { hasValue: false, value: null, source: 'missing' };
  if (hasOwn(raw, 'value')) return { hasValue: true, value: (raw.value ?? null) as T | null, source: 'state-cache' };
  if (hasOwn(raw, 'val')) return { hasValue: true, value: (raw.val ?? null) as T | null, source: 'api-state' };
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
export function normalizeMainState<T = unknown>(id: MainStateId, raw: MainRawState<T> | undefined): MainNormalizedState<T> {
  const picked = extractRawValue(raw);
  const qRaw = raw ? (raw.q ?? raw.quality) : undefined;
  const out: MainNormalizedState<T> = {
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
export function hasPresentMainValue(entry: MainNormalizedState | undefined | null): boolean {
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
export function isMainStateFresh(entry: MainNormalizedState | undefined | null, options: MainStateReadOptions = {}): boolean {
  if (!hasPresentMainValue(entry)) return false;
  const staleAfterMs = Math.max(0, Number(options.staleAfterMs ?? 0));
  if (staleAfterMs <= 0) return true;
  if (options.treatZeroAsFresh && Number(entry?.value) === 0) return true;
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
export function readFirstMainState<T = unknown>(cache: Record<string, MainRawState<T> | undefined>, ids: readonly MainStateId[], fallback: T | null = null): MainStateReadResult<T> {
  for (const id of ids) {
    const entry = normalizeMainState<T>(id, cache[id]);
    if (hasPresentMainValue(entry)) return { found: true, id, value: entry.value, entry };
  }
  return { found: fallback !== null, id: null, value: fallback, entry: fallback === null ? null : { id: '', value: fallback, source: 'fallback' } };
}

/** Code-Teil: readMainNumber. Zweck: Liest einen Zahlenwert, ohne 0 als fehlend zu behandeln. */
export function readMainNumber(cache: Record<string, MainRawState | undefined>, ids: readonly MainStateId[], fallback: number | null = null): number | null {
  const raw = readFirstMainState(cache, ids, fallback).value;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** Code-Teil: readMainBoolean. Zweck: Liest einen Boolean-Wert, ohne false als fehlend zu behandeln. */
export function readMainBoolean(cache: Record<string, MainRawState | undefined>, ids: readonly MainStateId[], fallback = false): boolean {
  const raw = readFirstMainState(cache, ids, fallback).value;
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw !== 0;
  const s = String(raw ?? '').trim().toLowerCase();
  if (['true', '1', 'on', 'yes', 'ja', 'an'].includes(s)) return true;
  if (['false', '0', 'off', 'no', 'nein', 'aus'].includes(s)) return false;
  return fallback;
}

/** Code-Teil: readMainString. Zweck: Liest Strings und erhält auch leere Strings bewusst. */
export function readMainString(cache: Record<string, MainRawState | undefined>, ids: readonly MainStateId[], fallback = ''): string {
  const raw = readFirstMainState(cache, ids, fallback).value;
  return raw === null || raw === undefined ? fallback : String(raw);
}
