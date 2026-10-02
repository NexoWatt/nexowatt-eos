/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Bereitet gemeinsame Anzeigegrößen und deren Formatierung für das Kundenfrontend vor.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/frontend/display.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import { formatEnergyValue, formatPowerValue as baseFormatPowerValue, toFiniteNumber } from './display-format';

/**
 * Datei: src-ts/frontend/display.ts
 *
 * Zweck:
 * Bündelt kleine, reine Anzeigehelfer für die spätere TypeScript-Migration der Kunden-VIS.
 *
 * Zusammenhang:
 * `www/app.js`, `www/history.js` und `www/smarthome.js` formatieren heute viele Werte direkt.
 * Diese Fassade ist der kontrollierte TS-Einstieg, damit spätere Frontend-Schritte nicht wieder
 * verstreute Formatter und Feature-Labels erzeugen.
 *
 * Wichtig:
 * Diese Datei ist in 0.7.65 noch nicht produktiv im Browser verdrahtet. Sie dient nur als
 * typisierter, kommentierter und getesteter Migrationsbaustein.
 */

/** Schlankes Anzeigeergebnis für reine Frontend-Helfer. */
export interface FrontendDisplayValue {
  readonly text: string;
  readonly value: number | null;
  readonly unit: string;
}

/** Optionen für Prozentdarstellung im Frontend. */
export interface PercentageDisplayOptions {
  /** Anzahl Nachkommastellen. Standard: 0. */
  readonly decimals?: number;
  /** Begrenzung auf 0–100 %. Standard: true. */
  readonly clamp?: boolean;
}

/** Feature-Kürzel, die das Kundenfrontend sichtbar/unsichtbar schalten kann. */
export type FrontendFeatureKind = 'evcs' | 'storagefarm' | 'smarthome' | 'weather' | 'aiAdvisor' | 'settings' | 'history' | 'live';

/** Beschriftung eines Features für spätere Navigation, Menüs und Debug-Ausgaben. */
export interface FrontendFeatureLabel {
  readonly key: FrontendFeatureKind;
  readonly label: string;
  readonly shortLabel: string;
}

/**
 * Code-Teil: formatPowerValue
 *
 * Zweck:
 * Reicht die zentrale Leistungsformatierung als schlankes Anzeigeergebnis weiter.
 *
 * Zusammenhang:
 * Der Wrapper erlaubt später, Frontend-Dateien nur aus `frontend/display` zu importieren, ohne die
 * interne Dateistruktur der Formatter zu kennen.
 */
export function formatPowerValue(value: unknown): FrontendDisplayValue {
  const out = baseFormatPowerValue(value);
  return { text: out.text, value: out.value, unit: out.unit };
}

/**
 * Code-Teil: formatPercentageValue
 *
 * Zweck:
 * Formatiert Prozentwerte mit optionalen Nachkommastellen für SoC, Autarkie und Forecastqualität.
 */
export function formatPercentageValue(value: unknown, options: PercentageDisplayOptions = {}): FrontendDisplayValue {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return { text: '—', value: null, unit: '%' };
  const shouldClamp = options.clamp !== false;
  const pct = shouldClamp ? Math.max(0, Math.min(100, parsed)) : parsed;
  const decimals = Math.max(0, Math.min(2, Math.round(options.decimals ?? 0)));
  return { text: `${pct.toFixed(decimals)} %`, value: pct, unit: '%' };
}

/**
 * Code-Teil: formatEnergyKwhValue
 *
 * Zweck:
 * Formatiert Energie in kWh/MWh für History und Reports.
 */
export function formatEnergyKwhValue(valueKwh: unknown): FrontendDisplayValue {
  const out = formatEnergyValue(valueKwh);
  return { text: out.text, value: out.value, unit: out.unit };
}

/**
 * Code-Teil: normalizeFeatureKind
 *
 * Zweck:
 * Wandelt freie UI-/Config-Bezeichnungen in stabile Feature-Schlüssel um.
 *
 * Zusammenhang:
 * Diese Normalisierung schützt später Hamburger-Menü, Topbar und History-Aktionen davor, für
 * nicht vorhandene Anlagenfunktionen falsche Einträge anzuzeigen.
 */
export function normalizeFeatureKind(input: unknown): FrontendFeatureKind {
  const raw = String(input ?? '').trim().toLowerCase();
  if (['evcs', 'ladestation', 'wallbox', 'e-mobilität', 'emobilitaet'].includes(raw)) return 'evcs';
  if (['speicherfarm', 'storagefarm', 'farm'].includes(raw)) return 'storagefarm';
  if (['smarthome', 'smart-home'].includes(raw)) return 'smarthome';
  if (['wetter', 'weather'].includes(raw)) return 'weather';
  if (['ki', 'ai', 'advisor', 'aiadvisor', 'ki-berater'].includes(raw)) return 'aiAdvisor';
  if (['settings', 'einstellungen'].includes(raw)) return 'settings';
  if (['history', 'historie'].includes(raw)) return 'history';
  return 'live';
}

/**
 * Code-Teil: getFeatureLabel
 *
 * Zweck:
 * Liefert einheitliche Beschriftungen für vorbereitete Frontend-Sichtbarkeitsmodelle.
 */
export function getFeatureLabel(input: unknown): FrontendFeatureLabel {
  const key = normalizeFeatureKind(input);
  const labels: Record<FrontendFeatureKind, FrontendFeatureLabel> = {
    live: { key, label: 'Live', shortLabel: 'LIVE' },
    history: { key, label: 'Historie', shortLabel: 'History' },
    evcs: { key, label: 'Ladestation', shortLabel: 'EVCS' },
    storagefarm: { key, label: 'Speicherfarm', shortLabel: 'Farm' },
    smarthome: { key, label: 'SmartHome', shortLabel: 'SmartHome' },
    weather: { key, label: 'Wetter', shortLabel: 'Wetter' },
    aiAdvisor: { key, label: 'KI-Energieberater', shortLabel: 'KI' },
    settings: { key, label: 'Einstellungen', shortLabel: 'Settings' },
  };
  return labels[key];
}
