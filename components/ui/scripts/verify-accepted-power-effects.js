#!/usr/bin/env node
'use strict';

const assert = require('assert');
const {
  beginAcceptedPowerEffectCycle,
  recordAcceptedPowerTarget,
  recordAcceptedActuatorTransition,
  getAcceptedPowerEffectSnapshot,
} = require('../ems/services/accepted-power-effects');

const adapter = {};
beginAcceptedPowerEffectCycle(adapter, 'cycle-1', 1000);

const load = recordAcceptedPowerTarget(adapter, {
  key: 'evcs:lp1',
  targetW: 1500,
  baselineW: 1000,
  baselineFresh: true,
  accepted: true,
  commandChanged: true,
  kind: 'load',
  source: 'chargingManagement',
});
assert(load && load.credited === true);
assert.strictEqual(load.netLoadDeltaW, 500);

const generator = recordAcceptedPowerTarget(adapter, {
  key: 'generator:g1',
  targetW: 500,
  baselineW: 200,
  baselineFresh: true,
  accepted: true,
  commandChanged: true,
  kind: 'generation',
  source: 'generatorControl',
});
assert(generator && generator.credited === true);
assert.strictEqual(generator.netLoadDeltaW, -300);

recordAcceptedPowerTarget(adapter, {
  key: 'thermal:wp1',
  targetW: 2500,
  baselineW: 0,
  baselineFresh: true,
  accepted: false,
  commandChanged: true,
  kind: 'load',
});

recordAcceptedActuatorTransition(adapter, {
  key: 'threshold:r1',
  accepted: true,
  commandChanged: true,
  kind: 'load',
  source: 'thresholdControl',
});

let snapshot = getAcceptedPowerEffectSnapshot(adapter);
assert.strictEqual(snapshot.netLoadDeltaW, 200);
assert.strictEqual(snapshot.loadDeltaW, 500);
assert.strictEqual(snapshot.generationDeltaW, 300);
assert.strictEqual(snapshot.creditedEffectCount, 2);
assert.strictEqual(snapshot.uncertainEffectCount, 1);
assert.strictEqual(snapshot.rejectedEffectCount, 1);

// Derselbe physische Aktor darf im selben Zyklus nur einmal zählen. Der neue
// Eintrag ersetzt die alte Wirkung, statt sie zu addieren.
recordAcceptedPowerTarget(adapter, {
  key: 'evcs:lp1',
  targetW: 1200,
  baselineW: 1000,
  baselineFresh: true,
  accepted: true,
  commandChanged: true,
  kind: 'load',
});
snapshot = getAcceptedPowerEffectSnapshot(adapter);
assert.strictEqual(snapshot.loadDeltaW, 200);
assert.strictEqual(snapshot.netLoadDeltaW, -100);
assert.strictEqual(snapshot.entries.filter((entry) => entry.key === 'evcs:lp1').length, 1);

// Ein neuer EMS-Tick startet mit leerer Same-cycle-Wirkung, merkt sich aber die
// letzte akzeptierte Zielstellung nur als Diagnose-/Fallbackbasis.
beginAcceptedPowerEffectCycle(adapter, 'cycle-2', 2000);
snapshot = getAcceptedPowerEffectSnapshot(adapter);
assert.strictEqual(snapshot.netLoadDeltaW, 0);
assert.strictEqual(snapshot.entries.length, 0);

console.log('[accepted-power-effects] OK: Nur akzeptierte, frische und einmalige Aktoränderungen beeinflussen den finalen NVP-/PV-Rest.');
