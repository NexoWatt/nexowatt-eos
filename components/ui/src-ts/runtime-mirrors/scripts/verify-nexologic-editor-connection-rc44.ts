// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-nexologic-editor-connection-rc44.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-nexologic-editor-connection-rc44.js
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
 * Original-Hash: 66005ccb443253258d3af2beb195d84796b16c97b99540fdfbb68de28388e095
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

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
/**
 * Code-Teil: read
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const source = read('src-ts/runtime-executables/www/logic.ts');
const runtime = read('www/logic.js');
const html = read('www/logic.html');
const css = read('www/styles.css');

for (const text of [source, runtime]) {
  assert.match(text, /const byType = nwLE\.lib && nwLE\.lib\.byType/);
  assert.doesNotMatch(text, /nwLE\.library\.byType/);
  assert.match(text, /d\.addEventListener\('mousedown',[\s\S]*nwStartConnect\(node\.id, p\.key\)/);
  assert.match(text, /d\.addEventListener\('click',[\s\S]*nwFinishConnect\(node\.id, p\.key\)/);
  assert.match(text, /d\.addEventListener\('mouseup',[\s\S]*nwFinishConnect\(node\.id, p\.key\)/);
  assert.match(text, /nwApplyConnectVisualState\(\)/);
  assert.match(text, /nwWouldCreateLogicCycle/);
}

assert.match(html, /Ausgang \(rechts\) anklicken oder ziehen/);
assert.match(css, /body\.nw-page-logic \.nw-le\{/);
assert.match(css, /grid-template-columns:\s*minmax\(225px,\s*265px\)\s+minmax\((?:680|720)px,\s*1fr\)\s+minmax\(270px,\s*330px\)/);
assert.match(css, /\.nw-le-port\.is-connect-target/);
assert.match(css, /\.nw-le-port\.is-connect-incompatible/);

console.log('[nexologic-editor-connection-rc44] OK: port lookup, click/drag connection and desktop workspace contract are present.');
