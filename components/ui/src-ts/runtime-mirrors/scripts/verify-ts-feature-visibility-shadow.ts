// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-feature-visibility-shadow.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-feature-visibility-shadow.js
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
 * Original-Hash: ce093751677bb92c2ca3b2127d8f42250ad598b2ea18f885d0684c4dc106fdcf
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
 * Datei: scripts/verify-ts-feature-visibility-shadow.js
 *
 * Zweck:
 * Prüft die vorbereitete Feature-Sichtbarkeits-Shadow-Schicht.
 *
 * Zusammenhang:
 * Diese Prüfung stellt sicher, dass die spätere Vergleichslogik zwischen alter
 * JS-Sichtbarkeit und neuer TS-Sichtbarkeit vorhanden, kommentiert und testbar ist.
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
  console.error(`[verify-ts-feature-visibility-shadow] ERROR: ${message}`);
  process.exit(1);
}

/**
 * Code-Teil: requireFile
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function requireFile(rel) {
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
  const text = requireFile(rel);
  if (!text.includes(needle)) fail(`${rel} enthält erwarteten Inhalt nicht: ${needle}`);
  return text;
}

requireContains('src-ts/frontend/feature-visibility-shadow-compare.ts', 'Code-Teil: compareFeatureVisibility');
requireContains('src-ts/frontend/feature-visibility-shadow-compare.ts', 'Code-Teil: hasBlockingVisibilityMismatch');
requireContains('src-ts/frontend/feature-visibility-shadow-compare.ts', 'Code-Teil: formatFeatureVisibilityShadowLog');
requireContains('src-ts/quality/feature-visibility-shadow-cases.ts', 'featureVisibilityShadowCases');
requireContains('src-ts/tests/feature-visibility-shadow-runtime.ts', 'Feature-Sichtbarkeits-Shadowfälle');
requireContains('tsconfig.feature-visibility-shadow.json', 'feature-visibility-shadow-runtime.ts');
requireContains('www/static/ts-mirrors/frontend/feature-visibility-shadow-compare.mjs', 'AUTO-GENERATED FILE');

console.log('[verify-ts-feature-visibility-shadow] OK: Feature-Visibility-Shadow-Schicht ist vorhanden.');
