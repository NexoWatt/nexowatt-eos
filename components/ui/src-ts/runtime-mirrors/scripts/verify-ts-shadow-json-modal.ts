// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-shadow-json-modal.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-shadow-json-modal.js
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
 * Original-Hash: 9c4ccbe9542e072af15f0f6891a8e30011e817b50c356fbdcc8c59c1528e74c1
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
const path = require('path');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'www', 'ems-apps.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'www', 'styles.css'), 'utf8');
const required = ['_openShadowJsonDialog', 'nw-shadow-json-dialog', '_shadowStatusLabel', 'nw-shadow-badge--wait'];
const missing = required.filter((x) => !app.includes(x) && !css.includes(x));
if (missing.length) { console.error('[shadow-json-ui] Missing markers: ' + missing.join(', ')); process.exit(1); }
if (app.includes('<summary>JSON anzeigen</summary>')) { console.error('[shadow-json-ui] Old details JSON viewer still present.'); process.exit(1); }
console.log('[shadow-json-ui] OK');
