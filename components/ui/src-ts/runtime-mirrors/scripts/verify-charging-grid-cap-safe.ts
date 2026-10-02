// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-charging-grid-cap-safe.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-charging-grid-cap-safe.js
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
 * Original-Hash: 2a49cbb655d059d7b7a902570adb4b0bc59303f08ed1f74c41273f09ef7c9e1f
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

const fs = require('fs');
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
function read(p) { return fs.readFileSync(p, 'utf8'); }
/**
 * Code-Teil: must
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function must(file, needle) {
  const source = read(file);
  if (!source.includes(needle)) {
    console.error(`[charging-grid-cap-safe] Missing in ${file}: ${needle}`);
    process.exit(1);
  }
}
/**
 * Code-Teil: mustNot
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function mustNot(file, needle) {
  const source = read(file);
  if (source.includes(needle)) {
    console.error(`[charging-grid-cap-safe] Forbidden in ${file}: ${needle}`);
    process.exit(1);
  }
}

const pkg = JSON.parse(read('package.json'));
if (!/^\d+\.\d+\.\d+$/.test(String(pkg.version || ''))) {
  console.error('[version] invalid SemVer');
  process.exit(1);
}

const ts = 'src-ts/runtime-executables/ems/modules/charging-management.ts';
const js = 'ems/modules/charging-management.js';
const uiTs = 'src-ts/runtime-executables/www/ems-apps.ts';
const uiJs = 'www/ems-apps.js';

for (const file of [ts, js]) {
  must(file, 'gridBaseLoadRawW = gridW - gridEvcsActualForCapW');
  must(file, 'derived.core.building.loadRestW');
  must(file, 'gridLocalSupportW = Math.max(0, gridBaseLoadW - gridBaseLoadRawW)');
  must(file, 'hardLimitW: gridImportLimitEffW');
  must(file, 'currentControlledLoadW: gridEvcsActualForCapW');
  must(file, 'gridIncrementHeadroomW = gridEnvelope.progressiveIncrementW');
  must(file, 'gridCapEvcsW = clamp(gridEnvelope.maxControlledLoadW, 0, 1e12)');
  must(file, 'resolveCurrentNvpSnapshot(');
  mustNot(file, 'gridCapEvcsW = clamp(gridImportLimitEffW - gridBaseLoadW, 0, gridImportLimitEffW)');
}

must(ts, 'chargingManagement.control.gridLocalSupportW');
must('src-ts/runtime-executables/main.ts', 'gridLocalSupportW: await getOwn');
must(uiTs, 'EVCS Cap (NVP / Importgrenze)');
must(uiTs, 'Hard-Headroom signed');
must(uiJs, 'EVCS Cap (NVP / Importgrenze)');

console.log('OK: EVCS grid cap uses signed NVP plus fresh EVCS actual power; export increases import-only headroom and reservations stay excluded.');
