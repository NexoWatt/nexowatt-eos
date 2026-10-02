// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-energy-flow-shadow-runtime.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-energy-flow-shadow-runtime.js
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
 * Original-Hash: 46407e30e3ee0e5d4b77c5562dbf50ee6a055932463b28b3c8012e67a8376e86
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
 * Datei: scripts/verify-ts-energy-flow-shadow-runtime.js
 *
 * Zweck:
 * Prüft, ob der TypeScript-Energiefluss-Resolver als Shadow-/Vergleichsmodus in
 * `main.js` vorbereitet ist.
 *
 * Zusammenhang:
 * Dieser Check schützt die schrittweise Migration. Der TS-Resolver darf in 0.7.75
 * nur vergleichen und diagnostizieren, aber keine produktiven Werte ersetzen.
 */

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');

const requiredMarkers = [
  '_nwGetEnergyFlowTsMirrorResolver',
  '_nwBuildEnergyFlowTsShadowInput',
  '_nwRunEnergyFlowTsShadowComparison',
  'ts-mirror-shadow',
  'Runtime/TS mismatch',
  'tsShadow',
];

const missing = requiredMarkers.filter((m) => !main.includes(m));
if (missing.length) {
  console.error('[ts-energy-flow-shadow] FAILED: missing markers: ' + missing.join(', '));
  process.exit(1);
}

const resolverPath = path.join(root, 'lib', 'ts-mirrors', 'energy-flow', 'resolvers', 'energy-flow-resolver.js');
const resolver = require(resolverPath);
if (!resolver || typeof resolver.buildEnergyFlowSnapshot !== 'function') {
  console.error('[ts-energy-flow-shadow] FAILED: resolver mirror does not export buildEnergyFlowSnapshot');
  process.exit(1);
}

const snapshot = resolver.buildEnergyFlowSnapshot({
  ts: 1,
  pvW: 2800,
  buildingLoadW: undefined,
  grid: { hasConfiguredSplitDp: true, hasConfiguredSignedDp: false, importW: 0, exportW: 2400 },
  storage: { hasConfiguredSplitDp: true, hasConfiguredSignedDp: false, chargeW: 0, dischargeW: 0, socPct: 44 },
  evcsW: 0,
  heatingRodW: 0,
  thermalW: 0,
});

if (!snapshot || !snapshot.grid || !snapshot.storage) {
  console.error('[ts-energy-flow-shadow] FAILED: resolver mirror did not return expected snapshot shape');
  process.exit(1);
}

console.log('[ts-energy-flow-shadow] OK: Shadow-Vergleich ist vorbereitet und Resolver-Spiegel ist lauffähig.');
