/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Bildet aus Cache-Einträgen die für API-Antworten benötigten Zustandsdaten.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/backend/state/api-state-cache.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type {
  ApiStateEnvelope,
  ApiStatePayloadValue,
  ApiStateSource,
  NormalizedApiStateEntry,
  RawAdapterStateLike,
} from '../../contracts/api-state';
import type { AdapterStateValue, CachedState, StateCache } from '../../contracts/iobroker-states';
import type { StateId, TimestampMs } from '../../contracts/units';
import { toNumberOrNull } from '../../utils/number';

/**
 * Datei: src-ts/backend/state/api-state-cache.ts
 *
 * Zweck:
 * TypeScript-Vorbereitung für die spätere Auslagerung der StateCache- und `/api/state`-
 * Logik aus `main.js`.
 *
 * Zusammenhang:
 * `main.js` hält aktuell einen großen `stateCache`, veröffentlicht Daten über `/api/state`
 * und verteilt Live-Updates per SSE. Frontend, History, SmartHome, KI-Berater und
 * EMS-Status hängen an diesen Daten.
 *
 * Wichtig:
 * Diese Datei ist in 0.7.63 noch nicht produktiv verdrahtet. Sie definiert aber bereits
 * die Regeln, damit die spätere Migration nicht wieder 0-Werte, false oder leere Werte
 * fälschlich als „fehlend“ interpretiert.
 */

/**
 * Code-Teil: hasOwn
 *
 * Zweck:
 * Sichere Prüfung auf eigene Objektfelder.
 *
 * Zusammenhang:
 * ioBroker-State-Objekte können sowohl `val` als auch `value` enthalten. Mit dieser
 * Prüfung vermeiden wir, dass geerbte Felder oder Prototypen versehentlich als Wertquelle
 * genutzt werden.
 */
function hasOwn(objectValue: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(objectValue, key);
}

/**
 * Code-Teil: isObjectRecord
 *
 * Zweck:
 * Unterscheidet echte Objektwerte von `null`, Arrays und primitiven Werten.
 *
 * Zusammenhang:
 * Diese Prüfung ist die Grundlage für die Normalisierung verschiedener State-Formen aus
 * JavaScript, ioBroker und zukünftigen TypeScript-Helfern.
 */
function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Code-Teil: extractPayloadValue
 *
 * Zweck:
 * Holt aus verschiedenen Rohformen den fachlichen Nutzwert heraus.
 *
 * Priorität:
 * 1. Feld `value`, wenn vorhanden.
 * 2. Feld `val`, wenn vorhanden.
 * 3. Rohwert selbst, wenn es kein State-Objekt ist.
 *
 * Wichtig:
 * `0`, `false` und `''` bleiben gültige Werte. Nur `undefined` wird zu `null`.
 */
export function extractPayloadValue(raw: RawAdapterStateLike): ApiStatePayloadValue {
  if (raw === undefined || raw === null) return null;
  if (isObjectRecord(raw)) {
    if (hasOwn(raw, 'value')) return (raw.value === undefined ? null : raw.value) as ApiStatePayloadValue;
    if (hasOwn(raw, 'val')) return (raw.val === undefined ? null : raw.val) as ApiStatePayloadValue;
  }
  return raw as ApiStatePayloadValue;
}

/**
 * Code-Teil: extractTimestamp
 *
 * Zweck:
 * Liest Zeitstempel aus bekannten ioBroker-/Cache-Feldern.
 *
 * Zusammenhang:
 * Zeitstempel werden später für Stale-Prüfungen genutzt. Diese Funktion macht die
 * Felder `ts` und `lc` einheitlich auswertbar, ohne 0-Werte des eigentlichen States zu
 * berühren.
 */
function extractTimestamp(raw: RawAdapterStateLike, field: 'ts' | 'lc'): TimestampMs | undefined {
  if (!isObjectRecord(raw) || !hasOwn(raw, field)) return undefined;
  const n = toNumberOrNull(raw[field]);
  return n === null ? undefined : n;
}

/**
 * Code-Teil: normalizeApiStateEntry
 *
 * Zweck:
 * Normalisiert einen beliebigen State-Rohwert auf den Typ `NormalizedApiStateEntry`.
 *
 * Zusammenhang:
 * Diese Funktion ist der spätere Kandidat für die zentrale State-Serialisierung in
 * `main.js`. Sie schützt kritische Bereiche wie Energiefluss, Heizstab und Lizenz, weil
 * gültige Null-/False-Werte nicht verloren gehen.
 */
export function normalizeApiStateEntry(
  id: StateId,
  raw: RawAdapterStateLike,
  source: ApiStateSource = 'state-cache',
): NormalizedApiStateEntry {
  const base: NormalizedApiStateEntry = {
    id,
    value: extractPayloadValue(raw),
    source,
  };

  const optional: Partial<Pick<NormalizedApiStateEntry, 'ts' | 'lc' | 'ack' | 'q'>> = {};
  const ts = extractTimestamp(raw, 'ts');
  const lc = extractTimestamp(raw, 'lc');
  if (ts !== undefined) optional.ts = ts;
  if (lc !== undefined) optional.lc = lc;

  if (isObjectRecord(raw)) {
    if (hasOwn(raw, 'ack')) optional.ack = Boolean(raw.ack);
    if (hasOwn(raw, 'q')) {
      const q = toNumberOrNull(raw.q);
      if (q !== null) optional.q = q;
    }
  }

  return { ...base, ...optional };
}

/**
 * Code-Teil: readCacheEntry
 *
 * Zweck:
 * Liest einen State aus dem typisierten Cache und gibt eine normalisierte API-Form
 * zurück.
 *
 * Zusammenhang:
 * Später kann `main.js` damit `/api/state` aufbauen, ohne an vielen Stellen eigene
 * `val`/`value`-Sonderlogik zu duplizieren.
 */
export function readCacheEntry(cache: StateCache, key: StateId): NormalizedApiStateEntry {
  const raw = cache[key] as CachedState | AdapterStateValue | undefined;
  if (raw === undefined) {
    return { id: key, value: null, source: 'missing' };
  }
  return normalizeApiStateEntry(key, raw, 'state-cache');
}

/**
 * Code-Teil: isFreshEnough
 *
 * Zweck:
 * Prüft optional, ob ein State-Zeitstempel innerhalb einer erwarteten Frischegrenze liegt.
 *
 * Wichtig:
 * Diese Funktion bewertet nur den Zeitstempel. Sie darf niemals den fachlichen Wert
 * `0` als fehlend betrachten. Gerade Speicher-DPs stehen oft lange korrekt auf 0 W.
 */
export function isFreshEnough(entry: NormalizedApiStateEntry, maxAgeMs: number, nowMs: TimestampMs): boolean {
  const stamp = entry.ts ?? entry.lc;
  if (stamp === undefined || maxAgeMs <= 0) return true;
  return nowMs - stamp <= maxAgeMs;
}

/**
 * Code-Teil: buildApiStateEnvelope
 *
 * Zweck:
 * Baut eine typisierte `/api/state`-Momentaufnahme aus einem StateCache.
 *
 * Zusammenhang:
 * Dieses Modell ist der spätere sichere Ersatz für manuelle Response-Zusammenstellungen
 * in `main.js`. Frontend und History bekommen dadurch eine konsistente State-Form.
 */
export function buildApiStateEnvelope(cache: StateCache, requestedKeys?: readonly StateId[], nowMs: TimestampMs = Date.now()): ApiStateEnvelope {
  const keys = requestedKeys && requestedKeys.length ? requestedKeys : Object.keys(cache);
  const states: ApiStateEnvelope['states'] = {};
  let missingCount = 0;

  for (const key of keys) {
    const entry = readCacheEntry(cache, key);
    states[key] = entry;
    if (entry.source === 'missing') missingCount += 1;
  }

  const diagnostics: NonNullable<ApiStateEnvelope['diagnostics']> = {
    stateCount: keys.length,
    missingCount,
    ...(requestedKeys ? { requestedKeys: [...requestedKeys] } : {}),
  };

  return {
    generatedAt: nowMs,
    states,
    diagnostics,
  };
}
