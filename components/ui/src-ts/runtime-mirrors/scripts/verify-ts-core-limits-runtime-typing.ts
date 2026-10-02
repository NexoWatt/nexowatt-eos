// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-core-limits-runtime-typing.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-core-limits-runtime-typing.js
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
 * Original-Hash: e71ee3ca54708fa631bb485ea8f858126ee6a77d5349e0a988283e09aa220303
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
 * Code-Teil: Core-Limits Runtime-Typisierungscheck
 *
 * Zweck:
 * Dieser Check prüft den ersten großen TypeScript-Migrationsschritt für
 * `src-ts/runtime-mirrors/ems/modules/core-limits.ts`.
 *
 * Zusammenhang:
 * Die produktive Runtime läuft weiterhin über `ems/modules/core-limits.js`.
 * Die TS-Spiegeldatei bleibt im normalen Projekt-Typecheck vorerst geschützt,
 * wird hier aber als temporäre Kopie ohne `@ts-nocheck` kompiliert.
 *
 * Wichtig:
 * Der Check arbeitet bewusst mit gelockerten Compiler-Optionen. Ziel von 0.7.89
 * ist nicht die vollständige harte Typisierung der gesamten Datei, sondern der
 * erste überprüfbare Typisierungsabschnitt: Adapter-Vertrag, State-Formen,
 * Budget-Snapshot und Core-Limits-Klasse müssen TypeScript-kompilierbar sein.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');
const { spawnTypeScript, writeTypeScriptSpawnDiagnostics } = require('./typescript-invocation');

const repoRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(repoRoot, 'src-ts', 'runtime-mirrors', 'ems', 'modules', 'core-limits.ts');

/**
 * Code-Teil: requireContains
 *
 * Zweck:
 * Prüft, ob die Core-Limits-Spiegeldatei einen erwarteten Typ- oder Kommentaranker enthält.
 * Dadurch stellen wir sicher, dass der gezielte Typisierungsschritt nicht versehentlich
 * beim Synchronisieren der Runtime-Spiegel wieder entfernt wird.
 */
function requireContains(source, marker, label) {
  if (!source.includes(marker)) {
    throw new Error(`[ts-core-limits-runtime-typing] Missing ${label}: ${marker}`);
  }
}

/**
 * Code-Teil: resolveTypeScriptBinary
 *
 * Zweck:
 * Findet den TypeScript-Compiler. In CI ist `typescript` als devDependency installiert.
 * Lokal kann als Fallback ein vorhandenes `tsc` im PATH genutzt werden.
 */

/**
 * Code-Teil: buildTemporaryCheckFiles
 *
 * Zweck:
 * Erstellt eine temporäre Kopie der Core-Limits-Spiegeldatei ohne `@ts-nocheck`
 * und eine dazu passende, bewusst gelockerte tsconfig. So prüfen wir echte
 * TypeScript-Kompilierbarkeit, ohne den restlichen Adapter schon hart umzustellen.
 */
function buildTemporaryCheckFiles(source) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexowatt-core-limits-ts-'));
  const tempSource = path.join(tempDir, 'core-limits-typed-check.ts');
  const tempConfig = path.join(tempDir, 'tsconfig.json');

  const stripped = source.replace(/^\/\/ @ts-nocheck\r?\n/, '');
  fs.writeFileSync(tempSource, stripped, 'utf8');

  fs.writeFileSync(tempConfig, JSON.stringify({
    extends: path.join(repoRoot, 'tsconfig.base.json'),
    compilerOptions: {
      noEmit: true,
      strict: false,
      noImplicitAny: false,
      noImplicitReturns: false,
      noImplicitOverride: false,
      noUncheckedIndexedAccess: false,
      exactOptionalPropertyTypes: false,
      module: 'NodeNext',
      moduleResolution: 'nodenext',
      allowUnreachableCode: true,
      allowUnusedLabels: true,
      types: []
    },
    files: [tempSource]
  }, null, 2), 'utf8');

  return { tempDir, tempConfig };
}

/**
 * Code-Teil: main
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function main() {
  const source = fs.readFileSync(sourcePath, 'utf8');

  requireContains(source, 'type CoreLimitsAdapterLike', 'Adapter-Vertrag');
  requireContains(source, 'type CoreBudgetSnapshotLike', 'Budget-Snapshot-Vertrag');
  requireContains(source, 'class CoreLimitsModule extends BaseModule', 'CoreLimitsModule-Klasse');
  requireContains(source, 'adapter: CoreLimitsAdapterLike;', 'typisiertes Adapter-Feld');
  requireContains(source, 'CoreBudgetConsumerEntry', 'Consumer-Budget-Vertrag');
  requireContains(source, 'TypeScript-Migrationshinweis (DE)', 'deutscher Migrationskommentar');

  const { tempDir, tempConfig } = buildTemporaryCheckFiles(source);
  const result = spawnTypeScript(repoRoot, ['-p', tempConfig, '--pretty', 'false'], {
    cwd: repoRoot,
    encoding: 'utf8'
  });

  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (_e) {
    // temporäre Prüfdaten sind nicht kritisch; CI zeigt den eigentlichen Compilerfehler vorher.
  }

  if (result.status !== 0) {
    writeTypeScriptSpawnDiagnostics(result);
    throw new Error('[ts-core-limits-runtime-typing] Core-Limits TS mirror is not compilable without @ts-nocheck in relaxed migration mode.');
  }

  console.log('[ts-core-limits-runtime-typing] OK: Core-Limits-Spiegel ist gezielt typisiert und in gelockertem Migrationsmodus kompilierbar.');
}

try {
  main();
} catch (err) {
  console.error(err && err.message ? err.message : err);
  process.exit(1);
}
