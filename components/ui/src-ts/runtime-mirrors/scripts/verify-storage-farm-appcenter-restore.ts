// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-storage-farm-appcenter-restore.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-storage-farm-appcenter-restore.js
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
 * Original-Hash: 5eeed089300ea9f151098203ed46408acf2b72645d6caf893f2b805604f2696c
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
 * Regressionstest: Speicherfarm-Konfiguration darf im App-Center nicht verschwinden,
 * wenn sie produktiv in storageFarm.configJson gespiegelt ist, aber installer.configJson
 * keine storageFarm.storages mehr enthält.
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
function read(file) { return fs.readFileSync(file, 'utf8'); }
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
function must(file, text, label) {
  const s = read(file);
  if (!s.includes(text)) {
    console.error(`[storage-farm-restore] FEHLT ${label}: ${text} in ${file}`);
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
