/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Kapselt die State-Cache-Zugriffe des Adapter-Kerns mit den dafür vorgesehenen Datenverträgen.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/backend/main-helpers/state-cache-main.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type { CachedState, StateCache } from '../../contracts/iobroker-states';
import type { StateId, TimestampMs } from '../../contracts/units';
import { getStateTimestamp, getStateValue, hasExplicitStateValue, normalizeCachedState, readBooleanFromCache, readNumberFromCache, readStringFromCache } from '../state-cache/state-cache';

/**
 * Datei: src-ts/backend/main-helpers/state-cache-main.ts
 *
 * Zweck:
 * Erster echter TypeScript-Helferblock für die spätere Auslagerung von StateCache-Zugriffen
 * aus `main.js`.
 *
 * Zusammenhang:
 * `main.js` hält aktuell `this.stateCache` und viele Bereiche lesen daraus direkt. Diese
 * Datei definiert den kanonischen Zugriff für Zahlen, Booleans, Strings und rohe Cache-Einträge.
 *
 * Wichtig:
 * `0`, `false` und `''` können gültige Werte sein. Dieser Helfer darf solche Werte niemals
 * als fehlend behandeln, weil sonst Speicher-, EVCS-, Feature- und Lizenzlogik kippen kann.
 */

/** Beschreibt einen aus `main.js` gelesenen StateCache-Wert inklusive Diagnosequelle. */
export interface MainStateRead<T = unknown> {
  readonly key: StateId;
  readonly value: T | null;
  readonly found: boolean;
  readonly ts: TimestampMs | null;
  readonly source: 'state-cache' | 'fallback' | 'missing';
}

/**
 * Code-Teil: readMainStateValue
 *
 * Zweck:
 * Liest einen einzelnen StateCache-Eintrag so, wie `main.js` ihn später zentral lesen soll.
 *
 * Zusammenhang:
 * Das ist die Grundlage für `/api/state`, Feature-Sichtbarkeit und Diagnose. Wenn wir später
 * direkte Zugriffe wie `this.stateCache[key]?.value` ersetzen, soll diese Funktion die Regel
 * für fehlende und vorhandene Werte liefern.
 */
export function readMainStateValue<T = unknown>(cache: StateCache, key: StateId, fallback: T | null = null): MainStateRead<T> {
  const entry = cache[key] as CachedState<T> | undefined;
  if (hasExplicitStateValue(entry)) {
    return {
      key,
      value: getStateValue<T>(entry, fallback),
      found: true,
      ts: getStateTimestamp(entry, null),
      source: 'state-cache',
    };
  }

  return {
    key,
    value: fallback,
    found: fallback !== null,
    ts: null,
    source: fallback === null ? 'missing' : 'fallback',
  };
}

/**
 * Code-Teil: readMainNumber
 *
 * Zweck:
 * Liest Zahlen aus dem `main.js`-StateCache. `0` bleibt ein gültiger Zahlenwert.
 *
 * Zusammenhang:
 * Dieser Helfer ist besonders wichtig für Speicherleistung, Netzleistung, SoC und Budgets.
 */
export function readMainNumber(cache: StateCache, key: StateId, fallback: number | null = null): number | null {
  return readNumberFromCache(cache, key, fallback);
}

/**
 * Code-Teil: readMainBoolean
 *
 * Zweck:
 * Liest boolesche Werte aus dem StateCache. `false` ist ein gültiger Wert.
 *
 * Zusammenhang:
 * Wird später für Feature-Sichtbarkeit, KI-Kundenschalter, Wetter aktiv und ähnliche Flags genutzt.
 */
export function readMainBoolean(cache: StateCache, key: StateId, fallback = false): boolean {
  return readBooleanFromCache(cache, key, fallback);
}

/**
 * Code-Teil: readMainString
 *
 * Zweck:
 * Liest Strings aus dem StateCache und behält bewusst leere Strings als Wertform bei.
 */
export function readMainString(cache: StateCache, key: StateId, fallback = ''): string {
  return readStringFromCache(cache, key, fallback);
}

/**
 * Code-Teil: normalizeMainCacheEntry
 *
 * Zweck:
 * Erzeugt die einheitliche Cache-Darstellung für spätere `/api/state`- und SSE-Auslagerungen.
 */
export function normalizeMainCacheEntry<T = unknown>(cache: StateCache, key: StateId): CachedState<T> {
  return normalizeCachedState<T>(key, cache[key] as CachedState<T> | undefined);
}
