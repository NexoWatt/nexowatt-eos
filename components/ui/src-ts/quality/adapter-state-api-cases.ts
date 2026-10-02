import { buildApiStateResponse } from '../adapter/api-state';
import { buildInfoConnectionWritePlan } from '../adapter/connection-state';
import { buildSettingsWritePlan, normalizeApiValue, type SettingDefinition } from '../adapter/api-set';
import { isStateFreshEnough, normalizeStateEntry, readFirstAvailableState } from '../adapter/state-cache';
import type { StateCache } from '../contracts/iobroker-states';

/**
 * Datei: src-ts/quality/adapter-state-api-cases.ts
 *
 * Zweck:
 * Produktionsnahe Regressionen für die künftige TypeScript-Migration der State-/API-Schicht.
 *
 * Zusammenhang:
 * Diese Fälle schützen später `main.js`, `/api/state`, `/api/set` und `info.connection`.
 * Besonders wichtig ist, dass `0` und `false` gültige Werte bleiben.
 */

const now = 1_700_000_000_000;

const cache: StateCache = {
  storageChargePower: { value: 0, ts: now - 24 * 3600 * 1000, lc: now - 24 * 3600 * 1000, ack: true },
  storageDischargePower: { val: 0, ts: now - 24 * 3600 * 1000, lc: now - 24 * 3600 * 1000, ack: true },
  evcsAvailable: { value: false, ts: now, ack: true },
  storageSoc: { value: 44, ts: now, ack: true },
};

const settingDefs: SettingDefinition[] = [
  { key: 'aiAdvisorEnabled', stateId: 'settings.aiAdvisorEnabled', valueKind: 'boolean' },
  { key: 'aiAdvisorEvTargetSocPct', stateId: 'settings.aiAdvisorEvTargetSocPct', valueKind: 'number', min: 10, max: 100 },
];

/**
 * Code-Teil: ADAPTER_STATE_API_CASES
 *
 * Zweck:
 * Enthält konkrete Fälle, die beim späteren Umbau nicht kaputtgehen dürfen.
 */
export const ADAPTER_STATE_API_CASES = [
  { id: 'zero-storage-charge-is-present', actual: normalizeStateEntry('storageChargePower', cache.storageChargePower).value, expected: 0 },
  { id: 'zero-storage-charge-can-be-fresh-for-static-zero', actual: isStateFreshEnough(normalizeStateEntry('storageChargePower', cache.storageChargePower), { nowMs: now, staleAfterMs: 60_000, treatZeroAsFresh: true }), expected: true },
  { id: 'false-feature-state-is-present', actual: readFirstAvailableState<boolean>(cache, ['evcsAvailable'], true).value, expected: false },
  { id: 'api-state-keeps-zero-value', actual: buildApiStateResponse(cache, { generatedAt: now }).states.storageChargePower?.value, expected: 0 },
  { id: 'settings-boolean-string-normalizes-to-false', actual: normalizeApiValue('false', 'boolean'), expected: false },
  { id: 'settings-number-is-clamped', actual: buildSettingsWritePlan({ scope: 'settings', key: 'aiAdvisorEvTargetSocPct', value: 150 }, settingDefs).normalizedValue, expected: 100 },
  { id: 'info-connection-online-write-plan', actual: buildInfoConnectionWritePlan(true, 'webserver-started').value, expected: true },
] as const;
