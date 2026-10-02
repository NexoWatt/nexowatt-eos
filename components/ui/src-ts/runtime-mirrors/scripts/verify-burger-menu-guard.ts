// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-burger-menu-guard.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-burger-menu-guard.js
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
 * Original-Hash: e7745e159370ecfa03bc27a0d0053e8acd71085a341b5454a0147d956839a931
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
 * NexoWatt 0.8.21 regression guard: Burger-Menü.
 *
 * Zweck:
 * - Verhindert, dass App-Seite und Shell denselben Menübutton doppelt binden.
 * - Ein doppelter Toggle-Handler öffnet und schließt das Dropdown im selben Klick.
 * - Der Test bleibt bewusst statisch, weil die produktiven Browserdateien aus
 *   src-ts/runtime-executables/** erzeugt werden und der Guard dort stehen muss.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

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
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

/**
 * Code-Teil: fail
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function fail(msg) {
  console.error(`[burger-menu-guard] FEHLER: ${msg}`);
  process.exit(1);
}

/**
 * Code-Teil: mustContain
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function mustContain(rel, needle, label) {
  const text = read(rel);
  if (!text.includes(needle)) fail(`${label || needle} fehlt in ${rel}`);
}

/**
 * Code-Teil: mustMatch
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function mustMatch(rel, regex, label) {
  const text = read(rel);
  if (!regex.test(text)) fail(`${label || regex} fehlt in ${rel}`);
}

// Gemeinsame Shell darf nur binden, wenn kein anderer Menü-Binder markiert ist.
mustContain('src-ts/runtime-executables/www/nw-shell.ts', '!btn.dataset.nwMenuBound', 'Shell-Menüguard nwMenuBound');
mustContain('src-ts/runtime-executables/www/nw-shell.ts', "btn.dataset.nwMenuBound = btn.dataset.nwMenuBound || 'shell-capture'", 'Shell markiert eigenen Fallback');
mustContain('src-ts/runtime-executables/www/cockpit-shell.ts', '!btn.dataset.nwMenuBound', 'Cockpit-Fallback respektiert Guard');

// Seiten mit eigener Menülogik müssen den Button als App-Menü markieren.
const appPages = [
  ['src-ts/runtime-executables/www/app.ts', 'app'],
  ['src-ts/runtime-executables/www/evcs.ts', 'evcs'],
  ['src-ts/runtime-executables/www/history.ts', 'history'],
  ['src-ts/runtime-executables/www/smarthome.ts', 'smarthome'],
  ['src-ts/runtime-executables/www/logic.ts', 'logic'],
  ['src-ts/runtime-executables/www/report-common.ts', 'report-common'],
  ['src-ts/runtime-executables/www/evcs-report.ts', 'evcs-report'],
  ['src-ts/runtime-executables/www/year-report.ts', 'year-report'],
];

for (const [rel, owner] of appPages) {
  mustContain(rel, 'dataset.nwMenuBound', `${owner}: Menü-Bindungsmarker`);
  mustContain(rel, 'dataset.nwAppMenu', `${owner}: App-Menümarker`);
  mustMatch(rel, /addEventListener\(['"]click['"].*?(preventDefault\(\)|stopPropagation\(\))/s, `${owner}: Klickhandler mit Eventschutz`);
}

// Nach dem Runtime-Sync müssen die produktiven JS-Artefakte dieselben Marker tragen.
mustContain('www/nw-shell.js', '!btn.dataset.nwMenuBound', 'Runtime-Shell-Menüguard');
mustContain('www/app.js', "dataset.nwMenuBound = 'app'", 'Runtime-App-Menüguard');
mustContain('www/evcs.js', "dataset.nwMenuBound = 'evcs'", 'Runtime-EVCS-Menüguard');
mustContain('www/history.js', "dataset.nwMenuBound = 'history'", 'Runtime-History-Menüguard');
mustContain('www/smarthome.js', "dataset.nwMenuBound = 'smarthome'", 'Runtime-SmartHome-Menüguard');

console.log('[burger-menu-guard] OK: Burger-Menü ist gegen doppelte Shell-/Seiten-Handler abgesichert.');
