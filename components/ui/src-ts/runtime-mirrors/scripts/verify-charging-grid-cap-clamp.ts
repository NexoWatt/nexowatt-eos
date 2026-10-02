// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-charging-grid-cap-clamp.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-charging-grid-cap-clamp.js
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
 * Original-Hash: 24e9dfa898b9b8eff69a2e5a429b2c72568abaf87226c79bf286adc5add23f0d
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
const path = require('path');
const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/charging-management.ts'), 'utf8');
const main = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/main.ts'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/www/ems-apps.ts'), 'utf8');
const { rc85GridEnvelope } = require(path.join(root, 'ems/rc85-runtime-hardening.js'));

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
function must(text, needle, label) {
  if (!text.includes(needle)) {
    console.error(`[charging-grid-cap-clamp] Missing ${label}: ${needle}`);
    process.exit(1);
  }
}
/**
 * Code-Teil: calc
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function calc(gridW, evcsActualW, gridLimitW, derivedBaseLoadW = null) {
  const rawBaseLoadW = gridW - evcsActualW;
  const baseLoadW = Number.isFinite(derivedBaseLoadW) ? Math.max(0, derivedBaseLoadW) : Math.max(0, rawBaseLoadW);
  const localSupportW = Math.max(0, baseLoadW - rawBaseLoadW);
  const envelope = rc85GridEnvelope({
    hardLimitW: gridLimitW,
    signedNvpW: gridW,
    currentControlledLoadW: evcsActualW,
  });
  return {
    rawBaseLoadW,
    baseLoadW,
    localSupportW,
    incrementHeadroomW: envelope.hardHeadroomRawW,
    capW: envelope.maxControlledLoadW,
  };
}

const exportCase = calc(-10100, 0, 30000, 700);
if (exportCase.rawBaseLoadW !== -10100
  || exportCase.baseLoadW !== 700
  || exportCase.localSupportW !== 10800
  || exportCase.incrementHeadroomW !== 40100
  || exportCase.capW !== 40100) {
  console.error('[charging-grid-cap-clamp] export case failed', exportCase);
  process.exit(1);
}

const importCase = calc(12000, 3000, 40000, null);
if (importCase.baseLoadW !== 9000 || importCase.incrementHeadroomW !== 28000 || importCase.capW !== 31000) {
  console.error('[charging-grid-cap-clamp] import case failed', importCase);
  process.exit(1);
}

const overImportCase = calc(42000, 5000, 40000, null);
if (overImportCase.incrementHeadroomW !== -2000 || overImportCase.capW !== 3000) {
  console.error('[charging-grid-cap-clamp] over-import shed case failed', overImportCase);
  process.exit(1);
}

must(src, 'gridBaseLoadRawW = gridW -', 'raw base load');
must(src, 'derived.core.building.loadRestW', 'energy-flow loadRestW preference');
must(src, 'gridLocalSupportW = Math.max(0, gridBaseLoadW - gridBaseLoadRawW)', 'local support diagnostic');
must(src, 'hardLimitW: gridImportLimitEffW', 'effective hard import limit');
must(src, 'gridIncrementHeadroomW = gridEnvelope.progressiveIncrementW', 'progressive signed increment');
must(src, 'gridCapEvcsW = clamp(gridEnvelope.maxControlledLoadW, 0, 1e12)', 'import-only EVCS target cap');
must(src, 'chargingManagement.control.gridBaseLoadRawW', 'raw base state');
must(src, 'chargingManagement.control.gridLocalSupportW', 'local support state');
must(main, 'gridBaseLoadRawW', 'api raw base');
must(main, 'gridLocalSupportW', 'api local support');
must(ui, 'Hard-Headroom signed', 'ui signed hard headroom');
must(ui, 'Tatsächlich reduziert', 'ui actual reduction');
must(ui, 'EVCS Cap (NVP / Importgrenze)', 'ui import-only cap label');

console.log('[charging-grid-cap-clamp] OK: signed NVP import-only cap covers export, import and active shedding.');
