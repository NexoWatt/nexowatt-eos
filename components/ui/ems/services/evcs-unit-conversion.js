/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/services/evcs-unit-conversion.ts
 * Quell-Hash: sha256:fdc78695c9cbbceb6a08ef4ff76479cdcfb1b715a4542cc9a0901c93b7031548
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/evcs-unit-conversion.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Vereinheitlicht Ladeenergie- und Einheitenangaben, bevor sie bilanziert oder angezeigt werden.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/evcs-unit-conversion.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Normalisiert Ladepunkt-Messwerte in die internen NexoWatt-Einheiten.
 * - Momentanleistung bleibt intern W.
 * - Kumulierte Ladeenergie bleibt intern kWh.
 */
'use strict';
function finiteNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}
/**
 * Wandelt einen kumulierten Ladeenergie-Zähler in kWh um.
 * Technisch korrekt ist Wh -> kWh (Division durch 1000); Wh kann nicht direkt
 * in kW umgerechnet werden, weil kW eine Leistung und keine Energiemenge ist.
 */
function normalizeEvcsEnergyTotalKwh(value, options = {}) {
    const n = finiteNumber(value);
    if (n === null)
        return value;
    return options.inputIsWh === true ? (n / 1000) : n;
}
module.exports = {
    normalizeEvcsEnergyTotalKwh,
};
