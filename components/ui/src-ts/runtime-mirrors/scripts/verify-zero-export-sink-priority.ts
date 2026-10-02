// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-zero-export-sink-priority.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-zero-export-sink-priority.js
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
 * Original-Hash: 2a34fbd8270999d501932c41a472bffb216e62b290f9a908f19b69f617d4f970
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
function must(file, text){ const s=read(file); if(!s.includes(text)){ console.error(`Missing in ${file}: ${text}`); process.exit(1); } }
/**
 * Code-Teil: forbid
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function forbid(file, text){ const s=read(file); if(s.includes(text)){ console.error(`Forbidden in ${file}: ${text}`); process.exit(1); } }
const releasePkg = JSON.parse(read('package.json'));
const releaseIo = JSON.parse(read('io-package.json'));
if (!releasePkg.version || !releaseIo.common || releasePkg.version !== releaseIo.common.version) {
  console.error(`Version mismatch: package.json=${releasePkg.version || ''}, io-package.json=${releaseIo.common && releaseIo.common.version || ''}`);
  process.exit(1);
}
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','_zeroExportSinkPriorityPlan');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','localConsumption');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','chargingStations');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','flexLoads');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','storageCharge');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','inverterCurtailment');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts',"'localConsumption',\n            'chargingStations',\n            'flexLoads',\n            'storageCharge',\n            'meshMicrogrid',\n            'inverterCurtailment'");
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','gridConstraints.exportLimit.sinkPriorityPlanJson');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','sink_priority_command_ready');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','setForeignStateAsync(stateId');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','sinkCommandWriteStatus');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','_writeZeroExportSinkCommands');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','const requestedReductionW = requiredW;');
must('src-ts/runtime-executables/ems/modules/grid-constraints.ts','diagnosticCurtailmentW');
must('src-ts/runtime-executables/www/ems-apps.ts','0‑Einspeise-Reihenfolge');
must('src-ts/runtime-executables/www/ems-apps.ts','zeroExportStorageChargeCommandStateId');
must('src-ts/runtime-executables/www/ems-apps.ts','zeroExportChargingCommandStateId');
must('src-ts/runtime-executables/www/ems-apps.ts','zeroExportFlexLoadCommandStateId');
must('src-ts/runtime-executables/www/ems-apps.ts','zeroExportMeshCommandStateId');
forbid('src-ts/runtime-executables/ems/modules/grid-constraints.ts','new ZeroExportController');
console.log('OK: 0-Einspeise Senkenreihenfolge ist Verbrauch → freigegebene Ladepunkte → flexible Verbraucher → Speicher → Mesh/Microgrid → WR-Abregelung und baut keine zweite Regelung.');
