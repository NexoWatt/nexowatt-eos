import { buildCustomerFeatureDiagnostics, featureVisibilitySummaryText } from '../frontend/feature-visibility-diagnostics';
import { frontendFeatureVisibilityCases } from '../quality/frontend-feature-visibility-cases';

/**
 * Datei: src-ts/tests/frontend-feature-visibility-runtime.ts
 *
 * Zweck:
 * Laufender TypeScript-Test für die Frontend-Feature-Diagnose.
 *
 * Zusammenhang:
 * Der Test ist noch nicht Teil der produktiven Browser-Runtime. Er beweist aber, dass
 * die neue Diagnosequelle die bekannten Feature-Sichtbarkeitsregeln konsistent erklärt.
 */

/**
 * Code-Teil: assert
 * Zweck: Minimale Testhilfe ohne zusätzliches Testframework.
 */
function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

/**
 * Code-Teil: runFrontendFeatureVisibilityCases
 *
 * Zweck:
 * Prüft, dass sichtbare und ausgeblendete Features korrekt diagnostiziert werden.
 */
function runFrontendFeatureVisibilityCases(): void {
  for (const testCase of frontendFeatureVisibilityCases) {
    const diagnostics = buildCustomerFeatureDiagnostics(testCase.input);
    const visible = diagnostics.filter((item) => item.visible).map((item) => item.feature);
    const hidden = diagnostics.filter((item) => !item.visible).map((item) => item.feature);
    const reasonText = diagnostics.map((item) => item.reasonDe).join(' | ');
    const summary = featureVisibilitySummaryText(diagnostics);

    for (const feature of testCase.expectedVisible) assert(visible.includes(feature as never), `${testCase.id}: ${feature} sollte sichtbar sein`);
    for (const feature of testCase.expectedHidden) assert(hidden.includes(feature as never), `${testCase.id}: ${feature} sollte ausgeblendet sein`);
    assert(reasonText.includes(testCase.expectedReasonPart), `${testCase.id}: erwarteter Begründungsteil fehlt`);
    assert(summary.includes('sichtbar:'), `${testCase.id}: Zusammenfassung fehlt`);
  }
}

runFrontendFeatureVisibilityCases();
console.log(`[ts-frontend-feature-visibility] OK: ${frontendFeatureVisibilityCases.length} Feature-Diagnosefälle bestanden.`);
