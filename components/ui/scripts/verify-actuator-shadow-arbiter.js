#!/usr/bin/env node
'use strict';

/**
 * Regressionstest Stufe C1: Der Aktor-Shadow-Arbiter beobachtet konkurrierende
 * Hardware-Schreibpfade, verändert aber niemals den produktiven Schreibwert.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  ActuatorShadowArbiter,
  installActuatorShadowArbiter,
  withActuatorShadowContext,
  buildHttpActuatorShadowContext,
} = require('../ems/services/actuator-shadow-arbiter');

function makeAdapter() {
  const calls = [];
  const adapter = {
    namespace: 'nexowatt-ui.0',
    config: { diagnostics: { actuatorShadowConflictWindowMs: 15000, actuatorArbiterMode: 'shadow' } },
    _stageAActuatorOwnerById: {
      'device.0.shared.setpoint': { owners: ['storage', 'peakShaving'], activeOwners: ['storage', 'peakShaving'] },
      'device.0.single.setpoint': { owners: ['storage'], activeOwners: ['storage'] },
    },
    async setForeignStateAsync(...args) {
      calls.push(args);
      if (args[0] === 'device.0.fail.setpoint') throw new Error('mock write failed');
      return { ok: true };
    },
    async setForeignStateChangedAsync(...args) {
      calls.push(['changed', ...args]);
      return { ok: true };
    },
    calls,
  };
  return adapter;
}

(async () => {
  const adapter = makeAdapter();
  const original = adapter.setForeignStateAsync;
  const arbiter = installActuatorShadowArbiter(adapter);
  assert(arbiter instanceof ActuatorShadowArbiter, 'Arbiter wurde nicht installiert');
  assert.notStrictEqual(adapter.setForeignStateAsync, original, 'setForeignStateAsync wurde nicht beobachtbar umschlossen');

  await withActuatorShadowContext(adapter, { owner: 'storage', priority: 600, reason: 'NVP balance', cycleId: 1 }, async () => {
    await adapter.setForeignStateAsync('device.0.shared.setpoint', 4200, false);
  });
  await withActuatorShadowContext(adapter, { owner: 'peakShaving', priority: 850, reason: 'grid peak', cycleId: 1 }, async () => {
    await adapter.setForeignStateAsync('device.0.shared.setpoint', 0, false);
  });

  const snapshot = arbiter.snapshot();
  assert.strictEqual(adapter.calls[0][1], 4200, 'Shadow-Modus hat ersten Write verändert');
  assert.strictEqual(adapter.calls[1][1], 0, 'Shadow-Modus hat zweiten Write verändert');
  assert.strictEqual(snapshot.behaviorChanged, false, 'Shadow-Modus darf Verhalten nicht verändern');
  assert.strictEqual(snapshot.activeConflictCount, 1, 'Konkurrierende Werte wurden nicht als Konflikt erkannt');
  assert.strictEqual(snapshot.activeConflicts[0].targetId, 'device.0.shared.setpoint', 'Falscher Konflikt-DP');
  assert.deepStrictEqual(new Set(snapshot.activeConflicts[0].owners), new Set(['storage', 'peakShaving']), 'Falsche Konflikt-Owner');
  assert.strictEqual(snapshot.activeConflicts[0].lastWinner, 'peakShaving', 'Tatsächlich letzter Schreiber nicht dokumentiert');

  // Gleiche Werte verschiedener Owner sind kein Regelkonflikt.
  await withActuatorShadowContext(adapter, { owner: 'thermal', cycleId: 2 }, async () => {
    await adapter.setForeignStateAsync('device.0.same.enable', true, false);
  });
  await withActuatorShadowContext(adapter, { owner: 'heatingRod', cycleId: 2 }, async () => {
    await adapter.setForeignStateAsync('device.0.same.enable', true, false);
  });
  assert.strictEqual(arbiter.snapshot().activeConflictCount, 1, 'Identische Werte dürfen keinen zusätzlichen Konflikt erzeugen');

  // Eigene Adapterstates und ack=true werden nicht als Hardware-Aktor bewertet.
  await adapter.setForeignStateAsync('nexowatt-ui.0.internal.state', 1, false);
  await adapter.setForeignStateAsync('device.0.telemetry', 123, true);
  const afterIgnored = arbiter.snapshot();
  assert(!afterIgnored.targets.some((row) => row.targetId === 'nexowatt-ui.0.internal.state'), 'Eigener Adapterstate wurde als Aktor gezählt');
  assert(!afterIgnored.targets.some((row) => row.targetId === 'device.0.telemetry'), 'ack=true-Telemetrie wurde als Aktor gezählt');

  // Ohne Runtime-Kontext darf ein eindeutig gemappter Owner aus Stufe A abgeleitet werden.
  await adapter.setForeignStateAsync('device.0.single.setpoint', 1500, false);
  const inferred = arbiter.snapshot().recentWrites.find((row) => row.targetId === 'device.0.single.setpoint');
  assert(inferred, 'Abgeleiteter Write fehlt');
  assert.strictEqual(inferred.owner, 'storage', 'Eindeutiger Mapping-Owner wurde nicht abgeleitet');
  assert.strictEqual(inferred.inferredOwner, true, 'Owner-Inferenz wurde nicht markiert');

  // Fehlgeschlagene Writes werden diagnostiziert, aber unverändert an den Aufrufer weitergereicht.
  let failed = false;
  try {
    await withActuatorShadowContext(adapter, { owner: 'generator', reason: 'start' }, () => adapter.setForeignStateAsync('device.0.fail.setpoint', true, false));
  } catch (error) {
    failed = /mock write failed/.test(String(error && error.message));
  }
  assert(failed, 'Originaler Write-Fehler wurde verschluckt');
  assert(arbiter.snapshot().failedWriteCount >= 1, 'Fehlgeschlagener Write wurde nicht diagnostiziert');

  const root = path.resolve(__dirname, '..');
  const engineSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/engine.ts'), 'utf8');
  const managerSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/module-manager.ts'), 'utf8');
  const mainSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/main.ts'), 'utf8');
  const stageSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/stage-a-diagnostics.ts'), 'utf8');
  const uiSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/www/ems-apps.ts'), 'utf8');
  assert(engineSource.includes('installActuatorShadowArbiter(adapter)'), 'Engine installiert Shadow-Arbiter nicht vor den EMS-Schreibpfaden');
  assert(managerSource.includes("reason: 'module-tick'"), 'Modul-Ticks tragen keinen Shadow-Owner-Kontext');
  assert(managerSource.includes("reason: 'module-init'"), 'Modul-Init trägt keinen Shadow-Owner-Kontext');
  assert(mainSource.includes('buildHttpActuatorShadowContext'), 'Manuelle HTTP-Schreibpfade erhalten keinen Owner-Kontext');
  assert(stageSource.includes('shadowWriteConflictCount'), 'Stufe A veröffentlicht keine Laufzeit-Schreibkonflikte');
  assert(uiSource.includes("label: 'Aktor-Konflikte'"), 'AppCenter zeigt die Konfliktzahl nicht kompakt an');

  const http = buildHttpActuatorShadowContext('POST', '/api/evcs/lp2/mode');
  assert.strictEqual(http.owner, 'manual.evcs', 'HTTP-EVCS-Kontext falsch klassifiziert');
  assert.strictEqual(http.kind, 'manual-api', 'HTTP-Kontext nicht als manuell markiert');

  arbiter.stop();
  assert.strictEqual(adapter.setForeignStateAsync, original, 'Originaler Write-Pfad wurde beim Stop nicht restauriert');

  console.log('[actuator-shadow-arbiter] OK: read-only Shadow, Owner-Kontext, Konflikterkennung und Restore geprüft.');
})().catch((error) => {
  console.error('[actuator-shadow-arbiter] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
