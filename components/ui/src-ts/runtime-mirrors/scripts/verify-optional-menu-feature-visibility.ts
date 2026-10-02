// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-optional-menu-feature-visibility.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-optional-menu-feature-visibility.js
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
 * Original-Hash: 041e6f4bc821754a04fb1a76744fbd25d580662b1d2cc790a7a0058c23f12f57
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
 * Datei: scripts/verify-optional-menu-feature-visibility.js
 * Zweck: Regressionstest für optionale Kunden-Unterseiten im Burger-Menü.
 *
 * SmartHome und Speicherfarm dürfen auf LIVE/History/EVCS/Reports nur sichtbar werden,
 * wenn /config.featureVisibility sie ausdrücklich freigibt. Alte Root-Fallbacks wie
 * smartHomeEnabled, storageFarmEnabled oder ems.storageFarmEnabled haben in der
 * Kundennavigation nichts mehr zu suchen, weil sie alte Runtime-/Patch-Zustände wieder
 * sichtbar machen können.
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
function fail(msg) { console.error(`[optional-menu-feature-visibility] FEHLER: ${msg}`); process.exit(1); }
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
function mustContain(rel, needle, label) { if (!read(rel).includes(needle)) fail(`${label || needle} fehlt in ${rel}`); }
/**
 * Code-Teil: mustContainAny
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function mustContainAny(rel, needles, label) { const text = read(rel); if (!needles.some((needle) => text.includes(needle))) fail(`${label || needles.join(' / ')} fehlt in ${rel}`); }
/**
 * Code-Teil: mustNotContain
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function mustNotContain(rel, needle, label) { if (read(rel).includes(needle)) fail(`${label || needle} darf nicht in ${rel} stehen`); }

for (const rel of [
  'src-ts/runtime-executables/www/app.ts',
  'src-ts/runtime-executables/www/cockpit-shell.ts',
  'src-ts/runtime-executables/www/history.ts',
  'src-ts/runtime-executables/www/evcs.ts',
  'src-ts/runtime-executables/www/report-common.ts',
  'src-ts/runtime-executables/www/smarthome.ts',
  'src-ts/runtime-executables/www/storagefarm.ts',
  'src-ts/runtime-executables/www/year-report.ts',
]) {
  mustContainAny(rel, ['featureVisibility.hasSmartHome', 'fv.hasSmartHome', "'hasSmartHome'", 'nwSmartHomeFeatureFromConfig'], `SmartHome featureVisibility in ${rel}`);
  mustContainAny(rel, ['featureVisibility.hasStorageFarm', 'fv.hasStorageFarm', "'hasStorageFarm'", 'nwStorageFarmFeatureFromConfig'], `Speicherfarm featureVisibility in ${rel}`);
}

for (const rel of [
  'src-ts/runtime-executables/www/app.ts',
  'src-ts/runtime-executables/www/cockpit-shell.ts',
  'src-ts/runtime-executables/www/history.ts',
  'src-ts/runtime-executables/www/evcs.ts',
  'src-ts/runtime-executables/www/report-common.ts',
  'src-ts/runtime-executables/www/storagefarm.ts',
]) {
  mustNotContain(rel, 'cfg.smartHomeEnabled || (cfg.smartHome && cfg.smartHome.enabled)', `SmartHome Legacy-Fallback in ${rel}`);
  mustNotContain(rel, 'cfg.storageFarmEnabled || (cfg.ems && cfg.ems.storageFarmEnabled)', `Speicherfarm Legacy-Fallback in ${rel}`);
  mustNotContain(rel, 'ems.storageFarmEnabled || cfg.storageFarmEnabled', `Speicherfarm EMS-Fallback in ${rel}`);
}

mustContain('src-ts/runtime-executables/main.ts', 'const smartHomeForConfig', 'Backend überschreibt SmartHome-Config-Sichtbarkeit');
mustContain('src-ts/runtime-executables/main.ts', 'storageFarmConfiguredCount >= 2', 'Backend blendet Farm erst ab zwei Speichern ein');

mustContain('www/app.js', 'nwSmartHomeFeatureFromConfig', 'Runtime-LIVE SmartHome-Helfer');
mustContain('www/cockpit-shell.js', 'fv.hasSmartHome === true', 'Runtime-Shell nutzt featureVisibility für SmartHome');
mustContain('www/cockpit-shell.js', 'fv.hasStorageFarm === true', 'Runtime-Shell nutzt featureVisibility für Speicherfarm');

console.log('[optional-menu-feature-visibility] OK: optionale Burger-Menüpunkte hängen an /config.featureVisibility.');
