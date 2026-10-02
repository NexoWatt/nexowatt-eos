/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Prüft Struktur und Konsistenz der TypeScript-Migrations- und Build-Grundlagen.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/scripts/ts-scaffold-rules.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Datei: src-ts/scripts/ts-scaffold-rules.ts
 *
 * Zweck:
 * Diese Datei ist der zweite kleine JavaScript-zu-TypeScript-Migrationsschritt
 * im Wartungsbereich. Sie kapselt die Regeln, mit denen wir prüfen, ob die
 * TypeScript-Migrationsbasis vollständig und ungefährlich bleibt.
 *
 * Zusammenhang im Projekt:
 * - `scripts/verify-ts-scaffold.js` ist das Node.js-Laufzeitskript.
 * - `scripts/ts-scaffold-rules.js` ist die JS-Spiegeldatei für lokale Checks
 *   ohne vorherigen TypeScript-Build.
 * - Diese TypeScript-Datei ist die typisierte, kommentierte Quelle für die
 *   spätere vollständige Migration der Wartungsskripte.
 *
 * Wichtig für spätere Änderungen:
 * - Diese Regeln dürfen keine produktive Adapterlogik laden.
 * - `src-ts/**` darf noch nicht direkt aus `main.js`, `www/**`, `ems/**` oder
 *   `admin/**` importieren, damit die Typverträge runtime-frei bleiben.
 * - Neue Regeln hier zuerst verständlich kommentieren und dann in der
 *   JS-Spiegeldatei synchron nachziehen.
 */

/** Ergebnis einer einzelnen Scaffold-Regel. */
export interface TsScaffoldRuleResult {
  /** `true`, wenn die Regel bestanden wurde. */
  ok: boolean;

  /** Deutsche Fehlermeldung, wenn die Regel nicht bestanden wurde. */
  message?: string;
}

/** Minimaler `package.json`-Ausschnitt für Skriptprüfungen. */
export interface PackageJsonScriptsShape {
  scripts?: Record<string, string | undefined>;
}

/** Minimaler `tsconfig.json`-Ausschnitt für Include-Prüfungen. */
export interface TsConfigShape {
  include?: unknown;
  compilerOptions?: Record<string, unknown>;
}

/** Zusätzliche Prüfstatistik für Konsolenausgaben. */
export interface TsScaffoldCheckStats {
  /** Anzahl gefundener TypeScript-Dateien unter `src-ts`. */
  srcTsFileCount: number;

  /** Anzahl geprüfter Pflichtdateien. */
  requiredFileCount: number;
}

/** Gesamtergebnis des Scaffold-Regelblocks. */
export interface TsScaffoldCheckResult {
  /** Alle gesammelten Fehlermeldungen. Leeres Array bedeutet OK. */
  errors: string[];

  /** Kennzahlen für menschlich lesbare Ausgaben im CLI-Skript. */
  stats: TsScaffoldCheckStats;
}

/** Pflichtdateien der aktuellen TypeScript-Migrationsbasis. */
export const defaultRequiredTsScaffoldFiles: readonly string[] = [
  'tsconfig.json',
  'tsconfig.base.json',
  'tsconfig.build.json',
  'tsconfig.contracts.json',
  'tsconfig.backend.json',
  'tsconfig.frontend.json',
  'src-ts/contracts/index.ts',
  'src-ts/contracts/energy-flow.ts',
  'src-ts/contracts/features.ts',
  'src-ts/contracts/ai-advisor.ts',
  'src-ts/contracts/license.ts',
  'src-ts/contracts/datapoints.ts',
  'src-ts/contracts/iobroker-states.ts',
  'src-ts/contracts/testing.ts',
  'src-ts/scripts/publish-check-rules.ts',
  'src-ts/scripts/ts-scaffold-rules.ts',
  'scripts/publish-check-runner.js',
  'scripts/publish-check-plan.json',
  'src-ts/tests/contracts-smoke.ts',
  'src-ts/tests/publish-check-rules-smoke.ts',
  'src-ts/tests/ts-scaffold-rules-smoke.ts',
];

/** Pflichtskripte, die während der TS-Migration vorhanden bleiben müssen. */
export const defaultRequiredPackageScripts: readonly string[] = [
  'typecheck',
  'test:types',
  'build:types',
  'test:contracts',
  'test:ts-scaffold',
  'test:all',
  'test:publish-check-runner',
];

/**
 * Code-Teil: ok
 *
 * Zweck:
 * Erzeugt ein erfolgreiches Regelergebnis. Dadurch bleiben alle Regel-Funktionen
 * gleich aufgebaut und später leicht testbar.
 */
export function ok(): TsScaffoldRuleResult {
  return { ok: true };
}

/**
 * Code-Teil: error
 *
 * Zweck:
 * Erzeugt ein fehlgeschlagenes Regelergebnis mit deutscher Fehlermeldung. Diese
 * Meldung wird im CLI-Skript eins zu eins für Entwickler ausgegeben.
 */
export function error(message: string): TsScaffoldRuleResult {
  return { ok: false, message };
}

/**
 * Code-Teil: fileExists
 *
 * Zweck:
 * Prüft eine Datei relativ zum Projektwurzelordner. Die Funktion kapselt den
 * Pfadaufbau, damit die eigentlichen Regeln leichter verständlich bleiben.
 */
export function fileExists(rootDir: string, relativeFile: string): boolean {
  return fs.existsSync(path.join(rootDir, relativeFile));
}

/**
 * Code-Teil: requireScaffoldFiles
 *
 * Zweck:
 * Prüft, ob alle Pflichtdateien der TypeScript-Migrationsbasis vorhanden sind.
 *
 * Zusammenhang:
 * Wenn hier eine Datei fehlt, ist die TS-Grundstruktur unvollständig und spätere
 * Migrationsschritte können nicht sauber auf den Typverträgen aufbauen.
 */
export function requireScaffoldFiles(rootDir: string, files: readonly string[] = defaultRequiredTsScaffoldFiles): TsScaffoldRuleResult[] {
  const results: TsScaffoldRuleResult[] = [];
  for (const file of files) {
    if (!fileExists(rootDir, file)) results.push(error(`Missing required file: ${file}`));
  }
  return results.length ? results : [ok()];
}

/**
 * Code-Teil: requirePackageScripts
 *
 * Zweck:
 * Prüft die npm-Skripte, die für Typecheck, Contract-Test und Scaffold-Test
 * benötigt werden.
 *
 * Zusammenhang:
 * Diese Skripte sind unser Sicherheitsnetz. Ohne sie könnten GitHub/CI und
 * lokale Entwickler nicht zuverlässig erkennen, ob die TS-Basis noch intakt ist.
 */
export function requirePackageScripts(pkg: PackageJsonScriptsShape, scriptNames: readonly string[] = defaultRequiredPackageScripts): TsScaffoldRuleResult[] {
  const scripts = pkg.scripts || {};
  const results: TsScaffoldRuleResult[] = [];
  for (const scriptName of scriptNames) {
    if (!scripts[scriptName]) results.push(error(`Missing package.json script: ${scriptName}`));
  }
  return results.length ? results : [ok()];
}

/**
 * Code-Teil: requirePublishCheckStartsWithTypeSafety
 *
 * Zweck:
 * Stellt sicher, dass `npm publish` ausschließlich den unveränderlichen,
 * dependency-freien Artefaktstand prüft und der vollständige Entwicklungscheck
 * weiterhin separat über den kurzen, Windows-kompatiblen Runner verfügbar ist.
 * Dessen geordneter Plan muss zuerst die DevDependency-Vorprüfung sowie
 * unmittelbar danach den vollständigen TypeScript-Check ausführen.
 *
 * Zusammenhang:
 * Die frühere 9-kB-`&&`-Kette überschritt unter Windows die Grenze von cmd.exe.
 * Gleichzeitig darf der kundennahe Direkt-Publish weder `npm ci` noch lokale
 * Compiler-/Entwicklungstests benötigen. Die vollständigen Prüfungen liegen
 * deshalb in `scripts/publish-check-plan.json` und werden über
 * `test:release:full` einzeln ausgeführt; `publish:check` bleibt read-only.
 */
export function requirePublishCheckStartsWithTypeSafety(rootDir: string, pkg: PackageJsonScriptsShape): TsScaffoldRuleResult {
  const scripts = pkg.scripts || {};
  const publishCheck = String(scripts['publish:check'] || '').trim();
  const fullCheck = String(scripts['test:release:full'] || '').trim();
  const expectedArtifactCheck = 'node scripts/verify-release-artifact.js';
  const expectedRunner = 'node scripts/publish-check-runner.js';
  if (publishCheck !== expectedArtifactCheck) {
    return error(`publish:check must use the immutable read-only artifact verifier: ${expectedArtifactCheck}`);
  }
  if (fullCheck !== expectedRunner) {
    return error(`test:release:full must use the Windows-safe runner: ${expectedRunner}`);
  }

  let commands: string[] = [];
  try {
    const planPath = path.join(rootDir, 'scripts', 'publish-check-plan.json');
    const plan = JSON.parse(fs.readFileSync(planPath, 'utf8')) as { schemaVersion?: unknown; expectedStepCount?: unknown; commands?: unknown };
    if (plan.schemaVersion !== 1 || !Array.isArray(plan.commands)) {
      return error('scripts/publish-check-plan.json must use schemaVersion=1 and contain a commands array.');
    }
    commands = plan.commands.map((command) => String(command || '').trim().replace(/\s+/g, ' '));
    if (plan.expectedStepCount !== commands.length) {
      return error('publish-check-plan expectedStepCount must match the commands array length.');
    }
  } catch (err) {
    return error(`publish-check plan could not be read: ${err instanceof Error ? err.message : String(err)}`);
  }

  const dependencyCheck = 'node scripts/ensure-publish-dev-deps.js';
  const typecheckCommand = 'npm run typecheck';
  if (commands[0] !== dependencyCheck) {
    return error('publish-check plan must start with node scripts/ensure-publish-dev-deps.js.');
  }
  if (commands[1] !== typecheckCommand) {
    return error('publish-check plan must run npm run typecheck immediately after the DevDependency preflight.');
  }
  if (commands.filter((command) => command === dependencyCheck).length !== 1) {
    return error('publish-check plan must contain the DevDependency preflight exactly once.');
  }
  if (commands.filter((command) => command === typecheckCommand).length !== 1) {
    return error('publish-check plan must contain npm run typecheck exactly once.');
  }
  return ok();
}

/**
 * Code-Teil: requireTsconfigIncludesSrcTs
 *
 * Zweck:
 * Prüft, ob `tsconfig.json` den neuen TypeScript-Quellordner `src-ts` mit allen TS-Dateien
 * erfasst.
 *
 * Zusammenhang:
 * Ohne dieses Include würden neue Typverträge nicht vom Typecheck geprüft.
 */
export function requireTsconfigIncludesSrcTs(tsconfig: TsConfigShape): TsScaffoldRuleResult {
  const include = Array.isArray(tsconfig.include) ? tsconfig.include.map(String) : [];
  return include.includes('src-ts/**/*.ts') ? ok() : error('tsconfig.json must include src-ts/**/*.ts');
}

/**
 * Code-Teil: requireBuildConfigDeclarationsOnly
 *
 * Zweck:
 * Prüft, dass der TypeScript-Build aktuell nur Deklarationen erzeugt.
 *
 * Zusammenhang:
 * Wir wollen in dieser Migrationsphase noch keine produktive Laufzeitlogik aus
 * TypeScript bauen. Darum muss `tsconfig.build.json` `emitDeclarationOnly` und
 * `declaration` aktiv haben.
 */
export function requireBuildConfigDeclarationsOnly(buildConfig: TsConfigShape): TsScaffoldRuleResult[] {
  const options = buildConfig.compilerOptions || {};
  const results: TsScaffoldRuleResult[] = [];
  if (options.emitDeclarationOnly !== true) results.push(error('tsconfig.build.json must set compilerOptions.emitDeclarationOnly=true.'));
  if (options.declaration !== true) results.push(error('tsconfig.build.json must set compilerOptions.declaration=true.'));
  return results.length ? results : [ok()];
}

/**
 * Code-Teil: collectSrcTsFiles
 *
 * Zweck:
 * Sammelt alle TypeScript-Dateien unter `src-ts`. Das ist die Grundlage für
 * Strukturprüfungen, z. B. die verbotenen Runtime-Imports.
 */
export function collectSrcTsFiles(rootDir: string): string[] {
  const base = path.join(rootDir, 'src-ts');
  const files: string[] = [];
  if (!fs.existsSync(base)) return files;

  const walk = (dir: string): void => {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const stat = (fs as unknown as { statSync: (file: string) => { isDirectory: () => boolean; isFile: () => boolean } }).statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (stat.isFile() && full.endsWith('.ts')) files.push(full);
    }
  };

  walk(base);
  return files.sort();
}

/**
 * Code-Teil: requireMinimumSrcTsFiles
 *
 * Zweck:
 * Verhindert, dass die TS-Basis versehentlich fast leer ausgeliefert wird.
 *
 * Zusammenhang:
 * Dieser Check ist absichtlich grob. Er ersetzt keinen Typecheck, merkt aber
 * sofort, wenn `src-ts` beim Packen oder Umbauen fehlt.
 */
export function requireMinimumSrcTsFiles(srcTsFiles: readonly string[], minimum = 8): TsScaffoldRuleResult {
  return srcTsFiles.length >= minimum ? ok() : error(`Expected several TypeScript files, found only ${srcTsFiles.length}.`);
}

/**
 * Code-Teil: requireNoRuntimeImportsFromSrcTs
 *
 * Zweck:
 * Prüft, dass `src-ts` noch keine produktiven Runtime-Dateien direkt importiert.
 *
 * Zusammenhang:
 * In dieser Phase sind die TypeScript-Dateien Verträge, Tests und Wartungslogik.
 * Direkte Imports aus `main.js`, `www/**`, `ems/**` oder `admin/**` würden den
 * Scaffold mit der Laufzeit vermischen und könnten später unbemerkt Logik ändern.
 */
export function requireNoRuntimeImportsFromSrcTs(rootDir: string, srcTsFiles: readonly string[]): TsScaffoldRuleResult[] {
  const runtimeImportPattern = /\.\.\/\.\.\/(main|www|ems|admin)\//;
  const results: TsScaffoldRuleResult[] = [];
  for (const file of srcTsFiles) {
    const text = fs.readFileSync(file, 'utf8');
    if (runtimeImportPattern.test(text)) {
      results.push(error(`src-ts file must not import runtime JS directly: ${path.relative(rootDir, file)}`));
    }
  }
  return results.length ? results : [ok()];
}

/**
 * Code-Teil: collectTsScaffoldRuleErrors
 *
 * Zweck:
 * Führt alle Scaffold-Regeln in einer typisierten Funktion zusammen.
 *
 * Zusammenhang:
 * `scripts/verify-ts-scaffold.js` nutzt diese Logik über die JS-Spiegeldatei.
 * Dadurch ist das CLI-Skript selbst klein, während die eigentlichen Regeln in
 * TypeScript verständlich kommentiert und getestet werden.
 */
export function collectTsScaffoldRuleErrors(rootDir: string, pkg: PackageJsonScriptsShape, tsconfig: TsConfigShape, buildConfig: TsConfigShape): TsScaffoldCheckResult {
  const srcTsFiles = collectSrcTsFiles(rootDir);
  const results: TsScaffoldRuleResult[] = [
    ...requireScaffoldFiles(rootDir),
    ...requirePackageScripts(pkg),
    requirePublishCheckStartsWithTypeSafety(rootDir, pkg),
    requireTsconfigIncludesSrcTs(tsconfig),
    ...requireBuildConfigDeclarationsOnly(buildConfig),
    requireMinimumSrcTsFiles(srcTsFiles),
    ...requireNoRuntimeImportsFromSrcTs(rootDir, srcTsFiles),
  ];

  return {
    errors: results.filter((item) => !item.ok && item.message).map((item) => String(item.message)),
    stats: {
      srcTsFileCount: srcTsFiles.length,
      requiredFileCount: defaultRequiredTsScaffoldFiles.length,
    },
  };
}
