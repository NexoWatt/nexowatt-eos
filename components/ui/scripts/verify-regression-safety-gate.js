#!/usr/bin/env node
'use strict';
/**
 * NexoWatt 0.8.59 Regression Safety Gate.
 * Sichert, dass kritische App-Center-/Runtime-Bereiche nicht wieder durch neue
 * Module beschädigt werden. Der Test ist statisch, aber absichtlich hart.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function must(rel, needle, label) {
  const s = read(rel);
  if (!s.includes(needle)) {
    console.error(`[regression-safety-gate] FEHLT ${label || needle} in ${rel}`);
    process.exit(1);
  }
}
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
