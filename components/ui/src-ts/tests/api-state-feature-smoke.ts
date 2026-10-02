import type { ApiSetRequest } from '../contracts/api';
import type { FeatureVisibilityInput } from '../backend/visibility/feature-visibility';
import { buildApiStateEnvelope } from '../backend/state/api-state-cache';
import { deriveFeatureVisibility } from '../backend/visibility/feature-visibility';

/**
 * Datei: src-ts/tests/api-state-feature-smoke.ts
 *
 * Zweck:
 * Compile-only Smoke-Test für die neuen TypeScript-Verträge und Helfer aus 0.7.63.
 */
const sampleSetRequest: ApiSetRequest = { scope: 'settings', key: 'aiAdvisorEnabled', value: true };
const sampleVisibilityInput: FeatureVisibilityInput = {
  evcsEnabled: true,
  evcsProofs: [],
  storageFarmEnabled: false,
  aiAdvisorAppEnabled: true,
  aiAdvisorCustomerEnabled: sampleSetRequest.value === true,
};
const sampleEnvelope = buildApiStateEnvelope({ storageChargePower: { id: 'storageChargePower', value: 0, ack: true, ts: 123 } }, ['storageChargePower'], 456);
const sampleVisibility = deriveFeatureVisibility(sampleVisibilityInput);
void sampleEnvelope;
void sampleVisibility;
