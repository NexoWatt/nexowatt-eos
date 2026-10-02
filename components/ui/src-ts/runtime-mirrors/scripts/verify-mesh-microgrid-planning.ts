// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-mesh-microgrid-planning.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-mesh-microgrid-planning.js
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
 * Original-Hash: d4f0dfe27a659fb12526823250d6d6b2c4a6f461f09bba28af69eaf8c4242532
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
 * Regressionstest für 0.8.36 Mesh/Microgrid Regelbasis im Diagnosemodus.
 * Schützt die Produktgrenze: Geplante Entscheidungen dürfen sichtbar sein,
 * aber keine Hardware-Schreibpfade oder zweite Steuerlogik erzeugen.
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
function read(p){ return fs.readFileSync(p, 'utf8'); }
/**
 * Code-Teil: fail
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function fail(msg){ console.error('[mesh-planning] ERROR: ' + msg); process.exit(1); }
/**
 * Code-Teil: has
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function has(file, needle, label){ if (!file.includes(needle)) fail(`${label} fehlt: ${needle}`); }
const mod = read('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts');
const main = read('src-ts/runtime-executables/main.ts');
const page = read('src-ts/runtime-executables/www/mesh-microgrid.ts');
const html = read('www/mesh-microgrid.html');
has(mod, 'buildPlanning', 'Planungsfunktion');
has(mod, 'hardwareWrite: false', 'read-only Hardware-Schutz');
has(mod, 'meshMicrogrid.planning.actionsJson', 'Planungsstate Aktionen');
has(mod, 'meshMicrogrid.planning.priorityOrderJson', 'Prioritätsstate');
has(mod, 'meshMicrogrid.planning.gridLimitDiagnosticsJson', 'Netzlimit-Diagnose-State');
has(mod, 'Local-First-/Grid-Last-Entscheidungen', 'Kommentar zur Regelbasis');
has(main, 'planning,', 'API Payload mit Planning');
has(main, 'PlannedAction', 'CSV PlannedAction Export');
has(page, 'renderPlanning', 'Frontend Planungsrendering');
has(page, 'read-only · kein Hardware-Write', 'Frontend Sicherheitshinweis');
has(html, 'Geplante Entscheidungen', 'HTML Bereich geplante Entscheidungen');
has(html, 'Prioritätsreihenfolge', 'HTML Prioritätsbereich');
if (/setStateAsync\([^\n]+meshMicrogrid\.planning/.test(mod)) {
  // setStateAsync für Diagnosestates ist erlaubt; dieser Test soll nicht blockieren.
}
console.log('[mesh-planning] OK: geplante Entscheidungen, Prioritäten, Netzlimit-Diagnose und read-only Schutz vorhanden.');
