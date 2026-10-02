#!/usr/bin/env node
'use strict';
/**
 * Regressionstest 0.8.57: App-Center darf Speicherfarm-Konfiguration nicht leer anzeigen,
 * wenn die Runtime die Farm aus storageFarm.configJson weiter korrekt betreibt.
 */
const fs = require('fs');
const read = (p) => fs.readFileSync(p, 'utf8');
const must = (file, needle, label) => {
  const text = read(file);
  if (!text.includes(needle)) {
    console.error(`[storagefarm-hydration] FEHLT ${label}: ${needle}`);
    process.exit(1);
  }
};
const mustNot = (file, needle, label) => {
  const text = read(file);
  if (text.includes(needle)) {
    console.error(`[storagefarm-hydration] VERBOTEN ${label}: ${needle}`);
    process.exit(1);
  }
};

must('src-ts/runtime-executables/www/ems-apps.ts', 'async function hydrateStorageFarmConfigFromRuntimeState(cfg)', 'Hydrationsfunktion TS');
must('src-ts/runtime-executables/www/ems-apps.ts', "_readApiStateValue(statePayload, 'storageFarm.configJson'", 'Runtime configJson Fallback TS');
must('src-ts/runtime-executables/www/ems-apps.ts', "_readApiStateValue(statePayload, 'storageFarm.groupsJson'", 'Runtime groupsJson Fallback TS');
must('src-ts/runtime-executables/www/ems-apps.ts', 'root.storageFarm._runtimeRecovered = true', 'Recover Marker TS');
must('src-ts/runtime-executables/main.ts', 'fromStatusRows', 'Backend storagesStatusJson Recovery');
must('src-ts/runtime-executables/www/ems-apps.ts', 'const htmlEscape = _nwHtmlEscape', 'htmlEscape Alias TS');
must('src-ts/runtime-executables/www/ems-apps.ts', "_readApiStateValue(statePayload, 'storageFarm.storagesStatusJson'", 'Runtime storagesStatusJson Fallback TS');
must('src-ts/runtime-executables/www/ems-apps.ts', '_recoverStorageFarmRowsFromStatusRows', 'StatusJson-Recovery TS');
must('src-ts/runtime-executables/www/ems-apps.ts', 'würde der Installer fälschlich', 'Fehlerbild-Kommentar TS');
must('www/ems-apps.js', 'async function hydrateStorageFarmConfigFromRuntimeState(cfg)', 'Hydrationsfunktion Runtime');
must('www/ems-apps.js', "_readApiStateValue(statePayload, 'storageFarm.configJson'", 'Runtime configJson Fallback Runtime');
must('src-ts/runtime-executables/main.ts', '_nwHydrateStorageFarmConfigFromRuntimeStates', 'Backend Hydration Helper');
must('src-ts/runtime-executables/main.ts', 'storageFarm.configJson', 'Backend State bleibt Quelle für Migration');
mustNot('src-ts/runtime-executables/www/ems-apps.ts', 'buildStorageFarmUI();\n    els.appsList.appendChild', 'Speicherfarm darf nicht im Apps-Reiter gerendert werden');
console.log('[storagefarm-hydration] OK: App-Center stellt Speicherfarm-Konfiguration aus Runtime-State wieder her, ohne Regelung zu ändern.');
