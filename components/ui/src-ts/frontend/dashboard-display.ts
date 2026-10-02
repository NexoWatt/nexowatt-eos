/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Beschreibt und bereitet die Anzeigegrößen des Kunden-Dashboards auf.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/frontend/dashboard-display.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type { FeatureVisibilityState } from '../contracts/features';
import { formatPercentValue, formatPowerValue } from './display-format';

/**
 * Datei: src-ts/frontend/dashboard-display.ts
 *
 * Zweck:
 * Enthält erste Typen und reine Helfer für spätere Dashboard-Anzeige-Modelle.
 *
 * Zusammenhang:
 * Die produktive Datei `www/app.js` setzt Werte heute direkt in das DOM. Diese TypeScript-Datei
 * bereitet vor, dass wir später Wertelisten wie „Aktuelle Werte“ zuerst typisiert berechnen und
 * danach in HTML schreiben.
 *
 * Wichtig:
 * In 0.7.65 wird diese Datei noch nicht produktiv genutzt. Sie ist ein sicherer Migrationsschritt
 * ohne Runtime-Änderung.
 */

/** Eingabe für vorbereitete Dashboard-Wertemodelle. */
export interface DashboardValueInput {
  readonly visibility: FeatureVisibilityState;
  readonly pvW: number;
  readonly buildingLoadW: number;
  readonly gridImportW: number;
  readonly gridExportW: number;
  readonly batterySignedW: number;
  readonly batterySocPct: number | null;
  readonly evcsW: number;
}

/** Einzelne Anzeigezeile für die spätere rechte Karte „Aktuelle Werte“. */
export interface DashboardValueRow {
  readonly key: string;
  readonly label: string;
  readonly valueText: string;
  readonly visible: boolean;
}

/**
 * Code-Teil: buildDashboardValueRows
 *
 * Zweck:
 * Baut typisierte Dashboard-Wertezeilen aus bereits aufgelösten Rohwerten.
 *
 * Zusammenhang:
 * Diese Funktion bereitet die spätere Migration der rechten LIVE-Karte „Aktuelle Werte“ vor. Die
 * Feature-Sichtbarkeit entscheidet hier bereits, ob EVCS-Zeilen überhaupt erscheinen dürfen.
 *
 * Wichtig:
 * Diese Funktion löst keine Energieflüsse auf. Sie formatiert nur Werte, die vorher durch Resolver
 * oder Backend-States fachlich korrekt berechnet wurden.
 */
export function buildDashboardValueRows(input: DashboardValueInput): DashboardValueRow[] {
  return [
    { key: 'pv', label: 'PV Erzeugung', valueText: formatPowerValue(input.pvW).text, visible: true },
    { key: 'buildingLoad', label: 'Gebäudeverbrauch', valueText: formatPowerValue(input.buildingLoadW).text, visible: true },
    { key: 'gridImport', label: 'Netzbezug', valueText: formatPowerValue(input.gridImportW).text, visible: true },
    { key: 'gridExport', label: 'Netzeinspeisung', valueText: formatPowerValue(input.gridExportW).text, visible: true },
    { key: 'batteryPower', label: 'Batterie Leistung', valueText: formatPowerValue(input.batterySignedW).text, visible: true },
    { key: 'batterySoc', label: 'Batterie SoC', valueText: formatPercentValue(input.batterySocPct).text, visible: true },
    { key: 'evcs', label: 'Ladestation Leistung', valueText: formatPowerValue(input.evcsW).text, visible: input.visibility.hasEvcs },
  ];
}
