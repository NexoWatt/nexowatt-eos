import type { EnergyFlowRegressionCase } from '../quality/energy-flow-regression-cases';
import { ENERGY_FLOW_REGRESSION_CASES, ENERGY_FLOW_REGRESSION_SUMMARY } from '../quality/energy-flow-regression-cases';

/**
 * Datei: src-ts/tests/energy-flow-regression-smoke.ts
 *
 * Zweck:
 * Compile-only-Test für die produktionsnahen Energiefluss-Regressionsfälle.
 *
 * Zusammenhang:
 * Solange die produktive Runtime noch JavaScript nutzt, prüfen wir hier zunächst die
 * Typverträge und Teststruktur. Bei der späteren Resolver-Migration werden aus diesen
 * Fällen echte Unit-Tests mit Vergleich von `actual` und `expected`.
 */

/**
 * Code-Teil: assertRegressionCaseList
 *
 * Zweck:
 * Erzwingt, dass die Regressionstabelle typisiert bleibt und nicht versehentlich in
 * eine lose `any`-Struktur abrutscht.
 */
function assertRegressionCaseList(cases: readonly EnergyFlowRegressionCase[]): number {
  return cases.length;
}

/**
 * Code-Teil: smokeCaseCount
 *
 * Zweck:
 * Nutzt die Regressionstabelle im TypeScript-Compilerlauf. Dadurch werden Importpfade,
 * Typen und Konstanten bereits vor produktiver Verdrahtung geprüft.
 */
export const smokeCaseCount = assertRegressionCaseList(ENERGY_FLOW_REGRESSION_CASES);

/**
 * Code-Teil: smokeSummaryCount
 *
 * Zweck:
 * Stellt sicher, dass auch die maschinenlesbare Zusammenfassung typisiert verfügbar ist.
 */
export const smokeSummaryCount: number = ENERGY_FLOW_REGRESSION_SUMMARY.count;
