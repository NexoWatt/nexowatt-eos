/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Normalisiert Zugriffe auf gespeicherte ioBroker-Werte und unterscheidet fehlende Werte von gültigen Null-/False-Werten.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/backend/state-cache/state-cache.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type { AdapterStateValue, CachedState, StateCache } from '../../contracts/iobroker-states';
import type { StateId, TimestampMs } from '../../contracts/units';

/**
 * Datei: src-ts/backend/state-cache/state-cache.ts
 *
 * Zweck:
 * Reine TypeScript-Helfer für den späteren Umbau der StateCache-Logik aus `main.js`.
 *
 * Zusammenhang:
 * `main.js` sammelt ioBroker-States und liefert sie über `/api/state`, SSE, History und
 * EMS-Module weiter. Diese Helfer definieren, wie Rohwerte wie `value`, `val`, `ts`, `lc`
 * und `ack` später einheitlich verarbeitet werden.
 *
 * Wichtig:
 * 0, false und leere Strings können gültige Werte sein. Diese Datei darf solche Werte nicht
 * per Wahrheitstest (`if (value)`) verlieren, weil sonst Speicher-, History- und Feature-
 * Sichtbarkeitsfehler entstehen können.
 */

export type CacheEntry<T = unknown> = CachedState<T> | AdapterStateValue<T> | undefined;

/**
 * Code-Teil: getStateValue
 *
 * Zweck:
 * Liest aus einem Cache-Eintrag den fachlichen Wert. `value` hat Vorrang, `val` ist der
 * Legacy-Fallback aus ioBroker-State-Objekten.
 *
 * Kritische Regel:
 * `0` und `false` sind gültig. Deshalb wird bewusst auf Property-Vorhandensein geprüft und
 * nicht auf Wahrheit des Werts.
 */
export function getStateValue<T = unknown>(entry: CacheEntry<T>, fallback: T | null = null): T | null {
  if (!entry || typeof entry !== 'object') return fallback;
  if (Object.prototype.hasOwnProperty.call(entry, 'value')) return (entry as CachedState<T>).value ?? fallback;
  if (Object.prototype.hasOwnProperty.call(entry, 'val')) return (entry as AdapterStateValue<T>).val ?? fallback;
  return fallback;
}

/**
 * Code-Teil: getStateTimestamp
 *
 * Zweck:
 * Holt den besten verfügbaren Zeitstempel aus `ts` oder `lc`.
 *
 * Zusammenhang:
 * Diese Information wird später für Diagnose und Aktualitätsanzeigen gebraucht. Sie darf aber
 * nicht allein entscheiden, ob ein konfigurierter Speicher-DP mit 0 W ungültig ist.
 */
export function getStateTimestamp(entry: CacheEntry, fallback: TimestampMs | null = null): TimestampMs | null {
  if (!entry || typeof entry !== 'object') return fallback;
  const ts = Number((entry as { ts?: unknown }).ts);
  if (Number.isFinite(ts) && ts >= 0) return ts;
  const lc = Number((entry as { lc?: unknown }).lc);
  if (Number.isFinite(lc) && lc >= 0) return lc;
  return fallback;
}

/**
 * Code-Teil: hasExplicitStateValue
 *
 * Zweck:
 * Prüft, ob ein Cache-Eintrag wirklich einen Wert enthält.
 *
 * Wichtig:
 * Diese Funktion gibt für `0` und `false` true zurück. Genau diese Regel schützt Split-DPs,
 * signed DPs und Feature-Sichtbarkeiten vor falschen Fallbacks.
 */
export function hasExplicitStateValue(entry: CacheEntry): boolean {
  if (!entry || typeof entry !== 'object') return false;
  if (Object.prototype.hasOwnProperty.call(entry, 'value')) return (entry as CachedState).value !== null && (entry as CachedState).value !== undefined;
  if (Object.prototype.hasOwnProperty.call(entry, 'val')) return (entry as AdapterStateValue).val !== null && (entry as AdapterStateValue).val !== undefined;
  return false;
}

/**
 * Code-Teil: normalizeCachedState
 *
 * Zweck:
 * Wandelt unterschiedliche Rohformen in eine einheitliche Cache-Form.
 *
 * Zusammenhang:
 * Später kann `main.js` diese Form für `/api/state`, SSE, History und EMS-Module nutzen,
 * damit jeder Bereich dieselbe Interpretation von Werten sieht.
 */
export function normalizeCachedState<T = unknown>(id: StateId, entry: CacheEntry<T>): CachedState<T> {
  const result: CachedState<T> = { id, value: getStateValue<T>(entry, null) };
  const ts = getStateTimestamp(entry, null);
  if (ts !== null) result.ts = ts;
  if (entry && typeof entry === 'object' && typeof (entry as { ack?: unknown }).ack === 'boolean') result.ack = (entry as { ack: boolean }).ack;
  const q = entry && typeof entry === 'object' ? Number((entry as { q?: unknown; quality?: unknown }).q ?? (entry as { quality?: unknown }).quality) : NaN;
  if (Number.isFinite(q)) result.quality = q;
  return result;
}

/**
 * Code-Teil: readNumberFromCache
 *
 * Zweck:
 * Liest eine Zahl aus dem Cache. `0` wird als gültige Zahl zurückgegeben.
 */
export function readNumberFromCache(cache: StateCache, key: StateId, fallback: number | null = null): number | null {
  const raw = getStateValue(cache[key], null);
  if (raw === null || raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Code-Teil: readBooleanFromCache
 *
 * Zweck:
 * Liest Boolean-Werte aus echten Booleans, Zahlen oder typischen Textwerten.
 */
export function readBooleanFromCache(cache: StateCache, key: StateId, fallback = false): boolean {
  const raw = getStateValue(cache[key], null);
  if (raw === null || raw === undefined || raw === '') return fallback;
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw !== 0;
  const s = String(raw).trim().toLowerCase();
  if (['true', '1', 'yes', 'ja', 'on', 'an'].includes(s)) return true;
  if (['false', '0', 'no', 'nein', 'off', 'aus'].includes(s)) return false;
  return fallback;
}

/**
 * Code-Teil: readStringFromCache
 *
 * Zweck:
 * Liest einen String aus dem Cache und hält die Fallback-Regel zentral.
 */
export function readStringFromCache(cache: StateCache, key: StateId, fallback = ''): string {
  const raw = getStateValue(cache[key], null);
  if (raw === null || raw === undefined) return fallback;
  return String(raw);
}
