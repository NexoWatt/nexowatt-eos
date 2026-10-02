// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-feature-visibility.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-feature-visibility.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Produktive Originalquellen liegen unter
 * src-ts/runtime-executables/ bzw. den im generierten JS genannten TS-Pfaden.
 * Dort ändern, Laufzeit erzeugen und danach die Spiegel synchronisieren.
 * Build-/Prüfskripte ohne TS-Original werden weiterhin unter scripts/ gepflegt.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: 8a4c6cc7ea50ec09dce69f77d99713b7dcba551ea3d4dd7b550e65fb1b8a12bd
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

'use strict';

/**
 * Datei: scripts/verify-ts-feature-visibility.js
 *
 * Zweck:
 * Prüft die neue TypeScript-Vorbereitung für kundenseitige Feature-Sichtbarkeit.
 * Dieser Check braucht keinen TypeScript-Compiler und ist daher für schnelle lokale
 * Prüfungen geeignet.
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

/**
 * Code-Teil: fail
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function fail(message) {
  console.error(`[verify-ts-feature-visibility] ERROR: ${message}`);
  process.exit(1);
}

/**
 * Code-Teil: readRequired
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function readRequired(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) fail(`Pflichtdatei fehlt: ${rel}`);
  return fs.readFileSync(file, 'utf8');
}

/**
 * Code-Teil: requireContains
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function requireContains(rel, needle) {
  const text = readRequired(rel);
  if (!text.includes(needle)) fail(`${rel} enthält erwarteten Inhalt nicht: ${needle}`);
}

requireContains('src-ts/frontend/customer-feature-visibility.ts', 'Code-Teil: explainCustomerFeatureVisibility');
requireContains('src-ts/frontend/customer-feature-visibility.ts', 'Code-Teil: decideEvcsVisibility');
requireContains('src-ts/quality/frontend-feature-visibility-cases.ts', 'no-wallbox-no-farm-stays-hidden');
requireContains('src-ts/frontend/feature-visibility-diagnostics.ts', 'Code-Teil: buildCustomerFeatureDiagnostics');
requireContains('src-ts/tests/frontend-feature-visibility-runtime.ts', 'runFrontendFeatureVisibilityCases');
requireContains('tsconfig.frontend-feature-visibility.json', 'src-ts/tests/frontend-feature-visibility-runtime.ts');
requireContains('www/static/ts-mirrors/frontend/customer-feature-visibility.mjs', 'explainCustomerFeatureVisibility');

const pkg = JSON.parse(readRequired('package.json'));
const scripts = pkg.scripts || {};
for (const key of ['test:feature-visibility', 'test:feature-visibility-runtime']) {
  if (!scripts[key]) fail(`package.json scripts.${key} fehlt.`);
}

console.log('[verify-ts-feature-visibility] OK: Feature-Visibility TS-Vorbereitung vorhanden.');
