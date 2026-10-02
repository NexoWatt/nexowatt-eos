// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-energy-flow-resolver.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-energy-flow-resolver.js
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
 * Original-Hash: e10c354d80e3cb779809b394a87ae3353c4aa651c19d3d31e57ee52d6599a2ee
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
 * Datei: scripts/verify-ts-energy-flow-resolver.js
 *
 * Zweck:
 * Prüft den neuen TypeScript-Energiefluss-Resolver-Schritt aus 0.7.61.
 *
 * Zusammenhang:
 * `publish:check` bleibt weiterhin ohne TypeScript lauffähig. Dieses Skript ist
 * ein gezielter Migrationscheck und stellt sicher, dass Resolver, Regression-
 * Beispiele und deutsche Kommentaranker vorhanden sind.
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const resolverFile = path.join(root, 'src-ts', 'resolvers', 'energy-flow-resolver.ts');
const regressionFile = path.join(root, 'src-ts', 'tests', 'energy-flow-resolver-regression.ts');
const fixtureFile = path.join(root, 'src-ts', 'test-fixtures', 'energy-flow-resolver.cases.ts');

const errors = [];

/**
 * Code-Teil: requireFile
 * Zweck: Meldet klar, wenn eine Migrationsdatei fehlt.
 */
function requireFile(file) {
  if (!fs.existsSync(file)) errors.push(`Missing file: ${path.relative(root, file)}`);
}

/**
 * Code-Teil: requireText
 * Zweck: Stellt sicher, dass wichtige Funktionen und deutsche Kommentaranker nicht fehlen.
 */
function requireText(file, needle, label) {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes(needle)) errors.push(`Missing ${label}: ${needle}`);
}

requireFile(resolverFile);
requireFile(regressionFile);
requireFile(fixtureFile);

requireText(resolverFile, 'Code-Teil: resolveStorageFlow', 'storage resolver comment');
requireText(resolverFile, 'export function resolveStorageFlow', 'resolveStorageFlow export');
requireText(resolverFile, 'export function resolveGridFlow', 'resolveGridFlow export');
requireText(resolverFile, 'export function calculateBuildingLoadFromBalance', 'building load resolver export');
requireText(resolverFile, 'Bilanz-Fallback bleibt gesperrt', 'configured DP fallback guard');
requireText(regressionFile, 'splitStorageZeroIsValid', 'split storage zero regression case');
requireText(regressionFile, 'configuredDpBlocksFallback', 'configured DP blocks fallback regression case');
requireText(fixtureFile, 'Fallback wird nur ohne konfigurierten Speicher-DP genutzt', 'fixture fallback case');

if (errors.length) {
  console.error('[ts-energy-flow-resolver] FAILED');
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log('[ts-energy-flow-resolver] OK');
