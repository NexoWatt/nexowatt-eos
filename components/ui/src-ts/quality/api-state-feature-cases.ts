import type { FeatureVisibilityInput } from '../backend/visibility/feature-visibility';
import type { FeatureVisibilityState } from '../contracts/features';
import type { StateCache } from '../contracts/iobroker-states';

/**
 * Datei: src-ts/quality/api-state-feature-cases.ts
 *
 * Zweck:
 * Produktnahe Testfälle für die kommende TypeScript-Migration von `/api/state` und
 * Feature-Sichtbarkeit.
 *
 * Zusammenhang:
 * Die Fälle bilden frühere Fehlerquellen ab: gültige 0-Werte, fehlende States,
 * EVCS ohne echte Wallbox und Speicherfarm ohne echte Farm-Konfiguration.
 */

export interface ApiStateCase {
  readonly id: string;
  readonly descriptionDe: string;
  readonly cache: StateCache;
  readonly requestedKeys: readonly string[];
  readonly expectedValues: Record<string, unknown>;
  readonly expectedMissingCount: number;
}

export interface FeatureVisibilityCase {
  readonly id: string;
  readonly descriptionDe: string;
  readonly input: FeatureVisibilityInput;
  readonly expected: FeatureVisibilityState;
}

/**
 * Code-Teil: apiStateCases
 *
 * Zweck:
 * Prüft, dass 0, false und normale Werte in `/api/state` erhalten bleiben und fehlende
 * Werte nur als `missing` markiert werden.
 */
export const apiStateCases: readonly ApiStateCase[] = [
  {
    id: 'zero-watt-storage-state-remains-valid',
    descriptionDe: 'Speicher-Ladeleistung 0 W bleibt ein gültiger State-Wert.',
    cache: {
      storageChargePower: { id: 'storageChargePower', value: 0, ts: 1000, ack: true },
      storageDischargePower: { val: 0, ts: 1000, ack: true },
    },
    requestedKeys: ['storageChargePower', 'storageDischargePower'],
    expectedValues: { storageChargePower: 0, storageDischargePower: 0 },
    expectedMissingCount: 0,
  },
  {
    id: 'false-feature-state-remains-valid',
    descriptionDe: 'Boolean false bleibt gültig und wird nicht als fehlender Wert behandelt.',
    cache: { 'features.evcs': { id: 'features.evcs', value: false, ts: 1000, ack: true } },
    requestedKeys: ['features.evcs'],
    expectedValues: { 'features.evcs': false },
    expectedMissingCount: 0,
  },
  {
    id: 'missing-state-is-explicitly-diagnosed',
    descriptionDe: 'Ein fehlender State wird bewusst als missing markiert.',
    cache: {},
    requestedKeys: ['unknown.state'],
    expectedValues: { 'unknown.state': null },
    expectedMissingCount: 1,
  },
];

/**
 * Code-Teil: featureVisibilityCases
 *
 * Zweck:
 * Hält die fachlichen Sichtbarkeitsregeln für Kundenanlagen ohne Wallbox/Farm fest.
 */
export const featureVisibilityCases: readonly FeatureVisibilityCase[] = [
  {
    id: 'evcs-enabled-without-proof-is-hidden',
    descriptionDe: 'EVCS bleibt unsichtbar, wenn nur das Feature-Flag aktiv ist, aber kein echter Ladepunkt-DP existiert.',
    input: { evcsEnabled: true, evcsProofs: [] },
    expected: { hasEvcs: false, hasStorageFarm: false, hasSmartHome: false, hasWeather: false, hasAiAdvisor: false },
  },
  {
    id: 'evcs-enabled-with-real-proof-is-visible',
    descriptionDe: 'EVCS wird sichtbar, wenn ein echter Ladepunkt-DP vorhanden ist.',
    input: { evcsEnabled: true, evcsProofs: [{ index: 1, measuredPowerDp: 'wallbox.0.power', hasAnyRealDatapoint: true }] },
    expected: { hasEvcs: true, hasStorageFarm: false, hasSmartHome: false, hasWeather: false, hasAiAdvisor: false },
  },
  {
    id: 'storagefarm-enabled-without-proof-is-hidden',
    descriptionDe: 'Speicherfarm bleibt unsichtbar, wenn keine echten Farm-Speicher-DPs konfiguriert sind.',
    input: { storageFarmEnabled: true, storageFarmProofs: [] },
    expected: { hasEvcs: false, hasStorageFarm: false, hasSmartHome: false, hasWeather: false, hasAiAdvisor: false },
  },
  {
    id: 'storagefarm-enabled-with-one-real-proof-is-hidden',
    descriptionDe: 'Speicherfarm bleibt bei nur einem echten Speicher unsichtbar; Einzel-Speicher laufen über die normale Speicherregelung.',
    input: { storageFarmEnabled: true, storageFarmProofs: [{ index: 1, socDp: 'battery.1.soc', hasAnyRealDatapoint: true }] },
    expected: { hasEvcs: false, hasStorageFarm: false, hasSmartHome: false, hasWeather: false, hasAiAdvisor: false },
  },
  {
    id: 'storagefarm-enabled-with-two-real-proofs-is-visible',
    descriptionDe: 'Speicherfarm wird sichtbar, wenn mindestens zwei echte Farm-Speicher-DPs vorhanden sind.',
    input: {
      storageFarmEnabled: true,
      storageFarmProofs: [
        { index: 1, socDp: 'battery.1.soc', hasAnyRealDatapoint: true },
        { index: 2, socDp: 'battery.2.soc', hasAnyRealDatapoint: true },
      ],
    },
    expected: { hasEvcs: false, hasStorageFarm: true, hasSmartHome: false, hasWeather: false, hasAiAdvisor: false },
  },
  {
    id: 'ai-advisor-needs-app-and-customer-switch',
    descriptionDe: 'KI-Berater wird nur sichtbar, wenn App aktiv und Kundenschalter nicht aus ist.',
    input: { aiAdvisorAppEnabled: true, aiAdvisorCustomerEnabled: false },
    expected: { hasEvcs: false, hasStorageFarm: false, hasSmartHome: false, hasWeather: false, hasAiAdvisor: false },
  },
];
