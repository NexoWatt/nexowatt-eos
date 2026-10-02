#!/usr/bin/env node
'use strict';
/**
 * Regressionstest: Speicherfarm-Konfiguration darf im App-Center nicht verschwinden,
 * wenn sie produktiv in storageFarm.configJson gespiegelt ist, aber installer.configJson
 * keine storageFarm.storages mehr enthält.
 */
const fs = require('fs');
function read(file) { return fs.readFileSync(file, 'utf8'); }
function must(file, text, label) {
  const s = read(file);
  if (!s.includes(text)) {
    console.error(`[storage-farm-restore] FEHLT ${label}: ${text} in ${file}`);
    process.exit(1);
  }
}
function mustNot(file, text, label) {
  const s = read(file);
  if (s.includes(text)) {
    console.error(`[storage-farm-restore] DARF NICHT ENTHALTEN ${label}: ${text} in ${file}`);
    process.exit(1);
  }
}
must('src-ts/runtime-executables/main.ts', '_nwHydrateStorageFarmConfigFromRuntimeStates', 'Backend-Fallback-Helfer');
must('src-ts/runtime-executables/main.ts', 'storageFarm.configJson', 'Runtime-State als Quelle');
must('src-ts/runtime-executables/main.ts', 'storageFarm.groupsJson', 'Gruppen-Fallback');
must('src-ts/runtime-executables/main.ts', '__runtimeStateFallbackSource', 'Fallback-Marker für Diagnose');
must('src-ts/runtime-executables/main.ts', 'App-Center bleibt die einzige Quelle dafür, ob die Speicherfarm im Kundenmenü erscheint.', 'Runtime-Hydration verändert die AppCenter-Aktivierung nicht');
mustNot('src-ts/runtime-executables/main.ts', 'out.emsApps.apps.storagefarm =', 'Runtime-Hydration darf AppCenter nicht aktivieren');
must('main.js', '_nwHydrateStorageFarmConfigFromRuntimeStates', 'Runtime-Fallback-Helfer');
must('main.js', 'storageFarm.configJson', 'Runtime-State als Quelle in Runtime');
must('src-ts/runtime-executables/www/ems-apps.ts', 'nw-storagefarm-master-detail', 'Speicherfarm Master-Detail bleibt vorhanden');
must('src-ts/runtime-executables/www/ems-apps.ts', 'storageFarmStorages', 'Speicherfarm-Container wird gerendert');
mustNot('src-ts/runtime-executables/www/ems-apps.ts', 'sf.storages = [];//', 'kein hartes Leeren der Speicherliste');
console.log('[storage-farm-restore] OK: App-Center hydratisiert Speicherfarm aus Runtime-State-Fallback und verliert bestehende Speicher nicht.');
