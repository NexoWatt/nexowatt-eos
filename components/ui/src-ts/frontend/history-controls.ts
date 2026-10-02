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

/** Aktiver History-Zeitraum. */
export type HistoryMode = 'day' | 'week' | 'month' | 'year';

/** Eingaben für die spätere History-Toolbar-Sichtbarkeit. */
export interface HistoryToolbarInput {
  readonly mode: HistoryMode;
  readonly hasEvcs: boolean;
  readonly hasTariff: boolean;
  readonly canLoad: boolean;
}

/** Einzelne vorbereitete Toolbar-Aktion. */
export interface HistoryToolbarAction {
  readonly key: string;
  readonly label: string;
  readonly visible: boolean;
}

/** Ergebnis der vorbereiteten History-Toolbar-Logik. */
export interface HistoryToolbarState {
  readonly mode: HistoryMode;
  readonly actions: ReadonlyArray<HistoryToolbarAction>;
}

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
export function buildHistoryToolbarState(input: HistoryToolbarInput): HistoryToolbarState {
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
