import type { FeatureVisibilityState } from '../contracts/features';
import type { CustomerFeatureVisibilityInput } from '../frontend/customer-feature-visibility';

/**
 * Datei: src-ts/quality/customer-feature-visibility-cases.ts
 *
 * Zweck:
 * Enthält produktionsnahe Testfälle für die Sichtbarkeit von Kundenfunktionen.
 *
 * Zusammenhang:
 * Diese Fälle schützen genau die UI-Regeln, die bei Kundenanlagen wichtig sind:
 * EVCS darf ohne echte Wallbox nicht sichtbar sein, Speicherfarm darf ohne echte
 * Farm nicht sichtbar sein, und alte Runtime-Flags dürfen keine Menüpunkte oder
 * Kacheln aktivieren.
 */

/** Erwarteter Ausgang eines Feature-Sichtbarkeit-Falls. */
export interface CustomerFeatureVisibilityCase {
  readonly name: string;
  readonly input: CustomerFeatureVisibilityInput;
  readonly expected: FeatureVisibilityState;
}

/**
 * Code-Teil: customerFeatureVisibilityCases
 *
 * Zweck:
 * Definiert Regressionsfälle für typische Kundenanlagen.
 *
 * Wichtig:
 * Diese Fälle sind absichtlich fachlich formuliert. Sie sollen verhindern, dass
 * später durch Design-, Dashboard- oder History-Anpassungen wieder EVCS/Farm-UI
 * erscheint, obwohl die Anlage diese Funktion gar nicht besitzt.
 */
export const customerFeatureVisibilityCases: ReadonlyArray<CustomerFeatureVisibilityCase> = [
  {
    name: 'Anlage ohne Wallbox und ohne Speicherfarm zeigt keine EVCS/Farm-Funktionen',
    input: {
      evcsProofs: [],
      storageFarmEnabled: false,
      storageFarmProofs: [],
      smartHomeEnabled: false,
      weatherEnabled: false,
      weatherHasData: false,
      aiAdvisorInstalled: false,
      aiAdvisorCustomerEnabled: true,
    },
    expected: {
      hasEvcs: false,
      hasStorageFarm: false,
      hasSmartHome: false,
      hasWeather: false,
      hasAiAdvisor: false,
    },
  },
  {
    name: 'Altes EVCS-Flag ohne echten Datenpunkt reicht nicht aus',
    input: {
      evcsProofs: [{ index: 1, name: 'Default Ladepunkt', hasAnyRealDatapoint: false }],
      storageFarmEnabled: false,
      storageFarmProofs: [],
      smartHomeEnabled: true,
      weatherEnabled: true,
      weatherHasData: true,
      aiAdvisorInstalled: true,
      aiAdvisorCustomerEnabled: true,
    },
    expected: {
      hasEvcs: false,
      hasStorageFarm: false,
      hasSmartHome: true,
      hasWeather: true,
      hasAiAdvisor: true,
    },
  },
  {
    name: 'Gemessene Wallbox-Leistung macht EVCS sichtbar',
    input: {
      evcsProofs: [{ index: 1, name: 'Wallbox', measuredPowerDp: 'evcs.1.power', hasAnyRealDatapoint: false }],
      storageFarmEnabled: false,
      storageFarmProofs: [],
      smartHomeEnabled: false,
      weatherEnabled: false,
      weatherHasData: false,
      aiAdvisorInstalled: false,
      aiAdvisorCustomerEnabled: true,
    },
    expected: {
      hasEvcs: true,
      hasStorageFarm: false,
      hasSmartHome: false,
      hasWeather: false,
      hasAiAdvisor: false,
    },
  },
  {
    name: 'Wallbox-Steuerdatenpunkt macht EVCS sichtbar',
    input: {
      evcsProofs: [{ index: 1, name: 'Wallbox', controlDp: 'evcs.1.setCurrent', hasAnyRealDatapoint: false }],
      storageFarmEnabled: false,
      storageFarmProofs: [],
      smartHomeEnabled: false,
      weatherEnabled: false,
      weatherHasData: false,
      aiAdvisorInstalled: false,
      aiAdvisorCustomerEnabled: true,
    },
    expected: {
      hasEvcs: true,
      hasStorageFarm: false,
      hasSmartHome: false,
      hasWeather: false,
      hasAiAdvisor: false,
    },
  },
  {
    name: 'Speicherfarm-Proof ohne aktivierte Farm bleibt unsichtbar',
    input: {
      evcsProofs: [],
      storageFarmEnabled: false,
      storageFarmProofs: [{ index: 1, name: 'Farm-Speicher', socDp: 'storageFarm.1.soc', hasAnyRealDatapoint: true }],
      smartHomeEnabled: false,
      weatherEnabled: false,
      weatherHasData: false,
      aiAdvisorInstalled: false,
      aiAdvisorCustomerEnabled: true,
    },
    expected: {
      hasEvcs: false,
      hasStorageFarm: false,
      hasSmartHome: false,
      hasWeather: false,
      hasAiAdvisor: false,
    },
  },
  {
    name: 'Aktivierte Speicherfarm ohne echten Speicher bleibt unsichtbar',
    input: {
      evcsProofs: [],
      storageFarmEnabled: true,
      storageFarmProofs: [{ index: 1, name: 'Platzhalter', hasAnyRealDatapoint: false }],
      smartHomeEnabled: false,
      weatherEnabled: false,
      weatherHasData: false,
      aiAdvisorInstalled: false,
      aiAdvisorCustomerEnabled: true,
    },
    expected: {
      hasEvcs: false,
      hasStorageFarm: false,
      hasSmartHome: false,
      hasWeather: false,
      hasAiAdvisor: false,
    },
  },
  {
    name: 'Aktivierte Speicherfarm mit nur einem echten Speicher bleibt unsichtbar',
    input: {
      evcsProofs: [],
      storageFarmEnabled: true,
      storageFarmProofs: [{ index: 1, name: 'Farm-Speicher 1', signedPowerDp: 'storageFarm.1.power', hasAnyRealDatapoint: false }],
      smartHomeEnabled: false,
      weatherEnabled: false,
      weatherHasData: false,
      aiAdvisorInstalled: false,
      aiAdvisorCustomerEnabled: true,
    },
    expected: {
      hasEvcs: false,
      hasStorageFarm: false,
      hasSmartHome: false,
      hasWeather: false,
      hasAiAdvisor: false,
    },
  },
  {
    name: 'Aktivierte Speicherfarm mit zwei echten Speichern wird sichtbar',
    input: {
      evcsProofs: [],
      storageFarmEnabled: true,
      storageFarmProofs: [
        { index: 1, name: 'Farm-Speicher 1', signedPowerDp: 'storageFarm.1.power', hasAnyRealDatapoint: false },
        { index: 2, name: 'Farm-Speicher 2', socDp: 'storageFarm.2.soc', hasAnyRealDatapoint: false },
      ],
      smartHomeEnabled: false,
      weatherEnabled: false,
      weatherHasData: false,
      aiAdvisorInstalled: false,
      aiAdvisorCustomerEnabled: true,
    },
    expected: {
      hasEvcs: false,
      hasStorageFarm: true,
      hasSmartHome: false,
      hasWeather: false,
      hasAiAdvisor: false,
    },
  },
  {
    name: 'Wetter braucht Aktivierung und Daten',
    input: {
      evcsProofs: [],
      storageFarmEnabled: false,
      storageFarmProofs: [],
      smartHomeEnabled: false,
      weatherEnabled: true,
      weatherHasData: false,
      aiAdvisorInstalled: false,
      aiAdvisorCustomerEnabled: true,
    },
    expected: {
      hasEvcs: false,
      hasStorageFarm: false,
      hasSmartHome: false,
      hasWeather: false,
      hasAiAdvisor: false,
    },
  },
  {
    name: 'KI-Berater braucht Installation und Kundenschalter',
    input: {
      evcsProofs: [],
      storageFarmEnabled: false,
      storageFarmProofs: [],
      smartHomeEnabled: false,
      weatherEnabled: true,
      weatherHasData: true,
      aiAdvisorInstalled: true,
      aiAdvisorCustomerEnabled: false,
    },
    expected: {
      hasEvcs: false,
      hasStorageFarm: false,
      hasSmartHome: false,
      hasWeather: true,
      hasAiAdvisor: false,
    },
  },
];
