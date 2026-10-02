#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
function read(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }
function assertContains(rel, needle){
  const txt = read(rel);
  if (!txt.includes(needle)) {
    console.error(`[ts-energy-flow-mode-ui] FEHLT in ${rel}: ${needle}`);
    process.exit(1);
  }
}
function assertNotContains(rel, needle){
  const txt = read(rel);
  if (txt.includes(needle)) {
    console.error(`[ts-energy-flow-mode-ui] SOLL NICHT SICHTBAR SEIN in ${rel}: ${needle}`);
    process.exit(1);
  }
}
/**
 * Ab 0.8.3 bleibt der Energiefluss-TS-Modus intern konfigurierbar, die sichtbare
 * Migrations-/Shadow-Bedienfläche wird aber aus dem App-Center entfernt.
 */
assertNotContains('www/ems-apps.html', 'energyFlowTsMode');
assertNotContains('www/ems-apps.html', 'energyFlowTsProductionAllowed');
assertContains('www/ems-apps.js', 'collectEnergyFlowTsMigrationFromUi');
assertContains('www/ems-apps.js', 'applyEnergyFlowTsModeToUi');
assertContains('www/ems-apps.js', 'renderEnergyFlowTsModeStatus');
assertContains('www/ems-apps.js', 'patch.tsMigration');
assertContains('main.js', "'tsMigration'");
assertContains('main.js', 'tsMigration: (n.tsMigration');
assertContains('main.js', '_nwBuildEnergyFlowTsEffectivePlan');
console.log('[ts-energy-flow-mode-ui] OK: Energiefluss-TS-Modus ist intern erhalten, sichtbare Migrations-UI ist entfernt.');
