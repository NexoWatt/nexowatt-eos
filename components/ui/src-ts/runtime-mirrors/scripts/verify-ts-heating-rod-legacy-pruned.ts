// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-heating-rod-legacy-pruned.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-heating-rod-legacy-pruned.js
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
 * Original-Hash: 74378202eec5132f4cdfe8861fd603aefc7f96587baa97647bb9f406e13103df
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
 * Datei: scripts/verify-ts-heating-rod-legacy-pruned.js
 *
 * Zweck:
 * Prüft den 0.7.117-Cleanup-Schritt: doppelte JS-Referenzdetails des Heizstabs
 * werden weiter aus dem normalen Diagnosepfad entfernt und in einen kompakten
 * Pruned-Status verschoben.
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
function need(file, marker, label) {
  const text = read(file);
  if (!text.includes(marker)) {
    console.error(`[heating-rod-legacy-pruned] ${file}: missing ${label || marker}`);
    process.exit(1);
  }
}
need('ems/modules/heating-rod-control.js', "heatingRod.summary.tsLegacyPrunedJson", 'new pruned state');
need('ems/modules/heating-rod-control.js', '_buildHeatingRodTsLegacyPrunedState', 'pruned builder');
need('ems/modules/heating-rod-control.js', 'heating-rod-legacy-js-reference-pruned-v1', 'pruned JSON source');
need('ems/modules/heating-rod-control.js', 'duplicateReferenceDetailsRemoved', 'duplicate detail reduction marker');
need('ems/modules/heating-rod-control.js', 'fullReferenceDetailsRetained', 'full details retention flag');
need('ems/modules/heating-rod-control.js', 'pruned-counts-only', 'pruned payload mode');
need('ems/modules/heating-rod-control.js', 'legacy-reference-pruned-debug-bridge', 'cleanup stage');
need('www/ems-apps.js', 'JS-Referenzdetails', 'App-Center row');
need('www/ems-apps.js', 'JS-Details reduziert', 'App-Center reduction row');
need('www/ems-apps.js', 'legacyPruned', 'App-Center reads pruned object');
console.log('[heating-rod-legacy-pruned] OK: JS-Referenzdetails werden kompakt/pruned geführt.');
