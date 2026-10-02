import type { AiAdvisorCustomerSettings, AiAdvisorRuntimeState, AiAdvisorSuggestion, DailyPlanEntry } from '../contracts/ai-advisor';

/**
 * Datei: src-ts/test-fixtures/ai-advisor-contract.examples.ts
 *
 * Zweck:
 * Beispielobjekte für den KI-Energieberater.
 *
 * Wichtig:
 * Die KI bleibt beratend. Diese Beispiele dürfen später nicht als automatische
 * Schaltbefehle interpretiert werden.
 */

export const customerAiSettingsExample: AiAdvisorCustomerSettings = {
  enabled: true,
  mode: 'balanced',
  evReadyBy: '07:00',
  evTargetSocPct: 80,
  thermalReadyBy: '18:00',
  comfortStart: '06:00',
  comfortEnd: '22:00',
  quietHoursStart: '22:00',
  quietHoursEnd: '06:00',
  priorityStorage: 90,
  priorityEvcs: 80,
  priorityThermal: 60,
  priorityHeatingRod: 45,
  priorityGeneric: 40,
};

export const peakWarningSuggestionExample: AiAdvisorSuggestion = {
  id: 'grid-connection-90-risk',
  category: 'peak',
  severity: 'warning',
  priority: 92,
  icon: '⚠️',
  title: 'Netzanschluss fast ausgelastet',
  text: 'Aktueller Netzbezug 27.0 kW von 30.0 kW.',
  action: 'Flexible Lasten vorsorglich drosseln; Peak-Shaving greift am Limit ein.',
  window: 'jetzt',
  impact: 'Lastspitze vermeiden',
  confidence: 90,
};

export const dailyPlanEntryExample: DailyPlanEntry = {
  timeLabel: '11:00–15:00',
  title: 'PV-Fenster nutzen',
  reason: 'Wetter und PV-Prognose erwarten Überschuss.',
  expectedPvKwh: 9.5,
  peakRiskPct: 35,
  category: 'dailyPlan',
};

export const runtimeExample: AiAdvisorRuntimeState = {
  ts: 1760000000000,
  status: 'active',
  scorePct: 82,
  suggestions: [peakWarningSuggestionExample],
  dailyPlanText: '11:00–15:00: PV-Fenster nutzen',
  weatherSummary: 'Morgen sonnig, PV-freundlich.',
  peakUsagePct: 90,
  peakStateText: '27.0 kW von 30.0 kW · Lastspitzenkappung bereit',
  storageSocPct: 44,
  storageSocSource: 'storageSoc',
  learnedPeakW: 29000,
  forecastQualityPct: 75,
};
