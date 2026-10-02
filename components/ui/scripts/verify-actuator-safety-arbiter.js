#!/usr/bin/env node
'use strict';

/**
 * Regressionstest Stufe C2: Der Sicherheits-Arbiter setzt ausschließlich
 * sicherheitskritische und befristete manuelle Steuerhoheit durch. Normale
 * EMS-/Komfortpfade bleiben ohne aktive Safety-Lease unverändert.
 */
const assert = require('assert');
const {
  installActuatorShadowArbiter,
  withActuatorShadowContext,
  isActuatorAuthorityBlockedResult,
  priorityForOwner,
} = require('../ems/services/actuator-shadow-arbiter');
const { DatapointRegistry } = require('../ems/datapoints');

function makeAdapter() {
  const calls = [];
  const adapter = {
    namespace: 'nexowatt-ui.0',
    config: {
      diagnostics: {
        actuatorArbiterMode: 'enforce-safety',
        actuatorArbiterEnforcePriorityFloor: 750,
        actuatorArbiterBlockedLogIntervalMs: 5000,
        actuatorShadowConflictWindowMs: 15000,
      },
    },
    _stageAActuatorOwnerById: {
      'device.0.shared.setpoint': { owners: ['storage', 'manual.evcs', 'peakShaving', 'para14a'], activeOwners: ['storage', 'manual.evcs', 'peakShaving', 'para14a'] },
      'device.0.equal.setpoint': { owners: ['manual.evcs', 'manual.ems'], activeOwners: ['manual.evcs', 'manual.ems'] },
      'device.0.expire.setpoint': { owners: ['manual.evcs', 'storage'], activeOwners: ['manual.evcs', 'storage'] },
      'device.0.changed.setpoint': { owners: ['manual.evcs', 'storage'], activeOwners: ['manual.evcs', 'storage'] },
      'device.0.fail.setpoint': { owners: ['manual.evcs', 'storage'], activeOwners: ['manual.evcs', 'storage'] },
      'device.0.samecycle.setpoint': { owners: ['gridConstraints', 'chargingManagement'], activeOwners: ['gridConstraints', 'chargingManagement'] },
      'device.0.equal-safety.setpoint': { owners: ['safety.alpha', 'safety.beta'], activeOwners: ['safety.alpha', 'safety.beta'] },
      'device.0.release-fail.setpoint': { owners: ['peakShaving', 'storage'], activeOwners: ['peakShaving', 'storage'] },
      'device.0.deadband.setpoint': { owners: ['gridConstraints', 'chargingManagement'], activeOwners: ['gridConstraints', 'chargingManagement'] },
    },
    log: { warn() {}, info() {}, debug() {}, error() {} },
    async setForeignStateAsync(...args) {
      calls.push(['set', ...args]);
      if (args[0] === 'device.0.fail.setpoint' || (args[0] === 'device.0.release-fail.setpoint' && args[1] === 0)) throw new Error('mock write failed');
      return undefined;
    },
    async setForeignStateChangedAsync(...args) {
      calls.push(['changed', ...args]);
      return true;
    },
    calls,
  };
  return adapter;
}

(async () => {
  const realNow = Date.now;
  let now = 1_700_000_000_000;
  Date.now = () => now;
  try {
    const adapter = makeAdapter();
    const originalSet = adapter.setForeignStateAsync;
    const arbiter = installActuatorShadowArbiter(adapter);

    // Normale EMS-Regelung bleibt ohne aktive Safety-/Manual-Lease unverändert.
    await withActuatorShadowContext(adapter, { owner: 'storage', priority: 600, cycleId: 1, reason: 'normal-ems' }, () =>
      adapter.setForeignStateAsync('device.0.shared.setpoint', 4200, false));
    assert.strictEqual(adapter.calls.length, 1, 'Normaler EMS-Write wurde ohne Safety-Lease blockiert');
    assert.strictEqual(arbiter.snapshot().activeAuthorityCount, 0, 'Normale EMS-Regelung darf keine C2-Safety-Lease erzeugen');

    // Manueller Befehl erzeugt eine befristete Steuerhoheit.
    await withActuatorShadowContext(adapter, { owner: 'manual.evcs', priority: 750, leaseMs: 300000, reason: 'customer override', kind: 'manual-api', enforceAuthority: true }, () =>
      adapter.setForeignStateAsync('device.0.shared.setpoint', 0, false));
    assert.strictEqual(adapter.calls.length, 2, 'Manueller Write wurde nicht ausgeführt');
    assert.strictEqual(arbiter.snapshot().activeAuthorities[0].owner, 'manual.evcs', 'Manuelle Steuerhoheit fehlt');

    const blockedStorage = await withActuatorShadowContext(adapter, { owner: 'storage', priority: 600, cycleId: 2, reason: 'normal-ems' }, () =>
      adapter.setForeignStateAsync('device.0.shared.setpoint', 4200, false));
    assert(isActuatorAuthorityBlockedResult(blockedStorage), 'Niedrigere EMS-Anforderung wurde nicht als blockiert gemeldet');
    assert.strictEqual(adapter.calls.length, 2, 'Blockierter EMS-Write erreichte den realen Hardwarepfad');
    assert.strictEqual(blockedStorage.blockedByOwner, 'manual.evcs', 'Falscher Authority-Owner');

    // Gleichwertiger Wert darf weiterhin idempotent passieren.
    await withActuatorShadowContext(adapter, { owner: 'storage', priority: 600, cycleId: 2, reason: 'same value' }, () =>
      adapter.setForeignStateAsync('device.0.shared.setpoint', 0, false));
    assert.strictEqual(adapter.calls.length, 3, 'Identischer Wert wurde unnötig blockiert');

    // Peak und §14a dürfen manuelle Steuerhoheit nach Priorität übernehmen.
    adapter._peakShavingAuthorityActive = true;
    await withActuatorShadowContext(adapter, { owner: 'peakShaving', priority: priorityForOwner('peakShaving'), cycleId: 3, reason: 'grid peak' }, () =>
      adapter.setForeignStateAsync('device.0.shared.setpoint', 1000, false));
    assert.strictEqual(arbiter.snapshot().activeAuthorities[0].owner, 'peakShaving', 'Peak-Shaving hat manuelle Lease nicht übernommen');

    adapter._para14a = { active: true };
    await withActuatorShadowContext(adapter, { owner: 'para14a', priority: priorityForOwner('para14a'), cycleId: 3, reason: 'grid operator' }, () =>
      adapter.setForeignStateAsync('device.0.shared.setpoint', 500, false));
    assert.strictEqual(arbiter.snapshot().activeAuthorities[0].owner, 'para14a', '§14a hat Peak-Lease nicht übernommen');

    const blockedPeak = await withActuatorShadowContext(adapter, { owner: 'peakShaving', priority: priorityForOwner('peakShaving'), cycleId: 3, reason: 'lower safety' }, () =>
      adapter.setForeignStateAsync('device.0.shared.setpoint', 900, false));
    assert(isActuatorAuthorityBlockedResult(blockedPeak), 'Niedrigere Peak-Anforderung wurde unter §14a nicht blockiert');

    // Gleiche manuelle Priorität: jüngster bewusster Kundenbefehl gewinnt.
    await withActuatorShadowContext(adapter, { owner: 'manual.evcs', priority: 750, leaseMs: 300000, reason: 'first manual', enforceAuthority: true }, () =>
      adapter.setForeignStateAsync('device.0.equal.setpoint', 1000, false));
    await withActuatorShadowContext(adapter, { owner: 'manual.ems', priority: 750, leaseMs: 300000, reason: 'latest manual', enforceAuthority: true }, () =>
      adapter.setForeignStateAsync('device.0.equal.setpoint', 2000, false));
    const equalAuthority = arbiter.snapshot().activeAuthorities.find((row) => row.targetId === 'device.0.equal.setpoint');
    assert(equalAuthority && equalAuthority.owner === 'manual.ems', 'Jüngster gleichrangiger manueller Befehl wurde nicht übernommen');

    // Gleichrangige Safety-Owner dürfen nicht gegeneinander oszillieren; der
    // bestehende Owner bleibt bis zur Freigabe oder höheren Priorität führend.
    await withActuatorShadowContext(adapter, { owner: 'safety.alpha', priority: 1000, cycleId: 8, reason: 'first safety' }, () =>
      adapter.setForeignStateAsync('device.0.equal-safety.setpoint', 1, false));
    const beforeEqualSafety = adapter.calls.length;
    const blockedEqualSafety = await withActuatorShadowContext(adapter, { owner: 'safety.beta', priority: 1000, cycleId: 8, reason: 'second safety' }, () =>
      adapter.setForeignStateAsync('device.0.equal-safety.setpoint', 0, false));
    assert(isActuatorAuthorityBlockedResult(blockedEqualSafety), 'Gleichrangiger widersprechender Safety-Write wurde nicht blockiert');
    assert.strictEqual(adapter.calls.length, beforeEqualSafety, 'Gleichrangiger Safety-Write erreichte den Hardwarepfad');

    // Eine fehlgeschlagene Restore-/Freigabe darf die bestehende Authority nicht
    // vorzeitig entfernen.
    adapter._peakShavingAuthorityActive = true;
    await withActuatorShadowContext(adapter, { owner: 'peakShaving', priority: 850, cycleId: 9, reason: 'peak active' }, () =>
      adapter.setForeignStateAsync('device.0.release-fail.setpoint', 1000, false));
    adapter._peakShavingAuthorityActive = false;
    let releaseFailed = false;
    try {
      await withActuatorShadowContext(adapter, { owner: 'peakShaving', priority: 850, cycleId: 9, reason: 'peak restore' }, () =>
        adapter.setForeignStateAsync('device.0.release-fail.setpoint', 0, false));
    } catch (error) {
      releaseFailed = /mock write failed/.test(String(error && error.message));
    }
    assert(releaseFailed, 'Fehlgeschlagener Restore-Write wurde nicht weitergereicht');
    assert(arbiter.snapshot().activeAuthorities.some((row) => row.targetId === 'device.0.release-fail.setpoint' && row.owner === 'peakShaving'), 'Fehlgeschlagener Restore entfernte die Safety-Lease');

    // Lease-Ablauf gibt den Aktor wieder an die normale EMS-Regelung frei.
    await withActuatorShadowContext(adapter, { owner: 'manual.evcs', priority: 750, leaseMs: 1000, reason: 'short override', enforceAuthority: true }, () =>
      adapter.setForeignStateAsync('device.0.expire.setpoint', 0, false));
    now += 1100;
    const beforeExpiryWrite = adapter.calls.length;
    await withActuatorShadowContext(adapter, { owner: 'storage', priority: 600, cycleId: 4, reason: 'resume automatic' }, () =>
      adapter.setForeignStateAsync('device.0.expire.setpoint', 3200, false));
    assert.strictEqual(adapter.calls.length, beforeExpiryWrite + 1, 'Normale EMS-Regelung wurde nach Lease-Ablauf nicht freigegeben');

    // Safety-Module gelten innerhalb desselben EMS-Zyklus verbindlich, ohne den
    // folgenden Zyklus unnötig festzuhalten.
    await withActuatorShadowContext(adapter, { owner: 'gridConstraints', priority: priorityForOwner('gridConstraints'), cycleId: 10, reason: 'connection cap' }, () =>
      adapter.setForeignStateAsync('device.0.samecycle.setpoint', 3000, false));
    const blockedSameCycle = await withActuatorShadowContext(adapter, { owner: 'chargingManagement', priority: 600, cycleId: 10, reason: 'charging target' }, () =>
      adapter.setForeignStateAsync('device.0.samecycle.setpoint', 11000, false));
    assert(isActuatorAuthorityBlockedResult(blockedSameCycle), 'Grid-Constraint blockiert den späteren Write im selben Zyklus nicht');
    const beforeNextCycle = adapter.calls.length;
    await withActuatorShadowContext(adapter, { owner: 'chargingManagement', priority: 600, cycleId: 11, reason: 'next cycle' }, () =>
      adapter.setForeignStateAsync('device.0.samecycle.setpoint', 11000, false));
    assert.strictEqual(adapter.calls.length, beforeNextCycle + 1, 'Safety-Lease blockiert einen späteren EMS-Zyklus trotz fehlender neuer Safety-Anforderung');

    // Ein sicherheitskritischer Sollwert darf seine Steuerhoheit nicht verlieren,
    // nur weil die Datapoint-Registry den identischen Wert per Deadband nicht
    // erneut auf den Bus schreibt.
    const dp = new DatapointRegistry(adapter, []);
    dp.byKey.set('deadband', {
      key: 'deadband', objectId: 'device.0.deadband.setpoint', scale: 1, offset: 0,
      invert: false, unitScale: 1, deadband: 100, maxWriteIntervalMs: 0,
    });
    dp.lastWriteByObjectId.set('device.0.deadband.setpoint', { val: 0, ts: now });
    const beforeDeadband = adapter.calls.length;
    const skippedSafetyWrite = await withActuatorShadowContext(adapter, {
      owner: 'gridConstraints', priority: priorityForOwner('gridConstraints'), cycleId: 20, reason: 'stable hard cap',
    }, () => dp.writeNumber('deadband', 0, false));
    assert.strictEqual(skippedSafetyWrite, null, 'Identischer Safety-Wert wurde unerwartet als Hardware-Write ausgeführt');
    assert.strictEqual(adapter.calls.length, beforeDeadband, 'Deadband-Safety-Intent erzeugte einen unnötigen Hardware-Write');
    const blockedAfterDeadband = await withActuatorShadowContext(adapter, {
      owner: 'chargingManagement', priority: 600, cycleId: 20, reason: 'later comfort write',
    }, () => dp.writeNumber('deadband', 11000, false));
    assert.strictEqual(blockedAfterDeadband, false, 'Datapoint-Registry meldet den blockierten Write nicht als fehlgeschlagen');
    assert.strictEqual(adapter.calls.length, beforeDeadband, 'Comfort-Write umging die per Deadband erneuerte Safety-Steuerhoheit');
    const nextCycleDeadband = await withActuatorShadowContext(adapter, {
      owner: 'chargingManagement', priority: 600, cycleId: 21, reason: 'next cycle without safety demand',
    }, () => dp.writeNumber('deadband', 11000, false));
    assert.strictEqual(nextCycleDeadband, true, 'Deadband-Safety-Intent blockiert den nächsten Zyklus ohne neue Sicherheitsanforderung');

    // Command-/Bridge-States außerhalb der Stufe-A-Aktormatrix bleiben bewusst
    // unbeeinflusst, auch wenn sie aus einem manuellen Request stammen.
    await withActuatorShadowContext(adapter, { owner: 'manual.mesh', priority: 750, enforceAuthority: true, reason: 'bridge command' }, () =>
      adapter.setForeignStateAsync('bridge.0.command', 'A', false));
    const beforeUnknown = adapter.calls.length;
    await withActuatorShadowContext(adapter, { owner: 'meshMicrogrid', priority: 300, reason: 'bridge runtime' }, () =>
      adapter.setForeignStateAsync('bridge.0.command', 'B', false));
    assert.strictEqual(adapter.calls.length, beforeUnknown + 1, 'Nicht gemappter Command-State wurde fälschlich vom Hardware-Arbiter blockiert');

    // Fehlgeschlagener Authority-Write darf keine Steuerhoheit erzeugen.
    let failed = false;
    try {
      await withActuatorShadowContext(adapter, { owner: 'manual.evcs', priority: 750, enforceAuthority: true, reason: 'failing override' }, () =>
        adapter.setForeignStateAsync('device.0.fail.setpoint', 0, false));
    } catch (error) {
      failed = /mock write failed/.test(String(error && error.message));
    }
    assert(failed, 'Originaler Write-Fehler wurde verschluckt');
    assert(!arbiter.snapshot().activeAuthorities.some((row) => row.targetId === 'device.0.fail.setpoint'), 'Fehlgeschlagener Write erzeugte trotzdem eine Lease');

    // setForeignStateChangedAsync wird ebenfalls verbindlich geschützt.
    await withActuatorShadowContext(adapter, { owner: 'manual.evcs', priority: 750, leaseMs: 300000, enforceAuthority: true, reason: 'changed authority' }, () =>
      adapter.setForeignStateChangedAsync('device.0.changed.setpoint', 0, false));
    const beforeChangedBlock = adapter.calls.length;
    const changedBlocked = await withActuatorShadowContext(adapter, { owner: 'storage', priority: 600, reason: 'changed lower' }, () =>
      adapter.setForeignStateChangedAsync('device.0.changed.setpoint', 3000, false));
    assert(isActuatorAuthorityBlockedResult(changedBlocked), 'Changed-Write wurde nicht als blockiert gemeldet');
    assert.strictEqual(adapter.calls.length, beforeChangedBlock, 'Blockierter Changed-Write erreichte Hardware');

    const snapshot = arbiter.snapshot();
    assert.strictEqual(snapshot.mode, 'enforce-safety', 'Falscher C2-Modus');
    assert.strictEqual(snapshot.behaviorChanged, true, 'C2 muss verbindliche Sicherheitssteuerung melden');
    assert(snapshot.blockedRequestsTotal >= 3, 'Blockierte Writes wurden nicht gezählt');
    assert(snapshot.preventedConflictCount >= 1, 'Verhinderte Konflikte wurden nicht diagnostiziert');
    assert(snapshot.preemptionsTotal >= 2, 'Prioritätsübernahmen wurden nicht diagnostiziert');

    arbiter.stop();
    assert.strictEqual(adapter.setForeignStateAsync, originalSet, 'Originaler Hardwarepfad wurde beim Shutdown nicht restauriert');
    console.log('[actuator-safety-arbiter] OK: Safety/§14a/Peak/Manual-Priorität, Lease, Preemption, Same-Cycle und Hardware-Map-Gate geprüft.');
  } finally {
    Date.now = realNow;
  }
})().catch((error) => {
  console.error('[actuator-safety-arbiter] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
