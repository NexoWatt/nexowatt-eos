// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-nexologic-desktop-layout-rc44.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-nexologic-desktop-layout-rc44.js
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
 * Original-Hash: 60cd9a409247cfbf03a290c0ee39ab42eb544bd9cc20225e2a0b4ed2260156a8
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
const html = fs.readFileSync(path.join(root, 'www/logic.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'www/styles.css'), 'utf8');
const logic = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/www/logic.ts'), 'utf8');

assert.match(html, /<body class="[^"]*nw-page-logic/);
assert.match(html, /<main class="[^"]*nw-logic-page/);
assert.doesNotMatch(html, /nw-page-hero/);
assert.match(css, /body\.nw-page-logic\{[\s\S]*?min-width:1180px;[\s\S]*?overflow-y:scroll !important;/);
assert.match(css, /body\.nw-page-logic \.nw-logic-page\{[\s\S]*?max-width:none !important;[\s\S]*?display:flex;/);
assert.match(css, /body\.nw-page-logic \.nw-le\{[\s\S]*?min-height:620px;/);
assert.match(css, /body\.nw-page-logic \.nw-le\{[\s\S]*?grid-template-columns:/);
assert.match(css, /body\.nw-page-logic \.nw-le__board-wrap\{[\s\S]*?overflow:scroll !important;/);
assert.match(css, /@media \(max-width:1199px\)[\s\S]*min-width:1180px/);
assert.match(logic, /function nwSyncLogicViewportMetrics\(\)/);
assert.match(logic, /--nw-logic-topbar-h/);

console.log('[nexologic-desktop-layout-rc44] OK: NexoLogic nutzt den vollständigen Desktop-Arbeitsbereich mit sichtbarer Seiten-/Canvas-Scrollbarkeit und unabhängigen Seitenleisten.');
