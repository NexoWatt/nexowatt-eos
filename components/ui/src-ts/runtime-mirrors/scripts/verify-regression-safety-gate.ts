// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-regression-safety-gate.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-regression-safety-gate.js
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
 * Original-Hash: 1ec5d9fa7621506f5c7eead292e0bd1e3ed771b8625aa7a6c02961ac4245f02e
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
 * NexoWatt 0.8.59 Regression Safety Gate.
 * Sichert, dass kritische App-Center-/Runtime-Bereiche nicht wieder durch neue
 * Module beschädigt werden. Der Test ist statisch, aber absichtlich hart.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
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
 * Code-Teil: must
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function must(rel, needle, label) {
  const s = read(rel);
  if (!s.includes(needle)) {
    console.error(`[regression-safety-gate] FEHLT ${label || needle} in ${rel}`);
    process.exit(1);
  }
}
/**
 * Code-Teil: mustNot
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function mustNot(rel, needle, label) {
  const s = read(rel);
  if (s.includes(needle)) {
    console.error(`[regression-safety-gate] VERBOTEN ${label || needle} in ${rel}`);
    process.exit(1);
  }
}
const pkg = JSON.parse(read('package.json'));
const ioPkg = JSON.parse(read('io-package.json'));
if (!pkg.version || !ioPkg.common || pkg.version !== ioPkg.common.version) {
  console.error(`[regression-safety-gate] Versionskonflikt package.json=${pkg.version || ''}, io-package.json=${ioPkg.common && ioPkg.common.version || ''}`);
  process.exit(1);
}
const scripts = pkg.scripts || {};
const publishPlan = JSON.parse(read('scripts/publish-check-plan.json'));
const publishCommands = Array.isArray(publishPlan.commands)
  ? publishPlan.commands.map((command) => String(command || '').trim().replace(/\s+/g, ' '))
  : [];
for (const name of [
  'test:storagefarm-appcenter-restore',
  'test:storagefarm-appcenter-hydration',
  'test:storage-farm-config-fallback',
  'test:app-center-structure-cleanup',
  'test:no-release-artifacts',
  'test:safety-envelope-final-write',
  'test:safety-active-load-stop',
  'test:safety-module-deactivate',
]) {
  if (!scripts[name]) {
    console.error(`[regression-safety-gate] npm-Script fehlt: ${name}`);
    process.exit(1);
  }
}
must('src-ts/runtime-executables/www/ems-apps.ts', 'function applyAppCenterRegressionSafetyGate(patch)', 'Save-Gate Funktion TS');
must('src-ts/runtime-executables/www/ems-apps.ts', 'storageFarmBeforeCount', 'Speicherfarm Vorher/Nachher Check TS');
must('src-ts/runtime-executables/www/ems-apps.ts', '__saveGuardRestored', 'Speicherfarm Save-Guard Restore TS');
must('src-ts/runtime-executables/www/ems-apps.ts', 'applyAppCenterRegressionSafetyGate(collectPatchFromUI())', 'Save-Gate Aufruf TS');
must('src-ts/runtime-executables/www/ems-apps.ts', 'hydrateStorageFarmConfigFromRuntimeState', 'Speicherfarm Runtime-Hydration bleibt erhalten');
must('www/ems-apps.js', 'function applyAppCenterRegressionSafetyGate(patch)', 'Save-Gate Funktion Runtime');
must('www/ems-apps.js', 'applyAppCenterRegressionSafetyGate(collectPatchFromUI())', 'Save-Gate Aufruf Runtime');
must('scripts/verify-storagefarm-appcenter-restore.js', 'storageFarm.configJson', 'Speicherfarm Restore-Test configJson');
must('scripts/verify-storagefarm-appcenter-hydration.js', 'storagesStatusJson', 'Speicherfarm Hydration-Test status fallback');
mustNot('src-ts/runtime-executables/www/ems-apps.ts', 'appsList.appendChild(buildMeshMicrogridCard())', 'Mesh Detailkarte darf nicht in Apps gerendert werden');

must('src-ts/runtime-executables/ems/services/safety-envelope.ts', 'evaluateFlexibleLoadRequest', 'Zentrale finale Leistungsfreigabe');
must('src-ts/runtime-executables/ems/services/safety-envelope.ts', 'evaluateSafetyCommandPermission', 'Sicherheitsvertrag für nicht importsteigernde Stellbefehle');
must('src-ts/runtime-executables/ems/modules/charging-management.ts', 'liveSafetyEnvelope', 'EVCS Live-Recheck vor Hardware-Write');
must('src-ts/runtime-executables/ems/modules/storage-control.ts', 'evaluateSafetyCommandPermission', 'Speicher Safety-Command-Vertrag');
if (!publishCommands.includes('npm run test:safety-envelope-final-write')
  || !publishCommands.includes('npm run test:safety-active-load-stop')
  || !publishCommands.includes('npm run test:safety-module-deactivate')) {
  console.error('[regression-safety-gate] P0-Safety-Tests fehlen im publish-check-plan');
  process.exit(1);
}

console.log('[regression-safety-gate] OK: App-Center Save-Gate und kritische Regressionstests sind vorhanden.');
