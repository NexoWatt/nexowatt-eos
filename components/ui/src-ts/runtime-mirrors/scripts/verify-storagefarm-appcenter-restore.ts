// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-storagefarm-appcenter-restore.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-storagefarm-appcenter-restore.js
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
 * Original-Hash: 4549b44cafe4a97685f0018112fd67b328d81a39aba6eef1327e4d85314ae8f9
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
 * Regressionstest 0.8.57: Speicherfarm App-Center Restore.
 * Schützt vor dem Feldfehler: Speicherfarm läuft aus storageFarm.configJson,
 * aber der App-Center-Reiter zeigt keine Speicher und könnte sie leer speichern.
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
function must(file, needle){ const s=read(file); if(!s.includes(needle)){ console.error(`[storagefarm-restore] Missing in ${file}: ${needle}`); process.exit(1); } }
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
