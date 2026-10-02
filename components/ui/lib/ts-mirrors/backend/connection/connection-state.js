'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/backend/connection/connection-state.ts
 * Quell-Hash: sha256:eb01df8ac56dc5d063e24515ae5fa707d45b899550d26354b12f8a3069b1a0eb
 * Erzeugung: npm run sync:ts-backend-mirrors
 *
 * Zweck:
 * Diese Datei ist ein CommonJS-Spiegel einer backendnahen TypeScript-Quelle.
 * Sie wird in 0.7.68 noch nicht von main.js genutzt, legt aber die spätere
 * sichere Migration für StateCache, Lizenz und Feature-Sichtbarkeit fest.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in den passenden Dateien unter src-ts/backend/ vornehmen.
 * 2. npm run sync:ts-backend-mirrors ausführen.
 * 3. npm run test:backend-mirrors prüfen.
 */
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.decideConnectionState = decideConnectionState;
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
function decideConnectionState(reason) {
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
