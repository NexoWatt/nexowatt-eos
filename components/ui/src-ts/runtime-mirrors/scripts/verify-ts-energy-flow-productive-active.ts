// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-energy-flow-productive-active.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-energy-flow-productive-active.js
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
 * Original-Hash: dfda32cdf71d18520b722d1d5bae04041bca28ee32806074f252ac930106c227
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

/**
 * Prüfskript: Energiefluss-TS produktive Aktivierung 0.7.101
 *
 * Zweck:
 * Stellt sicher, dass die kontrollierte TypeScript-Energiefluss-Umschaltung nicht
 * nur über JSON-Diagnose sichtbar ist, sondern einen eindeutigen booleschen State
 * `derived.core.building.tsProductiveActive` veröffentlicht.
 *
 * Zusammenhang:
 * Dieser Check schützt den nächsten Migrationsschritt. Wenn der Energiefluss über
 * TS produktiv aktiv wird, muss dieser Zustand für App-Center, Tests und spätere
 * Cleanup-Schritte eindeutig auswertbar sein.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const required = [
  'derived.core.building.tsProductiveActive',
  'energyFlowProductiveTsActive',
  "energyFlowSourceState === 'ts-candidate' || energyFlowSourceState === 'ts-normal'",
  'TypeScript produktiv aktiv',
];
const missing = required.filter((needle) => !main.includes(needle));
if (missing.length) {
  console.error('[ts-energy-flow-productive-active] Fehlende Anker:', missing.join(', '));
  process.exit(1);
}
console.log('[ts-energy-flow-productive-active] OK: produktive TS-Aktivierung inklusive TS-Normalquelle eindeutig diagnostizierbar.');
