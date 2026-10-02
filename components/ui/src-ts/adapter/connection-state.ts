/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Leitet einen konsistenten Verbindungsstatus aus dem bereitgestellten Laufzeit-/Serverzustand ab.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/adapter/connection-state.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type { StateWritePlan } from '../contracts/api';

/**
 * Datei: src-ts/adapter/connection-state.ts
 *
 * Zweck:
 * TypeScript-Vorbereitung für den State `info.connection`.
 *
 * Zusammenhang:
 * `info.connection` darf nur den echten Webserverstatus widerspiegeln. Diese Datei hält
 * die spätere zentrale Schreibregel fest.
 */

export type ConnectionReason = 'webserver-started' | 'heartbeat' | 'webserver-error' | 'unload' | 'startup-failed';

/**
 * Code-Teil: buildInfoConnectionWritePlan
 *
 * Zweck:
 * Baut einen eindeutigen Schreibplan für `info.connection`.
 */
export function buildInfoConnectionWritePlan(online: boolean, reason: ConnectionReason): StateWritePlan<boolean> {
  return { stateId: 'info.connection', value: online, ack: true, reason };
}
