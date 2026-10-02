// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-evcs-tile-hover.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-evcs-tile-hover.js
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
 * Original-Hash: 4b74ca308ef6debdb50979d5e0e02a35fc69d2039bcc72cf0f2272ca3825e54d
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

/**
 * NexoWatt 0.8.73 Regressionstest: EVCS-Kacheln dürfen beim Hover nicht grün
 * blinken. Die grüne Umrandung ist ein Ladezustand (`nw-tile--state-on`) und
 * darf nicht durch allgemeine `.nw-tile:hover`-Regeln entstehen.
 */
const fs = require('fs');
const css = fs.readFileSync('www/styles.css', 'utf8');
const required = [
  'body.nw-page-evcs #evcsList .nw-tile:not(.nw-tile--state-on):hover',
  'border-color:rgba(255,255,255,.075) !important',
  'body.nw-page-evcs #evcsList .nw-tile.nw-tile--state-on',
  'border-color:rgba(0,230,118,.86) !important',
  'transform:none !important'
];
const missing = required.filter((needle) => !css.includes(needle));
if (missing.length) {
  console.error('[evcs-tile-hover] Fehlende CSS-Regeln:', missing.join(' | '));
  process.exit(1);
}
console.log('[evcs-tile-hover] OK: Hover bleibt passiv; grüne Umrandung nur bei aktiver Ladung.');
