// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-nexologic-simulation-coverage-rc46.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-nexologic-simulation-coverage-rc46.js
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
 * Original-Hash: cc71b5a34c4a5e732e83cdad8cd65c5bd7c9709d5f9b21a7f6f1c627e299451c
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
 * RC46 statischer Schutzvertrag für NexoLogic.
 *
 * Die Prüfung stellt sicher, dass die vollständige produktive Bausteinbibliothek
 * im Browser-Testmodus ausgewertet wird, dass der Testmodus keine API-/Hardware-
 * Schreibpfade enthält und dass die neuen Layout-/History-Bedienelemente in der
 * ausgelieferten Oberfläche vorhanden bleiben.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'src-ts', 'runtime-executables', 'www', 'logic.ts');
const runtimePath = path.join(root, 'www', 'logic.js');
const htmlPath = path.join(root, 'www', 'logic.html');
const cssPath = path.join(root, 'www', 'styles.css');

const source = fs.readFileSync(sourcePath, 'utf8');
const runtime = fs.readFileSync(runtimePath, 'utf8');
const html = fs.readFileSync(htmlPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');

/**
 * Code-Teil: between
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function between(text, startMarker, endMarker, label) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0 && end > start, `${label} konnte nicht aus der Quelle gelesen werden.`);
  return text.slice(start, end);
}

const libraryBlock = between(source, 'function nwBuildLogicLibrary()', 'function nwDefaultGraph()', 'NexoLogic-Bibliothek');
const simulationBlock = between(source, 'function nwSimBool(', 'function nwGetBoardPointFromClient(', 'NexoLogic-Simulation');
const computeBlock = between(source, 'function nwSimComputeNode(', 'function nwSimTopologicalOrder(', 'Simulationsauswertung');

const libraryTypes = [...libraryBlock.matchAll(/\btype:\s*'([^']+)'/g)].map((match) => match[1]);
const uniqueLibraryTypes = [...new Set(libraryTypes)];
assert.equal(uniqueLibraryTypes.length, 41, `Erwartet werden 41 eindeutige Bausteintypen, gefunden wurden ${uniqueLibraryTypes.length}.`);

const simulatedTypes = [...computeBlock.matchAll(/\bcase\s+'([^']+)'\s*:/g)].map((match) => match[1]);
const uniqueSimulatedTypes = new Set(simulatedTypes);
const missing = uniqueLibraryTypes.filter((type) => !uniqueSimulatedTypes.has(type));
assert.deepEqual(missing, [], `Diese produktiven Bausteine fehlen im Testmodus: ${missing.join(', ')}`);

for (const forbidden of [
  /\bfetch\s*\(/,
  /\bnwApi\s*\(/,
  /\bnwSaveConfig\s*\(/,
  /XMLHttpRequest/,
  /\/api\//,
]) {
  assert.equal(forbidden.test(simulationBlock), false, `Der schreibfreie Testmodus enthält einen verbotenen API-/Hardwarepfad: ${forbidden}`);
}

for (const symbol of [
  'function nwNodeLane(',
  'function nwFindFreeLanePosition(',
  'function nwAutoLayoutGraph(',
  'function nwUndo(',
  'function nwRedo(',
  'function nwWriteLocalDraftNow(',
  'function nwOpenSimulation(',
  'function nwSimAdvance(',
]) {
  assert.ok(source.includes(symbol), `RC46-Funktion fehlt in logic.ts: ${symbol}`);
  assert.ok(runtime.includes(symbol.replace('function ', 'function ')), `RC46-Funktion fehlt in www/logic.js: ${symbol}`);
}

for (const id of [
  'nw-le-btn-undo',
  'nw-le-btn-redo',
  'nw-le-btn-layout',
  'nw-le-btn-sim',
  'nw-le-sim-panel',
  'nw-le-sim-inputs',
  'nw-le-sim-trace',
]) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `Bedienelement fehlt in logic.html: ${id}`);
}

for (const selector of [
  '.nw-le__lane--input',
  '.nw-le__lane--logic',
  '.nw-le__lane--output',
  '.nw-le-sim',
  '.nw-le-node__sim-value',
  '.nw-le-wire-value',
]) {
  assert.ok(css.includes(selector), `RC46-Style fehlt: ${selector}`);
}

assert.match(source, /type === 'scene_trigger' \|\| type === 'dp_out'\) return 'output'/, 'Ausgänge müssen in der rechten Spur eingeordnet werden.');
assert.match(source, /def && def\.category === 'Eingänge'\) return 'input'/, 'Eingänge müssen in der linken Spur eingeordnet werden.');
assert.match(source, /window\.addEventListener\('beforeunload',[\s\S]*nwWriteLocalDraftNow/, 'Lokaler Entwurf muss vor dem Verlassen unmittelbar gesichert werden.');

console.log(`[nexologic-simulation-coverage-rc46] OK: ${uniqueLibraryTypes.length}/${uniqueLibraryTypes.length} Bausteine abgedeckt; Simulation read-only; Layout, Undo/Redo und lokaler Entwurf vollständig ausgeliefert.`);
