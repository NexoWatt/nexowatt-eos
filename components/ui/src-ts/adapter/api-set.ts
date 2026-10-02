/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Prüft und plant angeforderte Zustandsänderungen vor deren Übernahme durch den zuständigen Adapter-Schreibpfad.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/adapter/api-set.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type { ApiSetRequest, ApiSetResult, ApiValueKind, StateWritePlan } from '../contracts/api';
import type { StateId } from '../contracts/units';

/**
 * Datei: src-ts/adapter/api-set.ts
 *
 * Zweck:
 * TypeScript-Vorbereitung für `/api/set`-Schreibvorgänge.
 *
 * Zusammenhang:
 * Kundeneinstellungen und einfache Frontend-Schreibwerte laufen heute über `main.js`.
 * Diese Datei bereitet die spätere, testbare Normalisierung vor.
 */

export interface SettingDefinition {
  key: string;
  stateId: StateId;
  valueKind: ApiValueKind;
  min?: number;
  max?: number;
}

/** Code-Teil: normalizeBoolean. Zweck: String-/Number-Toggles in echte Booleans wandeln. */
function normalizeBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  const s = String(value ?? '').trim().toLowerCase();
  return ['true', '1', 'on', 'yes', 'ja', 'an'].includes(s);
}

/** Code-Teil: normalizeNumber. Zweck: Zahlenwerte mit Grenzen normalisieren. */
function normalizeNumber(value: unknown, def = 0, min?: number, max?: number): number {
  let n = Number(value);
  if (!Number.isFinite(n)) n = def;
  if (typeof min === 'number') n = Math.max(min, n);
  if (typeof max === 'number') n = Math.min(max, n);
  return Math.round(n * 1000) / 1000;
}

/**
 * Code-Teil: normalizeApiValue
 *
 * Zweck:
 * Wandelt API-Eingabewerte passend zum erwarteten Typ um.
 */
export function normalizeApiValue(value: unknown, kind: ApiValueKind, def: unknown = null, min?: number, max?: number): unknown {
  if (kind === 'boolean') return normalizeBoolean(value);
  if (kind === 'number') return normalizeNumber(value, Number(def ?? 0), min, max);
  if (kind === 'json') {
    if (typeof value === 'string') {
      try { return JSON.parse(value) as unknown; } catch (_err) { return def ?? null; }
    }
    return value ?? def ?? null;
  }
  if (kind === 'string') return String(value ?? def ?? '');
  return value ?? def ?? null;
}

/**
 * Code-Teil: buildSettingsWritePlan
 *
 * Zweck:
 * Erstellt einen typisierten Schreibplan für spätere `settings.*`-States.
 */
export function buildSettingsWritePlan(request: ApiSetRequest, definitions: readonly SettingDefinition[]): ApiSetResult & { plan?: StateWritePlan } {
  if (request.scope !== 'settings') return { ok: false, message: `Scope ${request.scope} ist kein settings-Schreibvorgang.` };
  const definition = definitions.find((item) => item.key === request.key);
  if (!definition) return { ok: false, message: `Unbekannte Einstellung: ${request.key}` };
  const normalizedValue = normalizeApiValue(request.value, definition.valueKind, null, definition.min, definition.max);
  return {
    ok: true,
    stateId: definition.stateId,
    normalizedValue,
    plan: { stateId: definition.stateId, value: normalizedValue, ack: false, reason: 'Kundeneinstellung aus Frontend-API' },
  };
}
