// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-heating-rod-runtime-typing.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-heating-rod-runtime-typing.js
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
 * Original-Hash: 21d4fda74816e1af4a27b9971d4b03a737eee96c27a98adf31b3a125a5b451cb
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
 * Code-Teil: Heizstab Runtime-Typisierungscheck
 *
 * Zweck:
 * Prüft den gezielten TypeScript-Migrationsschritt für
 * `src-ts/runtime-mirrors/ems/modules/heating-rod-control.ts`.
 *
 * Zusammenhang:
 * Die produktive Heizstab-Regelung läuft weiterhin über `ems/modules/heating-rod-control.js`.
 * Diese Prüfung nimmt den TS-Spiegel, entfernt temporär `@ts-nocheck` und kompiliert ihn
 * in einem gelockerten Migrationsmodus. Dadurch sehen wir, ob Adapter-, Geräte-, Stufen-
 * und Speicherreserve-Verträge tragfähig sind, ohne die Runtime umzuschalten.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');
const { spawnTypeScript, writeTypeScriptSpawnDiagnostics } = require('./typescript-invocation');

const repoRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(repoRoot, 'src-ts', 'runtime-mirrors', 'ems', 'modules', 'heating-rod-control.ts');

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
function requireContains(source, marker, label) {
  if (!source.includes(marker)) {
    throw new Error(`[ts-heating-rod-runtime-typing] Missing ${label}: ${marker}`);
  }
}


/**
 * Code-Teil: buildTemporaryCheckFiles
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function buildTemporaryCheckFiles(source) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexowatt-heating-rod-ts-'));
  const tempSource = path.join(tempDir, 'heating-rod-typed-check.ts');
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
  requireContains(source, 'Heating-Rod Runtime-Migrationshinweis (DE)', 'deutscher Heizstab-Migrationskommentar');
  requireContains(source, 'type HeatingRodAdapterLike', 'Adapter-Vertrag');
  requireContains(source, 'type HeatingRodRuntimeDevice', 'Geräte-Vertrag');
  requireContains(source, 'type HeatingRodStageControlState', 'Stufensteuerungs-Vertrag');
  requireContains(source, 'type HeatingRodBudgetProtectState', 'Budgetschutz-Vertrag');
  requireContains(source, 'adapter: HeatingRodAdapterLike;', 'typisiertes Adapter-Feld');
  requireContains(source, '_devices: HeatingRodRuntimeDevice[];', 'typisierte Geräteliste');
  requireContains(source, '_stageCtl: Map<string, HeatingRodStageControlState>;', 'typisierte Stufensteuerung');
  requireContains(source, '_budgetProtect: HeatingRodBudgetProtectState;', 'typisierter Budgetschutz');
  requireContains(source, 'async _applyStageState(d, targetStage, feedback, options: HeatingRodApplyStageOptions = {})', 'typisierte Apply-Stage-Optionen');
  const { tempDir, tempConfig } = buildTemporaryCheckFiles(source);
  const result = spawnTypeScript(repoRoot, ['-p', tempConfig, '--pretty', 'false'], { cwd: repoRoot, encoding: 'utf8' });
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (_e) {}
  if (result.status !== 0) {
    writeTypeScriptSpawnDiagnostics(result);
    throw new Error('[ts-heating-rod-runtime-typing] Heizstab-TS-Spiegel ist ohne @ts-nocheck noch nicht kompilierbar.');
  }
  console.log('[ts-heating-rod-runtime-typing] OK: Heizstab-Spiegel ist gezielt typisiert und in gelockertem Migrationsmodus kompilierbar.');
}

try { main(); } catch (err) { console.error(err && err.message ? err.message : err); process.exit(1); }
