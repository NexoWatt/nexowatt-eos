import { ENERGY_FLOW_REGRESSION_CASES } from '../quality/energy-flow-regression-cases';

/**
 * Code-Teil: console-Declaration für isolierten Runtime-Test.
 * Zweck: Das TS-Scaffold bindet bewusst keine globalen Node-Typen ein, damit die
 * Verträge browser-/adapterneutral bleiben. Dieser einzelne Node-Test darf trotzdem
 * eine Erfolgsmeldung ausgeben und deklariert `console` deshalb lokal.
 */
declare const console: { log(message?: unknown, ...optionalParams: unknown[]): void };

/**
 * Datei: src-ts/tests/energy-flow-regression-runtime.ts
 *
 * Zweck:
 * Führt die produktionsnahen Energiefluss-Testfälle aus 0.7.61 wirklich mit Node aus.
 * Die Datei wird dafür durch `tsc` nach JavaScript kompiliert und anschließend gestartet.
 *
 * Zusammenhang:
 * Die produktive Adapter-Runtime nutzt die neuen TypeScript-Resolver noch nicht. Dieser
 * Test stellt aber sicher, dass die vorbereiteten Resolver fachlich korrekt bleiben,
 * bevor wir sie später in `main.js`, `www/app.js`, `core-limits.js` und Heizstablogik
 * produktiv einsetzen.
 */

/**
 * Code-Teil: assertExpectedFields
 *
 * Zweck:
 * Vergleicht nur die Felder, die der jeweilige Regressionstest ausdrücklich erwartet.
 *
 * Warum nicht das ganze Objekt?
 * Die Resolver liefern zusätzliche Diagnosefelder. Diese dürfen sich später erweitern,
 * ohne dass der fachliche Test bricht. Entscheidend sind Leistung, Quelle und DP-Priorität.
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
 * Code-Teil: main
 *
 * Zweck:
 * Läuft über alle Regressionen und bricht mit Fehlercode ab, wenn eine Speicher- oder
 * Netzregel verletzt wird. Damit kann GitHub Actions später exakt an dieser Stelle rot
 * werden, bevor die produktive Laufzeitlogik geändert wird.
 */
for (const testCase of ENERGY_FLOW_REGRESSION_CASES) {
  assertExpectedFields(testCase.id, testCase.actual as unknown as Record<string, unknown>, testCase.expected as unknown as Record<string, unknown>);
}

console.log(`[ts-energy-flow-regression] OK: ${ENERGY_FLOW_REGRESSION_CASES.length} produktionsnahe Energieflussfälle bestanden.`);
