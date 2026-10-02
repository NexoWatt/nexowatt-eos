#!/usr/bin/env node
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
