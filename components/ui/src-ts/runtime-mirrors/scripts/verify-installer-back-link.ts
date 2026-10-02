// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-installer-back-link.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-installer-back-link.js
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
 * Original-Hash: 98e0989ffda03dfc626eacee8cc8d11fc11e87728d9bb1c7390e64d73aac4e08
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
 * Datei: scripts/verify-installer-back-link.js
 * Zweck: Regressionstest für den Rücksprung vom App-Center zum ioBroker-/EOS-Admin.
 * Hintergrund: Das App-Center läuft auf dem Adapter-Runtime-Port. Ein relativer
 * Link auf `tab.html` landet deshalb auf dem falschen Port und erzeugt im Browser
 * die Meldung „Datei /tab.html konnte nicht abgerufen werden“. Der Rücksprung muss
 * stattdessen zum Admin-Hash `/#tab-nexowatt-ui-<instanz>` führen.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const ts = fs.readFileSync(path.join(root, 'src-ts', 'runtime-executables', 'www', 'ems-apps.ts'), 'utf8');
const js = fs.readFileSync(path.join(root, 'www', 'ems-apps.js'), 'utf8');
const installerTsx = fs.readFileSync(path.join(root, 'src-admin-tab', 'src', 'pages', 'InstallerPage.tsx'), 'utf8');
const redirectTsx = fs.readFileSync(path.join(root, 'src-admin-tab', 'src', 'pages', 'RedirectPage.tsx'), 'utf8');
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
function fail(message) { console.error('[installer-back-link] ERROR: ' + message); process.exit(1); }
/**
 * Code-Teil: has
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function has(text, needle, label) { if (!text.includes(needle)) fail(label + ' fehlt: ' + needle); }
/**
 * Code-Teil: notHas
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function notHas(text, needle, label) { if (text.includes(needle)) fail(label + ' enthält verbotenen Rest: ' + needle); }
for (const [label, text] of [['TS', ts], ['Runtime', js]]) {
  has(text, '#tab-nexowatt-ui-', label);
  has(text, 'adminPort', label);
  has(text, 'window.top.location.href', label);
  notHas(text, "return 'tab.html'", label);
  notHas(text, 'return "tab.html"', label);
}
has(installerTsx, 'adminBackQuery', 'InstallerPage');
has(installerTsx, 'adminPort', 'InstallerPage');
has(installerTsx, 'instance=', 'InstallerPage');
has(redirectTsx, 'appendAdminBackQuery', 'RedirectPage');
has(redirectTsx, 'adminPort', 'RedirectPage');
console.log('[installer-back-link] OK: App-Center springt zum Admin-Hash statt auf tab.html am Runtime-Port.');
