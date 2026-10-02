/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Prüft und normalisiert Kundeneinstellungen für ihre Übernahme in Adapter-States.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/adapter/settings-writes.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type { NormalizedSettingsWrite, SettingsWriteRequest } from '../contracts/adapter-api';

/**
 * Datei: src-ts/adapter/settings-writes.ts
 *
 * Zweck:
 * TypeScript-Vorbereitung für einfache Kundeneinstellungen aus `/api/set`.
 *
 * Zusammenhang:
 * Aktuell schreibt `main.js` viele Einstellungen direkt. Diese Datei dokumentiert, welche
 * Keys bewusst erlaubt sind und wie Werte normalisiert werden dürfen.
 */

export const CUSTOMER_SETTING_KEYS = [
  // KI-Berater: Anzeige, Optimierungsmodus, Komfort-/Ruhezeiten und Prioritäten.
  'aiAdvisorEnabled',
  'aiAdvisorMode',
  'aiAdvisorOptimizationMode',
  'aiAdvisorEvReadyBy',
  'aiAdvisorEvTargetSocPct',
  'aiAdvisorThermalReadyBy',
  'aiAdvisorComfortStart',
  'aiAdvisorComfortEnd',
  'aiAdvisorQuietHoursStart',
  'aiAdvisorQuietHoursEnd',
  'aiAdvisorPriorityStorage',
  'aiAdvisorPriorityEvcs',
  'aiAdvisorPriorityThermal',
  'aiAdvisorPriorityHeatingRod',
  'aiAdvisorPriorityGeneric',
  // Wetter-App: Kundenschalter und API-Zugang.
  'weatherEnabled',
  'weatherUsageMode',
  'weatherApiKey',
  'forecastSourceMode',
  'openMeteoTimezone',
  'pvForecastArrays',
  'openMeteoPvEnabled',
  'forecastFallbackToDatapoints',
  'openMeteoLatitude',
  'openMeteoLongitude',
  'forecastUpdateIntervalMin',
  'forecastHorizonHours',
  'pvForecastPlanningSafetyPct',
  'pvForecastInstalledKwp',
  'pvForecastTiltDeg',
  'pvForecastAzimuthDeg',
  'pvForecastLossPercent',
  'pvForecastInverterLimitW',
] as const;

export type CustomerSettingKey = (typeof CUSTOMER_SETTING_KEYS)[number];

/**
 * Migrationshinweis:
 * Diese Liste muss mit `settingsLocalKeys` in `main.js` konsistent bleiben.
 * Sobald `/api/set` produktiv auf diesen TS-Helfer umgestellt wird, darf kein
 * Kundeneinstellungs-Key fehlen, sonst schreibt das Frontend ins Leere.
 */

/** Code-Teil: isCustomerSettingKey. Zweck: Prüft, ob ein Frontend-Key bewusst erlaubt ist. */
export function isCustomerSettingKey(key: string): key is CustomerSettingKey {
  return (CUSTOMER_SETTING_KEYS as readonly string[]).includes(key);
}

/**
 * Code-Teil: normalizeSettingValue
 *
 * Zweck:
 * Normalisiert einfache Kundeneinstellungswerte, ohne false/0/'' falsch zu ersetzen.
 */
export function normalizeSettingValue(value: unknown): string | number | boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const raw = value.trim();
    const lower = raw.toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
    if (raw !== '' && /^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
    return raw;
  }
  return '';
}

/**
 * Code-Teil: normalizeSettingsWrite
 *
 * Zweck:
 * Baut aus einem Frontend-Schreibwunsch einen späteren `settings.*`-Schreibplan.
 */
export function normalizeSettingsWrite(request: SettingsWriteRequest): NormalizedSettingsWrite | null {
  if (request.scope !== 'settings') return null;
  if (!isCustomerSettingKey(request.key)) return null;
  return {
    stateId: `settings.${request.key}`,
    value: normalizeSettingValue(request.value),
    ack: false,
    diagnosticText: `Kundeneinstellung ${request.key} aus ${request.source} vorbereitet.`,
  };
}
