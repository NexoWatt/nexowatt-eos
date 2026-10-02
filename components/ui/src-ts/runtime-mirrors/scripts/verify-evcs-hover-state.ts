// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-evcs-hover-state.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-evcs-hover-state.js
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
 * Original-Hash: 8d43b24f87f2269d76ef36ca20997edddf088f7544d8ee9cb559cd4f7209cca2
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
const cssPath = path.join(__dirname, '..', 'www', 'styles.css');
const css = fs.readFileSync(cssPath, 'utf8');
/**
 * Code-Teil: must
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function must(pattern, msg) {
  if (!pattern.test(css)) {
    console.error('[evcs-hover-state] ERROR:', msg);
    process.exit(1);
  }
}
must(/NexoWatt 0\.8\.73 .*EVCS-Kacheln/s, '0.8.73 Kommentar für EVCS-Hover fehlt.');
must(/body\.nw-page-evcs\s+\.nw-evcs-page\s+\.nw-tile:not\(\.nw-tile--state-on\):hover[\s\S]*border-color:rgba\(255,255,255,\.075\) !important/s, 'Neutraler Hover für nicht aktive EVCS-Kacheln fehlt.');
must(/body\.nw-page-evcs\s+\.nw-evcs-page\s+\.nw-tile\.nw-tile--state-on[\s\S]*border-color:rgba\(0,230,118,\.88\) !important/s, 'Grüner Zustand nur für aktive EVCS-Kacheln fehlt.');
must(/body\.nw-page-evcs\s+\.nw-evcs-page\s+\.nw-tile,[\s\S]*transform:none !important/s, 'EVCS-Hover-Transform wurde nicht neutralisiert.');
console.log('[evcs-hover-state] OK: EVCS-Hover bleibt neutral; grün leuchtet nur bei aktivem Ladezustand.');
