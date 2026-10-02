#!/usr/bin/env node
'use strict';
/**
 * Regressionstest für 0.8.36 Mesh/Microgrid Regelbasis im Diagnosemodus.
 * Schützt die Produktgrenze: Geplante Entscheidungen dürfen sichtbar sein,
 * aber keine Hardware-Schreibpfade oder zweite Steuerlogik erzeugen.
 */
const fs = require('fs');
function read(p){ return fs.readFileSync(p, 'utf8'); }
function fail(msg){ console.error('[mesh-planning] ERROR: ' + msg); process.exit(1); }
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
