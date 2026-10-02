import { EMS_BUDGET_REGRESSION_CASES, HEATING_ROD_REGRESSION_CASES } from '../quality/ems-budget-heating-rod-cases';

/**
 * Code-Teil: console-Declaration für isolierten Runtime-Test.
 * Zweck: Das TS-Scaffold bindet bewusst keine globalen Node-Typen ein. Dieser Runtime-
 * Test darf trotzdem eine Erfolgsmeldung ausgeben und deklariert `console` lokal.
 */
declare const console: { log(message?: unknown, ...optionalParams: unknown[]): void; error(message?: unknown, ...optionalParams: unknown[]): void };

/**
 * Datei: src-ts/tests/ems-budget-heating-rod-runtime.ts
 *
 * Zweck:
 * Führt die TypeScript-Regressionen für Core-Limits und Heizstab tatsächlich mit Node aus.
 *
 * Zusammenhang:
 * Diese Tests sichern die nächste geplante Migration ab: `core-limits.js` und
 * `heating-rod-control.js` sollen später nicht blind umgebaut werden, sondern gegen diese
 * fachlichen Fälle geprüft werden.
 */

/**
 * Code-Teil: assertExpectedFields
 * Zweck: Vergleicht nur die fachlich relevanten Felder eines Testfalls.
 */
function assertExpectedFields(testId: string, actual: Record<string, unknown>, expected: Record<string, unknown>): void {
  for (const [key, expectedValue] of Object.entries(expected)) {
    const actualValue = actual[key];
    if (actualValue !== expectedValue) {
      throw new Error(`${testId}: Feld ${key} erwartet ${String(expectedValue)}, erhalten ${String(actualValue)}`);
    }
  }
}

/**
 * Code-Teil: Budget-Regressionen ausführen.
 * Zweck: Schützt PV-/Netz-/Speicherreservebudgets vor späteren TypeScript-Umbauten.
 */
for (const testCase of EMS_BUDGET_REGRESSION_CASES) {
  assertExpectedFields(testCase.id, testCase.actual, testCase.expected);
}

/**
 * Code-Teil: Heizstab-Regressionen ausführen.
 * Zweck: Schützt Stufenauswahl und Speicherreserve vor späteren TypeScript-Umbauten.
 */
for (const testCase of HEATING_ROD_REGRESSION_CASES) {
  assertExpectedFields(testCase.id, testCase.actual, testCase.expected);
}

console.log(`[ts-ems-budget-heating-rod] OK: ${EMS_BUDGET_REGRESSION_CASES.length + HEATING_ROD_REGRESSION_CASES.length} Core-Limits-/Heizstabfälle bestanden.`);
