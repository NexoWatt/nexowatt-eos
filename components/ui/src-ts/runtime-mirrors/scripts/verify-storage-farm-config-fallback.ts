// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-storage-farm-config-fallback.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-storage-farm-config-fallback.js
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
 * Original-Hash: b634fff3fe8f2b8089ce54bdcfd1464652a891fe78898966408ccbf2b33ab2b3
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
 * Regressionstest 0.8.57: Speicherfarm-App-Center-Fallback.
 * Schützt den Feldfall, in dem die Speicherfarm-App weiter produktiv läuft,
 * aber native.storageFarm.storages im Installer leer ist.
 */
const fs = require('fs');
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
function read(p){ return fs.readFileSync(p,'utf8'); }
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
function must(file, needle, label){ const s=read(file); if(!s.includes(needle)){ console.error(`[storage-farm-fallback] Missing ${label}: ${needle} in ${file}`); process.exit(1); } }
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
