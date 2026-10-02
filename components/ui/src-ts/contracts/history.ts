/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Definiert den gemeinsamen TypeScript-Datenvertrag „history“, auf den sich die importierenden Bereiche beim Austausch ihrer Werte beziehen.
 * Daten und Wirkung: Verknüpft die unten sichtbaren Typen/Exporte mit ihren Importierenden. Die Gegenrichtung und die Originaldateien sind im Quellcode-Verzeichnis dokumentiert.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/contracts/history.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Datei: src-ts/contracts/history.ts
 *
 * Zweck:
 * Enthält die ersten typisierten Datenverträge für History, Diagramme, Reports und
 * featureabhängige History-Anzeigen. Diese Typen sind die fachliche Vorbereitung für
 * die spätere Migration von `www/history.js` nach TypeScript.
 *
 * Wichtig:
 * History darf keine andere Energiefluss-Semantik verwenden als LIVE-Dashboard,
 * Backend-Resolver und EMS-Module. Speicherwerte, 0-W-Werte, EVCS-Sichtbarkeit und
 * Speicherfarm-Sichtbarkeit müssen deshalb explizit beschrieben bleiben.
 */

/**
 * Code-Teil: HistoryRangePreset
 *
 * Zweck:
 * Beschreibt die erlaubten Zeitbereichs-Tasten der History-Oberfläche.
 *
 * Zusammenhang:
 * Diese Werte werden später aus Toolbar-Buttons, URL-Parametern und API-Abfragen
 * übernommen. Ein typisierter Wertebereich verhindert Tippfehler wie `monthh`.
 */
export type HistoryRangePreset = 'day' | 'week' | 'month' | 'year' | 'custom';

/**
 * Code-Teil: HistorySeriesKey
 *
 * Zweck:
 * Benennt die zentralen Energie-/Leistungsreihen im History-Diagramm.
 *
 * Zusammenhang:
 * Die Keys müssen mit Backend-/API-Namen und `www/app.js` übereinstimmen, damit LIVE
 * und History dieselben Werte anzeigen und keine historischen Ersatzwerte entstehen.
 */
export type HistorySeriesKey =
  | 'pv'
  | 'charge'
  | 'discharge'
  | 'buy'
  | 'sell'
  | 'load'
  | 'evcs'
  | 'soc'
  | 'price'
  | 'grid'
  | 'storage';

/**
 * Code-Teil: HistoryPoint
 *
 * Zweck:
 * Beschreibt einen einzelnen Messpunkt im History-Chart.
 *
 * Wichtig:
 * `value` darf 0 sein. 0 W oder 0 % ist ein gültiger Messwert und darf nicht als
 * „fehlt“ behandelt werden. Das ist besonders für Speicher und Netzwerte kritisch.
 */
export interface HistoryPoint {
  ts: number;
  value: number;
  source?: string;
  quality?: 'measured' | 'calculated' | 'unknown';
}

/**
 * Code-Teil: HistoryTuplePoint
 *
 * Zweck:
 * Legacy-Form vieler API-Antworten: `[timestamp, value]`.
 *
 * Zusammenhang:
 * `www/history.js` verarbeitet aktuell viele Arrays in genau dieser Form. Für die
 * spätere TS-Migration dokumentieren wir diese Übergangsform explizit.
 */
export type HistoryTuplePoint = [number | string | Date, number | string | null | undefined];

/**
 * Code-Teil: HistorySeries
 *
 * Zweck:
 * Beschreibt eine einzelne Zeitreihe samt Anzeige-Metadaten.
 *
 * Zusammenhang:
 * Diese Struktur ist die spätere gemeinsame Basis für Chart, Legende und Reports.
 */
export interface HistorySeries {
  key: string;
  label: string;
  unit: 'W' | 'kW' | 'Wh' | 'kWh' | '%' | 'EUR/kWh' | string;
  color?: string;
  points: HistoryPoint[];
  visibleByDefault?: boolean;
  feature?: 'evcs' | 'storageFarm' | 'weather' | 'tariff' | 'smartHome';
}

/**
 * Code-Teil: HistorySeriesMap
 *
 * Zweck:
 * Bildet die API-/Chart-Reihen als Dictionary ab.
 *
 * Wichtig:
 * Neue Reihen sollen später hier typisiert ergänzt werden, statt verstreut in
 * `history.js` ohne Vertrag aufzutauchen.
 */
export type HistorySeriesMap = Record<string, HistoryTuplePoint[] | HistoryPoint[] | undefined>;

/**
 * Code-Teil: HistoryExtras
 *
 * Zweck:
 * Beschreibt dynamische Zusatzreihen für Erzeuger, Verbraucher oder spätere Slots.
 *
 * Zusammenhang:
 * Das alte History-Frontend baut solche Reihen dynamisch. Dieser Vertrag hält fest,
 * dass Extras featureabhängig und optional sind.
 */
export interface HistoryExtras {
  producers?: Array<{ idx: number; name?: string; values?: HistoryTuplePoint[] }>;
  consumers?: Array<{ idx: number; name?: string; values?: HistoryTuplePoint[] }>;
  [key: string]: unknown;
}

/**
 * Code-Teil: HistoryApiResponse
 *
 * Zweck:
 * Beschreibt die grobe Antwort der History-API, die vom Browser geladen wird.
 *
 * Zusammenhang:
 * Diese Struktur verbindet `main.js`/History-API mit `www/history.js`.
 */
export interface HistoryApiResponse {
  start?: number;
  end?: number;
  series?: HistorySeriesMap;
  extras?: HistoryExtras | null;
  summary?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

/**
 * Code-Teil: HistoryFeatureVisibility
 *
 * Zweck:
 * Beschreibt, welche fachlichen History-Elemente sichtbar sein dürfen.
 *
 * Wichtig:
 * EVCS-PDF, EVCS-Legende und E-Mobilitätsreihen dürfen nur sichtbar sein, wenn eine
 * echte Wallbox vorhanden ist. Speicherfarm-Elemente dürfen nur bei echter Farm
 * erscheinen. Das war bereits eine Fehlerquelle und bleibt deshalb explizit typisiert.
 */
export interface HistoryFeatureVisibility {
  hasEvcs: boolean;
  hasStorageFarm: boolean;
  hasTariff: boolean;
  hasWeather: boolean;
}

/**
 * Code-Teil: HistoryToolbarState
 *
 * Zweck:
 * Beschreibt den Zustand der History-Bedienleiste.
 *
 * Zusammenhang:
 * Diese Struktur ist die spätere Grundlage, um Zeitraum, Datum und Report-Aktionen
 * aus dem DOM in eine testbare TS-Funktion auszulagern.
 */
export interface HistoryToolbarState {
  range: HistoryRangePreset;
  from: string;
  to: string;
  stacked: boolean;
  loading: boolean;
  visibleActions: string[];
}

/**
 * Code-Teil: HistoryChartViewport
 *
 * Zweck:
 * Beschreibt die berechnete Zeichenfläche des Canvas-Charts.
 *
 * Zusammenhang:
 * Späterer Ersatz für verstreute Canvas-Margin-Berechnungen in `www/history.js`.
 */
export interface HistoryChartViewport {
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Code-Teil: HistoryReportVisibility
 *
 * Zweck:
 * Beschreibt, welche Report-Buttons sichtbar sein dürfen.
 *
 * Wichtig:
 * `evcsPdf` darf nur true sein, wenn `hasEvcs` wirklich true ist.
 */
export interface HistoryReportVisibility {
  evcsPdf: boolean;
  yearlyReport: boolean;
  tariffReport: boolean;
  para14aReport: boolean;
}
