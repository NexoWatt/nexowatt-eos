'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/backend/main-helpers/info-connection-main.ts
 * Quell-Hash: sha256:a3652a90100177bc2ccdcaec59eab3ce70a6bdddd57b9794baeb36246ad601fb
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildMainInfoConnectionPlan = buildMainInfoConnectionPlan;
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Kapselt die Berechnung des Adapter-Verbindungsstatus für den Adapter-Kern.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/backend/main-helpers/info-connection-main.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
const connection_state_1 = require("../connection/connection-state");
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
function buildMainInfoConnectionPlan(reason, ts = Date.now()) {
    const decision = (0, connection_state_1.decideConnectionState)(reason);
    return {
        id: 'info.connection',
        value: decision.connected,
        ack: true,
        reason: decision.reason,
        message: decision.message,
        ts,
    };
}
