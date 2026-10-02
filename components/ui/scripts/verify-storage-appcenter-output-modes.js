#!/usr/bin/env node
'use strict';

/**
 * Regression 0.8.124: Alle beschreibbaren Einzel-Speicher-DPs aus dem
 * AppCenter bleiben am finalen Gate-/Executor-Pfad gekoppelt.
 *
 * Geprüft werden freie ioBroker-IDs für:
 * - signed + getrennte Lade-/Entlade-Sollwerte,
 * - Run/Externe-Regelung und Reserve-SoC,
 * - Leistungsgrenzen,
 * - Lade-/Entladefreigaben,
 * - bewusst einseitige Zuordnungen,
 * - echte Mehrfachzuordnungen als Sicherheitskonflikt.
 */
const assert = require('assert');
const { SpeicherRegelungModule } = require('../ems/modules/storage-control');

class FakeDp {
  constructor(entries = {}) {
    this.entries = new Map(Object.entries(entries));
    this.writes = [];
    this.rawByObjectId = new Map();
    this.lastWriteByObjectId = new Map();
  }
  getEntry(key) { return this.entries.get(key) || null; }
  getRaw(key) {
    const entry = this.getEntry(key);
    return entry ? this.rawByObjectId.get(entry.objectId) : null;
  }
  async writeNumber(key, value) {
    const entry = this.getEntry(key);
    if (!entry) return false;
    const physical = Number(value);
    let raw = (physical - Number(entry.offset || 0)) / (Number(entry.scale || 1) || 1);
    if (entry.invert) raw = -raw;
    if (Number.isFinite(Number(entry.unitScale)) && Number(entry.unitScale) !== 0 && Number(entry.unitScale) !== 1) raw /= Number(entry.unitScale);
    this.rawByObjectId.set(entry.objectId, raw);
    this.lastWriteByObjectId.set(entry.objectId, { val: physical, ts: Date.now() });
    this.writes.push({ key, objectId: entry.objectId, value: physical, raw, type: 'number' });
    return true;
  }
  async writeBoolean(key, value) {
    const entry = this.getEntry(key);
    if (!entry) return false;
    const physical = !!value;
    const raw = entry.invert ? !physical : physical;
    this.rawByObjectId.set(entry.objectId, raw);
    this.lastWriteByObjectId.set(entry.objectId, { val: physical ? 1 : 0, ts: Date.now() });
    this.writes.push({ key, objectId: entry.objectId, value: physical, raw, type: 'boolean' });
    return true;
  }
  last(key) {
    const list = this.writes.filter((row) => row.key === key);
    return list.length ? list[list.length - 1] : null;
  }
  count(key) { return this.writes.filter((row) => row.key === key).length; }
  clear() { this.writes.length = 0; }
}

function makeAdapter(storage = {}) {
  const states = new Map();
  return {
    config: {
      enableStorageControl: true,
      enableStorageFarm: false,
      emsApps: { apps: { storagefarm: { installed: false, enabled: false } } },
      storageFarm: { storages: [] },
      storage: { controlMode: 'targetPower', reserveMinSocPct: 20, ...storage },
    },
    log: { debug() {}, info() {}, warn() {}, error() {} },
    async getStateAsync(id) { return states.get(String(id)) || null; },
    async setStateAsync(id, value) {
      const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val') ? value.val : value;
      states.set(String(id), { val, ts: Date.now(), ack: true });
    },
    async setObjectNotExistsAsync() {},
    _states: states,
  };
}

function entry(objectId, extra = {}) { return { objectId, scale: 1, offset: 0, invert: false, ...extra }; }
function state(adapter, id) { const rec = adapter._states.get(id); return rec ? rec.val : undefined; }

async function verifyTargetPowerAllOutputs() {
  const adapter = makeAdapter({ controlMode: 'targetPower' });
  const dp = new FakeDp({
    'st.targetPowerW': entry('custom.vendor.ctrl.signedTarget'),
    'st.targetChargePowerW': entry('modbus.17.free.chargeTarget'),
    'st.targetDischargePowerW': entry('mqtt.0/site/storage/dischargeTarget'),
    'st.run': entry('javascript.0.storage.externalControl'),
    'st.reserveSocPct': entry('openems.0.edge.controller.reserveSoc'),
  });
  // Simuliere einen alten Signed-Auftrag, der beim Wechsel auf die vollstaendige
  // Split-Familie zuerst neutralisiert werden muss.
  dp.rawByObjectId.set('custom.vendor.ctrl.signedTarget', -1869);
  const mod = new SpeicherRegelungModule(adapter, dp);
  mod._effectiveReserveSocPct = 27;

  await mod._applyTargetW(-803, 'final gated charge', 'pv');
  assert.strictEqual(dp.last('st.targetPowerW').value, 0, 'nicht ausgewaehlter Signed-DP muss neutralisiert werden');
  assert.strictEqual(dp.last('st.targetChargePowerW').value, 803, 'getrennter Lade-DP wird nicht bedient');
  assert.strictEqual(dp.last('st.targetDischargePowerW').value, 0, 'Gegenrichtung muss sicher auf 0 W gesetzt werden');
  assert.strictEqual(dp.last('st.run').value, true, 'Run-DP folgt dem erfolgreichen gegateten Hauptpfad nicht');
  assert.strictEqual(dp.last('st.reserveSocPct').value, 27, 'Reserve-DP ist nicht mit derselben SoC-Sicherheitsgrenze gekoppelt');
  assert.strictEqual(state(adapter, 'speicher.regelung.commandFamily'), 'split');
  assert.strictEqual(state(adapter, 'speicher.regelung.targetMode'), 'split-charge-discharge');
  assert.strictEqual(state(adapter, 'speicher.regelung.schreibStatus'), 'split-geschrieben');
  assert.strictEqual(state(adapter, 'speicher.regelung.schreibOk'), true);
  assert.strictEqual(state(adapter, 'speicher.regelung.commandDpReadbackStatus'), 'confirmed');

  const writtenIds = new Set(dp.writes.map((row) => row.objectId));
  for (const id of [
    'custom.vendor.ctrl.signedTarget',
    'modbus.17.free.chargeTarget',
    'mqtt.0/site/storage/dischargeTarget',
    'javascript.0.storage.externalControl',
    'openems.0.edge.controller.reserveSoc',
  ]) assert(writtenIds.has(id), `frei benannter AppCenter-DP wurde verändert oder ausgelassen: ${id}`);

  dp.clear();
  await mod._applyTargetW(1207, 'direct charge-to-discharge', 'eigenverbrauch');
  const splitWrites = dp.writes.filter((row) => row.key === 'st.targetChargePowerW' || row.key === 'st.targetDischargePowerW');
  assert.deepStrictEqual(
    splitWrites.map((row) => [row.key, row.value]),
    [['st.targetChargePowerW', 0], ['st.targetDischargePowerW', 1207]],
    'direkter Richtungswechsel muss im selben Tick zuerst die alte Richtung nullen und danach die neue setzen',
  );
  assert.strictEqual(dp.writes.some((row) => row.key === 'st.targetPowerW' && row.value !== 0), false, 'ignorierter Signed-DP darf keinen aktiven Sollwert erhalten');
  assert.strictEqual(dp.last('st.run').value, true, 'Run darf beim direkten Richtungswechsel nicht auf false fallen');
}

async function verifySignedOnlyOutput() {
  const adapter = makeAdapter({ controlMode: 'targetPower' });
  const dp = new FakeDp({
    'st.targetPowerW': entry('free.vendor.signed.only', { invert: true }),
    'st.run': entry('free.vendor.signed.run'),
  });
  const mod = new SpeicherRegelungModule(adapter, dp);
  await mod._applyTargetW(1200, 'signed only discharge', 'eigenverbrauch');
  assert.strictEqual(dp.last('st.targetPowerW').value, 1200);
  assert.strictEqual(dp.last('st.targetPowerW').raw, -1200, 'Signed-Invertierung muss im Readbackvertrag berücksichtigt werden');
  assert.strictEqual(state(adapter, 'speicher.regelung.commandFamily'), 'signed');
  assert.strictEqual(state(adapter, 'speicher.regelung.schreibStatus'), 'signed-geschrieben');
  assert.strictEqual(state(adapter, 'speicher.regelung.commandDpReadbackStatus'), 'confirmed');
}

async function verifyLimitsMode() {
  const adapter = makeAdapter({ controlMode: 'limits' });
  const dp = new FakeDp({
    'st.maxChargeW': entry('free.adapter.0.command.maxCharge'),
    'st.maxDischargeW': entry('another.vendor.9.limit.maxDischarge'),
    'st.run': entry('logic.0.storage.run'),
    'st.reserveSocPct': entry('logic.0.storage.reserve'),
  });
  const mod = new SpeicherRegelungModule(adapter, dp);
  mod._effectiveReserveSocPct = 31;

  await mod._applyTargetW(-803, 'gated charge limit', 'pv');
  assert.strictEqual(dp.last('st.maxChargeW').value, 803);
  assert.strictEqual(dp.last('st.maxDischargeW').value, 0);
  assert.strictEqual(dp.last('st.run').value, true);
  assert.strictEqual(dp.last('st.reserveSocPct').value, 31);
  assert.strictEqual(state(adapter, 'speicher.regelung.schreibStatus'), 'leistungsgrenzen-geschrieben');

  dp.clear();
  await mod._applyTargetW(421, 'gated discharge limit', 'eigenverbrauch');
  assert.strictEqual(dp.last('st.maxChargeW').value, 0);
  assert.strictEqual(dp.last('st.maxDischargeW').value, 421);
  assert.strictEqual(dp.last('st.run').value, true);

  dp.clear();
  await mod._applyTargetW(0, 'safe stop', 'safety');
  assert.strictEqual(dp.last('st.maxChargeW').value, 0);
  assert.strictEqual(dp.last('st.maxDischargeW').value, 0);
  assert.strictEqual(dp.last('st.run').value, false);
}

async function verifyEnableFlagsMode() {
  const adapter = makeAdapter({ controlMode: 'enableFlags' });
  const dp = new FakeDp({
    'st.chargeEnable': entry('vendor.independent.chargeAllowed'),
    'st.dischargeEnable': entry('vendor.independent.dischargeAllowed'),
    'st.run': entry('vendor.independent.externalMode'),
  });
  const mod = new SpeicherRegelungModule(adapter, dp);

  await mod._applyTargetW(-803, 'charge allowed after gates', 'pv');
  assert.strictEqual(dp.last('st.chargeEnable').value, true);
  assert.strictEqual(dp.last('st.dischargeEnable').value, false);
  assert.strictEqual(dp.last('st.run').value, true);
  assert.strictEqual(state(adapter, 'speicher.regelung.schreibStatus'), 'freigabe-flags-geschrieben');

  dp.clear();
  await mod._applyTargetW(803, 'discharge allowed after gates', 'eigenverbrauch');
  assert.strictEqual(dp.last('st.chargeEnable').value, false);
  assert.strictEqual(dp.last('st.dischargeEnable').value, true);

  dp.clear();
  await mod._applyTargetW(0, 'safe stop', 'safety');
  assert.strictEqual(dp.last('st.chargeEnable').value, false);
  assert.strictEqual(dp.last('st.dischargeEnable').value, false);
  assert.strictEqual(dp.last('st.run').value, false);
}

async function verifyOneDirectionAndConflictSafety() {
  // Eine bewusst einseitige Zuordnung ist gültig. Nur die fehlende Richtung
  // wird gesperrt; der vorhandene AppCenter-DP bleibt verwendbar.
  const oneAdapter = makeAdapter({ controlMode: 'limits' });
  const oneDp = new FakeDp({
    'st.maxChargeW': entry('one.direction.only.chargeLimit'),
    'st.run': entry('one.direction.run'),
  });
  const oneMod = new SpeicherRegelungModule(oneAdapter, oneDp);
  await oneMod._applyTargetW(-500, 'one direction charge', 'pv');
  assert.strictEqual(oneDp.last('st.maxChargeW').value, 500);
  assert.strictEqual(state(oneAdapter, 'speicher.regelung.schreibOk'), true);

  oneDp.clear();
  await oneMod._applyTargetW(500, 'unmapped direction', 'eigenverbrauch');
  assert.strictEqual(oneDp.last('st.maxChargeW').value, 0, 'vorhandener Gegen-DP muss beim nicht unterstützten Wunsch sicher genullt werden');
  assert.strictEqual(oneDp.last('st.run').value, false);
  assert.strictEqual(state(oneAdapter, 'speicher.regelung.schreibStatus'), 'zielrichtung-nicht-gemappt');
  assert.strictEqual(state(oneAdapter, 'speicher.regelung.schreibOk'), false);

  // Zwei unterschiedliche Funktionen auf demselben Objekt sind ein echter
  // Sicherheitskonflikt. Der Ausgang bleibt unbeschrieben und ein separater
  // Run-DP wird auf false gesetzt.
  const conflictAdapter = makeAdapter({ controlMode: 'limits' });
  const conflictDp = new FakeDp({
    'st.maxChargeW': entry('same.object.for.two.functions'),
    'st.maxDischargeW': entry('same.object.for.two.functions'),
    'st.run': entry('separate.safe.run'),
  });
  const conflictMod = new SpeicherRegelungModule(conflictAdapter, conflictDp);
  await conflictMod._applyTargetW(-900, 'must be blocked', 'pv');
  assert.strictEqual(conflictDp.writes.some((row) => row.objectId === 'same.object.for.two.functions'), false, 'kollidierender DP wurde trotz Sicherheitskonflikt beschrieben');
  assert.strictEqual(conflictDp.last('st.run').value, false, 'separater Run-DP wurde bei Mapping-Konflikt nicht sicher deaktiviert');
  assert.strictEqual(state(conflictAdapter, 'speicher.regelung.schreibStatus'), 'dp-zuordnung-konflikt');
  const conflictJson = JSON.parse(state(conflictAdapter, 'speicher.regelung.outputMappingConflictJson'));
  assert.strictEqual(conflictJson[0].objectId, 'same.object.for.two.functions');
}

(async () => {
  await verifyTargetPowerAllOutputs();
  await verifySignedOnlyOutput();
  await verifyLimitsMode();
  await verifyEnableFlagsMode();
  await verifyOneDirectionAndConflictSafety();
  console.log('[storage-appcenter-output-modes] OK: Alle manuellen Speicher-Ausgänge laufen durch denselben finalen Gate-/Executor-Pfad.');
})().catch((err) => {
  console.error('[storage-appcenter-output-modes] ERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
});
