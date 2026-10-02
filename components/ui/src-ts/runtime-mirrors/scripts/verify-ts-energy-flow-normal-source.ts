// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-energy-flow-normal-source.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-energy-flow-normal-source.js
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
 * Original-Hash: 76b67f3b0bca2815c88c3bced375b9d9a475ac4a827564ddb4713e4676fcbc14
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
 * Datei: scripts/verify-ts-energy-flow-normal-source.js
 *
 * Zweck:
 * Prüft den 0.7.104-Schritt: Nach stabiler Fixed-Source-Phase wird der Energiefluss
 * als `ts-normal` veröffentlicht. JavaScript bleibt nur noch Notfallback bei harten Blockern.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
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
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
/**
 * Code-Teil: need
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function need(file, needle) {
  const text = read(file);
  if (!text.includes(needle)) {
    console.error(`[energy-flow-normal-source] ERROR: ${file} fehlt Marker: ${needle}`);
    process.exit(1);
  }
}
need('main.js', 'ts-normal');
need('main.js', 'ts-normal-source-active');
need('main.js', 'normalSourceActive');
need('main.js', "energyFlowSourceState === 'ts-candidate' || energyFlowSourceState === 'ts-normal'");
need('main.js', 'TS ist als Energiefluss-Normalquelle vorbereitet');
need('main.js', 'JS-Fallback bleibt nur noch Notfallback');
need('www/ems-apps.js', 'TS NORMAL');
need('www/ems-apps.js', 'TS-Normalquelle');
need('scripts/verify-ts-energy-flow-productive-active.js', "ts-normal");
console.log('[energy-flow-normal-source] OK: Energiefluss-TS ist als Normalquelle vorbereitet, JS bleibt Notfallback.');
