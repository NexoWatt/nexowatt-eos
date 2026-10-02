import type { ApiSetRequest } from '../contracts/api';
import type { StateCache } from '../contracts/iobroker-states';

/**
 * Datei: src-ts/quality/backend-api-state-cases.ts
 *
 * Zweck:
 * Regressionfälle für die TypeScript-Vorbereitung von StateCache und API-Set-Helfern.
 *
 * Zusammenhang:
 * Diese Fälle schützen spätere Migrationen aus `main.js`, ohne die aktuelle produktive Runtime
 * zu verändern.
 */

export interface StateCacheCase {
  readonly id: string;
  readonly cache: StateCache;
  readonly key: string;
  readonly expectedNumber?: number | null;
  readonly expectedBoolean?: boolean;
  readonly expectedString?: string;
}

export const stateCacheCases: readonly StateCacheCase[] = [
  {
    id: 'zero-watt-is-valid',
    cache: { storageChargePower: { value: 0, ts: 1 } },
    key: 'storageChargePower',
    expectedNumber: 0,
  },
  {
    id: 'false-is-valid',
    cache: { evcsAvailable: { value: false, ts: 1 } },
    key: 'evcsAvailable',
    expectedBoolean: false,
  },
  {
    id: 'legacy-val-is-read',
    cache: { priceCurrent: { val: '0.123', ts: 1 } },
    key: 'priceCurrent',
    expectedNumber: 0.123,
    expectedString: '0.123',
  },
];

export interface ApiSetCase {
  readonly id: string;
  readonly request: ApiSetRequest;
  readonly expectedStateId: string;
}

export const apiSetCases: readonly ApiSetCase[] = [
  {
    id: 'settings-write-builds-state-id',
    request: { scope: 'settings', key: 'aiAdvisorEnabled', value: true },
    expectedStateId: 'settings.aiAdvisorEnabled',
  },
  {
    id: 'explicit-id-wins',
    request: { scope: 'settings', key: 'ignored', id: 'settings.customValue', value: 42 },
    expectedStateId: 'settings.customValue',
  },
];
