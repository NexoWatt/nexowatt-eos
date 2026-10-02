#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-storage-farm-energy-flow-aggregation.js
 * Zweck: Regressionstest für Speicherfarm-Gesamtleistung, SoC-Mittelwert und
 * PV-/Wechselrichter-Summe im zentralen Energiefluss.
 *
 * Der Test kombiniert die reine Aggregationsmathematik mit statischen Ankern in
 * Backend, Speicherregelung und Kundenfrontend. Dadurch werden sowohl Rechenfehler
 * als auch spätere Parallel-/Legacy-Pfade erkannt.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const aggregation = require(path.join(root, 'ems/services/storage-farm-aggregation.js'));

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function approx(actual, expected, tolerance = 0.001, label = 'Wert') {
  assert.ok(Math.abs(Number(actual) - Number(expected)) <= tolerance, `${label}: erwartet ${expected}, erhalten ${actual}`);
}

// Farm-SoC: Kundenwert ist ausdrücklich der arithmetische Mittelwert.
approx(aggregation.arithmeticMean([20, 80]), 50, 0.001, 'arithmetischer Farm-SoC');
approx(aggregation.arithmeticMean([20, null, 80, 'x']), 50, 0.001, 'Farm-SoC ignoriert ungültige Quellen');
approx(aggregation.capacityWeightedMean([{ value: 20, weight: 1 }, { value: 80, weight: 3 }]), 65, 0.001, 'gewichteter Diagnose-SoC');

// Farmleistung: +W entladen, -W laden; Energiefluss verwendet die Nettoleistung.
assert.deepStrictEqual(
  aggregation.normalizeFarmPower(3000, 1000),
  { chargeW: 3000, dischargeW: 1000, signedW: -2000 },
  'Farm-Nettoleistung bei gleichzeitigem Laden/Entladen',
);
assert.deepStrictEqual(
  aggregation.normalizeFarmPower(0, 4500),
  { chargeW: 0, dischargeW: 4500, signedW: 4500 },
  'Farm-Entladeleistung',
);

// PV/WR-Aggregation: fehlende Anlagen-PV wird durch Farm ersetzt; identische
// Gesamtwerte werden nicht doppelt gezählt; zusätzlicher DC-Anteil wird ergänzt.
let pv = aggregation.combineStorageFarmPv({ sitePvW: 0, farmAcW: 10000, farmDcW: 5000 });
approx(pv.totalW, 15000, 0.001, 'Farm-PV-Fallback');

pv = aggregation.combineStorageFarmPv({ sitePvW: 15000, farmAcW: 10000, farmDcW: 5000 });
approx(pv.totalW, 15000, 0.001, 'keine Doppelzählung bei bereits enthaltener Farm-PV');

pv = aggregation.combineStorageFarmPv({ sitePvW: 6000, farmAcW: 6000, farmDcW: 4000 });
approx(pv.totalW, 10000, 0.001, 'zusätzliche DC-/Hybrid-PV');

pv = aggregation.combineStorageFarmPv({ sitePvW: 10000, farmAcW: 10000, farmDcW: 0 });
approx(pv.totalW, 10000, 0.001, 'identische AC-PV nicht doppelt');

const mainTs = read('src-ts/runtime-executables/main.ts');
const storageTs = read('src-ts/runtime-executables/ems/modules/storage-control.ts');
const appTs = read('src-ts/runtime-executables/www/app.ts');
const farmTs = read('src-ts/runtime-executables/www/storagefarm.ts');
const emsAppsTs = read('src-ts/runtime-executables/www/ems-apps.ts');

for (const needle of [
  '_nwStorageFarmRowHasRealDatapoint',
  "const totalSoc = nwArithmeticMean(socListAll);",
  "const normalizedFarmPower = nwNormalizeFarmPower(totalCharge, totalDischarge);",
  "storageFarm.totalPowerW",
  "storageFarm.totalPvAcPowerW",
  "storageFarm.totalPvDcPowerW",
  "storageFarm.totalPvUnknownPowerW",
  "storageFarmSummary",
  "scheduleDerivedFlowUpdate('storage-farm-aggregate')",
]) {
  assert.ok(mainTs.includes(needle), `Backend-Anker fehlt: ${needle}`);
}

assert.ok(!mainTs.includes('socWeightedAll / socWeightAll'), 'alter gewichteter Farm-SoC darf nicht mehr den Kundenwert führen');
assert.ok(!mainTs.includes('const sfEnabled = !!(this.config && this.config.enableStorageFarm);'), 'Farm-Scheduler darf nicht mehr am Legacy-Flag hängen');
assert.ok(mainTs.includes('const pvFresh = !!(stPv && stPv.val !== undefined'), 'PV-/WR-Quelle muss unabhängig vom Speicher-Offlineflag gelesen werden');
assert.ok(storageTs.includes("getStateAsync('storageFarm.totalPowerW')"), 'Speicherregelung muss die kanonische Farm-Nettoleistung verwenden');
assert.ok(appTs.includes("getStableFlowNumber('storageFarm.totalPowerW')"), 'LIVE muss die Farm-Nettoleistung verwenden');
assert.ok(appTs.includes("d('derived.core.pv.totalW')"), 'LIVE muss die kanonische Backend-PV-Summe verwenden');
assert.ok(appTs.includes('featureVisibility.hasStorageFarm'), 'LIVE muss die autoritative Farm-Sichtbarkeit verwenden');
assert.ok(farmTs.includes("stateVal('storageFarm.totalPowerW')"), 'Farmseite muss die Nettoleistung anzeigen');
assert.ok(farmTs.includes("stateVal('storageFarm.totalPvPowerW')"), 'Farmseite muss die PV-/WR-Summe anzeigen');
assert.ok(emsAppsTs.includes('PV-/WR-Leistung (W)'), 'AppCenter muss AC-/DC-Wechselrichterzuordnung erklären');

// Nach dem Runtime-Sync müssen die ausgelieferten JS-Dateien dieselben Anker enthalten.
for (const [rel, needles] of [
  ['main.js', ['storageFarm.totalPowerW', 'storageFarm.totalPvAcPowerW', 'storageFarmSummary']],
  ['ems/modules/storage-control.js', ["getStateAsync('storageFarm.totalPowerW')"]],
  ['www/app.js', ["getStableFlowNumber('storageFarm.totalPowerW')", "d('derived.core.pv.totalW')"]],
  ['www/storagefarm.js', ["stateVal('storageFarm.totalPvPowerW')"]],
]) {
  const text = read(rel);
  for (const needle of needles) assert.ok(text.includes(needle), `Runtime-Anker fehlt in ${rel}: ${needle}`);
}

console.log('[storage-farm-energy-flow-aggregation] OK: Farmleistung, SoC-Mittelwert und PV-/WR-Summe sind zentral und doppelsicher angebunden.');
