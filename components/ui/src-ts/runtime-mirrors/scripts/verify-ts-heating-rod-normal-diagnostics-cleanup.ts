// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-heating-rod-normal-diagnostics-cleanup.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-heating-rod-normal-diagnostics-cleanup.js
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
 * Original-Hash: 397a238a87f87558c051d08f716b614aa532b64e122d86413e81bbf5f65e305c
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
 * Datei: scripts/verify-ts-heating-rod-normal-diagnostics-cleanup.js
 *
 * Zweck:
 * Prüft 0.7.119: Die alte JS-Heizstabreferenz wird aus der normalen Diagnose
 * entfernt und nur noch als kompakte Debug-/Notfallbrücke geführt.
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
    console.error(`[heating-rod-normal-diagnostics-cleanup] ERROR: ${rel}: ${label || marker}`);
    process.exit(1);
  }
}
must('ems/modules/heating-rod-control.js', '_buildHeatingRodTsLegacyNormalDiagnosticsState', 'Normaldiagnose-Cleanup-Funktion fehlt');
must('ems/modules/heating-rod-control.js', 'heatingRod.summary.tsLegacyNormalDiagnosticsJson', 'neuer Normaldiagnose-Cleanup-State fehlt');
must('ems/modules/heating-rod-control.js', 'normalDiagnosticsRemoved', 'normalDiagnosticsRemoved Marker fehlt');
must('ems/modules/heating-rod-control.js', 'fullLegacyReferenceRemovedFromDebugJson', 'DebugJson-Full-Payload Marker fehlt');
must('ems/modules/heating-rod-control.js', 'legacy-reference-normal-diagnostics-removed', 'finaler Cleanup-Status fehlt');
must('ems/modules/heating-rod-control.js', 'heatingRodTsLegacyNormalDiagnostics.compactReference', 'Alias nutzt kompakten finalen Cleanup nicht');
must('www/ems-apps.js', 'JS-Normaldiagnose', 'App-Center zeigt Normaldiagnose-Cleanup nicht');
must('www/ems-apps.js', 'JS-Normaldiagnose entfernt', 'App-Center zeigt Entfernung nicht');
console.log('[heating-rod-normal-diagnostics-cleanup] OK: Alte JS-Heizstabreferenz ist aus Normaldiagnose/Cleanup weiter entfernt.');
