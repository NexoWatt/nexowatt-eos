// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-shadow-readiness.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-shadow-readiness.js
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
 * Original-Hash: e2f84f513ee8467510f98c3b77368f3a5f894505092b7d74a383502df35ad0a5
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
 * Datei: scripts/verify-ts-shadow-readiness.js
 *
 * Zweck:
 * Prüft, ob die Auswertung der TS-Shadow-Diagnose und die vorbereitete
 * Umschaltbereitschaft vorhanden sind.
 *
 * Zusammenhang:
 * 0.7.79 bereitet die spätere Energiefluss-Umschaltung vor, schaltet aber noch
 * nichts produktiv um. Dieser Check verhindert, dass die Diagnose- und
 * Sicherheitsanker versehentlich entfernt werden.
 */

const fs = require('fs');
const path = require('path');
const root = process.cwd();
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
function need(cond, msg) { if (!cond) { console.error('[ts-shadow-readiness] ' + msg); process.exit(1); } }

const main = read('main.js');
const ui = read('www/ems-apps.js');
const css = read('www/styles.css');

need(main.includes('_nwEvaluateEnergyFlowSwitchReadinessFromControl'), 'main.js: Backend-Auswertung der TS-Umschaltbereitschaft fehlt.');
need(main.includes('control.tsShadowReadiness = this._nwEvaluateEnergyFlowSwitchReadinessFromControl(control);'), 'main.js: Diagnose-API hängt tsShadowReadiness nicht an.');
need(main.includes('readyForEnergyFlowSwitch'), 'main.js: Energiefluss-Freigabefeld fehlt.');
need(main.includes('Auch wenn `readyForEnergyFlowSwitch` true ist'), 'main.js: Sicherheitskommentar zur Nicht-Umschaltung fehlt.');
need(ui.includes('function _renderShadowReadinessCard'), 'www/ems-apps.js: Readiness-Karte fehlt.');
need(ui.includes('ctrl.tsShadowReadiness'), 'www/ems-apps.js: UI liest tsShadowReadiness nicht.');
need(css.includes('.nw-shadow-readiness-card'), 'www/styles.css: Readiness-Styles fehlen.');

console.log('[ts-shadow-readiness] OK: Shadow-Auswertung und Umschaltbereitschaft sind vorbereitet.');
