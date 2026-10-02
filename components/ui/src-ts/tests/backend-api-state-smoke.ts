import { buildFeatureVisibilityState } from '../backend/feature-visibility/feature-visibility';
import { buildScopedStateId, planApiStateWrite } from '../backend/api-state/api-set-helpers';
import { readBooleanFromCache, readNumberFromCache, readStringFromCache } from '../backend/state-cache/state-cache';
import { apiSetCases, stateCacheCases } from '../quality/backend-api-state-cases';

/**
 * Datei: src-ts/tests/backend-api-state-smoke.ts
 *
 * Zweck:
 * Compile-only-Smoke-Test für die neuen Backend-/API-/StateCache-Helfer aus 0.7.63.
 */

for (const testCase of stateCacheCases) {
  if (testCase.expectedNumber !== undefined) {
    const value: number | null = readNumberFromCache(testCase.cache, testCase.key, null);
    if (value !== testCase.expectedNumber) throw new Error(testCase.id);
  }
  if (testCase.expectedBoolean !== undefined) {
    const value: boolean = readBooleanFromCache(testCase.cache, testCase.key, true);
    if (value !== testCase.expectedBoolean) throw new Error(testCase.id);
  }
  if (testCase.expectedString !== undefined) {
    const value: string = readStringFromCache(testCase.cache, testCase.key, '');
    if (value !== testCase.expectedString) throw new Error(testCase.id);
  }
}

for (const testCase of apiSetCases) {
  const plan = planApiStateWrite(testCase.request);
  if (plan.stateId !== testCase.expectedStateId) throw new Error(testCase.id);
}

const exampleStateId: string = buildScopedStateId('settings', 'aiAdvisorEnabled');
if (exampleStateId !== 'settings.aiAdvisorEnabled') throw new Error('state id mismatch');

const features = buildFeatureVisibilityState({
  evcsProofs: [{ index: 1, hasAnyRealDatapoint: true, measuredPowerDp: 'evcs.1.power' }],
  storageFarmEnabled: true,
  storageFarmProofs: [],
  smartHomeEnabled: false,
  weatherEnabled: true,
  weatherHasData: true,
  aiAdvisorInstalled: true,
  aiAdvisorCustomerEnabled: true,
});
if (!features.hasEvcs) throw new Error('EVCS should be visible when proof exists.');
if (features.hasStorageFarm) throw new Error('StorageFarm must remain hidden without proof.');
