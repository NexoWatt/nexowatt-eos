// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-export-guard-stabilization.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-export-guard-stabilization.js
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
 * Original-Hash: 38bb102734a1531169074aec4a3e1bdd337778912e3c52c7e528cc9e5ce67bd5
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
const root = process.cwd();
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
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
/**
 * Code-Teil: assert
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function assert(cond, msg) { if (!cond) throw new Error(msg); }
/**
 * Code-Teil: has
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function has(rel, token) {
  const txt = read(rel);
  assert(txt.includes(token), `${rel}: missing ${token}`);
}
const grid = 'src-ts/runtime-executables/ems/modules/grid-constraints.ts';
const apps = 'src-ts/runtime-executables/www/ems-apps.ts';
[
  '_getExportLimitRunMode',
  '_isExportLimitDiagnosticMode',
  'gridConstraints.exportLimit.runMode',
  'gridConstraints.exportLimit.diagnosticOnly',
  'gridConstraints.exportLimit.plannedAction',
  'gridConstraints.exportLimit.installerChecklistJson',
  'diagnostic_only',
  'Diagnose/Testmodus aktiv',
  'const sinkWriteResult = enabled && approved && !diagnosticOnly && sinkCommandReady',
  'if (cfg.zeroExportEnabled && exportGuardDiagnosticOnly)',
  "action: 'diagnostic_only'",
  'applied: false',
].forEach(t => has(grid, t));
[
  'gc.exportLimitRunMode',
  'Betriebsart Einspeisebegrenzung',
  'Diagnose/Testmodus – nur berechnen, nicht schreiben',
  'renderExportGuardRuntimeDiagnostics',
  'Export Guard Runtime-Diagnose',
  'Zum WR-Mapping springen',
  'Negative-Preis-Strategie',
].forEach(t => has(apps, t));
const npmignore = read('.npmignore');
assert(npmignore.includes('*.zip') && npmignore.includes('*.tgz'), '.npmignore must exclude generated archives/tarballs');
const packedFiles = ['NexoWatt-ui-0.8.29-export-guard-diagnostics.zip', 'iobroker.nexowatt-ui-0.8.29.tgz'];
for (const name of packedFiles) assert(!fs.existsSync(path.join(root, name)), `repo must not contain generated archive ${name}`);
console.log('[export-guard-stabilization] OK: Diagnosemodus, Installerdiagnose und Archiv-Ausschluss geprüft.');
