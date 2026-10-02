import type { ApiSetRequest, ApiStateResponseV2 } from '../contracts/api';
import { buildApiStateResponse } from '../adapter/api-state';
import { buildInfoConnectionWritePlan } from '../adapter/connection-state';
import { buildSettingsWritePlan, type SettingDefinition } from '../adapter/api-set';
import type { StateCache } from '../contracts/iobroker-states';

/**
 * Datei: src-ts/tests/adapter-state-api-smoke.ts
 * Zweck: Compile-only-Test für die neuen Adapter-API-Verträge.
 */
const cacheExample: StateCache = {
  storageSoc: { value: 44, ts: Date.now(), ack: true },
  storageChargePower: { value: 0, ts: Date.now(), ack: true },
};

const responseExample: ApiStateResponseV2 = buildApiStateResponse(cacheExample);
const requestExample: ApiSetRequest<number> = { scope: 'settings', key: 'aiAdvisorEvTargetSocPct', value: 80, source: 'frontend' };
const defs: SettingDefinition[] = [{ key: 'aiAdvisorEvTargetSocPct', stateId: 'settings.aiAdvisorEvTargetSocPct', valueKind: 'number', min: 10, max: 100 }];
const writePlanExample = buildSettingsWritePlan(requestExample, defs);
const connectionPlanExample = buildInfoConnectionWritePlan(true, 'heartbeat');
export const adapterApiSmokeExamples = { responseExample, writePlanExample, connectionPlanExample };
