/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Definiert den gemeinsamen TypeScript-Datenvertrag „api“, auf den sich die importierenden Bereiche beim Austausch ihrer Werte beziehen.
 * Daten und Wirkung: Verknüpft die unten sichtbaren Typen/Exporte mit ihren Importierenden. Die Gegenrichtung und die Originaldateien sind im Quellcode-Verzeichnis dokumentiert.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/contracts/api.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type { AdapterStateValue } from './iobroker-states';
import type { StateId, TimestampMs } from './units';

/**
 * Datei: src-ts/contracts/api.ts
 *
 * Zweck:
 * Beschreibt die ersten TypeScript-Verträge für die Adapter-HTTP-API.
 * Diese Verträge sind in 0.7.63 noch nicht produktiv verdrahtet. Sie dienen als
 * Vorlage für die spätere Migration von `/api/state`, `/api/set`, `info.connection`
 * und ähnlichen main.js-Bereichen.
 *
 * Zusammenhang:
 * - `main.js` stellt die API-Endpunkte bereit.
 * - `www/app.js`, `www/history.js`, `www/smarthome.js` und weitere Frontend-Dateien
 *   lesen diese Endpunkte.
 * - EMS-Module schreiben States, die über die API sichtbar werden.
 *
 * Wichtig für TypeScript:
 * API-Verträge müssen besonders stabil sein, weil Frontend und Backend dieselben
 * Feldnamen erwarten. Eine spätere Umstellung darf keine stillen Umbenennungen erzeugen.
 */

export type ApiScope = 'settings' | 'datapoints' | 'mapping' | 'license' | 'smarthome' | 'smartHome' | 'evcs' | 'storagefarm' | 'unknown';
export type ApiSetScope = ApiScope;
export type ApiValueKind = 'number' | 'boolean' | 'string' | 'json' | 'unknown';
export type ApiSetValueKind = ApiValueKind | 'auto';
export type ApiHttpStatus = 200 | 201 | 202 | 204 | 400 | 401 | 403 | 404 | 409 | 500;

/**
 * Datenvertrag: ApiSetRequest
 *
 * Zweck:
 * Beschreibt Schreibaufrufe aus Frontend/App-Center an `/api/set`.
 *
 * Wichtig:
 * `id` ist optional und nur für direkte State-Schreibungen gedacht. Standard ist
 * weiterhin die zusammengesetzte Form `scope.key`.
 */
export interface ApiSetRequest<T = unknown> {
  scope: ApiScope;
  key: string;
  id?: StateId;
  value: T;
  source?: 'frontend' | 'admin' | 'automation' | 'unknown';
  ack?: boolean;
}

export type ApiSetStateRequest<T = unknown> = ApiSetRequest<T>;

export interface ApiSetResult {
  ok: boolean;
  stateId?: StateId;
  normalizedValue?: unknown;
  message?: string;
}

export interface StateWritePlan<T = unknown> {
  stateId: StateId;
  value: T;
  ack: boolean;
  reason: string;
}

export interface ApiStateEntry<T = unknown> {
  value: T | null;
  ack?: boolean;
  ts?: TimestampMs;
  lc?: TimestampMs;
  q?: number;
}

export interface ApiStateBuildOptions {
  generatedAt?: TimestampMs;
  includeOnlyKeys?: readonly string[];
}

export interface ApiConnectionPayload {
  online: boolean;
  reason: string;
  changedAt: TimestampMs;
}

export interface ApiStatePayload {
  states: Record<StateId, AdapterStateValue | undefined>;
  generatedAt: TimestampMs;
  connection?: ApiConnectionPayload;
}

export interface ApiStateResponseV2 {
  states: Record<string, ApiStateEntry | undefined>;
  generatedAt: TimestampMs;
}

export interface ApiStateNormalizeOptions {
  generatedAt?: TimestampMs;
  includeValAlias?: boolean;
}

export interface NormalizedApiSetRequest<T = unknown> extends ApiSetRequest<T> {
  valueKind: ApiSetValueKind;
  normalizedValue: unknown;
}

export interface NormalizedStateWrite<T = unknown> {
  /** Direkte State-ID; ältere Hilfsdateien nutzen teils `id`. */
  id?: StateId;
  /** Standardisierte State-ID; neue Helfer nutzen `stateId`. */
  stateId?: StateId;
  value: T;
  ack: boolean;
  reason?: string;
  sourceScope?: string;
  sourceKey?: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type ApiEnvelope<T = unknown> =
  | { ok: true; status: ApiHttpStatus; data: T }
  | { ok: false; status: ApiHttpStatus; error: ApiErrorBody };

export interface ApiSetResponse {
  ok: boolean;
  scope: string;
  key: string;
  writtenStateId?: StateId;
  message?: string;
}


/**
 * Datenvertrag: ApiStateEnvelope
 * Zweck: Einheitliche /api/state-Hülle für spätere Backend-Helfer.
 */