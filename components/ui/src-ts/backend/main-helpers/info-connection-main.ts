/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Kapselt die Berechnung des Adapter-Verbindungsstatus für den Adapter-Kern.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/backend/main-helpers/info-connection-main.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import { decideConnectionState, type ConnectionReason } from '../connection/connection-state';
import type { TimestampMs } from '../../contracts/units';

/**
 * Datei: src-ts/backend/main-helpers/info-connection-main.ts
 *
 * Zweck:
 * Erster TypeScript-Helfer für die zentrale `info.connection`-Verwaltung aus `main.js`.
 *
 * Zusammenhang:
 * `info.connection` zeigt in ioBroker/Admin, ob Webserver/API/SSE wirklich erreichbar sind.
 * Optional fehlschlagende Teilbereiche dürfen den Adapter nicht offline erscheinen lassen.
 */

export interface MainInfoConnectionPlan {
  readonly id: 'info.connection';
  readonly value: boolean;
  readonly ack: true;
  readonly reason: ConnectionReason;
  readonly message: string;
  readonly ts: TimestampMs;
}

/**
 * Code-Teil: buildMainInfoConnectionPlan
 *
 * Zweck:
 * Baut einen typisierten Schreibplan für `info.connection`.
 *
 * Wichtig:
 * Der Helfer schreibt nicht selbst. Er gibt nur die Entscheidung zurück, damit `main.js` später
 * zentral und testbar setzen kann.
 */
export function buildMainInfoConnectionPlan(reason: ConnectionReason, ts: TimestampMs = Date.now() as TimestampMs): MainInfoConnectionPlan {
  const decision = decideConnectionState(reason);
  return {
    id: 'info.connection',
    value: decision.connected,
    ack: true,
    reason: decision.reason,
    message: decision.message,
    ts,
  };
}
