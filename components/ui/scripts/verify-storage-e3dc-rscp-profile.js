#!/usr/bin/env node
'use strict';
/**
 * Regression 0.8.89: E3/DC RSCP / ioBroker.e3dc-rscp Herstellerprofil.
 *
 * Zweck:
 * - Das AppCenter blendet E3/DC-spezifische Datenpunkte nur beim E3/DC-Profil ein.
 * - Speicher-Mapping registriert EMS.SET_POWER_MODE + EMS.SET_POWER_VALUE als eigenen
 *   Zielpfad, ohne signed-/Split-Speicherprofile zu vermischen.
 * - Die Speicherregelung uebersetzt die NexoWatt-Konvention (+W=Entladen, -W=Laden)
 *   in das RSCP-Tupel SET_POWER_MODE/SET_POWER_VALUE und legt alle Diagnoseobjekte an.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { SpeicherMappingModule } = require('../ems/modules/storage-mapping');
const { SpeicherRegelungModule } = require('../ems/modules/storage-control');

function nowMs() { return Date.now(); }

class FakeDp {
  constructor(entries) {
    this.entries = entries || {};
    this.writes = [];
    this.upserts = [];
  }
  getEntry(key) { return this.entries[key] || null; }
  async upsert(def) {
    this.upserts.push(def);
    this.entries[def.key] = {
      objectId: def.objectId,
      key: def.key,
      dataType: def.dataType,
      direction: def.direction,
      scale: Number.isFinite(Number(def.scale)) ? Number(def.scale) : 1,
      offset: Number.isFinite(Number(def.offset)) ? Number(def.offset) : 0,
      invert: !!def.invert,
      min: def.min,
      max: def.max,
      ts: nowMs(),
      val: 0,
    };
    return true;
  }
  async writeNumber(key, value) {
    this.writes.push({ key, value: Number(value) });
    return true;
  }
  async writeBoolean(key, value) {
    this.writes.push({ key, value: !!value });
    return true;
  }
  writesFor(key) { return this.writes.filter(w => w.key === key); }
  lastWrite(key) {
    const arr = this.writesFor(key);
    return arr.length ? arr[arr.length - 1].value : undefined;
  }
}

function makeAdapter(storage = {}) {
  const states = new Map();
  const objects = new Map();
  return {
    config: {
      enableStorageControl: true,
      enableStorageFarm: false,
      storageFarm: {},
      storage: {
        controlMode: 'targetPower',
        vendorProfile: 'e3dc-rscp',
        maxChargeW: 5000,
        maxDischargeW: 7000,
        ...storage,
      },
    },
    log: { warn() {}, info() {}, debug() {}, error() {} },
    async setObjectNotExistsAsync(id, obj) { if (!objects.has(id)) objects.set(id, obj); },
    async extendObjectAsync(id, obj) { objects.set(id, obj); },
    async setStateAsync(id, val) { states.set(id, { val, ts: nowMs() }); },
    async getStateAsync(id) { return states.get(id) || null; },
    _states: states,
    _objects: objects,
  };
}

function e3dcEntries() {
  return {
    'st.e3dcSetPowerMode': { objectId: 'e3dc-rscp.0.EMS.SET_POWER_MODE', ts: nowMs(), val: 0 },
    'st.e3dcSetPowerValueW': { objectId: 'e3dc-rscp.0.EMS.SET_POWER_VALUE', ts: nowMs(), val: 0 },
    'st.e3dcPowerLimitsUsed': { objectId: 'e3dc-rscp.0.EMS.POWER_LIMITS_USED', ts: nowMs(), val: false },
    'st.e3dcMaxChargePowerW': { objectId: 'e3dc-rscp.0.EMS.MAX_CHARGE_POWER', ts: nowMs(), val: 0 },
    'st.e3dcMaxDischargePowerW': { objectId: 'e3dc-rscp.0.EMS.MAX_DISCHARGE_POWER', ts: nowMs(), val: 0 },
  };
}

async function apply(targetW, source = 'eigenverbrauch', storage = {}) {
  const adapter = makeAdapter(storage);
  const dp = new FakeDp(e3dcEntries());
  const mod = new SpeicherRegelungModule(adapter, dp);
  await mod._ensureStates();
  await mod._applyTargetW(targetW, 'test-e3dc', source);
  return { adapter, dp };
}

(async () => {
  const root = path.resolve(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'www/ems-apps.html'), 'utf8');
  const uiTs = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/www/ems-apps.ts'), 'utf8');
  const mappingTs = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/storage-mapping.ts'), 'utf8');
  const controlTs = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/storage-control.ts'), 'utf8');

  assert(html.includes('value="e3dc-rscp"'), 'AppCenter muss E3/DC RSCP als Herstellerprofil anbieten');
  assert(html.includes('id="storageE3dcOptionsRow"'), 'AppCenter braucht einen eigenen E3/DC-Optionsblock');
  assert(uiTs.includes("showForVendor: ['e3dc-rscp']"), 'E3/DC-DPs duerfen nur beim E3/DC-Herstellerprofil sichtbar sein');
  assert(mappingTs.includes('st.e3dcSetPowerMode'), 'Mapping muss EMS.SET_POWER_MODE registrieren');
  assert(mappingTs.includes('st.e3dcSetPowerValueW'), 'Mapping muss EMS.SET_POWER_VALUE registrieren');
  assert(controlTs.includes('_writeE3dcRscpTargetW'), 'Speicherregelung muss E3/DC-RSCP-Zielwerte schreiben');

  const mappingAdapter = makeAdapter({
    datapoints: {
      socObjectId: 'e3dc-rscp.0.EMS.BAT_SOC',
      e3dcSetPowerModeObjectId: 'e3dc-rscp.0.EMS.SET_POWER_MODE',
      e3dcSetPowerValueObjectId: 'e3dc-rscp.0.EMS.SET_POWER_VALUE',
      e3dcPowerLimitsUsedObjectId: 'e3dc-rscp.0.EMS.POWER_LIMITS_USED',
      e3dcMaxChargePowerObjectId: 'e3dc-rscp.0.EMS.MAX_CHARGE_POWER',
      e3dcMaxDischargePowerObjectId: 'e3dc-rscp.0.EMS.MAX_DISCHARGE_POWER',
    },
  });
  const mappingDp = new FakeDp({});
  const mapping = new SpeicherMappingModule(mappingAdapter, mappingDp);
  await mapping.init();
  assert(mappingDp.getEntry('st.e3dcSetPowerMode'), 'Mapping muss st.e3dcSetPowerMode anlegen');
  assert(mappingDp.getEntry('st.e3dcSetPowerValueW'), 'Mapping muss st.e3dcSetPowerValueW anlegen');
  assert.strictEqual(mappingAdapter._states.get('speicher.mapping.ok').val, true, 'E3/DC-Mapping mit SET_POWER_MODE/SET_POWER_VALUE muss vollstaendig sein');
  assert.strictEqual(mappingAdapter._states.get('speicher.mapping.herstellerprofil').val, 'e3dc-rscp', 'Mapping-Diagnose muss Herstellerprofil spiegeln');

  const diagAdapter = makeAdapter();
  const diagMod = new SpeicherRegelungModule(diagAdapter, new FakeDp(e3dcEntries()));
  await diagMod._ensureStates();
  for (const id of [
    'speicher.regelung.e3dcRscpAktiv',
    'speicher.regelung.e3dcRscpModus',
    'speicher.regelung.e3dcRscpModeCode',
    'speicher.regelung.e3dcRscpValueW',
    'speicher.regelung.e3dcRscpSchreibmodus',
    'speicher.regelung.e3dcRscpSchreibOk',
  ]) {
    assert(diagAdapter._objects.has(id), `Diagnose-State fehlt: ${id}`);
  }

  const discharge = await apply(1500, 'eigenverbrauch', { e3dcUsePowerLimits: true, maxChargeW: 5000, maxDischargeW: 7000 });
  assert.strictEqual(discharge.adapter._states.get('speicher.regelung.targetMode').val, 'e3dc-rscp-set-power');
  assert.strictEqual(discharge.adapter._states.get('speicher.regelung.schreibStatus').val, 'e3dc-rscp-geschrieben');
  assert.strictEqual(discharge.dp.lastWrite('st.e3dcPowerLimitsUsed'), true, 'PowerLimits-Haken muss POWER_LIMITS_USED schreiben');
  assert.strictEqual(discharge.dp.lastWrite('st.e3dcMaxChargePowerW'), 5000, 'MaxCharge muss bei PowerLimits mitgefuehrt werden');
  assert.strictEqual(discharge.dp.lastWrite('st.e3dcMaxDischargePowerW'), 7000, 'MaxDischarge muss bei PowerLimits mitgefuehrt werden');
  assert.deepStrictEqual(discharge.dp.writes.slice(-2).map(w => [w.key, w.value]), [
    ['st.e3dcSetPowerMode', 2],
    ['st.e3dcSetPowerValueW', 1500],
  ], 'Entladen muss MODE=DISCHARGE und danach VALUE schreiben');

  const charge = await apply(-900, 'eigenverbrauch', { e3dcAllowGridCharge: false });
  assert.deepStrictEqual(charge.dp.writes.slice(-2).map(w => [w.key, w.value]), [
    ['st.e3dcSetPowerMode', 3],
    ['st.e3dcSetPowerValueW', 900],
  ], 'Normales Laden muss MODE=CHARGE schreiben');

  const gridCharge = await apply(-1200, 'tarif_grid_charge', { e3dcAllowGridCharge: true });
  assert.deepStrictEqual(gridCharge.dp.writes.slice(-2).map(w => [w.key, w.value]), [
    ['st.e3dcSetPowerMode', 4],
    ['st.e3dcSetPowerValueW', 1200],
  ], 'Tarif-/Reserve-Netzladen darf bei Haken MODE=GRID_CHARGE nutzen');
  assert.strictEqual(gridCharge.adapter._states.get('speicher.regelung.e3dcRscpGridCharge').val, true, 'GRID_CHARGE muss diagnostiziert werden');

  // Die produktive Speicher-Policy verwendet als Quelle auch die direkten Namen
  // `tarif` und `reserve`. Beide muessen denselben E3/DC-GRID_CHARGE-Pfad nutzen,
  // damit das zentrale Gesamtbudget nicht nur bei alten Aliasnamen greift.
  const tariffDirect = await apply(-800, 'tarif', { e3dcAllowGridCharge: true });
  assert.deepStrictEqual(tariffDirect.dp.writes.slice(-2).map(w => [w.key, w.value]), [
    ['st.e3dcSetPowerMode', 4],
    ['st.e3dcSetPowerValueW', 800],
  ], 'Direkte Quelle tarif muss MODE=GRID_CHARGE nutzen');

  const reserveDirect = await apply(-700, 'reserve', { e3dcAllowGridCharge: true });
  assert.deepStrictEqual(reserveDirect.dp.writes.slice(-2).map(w => [w.key, w.value]), [
    ['st.e3dcSetPowerMode', 4],
    ['st.e3dcSetPowerValueW', 700],
  ], 'Direkte Quelle reserve muss MODE=GRID_CHARGE nutzen');

  const zeroNormal = await apply(0, 'aus', { e3dcZeroMode: 'normal' });
  assert.deepStrictEqual(zeroNormal.dp.writes.slice(-2).map(w => [w.key, w.value]), [
    ['st.e3dcSetPowerMode', 0],
    ['st.e3dcSetPowerValueW', 0],
  ], '0 W Standard muss MODE=NORMAL + VALUE=0 schreiben');

  const zeroIdle = await apply(0, 'aus', { e3dcZeroMode: 'idle' });
  assert.deepStrictEqual(zeroIdle.dp.writes.slice(-2).map(w => [w.key, w.value]), [
    ['st.e3dcSetPowerMode', 1],
    ['st.e3dcSetPowerValueW', 0],
  ], '0 W Expertenmodus muss MODE=IDLE + VALUE=0 schreiben');

  console.log('[storage-e3dc-rscp-profile] OK: E3/DC-RSCP-Mapping, UI-Sichtbarkeit, Diagnose und SET_POWER-Schreibpfad funktionieren.');
})().catch((err) => {
  console.error('[storage-e3dc-rscp-profile] ERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
});
