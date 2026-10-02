// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-mesh-target-groups.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-mesh-target-groups.js
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
 * Original-Hash: 64150f90ce58caa9fb38aea4b5795f8e383b230cdbe0980570b9aeed3d8232bf
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
 * Regressionstest 0.8.49: Mesh/Microgrid Zielgruppen-Strategie.
 * Sichert die App-Center-Regel und die Sicherheitsgrenze: Zielgruppen dürfen
 * nur neutrale Command-Intents begrenzen/priorisieren, niemals Hardware direkt.
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
function must(file, needle){ const s=read(file); if(!s.includes(needle)){ console.error(`[mesh-target-groups] Missing in ${file}: ${needle}`); process.exit(1); } }
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
function mustNot(file, needle){ const s=read(file); if(s.includes(needle)){ console.error(`[mesh-target-groups] Forbidden in ${file}: ${needle}`); process.exit(1); } }
const releasePkg = JSON.parse(read('package.json'));
const releaseIo = JSON.parse(read('io-package.json'));
if (!releasePkg.version || !releaseIo.common || releasePkg.version !== releaseIo.common.version) {
  console.error(`Version mismatch: package.json=${releasePkg.version || ''}, io-package.json=${releaseIo.common && releaseIo.common.version || ''}`);
  process.exit(1);
}
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts','nexowatt.mesh-microgrid-target-group-fairness.v1');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts','function normalizeTargetGroups');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts','function buildTargetGroupPlan');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts','_meshGroupLimitForCommand');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts','meshMicrogrid.targetGroups.groupsJson');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts','targetGroupSummary');
must('src-ts/runtime-executables/www/ems-apps.ts','meshMicrogridTargetGroupsJson');
must('src-ts/runtime-executables/www/ems-apps.ts','Zielgruppen-Strategie');
must('src-ts/runtime-executables/www/mesh-microgrid.ts','renderTargetGroups');
must('www/mesh-microgrid.html','meshTargetGroupRows');
must('src-ts/runtime-executables/main.ts','targetGroups: snapshot.targetGroups');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts','directHardwareWrite: false');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts','neutralCommandOnly: true');
mustNot('src-ts/runtime-executables/www/ems-apps.ts','appsList.appendChild(buildMeshMicrogridCard())');
console.log('OK: Mesh/Microgrid Zielgruppen-Strategie ist app-center-konform und hardware-neutral abgesichert.');
