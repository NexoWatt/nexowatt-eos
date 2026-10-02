// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-api-state-feature.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-api-state-feature.js
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
 * Original-Hash: e189b3369cc26fb8004805ce68c60484b2ae4508d3a8798c7d39d5b57a0427f2
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

const fs = require('fs');
const path = require('path');

/**
 * Datei: scripts/verify-ts-api-state-feature.js
 *
 * Zweck:
 * Strukturcheck für den TypeScript-Migrationsschritt 0.7.63.
 */
const root = path.join(__dirname, '..');
const requiredFiles = [
  'src-ts/contracts/api-state.ts',
  'src-ts/backend/state/api-state-cache.ts',
  'src-ts/backend/state/index.ts',
  'src-ts/backend/visibility/feature-visibility.ts',
  'src-ts/backend/visibility/index.ts',
  'src-ts/quality/api-state-feature-cases.ts',
  'src-ts/tests/api-state-feature-runtime.ts',
  'src-ts/tests/api-state-feature-smoke.ts',
  'tsconfig.api-state-feature.json',
];
for (const rel of requiredFiles) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) throw new Error(`[ts-api-state-feature] Datei fehlt: ${rel}`);
}
const apiStateSource = fs.readFileSync(path.join(root, 'src-ts/backend/state/api-state-cache.ts'), 'utf8');
const visibilitySource = fs.readFileSync(path.join(root, 'src-ts/backend/visibility/feature-visibility.ts'), 'utf8');
const runtimeSource = fs.readFileSync(path.join(root, 'src-ts/tests/api-state-feature-runtime.ts'), 'utf8');
const requiredAnchors = [
  [apiStateSource, 'Code-Teil: extractPayloadValue'],
  [apiStateSource, "`0`, `false` und `''` bleiben gültige Werte"],
  [apiStateSource, 'Code-Teil: buildApiStateEnvelope'],
  [visibilitySource, 'Code-Teil: deriveFeatureVisibility'],
  [visibilitySource, 'EVCS zählt nur mit echtem Ladepunktnachweis'],
  [runtimeSource, 'Code-Teil: runApiStateCases'],
  [runtimeSource, 'Code-Teil: runFeatureVisibilityCases'],
];
for (const [source, needle] of requiredAnchors) {
  if (!source.includes(needle)) throw new Error(`[ts-api-state-feature] Kommentar-/Funktionsanker fehlt: ${needle}`);
}
console.log('[ts-api-state-feature] OK: API-State- und Feature-Sichtbarkeits-TS-Struktur vorhanden.');
