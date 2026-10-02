// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-feature-visibility-shadow-hook.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-feature-visibility-shadow-hook.js
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
 * Original-Hash: 9e6d8347022fd16383f941304dc6513cc0ad552ee4c583fd1c5d1908df8f67c2
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
 * Datei: scripts/verify-ts-feature-visibility-shadow-hook.js
 *
 * Zweck:
 * Prüft den ersten opt-in Runtime-Hook zwischen altem Frontend-JavaScript und
 * TypeScript-MJS-Spiegeln.
 *
 * Zusammenhang:
 * 0.7.73 darf die produktive Feature-Sichtbarkeit noch nicht umstellen. Dieser
 * Check stellt sicher, dass der neue Shadow-Hook nur diagnostisch arbeitet und
 * nur nach expliziter Aktivierung per Query-Parameter oder localStorage läuft.
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

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
function fail(message) {
  console.error(`[verify-ts-feature-visibility-shadow-hook] ERROR: ${message}`);
  process.exit(1);
}

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
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) fail(`Pflichtdatei fehlt: ${rel}`);
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

/**
 * Code-Teil: requireContains
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function requireContains(rel, needle) {
  const text = read(rel);
  if (!text.includes(needle)) fail(`${rel} enthält erwarteten Inhalt nicht: ${needle}`);
  return text;
}

const app = requireContains('www/app.js', 'function nwTsFeatureVisibilityShadowEnabled');
requireContains('www/app.js', 'function nwBuildTsFeatureVisibilityInput');
requireContains('www/app.js', 'function nwRunTsFeatureVisibilityShadowCheck');
requireContains('www/app.js', "import('/static/ts-mirrors/frontend/customer-feature-visibility.mjs')");
requireContains('www/app.js', '?nwTsFeatureVisibilityShadow=1');
requireContains('www/static/ts-mirrors/frontend/customer-feature-visibility.mjs', 'AUTO-GENERATED FILE');

if (!app.includes('Der Vergleich ist\n  // standardmäßig aus')) {
  fail('www/app.js muss dokumentieren, dass der Shadow-Vergleich standardmäßig aus ist.');
}
if (!app.includes('console.warn(\'[nw-ts-shadow] Feature-Visibility-Abweichung\'')) {
  fail('www/app.js muss Abweichungen nur als Warnung protokollieren.');
}

console.log('[verify-ts-feature-visibility-shadow-hook] OK: opt-in Shadow-Hook für Feature-Visibility ist vorhanden und bleibt nicht-produktiv.');
