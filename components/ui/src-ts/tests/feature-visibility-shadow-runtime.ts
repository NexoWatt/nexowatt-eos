import { compareFeatureVisibility, formatFeatureVisibilityShadowLog, hasBlockingVisibilityMismatch } from '../frontend/feature-visibility-shadow-compare';
import { featureVisibilityShadowCases } from '../quality/feature-visibility-shadow-cases';

/**
 * Datei: src-ts/tests/feature-visibility-shadow-runtime.ts
 *
 * Zweck:
 * Führt echte Runtime-Prüfungen gegen den Feature-Sichtbarkeitsvergleich aus.
 *
 * Zusammenhang:
 * Dieser Test ist die Sicherheitsvorstufe, bevor wir `www/app.js` später im
 * Shadow-Modus parallel gegen die TS-Sichtbarkeitslogik prüfen lassen.
 */

function fail(message: string): never {
  throw new Error(`[feature-visibility-shadow-runtime] ${message}`);
}

/**
 * Code-Teil: assertCase
 * Zweck: Prüft einen einzelnen Shadow-Vergleich gegen die erwartete Abweichungszahl.
 */
function assertCase(name: string, condition: boolean): void {
  if (!condition) fail(name);
}

for (const item of featureVisibilityShadowCases) {
  const result = compareFeatureVisibility(item.legacy, item.next);
  assertCase(`${item.name}: matches`, result.matches === item.expectedMatches);
  assertCase(`${item.name}: mismatch count`, result.mismatches.length === item.expectedMismatchCount);
  assertCase(`${item.name}: log text`, formatFeatureVisibilityShadowLog(result).length > 0);
  if (!item.expectedMatches) {
    assertCase(`${item.name}: mismatch array`, result.mismatches.length > 0);
  }
}

const blocking = compareFeatureVisibility(
  { hasEvcs: true, hasStorageFarm: true },
  { hasEvcs: false, hasStorageFarm: false }
);
assertCase('Blocking EVCS/Farm-Abweichung muss erkannt werden', hasBlockingVisibilityMismatch(blocking) === true);

console.log('[feature-visibility-shadow-runtime] OK: Feature-Sichtbarkeits-Shadowfälle bestanden.');
