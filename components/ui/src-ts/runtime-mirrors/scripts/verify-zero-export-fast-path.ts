// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-zero-export-fast-path.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-zero-export-fast-path.js
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
 * Original-Hash: 32980fcf2eb8841034c1d9525ec465505d3e2909523d6edbf291a90273776d12
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
function read(p){return fs.readFileSync(p,'utf8');}
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
function must(file, text){const s=read(file); if(!s.includes(text)){console.error(`Missing in ${file}: ${text}`); process.exit(1);}}
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
function mustNot(file, text){const s=read(file); if(s.includes(text)){console.error(`Forbidden in ${file}: ${text}`); process.exit(1);}}
const releasePkg = JSON.parse(read('package.json'));
const releaseIo = JSON.parse(read('io-package.json'));
if (!releasePkg.version || !releaseIo.common || releasePkg.version !== releaseIo.common.version) {
  console.error(`Version mismatch: package.json=${releasePkg.version || ''}, io-package.json=${releaseIo.common && releaseIo.common.version || ''}`);
  process.exit(1);
}
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','this._zeroExportSinkRuntime');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','_zeroExportSinkAvailability');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','_classifyZeroExportSinkAck');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','not_per_tick');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','blocked-by-sink-availability');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','gridConstraints.exportLimit.fastPathReady');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','gridConstraints.exportLimit.sinkAvailabilityJson');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','gridConstraints.exportLimit.sinks.${sink}.usable');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts',"for (const sink of ['storage', 'charging', 'flexLoads', 'mesh', 'inverter'])");
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','Schreibtests laufen nur bei Inbetriebnahme/Änderung/Fehler');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','Verbrauch zuerst');
mustNot('src-ts/runtime-executables/ems/modules/grid-constraints.ts','writeTestBeforeEveryTick');
console.log('OK: 0-Einspeise Fast-Path nutzt gespeicherte Freigaben/ACKs und keinen Schreibtest pro Regel-Tick.');
