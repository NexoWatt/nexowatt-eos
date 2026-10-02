#!/usr/bin/env node
'use strict';

/** Regression 0.8.112: C3.1 Threshold-/Relais-Steuerhoheit. */
const assert = require('assert');
const fs = require('fs');
const {
  installActuatorShadowArbiter,
  withActuatorShadowContext,
  isActuatorAuthorityBlockedResult,
} = require('../ems/services/actuator-shadow-arbiter');
const { ThresholdControlModule } = require('../ems/modules/threshold-control');

function makeArbiterAdapter() {
  const calls = [];
  const adapter = {
    namespace: 'nexowatt-ui.0',
    config: { diagnostics: { actuatorArbiterMode: 'enforce-safety' } },
    _stageAActuatorOwnerById: {
      'device.0.shared.relay': { owners: ['threshold.r1', 'relay.r1', 'nexoLogic'], activeOwners: ['threshold.r1', 'relay.r1', 'nexoLogic'] },
    },
    log: { warn(){}, info(){}, debug(){}, error(){} },
    async setForeignStateAsync(...args) { calls.push(args); },
    calls,
  };
  installActuatorShadowArbiter(adapter);
  return adapter;
}

(async () => {
  const adapter = makeArbiterAdapter();
  const thresholdWrite = await withActuatorShadowContext(adapter, {
    owner: 'threshold.r1', priority: 500, enforceAuthority: true, leaseMs: 20000, cycleId: 1,
  }, () => adapter.setForeignStateAsync('device.0.shared.relay', true, false));
  assert(!isActuatorAuthorityBlockedResult(thresholdWrite), 'Expliziter C3-Owner unter Safety-Floor konnte keine Steuerhoheit erwerben');

  const logicBlocked = await withActuatorShadowContext(adapter, {
    owner: 'nexoLogic', priority: 400, cycleId: 1,
  }, () => adapter.setForeignStateAsync('device.0.shared.relay', false, false));
  assert(isActuatorAuthorityBlockedResult(logicBlocked), 'Niedrigerer Komfortpfad durfte Threshold im selben Zyklus ueberschreiben');

  const manual = await withActuatorShadowContext(adapter, {
    owner: 'manual.relay.r1', priority: 750, enforceAuthority: true, leaseMs: 300000,
  }, () => adapter.setForeignStateAsync('device.0.shared.relay', false, false));
  assert(!isActuatorAuthorityBlockedResult(manual), 'Manuelle Relaisbedienung konnte Threshold nicht kontrolliert preempten');

  const states = new Map();
  const objects = new Map();
  let allowWrite = false;
  const thresholdAdapter = {
    namespace: 'nexowatt-ui.0',
    config: { enableThresholdControl: true, threshold: { rules: [
      { idx: 1, enabled: true, inputId: 'meter.0.power', outputId: 'device.0.shared.relay', outputType: 'boolean', threshold: 100, compare: 'above', onValue: true, offValue: false },
      { idx: 2, enabled: true, inputId: 'meter.0.power', outputId: 'device.0.incomplete.relay', outputType: 'boolean', threshold: null, compare: 'above', onValue: true, offValue: false },
    ] } },
    log: { warn(){}, info(){}, debug(){}, error(){} },
    async setObjectNotExistsAsync(id, obj){ if (!objects.has(id)) objects.set(id, obj); },
    async getStateAsync(id){ return states.get(id) || null; },
    async setStateAsync(id, val){ states.set(id, typeof val === 'object' && val && 'val' in val ? val : { val }); },
  };
  const dp = {
    out: false,
    writes: [],
    async upsert(){},
    getBoolean(key, fallback){ if (key === 'thr.user.r1.enabled') return true; if (key === 'thr.r1.out') return this.out; return fallback; },
    getNumber(key, fallback){ if (key === 'thr.user.r1.mode') return 1; return fallback; },
    getNumberFresh(key, _age, fallback){ if (key === 'thr.r1.in') return 200; return fallback; },
    async writeBoolean(key, value){
      this.writes.push({ key, value: !!value });
      // Eine unvollstaendige Regel mit bereits gemapptem Ausgang muss nach RC39
      // fail-closed AUS schreiben duerfen. Der r1-Write bleibt fuer den
      // eigentlichen Fehlerpfad dieses Tests weiterhin blockiert.
      if (key === 'thr.r2.out' && value === false) return true;
      if (!allowWrite) return false;
      this.out = !!value;
      return true;
    },
    async writeNumber(key, value){ this.writes.push({ key, value: Number(value) }); return false; },
  };
  const mod = new ThresholdControlModule(thresholdAdapter, dp);
  thresholdAdapter._stageAActuatorOwnerById = {
    'device.0.shared.relay': { activeOwners: ['threshold.r1'] },
  };
  assert.strictEqual(mod._ruleHasExclusiveAuthority({ outputId: 'device.0.shared.relay' }, 'threshold.r1'), true,
    'Exklusiv gemappte Threshold-Regel muss C3-Steuerhoheit erhalten');
  thresholdAdapter._stageAActuatorOwnerById['device.0.shared.relay'] = { activeOwners: ['threshold.r1', 'relay.r1'] };
  assert.strictEqual(mod._ruleHasExclusiveAuthority({ outputId: 'device.0.shared.relay' }, 'threshold.r1'), false,
    'Geteilter Aktor muss bis zur spaeteren Modulmigration im Shadow-Modus bleiben');
  assert.strictEqual(mod._ruleHasExclusiveAuthority({ outputId: 'device.0.shared.relay' }, 'manual.threshold.r1'), true,
    'Explizite manuelle Threshold-Lease muss verbindlich sein');
  await mod.init();
  assert.strictEqual(objects.get('threshold.user.r1.minOnSec')?.common?.def, 0,
    'MinOn-Default muss numerisch 0 s sein und darf nicht durch ein verschobenes mk()-Argument zu true werden');
  assert.strictEqual(objects.get('threshold.user.r1.minOffSec')?.common?.def, 0,
    'MinOff-Default muss numerisch 0 s sein und darf nicht durch ein verschobenes mk()-Argument zu true werden');
  assert.strictEqual(objects.get('threshold.user.r1.minOnSec')?.common?.type, 'number');
  assert.strictEqual(objects.get('threshold.user.r1.minOffSec')?.common?.type, 'number');
  await mod.tick();
  assert.strictEqual(states.get('threshold.rules.r2.configured').val, false,
    'Eine aktivierte Regel ohne gueltige Schwelle darf nicht als konfiguriert gelten');
  assert.strictEqual(states.get('threshold.rules.r2.status').val, 'unconfigured-safe-stop');
  assert.strictEqual(dp.writes.some((row) => row.key === 'thr.r2.out' && row.value === false), true,
    'Eine unvollstaendige Schwellwertregel muss einen zuvor moeglicherweise aktiven Ausgang fail-closed ausschalten');
  assert.strictEqual(states.get('threshold.rules.r1.active').val, false, 'Fehlgeschlagener Write wurde intern als aktiver Ausgang verbucht');
  assert.strictEqual(states.get('threshold.rules.r1.status').val, 'write_blocked_or_failed');

  allowWrite = true;
  await mod.tick();
  assert.strictEqual(states.get('threshold.rules.r1.active').val, true, 'Erfolgreicher Threshold-Write wurde nicht uebernommen');
  assert.strictEqual(states.get('threshold.rules.r1.lastWriteOk').val, true);

  const main = fs.readFileSync(require('path').join(__dirname, '../src-ts/runtime-executables/main.ts'), 'utf8');
  const stageA = fs.readFileSync(require('path').join(__dirname, '../src-ts/runtime-executables/ems/modules/stage-a-diagnostics.ts'), 'utf8');
  assert(stageA.includes("if (lower.startsWith('relay.')) return config.enableRelayControl === true;"),
    'Inaktive manuelle Relaiszeilen duerfen Threshold nicht kuenstlich die exklusive Steuerhoheit entziehen');
  assert(main.includes('blocked_by_actuator_authority'), 'Manuelle Relais-API erkennt blockierte Arbiter-Writes nicht');
  assert(main.includes('manual.relay.r${idx}'), 'Manuelle Relais-API besitzt keinen eindeutigen C3-Owner');
  assert(main.includes("kind: 'manual-relay'"), 'Manuelle Relais-API setzt keine befristete Arbiter-Lease');
  assert(main.includes("writeRelayValue(b, 'switch')") && main.includes("writeRelayValue(v, 'value')"),
    'Boolean- und Zahlen-Relaispfad laufen nicht beide durch den Arbiter');
  console.log('[actuator-c3-threshold-relay] OK: Threshold-Owner, manuelle Preemption, unvollstaendige Regeln und Write-Fehlerpfad geprueft.');
})().catch((err) => { console.error(err && err.stack ? err.stack : err); process.exit(1); });
