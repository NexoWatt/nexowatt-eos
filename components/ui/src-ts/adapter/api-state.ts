/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Bereitet die Wertehülle der Zustands-API für die konsumierenden Browserbereiche auf.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/adapter/api-state.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type { ApiStateBuildOptions, ApiStateEntry, ApiStateResponseV2 } from '../contracts/api';
import type { AdapterStateValue, CachedState, StateCache } from '../contracts/iobroker-states';
import type { StateId, TimestampMs } from '../contracts/units';
import { isStateValuePresent, normalizeStateEntry } from './state-cache';

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
export function toApiStateEntry<T = unknown>(id: StateId, raw: AdapterStateValue<T> | CachedState<T> | undefined): ApiStateEntry<T> | undefined {
  const entry = normalizeStateEntry<T>(id, raw);
  if (!isStateValuePresent(entry)) return undefined;
  const out: ApiStateEntry<T> = { value: entry.value };
  if (entry.ack !== undefined) out.ack = entry.ack;
  if (entry.ts !== undefined) out.ts = entry.ts;
  if (entry.lc !== undefined) out.lc = entry.lc;
  if (entry.q !== undefined) out.q = entry.q;
  return out;
}

/** Code-Teil: shouldExposeStateKey. Zweck: Bereitet spätere API-Filter für interne/öffentliche States vor. */
function shouldExposeStateKey(key: string, options: ApiStateBuildOptions): boolean {
  if (!Array.isArray(options.includeOnlyKeys) || options.includeOnlyKeys.length === 0) return true;
  return options.includeOnlyKeys.includes(key);
}

/**
 * Code-Teil: buildApiStateResponse
 *
 * Zweck:
 * Baut aus dem StateCache die typisierte Antwort für `/api/state`.
 */
export function buildApiStateResponse(cache: StateCache, options: ApiStateBuildOptions = {}): ApiStateResponseV2 {
  const states: ApiStateResponseV2['states'] = {};
  for (const [key, raw] of Object.entries(cache)) {
    if (!shouldExposeStateKey(key, options)) continue;
    const entry = toApiStateEntry(key as StateId, raw as AdapterStateValue | CachedState | undefined);
    if (entry !== undefined) states[key] = entry;
  }
  return { states, generatedAt: (options.generatedAt ?? Date.now()) as TimestampMs };
}
