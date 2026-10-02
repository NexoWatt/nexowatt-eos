// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-frontend-public-controls.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-frontend-public-controls.js
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
 * Original-Hash: 83dbd5a938061b15a73a956566191b6cbb9f99910631d152bcb329bb854b1549
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
 * Datei: scripts/verify-frontend-public-controls.js
 * Zweck: Statischer Release-Check für 0.8.75: Endkunden-Frontend-Bedienung bleibt ohne Admin-/Installer-Login möglich.
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
  console.error('[frontend-public-controls] ERROR: ' + message);
  process.exit(1);
}

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
function need(condition, message) {
  if (!condition) fail(message);
}

/**
 * Code-Teil: includesAll
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function includesAll(text, parts) {
  return parts.every((part) => text.includes(part));
}

const main = read('main.js');
const mainTs = read('src-ts/runtime-executables/main.ts');
const indexHtml = read('www/index.html');
const settingsHtml = read('www/settings.html');

for (const [label, text] of [['main.js', main], ['src-ts/runtime-executables/main.ts', mainTs]]) {
  need(text.includes('const attachOptionalAuth = async'), `${label}: optionaler Frontend-Auth-Helfer fehlt.`);
  need(text.includes("app.post('/api/set', attachOptionalAuth, async"), `${label}: /api/set muss für LIVE-/Kundenbedienung ohne Pflichtlogin laufen.`);
  need(!text.includes("app.post('/api/set', requireAuth, async"), `${label}: /api/set darf nicht mehr requireAuth verwenden.`);
  need(text.includes("app.get('/api/flow/qc/read', attachOptionalAuth, async"), `${label}: Energiefluss-Schnellsteuerung-Readback muss ohne Pflichtlogin laufen.`);
  need(includesAll(text, ["scope === 'installer' || scope === 'rfid'", 'getSetAccess()', '!s || !s.isInstaller']), `${label}: Installer-/RFID-Scopes müssen weiterhin explizit geschützt bleiben.`);
  need(includesAll(text, ["scope === 'storageFarm'", "res.status(403).json({ ok: false, error: 'forbidden' })"]), `${label}: Speicherfarm-Konfiguration muss im VIS weiterhin blockiert bleiben.`);
  need(text.includes("const requireInstaller = requireCapability('appcenter.open')"), `${label}: App-Center muss weiter rollenbasiert geschützt bleiben.`);
  need(text.includes("const requireAdmin = requireCapability('license.manage')"), `${label}: Lizenzverwaltung muss weiter Admin-geschützt bleiben.`);
}

need(!indexHtml.includes('/static/auth.js'), 'www/index.html darf keinen Auth-Header/Login für die Endkunden-LIVE-Seite laden.');
need(!settingsHtml.includes('/static/auth.js'), 'www/settings.html darf keinen Auth-Header/Login für Kundeneinstellungen laden.');

console.log('[frontend-public-controls] OK: LIVE-/Kundensteuerung öffentlich, Admin-/Installer-Schutz bleibt erhalten.');
