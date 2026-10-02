/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Definiert den gemeinsamen TypeScript-Datenvertrag „ai-advisor“, auf den sich die importierenden Bereiche beim Austausch ihrer Werte beziehen.
 * Daten und Wirkung: Verknüpft die unten sichtbaren Typen/Exporte mit ihren Importierenden. Die Gegenrichtung und die Originaldateien sind im Quellcode-Verzeichnis dokumentiert.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/contracts/ai-advisor.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type { ClockTime, KiloWattHour, Percent, TimestampMs, Watt } from './units';

/**
 * Datei: src-ts/contracts/ai-advisor.ts
 *
 * Zweck:
 * TypeScript-Verträge für den KI-Energieberater.
 *
 * Wichtig:
 * Der KI-Berater ist beratend. Diese Typen dürfen nicht als Grundlage für direkte
 * Schaltbefehle missverstanden werden. Automatische Steuerung bleibt in den EMS-Modulen.
 */

export type AiAdvisorSeverity = 'success' | 'info' | 'warning' | 'critical';

export type AiAdvisorCategory =
  | 'tariff'
  | 'pv'
  | 'storage'
  | 'evcs'
  | 'peak'
  | 'weather'
  | 'heating'
  | 'dailyPlan'
  | 'plan'
  | 'anomaly'
  | 'comfort'
  | 'learning'
  | 'co2'
  | 'system'
  | 'setup';

export type AiOptimizationMode = 'balanced' | 'cost' | 'autarky' | 'co2' | 'peak' | 'comfort';

/** Ein einzelner KI-Vorschlag für Dashboard und Detailansicht. */
export interface AiAdvisorSuggestion {
  id: string;
  category: AiAdvisorCategory;
  severity: AiAdvisorSeverity;
  priority: number;
  icon?: string;
  title: string;
  text: string;
  action: string;
  window?: string;
  impact?: string;
  confidence?: Percent;
}

/** Kundennahe KI-Vorgaben aus den Einstellungen. */
export interface AiAdvisorCustomerSettings {
  enabled: boolean;
  mode: AiOptimizationMode;
  evReadyBy: ClockTime;
  evTargetSocPct: Percent;
  thermalReadyBy: ClockTime;
  comfortStart: ClockTime;
  comfortEnd: ClockTime;
  quietHoursStart: ClockTime;
  quietHoursEnd: ClockTime;
  priorityStorage: number;
  priorityEvcs: number;
  priorityThermal: number;
  priorityHeatingRod: number;
  priorityGeneric: number;
}

/** Runtime-Diagnose des KI-Beraters. */
export interface AiAdvisorRuntimeState {
  ts: TimestampMs;
  status: 'disabled' | 'ready' | 'active' | 'error';
  scorePct: Percent;
  suggestions: AiAdvisorSuggestion[];
  dailyPlanText: string;
  weatherSummary: string;
  peakUsagePct: Percent;
  peakStateText: string;
  storageSocPct: Percent | null;
  storageSocSource: string;
  learnedPeakW: Watt;
  forecastQualityPct: Percent;
}

/** Tagesfahrplan-Eintrag. */
export interface DailyPlanEntry {
  timeLabel: string;
  title: string;
  reason: string;
  expectedPvKwh?: KiloWattHour;
  peakRiskPct?: Percent;
  category: AiAdvisorCategory;
}
