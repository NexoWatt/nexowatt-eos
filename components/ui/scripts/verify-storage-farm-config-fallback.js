#!/usr/bin/env node
'use strict';
/**
 * Regressionstest 0.8.57: Speicherfarm-App-Center-Fallback.
 * Schützt den Feldfall, in dem die Speicherfarm-App weiter produktiv läuft,
 * aber native.storageFarm.storages im Installer leer ist.
 */
const fs = require('fs');
function read(p){ return fs.readFileSync(p,'utf8'); }
function must(file, needle, label){ const s=read(file); if(!s.includes(needle)){ console.error(`[storage-farm-fallback] Missing ${label}: ${needle} in ${file}`); process.exit(1); } }
function mustNot(file, needle, label){ const s=read(file); if(s.includes(needle)){ console.error(`[storage-farm-fallback] Forbidden ${label}: ${needle} in ${file}`); process.exit(1); } }
must('src-ts/runtime-executables/www/ems-apps.ts','hydrateStorageFarmConfigFromRuntimeState','App-Center Runtime-Fallback');
must('src-ts/runtime-executables/www/ems-apps.ts','storageFarm.configJson','App-Center liest storageFarm.configJson');
must('src-ts/runtime-executables/www/ems-apps.ts','storageFarm.groupsJson','App-Center liest storageFarm.groupsJson');
must('src-ts/runtime-executables/www/ems-apps.ts','_runtimeRecovered','Recover-Marker');
must('src-ts/runtime-executables/main.ts','_nwHydrateStorageFarmConfigFromRuntimeStates','Backend-Config-Response Fallback');
must('src-ts/runtime-executables/main.ts','_nwProtectStorageFarmPatchFromEmptySubmit','Backend-Empty-Submit-Schutz');
must('src-ts/runtime-executables/main.ts','storageFarm.configJson','Backend liest configJson');
must('src-ts/runtime-executables/main.ts','storageFarm.groupsJson','Backend liest groupsJson');
must('src-ts/runtime-executables/main.ts','Empty App-Center submit protected','Backend-Schutzlog');
mustNot('src-ts/runtime-executables/www/ems-apps.ts','sf.storages = []; // hard reset','keine harte Leerung');
console.log('[storage-farm-fallback] OK: App-Center und Backend schützen bestehende Speicherfarm-Konfigurationen.');
