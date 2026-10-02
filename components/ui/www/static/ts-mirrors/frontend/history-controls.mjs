/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/frontend/history-controls.ts
 * Quell-Hash: sha256:3fce10c423bb24f457be9c9ff002e3e797ee108f011f872f0e10001e5d1e6957
 * Erzeugung: npm run sync:ts-frontend-mirrors
 *
 * Zweck:
 * Diese Datei ist ein browsernaher JavaScript-Modulspiegel der TypeScript-Quelle.
 * Diese Datei kann produktiv importiert werden, wenn der zugehörige Browsercode
 * bereits auf den jeweiligen TS-Helfer umgestellt wurde.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/frontend/*.ts vornehmen.
 * 2. npm run sync:ts-frontend-mirrors ausführen.
 * 3. npm run test:ts-frontend-mirrors prüfen.
 */
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Normalisiert Zustand und Bedienoptionen der Historien-Zeitraumsteuerung.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/frontend/history-controls.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Datei: src-ts/frontend/history-controls.ts
 *
 * Zweck:
 * Beschreibt erste Typen und reine Helfer für die spätere Migration der History-Toolbar.
 *
 * Zusammenhang:
 * In der mobilen History gab es Layout- und Sichtbarkeitsfehler. Diese Datei hält fest, welche
 * Aktionen sichtbar sein dürfen, ohne die produktive `www/history.js`-Runtime zu verändern.
 */
/**
 * Code-Teil: buildHistoryToolbarState
 *
 * Zweck:
 * Baut die spätere Sichtbarkeit von History-Aktionen typisiert auf.
 *
 * Zusammenhang:
 * Der wichtigste Fehlerfall ist EVCS: Ohne echte Wallbox darf im Kundenfrontend kein EVCS-PDF
 * angeboten werden. Diese Regel wird hier als vorbereiteter TS-Vertrag festgehalten.
 */
export function buildHistoryToolbarState(input) {
    return {
        mode: input.mode,
        actions: [
            { key: 'stack', label: 'Stapel', visible: true },
            { key: 'load', label: 'Laden', visible: input.canLoad },
            { key: 'evcsPdf', label: 'EVCS PDF', visible: input.hasEvcs },
            { key: 'tariffReport', label: 'Tarifnachweis', visible: input.hasTariff },
            { key: 'yearReport', label: 'Jahresreport', visible: true },
        ],
    };
}
