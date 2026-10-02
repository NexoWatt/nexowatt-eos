/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Normalisiert Zugriffe auf gespeicherte ioBroker-Werte und unterscheidet fehlende Werte von gültigen Null-/False-Werten.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/adapter/state-cache.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type { BuildApiStateResponseInput, InfoConnectionUpdate, NormalizedStateEntry } from '../contracts/adapter-api';
import type { AdapterStateValue, CachedState, StateCache } from '../contracts/iobroker-states';
import type { StateId, TimestampMs } from '../contracts/units';

/**
 * Datei: src-ts/adapter/state-cache.ts
 *
 * Zweck:
 * TypeScript-Vorbereitung für den State-Cache und erste `/api/state`-Hilfen aus `main.js`.
 * Diese Datei ist noch nicht produktiv angebunden. Sie beschreibt aber die Regeln, die
 * beim späteren Auslagern aus `main.js` eingehalten werden müssen.
 *
 * Zusammenhang:
 * - `main.js` hält aktuell einen Cache aus ioBroker-States.
 * - `/api/state` gibt Teile dieses Caches an das Kundenfrontend aus.
 * - Energiefluss, History, KI-Berater, SmartHome und Feature-Sichtbarkeit lesen daraus.
 *
 * Kritische Regel:
 * `0`, `false` und leere Strings sind gültige Werte. Sie dürfen nicht per `||` oder
 * Wahrheit/Falschheit als fehlend behandelt werden.
 */

export interface StateReadResult<T = unknown> {
  value: T | null;
  key: string | null;
  stateId: StateId | null;
  found: boolean;
  source: 'cache' | 'fallback' | 'missing';
}

export interface StateFreshnessOptions {
  nowMs?: TimestampMs;
  staleAfterMs?: number;
  treatZeroAsFresh?: boolean;
}

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
function hasOwn(obj: unknown, key: string): boolean {
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
function pickRawValue(raw: AdapterStateValue | CachedState | NormalizedStateEntry | undefined): { value: unknown; hasValue: boolean } {
  if (!raw) return { value: null, hasValue: false };
  if (hasOwn(raw, 'value')) return { value: (raw as { value?: unknown }).value ?? null, hasValue: true };
  if (hasOwn(raw, 'val')) return { value: (raw as { val?: unknown }).val ?? null, hasValue: true };
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
export function normalizeStateEntry<T = unknown>(id: StateId, raw: AdapterStateValue<T> | CachedState<T> | NormalizedStateEntry<T> | undefined): NormalizedStateEntry<T> {
  const picked = pickRawValue(raw as AdapterStateValue | CachedState | NormalizedStateEntry | undefined);
  const rawObj = raw && typeof raw === 'object' ? (raw as AdapterStateValue<T> & CachedState<T> & NormalizedStateEntry<T>) : undefined;
  const out: NormalizedStateEntry<T> = {
    id,
    value: picked.hasValue ? (picked.value as T) : null,
    source: hasOwn(raw, 'val') ? 'api-state' : 'state-cache',
  };
  if (rawObj?.ack !== undefined) out.ack = rawObj.ack;
  if (rawObj?.ts !== undefined) out.ts = rawObj.ts;
  if (rawObj?.lc !== undefined) out.lc = rawObj.lc;
  const quality = rawObj?.q ?? rawObj?.quality;
  if (quality !== undefined) out.q = quality;
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
export function isStateValuePresent(entry: NormalizedStateEntry | undefined): boolean {
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
export function isStateFreshEnough(entry: NormalizedStateEntry | undefined, options: StateFreshnessOptions = {}): boolean {
  if (!isStateValuePresent(entry)) return false;
  const staleAfterMs = Math.max(0, Number(options.staleAfterMs ?? 0));
  if (staleAfterMs <= 0) return true;
  if (options.treatZeroAsFresh && Number(entry?.value) === 0) return true;
  const now = Number(options.nowMs ?? Date.now());
  const stamp = Number(entry?.ts ?? entry?.lc ?? 0);
  if (!Number.isFinite(stamp) || stamp <= 0) return false;
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
export function readFirstAvailableState<T = unknown>(cache: StateCache, keys: readonly string[], fallback: T | null = null): StateReadResult<T> {
  for (const key of keys) {
    const raw = cache[key] as AdapterStateValue<T> | CachedState<T> | undefined;
    const entry = normalizeStateEntry<T>(key as StateId, raw);
    if (isStateValuePresent(entry)) {
      return { value: entry.value, key, stateId: entry.id, found: true, source: 'cache' };
    }
  }
  return { value: fallback, key: null, stateId: null, found: fallback !== null, source: fallback === null ? 'missing' : 'fallback' };
}

/** Code-Teil: readCachedNumber. Zweck: Liest Zahlenwerte für spätere API-/State-Helfer robust aus dem Cache. */
export function readCachedNumber(cache: StateCache, key: string, fallback: number | null = null): number | null {
  const value = readFirstAvailableState(cache, [key], fallback).value;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Code-Teil: readCachedBoolean. Zweck: Liest boolesche Werte, ohne false als fehlend zu behandeln. */
export function readCachedBoolean(cache: StateCache, key: string, fallback = false): boolean {
  const value: unknown = readFirstAvailableState(cache, [key], fallback).value;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (['true', '1', 'on', 'yes', 'ja', 'an'].includes(v)) return true;
    if (['false', '0', 'off', 'no', 'nein', 'aus'].includes(v)) return false;
  }
  return fallback;
}

/** Code-Teil: readCachedString. Zweck: Liest Stringwerte und erhält auch leere Strings als bewusste Werte. */
export function readCachedString(cache: StateCache, key: string, fallback = ''): string {
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
export function buildApiStateResponse(input: BuildApiStateResponseInput) {
  const states: Record<string, NormalizedStateEntry | undefined> = {};
  const include = input.includeKeys;
  for (const [key, raw] of Object.entries(input.states)) {
    if (Array.isArray(include) && include.length && !include.includes(key)) continue;
    const entry = normalizeStateEntry(key, raw);
    if (isStateValuePresent(entry)) states[key] = entry;
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
export function createInfoConnectionUpdate(value: boolean, reason: InfoConnectionUpdate['reason'], ts: TimestampMs = Date.now() as TimestampMs): InfoConnectionUpdate {
  return { id: 'info.connection', value, ack: true, reason, ts };
}
