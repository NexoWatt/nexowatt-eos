// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-appcenter-tariff-responsive-layout.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-appcenter-tariff-responsive-layout.js
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
 * Original-Hash: 7342889877c26be24824b87ce6745f66a6b2addf4ea39c3f49ce7a1856cedb47
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
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'www/ems-apps.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'www/styles.css'), 'utf8');

assert(html.includes('nw-config-card--full nw-tariff-provider-card'), 'Tariff provider must be a dedicated full-width card');
assert(html.includes('nw-tariff-provider-layout'), 'Tariff provider layout wrapper missing');
assert(css.includes('#mappingGrid > .nw-tariff-provider-card'), 'Tariff full-width grid rule missing');
assert(css.includes('grid-column: 1 / -1 !important'), 'Tariff card must span full grid width');
assert(css.includes('height: auto !important'), 'Tariff card must grow with content');
assert(css.includes('max-height: none !important'), 'Tariff card max-height must not clip content');
assert(css.includes('overflow: visible !important'), 'Tariff form may not be clipped');
assert(css.includes('@media (max-width: 1024px)'), 'Tablet breakpoint missing');
assert(css.includes('@media (max-width: 520px)'), 'Phone breakpoint missing');
assert(css.includes('grid-template-columns: 1fr'), 'Responsive one-column fallback missing');

console.log('[appcenter-tariff-responsive-layout] OK: tariff provider card is full-width, auto-growing and responsive.');
