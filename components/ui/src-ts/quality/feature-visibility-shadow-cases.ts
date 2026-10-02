import type { CustomerFeatureVisibilitySnapshot } from '../frontend/feature-visibility-diagnostics';

/**
 * Datei: src-ts/quality/feature-visibility-shadow-cases.ts
 *
 * Zweck:
 * Enthält kleine Vergleichsfälle für die Feature-Sichtbarkeits-Shadowprüfung.
 *
 * Zusammenhang:
 * Diese Fälle sichern ab, dass der spätere Shadow-Modus Unterschiede zwischen alter
 * JS-Sichtbarkeit und neuer TS-Sichtbarkeit zuverlässig erkennt, ohne produktive
 * Anzeigeentscheidungen zu ändern.
 */

export interface FeatureVisibilityShadowCase {
  readonly name: string;
  readonly legacy: Partial<CustomerFeatureVisibilitySnapshot>;
  readonly next: Partial<CustomerFeatureVisibilitySnapshot>;
  readonly expectedMatches: boolean;
  readonly expectedMismatchCount: number;
}

/**
 * Code-Teil: featureVisibilityShadowCases
 * Zweck: Minimaler Satz wichtiger Shadow-Fälle für EVCS/Farm/KI-Sichtbarkeit.
 */
export const featureVisibilityShadowCases: ReadonlyArray<FeatureVisibilityShadowCase> = [
  {
    name: 'identische Sichtbarkeit liefert keine Abweichung',
    legacy: { hasEvcs: false, hasStorageFarm: false, hasSmartHome: true, hasWeather: true, hasAiAdvisor: true },
    next: { hasEvcs: false, hasStorageFarm: false, hasSmartHome: true, hasWeather: true, hasAiAdvisor: true },
    expectedMatches: true,
    expectedMismatchCount: 0,
  },
  {
    name: 'EVCS-Abweichung wird erkannt',
    legacy: { hasEvcs: true, hasStorageFarm: false, hasSmartHome: true, hasWeather: true, hasAiAdvisor: true },
    next: { hasEvcs: false, hasStorageFarm: false, hasSmartHome: true, hasWeather: true, hasAiAdvisor: true },
    expectedMatches: false,
    expectedMismatchCount: 1,
  },
  {
    name: 'EVCS und Speicherfarm-Abweichung werden erkannt',
    legacy: { hasEvcs: true, hasStorageFarm: true, hasSmartHome: false, hasWeather: false, hasAiAdvisor: false },
    next: { hasEvcs: false, hasStorageFarm: false, hasSmartHome: false, hasWeather: false, hasAiAdvisor: false },
    expectedMatches: false,
    expectedMismatchCount: 2,
  },
];
