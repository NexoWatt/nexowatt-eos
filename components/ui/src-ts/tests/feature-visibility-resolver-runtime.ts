import { deriveFeatureVisibility } from '../backend/visibility/feature-visibility';
import { buildCustomerFeatureVisibility } from '../frontend/customer-feature-visibility';
import { deriveCustomerFeatureVisibility } from '../resolvers/feature-visibility-resolver';
import { featureVisibilityResolverCases } from '../quality/feature-visibility-resolver-cases';

/**
 * Datei: src-ts/tests/feature-visibility-resolver-runtime.ts
 *
 * Zweck:
 * Laufender Regressionstest für die gemeinsame Feature-Sichtbarkeit.
 *
 * Zusammenhang:
 * Der Test prüft nicht nur den zentralen Resolver, sondern auch die bestehenden Frontend-
 * und Backend-Kompatibilitätsfunktionen. Damit sehen wir sofort, wenn eine Seite wieder
 * andere Regeln nutzt als die andere.
 */

/** Kleine Testhilfe ohne externes Testframework. */
function assertEqual(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) throw new Error(`${message}: erwartet ${String(expected)}, erhalten ${String(actual)}`);
}

/**
 * Code-Teil: assertVisibility
 *
 * Zweck:
 * Vergleicht ein Sichtbarkeitsergebnis vollständig mit dem erwarteten Vertrag.
 */
function assertVisibility(actual: ReturnType<typeof deriveCustomerFeatureVisibility>, expected: ReturnType<typeof deriveCustomerFeatureVisibility>, id: string): void {
  assertEqual(actual.hasEvcs, expected.hasEvcs, `${id} hasEvcs`);
  assertEqual(actual.hasStorageFarm, expected.hasStorageFarm, `${id} hasStorageFarm`);
  assertEqual(actual.hasSmartHome, expected.hasSmartHome, `${id} hasSmartHome`);
  assertEqual(actual.hasWeather, expected.hasWeather, `${id} hasWeather`);
  assertEqual(actual.hasAiAdvisor, expected.hasAiAdvisor, `${id} hasAiAdvisor`);
}

/**
 * Code-Teil: runCentralResolverCases
 *
 * Zweck:
 * Prüft die zentrale Regelmatrix gegen alle produktnahen Feature-Fälle.
 */
function runCentralResolverCases(): void {
  for (const testCase of featureVisibilityResolverCases) {
    const actual = deriveCustomerFeatureVisibility(testCase.input);
    assertVisibility(actual, testCase.expected, testCase.id);
  }
}

/**
 * Code-Teil: runCompatibilityExports
 *
 * Zweck:
 * Prüft, dass Frontend- und Backend-Vorbereitung dieselbe Regel verwenden.
 */
function runCompatibilityExports(): void {
  const withAllProofs = featureVisibilityResolverCases.find((testCase) => testCase.id === 'alle-features-mit-nachweisen-sichtbar');
  if (!withAllProofs) throw new Error('Testfall alle-features-mit-nachweisen-sichtbar fehlt.');

  const frontend = buildCustomerFeatureVisibility({
    evcsProofs: withAllProofs.input.evcsProofs,
    storageFarmEnabled: withAllProofs.input.storageFarmEnabled,
    storageFarmProofs: withAllProofs.input.storageFarmProofs,
    smartHomeEnabled: withAllProofs.input.smartHomeEnabled,
    weatherEnabled: withAllProofs.input.weatherEnabled,
    weatherHasData: withAllProofs.input.weatherHasData,
    aiAdvisorInstalled: withAllProofs.input.aiAdvisorInstalled,
    aiAdvisorCustomerEnabled: withAllProofs.input.aiAdvisorCustomerEnabled,
  });
  assertVisibility(frontend, withAllProofs.expected, 'frontend-kompatibilität');

  const backend = deriveFeatureVisibility({
    evcsEnabled: withAllProofs.input.evcsEnabled,
    evcsProofs: withAllProofs.input.evcsProofs as any,
    storageFarmEnabled: withAllProofs.input.storageFarmEnabled,
    storageFarmProofs: withAllProofs.input.storageFarmProofs as any,
    smartHomeEnabled: withAllProofs.input.smartHomeEnabled,
    weatherEnabled: withAllProofs.input.weatherEnabled,
    aiAdvisorAppEnabled: withAllProofs.input.aiAdvisorInstalled,
    aiAdvisorCustomerEnabled: withAllProofs.input.aiAdvisorCustomerEnabled,
  });
  assertVisibility(backend, withAllProofs.expected, 'backend-kompatibilität');
}

runCentralResolverCases();
runCompatibilityExports();

console.log(`[ts-feature-visibility-resolver] OK: ${featureVisibilityResolverCases.length} Sichtbarkeitsfälle bestanden.`);
