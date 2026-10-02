/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Leitet einen konsistenten Verbindungsstatus aus dem bereitgestellten Laufzeit-/Serverzustand ab.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/backend/connection/connection-state.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Datei: src-ts/backend/connection/connection-state.ts
 *
 * Zweck:
 * Bereitet die spätere TypeScript-Migration der `info.connection`-Logik aus `main.js` vor.
 *
 * Zusammenhang:
 * `info.connection` darf nur den echten Adapter-/Webserverstatus widerspiegeln. Optionale
 * Teilfehler nach dem Webserverstart dürfen die Verbindung nicht fälschlich offline setzen.
 */

export type ConnectionReason =
  | 'startup'
  | 'webserver-listening'
  | 'heartbeat'
  | 'partial-init-warning'
  | 'webserver-error'
  | 'webserver-closed'
  | 'unload'
  | 'startup-failed';

export interface ConnectionStateDecision {
  readonly connected: boolean;
  readonly reason: ConnectionReason;
  readonly message: string;
}

/**
 * Code-Teil: decideConnectionState
 *
 * Zweck:
 * Erzeugt eine fachliche Entscheidung für `info.connection`.
 *
 * Wichtig:
 * `partial-init-warning` bleibt online, wenn der Webserver bereits läuft. Genau dieser Fall war
 * früher kritisch, weil optionale Bereiche den Adapter fälschlich offline wirken lassen konnten.
 */
export function decideConnectionState(reason: ConnectionReason): ConnectionStateDecision {
  if (reason === 'webserver-listening' || reason === 'heartbeat' || reason === 'partial-init-warning') {
    return {
      connected: true,
      reason,
      message: reason === 'partial-init-warning'
        ? 'Webserver läuft; optionaler Teilbereich meldet Warnung.'
        : 'Webserver läuft und Adapter ist erreichbar.',
    };
  }

  if (reason === 'startup') {
    return { connected: false, reason, message: 'Adapter startet, Webserver ist noch nicht bereit.' };
  }

  return { connected: false, reason, message: 'Adapter-Webserver ist nicht verbunden oder wurde beendet.' };
}
