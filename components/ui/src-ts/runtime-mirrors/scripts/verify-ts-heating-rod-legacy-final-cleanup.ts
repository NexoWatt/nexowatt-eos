// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-heating-rod-legacy-final-cleanup.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-heating-rod-legacy-final-cleanup.js
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
 * Original-Hash: bca661dff88bf6112e317a14da6b67f10557d2b3a382f665517c09a8970ad40a
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
 * Datei: scripts/verify-ts-heating-rod-legacy-final-cleanup.js
 *
 * Zweck:
 * Prüft den 0.7.119-Cleanup: Der alte JS-Heizstabreferenzbaum darf im stabilen
 * TS-Normalpfad nicht mehr als normale Diagnose mitlaufen. Stattdessen bleibt nur eine
 * kompakte Debug-/Notfallbrücke erhalten.
 */
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
  const text = read(rel);
  if (!text.includes(marker)) {
    console.error(`[heating-rod-legacy-final-cleanup] ERROR ${rel}: missing ${label}: ${marker}`);
    process.exit(1);
  }
}

must('ems/modules/heating-rod-control.js', '_buildHeatingRodTsLegacyFinalCleanupState', 'Final-Cleanup Builder');
must('ems/modules/heating-rod-control.js', 'heatingRod.summary.tsLegacyFinalCleanupJson', 'Final-Cleanup State');
must('ems/modules/heating-rod-control.js', 'legacyReferenceRemovedFromNormalDiagnostics', 'Normaldiagnose-Entfernung');
must('ems/modules/heating-rod-control.js', 'fullLegacyReferenceRemovedFromNormalDiagnostics', 'vollständige Legacy-Details entfernt');
must('ems/modules/heating-rod-control.js', 'normalDiagnosticsPayload', 'Normaldiagnose Payload-Modus');
must('ems/modules/heating-rod-control.js', 'compactDebugBridge', 'kompakte Debug-Brücke');
must('ems/modules/heating-rod-control.js', "legacyReference: heatingRodTsLegacyFinalCleanup", 'debugJson nutzt finalen Cleanup statt Vollreferenz');
must('www/ems-apps.js', 'JS-Final-Cleanup', 'App-Center Zeile Final Cleanup');
must('www/ems-apps.js', 'JS-Normaldiagnose', 'App-Center Zeile Normaldiagnose');
must('src-ts/runtime-mirrors/ems/modules/heating-rod-control.ts', '_buildHeatingRodTsLegacyFinalCleanupState', 'Runtime-Spiegel aktualisiert');
console.log('[heating-rod-legacy-final-cleanup] OK: alter JS-Referenzbaum ist aus der Normaldiagnose herausgelöst.');
