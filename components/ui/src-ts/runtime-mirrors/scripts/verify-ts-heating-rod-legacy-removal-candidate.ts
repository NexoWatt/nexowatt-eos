// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-heating-rod-legacy-removal-candidate.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-heating-rod-legacy-removal-candidate.js
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
 * Original-Hash: 84db5866389c971acfa76264a21b407c53ee77e1f7ce8c22e8bd965718ca314b
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
 * Datei: scripts/verify-ts-heating-rod-legacy-removal-candidate.js
 *
 * Zweck:
 * Prüft den 0.7.118-Schritt: Der alte JS-Heizstabpfad wird nach stabilem
 * TS-Normalpfad als konkreter Entfernungs-Kandidat markiert. Die harte Notbremse bleibt.
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
    console.error(`[heating-rod-legacy-removal-candidate] ERROR: ${rel}: ${label || marker}`);
    process.exit(1);
  }
}
must('ems/modules/heating-rod-control.js', '_buildHeatingRodTsLegacyRemovalCandidateState', 'Removal-Candidate Builder fehlt');
must('ems/modules/heating-rod-control.js', 'heatingRod.summary.tsLegacyRemovalCandidateJson', 'Removal-Candidate State fehlt');
must('ems/modules/heating-rod-control.js', 'heating-rod-legacy-js-removal-candidate-v1', 'Removal-Candidate Quelle fehlt');
must('ems/modules/heating-rod-control.js', 'legacy-js-path-removal-candidate', 'Status removal-candidate fehlt');
must('ems/modules/heating-rod-control.js', 'oldJsReferenceRemovalCandidate', 'Entfernungskandidat-Marker fehlt');
must('ems/modules/heating-rod-control.js', 'legacy-reference-normal-decision-gate', 'entfernbare JS-Entscheidungsbremse fehlt');
must('ems/modules/heating-rod-control.js', 'hard-safety-fallback', 'harte Notbremse muss erhalten bleiben');
must('src-ts/runtime-mirrors/ems/modules/heating-rod-control.ts', '_buildHeatingRodTsLegacyRemovalCandidateState', 'TS-Spiegel Builder fehlt');
must('www/ems-apps.js', 'JS-Entfernungskandidat', 'App-Center Entfernungskandidat-Zeile fehlt');
must('www/ems-apps.js', 'JS-Entfernungsphase', 'App-Center Entfernungsphase-Zeile fehlt');
console.log('[heating-rod-legacy-removal-candidate] OK: alter JS-Heizstabpfad ist als Entfernungs-Kandidat markiert.');
