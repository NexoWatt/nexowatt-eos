import type { EvcsPresenceProof, FeatureVisibilityState, StorageFarmPresenceProof } from '../contracts/features';

/**
 * Datei: src-ts/test-fixtures/feature-visibility-contract.examples.ts
 *
 * Zweck:
 * Compile-only Beispiele für Feature-Sichtbarkeit.
 *
 * Fachliche Regel:
 * Kunden sehen nur Funktionen, die in der Anlage wirklich vorhanden sind.
 */

/** Anlage ohne Wallbox und ohne Speicherfarm. */
export const homeWithoutEvcsOrFarm: FeatureVisibilityState = {
  hasEvcs: false,
  hasStorageFarm: false,
  hasSmartHome: true,
  hasWeather: true,
  hasAiAdvisor: true,
};

/** Nachweis für eine echte Wallbox. */
export const realEvcsProof: EvcsPresenceProof = {
  index: 1,
  name: 'Garage',
  measuredPowerDp: 'evcs.1.power',
  controlDp: 'evcs.1.mode',
  hasAnyRealDatapoint: true,
};

/** Nachweis für einen Speicher in einer Speicherfarm. */
export const realFarmStorageProof: StorageFarmPresenceProof = {
  index: 1,
  name: 'Farm-Speicher 1',
  socDp: 'storageFarm.1.soc',
  chargeDp: 'storageFarm.1.chargeW',
  dischargeDp: 'storageFarm.1.dischargeW',
  hasAnyRealDatapoint: true,
};
