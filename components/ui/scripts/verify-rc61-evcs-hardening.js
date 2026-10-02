#!/usr/bin/env node
'use strict';

/**
 * RC61 – EVCS-Hardening.
 *
 * Prüft:
 * - gerätespezifische Sollwert-Keepalives,
 * - OCPP-Befehlsbestätigung inklusive sicherem 0-W-Profil,
 * - direkte OCPP21-Rückmelde-Datenpunkte,
 * - Fehlerisolierung: ein fehlgeschlagener positiver Start darf die Speicherfarm
 *   nicht global verriegeln; ein nicht bestätigter notwendiger Sicherheitsstopp
 *   bleibt dagegen fail-closed.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  ChargingManagementModule,
  resolveEvcsSetpointRefreshMs,
  evaluateOcppCommandConfirmation,
} = require('../ems/modules/charging-management');
const {
  beginSafetyCycle,
  buildSafetyEnvelope,
  liveSafetyEnvelope,
  invalidateSafetyEnvelope,
} = require('../ems/services/safety-envelope');

// Gerätespezifische Keepalives.
assert.strictEqual(resolveEvcsSetpointRefreshMs({}, 'ocpp-1.6-event-driven'), 45000);
assert.strictEqual(resolveEvcsSetpointRefreshMs({ manufacturer: 'Alfen' }, 'generic'), 15000);
assert.strictEqual(resolveEvcsSetpointRefreshMs({}, 'generic', 'modbus.0.holdingRegisters.1210'), 20000);
assert.strictEqual(resolveEvcsSetpointRefreshMs({ adapter: 'nexowatt-devices' }, 'generic'), 20000);
assert.strictEqual(resolveEvcsSetpointRefreshMs({}, 'generic', 'mqtt.0.wallbox.power'), 30000);
assert.strictEqual(resolveEvcsSetpointRefreshMs({ setpointKeepaliveSec: 12 }, 'generic'), 12000);

const now = Date.now();

// Positiver OCPP-Sollwert bestätigt.
{
  const result = evaluateOcppCommandConfirmation({
    targetW: 11000,
    requestedW: 11000,
    appliedW: 11000,
    lastSuccess: true,
    reason: 'accepted',
    commandAt: now - 1000,
    now,
  });
  assert.strictEqual(result.confirmed, true);
  assert.strictEqual(result.state, 'confirmed');
}

// EOS-0-W-Pause als explizites Nullprofil bestätigt.
{
  const result = evaluateOcppCommandConfirmation({
    targetW: 0,
    requestedW: 0,
    appliedW: 0,
    lastSuccess: true,
    reason: 'explicit-zero-profile',
    commandAt: now - 1000,
    now,
  });
  assert.strictEqual(result.confirmed, true);
  assert.strictEqual(result.zeroHeld, false);
}

// Altes keepLast-Verhalten darf nicht als erfolgreicher Stopp gelten.
{
  const result = evaluateOcppCommandConfirmation({
    targetW: 0,
    requestedW: 0,
    appliedW: 11000,
    lastSuccess: true,
    reason: 'zero-held-to-prevent-unintended-interruption',
    commandAt: now - 1000,
    now,
  });
  assert.strictEqual(result.confirmed, false);
  assert.strictEqual(result.zeroHeld, true);
  assert.strictEqual(result.state, 'zero-held-not-applied');
}

// Abgelehnter Befehl bleibt eindeutig fehlgeschlagen.
{
  const result = evaluateOcppCommandConfirmation({
    targetW: 4200,
    requestedW: 4200,
    appliedW: 0,
    lastSuccess: false,
    lastError: 'Rejected',
    reason: 'rejected',
    commandAt: now - 1000,
    now,
  });
  assert.strictEqual(result.confirmed, false);
  assert.match(result.state, /^failed:/);
}

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/charging-management.ts'), 'utf8');

// Direkter nativer OCPP21-Rückmeldevertrag.
for (const needle of [
  'control.requestedChargeLimit',
  'control.appliedChargeLimit',
  'control.chargeLimitReason',
  'control.chargeLimitClamped',
  'lastCommandSuccessId',
  'hardwareCommandConfirmed',
  'hardwareCommandState',
  'setpointRefreshMs',
]) {
  assert(source.includes(needle), `Fehlender OCPP-/Keepalive-Anker: ${needle}`);
}

// Fehlerisolierung darf nur einen notwendigen, nicht bestätigten Stopp global
// eskalieren. Ein positiver Start-/Erhöhungsfehler bleibt EVCS-lokal.
const safetyStopIndex = source.indexOf('const safetyStopCommandRequired = !!(');
const isolatedCommentIndex = source.indexOf('Fehler beim Starten/Erhöhen eines Ladepunkts bleiben lokal');
const scopedInvalidationIndex = source.indexOf('if (safetyStopCommandRequired && (!shouldWrite || !applied || hardwareCommandFailure))');
assert(safetyStopIndex >= 0 && isolatedCommentIndex > safetyStopIndex && scopedInvalidationIndex > isolatedCommentIndex);
assert(!source.includes('if (!applied) {\n                    invalidateSafetyEnvelope(this.adapter, `evcs-write-not-confirmed'));

function makeAdapter() {
  const now = Date.now();
  const adapter = {
    config: {
      installerConfig: {
        gridConnectionPower: 30000,
        gridPhaseCount: 3,
        para14a: false,
        safetyMeterTimeoutSec: 30,
      },
      peakShaving: { maxPhaseA: 0 },
      chargingManagement: { safetyEnvelopeMaxAgeSec: 5, nominalVoltageV: 230 },
    },
    _nvpFreshnessSnapshot: {
      ts: now,
      usable: true,
      fresh: true,
      connected: true,
      netW: 1000,
      status: 'ok',
      source: 'rc61-test-meter',
      reason: 'fresh',
      measurementAgeMs: 0,
      heartbeatAgeMs: 0,
    },
    log: { debug() {}, info() {}, warn() {}, error() {} },
    async setStateAsync() {},
    async getStateAsync() { return null; },
    _nwRequestImmediateEmsTick() { return true; },
  };
  beginSafetyCycle(adapter, 1, now);
  return adapter;
}

function makeDp(writeResult = false) {
  const entries = new Map([['wb.setW', { key: 'wb.setW', objectId: 'device.0.wallbox.setW' }]]);
  return {
    entries,
    getEntry(key) { return entries.get(key) || null; },
    getRaw(_key, fallback = null) { return fallback; },
    getMeasurementAgeMs() { return 0; },
    getAgeMs() { return 0; },
    getConnectionStatus() { return true; },
    async writeNumber() { return writeResult; },
    async writeBoolean() { return writeResult; },
  };
}

function release(adapter, dp) {
  return buildSafetyEnvelope({
    adapter,
    dp,
    coreSnapshot: {
      grid: {
        gridSafetyMarginW: 0,
        gridImportLimitW_physical: 30000,
        gridImportLimitW_effective: 30000,
        gridMaxPhaseA_cfg: 0,
      },
    },
    now: Date.now(),
    generation: adapter._emsSafetyCycle.generation,
  });
}

function wallbox(actualPowerW = 0) {
  return {
    safe: 'lp1',
    ch: 'chargingManagement.wallboxes.lp1',
    online: true,
    controlAvailable: true,
    controlBasis: 'powerW',
    setWKey: 'wb.setW',
    enableKey: '',
    name: 'LP1',
    cfgEnabled: true,
    userStationEnabled: true,
    userEnabled: true,
    operationalBlocked: false,
    enabled: true,
    maxPW: 11000,
    minPW: 0,
    phases: 3,
    meterStale: false,
    actualPowerW,
    telemetryProfile: 'generic',
    consumer: { type: 'evcs', key: 'lp1', controlBasis: 'powerW', setWKey: 'wb.setW' },
  };
}

(async () => {
  // Ein fehlgeschlagener positiver Start bleibt lokal und darf die Speicherfarm
  // nicht durch ein global ungültiges Safety-Envelope stillsetzen.
  {
    const adapter = makeAdapter();
    const dp = makeDp(false);
    assert.strictEqual(release(adapter, dp).valid, true);
    const module = new ChargingManagementModule(adapter, dp);
    const result = await module._executeChargingSetpointEntries([
      {
        safe: 'lp1', targetPowerW: 11000, targetCurrentA: 0, basis: 'powerW',
        setpointKey: 'wb.setW', writeRequired: true, reason: 'rc61-positive-start-failure',
      },
    ], [wallbox(0)], [], 'rc61-test', '');
    assert.strictEqual(result.ok, false, 'Fehlgeschlagener positiver Write muss lokal sichtbar sein.');
    assert.strictEqual(liveSafetyEnvelope(adapter, dp, { now: Date.now() }).valid, true, 'Positiver EVCS-Startfehler darf das globale Safety-Envelope nicht verriegeln.');
  }

  // Kann ein bereits laufender Ladepunkt bei einem Safety-Stopp nicht auf 0 W
  // geschrieben werden, bleibt die Eskalation bewusst global fail-closed.
  {
    const adapter = makeAdapter();
    const dp = makeDp(false);
    assert.strictEqual(release(adapter, dp).valid, true);
    const module = new ChargingManagementModule(adapter, dp);
    module._lastCmdTargetW.set('lp1', 11000);
    invalidateSafetyEnvelope(adapter, 'rc61-required-stop', {
      generation: adapter._emsSafetyCycle.generation,
      now: Date.now(),
      emergencyStop: true,
    });
    const result = await module._executeChargingSetpointEntries([
      {
        safe: 'lp1', targetPowerW: 0, targetCurrentA: 0, basis: 'powerW',
        setpointKey: 'wb.setW', writeRequired: true, reason: 'rc61-required-stop',
      },
    ], [wallbox(5000)], [], 'rc61-test', '');
    assert.strictEqual(result.ok, false);
    const envelope = liveSafetyEnvelope(adapter, dp, { now: Date.now() });
    assert.strictEqual(envelope.valid, false);
    assert(envelope.invalidReasons.some((reason) => String(reason).startsWith('evcs-write-not-confirmed:lp1:')), 'Nicht bestätigter Pflichtstopp muss im Safety-Envelope verriegelt werden.');
  }

  console.log('[rc61-evcs-hardening] OK: Alfen/Device-Keepalive, OCPP21-Bestätigung, sicherer 0-W-Vertrag und lokale Startfehler-Isolierung sind abgesichert.');
})().catch((error) => {
  console.error('[rc61-evcs-hardening] FAILED:', error && error.stack ? error.stack : error);
  process.exit(1);
});
