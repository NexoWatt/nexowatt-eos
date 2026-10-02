import type {
  HistoryApiResponse,
  HistoryFeatureVisibility,
  HistoryReportVisibility,
  HistorySeries,
  HistoryToolbarState,
} from '../contracts/history';

/**
 * Datei: src-ts/tests/history-runtime-typing-smoke.ts
 *
 * Zweck:
 * Compile-/Runtime-Smoke-Test für die neuen History-Typverträge.
 *
 * Zusammenhang:
 * Diese Datei prüft nicht die produktive `www/history.js`-Logik. Sie stellt sicher,
 * dass die Typverträge für History, Reports und Feature-Sichtbarkeit tatsächlich
 * verwendbar sind und spätere TS-Migrationen eine belastbare Grundlage haben.
 */

/**
 * Code-Teil: sampleSeries
 *
 * Zweck:
 * Beispiel-Zeitreihe mit einem gültigen 0-Wert. 0 darf nicht als „fehlend“ gelten,
 * weil sonst Speicher- und Netzverläufe verfälscht werden können.
 */
const sampleSeries: HistorySeries = {
  key: 'storage',
  label: 'Speicher Leistung',
  unit: 'W',
  points: [
    { ts: 1_700_000_000_000, value: 0, source: 'split', quality: 'measured' },
    { ts: 1_700_000_060_000, value: 1250, source: 'signed', quality: 'measured' },
  ],
  visibleByDefault: true,
};

/**
 * Code-Teil: apiResponse
 *
 * Zweck:
 * Minimal gültige History-API-Antwort. Sie dokumentiert die Verbindung zwischen
 * Backend-History-API und Frontend-Chart-Verarbeitung.
 */
const apiResponse: HistoryApiResponse = {
  start: 1_700_000_000_000,
  end: 1_700_000_060_000,
  series: {
    storage: sampleSeries.points,
  },
  extras: null,
};

/**
 * Code-Teil: featureVisibility
 *
 * Zweck:
 * Prüft die fachliche Regel, dass EVCS-Reports nur sichtbar sein dürfen, wenn echte
 * Ladepunkte vorhanden sind.
 */
const featureVisibility: HistoryFeatureVisibility = {
  hasEvcs: false,
  hasStorageFarm: false,
  hasTariff: true,
  hasWeather: true,
};

/**
 * Code-Teil: reportVisibility
 *
 * Zweck:
 * Beispiel für Report-Sichtbarkeit. `evcsPdf` ist hier false, weil keine echte
 * Wallbox vorhanden ist.
 */
const reportVisibility: HistoryReportVisibility = {
  evcsPdf: featureVisibility.hasEvcs,
  yearlyReport: true,
  tariffReport: featureVisibility.hasTariff,
  para14aReport: true,
};

/**
 * Code-Teil: toolbarState
 *
 * Zweck:
 * Beispiel-Zustand der mobilen/desktop History-Toolbar.
 */
const toolbarState: HistoryToolbarState = {
  range: 'day',
  from: '2026-06-14',
  to: '2026-06-14',
  stacked: false,
  loading: false,
  visibleActions: reportVisibility.evcsPdf ? ['load', 'evcsPdf'] : ['load'],
};

if (!apiResponse.series || !toolbarState.visibleActions.includes('load')) {
  throw new Error('History typing smoke failed');
}

console.log('[ts-history-runtime-typing] OK: History-Verträge sind verwendbar.');
