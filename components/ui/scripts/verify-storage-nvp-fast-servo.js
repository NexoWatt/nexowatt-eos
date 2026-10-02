#!/usr/bin/env node
'use strict';

/**
 * Regression 0.8.144:
 * - NVP measurement tolerance is only a noise gate;
 * - outside tolerance, storage targets the configured center immediately;
 * - legacy multi-second filtering remains diagnostic and cannot delay writes;
 * - the closed NVP loop is not limited by the generic 500 W/tick home ramp;
 * - new external NVP samples trigger exactly one debounced full EMS tick.
 */

const assert = require('assert');
const fs = require('fs');
const { SpeicherRegelungModule, resolveNvpBandTarget } = require('../ems/modules/storage-control');
const { EmsEngine } = require('../ems/engine');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeStorageModule() {
  const adapter = {
    config: { enableStorageControl: true, enableStorageFarm: false },
    stateCache: {},
    log: { warn() {}, info() {}, debug() {}, error() {} },
    async setObjectNotExistsAsync() {},
    async setStateAsync() {},
    async getStateAsync() { return null; },
  };
  const dp = {
    getEntry() { return null; },
    getMeasurementTimestampMs() { return null; },
    getAgeMs() { return null; },
  };
  return new SpeicherRegelungModule(adapter, dp);
}

(async () => {
  const below = resolveNvpBandTarget(15, 50, 20);
  assert.strictEqual(below.outsideBand, true);
  assert.strictEqual(below.activeTargetNvpW, 50);
  assert.strictEqual(below.bandErrorW, -35, 'outside tolerance must regulate to the center, not the lower edge');

  const above = resolveNvpBandTarget(250, 50, 20);
  assert.strictEqual(above.activeTargetNvpW, 50);
  assert.strictEqual(above.bandErrorW, 200, 'outside tolerance must regulate to the center, not the upper edge');

  const inside = resolveNvpBandTarget(60, 50, 20);
  assert.strictEqual(inside.outsideBand, false);
  assert.strictEqual(inside.bandErrorW, 0, 'inside tolerance must not create a new correction');

  const mod = makeStorageModule();
  const firstSignal = mod._buildSelfNvpControlSignal(1000, 1000, {
    selfNvpFastServoEnabled: true,
    selfNvpSmoothingEnabled: true,
    selfNvpSmoothingSec: 8,
    selfNvpRawGuardW: 100,
  }, 50, 20);
  assert.strictEqual(firstSignal.controlW, 1000);
  assert.strictEqual(firstSignal.mode, 'raw-fast-servo');

  const secondSignal = mod._buildSelfNvpControlSignal(250, 1100, {
    selfNvpFastServoEnabled: true,
    selfNvpSmoothingEnabled: true,
    selfNvpSmoothingSec: 8,
    selfNvpRawGuardW: 100,
  }, 50, 20);
  assert.strictEqual(secondSignal.controlW, 250, '8 s diagnostic smoothing must not delay the hardware control value');
  assert.notStrictEqual(Math.round(secondSignal.filteredW), 250, 'diagnostic filter should still expose a different smoothed value');

  const fastBalance = mod._buildActualAwareNvpBalance({
    rawNvpW: 850,
    fallbackNvpW: 200,
    nvpAgeMs: 50,
    targetNvpW: 50,
    deadbandW: 20,
    batteryPowerW: 1000,
    batteryMeasuredW: 1000,
    batteryAgeMs: 50,
    batteryPowerTrusted: true,
    lastTargetW: 1000,
    lastTargetAllowed: true,
    maxDischargeCorrectionW: 500,
    maxChargeCorrectionW: 500,
    feedbackMaxAgeMs: 8000,
    nvpFeedbackMaxAgeMs: 8000,
    fastServoActive: true,
    preferRawNvp: true,
    stepW: 1,
  });
  assert.strictEqual(fastBalance.nvpW, 850, 'fresh raw NVP must be authoritative');
  assert.strictEqual(fastBalance.rawTargetW, 1800);
  assert.strictEqual(fastBalance.targetW, 1800, 'fast servo must not need two 500 W ramp ticks');
  assert.strictEqual(fastBalance.fastServoActive, true);
  assert(String(fastBalance.mode).includes('fast-servo'));

  const legacyBalance = mod._buildActualAwareNvpBalance({
    rawNvpW: 850,
    fallbackNvpW: 200,
    nvpAgeMs: 50,
    targetNvpW: 50,
    deadbandW: 20,
    batteryPowerW: 1000,
    batteryMeasuredW: 1000,
    batteryAgeMs: 50,
    batteryPowerTrusted: true,
    lastTargetW: 1000,
    lastTargetAllowed: true,
    maxDischargeCorrectionW: 500,
    maxChargeCorrectionW: 500,
    feedbackMaxAgeMs: 8000,
    nvpFeedbackMaxAgeMs: 8000,
    fastServoActive: false,
    stepW: 1,
  });
  assert.strictEqual(legacyBalance.targetW, 1500, 'legacy helper remains ramp-limited for non-NVP callers');

  const heldInside = mod._buildActualAwareNvpBalance({
    rawNvpW: 60,
    fallbackNvpW: 60,
    nvpAgeMs: 50,
    targetNvpW: 50,
    deadbandW: 20,
    batteryPowerW: 1800,
    batteryMeasuredW: 1800,
    batteryAgeMs: 50,
    batteryPowerTrusted: true,
    lastTargetW: 1800,
    lastTargetAllowed: true,
    holdLastNonZeroInDeadband: true,
    fastServoActive: true,
    preferRawNvp: true,
    stepW: 1,
  });
  assert.strictEqual(heldInside.targetW, 1800, 'reaching the tolerance must not turn an effective command into a 0 W stop');

  let tickCount = 0;
  const engineAdapter = {
    config: { enableStorageControl: true, enableStorageFarm: false },
    _nwShuttingDown: false,
    log: { warn() {}, info() {}, debug() {}, error() {} },
    setTimeout(fn, ms) { return setTimeout(fn, ms); },
    clearTimeout(timer) { clearTimeout(timer); },
    async setStateAsync() {},
  };
  const engine = new EmsEngine(engineAdapter);
  engine.dp = {};
  engine.mm = {};
  engine._nvpSourceIds = new Set(['meter.0.nvp']);
  engine.tick = async () => { tickCount += 1; };

  assert.strictEqual(engine.handleExternalStateChange('other.0.value', { val: 100 }), false);
  assert.strictEqual(engine.handleExternalStateChange('meter.0.nvp', { val: 100 }), true);
  assert.strictEqual(engine.handleExternalStateChange('meter.0.nvp', { val: 120 }), true);
  assert.strictEqual(engine.handleExternalStateChange('meter.0.nvp', { val: 140 }), true);
  await wait(140);
  assert.strictEqual(tickCount, 1, 'rapid NVP source updates must collapse into one full EMS tick');
  engine.stop();

  const html = fs.readFileSync('www/ems-apps.html', 'utf8');
  const app = fs.readFileSync('www/ems-apps.js', 'utf8');
  const main = fs.readFileSync('main.js', 'utf8');
  assert(html.includes('Messtoleranz (±W)'));
  assert(html.includes('Außerhalb dieser Toleranz regelt der Schnellregler'));
  assert(app.includes('selfNvpFastServoEnabled = true'));
  assert(main.includes('handleExternalStateChange(id, state)'));

  console.log('[storage-nvp-fast-servo] OK: raw event-driven center control, noise tolerance, ramp bypass and debounce are verified.');
})().catch((err) => {
  console.error('[storage-nvp-fast-servo] ERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
});
