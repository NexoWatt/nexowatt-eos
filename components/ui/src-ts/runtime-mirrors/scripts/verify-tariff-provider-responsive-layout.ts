// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-tariff-provider-responsive-layout.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-tariff-provider-responsive-layout.js
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
 * Original-Hash: ef3e853fa161b2ca7f97600d1614dd86e8437200f167c567e8c0a8629b6497ff
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

/** Dynamic tariff provider form must occupy a full, auto-growing responsive AppCenter row. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'www/ems-apps.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'www/styles.css'), 'utf8');

assert.match(html, /nw-config-card--full nw-tariff-provider-card/);
assert.match(html, /nw-tariff-provider-layout/);
assert.match(html, /nw-tariff-provider-grid--provider/);
assert.match(html, /nw-tariff-provider-grid--market/);
assert.match(html, /nw-tariff-provider-checks/);
assert.match(html, /nw-tariff-provider-actions/);
assert.match(css, /\.nw-tariff-provider-card\s*\{[\s\S]*grid-column:\s*1\s*\/\s*-1\s*!important/);
assert.match(css, /\.nw-tariff-provider-card[\s\S]*height:\s*auto\s*!important/);
assert.match(css, /#mappingGrid\s*\{[\s\S]*grid-auto-rows:\s*max-content/);
assert.match(css, /overflow:\s*visible\s*!important/);
assert.match(css, /@media \(max-width:\s*1024px\)/);
assert.match(css, /@media \(max-width:\s*520px\)/);
assert.match(css, /grid-template-columns:\s*repeat\(auto-fit/);
assert.match(css, /overflow-wrap:\s*anywhere/);

console.log('[tariff-provider-responsive-layout] OK: tariff provider card is full-width, auto-height and responsive without overflowing neighbouring cards.');
