#!/usr/bin/env node
'use strict';
/**
 * Regression 0.8.88: Sungrow-Diagnosestates + Split-Sollwertpfade.
 *
 * Zweck:
 * - Alle Sungrow-Hybrid-Diagnosestates muessen in _ensureStates angelegt werden,
 *   damit ioBroker keine zyklischen "has no existing object"-Warnungen loggt.
 * - Die Eigenverbrauchs-/NVP-Regelung muss sowohl signed-Sollwerte als auch getrennte
 *   Lade-/Entlade-DPs unterstuetzen. Teilweise Split-Zuordnungen duerfen nicht die
 *   jeweils andere Richtung kaputtmachen.
 */
const assert = require('assert');
const { SpeicherRegelungModule } = require('../ems/modules/storage-control');

function nowMs() { return Date.now(); }

class FakeDp {
  constructor(entries) {
    this.entries = entries || {};
    this.writes = [];
  }
  getEntry(key) { return this.entries[key] || null; }
  async writeNumber(key, value) {
    this.writes.push({ key, value: Number(value) });
    return true;
  }
  async writeBoolean(key, value) {
    this.writes.push({ key, value: !!value });
    return true;
  }
  lastWrite(key) {
    const found = this.writes.filter(w => w.key === key);
    return found.length ? found[found.length - 1].value : undefined;
  }
}

function makeAdapter() {
  const states = new Map();
  const objects = new Map();
  return {
    config: { enableStorageControl: true, enableStorageFarm: false, storageFarm: {}, storage: {} },
    log: { warn() {}, info() {}, debug() {}, error() {} },
    async setObjectNotExistsAsync(id, obj) { objects.set(id, obj); },
    async setStateAsync(id, val) { states.set(id, { val, ts: nowMs() }); },
    async getStateAsync(id) { return states.get(id) || null; },
    _states: states,
    _objects: objects,
  };
}

function entry(objectId) { return { objectId, ts: nowMs(), val: 0 }; }

async function applyWith(entries, targetW) {
  const dp = new FakeDp(entries);
  const adapter = makeAdapter();
  const mod = new SpeicherRegelungModule(adapter, dp);
  await mod._applyTargetW(targetW, 'test', 'eigenverbrauch');
  return { dp, adapter };
}

(async () => {
  const adapter = makeAdapter();
  const mod = new SpeicherRegelungModule(adapter, new FakeDp({}));
  await mod._ensureStates();

  const requiredSungrowStates = [
    'speicher.regelung.herstellerprofil',
    'speicher.regelung.sungrowHybridAktiv',
    'speicher.regelung.sungrowHybridModus',
    'speicher.regelung.sungrowHybridGrund',
    'speicher.regelung.sungrowHybridSchreibmodus',
    'speicher.regelung.sungrowHybridSollW',
    'speicher.regelung.sungrowHybridPvW',
    'speicher.regelung.sungrowHybridLastW',
    'speicher.regelung.sungrowHybridNvpW',
    'speicher.regelung.sungrowHybridImportW',
    'speicher.regelung.sungrowHybridExportW',
    'speicher.regelung.sungrowHybridPvDecktLast',
    'speicher.regelung.sungrowHybridSchwelleW',
    'speicher.regelung.sungrowHybridLastReserveW',
    'speicher.regelung.sungrowHybridImportSchwelleW',
    'speicher.regelung.sungrowHybridNvpZielW',
    'speicher.regelung.sungrowHybridNvpDeadbandW',
    'speicher.regelung.sungrowHybridNvpFehlerW',
    'speicher.regelung.sungrowHybridNvpBalanceBasisW',
    'speicher.regelung.sungrowHybridNvpBalanceZielW',
    'speicher.regelung.sungrowHybridNvpBalanceAktiv',
  ];
  for (const id of requiredSungrowStates) {
    assert(adapter._objects.has(id), `Diagnose-State fehlt und wuerde ioBroker warnen: ${id}`);
  }

  const both = await applyWith({
    'st.targetChargePowerW': entry('battery.charge'),
    'st.targetDischargePowerW': entry('battery.discharge'),
    'st.run': entry('battery.run'),
  }, -1200);
  assert.strictEqual(both.dp.lastWrite('st.targetChargePowerW'), 1200, 'Split: Laden muss auf Lade-DP geschrieben werden');
  assert.strictEqual(both.dp.lastWrite('st.targetDischargePowerW'), 0, 'Split: Entlade-DP muss beim Laden auf 0');
  assert.strictEqual(both.dp.lastWrite('st.run'), true, 'Split: Run muss bei aktivem Sollwert true sein');
  assert.strictEqual(both.adapter._states.get('speicher.regelung.targetMode').val, 'split-charge-discharge');

  const dischargeOnly = await applyWith({
    'st.targetDischargePowerW': entry('battery.discharge'),
    'st.run': entry('battery.run'),
  }, 900);
  assert.strictEqual(dischargeOnly.dp.lastWrite('st.targetDischargePowerW'), 900, 'Teil-Split: Entladen muss auch ohne Lade-DP funktionieren');
  assert.strictEqual(dischargeOnly.dp.lastWrite('st.run'), true, 'Teil-Split: Run muss bei unterstuetzter Richtung true sein');
  assert.strictEqual(dischargeOnly.adapter._states.get('speicher.regelung.targetMode').val, 'split-discharge-only');

  const chargeOnly = await applyWith({
    'st.targetChargePowerW': entry('battery.charge'),
    'st.run': entry('battery.run'),
  }, -700);
  assert.strictEqual(chargeOnly.dp.lastWrite('st.targetChargePowerW'), 700, 'Teil-Split: Laden muss auch ohne Entlade-DP funktionieren');
  assert.strictEqual(chargeOnly.dp.lastWrite('st.run'), true, 'Teil-Split: Run muss bei unterstuetzter Richtung true sein');
  assert.strictEqual(chargeOnly.adapter._states.get('speicher.regelung.targetMode').val, 'split-charge-only');

  const partialFallback = await applyWith({
    'st.targetChargePowerW': entry('battery.charge'),
    'st.targetPowerW': entry('battery.signed'),
    'st.run': entry('battery.run'),
  }, 650);
  assert.strictEqual(partialFallback.dp.lastWrite('st.targetPowerW'), 650, 'Teil-Split mit signed-Fallback muss fehlende Entlade-Richtung ueber signed schreiben');
  assert.strictEqual(partialFallback.dp.lastWrite('st.targetChargePowerW'), 0, 'Fallback muss den vorhandenen Gegenrichtungs-DP sicher auf 0 setzen');
  assert.strictEqual(partialFallback.dp.lastWrite('st.run'), true, 'Fallback muss Run true setzen');

  const partialMissing = await applyWith({
    'st.targetChargePowerW': entry('battery.charge'),
    'st.run': entry('battery.run'),
  }, 650);
  assert.strictEqual(partialMissing.dp.lastWrite('st.targetChargePowerW'), 0, 'Teil-Split ohne passende Richtung muss vorhandenen Gegenpfad sicher auf 0 setzen');
  assert.strictEqual(partialMissing.dp.lastWrite('st.run'), false, 'Teil-Split ohne passende Richtung darf externe Regelung nicht aktivieren');
  assert.strictEqual(partialMissing.adapter._states.get('speicher.regelung.schreibOk').val, false, 'Teil-Split ohne passende Richtung muss Schreibstatus fehlschlagen lassen');

  const signed = await applyWith({
    'st.targetPowerW': entry('battery.signed'),
    'st.run': entry('battery.run'),
  }, -500);
  assert.strictEqual(signed.dp.lastWrite('st.targetPowerW'), -500, 'Signed-Pfad muss unveraendert funktionieren');
  assert.strictEqual(signed.adapter._states.get('speicher.regelung.targetMode').val, 'signed-targetPower');

  console.log('[storage-sungrow-diagnostics-split-targets] OK: Diagnose-States vorhanden und Split-/signed-Zielpfade korrekt verriegelt.');
})().catch((err) => {
  console.error('[storage-sungrow-diagnostics-split-targets] ERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
});
