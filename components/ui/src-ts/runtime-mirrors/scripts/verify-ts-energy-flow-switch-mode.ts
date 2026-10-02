// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-energy-flow-switch-mode.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-energy-flow-switch-mode.js
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
 * Original-Hash: 7b1c14fe8c4da98883d32f72ef70d173732dfe0575a8975edb6506c62eb43afc
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
 * Code-Teil: verify-ts-energy-flow-switch-mode
 *
 * Zweck:
 * Prüft die 0.7.80-Vorbereitung für den kontrollierten Energiefluss-TS-Modus.
 *
 * Zusammenhang:
 * Der Adapter darf nicht automatisch auf TypeScript-Werte umschalten. Diese Prüfung
 * stellt sicher, dass es zwar einen Modus `js/shadow/ts` und einen Effective-Plan gibt,
 * aber die Diagnose weiterhin klar als Umschaltvorbereitung gekennzeichnet ist.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'www', 'ems-apps.js'), 'utf8');

const requiredMain = [
  '_nwNormalizeEnergyFlowTsMode',
  '_nwGetEnergyFlowTsMode',
  '_nwBuildEnergyFlowTsEffectivePlan',
  'energyFlowMode',
  'energyFlowEffectivePlan',
  'energyFlowProductionAllowed',
  'NEXOWATT_ENERGYFLOW_TS_MODE',
  'Produktiv bleibt die JavaScript-Runtime',
];
const requiredUi = [
  'Energiefluss-Modus',
  'Energiefluss-Quelle',
  'energyFlowEffectivePlan',
];
const missing = [];
for (const token of requiredMain) {
  if (!main.includes(token)) missing.push(`main.js fehlt: ${token}`);
}
for (const token of requiredUi) {
  if (!ui.includes(token)) missing.push(`www/ems-apps.js fehlt: ${token}`);
}
if (missing.length) {
  console.error('[ts-energy-flow-switch-mode] Fehler:\n' + missing.join('\n'));
  process.exit(1);
}
console.log('[ts-energy-flow-switch-mode] OK: Energiefluss TS-Modus ist vorbereitet und bleibt sicher gegated.');
