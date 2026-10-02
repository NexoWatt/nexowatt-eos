// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-energy-flow-live-test-states.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-energy-flow-live-test-states.js
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
 * Original-Hash: 5c6acdec7ace024d7dbff902493fccaed2e7a963e20417a361079e92d4581bf1
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
 * Code-Teil: verify-ts-energy-flow-live-test-states
 *
 * Zweck:
 * Prüft, ob die Diagnose-States für den kontrollierten Energiefluss-TS-Livetest
 * vorhanden sind und vom App-Center gelesen werden können.
 *
 * Zusammenhang:
 * 0.7.86 erlaubt den echten Anlagentest des TS-Kandidatenmodus. Dieser Check
 * verhindert, dass wir die eigentliche TS-Umschaltung testen, ohne gleichzeitig
 * Quelle, Schaltentscheidung und Kandidatenprüfung sichtbar zu machen.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const emsApps = fs.readFileSync(path.join(root, 'www', 'ems-apps.js'), 'utf8');

const requiredMain = [
  'derived.core.building.energyFlowSource',
  'derived.core.building.tsLiveTestState',
  'derived.core.building.tsSwitchJson',
  'derived.core.building.tsCandidateJson',
  '_nwEnergyFlowTsLiveTestStateFromSwitch',
  'energyFlowTsLiveTestState',
  'energyFlowTsCandidateJson',
];
const requiredUi = [
  'energyFlowRuntimeSource',
  'energyFlowTsLiveTestState',
  'energyFlowTsSwitchJson',
  'Live-Test:',
  'Veröffentlichte Quelle:',
];
const missing = [];
for (const token of requiredMain) if (!main.includes(token)) missing.push(`main.js fehlt ${token}`);
for (const token of requiredUi) if (!emsApps.includes(token)) missing.push(`www/ems-apps.js fehlt ${token}`);
if (missing.length) {
  console.error('[ts-energy-flow-live-test] FEHLER:\n' + missing.join('\n'));
  process.exit(1);
}
console.log('[ts-energy-flow-live-test] OK: Diagnose-States und App-Center-Anzeige vorhanden.');
