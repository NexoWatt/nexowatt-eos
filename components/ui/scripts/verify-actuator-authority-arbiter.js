#!/usr/bin/env node
'use strict';

/**
 * Regressionstest Stufe C2: Sicherheitskritische Steuerhoheit wird verbindlich,
 * normale EMS-/Komfortpfade bleiben untereinander weiterhin unverändert.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  ActuatorShadowArbiter,
  installActuatorShadowArbiter,
  withActuatorShadowContext,
  isActuatorAuthorityBlockedResult,
} = require('../ems/services/actuator-shadow-arbiter');

function makeAdapter(mode = 'enforce-safety') {
  const calls = [];
  const adapter = {
    namespace: 'nexowatt-ui.0',
    config: { diagnostics: { actuatorArbiterMode: mode, actuatorArbiterBlockedLogIntervalMs: 5000 } },
    _stageAActuatorOwnerById: {
      'device.0.shared.setpoint': { owners: ['storage', 'para14a', 'peakShaving'], activeOwners: ['storage', 'para14a', 'peakShaving'] },
      'device.0.manual.setpoint': { owners: ['storage', 'manual.evcs'], activeOwners: ['storage', 'manual.evcs'] },
      'device.0.expiry.setpoint': { owners: ['storage', 'manual.evcs'], activeOwners: ['storage', 'manual.evcs'] },
    },
    log: { warn() {}, info() {}, debug() {}, error() {} },
    async setForeignStateAsync(...args) { calls.push(args); return undefined; },
    async setForeignStateChangedAsync(...args) { calls.push(['changed', ...args]); return true; },
    calls,
  };
  return adapter;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  const adapter = makeAdapter();
  const arbiter = installActuatorShadowArbiter(adapter);
  assert(arbiter instanceof ActuatorShadowArbiter, 'C2-Arbiter wurde nicht installiert');

  // Normale EMS-Pfade erhalten ohne aktive Sicherheits-Lease weiterhin Schreibzugriff.
  await withActuatorShadowContext(adapter, { owner: 'storage', reason: 'self-consumption' }, () =>
    adapter.setForeignStateAsync('device.0.shared.setpoint', 4200, false));
  assert.strictEqual(adapter.calls.length, 1, 'Normale EMS-Automatik wurde ohne Sicherheitskonflikt blockiert');

  // Aktive §14a-Anforderung übernimmt verbindlich die Steuerhoheit.
  adapter._para14a = { active: true };
  await withActuatorShadowContext(adapter, { owner: 'para14a', reason: 'grid-operator-cap', leaseMs: 1000 }, () =>
    adapter.setForeignStateAsync('device.0.shared.setpoint', 0, false));
  assert.strictEqual(adapter.calls.length, 2, '§14a-Anforderung wurde nicht ausgeführt');

  const blockedStorage = await withActuatorShadowContext(adapter, { owner: 'storage', reason: 'normal-ems' }, () =>
    adapter.setForeignStateAsync('device.0.shared.setpoint', 5000, false));
  assert(isActuatorAuthorityBlockedResult(blockedStorage), 'Niedrigere Speicheranforderung wurde nicht als blockiert gemeldet');
  assert.strictEqual(adapter.calls.length, 2, 'Blockierter Speicherwrite erreichte die Hardware');
  assert.strictEqual(blockedStorage.blockedByOwner, 'para14a', 'Falscher Sicherheits-Owner blockiert');

  // Derselbe sichere Wert darf als Watchdog-/Refresh-Write passieren.
  const sameValue = await withActuatorShadowContext(adapter, { owner: 'storage', reason: 'same-safe-value' }, () =>
    adapter.setForeignStateAsync('device.0.shared.setpoint', 0, false));
  assert(!isActuatorAuthorityBlockedResult(sameValue), 'Identischer Wert unter Sicherheits-Lease wurde unnötig blockiert');
  assert.strictEqual(adapter.calls.length, 3, 'Identischer Watchdog-Wert wurde nicht ausgeführt');

  // Inaktives §14a gibt seine Lease frei; normaler EMS-Pfad darf danach wieder führen.
  adapter._para14a = { active: false };
  await withActuatorShadowContext(adapter, { owner: 'para14a', reason: 'grid-operator-release' }, () =>
    adapter.setForeignStateAsync('device.0.shared.setpoint', 11000, false));
  const resumedStorage = await withActuatorShadowContext(adapter, { owner: 'storage', reason: 'resume-self-consumption' }, () =>
    adapter.setForeignStateAsync('device.0.shared.setpoint', 5000, false));
  assert(!isActuatorAuthorityBlockedResult(resumedStorage), 'Normale EMS-Regelung blieb nach §14a-Freigabe blockiert');
  assert.strictEqual(adapter.calls.length, 5, 'Freigabe-/Resume-Writes wurden nicht ausgeführt');

  // Peak übernimmt vor manueller Bedienung, §14a übernimmt vor Peak.
  adapter._peakShavingAuthorityActive = true;
  await withActuatorShadowContext(adapter, { owner: 'peakShaving', reason: 'connection-limit', leaseMs: 1000 }, () =>
    adapter.setForeignStateAsync('device.0.shared.setpoint', 2000, false));
  const blockedManual = await withActuatorShadowContext(adapter, { owner: 'manual.evcs', reason: 'customer-command' }, () =>
    adapter.setForeignStateAsync('device.0.shared.setpoint', 3000, false));
  assert(isActuatorAuthorityBlockedResult(blockedManual), 'Manuelle Bedienung durfte Peak-/Anschlusslimit überschreiben');

  adapter._para14a = { active: true };
  const paraPreempt = await withActuatorShadowContext(adapter, { owner: 'para14a', reason: 'grid-operator-preempt', leaseMs: 1000 }, () =>
    adapter.setForeignStateAsync('device.0.shared.setpoint', 1000, false));
  assert(!isActuatorAuthorityBlockedResult(paraPreempt), '§14a konnte Peak-Shaving nicht übersteuern');

  // Neuester expliziter manueller Befehl gewinnt innerhalb derselben manuellen Prioritätsklasse.
  const manualAdapter = makeAdapter();
  const manualArbiter = installActuatorShadowArbiter(manualAdapter);
  await withActuatorShadowContext(manualAdapter, { owner: 'manual.evcs', reason: 'manual-first', leaseMs: 1000 }, () =>
    manualAdapter.setForeignStateAsync('device.0.manual.setpoint', 4000, false));
  const latestManual = await withActuatorShadowContext(manualAdapter, { owner: 'manual.ems', reason: 'manual-latest', leaseMs: 1000 }, () =>
    manualAdapter.setForeignStateAsync('device.0.manual.setpoint', 2500, false));
  assert(!isActuatorAuthorityBlockedResult(latestManual), 'Neuester manueller Befehl derselben Klasse wurde blockiert');
  const normalAfterManual = await withActuatorShadowContext(manualAdapter, { owner: 'storage', reason: 'automation' }, () =>
    manualAdapter.setForeignStateAsync('device.0.manual.setpoint', 6000, false));
  assert(isActuatorAuthorityBlockedResult(normalAfterManual), 'Automatik durfte laufenden manuellen Override überschreiben');
  assert.strictEqual(manualAdapter.calls.at(-1)[1], 2500, 'Manuelle Steuerhoheit hält nicht den neuesten Wert');

  // Nach Lease-Ablauf wird die Automatik wieder freigegeben.
  const expiryAdapter = makeAdapter();
  installActuatorShadowArbiter(expiryAdapter);
  await withActuatorShadowContext(expiryAdapter, { owner: 'manual.evcs', reason: 'short-override', leaseMs: 20 }, () =>
    expiryAdapter.setForeignStateAsync('device.0.expiry.setpoint', 3000, false));
  await sleep(35);
  const afterExpiry = await withActuatorShadowContext(expiryAdapter, { owner: 'storage', reason: 'after-expiry' }, () =>
    expiryAdapter.setForeignStateAsync('device.0.expiry.setpoint', 4500, false));
  assert(!isActuatorAuthorityBlockedResult(afterExpiry), 'Automatik blieb nach Ablauf der manuellen Lease blockiert');

  const snapshot = arbiter.snapshot();
  assert.strictEqual(snapshot.mode, 'enforce-safety', 'C2-Modus ist nicht aktiv');
  assert(snapshot.blockedWriteCount >= 2, 'Blockierte Writes werden nicht diagnostiziert');
  assert(snapshot.preventedConflictCount >= 2, 'Verhinderte Konflikte werden nicht gezählt');
  assert(snapshot.preemptionsTotal >= 1, 'Sicherheits-Preemption wird nicht diagnostiziert');
  assert(snapshot.activeAuthorities.some((row) => row.owner === 'para14a'), 'Aktive §14a-Steuerhoheit fehlt in der Diagnose');

  // Shadow-Fallback bleibt als feldsicherer Notfallmodus verfügbar.
  const shadowAdapter = makeAdapter('shadow');
  const shadowArbiter = installActuatorShadowArbiter(shadowAdapter);
  shadowAdapter._para14a = { active: true };
  await withActuatorShadowContext(shadowAdapter, { owner: 'para14a' }, () => shadowAdapter.setForeignStateAsync('device.0.shared.setpoint', 0, false));
  await withActuatorShadowContext(shadowAdapter, { owner: 'storage' }, () => shadowAdapter.setForeignStateAsync('device.0.shared.setpoint', 5000, false));
  assert.strictEqual(shadowAdapter.calls.length, 2, 'Shadow-Fallback verändert bestehende Writes');
  assert.strictEqual(shadowArbiter.snapshot().blockedWriteCount, 0, 'Shadow-Fallback blockiert unerwartet');

  const root = path.resolve(__dirname, '..');
  const arbiterSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts'), 'utf8');
  const dpSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/datapoints.ts'), 'utf8');
  const peakSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/peak-shaving.ts'), 'utf8');
  const uiSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/www/ems-apps.ts'), 'utf8');
  assert(arbiterSource.includes('enforceAuthority'), 'Explizite C2-Steuerhoheit fehlt');
  assert(arbiterSource.includes('latest-manual-command-wins'), 'Manuelle Override-Preemption fehlt');
  assert(dpSource.includes('__nexowattActuatorAuthorityBlocked'), 'Datapoint-Registry erkennt blockierte Writes nicht');
  assert(peakSource.includes('_peakShavingAuthorityActive'), 'Peak-Shaving veröffentlicht seinen aktiven Authority-Zustand nicht');
  assert(uiSource.includes("label: 'Aktor-Arbiter'"), 'Kompakte C2-Anzeige fehlt im AppCenter');

  arbiter.stop();
  manualArbiter.stop();
  console.log('[actuator-authority-arbiter] OK: §14a, Grid/Peak, manuelle Leases, Preemption, Freigabe und Shadow-Fallback geprüft.');
})().catch((error) => {
  console.error('[actuator-authority-arbiter] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
