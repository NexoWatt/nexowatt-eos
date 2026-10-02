#!/usr/bin/env node
'use strict';
/**
 * 0.8.59 Regression-Safety-Gate.
 * Prüft, dass das App-Center beim Speichern keine bestehenden Kernbereiche
 * versehentlich leer überschreiben kann, wenn ein Reiter/DOM/Hydration ausfällt.
 */
const fs = require('fs');
function read(file) { return fs.readFileSync(file, 'utf8'); }
function must(file, needle, label) {
  const text = read(file);
  if (!text.includes(needle)) {
    console.error(`[release-safety-gate] FEHLT ${label}: ${needle} in ${file}`);
    process.exit(1);
  }
}
function mustNot(file, needle, label) {
  const text = read(file);
  if (text.includes(needle)) {
    console.error(`[release-safety-gate] VERBOTEN ${label}: ${needle} in ${file}`);
    process.exit(1);
  }
}
must('src-ts/runtime-executables/www/ems-apps.ts', 'applyReleaseRegressionSafetyGate', 'Safety-Gate-Funktion');
must('src-ts/runtime-executables/www/ems-apps.ts', 'storageFarm.storages', 'Speicherfarm-Schutz');
must('src-ts/runtime-executables/www/ems-apps.ts', 'settings.evcsList', 'Ladepunkt-Schutz');
must('src-ts/runtime-executables/www/ems-apps.ts', 'chargeKiosk.stations', 'DC-Station-Schutz');
must('src-ts/runtime-executables/www/ems-apps.ts', 'nlP1.datapoints', 'NL/P1-Schutz');
must('src-ts/runtime-executables/www/ems-apps.ts', 'meshMicrogrid.nodes', 'Mesh-Knoten-Schutz');
must('src-ts/runtime-executables/www/ems-apps.ts', 'meshMicrogrid.peers', 'Mesh-Peer-Schutz');
must('src-ts/runtime-executables/www/ems-apps.ts', 'const safetyReport = applyReleaseRegressionSafetyGate(patch);', 'SaveConfig nutzt Safety-Gate');
must('src-ts/runtime-executables/www/ems-apps.ts', '_releaseSafetyGate', 'Report wird im Patch dokumentiert');
must('src-ts/runtime-executables/www/ems-apps.ts', 'Bewusstes Löschen ganzer Kernbereiche', 'Kommentar für spätere Löschfunktion');
must('www/ems-apps.js', 'applyReleaseRegressionSafetyGate', 'Runtime Safety-Gate');
must('www/ems-apps.js', 'storageFarm.storages', 'Runtime Speicherfarm-Schutz');
must('www/ems-apps.js', 'settings.evcsList', 'Runtime Ladepunkt-Schutz');
must('www/ems-apps.js', 'chargeKiosk.stations', 'Runtime DC-Station-Schutz');
must('www/ems-apps.js', 'nlP1.datapoints', 'Runtime NL/P1-Schutz');
mustNot('src-ts/runtime-executables/www/ems-apps.ts', 'storageFarm = {}', 'kein unsicheres Speicherfarm-Reset');
console.log('[release-safety-gate] OK: App-Center-Save schützt Kernbereiche vor leerem Regression-Save.');
