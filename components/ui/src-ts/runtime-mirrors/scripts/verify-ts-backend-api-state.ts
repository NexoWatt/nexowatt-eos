// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-backend-api-state.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-backend-api-state.js
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
 * Original-Hash: 43172d23c4b11b24227f3a59c703297a6357f88e941927e1f8845adfb66a14b1
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
 * Datei: scripts/verify-ts-backend-api-state.js
 *
 * Zweck:
 * Prüft den TypeScript-Migrationsschritt 0.7.63 für Backend-API, StateCache und Feature-Sichtbarkeit.
 *
 * Zusammenhang:
 * Dieser Check läuft ohne TypeScript-Compiler und kann deshalb in `publish:check` bleiben. Der
 * eigentliche Compiler-/Runtime-Test läuft separat über `npm run test:backend-api-state-runtime`.
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

/** Code-Teil: readRequiredFile. Zweck: Bricht verständlich ab, wenn eine Migrationsdatei fehlt. */
function readRequiredFile(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    console.error(`[ts-backend-api-state] Missing file: ${rel}`);
    process.exit(1);
  }
  return fs.readFileSync(file, 'utf8');
}

const files = {
  apiContract: readRequiredFile('src-ts/contracts/api.ts'),
  stateCache: readRequiredFile('src-ts/backend/state-cache/state-cache.ts'),
  apiHelpers: readRequiredFile('src-ts/backend/api-state/api-set-helpers.ts'),
  featureVisibility: readRequiredFile('src-ts/backend/feature-visibility/feature-visibility.ts'),
  cases: readRequiredFile('src-ts/quality/backend-api-state-cases.ts'),
  smoke: readRequiredFile('src-ts/tests/backend-api-state-smoke.ts'),
  runtime: readRequiredFile('src-ts/tests/backend-api-state-runtime.ts'),
  tsconfig: readRequiredFile('tsconfig.backend-api-state.json'),
  packageJson: readRequiredFile('package.json'),
};

const combined = Object.values(files).join('\n');

/** Code-Teil: requireAnchor. Zweck: Hält fachlich wichtige Kommentar- und Funktionsanker stabil. */
function requireAnchor(anchor, description) {
  if (!combined.includes(anchor)) {
    console.error(`[ts-backend-api-state] Missing ${description}: ${anchor}`);
    process.exit(1);
  }
}

for (const [anchor, description] of [
  ['ApiSetRequest', 'API-Set-Vertrag'],
  ['normalizeCachedState', 'StateCache-Normalisierung'],
  ['readNumberFromCache', 'Zahlenleser mit 0-W-Regel'],
  ['planApiStateWrite', 'API-State-Schreibplan'],
  ['buildFeatureVisibilityState', 'Feature-Sichtbarkeit'],
  ['zero-watt-is-valid', 'Regression: 0 W bleibt gültig'],
  ['settings-write-builds-state-id', 'Regression: API-State-ID'],
  ['Code-Teil: readNumberFromCache', 'deutscher Kommentar StateCache'],
  ['Code-Teil: planApiStateWrite', 'deutscher Kommentar API-Set-Helfer'],
  ['Code-Teil: buildFeatureVisibilityState', 'deutscher Kommentar Feature-Sichtbarkeit'],
  ['test:backend-api-state-runtime', 'npm-Runtime-Testskript'],
]) {
  requireAnchor(anchor, description);
}

console.log('[ts-backend-api-state] OK: Backend-API-/StateCache-Struktur und Kommentare vorhanden.');
