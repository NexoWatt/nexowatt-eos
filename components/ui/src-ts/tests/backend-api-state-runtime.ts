import { buildFeatureVisibilityState } from '../backend/feature-visibility/feature-visibility';
import { createApiSetResponse, planApiStateWrite } from '../backend/api-state/api-set-helpers';
import { hasExplicitStateValue, normalizeCachedState, readBooleanFromCache, readNumberFromCache } from '../backend/state-cache/state-cache';
import { apiSetCases, stateCacheCases } from '../quality/backend-api-state-cases';

/**
 * Datei: src-ts/tests/backend-api-state-runtime.ts
 *
 * Zweck:
 * Führt die 0.7.63 Backend-API-/StateCache-Fälle nach TypeScript-Kompilierung mit Node aus.
 *
 * Wichtig:
 * Dieser Test prüft die besonders kritische Regel „0 W ist gültig“. Damit schützen wir später
 * Speicher- und History-Werte vor falschen Fallbacks.
 */

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

for (const testCase of stateCacheCases) {
  if (testCase.expectedNumber !== undefined) assert(readNumberFromCache(testCase.cache, testCase.key, null) === testCase.expectedNumber, `number failed: ${testCase.id}`);
  if (testCase.expectedBoolean !== undefined) assert(readBooleanFromCache(testCase.cache, testCase.key, true) === testCase.expectedBoolean, `boolean failed: ${testCase.id}`);
}

const zeroState = normalizeCachedState('storageChargePower', { value: 0, ts: 1000, ack: true });
assert(zeroState.value === 0, '0 W must survive normalization.');
assert(zeroState.ack === true, 'ack must survive normalization.');
assert(hasExplicitStateValue({ value: 0 }) === true, '0 W must count as explicit value.');
assert(hasExplicitStateValue({ value: false }) === true, 'false must count as explicit value.');

for (const testCase of apiSetCases) {
  const plan = planApiStateWrite(testCase.request);
  const response = createApiSetResponse(testCase.request, plan);
  assert(plan.stateId === testCase.expectedStateId, `state id failed: ${testCase.id}`);
  assert(response.ok === true, `response failed: ${testCase.id}`);
}

const hiddenWithoutProof = buildFeatureVisibilityState({ evcsProofs: [] });
assert(hiddenWithoutProof.hasEvcs === false, 'EVCS must stay hidden without proof.');

const visibleWithProof = buildFeatureVisibilityState({ evcsProofs: [{ index: 1, hasAnyRealDatapoint: true, measuredPowerDp: 'evcs.1.power' }] });
assert(visibleWithProof.hasEvcs === true, 'EVCS should be visible with proof.');

console.log('[ts-backend-api-state-runtime] OK: Backend-API-/StateCache-Fälle bestanden.');
