/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Kapselt die typisierten Hilfsschritte zum Aufbau der Zustandsantwort im Adapter-Kern.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/backend/main-helpers/api-state-main.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type { AdapterStateValue, CachedState, StateCache } from '../../contracts/iobroker-states';
import type { StateId, TimestampMs } from '../../contracts/units';
import { getStateTimestamp, getStateValue, hasExplicitStateValue } from '../state-cache/state-cache';

/**
 * Datei: src-ts/backend/main-helpers/api-state-main.ts
 *
 * Zweck:
 * Erster TypeScript-Helfer für den späteren Aufbau der `/api/state`-Antwort aus `main.js`.
 *
 * Zusammenhang:
 * Das Kundenfrontend, History, SmartHome und KI lesen `/api/state`. Jede Änderung an dieser
 * Antwortstruktur wirkt sich direkt auf die VIS aus. Deshalb wird die Struktur hier schrittweise
 * typisiert, bevor `main.js` produktiv umgestellt wird.
 */

/** Öffentlicher State-Eintrag, wie `/api/state` ihn später typisiert liefern kann. */
export interface MainApiStateEntry<T = unknown> {
  readonly value: T | null;
  readonly ts?: TimestampMs;
  readonly lc?: TimestampMs;
  readonly ack?: boolean;
  readonly q?: number;
}

/** Antwortform für eine kleine, kontrollierte `/api/state`-Helferschicht. */
export interface MainApiStateResponse {
  readonly generatedAt: TimestampMs;
  readonly states: Record<string, MainApiStateEntry | undefined>;
}

/**
 * Code-Teil: toMainApiStateEntry
 *
 * Zweck:
 * Wandelt einen Cache-Eintrag in ein API-fähiges Objekt um.
 *
 * Wichtig:
 * `0` und `false` werden übernommen. Nur wirklich fehlende Werte erzeugen `undefined`.
 */
export function toMainApiStateEntry<T = unknown>(raw: AdapterStateValue<T> | CachedState<T> | undefined): MainApiStateEntry<T> | undefined {
  if (!hasExplicitStateValue(raw)) return undefined;
  const out: MainApiStateEntry<T> = {
    value: getStateValue<T>(raw, null),
  };
  const ts = getStateTimestamp(raw, null);
  if (ts !== null) (out as { ts?: TimestampMs }).ts = ts;
  if (raw && typeof raw === 'object' && typeof (raw as { lc?: unknown }).lc === 'number') (out as { lc?: TimestampMs }).lc = (raw as { lc: TimestampMs }).lc;
  if (raw && typeof raw === 'object' && typeof (raw as { ack?: unknown }).ack === 'boolean') (out as { ack?: boolean }).ack = (raw as { ack: boolean }).ack;
  const q = raw && typeof raw === 'object' ? Number((raw as { q?: unknown; quality?: unknown }).q ?? (raw as { quality?: unknown }).quality) : NaN;
  if (Number.isFinite(q)) (out as { q?: number }).q = q;
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
export function buildMainApiStateResponse(cache: StateCache, includeKeys?: readonly StateId[], generatedAt: TimestampMs = Date.now() as TimestampMs): MainApiStateResponse {
  const states: Record<string, MainApiStateEntry | undefined> = {};
  const keys = includeKeys && includeKeys.length ? includeKeys : Object.keys(cache);
  for (const key of keys) {
    const entry = toMainApiStateEntry(cache[key] as AdapterStateValue | CachedState | undefined);
    if (entry !== undefined) states[key] = entry;
  }
  return { generatedAt, states };
}
