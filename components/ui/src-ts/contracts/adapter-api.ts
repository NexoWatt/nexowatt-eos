/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Definiert den gemeinsamen TypeScript-Datenvertrag „adapter-api“, auf den sich die importierenden Bereiche beim Austausch ihrer Werte beziehen.
 * Daten und Wirkung: Verknüpft die unten sichtbaren Typen/Exporte mit ihren Importierenden. Die Gegenrichtung und die Originaldateien sind im Quellcode-Verzeichnis dokumentiert.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/contracts/adapter-api.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type { AdapterStateValue, CachedState } from './iobroker-states';
import type { StateId, TimestampMs } from './units';

/**
 * Datei: src-ts/contracts/adapter-api.ts
 *
 * Zweck:
 * Erste TypeScript-Verträge für spätere Auslagerungen aus `main.js`.
 *
 * Zusammenhang:
 * Diese Verträge verbinden StateCache, `/api/state`, `/api/set` und `info.connection`.
 * Sie bleiben bewusst klein, damit die Migration schrittweise und ohne Runtime-Risiko läuft.
 */

export type AdapterStateSource = 'state-cache' | 'api-state' | 'derived' | 'unknown';

export type ConnectionStateReason =
  | 'server-started'
  | 'webserver-started'
  | 'heartbeat'
  | 'server-error'
  | 'webserver-error'
  | 'server-closed'
  | 'adapter-unload'
  | 'unload'
  | 'startup-error'
  | 'startup-failed';

export interface InfoConnectionUpdate {
  readonly id: 'info.connection';
  readonly value: boolean;
  readonly ack: true;
  readonly reason: ConnectionStateReason;
  readonly ts: TimestampMs;
}

export interface NormalizedStateEntry<T = unknown> {
  readonly id: StateId;
  value: T | null;
  ack?: boolean;
  ts?: TimestampMs;
  lc?: TimestampMs;
  q?: number;
  source: AdapterStateSource;
}

export type ApiStateInputValue<T = unknown> = AdapterStateValue<T> | CachedState<T> | NormalizedStateEntry<T> | undefined;

export interface BuildApiStateResponseInput {
  readonly states: Record<string, ApiStateInputValue>;
  readonly includeKeys?: readonly string[];
  readonly generatedAt?: TimestampMs;
}

export interface SettingsWriteRequest {
  readonly scope: 'settings';
  readonly key: string;
  readonly value: unknown;
  readonly source: 'frontend' | 'api' | 'unknown';
}

export interface NormalizedSettingsWrite {
  readonly stateId: StateId;
  readonly value: string | number | boolean;
  readonly ack: false;
  readonly diagnosticText: string;
}
