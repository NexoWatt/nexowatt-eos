/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Definiert den gemeinsamen TypeScript-Datenvertrag „api-state“, auf den sich die importierenden Bereiche beim Austausch ihrer Werte beziehen.
 * Daten und Wirkung: Verknüpft die unten sichtbaren Typen/Exporte mit ihren Importierenden. Die Gegenrichtung und die Originaldateien sind im Quellcode-Verzeichnis dokumentiert.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/contracts/api-state.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type { StateId, TimestampMs } from './units';
import type { AdapterStateValue } from './iobroker-states';

/**
 * Datei: src-ts/contracts/api-state.ts
 *
 * Zweck:
 * TypeScript-Verträge für die Backend-API-Schicht, die aktuell noch in `main.js`
 * umgesetzt ist. Diese Datei beschreibt die Datenformen, bevor wir die API-Helfer
 * später Stück für Stück aus JavaScript nach TypeScript auslagern.
 *
 * Zusammenhang:
 * - `main.js` erzeugt `/api/state`, `/config`, `/api/set` und SSE-Events.
 * - `www/app.js`, `www/history.js`, `www/smarthome.js` und weitere Frontend-Dateien
 *   lesen diese Antworten.
 * - EMS-Module schreiben States, die über diese API wieder im Frontend erscheinen.
 *
 * Wichtig für spätere Migration:
 * 0, false und leere Strings können gültige Werte sein. Nur `null`/`undefined`
 * bedeuten „nicht vorhanden“. Diese Regel schützt Speicher-, Netz-, Heizstab- und
 * Lizenzwerte vor falschen Fallbacks.
 */

/** Quelle eines normalisierten API-State-Eintrags. */
export type ApiStateSource = 'state-cache' | 'adapter-state' | 'runtime' | 'config' | 'fallback' | 'missing';

/** Werte, die über `/api/state` grundsätzlich transportiert werden dürfen. */
export type ApiStatePayloadValue = string | number | boolean | null | Record<string, unknown> | unknown[];

/**
 * Datenvertrag: NormalizedApiStateEntry
 *
 * Zweck:
 * Einheitliche Form eines State-Werts, nachdem verschiedene ioBroker-/Cache-Formate
 * auf eine API-taugliche Form gebracht wurden.
 *
 * Wichtig:
 * `value: 0` ist gültig und darf nicht mit „fehlt“ verwechselt werden.
 */
export interface NormalizedApiStateEntry<T = ApiStatePayloadValue> {
  id: StateId;
  value: T | null;
  ack?: boolean;
  ts?: TimestampMs;
  lc?: TimestampMs;
  q?: number;
  source: ApiStateSource;
}

/** Typisierte Map für die Werte, die später in `/api/state` laufen. */
export type NormalizedApiStateMap = Record<string, NormalizedApiStateEntry | undefined>;

/**
 * Datenvertrag: ApiStateEnvelope
 *
 * Zweck:
 * Beschreibt die spätere `/api/state`-Antwort inklusive Diagnoseinformationen.
 * Aktuell ist die produktive API noch JavaScript; dieser Vertrag bereitet die
 * sichere TypeScript-Migration vor.
 */
export interface ApiStateEnvelope {
  generatedAt: TimestampMs;
  states: NormalizedApiStateMap;
  features?: import('./features').FeatureVisibilityState;
  license?: import('./license').LicenseState;
  ok?: boolean;
  diagnostics?: {
    stateCount: number;
    missingCount: number;
    requestedKeys?: readonly string[] | undefined;
  };
}



/**
 * Datenvertrag: ApiSetRequest
 *
 * Zweck:
 * Beschreibt einen später typisierten Schreibaufruf an `/api/set`.
 *
 * Zusammenhang:
 * Einstellungen, App-Center, Lizenzseite und SmartHome-Steuerung schreiben über
 * API-Endpunkte in Adapter-States. Dieser Vertrag hält scope/key/value stabil.
 */
export interface ApiSetRequest {
  readonly scope: string;
  readonly key: string;
  readonly value: ApiStatePayloadValue;
}

/** SSE-Ereignisform, die Frontend-Live-Aktualisierungen später typisiert beschreibt. */
export interface ApiServerSentEvent {
  readonly type: 'state' | 'config' | 'connection' | 'heartbeat' | 'error';
  readonly ts: TimestampMs;
  readonly payload?: Record<string, unknown>;
}

/**
 * Typalias: RawAdapterStateLike
 *
 * Zweck:
 * Zulässige Rohformen aus dem bisherigen JavaScript-Code. Manche Stellen nutzen
 * `val`, andere `value`. Der spätere TypeScript-Helfer normalisiert diese Varianten.
 */
export type RawAdapterStateLike<T = unknown> = AdapterStateValue<T> | NormalizedApiStateEntry<T> | T | null | undefined;

