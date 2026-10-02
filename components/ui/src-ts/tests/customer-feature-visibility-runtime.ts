import { buildCustomerFeatureVisibility } from '../frontend/customer-feature-visibility';
import { customerFeatureVisibilityCases } from '../quality/customer-feature-visibility-cases';

/**
 * Datei: src-ts/tests/customer-feature-visibility-runtime.ts
 *
 * Zweck:
 * Führt die kundenseitigen Feature-Sichtbarkeitsfälle nach dem TypeScript-Build
 * mit Node aus.
 *
 * Zusammenhang:
 * Diese Tests sind die Vorbereitung für die spätere Migration der verstreuten
 * Sichtbarkeitsregeln aus `www/app.js`, `www/history.js`, `www/cockpit-shell.js`
 * und den Unterseiten. Noch wird keine produktive Runtime umgestellt.
 */

function assertDeepEqual(actual: unknown, expected: unknown, label: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${label}: erwartet ${e}, erhalten ${a}`);
  }
}

/**
 * Code-Teil: runCustomerFeatureVisibilityRuntimeTest
 *
 * Zweck:
 * Prüft jeden fachlichen Sichtbarkeitsfall gegen `buildCustomerFeatureVisibility`.
 *
 * Wichtig:
 * Anlagen ohne Wallbox oder ohne Speicherfarm dürfen diese Bereiche später weder
 * im Dashboard noch in History, Menü oder Unterseiten anzeigen.
 */
export function runCustomerFeatureVisibilityRuntimeTest(): void {
  for (const testCase of customerFeatureVisibilityCases) {
    const actual = buildCustomerFeatureVisibility(testCase.input);
    assertDeepEqual(actual, testCase.expected, testCase.name);
  }
}

runCustomerFeatureVisibilityRuntimeTest();
console.log(`[ts-customer-feature-visibility] OK: ${customerFeatureVisibilityCases.length} Sichtbarkeitsfälle bestanden.`);
