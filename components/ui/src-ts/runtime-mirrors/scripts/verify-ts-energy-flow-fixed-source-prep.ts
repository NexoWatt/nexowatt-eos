// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-energy-flow-fixed-source-prep.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-energy-flow-fixed-source-prep.js
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
 * Original-Hash: 8015ba6d5c14a974435f8d34233cb9ca56d822d79d81c99c1616cf01eec58466
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
 * Datei: scripts/verify-ts-energy-flow-fixed-source-prep.js
 *
 * Zweck:
 * Prüft den 0.7.103-Schritt: Der Energiefluss-TS-Kandidat sammelt einen stabilen
 * Fixed-Source-Status, damit der alte JS-Fallback nur noch Sicherheitsnetz bleibt.
 *
 * Wichtig:
 * Der Check stellt sicher, dass JS-Fallback nicht entfernt wurde. Er prüft nur, dass
 * TS als feste Energieflussquelle vorbereitet und sauber diagnostiziert wird.
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
    console.error(`[energy-flow-fixed-source] ERROR: ${file} fehlt Marker: ${needle}`);
    process.exit(1);
  }
}
need('main.js', '_nwUpdateEnergyFlowTsFixedSourceState');
need('main.js', '_nwIsEnergyFlowHardFallbackReason');
need('main.js', 'ts-normal-source-active');
need('main.js', 'derived.core.building.tsFixedSourceJson');
need('main.js', 'energyFlowTsFixedSourceState');
need('main.js', 'JS weiterhin Sicherheitsnetz');
need('www/ems-apps.js', 'TS-Normalquelle');
need('www/ems-apps.js', 'TS-Fixed Ticks');
need('www/ems-apps.js', 'energyFlowTsFixedSourceJson');
console.log('[energy-flow-fixed-source] OK: Energiefluss-TS feste/Normalquelle ist vorbereitet, JS-Fallback bleibt Sicherheitsnetz.');
