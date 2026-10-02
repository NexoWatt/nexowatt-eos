import type { CustomerFeatureDiagnosticsInput } from '../frontend/feature-visibility-diagnostics';

/**
 * Datei: src-ts/quality/frontend-feature-visibility-cases.ts
 *
 * Zweck:
 * Produktnahe Fälle für die spätere Frontend-Diagnose der Feature-Sichtbarkeit.
 *
 * Zusammenhang:
 * Diese Fälle bilden genau die Fehlerklasse ab, bei der EVCS oder Speicherfarm im
 * Kundenfrontend sichtbar waren, obwohl die Kundenanlage diese Funktionen nicht hatte.
 */

/** Erwartung an einen einzelnen Diagnosefall. */
export interface FrontendFeatureVisibilityCase {
  readonly id: string;
  readonly descriptionDe: string;
  readonly input: CustomerFeatureDiagnosticsInput;
  readonly expectedVisible: readonly string[];
  readonly expectedHidden: readonly string[];
  readonly expectedReasonPart: string;
}

/**
 * Code-Teil: frontendFeatureVisibilityCases
 *
 * Zweck:
 * Hält kontrollierte Diagnosefälle fest, damit MJS-Spiegel und TypeScript-Quelle später
 * nicht unbemerkt unterschiedliche Sichtbarkeitsregeln erklären.
 */
export const frontendFeatureVisibilityCases: readonly FrontendFeatureVisibilityCase[] = [
  {
    id: 'no-wallbox-no-farm-stays-hidden',
    descriptionDe: 'Kundenanlage ohne Wallbox und ohne Speicherfarm blendet beide Bereiche aus.',
    input: {
      visibility: { hasEvcs: false, hasStorageFarm: false, hasSmartHome: false, hasWeather: false, hasAiAdvisor: true },
      evcsEnabled: true,
      evcsProofCount: 0,
      storageFarmEnabled: true,
      storageFarmProofCount: 0,
      aiAdvisorInstalled: true,
      aiAdvisorCustomerEnabled: true,
    },
    expectedVisible: ['aiAdvisor'],
    expectedHidden: ['evcs', 'storageFarm', 'smartHome', 'weather'],
    expectedReasonPart: 'kein echter Ladepunkt',
  },
  {
    id: 'real-wallbox-and-weather-visible',
    descriptionDe: 'Echte Wallbox und Wetterdaten werden in der Diagnose als sichtbar erklärt.',
    input: {
      visibility: { hasEvcs: true, hasStorageFarm: false, hasSmartHome: true, hasWeather: true, hasAiAdvisor: false },
      evcsEnabled: true,
      evcsProofCount: 1,
      smartHomeEnabled: true,
      weatherEnabled: true,
      weatherHasData: true,
      aiAdvisorInstalled: true,
      aiAdvisorCustomerEnabled: false,
    },
    expectedVisible: ['evcs', 'smartHome', 'weather'],
    expectedHidden: ['storageFarm', 'aiAdvisor'],
    expectedReasonPart: 'Kunde hat den Berater',
  },
];
