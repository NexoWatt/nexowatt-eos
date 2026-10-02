import { ADAPTER_STATE_API_CASES } from '../quality/adapter-state-api-cases';

/**
 * Code-Teil: console-Declaration für isolierten Runtime-Test.
 * Zweck: Das TS-Scaffold bindet bewusst keine globalen Node-Typen ein. Dieser Runtime-Test
 * deklariert `console` lokal, damit keine Node-Typen als Pflicht entstehen.
 */
declare const console: { log(message?: unknown, ...optionalParams: unknown[]): void };

/**
 * Datei: src-ts/tests/adapter-state-api-runtime.ts
 *
 * Zweck:
 * Führt die Adapter-State-/API-Regressionen tatsächlich mit Node aus.
 *
 * Zusammenhang:
 * Diese Tests sichern den späteren Umbau von `main.js`-API-Teilen ab.
 */
for (const testCase of ADAPTER_STATE_API_CASES) {
  if (testCase.actual !== testCase.expected) {
    throw new Error(`${testCase.id}: erwartet ${String(testCase.expected)}, erhalten ${String(testCase.actual)}`);
  }
}

console.log(`[ts-adapter-state-api] OK: ${ADAPTER_STATE_API_CASES.length} Adapter-State-/API-Fälle bestanden.`);
