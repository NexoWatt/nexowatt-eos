// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-heating-rod-legacy-pruned-debug.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-heating-rod-legacy-pruned-debug.js
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
 * Original-Hash: 72d6b0d766d9a2cc2f5f2c3be186922268b3b99dcb9e966344132112a84f6ee7
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
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
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
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
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
function must(rel, marker, label) {
  const txt = read(rel);
  if (!txt.includes(marker)) {
    console.error(`[heating-rod-legacy-pruned-debug] ERROR: ${rel}: ${label || marker}`);
    process.exit(1);
  }
}
must('ems/modules/heating-rod-control.js', '_buildHeatingRodTsLegacyPrunedState', 'Pruned-Debug Builder fehlt');
must('ems/modules/heating-rod-control.js', 'heatingRod.summary.tsLegacyPrunedJson', 'Pruned-Debug State fehlt');
must('ems/modules/heating-rod-control.js', 'fullReferencePayloadRemoved', 'vollständiger Referenzpayload wird nicht markiert');
must('ems/modules/heating-rod-control.js', 'removedFromNormalDebug', 'Cleanup-Liste für entfernte Details fehlt');
must('ems/modules/heating-rod-control.js', 'compactLegacyReference', 'kompakte Legacy-Referenz fehlt');
must('ems/modules/heating-rod-control.js', 'legacyReference: heatingRodTsLegacyFinalCleanup && heatingRodTsLegacyFinalCleanup.ready ?', 'debugJson nutzt kompakte/finale Referenz nicht');
must('www/ems-apps.js', 'JS-Pruning', 'App-Center Zeile JS-Pruning fehlt');
must('www/ems-apps.js', 'JS-Normaldiagnose entfernt', 'App-Center Zeile Normaldiagnose entfernt fehlt');
console.log('[heating-rod-legacy-pruned-debug] OK: alte JS-Referenzdetails sind in kompakte Debug-Brücke verschoben.');
