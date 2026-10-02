// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-energy-flow-regression-cases.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-energy-flow-regression-cases.js
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
 * Original-Hash: ef6d0117c55f7731f7a700e9b65f60b89336fe11507355e449228f389799cd8c
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
 * Datei: scripts/verify-energy-flow-regression-cases.js
 *
 * Zweck:
 * Prüft die Struktur des Migrationsschritts 0.7.61.
 *
 * Zusammenhang:
 * `publish:check` muss ohne TypeScript-Build laufen. Darum kontrolliert dieses Script
 * nur, ob die produktionsnahen Energiefluss-Regressionsfälle, Runtime-Testdatei,
 * deutsche Kommentaranker und npm-Skripte vorhanden sind.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

/**
 * Code-Teil: read
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) throw new Error(`Datei fehlt: ${rel}`);
  return fs.readFileSync(file, 'utf8');
}

/**
 * Code-Teil: Pflichtdateien prüfen.
 * Zweck: Stellt sicher, dass die neuen Regressionen im Paket und im Repository bleiben.
 */
const casesTs = read('src-ts/quality/energy-flow-regression-cases.ts');
const runtimeTs = read('src-ts/tests/energy-flow-regression-runtime.ts');
const packageJson = JSON.parse(read('package.json'));
read('tsconfig.energy-flow-regression.json');

/**
 * Code-Teil: fachliche Mindestanker prüfen.
 * Zweck: Diese Anker stehen für konkrete Fehlerklassen, die wir bei Speicher-/Netz-DPs
 * nicht wieder in den Adapter zurückholen dürfen.
 */
const requiredAnchors = [
  'storage-signed-positive-discharge',
  'storage-signed-charge-negative',
  'storage-split-zero-is-valid',
  'storage-balance-fallback-standby',
  'storage-split-beats-calculated',
  'grid-signed-positive-import',
  '0-Wert fälschlich als fehlend',
  'History/EMS echte Speicher-DPs durch Bilanzrechnung überschreibt',
  'Code-Teil: ENERGY_FLOW_REGRESSION_CASES',
  'Code-Teil: assertExpectedFields',
];

const combined = `${casesTs}\n${runtimeTs}`;
const missing = requiredAnchors.filter((anchor) => !combined.includes(anchor));
if (missing.length) {
  console.error('[energy-flow-regression-cases] Fehlende Anker:');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

/**
 * Code-Teil: npm-Skripte prüfen.
 * Zweck: Der Regressionstest muss über CI und lokal aufrufbar bleiben.
 */
const scripts = packageJson.scripts || {};
const requiredScripts = [
  'test:energy-flow-regressions',
  'test:energy-flow-regression-runtime',
];
const missingScripts = requiredScripts.filter((script) => !scripts[script]);
if (missingScripts.length) {
  console.error('[energy-flow-regression-cases] Fehlende npm-Skripte:');
  for (const item of missingScripts) console.error(`- ${item}`);
  process.exit(1);
}

console.log('[energy-flow-regression-cases] OK: Regressionstest-Struktur und Kommentare vorhanden.');
