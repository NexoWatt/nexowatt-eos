// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-storagefarm-menu-appcenter-gate.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-storagefarm-menu-appcenter-gate.js
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
 * Original-Hash: d3a83e2be86297995defc0d53e347e738cd22b83b466da3f26009e4c16b2a024
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
 * Datei: scripts/verify-storagefarm-menu-appcenter-gate.js
 * Zweck: Regressionstest für die Kunden-Navigation der Speicherfarm.
 *
 * Hintergrund:
 * Alte Runtime-States (`storageFarm.*`) oder Legacy-Flags (`enableStorageFarm`) dürfen den
 * Speicherfarm-Link im Burger-Menü nicht mehr allein sichtbar machen. Sichtbar ist die Seite
 * nur, wenn die App-Center-App `storagefarm` installiert UND aktiv ist und echte Farm-DPs
 * in der Konfiguration vorhanden sind.
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
function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
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
function fail(message) {
  console.error(`[storagefarm-menu-appcenter-gate] FEHLER: ${message}`);
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
function mustNotContain(rel, needle, label) {
  const text = read(rel);
  if (text.includes(needle)) fail(`${label || needle} darf nicht in ${rel} stehen`);
}

// Backend-/Config-Gate: AppCenter installed+enabled ist Pflicht; Legacy-Fallbacks sind verboten.
mustContain('src-ts/runtime-executables/main.ts', 'const appCenterActive = !!(app && app.installed === true && app.enabled === true);', 'AppCenter-Pflicht im Backend');
mustContain('src-ts/runtime-executables/main.ts', "storagefarm', enableFlag: 'enableStorageFarm', noLegacyDefault: true", 'Speicherfarm darf nicht aus Legacy-enableStorageFarm aktiviert werden');
mustContain('src-ts/runtime-executables/main.ts', '_nwStorageFarmRowHasRealDatapoint', 'zentraler echter Farm-DP-Nachweis im Backend');
mustContain('src-ts/runtime-executables/main.ts', 'storageFarmConfiguredCount >= 2', 'Speicherfarm erst ab zwei echten Speichern');
mustContain('src-ts/runtime-executables/main.ts', 'const storageFarmAvailable = !!(storageFarmAppActive && storageFarmConfigured);', 'Kundensichtbarkeit nur bei AppCenter + zwei Speichern');
mustNotContain('src-ts/runtime-executables/main.ts', 'return !!cfg.enableStorageFarm;\n      })();\n      // Stale runtime states', 'Legacy-enableStorageFarm-Fallback für Kundenmenü');
mustNotContain('src-ts/runtime-executables/main.ts', 'out.enableStorageFarm = true;', 'Backend-Hydration darf Farm nicht aktivieren');
mustNotContain('src-ts/runtime-executables/www/ems-apps.ts', 'root.enableStorageFarm = true;', 'AppCenter-Hydration darf Farm nicht aktivieren');

// Frontends müssen die zentrale /config Feature-Sichtbarkeit bevorzugen.
for (const rel of [
  'src-ts/runtime-executables/www/app.ts',
  'src-ts/runtime-executables/www/history.ts',
  'src-ts/runtime-executables/www/evcs.ts',
  'src-ts/runtime-executables/www/report-common.ts',
  'src-ts/runtime-executables/www/smarthome.ts',
  'src-ts/runtime-executables/www/storagefarm.ts',
  'src-ts/runtime-executables/www/year-report.ts',
]) {
  mustContain(rel, 'featureVisibility.hasStorageFarm', `zentrale Feature-Sichtbarkeit in ${rel}`);
}
// cockpit-shell normalisiert /config.featureVisibility lokal als `fv`.
mustContain('src-ts/runtime-executables/www/cockpit-shell.ts', 'fv.hasStorageFarm === true', 'zentrale Feature-Sichtbarkeit in cockpit-shell.ts');

// Nach dem Runtime-Sync muss der gleiche Schutz auch im ausgelieferten JS stehen.
mustContain('main.js', 'const appCenterActive = !!(app && app.installed === true && app.enabled === true);', 'Runtime-Backend AppCenter-Pflicht');
mustNotContain('main.js', 'out.enableStorageFarm = true;', 'Runtime-Backend-Hydration darf Farm nicht aktivieren');
mustNotContain('www/ems-apps.js', 'root.enableStorageFarm = true;', 'Runtime-AppCenter-Hydration darf Farm nicht aktivieren');
mustContain('www/app.js', 'function nwStorageFarmAppCenterActiveFromConfig', 'Runtime-LIVE AppCenter-Helfer');
mustContain('www/app.js', 'featureVisibility.hasStorageFarm', 'Runtime-LIVE autoritative Farm-Sichtbarkeit');
mustContain('www/cockpit-shell.js', 'fv.hasStorageFarm === true', 'Runtime-Shell Feature-Sichtbarkeit');

console.log('[storagefarm-menu-appcenter-gate] OK: Speicherfarm-Menü ist an AppCenter installed+enabled + echte Farm-DPs gebunden.');
