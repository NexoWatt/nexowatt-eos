/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Formatiert produktive LIVE-Dashboard-Werte mit einheitlichen Zahlen- und Einheitenregeln.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/frontend/live-dashboard-format.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Datei: src-ts/frontend/live-dashboard-format.ts
 *
 * Zweck:
 * Produktive TypeScript-Helfer für die Anzeigeformatierung im Kunden-LIVE-Dashboard.
 * Diese Datei bildet die alten JavaScript-Formatter aus `www/app.js` kompatibel nach,
 * damit wir diese kleinen Anzeigehelfer wirklich aus TypeScript nutzen können.
 *
 * Zusammenhang:
 * - Quelle: TypeScript
 * - Browser-Spiegel: `www/static/ts-mirrors/frontend/live-dashboard-format.mjs`
 * - Produktive Nutzung: `www/app.js` lädt den Spiegel per dynamischem Import.
 *
 * Wichtig:
 * Die Rückgabetexte bleiben bewusst kompatibel mit den bisherigen JS-Funktionen:
 * `--`, `W`, `kW`, `kWh`, `MWh`, `GWh`. Dadurch verändert sich keine fachliche
 * Anzeige, während die Logik bereits aus TypeScript kommt.
 */

/** Leistungseinheit aus den Kundeneinstellungen des LIVE-Dashboards. */
export type LiveDashboardPowerUnit = 'W' | 'kW' | string;

/**
 * Code-Teil: normalizeDashboardNumber
 *
 * Zweck:
 * Normalisiert unbekannte API-/Statewerte für die Dashboard-Anzeige.
 *
 * Wichtig:
 * `0` ist ein gültiger Wert und bleibt `0`. Nur `null`, `undefined`, leerer String
 * oder nicht-numerische Werte werden als fehlend behandelt.
 */
export function normalizeDashboardNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Code-Teil: formatDashboardPower
 *
 * Zweck:
 * Ersetzt produktiv die alte `formatPower`-Logik aus `www/app.js`.
 *
 * Zusammenhang:
 * Das LIVE-Dashboard zeigt PV, Netz, Speicher, Gebäude-Last und weitere Leistungswerte
 * über diese Funktion. Die alte `units.power`-Einstellung bleibt erhalten.
 */
export function formatDashboardPower(value: unknown, unit: LiveDashboardPowerUnit = 'W'): string {
  const n = normalizeDashboardNumber(value);
  if (n === null) return '--';
  if (unit === 'kW') return `${(n / 1000).toFixed(2)} kW`;
  return `${n.toFixed(0)} W`;
}

/**
 * Code-Teil: formatDashboardPowerSigned
 *
 * Zweck:
 * Produktiver TS-Ersatz für die signierte Leistungsanzeige im Dashboard.
 *
 * Zusammenhang:
 * Diese Funktion wird u. a. bei optionalen Flussknoten/Verbrauchern verwendet, wo
 * positive und negative Werte bewusst mit Vorzeichen sichtbar sein sollen.
 */
export function formatDashboardPowerSigned(value: unknown, unit: LiveDashboardPowerUnit = 'W'): string {
  const n = normalizeDashboardNumber(value);
  if (n === null) return '--';
  const sign = n > 0 ? '+' : (n < 0 ? '-' : '');
  const abs = Math.abs(n);
  if (unit === 'kW') return `${sign}${(abs / 1000).toFixed(2)} kW`;
  return `${sign}${abs.toFixed(0)} W`;
}

/**
 * Code-Teil: formatDashboardEnergyKwh
 *
 * Zweck:
 * Produktiver TS-Ersatz für die alte `formatEnergyKwh`-Logik.
 *
 * Zusammenhang:
 * KPI-Kacheln und History-Links zeigen Tages-/Gesamtenergie. Die Stufen bleiben
 * kompatibel: kWh, MWh, GWh.
 */
export function formatDashboardEnergyKwh(value: unknown): string {
  const n = normalizeDashboardNumber(value);
  if (n === null) return '--';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} GWh`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(2)} MWh`;
  return `${n.toFixed(2)} kWh`;
}

/**
 * Code-Teil: formatDashboardFlowPower
 *
 * Zweck:
 * Produktiver TS-Ersatz für die Energiefluss-Monitor-Anzeige. Eingabe bleibt Watt,
 * Anzeige erfolgt stabil in kW.
 */
export function formatDashboardFlowPower(value: unknown, decimals = 1): string {
  const n = normalizeDashboardNumber(value);
  if (n === null) return '--';
  const dRaw = Number(decimals);
  const d = Number.isFinite(dRaw) ? Math.max(0, Math.min(4, Math.round(dRaw))) : 1;
  return `${(n / 1000).toFixed(d)} kW`;
}

/**
 * Code-Teil: runLiveDashboardFormatSmoke
 *
 * Zweck:
 * Kleiner Runtime-Smoke-Test für Browser-/Node-Checks.
 */
export function runLiveDashboardFormatSmoke(): boolean {
  return formatDashboardPower(0, 'W') === '0 W'
    && formatDashboardPower(1500, 'kW') === '1.50 kW'
    && formatDashboardPowerSigned(-120, 'W') === '-120 W'
    && formatDashboardEnergyKwh(1500) === '1.50 MWh'
    && formatDashboardFlowPower(1500, 1) === '1.5 kW';
}
