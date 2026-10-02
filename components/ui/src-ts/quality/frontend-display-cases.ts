import type { DashboardValueInput } from '../frontend/dashboard-display';
import type { CustomerFeatureVisibilityInput } from '../frontend/customer-feature-visibility';
import type { HistoryToolbarInput } from '../frontend/history-controls';

/**
 * Datei: src-ts/quality/frontend-display-cases.ts
 *
 * Zweck:
 * Kleine Testfälle für die neuen Frontend-TypeScript-Helfer.
 *
 * Zusammenhang:
 * Diese Fälle sichern vor allem, dass EVCS-Anzeigen nicht erscheinen, wenn keine
 * Wallbox vorhanden ist, und dass 0-Werte im Dashboard weiterhin gültig bleiben.
 */

/**
 * Code-Teil: dashboardWithoutEvcs
 *
 * Zweck:
 * Regressionsfall für eine Kundenanlage ohne Wallbox. Die EVCS-Zeile darf trotz
 * vorhandenem 0-W-Wert nicht sichtbar werden.
 */
export const dashboardWithoutEvcs: DashboardValueInput = {
  visibility: { hasEvcs: false, hasStorageFarm: false, hasSmartHome: true, hasWeather: true, hasAiAdvisor: true },
  pvW: 1500,
  buildingLoadW: 100,
  gridImportW: 0,
  gridExportW: 0,
  batterySignedW: -1400,
  batterySocPct: 39,
  evcsW: 0,
};

/** Code-Teil: dashboardWithEvcs – derselbe Fall, aber mit echter EVCS-Sichtbarkeit. */
export const dashboardWithEvcs: DashboardValueInput = {
  ...dashboardWithoutEvcs,
  visibility: { ...dashboardWithoutEvcs.visibility, hasEvcs: true },
  evcsW: 7400,
};

/** Code-Teil: historyWithoutEvcs – History darf ohne Wallbox kein EVCS-PDF anbieten. */
export const historyWithoutEvcs: HistoryToolbarInput = { mode: 'day', hasEvcs: false, hasTariff: true, canLoad: true };

/** Code-Teil: historyWithEvcs – History darf EVCS-PDF anzeigen, wenn Wallbox vorhanden ist. */
export const historyWithEvcs: HistoryToolbarInput = { ...historyWithoutEvcs, hasEvcs: true };

/**
 * Code-Teil: customerFeatureVisibilityCases
 *
 * Zweck:
 * Testfälle für die spätere kundenseitige Sichtbarkeitslogik.
 *
 * Wichtig:
 * Eine Anlage ohne echte Wallbox und ohne echte Speicherfarm darf diese Funktionen
 * später nicht im Dashboard, Menü oder in der History anzeigen.
 */
export const customerFeatureVisibilityCases: {
  readonly noEvcsNoFarm: CustomerFeatureVisibilityInput;
  readonly withEvcsAndFarm: CustomerFeatureVisibilityInput;
} = {
  noEvcsNoFarm: {
    evcsProofs: [],
    storageFarmEnabled: false,
    storageFarmProofs: [],
    smartHomeEnabled: true,
    weatherEnabled: true,
    weatherHasData: true,
    aiAdvisorInstalled: true,
    aiAdvisorCustomerEnabled: true,
  },
  withEvcsAndFarm: {
    evcsProofs: [{ index: 1, measuredPowerDp: 'evcs.1.power', hasAnyRealDatapoint: true }],
    storageFarmEnabled: true,
    storageFarmProofs: [
      { index: 1, socDp: 'storageFarm.1.soc', hasAnyRealDatapoint: true },
      { index: 2, socDp: 'storageFarm.2.soc', hasAnyRealDatapoint: true },
    ],
    smartHomeEnabled: true,
    weatherEnabled: true,
    weatherHasData: true,
    aiAdvisorInstalled: true,
    aiAdvisorCustomerEnabled: true,
  },
};
