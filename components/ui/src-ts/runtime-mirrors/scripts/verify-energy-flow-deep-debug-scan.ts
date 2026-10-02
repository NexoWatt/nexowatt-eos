// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-energy-flow-deep-debug-scan.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-energy-flow-deep-debug-scan.js
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
 * Original-Hash: d9b27d6fe42e326741b578ef1f5298bb1a111f99518b8b01a63e08b8cd087215
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
 * Datei: scripts/verify-energy-flow-deep-debug-scan.js
 *
 * Zweck:
 * Tieferer Code-Scan für den Energiefluss-Umbau. Der Check sucht nach typischen
 * Regressionsstellen aus den letzten Versionen: exakte Quelle nur `ts-candidate`,
 * fehlendes `ts-normal`, falsche JS-Fallback-Wertung und fehlende Diagnosefelder.
 *
 * Wichtig:
 * Das ist kein Ersatz für echte Anlagentests. Es verhindert aber, dass bekannte
 * Migrationsfallen direkt im Code wieder eingebaut werden.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const appCenter = fs.readFileSync(path.join(root, 'www', 'ems-apps.js'), 'utf8');
const errors = [];
/**
 * Code-Teil: requireMarker
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function requireMarker(text, marker, label) { if (!text.includes(marker)) errors.push(`${label}: fehlt ${marker}`); }
/**
 * Code-Teil: forbid
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function forbid(text, marker, label) { if (text.includes(marker)) errors.push(`${label}: verbotener alter Marker ${marker}`); }
requireMarker(main, "publishedSource = switchState.useTs ? (switchState.normalSourceActive ? 'ts-normal' : 'ts-candidate') : 'js-runtime'", 'main.js');
requireMarker(main, 'switchState.normalSourceActive', 'main.js');
requireMarker(main, 'fixedSourceReady', 'main.js');
requireMarker(main, 'tsFixedSourceJsonText', 'main.js');
requireMarker(main, 'derived.core.building.energyFlowSource', 'main.js');
requireMarker(appCenter, 'TS NORMAL', 'www/ems-apps.js');
requireMarker(appCenter, 'TS-Normalquelle', 'www/ems-apps.js');
forbid(main, "const energyFlowProductiveTsActive = energyFlowSourceState === 'ts-candidate';", 'main.js');
if (errors.length) {
  console.error('[energy-flow-deep-debug-scan] Fehler:');
  for (const e of errors) console.error(' - ' + e);
  process.exit(1);
}
console.log('[energy-flow-deep-debug-scan] OK: keine bekannten Energiefluss-TS-Normalquellen-Debugfallen gefunden.');
