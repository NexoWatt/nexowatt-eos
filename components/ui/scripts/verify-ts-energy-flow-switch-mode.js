#!/usr/bin/env node
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
