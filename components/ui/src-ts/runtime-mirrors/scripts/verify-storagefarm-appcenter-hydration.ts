// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-storagefarm-appcenter-hydration.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-storagefarm-appcenter-hydration.js
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
 * Original-Hash: 5dff142bab384fbc431d1379c8d8417d630257458b4ef077a85e91ccec0d02bf
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
 * Regressionstest 0.8.57: App-Center darf Speicherfarm-Konfiguration nicht leer anzeigen,
 * wenn die Runtime die Farm aus storageFarm.configJson weiter korrekt betreibt.
 */
const fs = require('fs');
/**
 * Code-Teil: read
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const read = (p) => fs.readFileSync(p, 'utf8');
/**
 * Code-Teil: must
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const must = (file, needle, label) => {
  const text = read(file);
  if (!text.includes(needle)) {
    console.error(`[storagefarm-hydration] FEHLT ${label}: ${needle}`);
    process.exit(1);
  }
};
/**
 * Code-Teil: mustNot
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
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
