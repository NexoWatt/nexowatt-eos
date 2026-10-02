// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-zero-export-commissioning.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-zero-export-commissioning.js
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
 * Original-Hash: 3aa735621e55aae4e7b74f9f48d90818183da319a5a3c9bf4ac73676ef193130
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
function must(file, needle){const s=read(file); if(!s.includes(needle)){console.error(`Missing in ${file}: ${needle}`); process.exit(1);}}
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
function mustNot(file, needle){const s=read(file); if(s.includes(needle)){console.error(`Forbidden in ${file}: ${needle}`); process.exit(1);}}
const releasePkg = JSON.parse(read('package.json'));
const releaseIo = JSON.parse(read('io-package.json'));
if (!releasePkg.version || !releaseIo.common || releasePkg.version !== releaseIo.common.version) {
  console.error(`Version mismatch: package.json=${releasePkg.version || ''}, io-package.json=${releaseIo.common && releaseIo.common.version || ''}`);
  process.exit(1);
}
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','_buildZeroExportCommissioningAssistant');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','gridConstraints.exportLimit.commissioning.checklistJson');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','gridConstraints.exportLimit.commissioning.writeTestPreviewJson');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','Verbrauch → freigegebene Ladepunkte → flexible Verbraucher → Speicher');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','keine zweite Regelung');
must('src-ts/runtime-executables/www/ems-apps.ts','commissioning.reportJson');
must('src-ts/runtime-executables/www/ems-apps.ts','0‑Einspeise Inbetriebnahme-Checkliste');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','directHardwareWrite: false');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','neutralCommandOnly: true');
mustNot('src-ts/runtime-executables/ems/modules/grid-constraints.ts','new ZeroExport');
console.log('OK: 0-Einspeise Inbetriebnahme-Assistent ist diagnostisch, nicht doppelt geregelt und app-center-konform vorbereitet.');
