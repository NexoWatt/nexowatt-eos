// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-feature-visibility-resolver.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-feature-visibility-resolver.js
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
 * Original-Hash: 04ab26e71cef00016b7306e198db3861c93940e43f8f7077629de348099f7197
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
 * Datei: scripts/verify-ts-feature-visibility-resolver.js
 *
 * Zweck:
 * Strukturprüfung für den TypeScript-Schritt 0.7.68.
 *
 * Zusammenhang:
 * Dieser Check verhindert, dass der zentrale Feature-Sichtbarkeitsresolver oder seine
 * Regressionen versehentlich aus dem Projekt verschwinden.
 */

const root = path.join(__dirname, '..');
const requiredFiles = [
  'src-ts/resolvers/feature-visibility-resolver.ts',
  'src-ts/quality/feature-visibility-resolver-cases.ts',
  'src-ts/tests/feature-visibility-resolver-runtime.ts',
  'tsconfig.feature-visibility-resolver.json',
];

for (const rel of requiredFiles) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) throw new Error(`[ts-feature-visibility-resolver] Datei fehlt: ${rel}`);
}

const resolverSource = fs.readFileSync(path.join(root, 'src-ts/resolvers/feature-visibility-resolver.ts'), 'utf8');
const casesSource = fs.readFileSync(path.join(root, 'src-ts/quality/feature-visibility-resolver-cases.ts'), 'utf8');
const runtimeSource = fs.readFileSync(path.join(root, 'src-ts/tests/feature-visibility-resolver-runtime.ts'), 'utf8');

const anchors = [
  [resolverSource, 'Code-Teil: hasRealEvcsPresenceProof'],
  [resolverSource, 'Code-Teil: hasRealStorageFarmPresenceProof'],
  [resolverSource, 'Code-Teil: deriveCustomerFeatureVisibility'],
  [casesSource, 'anlage-ohne-wallbox-und-ohne-farm'],
  [casesSource, 'wetter-braucht-daten'],
  [runtimeSource, 'Code-Teil: runCentralResolverCases'],
  [runtimeSource, 'Code-Teil: runCompatibilityExports'],
];

for (const [source, needle] of anchors) {
  if (!source.includes(needle)) throw new Error(`[ts-feature-visibility-resolver] Kommentar-/Funktionsanker fehlt: ${needle}`);
}

console.log('[ts-feature-visibility-resolver] OK: Feature-Sichtbarkeitsresolver und Regressionen vorhanden.');
