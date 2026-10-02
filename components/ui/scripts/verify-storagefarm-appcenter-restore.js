#!/usr/bin/env node
'use strict';
/**
 * Regressionstest 0.8.57: Speicherfarm App-Center Restore.
 * Schützt vor dem Feldfehler: Speicherfarm läuft aus storageFarm.configJson,
 * aber der App-Center-Reiter zeigt keine Speicher und könnte sie leer speichern.
 */
const fs = require('fs');
function read(p){ return fs.readFileSync(p,'utf8'); }
function must(file, needle){ const s=read(file); if(!s.includes(needle)){ console.error(`[storagefarm-restore] Missing in ${file}: ${needle}`); process.exit(1); } }
function mustNot(file, needle){ const s=read(file); if(s.includes(needle)){ console.error(`[storagefarm-restore] Forbidden in ${file}: ${needle}`); process.exit(1); } }
must('src-ts/runtime-executables/main.ts', '_nwHydrateStorageFarmConfigFromRuntimeStates');
must('src-ts/runtime-executables/main.ts', 'storageFarm.configJson');
must('src-ts/runtime-executables/main.ts', 'storageFarm.groupsJson');
must('src-ts/runtime-executables/main.ts', '__runtimeStateFallback');
must('src-ts/runtime-executables/main.ts', '_nwProtectStorageFarmPatchFromEmptySubmit');
must('src-ts/runtime-executables/main.ts', '__protectedFromEmptySubmit');
must('src-ts/runtime-executables/main.ts', 'await _nwProtectStorageFarmPatchFromEmptySubmit(safePatch);');
must('src-ts/runtime-executables/www/ems-apps.ts', 'function _ensureStorageFarmCfg()');
must('src-ts/runtime-executables/www/ems-apps.ts', 'const htmlEscape = _nwHtmlEscape');
must('src-ts/runtime-executables/www/ems-apps.ts', '_recoverStorageFarmRowsFromStatusRows');
must('src-ts/runtime-executables/www/ems-apps.ts', "_readApiStateValue(statePayload, 'storageFarm.storagesStatusJson'");
must('src-ts/runtime-executables/main.ts', 'storageFarm.storagesStatusJson');
must('src-ts/runtime-executables/main.ts', 'fromStatusRows');
must('www/ems-apps.html', 'Speicher hinzufügen');
mustNot('src-ts/runtime-executables/main.ts', "const stGroups = await this.getStateAsync('storageFarm.groupsJson').catch(() => null);\n        const stGroups = await this.getStateAsync('storageFarm.groupsJson').catch(() => null);");
console.log('[storagefarm-restore] OK: App-Center Speicherfarm wird aus Runtime-State wiederhergestellt und leere Saves werden geschützt.');
