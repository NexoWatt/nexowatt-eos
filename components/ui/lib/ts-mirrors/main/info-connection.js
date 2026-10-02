'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/main/info-connection.ts
 * Quell-Hash: sha256:651f6254f35e0d8394d74de35a75be5595ba19a63b00cd15945e323dd91fb109
 * Erzeugung: npm run sync:ts-main-helpers
 *
 * Zweck:
 * Diese Datei ist ein CommonJS-Spiegel eines echten TypeScript-Helfers für main.js.
 * main.js nutzt diese Helfer in 0.7.98 noch nicht produktiv; sie bilden die sichere
 * Grundlage für die spätere schrittweise Auslagerung.
 */
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Formuliert den Verbindungsstatus der Adapter-Schnittstelle unabhängig vom Zustand einzelner optionaler Geräte.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/main/info-connection.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Datei: src-ts/main/info-connection.ts
 *
 * Zweck:
 * Echte TypeScript-Helfer für die spätere zentrale Verwaltung von `info.connection`.
 *
 * Zusammenhang:
 * `info.connection` darf nicht von optionalen Teilfehlern überschrieben werden. Er muss den
 * echten Webserver-/Adapterstatus widerspiegeln.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildMainInfoConnectionWritePlan = buildMainInfoConnectionWritePlan;
/**
 * Code-Teil: buildMainInfoConnectionWritePlan
 *
 * Zweck:
 * Erstellt einen eindeutigen Schreibplan für `info.connection`.
 *
 * Wichtig:
 * `true` bedeutet: Webserver/Adapter ist wirklich online. `false` darf nur bei echten
 * Server-/Unload-/Startfehlern geschrieben werden.
 */
function buildMainInfoConnectionWritePlan(value, reason, ts = Date.now()) {
    return { stateId: 'info.connection', value, ack: true, reason, ts };
}
