// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/typescript-invocation.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/typescript-invocation.js
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
 * Original-Hash: 2995a282b5768e4a7005b52707afba2e854167bf86f820268acfedea001324ad
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
 * Code-Teil: TypeScript-Compiler-Aufruf für Publish-Checks
 *
 * Zweck:
 * Windows-/CI-sichere Auflösung des TypeScript-Compilers. Wenn TypeScript lokal
 * installiert ist, wird direkt `node node_modules/typescript/lib/tsc.js` genutzt.
 * Dadurch hängen die Runtime-Typisierungschecks nicht mehr von `tsc.cmd` im PATH ab.
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

/**
 * Code-Teil: resolveTypeScriptInvocation
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function resolveTypeScriptInvocation(repoRoot) {
  const root = path.resolve(repoRoot || path.join(__dirname, '..'));
  const localTscJs = path.join(root, 'node_modules', 'typescript', 'lib', 'tsc.js');
  if (fs.existsSync(localTscJs)) {
    return {
      command: process.execPath,
      argsPrefix: [localTscJs],
      label: `node ${path.relative(root, localTscJs)}`
    };
  }

  const localBin = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc');
  if (fs.existsSync(localBin)) {
    return {
      command: localBin,
      argsPrefix: [],
      label: path.relative(root, localBin)
    };
  }

  return {
    command: process.platform === 'win32' ? 'tsc.cmd' : 'tsc',
    argsPrefix: [],
    label: 'tsc aus PATH'
  };
}

/**
 * Code-Teil: spawnTypeScript
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function spawnTypeScript(repoRoot, args, options) {
  const invocation = resolveTypeScriptInvocation(repoRoot);
  const spawnOptions = Object.assign({}, options || {});
  if (process.platform === 'win32' && /\.cmd$/i.test(String(invocation.command || '')) && spawnOptions.shell === undefined) {
    spawnOptions.shell = true;
  }
  const result = childProcess.spawnSync(invocation.command, [...invocation.argsPrefix, ...args], spawnOptions);
  result.typescriptInvocation = invocation;
  return result;
}

/**
 * Code-Teil: writeTypeScriptSpawnDiagnostics
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function writeTypeScriptSpawnDiagnostics(result) {
  if (result && result.stdout) process.stderr.write(result.stdout);
  if (result && result.stderr) process.stderr.write(result.stderr);
  if (result && result.error) {
    const invocation = result.typescriptInvocation && result.typescriptInvocation.label ? result.typescriptInvocation.label : 'tsc';
    process.stderr.write(`[typescript-invocation] Compiler konnte nicht gestartet werden (${invocation}): ${result.error.message || result.error}\n`);
  }
}

module.exports = {
  resolveTypeScriptInvocation,
  spawnTypeScript,
  writeTypeScriptSpawnDiagnostics
};
