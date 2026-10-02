import type { FeatureVisibilityState } from '../contracts/features';
import type { FeatureVisibilityResolverInput } from '../resolvers/feature-visibility-resolver';

/**
 * Datei: src-ts/quality/feature-visibility-resolver-cases.ts
 *
 * Zweck:
 * Produktnahe Testfälle für die zentrale Feature-Sichtbarkeit.
 *
 * Zusammenhang:
 * Diese Fälle bilden die Kundenanlagen ab, bei denen früher fälschlich EVCS,
 * Speicherfarm oder KI-Berater angezeigt wurden. Sie schützen die spätere Runtime-
 * Migration in `main.js`, `www/app.js`, `history.js` und `cockpit-shell.js`.
 */

export interface FeatureVisibilityResolverCase {
  readonly id: string;
  readonly descriptionDe: string;
  readonly input: FeatureVisibilityResolverInput;
  readonly expected: FeatureVisibilityState;
}

/**
 * Code-Teil: featureVisibilityResolverCases
 *
 * Zweck:
 * Hält die wichtigsten Sichtbarkeitsregeln als maschinenprüfbare Fälle fest.
 */
export const featureVisibilityResolverCases: readonly FeatureVisibilityResolverCase[] = [
  {
    id: 'anlage-ohne-wallbox-und-ohne-farm',
    descriptionDe: 'Kundenanlage ohne echte EVCS-DPs und ohne Farm zeigt weder EVCS noch Speicherfarm.',
    input: { evcsEnabled: true, storageFarmEnabled: true, evcsProofs: [], storageFarmProofs: [] },
    expected: { hasEvcs: false, hasStorageFarm: false, hasSmartHome: false, hasWeather: false, hasAiAdvisor: false },
  },
  {
    id: 'wallbox-erst-mit-echtem-leistungs-dp',
    descriptionDe: 'Ein Ladepunkt wird sichtbar, sobald ein echter Leistungs-DP konfiguriert ist.',
    input: { evcsEnabled: true, evcsProofs: [{ index: 1, measuredPowerDp: 'evcs.0.power', hasAnyRealDatapoint: false }] },
    expected: { hasEvcs: true, hasStorageFarm: false, hasSmartHome: false, hasWeather: false, hasAiAdvisor: false },
  },
  {
    id: 'wallbox-flag-ohne-aktivierung-bleibt-unsichtbar',
    descriptionDe: 'Ein echter DP reicht nicht, wenn das EVCS-Feature nicht aktiviert ist.',
    input: { evcsEnabled: false, evcsProofs: [{ index: 1, measuredPowerDp: 'evcs.0.power', hasAnyRealDatapoint: true }] },
    expected: { hasEvcs: false, hasStorageFarm: false, hasSmartHome: false, hasWeather: false, hasAiAdvisor: false },
  },
  {
    id: 'speicherfarm-erst-mit-zwei-echten-farm-speichern',
    descriptionDe: 'Speicherfarm wird nur sichtbar, wenn Farm aktiv und mindestens zwei echte Farmspeicher vorhanden sind.',
    input: { storageFarmEnabled: true, storageFarmProofs: [{ index: 1, socDp: 'farm.0.soc', hasAnyRealDatapoint: false }, { index: 2, signedPowerDp: 'farm.1.power', hasAnyRealDatapoint: false }] },
    expected: { hasEvcs: false, hasStorageFarm: true, hasSmartHome: false, hasWeather: false, hasAiAdvisor: false },
  },
  {
    id: 'farm-dp-ohne-aktivierung-bleibt-unsichtbar',
    descriptionDe: 'Ein Farm-DP reicht nicht, wenn die Speicherfarm nicht aktiviert ist.',
    input: { storageFarmEnabled: false, storageFarmProofs: [{ index: 1, socDp: 'farm.0.soc', hasAnyRealDatapoint: true }] },
    expected: { hasEvcs: false, hasStorageFarm: false, hasSmartHome: false, hasWeather: false, hasAiAdvisor: false },
  },
  {
    id: 'wetter-braucht-daten',
    descriptionDe: 'Wetter wird nur sichtbar, wenn Wetter aktiv ist und echte Daten vorhanden sind.',
    input: { weatherEnabled: true, weatherHasData: false },
    expected: { hasEvcs: false, hasStorageFarm: false, hasSmartHome: false, hasWeather: false, hasAiAdvisor: false },
  },
  {
    id: 'ki-berater-kundenschalter-aus',
    descriptionDe: 'KI-Berater wird ausgeblendet, wenn der Kundenschalter aus ist.',
    input: { aiAdvisorAppEnabled: true, aiAdvisorCustomerEnabled: false },
    expected: { hasEvcs: false, hasStorageFarm: false, hasSmartHome: false, hasWeather: false, hasAiAdvisor: false },
  },
  {
    id: 'alle-features-mit-nachweisen-sichtbar',
    descriptionDe: 'Alle Kundenfeatures werden sichtbar, wenn Aktivierung und Nachweise stimmen.',
    input: {
      evcsEnabled: true,
      evcsProofs: [{ index: 1, controlDp: 'evcs.0.enable', hasAnyRealDatapoint: false }],
      storageFarmEnabled: true,
      storageFarmProofs: [{ index: 1, signedPowerDp: 'farm.0.power', hasAnyRealDatapoint: false }, { index: 2, socDp: 'farm.1.soc', hasAnyRealDatapoint: false }],
      smartHomeEnabled: true,
      weatherEnabled: true,
      weatherHasData: true,
      aiAdvisorInstalled: true,
    },
    expected: { hasEvcs: true, hasStorageFarm: true, hasSmartHome: true, hasWeather: true, hasAiAdvisor: true },
  },
];
