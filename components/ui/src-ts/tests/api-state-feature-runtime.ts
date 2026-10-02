import { buildApiStateEnvelope } from '../backend/state/api-state-cache';
import { deriveFeatureVisibility } from '../backend/visibility/feature-visibility';
import { apiStateCases, featureVisibilityCases } from '../quality/api-state-feature-cases';

/**
 * Datei: src-ts/tests/api-state-feature-runtime.ts
 *
 * Zweck:
 * Laufender TypeScript-Regressionstest für die vorbereiteten API-State- und
 * Feature-Sichtbarkeitshelfer.
 *
 * Zusammenhang:
 * Dieser Test läuft noch außerhalb der produktiven Adapter-Runtime. Er beweist aber,
 * dass die fachlichen Regeln für `/api/state` und sichtbare Funktionen schon vor der
 * echten Migration maschinell geprüft werden.
 */

/**
 * Code-Teil: assertEqual
 *
 * Zweck:
 * Kleine Testhilfe ohne zusätzliches Testframework.
 */
function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: erwartet ${String(expected)}, erhalten ${String(actual)}`);
  }
}

/**
 * Code-Teil: runApiStateCases
 *
 * Zweck:
 * Prüft, dass die vorbereitete `/api/state`-Normalisierung keine gültigen 0-/false-
 * Werte verliert.
 */
function runApiStateCases(): void {
  for (const testCase of apiStateCases) {
    const envelope = buildApiStateEnvelope(testCase.cache, testCase.requestedKeys, 123456);
    assertEqual(envelope.diagnostics?.missingCount ?? -1, testCase.expectedMissingCount, `${testCase.id} missingCount`);
    for (const key of Object.keys(testCase.expectedValues)) {
      assertEqual(envelope.states[key]?.value, testCase.expectedValues[key], `${testCase.id} value ${key}`);
    }
  }
}

/**
 * Code-Teil: runFeatureVisibilityCases
 *
 * Zweck:
 * Prüft, dass EVCS, Speicherfarm und KI-Berater nur sichtbar werden, wenn die nötigen
 * Aktivierungs- und Nachweisbedingungen erfüllt sind.
 */
function runFeatureVisibilityCases(): void {
  for (const testCase of featureVisibilityCases) {
    const actual = deriveFeatureVisibility(testCase.input);
    for (const key of Object.keys(testCase.expected) as Array<keyof typeof testCase.expected>) {
      assertEqual(actual[key], testCase.expected[key], `${testCase.id} visibility ${String(key)}`);
    }
  }
}

runApiStateCases();
runFeatureVisibilityCases();

console.log(`[ts-api-state-feature] OK: ${apiStateCases.length} API-State-Fälle und ${featureVisibilityCases.length} Feature-Sichtbarkeitsfälle bestanden.`);
