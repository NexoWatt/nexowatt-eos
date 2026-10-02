// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-actuator-blocked-write-propagation.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-actuator-blocked-write-propagation.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Produktive Originalquellen liegen unter
 * src-ts/runtime-executables/ bzw. den im generierten JS genannten TS-Pfaden.
 * Dort ändern, Laufzeit erzeugen und danach die Spiegel synchronisieren.
 * Build-/Prüfskripte ohne TS-Original werden weiterhin unter scripts/ gepflegt.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: 04d27fea6d98475a704b87dd1474e41136cee8e545cc1d0a1d08a34a4bc5c6d4
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

'use strict';

/**
 * Regression Stufe C2: Ein vom Aktor-Arbiter blockierter Write darf in direkten
 * Modulpfaden nicht als erfolgreich gelten und keinen lokalen Write-Cache oder
 * Folgeimpuls erzeugen.
 */
const assert = require('assert');
const {
  installActuatorShadowArbiter,
  withActuatorShadowContext,
} = require('../ems/services/actuator-shadow-arbiter');
const { HeatingRodControlModule } = require('../ems/modules/heating-rod-control');
const { BhkwControlModule } = require('../ems/modules/bhkw-control');
const { GeneratorControlModule } = require('../ems/modules/generator-control');
const { ChargingManagementModule } = require('../ems/modules/charging-management');

/**
 * Code-Teil: makeAdapter
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function makeAdapter(targets) {
  const calls = [];
  const timers = [];
  const ownerMap = {};
  for (const [targetId, owners] of Object.entries(targets)) {
    ownerMap[targetId] = { owners, activeOwners: owners };
  }
  const adapter = {
    namespace: 'nexowatt-ui.0',
    config: { diagnostics: { actuatorArbiterMode: 'enforce-safety' } },
    _stageAActuatorOwnerById: ownerMap,
    log: { warn() {}, info() {}, debug() {}, error() {} },
    async setForeignStateAsync(...args) { calls.push(args); return undefined; },
    async setStateAsync() {},
    async getStateAsync() { return null; },
    async setObjectNotExistsAsync() {},
    _nwSetTimeout(fn, ms) { timers.push({ fn, ms }); return timers.length; },
    calls,
    timers,
  };
  installActuatorShadowArbiter(adapter);
  return adapter;
}

/**
 * Code-Teil: acquireManual
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
async function acquireManual(adapter, targetId, value) {
  await withActuatorShadowContext(adapter, {
    owner: 'manual.ems', reason: 'field override', enforceAuthority: true, leaseMs: 300000,
  }, () => adapter.setForeignStateAsync(targetId, value, false));
}

(async () => {
  // Heizstab-Force-Write: blockiert => false, Cache bleibt unverändert.
  {
    const target = 'device.0.heating.output';
    const adapter = makeAdapter({ [target]: ['manual.ems', 'heatingRodControl'] });
    await acquireManual(adapter, target, false);
    const dp = {
      lastWriteByObjectId: new Map(),
      getEntry(key) { return key === 'hr' ? { objectId: target, invert: false } : null; },
    };
    const module = new HeatingRodControlModule(adapter, dp);
    const before = adapter.calls.length;
    const ok = await withActuatorShadowContext(adapter, { owner: 'heatingRodControl', cycleId: 1 }, () =>
      module._writeBoolForce('hr', true, true));
    assert.strictEqual(ok, false, 'Blockierter Heizstab-Force-Write gilt als erfolgreich');
    assert.strictEqual(adapter.calls.length, before, 'Blockierter Heizstab-Write erreichte Hardware');
    assert.strictEqual(dp.lastWriteByObjectId.has(target), false, 'Blockierter Heizstab-Write aktualisierte den Cache');
  }

  // BHKW/Generator: blockierter Level- oder Puls-Write darf keinen Erfolg bzw. Reset-Timer erzeugen.
  for (const [name, ModuleClass, owner] of [
    ['BHKW', BhkwControlModule, 'bhkw.b1'],
    ['Generator', GeneratorControlModule, 'generator.g1'],
  ]) {
    const levelTarget = `device.0.${owner}.level`;
    const pulseTarget = `device.0.${owner}.pulse`;
    const adapter = makeAdapter({
      [levelTarget]: ['manual.ems', owner],
      [pulseTarget]: ['manual.ems', owner],
    });
    const module = new ModuleClass(adapter, null);
    const baseDevice = {
      id: owner.endsWith('b1') ? 'b1' : 'g1',
      commandProfile: 'run-level',
      startWriteId: '', stopWriteId: '', runWriteId: levelTarget,
      pulseMs: 500, ownerLeaseMs: 30000,
    };
    await acquireManual(adapter, levelTarget, false);
    const beforeLevel = adapter.calls.length;
    const levelResult = await module.writeDesired(baseDevice, true, owner, 'test-level', false);
    assert.strictEqual(levelResult.accepted, false, `${name}: blockierter Level-Write gilt als erfolgreich`);
    assert.strictEqual(levelResult.blocked, true, `${name}: Level-Write wurde nicht als Arbiter-Blockade erkannt`);
    assert.strictEqual(adapter.calls.length, beforeLevel, `${name}: blockierter Level-Write erreichte Hardware`);

    await acquireManual(adapter, pulseTarget, false);
    const beforePulse = adapter.calls.length;
    const pulseResult = await module.pulseWrite({ ...baseDevice, commandProfile: 'pulse' }, pulseTarget, owner, 'test-pulse', false);
    assert.strictEqual(pulseResult.accepted, false, `${name}: blockierter Puls gilt als erfolgreich`);
    assert.strictEqual(pulseResult.blocked, true, `${name}: Puls wurde nicht als Arbiter-Blockade erkannt`);
    assert.strictEqual(adapter.calls.length, beforePulse, `${name}: blockierter Puls erreichte Hardware`);
    assert.strictEqual(adapter.timers.length, 0, `${name}: blockierter Puls erzeugte trotzdem einen Reset-Timer`);
  }

  // Direkter Phase-Switch-Fallback im Charging-Executor: kein Cache-/Assumed-Phase-Update bei Blockade.
  {
    const target = 'device.0.evcs.phaseMode';
    const adapter = makeAdapter({ [target]: ['manual.evcs', 'chargingManagement'] });
    await acquireManual(adapter, target, '1p');
    const lastWriteByObjectId = new Map();
    const fakeDp = {
      lastWriteByObjectId,
      getEntry(key) { return key === 'phase.lp1' ? { objectId: target } : null; },
    };
    const module = Object.create(ChargingManagementModule.prototype);
    module.adapter = adapter;
    module.dp = fakeDp;
    module._chargingPhaseAssumedBySafe = new Map();
    module._chargingPhaseCooldownUntilMs = new Map();
    module._chargingPhaseSettleUntilMs = new Map();
    const before = adapter.calls.length;
    const result = await withActuatorShadowContext(adapter, { owner: 'chargingManagement', cycleId: 1 }, () =>
      module._executeChargingSetpointEntries([
        { safe: 'lp1', type: 'phaseSwitch', basis: 'phase', setpointKey: 'phase.lp1', targetValue: '3p', targetPhaseCount: 3 },
      ], [{ safe: 'lp1', controlBasis: 'powerW' }], [], 'ts-write-plan'));
    assert.strictEqual(adapter.calls.length, before, 'Blockierter Phase-Switch erreichte Hardware');
    assert.strictEqual(lastWriteByObjectId.has(target), false, 'Blockierter Phase-Switch aktualisierte den Cache');
    assert.strictEqual(module._chargingPhaseAssumedBySafe.has('lp1'), false, 'Blockierter Phase-Switch änderte die angenommene Phase');
    assert.strictEqual(result.appliedCount, 0, 'Blockierter Phase-Switch wurde als angewendet gezählt');
  }

  console.log('[actuator-blocked-write-propagation] OK: direkte Modulpfade übernehmen keine blockierten Writes als Erfolg.');
})().catch((error) => {
  console.error('[actuator-blocked-write-propagation] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
