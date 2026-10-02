'use strict';

/**
 * Datei: scripts/ts-scaffold-rules.js
 *
 * Zweck:
 * JavaScript-Spiegel der TypeScript-Quelle
 * `src-ts/scripts/ts-scaffold-rules.ts`.
 *
 * Zusammenhang:
 * `scripts/verify-ts-scaffold.js` muss als Node.js-Skript ohne vorherigen
 * TypeScript-Build laufen. Die typisierte, kommentierte Quelle liegt in
 * `src-ts/scripts/ts-scaffold-rules.ts`; diese Datei ist die Laufzeitvariante.
 *
 * Wichtig:
 * Änderungen an Regeln zuerst in der TS-Quelle erklären und typisieren, danach
 * diese Spiegeldatei synchron halten, bis die Skripte vollständig aus TS gebaut
 * werden.
 */
const fs = require('fs');
const path = require('path');

const defaultRequiredTsScaffoldFiles = [
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

const defaultRequiredPackageScripts = [
  'typecheck',
  'test:types',
  'build:types',
  'test:contracts',
  'test:ts-scaffold',
  'test:all',
  'test:publish-check-runner',
];

/** Code-Teil: ok – erzeugt ein erfolgreiches Regelergebnis. */
function ok() { return { ok: true }; }

/** Code-Teil: error – erzeugt eine deutsche Fehlermeldung für CLI-Ausgaben. */
function error(message) { return { ok: false, message }; }

/** Code-Teil: fileExists – prüft Datei relativ zum Projektwurzelordner. */
function fileExists(rootDir, relativeFile) { return fs.existsSync(path.join(rootDir, relativeFile)); }

/** Code-Teil: requireScaffoldFiles – prüft Pflichtdateien der TS-Migrationsbasis. */
function requireScaffoldFiles(rootDir, files = defaultRequiredTsScaffoldFiles) {
  const results = [];
  for (const file of files) if (!fileExists(rootDir, file)) results.push(error(`Missing required file: ${file}`));
  return results.length ? results : [ok()];
}

/** Code-Teil: requirePackageScripts – prüft Pflichtskripte in package.json. */
function requirePackageScripts(pkg, scriptNames = defaultRequiredPackageScripts) {
  const scripts = pkg && pkg.scripts || {};
  const results = [];
  for (const scriptName of scriptNames) if (!scripts[scriptName]) results.push(error(`Missing package.json script: ${scriptName}`));
  return results.length ? results : [ok()];
}

/** Code-Teil: requirePublishCheckStartsWithTypeSafety – prüft read-only Publish und separaten Windows-sicheren Volltest. */
function requirePublishCheckStartsWithTypeSafety(rootDir, pkg) {
  const scripts = pkg && pkg.scripts || {};
  const publishCheck = String(scripts['publish:check'] || '').trim();
  const fullCheck = String(scripts['test:release:full'] || '').trim();
  const expectedArtifactCheck = 'node scripts/verify-release-artifact.js';
  const expectedRunner = 'node scripts/publish-check-runner.js';
  if (publishCheck !== expectedArtifactCheck) return error(`publish:check must use the immutable read-only artifact verifier: ${expectedArtifactCheck}`);
  if (fullCheck !== expectedRunner) return error(`test:release:full must use the Windows-safe runner: ${expectedRunner}`);

  let commands = [];
  try {
    const planPath = path.join(rootDir, 'scripts', 'publish-check-plan.json');
    const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
    if (plan.schemaVersion !== 1 || !Array.isArray(plan.commands)) {
      return error('scripts/publish-check-plan.json must use schemaVersion=1 and contain a commands array.');
    }
    commands = plan.commands.map((command) => String(command || '').trim().replace(/\s+/g, ' '));
    if (plan.expectedStepCount !== commands.length) {
      return error('publish-check-plan expectedStepCount must match the commands array length.');
    }
  } catch (err) {
    return error(`publish-check plan could not be read: ${err && err.message ? err.message : String(err)}`);
  }

  const dependencyCheck = 'node scripts/ensure-publish-dev-deps.js';
  const typecheckCommand = 'npm run typecheck';
  if (commands[0] !== dependencyCheck) return error('publish-check plan must start with node scripts/ensure-publish-dev-deps.js.');
  if (commands[1] !== typecheckCommand) return error('publish-check plan must run npm run typecheck immediately after the DevDependency preflight.');
  if (commands.filter((command) => command === dependencyCheck).length !== 1) return error('publish-check plan must contain the DevDependency preflight exactly once.');
  if (commands.filter((command) => command === typecheckCommand).length !== 1) return error('publish-check plan must contain npm run typecheck exactly once.');
  return ok();
}

/** Code-Teil: requireTsconfigIncludesSrcTs – prüft tsconfig.json include. */
function requireTsconfigIncludesSrcTs(tsconfig) {
  const include = Array.isArray(tsconfig && tsconfig.include) ? tsconfig.include.map(String) : [];
  return include.includes('src-ts/**/*.ts') ? ok() : error('tsconfig.json must include src-ts/**/*.ts');
}

/** Code-Teil: requireBuildConfigDeclarationsOnly – prüft Deklarations-Build. */
function requireBuildConfigDeclarationsOnly(buildConfig) {
  const options = buildConfig && buildConfig.compilerOptions || {};
  const results = [];
  if (options.emitDeclarationOnly !== true) results.push(error('tsconfig.build.json must set compilerOptions.emitDeclarationOnly=true.'));
  if (options.declaration !== true) results.push(error('tsconfig.build.json must set compilerOptions.declaration=true.'));
  return results.length ? results : [ok()];
}

/** Code-Teil: collectSrcTsFiles – sammelt alle TypeScript-Dateien unter src-ts. */
function collectSrcTsFiles(rootDir) {
  const base = path.join(rootDir, 'src-ts');
  const files = [];
  if (!fs.existsSync(base)) return files;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && full.endsWith('.ts')) files.push(full);
    }
  };
  walk(base);
  return files.sort();
}

/** Code-Teil: requireMinimumSrcTsFiles – verhindert leere TS-Auslieferung. */
function requireMinimumSrcTsFiles(srcTsFiles, minimum = 8) {
  return srcTsFiles.length >= minimum ? ok() : error(`Expected several TypeScript files, found only ${srcTsFiles.length}.`);
}

/** Code-Teil: requireNoRuntimeImportsFromSrcTs – hält TS-Verträge runtime-frei. */
function requireNoRuntimeImportsFromSrcTs(rootDir, srcTsFiles) {
  const runtimeImportPattern = /\.\.\/\.\.\/(main|www|ems|admin)\//;
  const results = [];
  for (const file of srcTsFiles) {
    const text = fs.readFileSync(file, 'utf8');
    if (runtimeImportPattern.test(text)) results.push(error(`src-ts file must not import runtime JS directly: ${path.relative(rootDir, file)}`));
  }
  return results.length ? results : [ok()];
}

/** Code-Teil: collectTsScaffoldRuleErrors – bündelt alle TS-Scaffold-Regeln. */
function collectTsScaffoldRuleErrors(rootDir, pkg, tsconfig, buildConfig) {
  const srcTsFiles = collectSrcTsFiles(rootDir);
  const results = [
    ...requireScaffoldFiles(rootDir),
    ...requirePackageScripts(pkg || {}),
    requirePublishCheckStartsWithTypeSafety(rootDir, pkg || {}),
    requireTsconfigIncludesSrcTs(tsconfig || {}),
    ...requireBuildConfigDeclarationsOnly(buildConfig || {}),
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

module.exports = {
  defaultRequiredTsScaffoldFiles,
  defaultRequiredPackageScripts,
  ok,
  error,
  fileExists,
  requireScaffoldFiles,
  requirePackageScripts,
  requirePublishCheckStartsWithTypeSafety,
  requireTsconfigIncludesSrcTs,
  requireBuildConfigDeclarationsOnly,
  collectSrcTsFiles,
  requireMinimumSrcTsFiles,
  requireNoRuntimeImportsFromSrcTs,
  collectTsScaffoldRuleErrors,
};
