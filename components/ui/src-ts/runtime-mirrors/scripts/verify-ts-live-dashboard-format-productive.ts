// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-live-dashboard-format-productive.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-live-dashboard-format-productive.js
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
 * Original-Hash: 0a22c5dcbf1f63ae404f379cbc63d0081b015bceb5cb35ede051388ebdb31193
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
 * Datei: scripts/verify-ts-live-dashboard-format-productive.js
 *
 * Zweck:
 * Prüft, dass das LIVE-Dashboard die TypeScript-Formatter produktiv lädt und die
 * alten JS-Formatter als Fallback behält.
 */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
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
  console.error('[ts-live-dashboard-format-productive] ERROR: ' + message);
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
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) fail('Pflichtdatei fehlt: ' + rel);
  return fs.readFileSync(p, 'utf8');
}
/**
 * Code-Teil: contains
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function contains(rel, needle) {
  const text = read(rel);
  if (!text.includes(needle)) fail(rel + ' enthält erwarteten Marker nicht: ' + needle);
  return text;
}

(async () => {
  contains('src-ts/frontend/live-dashboard-format.ts', 'Code-Teil: formatDashboardPower');
  contains('src-ts/frontend/live-dashboard-format.ts', '0` ist ein gültiger Wert');
  contains('www/static/ts-mirrors/frontend/live-dashboard-format.mjs', 'AUTO-GENERATED FILE');
  contains('www/app.js', "import('./static/ts-mirrors/frontend/live-dashboard-format.mjs')");
  contains('www/app.js', "nxTryTsDashboardFormat('formatDashboardPower'");
  contains('www/app.js', "nxTryTsDashboardFormat('formatDashboardEnergyKwh'");
  contains('www/app.js', "nxTryTsDashboardFormat('formatDashboardPowerSigned'");
  contains('www/app.js', "nxTryTsDashboardFormat('formatDashboardFlowPower'");
  contains('package.json', 'test:live-dashboard-format-productive');

  const mod = await import(pathToFileURL(path.join(root, 'www/static/ts-mirrors/frontend/live-dashboard-format.mjs')).href);
  if (mod.formatDashboardPower(0, 'W') !== '0 W') fail('0 W wird nicht korrekt formatiert.');
  if (mod.formatDashboardPower(1500, 'kW') !== '1.50 kW') fail('kW-Format ist nicht kompatibel.');
  if (mod.formatDashboardPowerSigned(-120, 'W') !== '-120 W') fail('signiertes W-Format ist nicht kompatibel.');
  if (mod.formatDashboardEnergyKwh(1500) !== '1.50 MWh') fail('Energy-Format ist nicht kompatibel.');
  if (mod.formatDashboardFlowPower(1500, 1) !== '1.5 kW') fail('Flow-Power-Format ist nicht kompatibel.');
  console.log('[ts-live-dashboard-format-productive] OK: LIVE-Dashboard nutzt TS-Formatter produktiv mit JS-Fallback.');
})().catch((err) => fail(err && err.stack ? err.stack : String(err)));
