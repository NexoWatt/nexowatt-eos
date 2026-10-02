// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-customer-workspace-access-rc44.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-customer-workspace-access-rc44.js
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
 * Original-Hash: d219f1d45a6a97e48b14a9643de9beb1eef1001f4dd310de9bd3af5beab07c4b
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

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
/**
 * Code-Teil: read
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const main = read('src-ts/runtime-executables/main.ts');
const smarthome = read('www/smarthome-config.html');
const logic = read('www/logic.html');
const apps = read('www/ems-apps.html');
const simulation = read('www/simulation.html');

assert.match(main, /const requireCustomerWorkspace = requireAuth;/);
assert.match(main, /const requireSmartHomeConfig = requireCapability\('smarthome\.configure'\);/);
assert.match(main, /const requireNexoLogicConfig = requireCapability\('nexologic\.configure'\);/);
assert.match(main, /app\.get\(\['\/smarthome-config\.html', '\/smarthome-config'\], async \(req, res\)/);
assert.match(main, /app\.get\(\['\/logic\.html','\/logic'\], async \(req, res\)/);
assert.match(smarthome, /data-nw-required-capability="smarthome\.configure"/);
assert.match(logic, /data-nw-required-capability="nexologic\.configure"/);
assert.doesNotMatch(smarthome, /admin-guard\.js/);
assert.doesNotMatch(logic, /admin-guard\.js/);

assert.match(apps, /data-nw-required-capability="appcenter\.open"/);
assert.match(simulation, /data-nw-admin-page="simulation"/);
assert.match(main, /requirePageAccessOrRenderLock\(req, res, 'simulation\.open'/);
assert.match(main, /const requireAdmin = requireCapability\('license\.manage'\)/);
assert.match(main, /app\.post\('\/api\/smarthome\/dpset', requireInstaller/);

console.log('[customer-workspace-access-rc44] OK: customer operation stays available; technical configuration and raw DP access require a privileged role.');
