#!/usr/bin/env node
'use strict';

/**
 * Regression 0.8.118: §14a arbeitet als zentraler Constraint.
 * Fachmodule bleiben alleinige Hardware-Schreiber; Legacy-Direktwrites sind opt-in.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  resolvePara14aSignal,
  buildPara14aConstraintSnapshot,
} = require('../lib/ts-mirrors/ems/para14a/para14a-constraint');
const { computeCentralBudgetGrant } = require('../ems/modules/core-limits');
const { Para14aModule } = require('../ems/modules/para14a');
const { ThermalControlModule } = require('../ems/modules/thermal-control');
const { HeatingRodControlModule } = require('../ems/modules/heating-rod-control');

class FakeDp {
  constructor() {
    this.entries = new Map();
    this.values = new Map();
    this.writes = [];
  }
  async upsert(entry) { this.entries.set(entry.key, { ...entry }); }
  getEntry(key) { return this.entries.get(key) || null; }
  setValue(key, value, ageMs = 0) { this.values.set(key, { value, ts: Date.now() - ageMs }); }
  getRaw(key, fallback = null) { return this.values.has(key) ? this.values.get(key).value : fallback; }
  getAgeMs(key) { return this.values.has(key) ? Math.max(0, Date.now() - this.values.get(key).ts) : null; }
  getNumberFresh(key, maxAgeMs, fallback = null) {
    const age = this.getAgeMs(key);
    const value = this.getRaw(key, fallback);
    const number = Number(value);
    return age !== null && age <= maxAgeMs && Number.isFinite(number) ? number : fallback;
  }
  async writeNumber(key, value) { this.writes.push({ key, value: Number(value) }); return true; }
  async writeBoolean(key, value) { this.writes.push({ key, value: !!value }); return true; }
}

function makeAdapter(installerConfig, rootConfig = {}, options = {}) {
  const states = new Map();
  const adapter = {
    config: { ...rootConfig, installerConfig },
    evcsList: options.evcsList || [
      { key: 'lp1', setCurrentAId: 'wb.1.current', maxPowerW: 11040 },
      { key: 'lp2', setPowerWId: 'wb.2.power', maxPowerW: 11000 },
    ],
    stateCache: {},
    log: { warn() {}, info() {}, debug() {}, error() {} },
    async setObjectNotExistsAsync() {},
    async setStateAsync(id, value) {
      const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val') ? value.val : value;
      states.set(id, { val, ts: Date.now(), ack: true });
    },
    async getStateAsync(id) { return states.get(id) || null; },
    updateValue() {},
    _states: states,
  };
  if (options.storageAuthority) adapter._nwGetStorageControlAuthority = () => options.storageAuthority;
  return adapter;
}

(async () => {
  // Signal safety: stale active signal stays active, stale inactive does not activate.
  const fresh = resolvePara14aSignal({ enabled: true, mapped: true, rawValue: true, ageMs: 100, maxAgeMs: 30000, nowMs: 100000 });
  assert.strictEqual(fresh.active, true);
  assert.strictEqual(fresh.fresh, true);
  const staleHold = resolvePara14aSignal({ enabled: true, mapped: true, rawValue: true, ageMs: 60000, maxAgeMs: 30000, lastFreshActive: true, lastFreshTs: 90000, nowMs: 100000 });
  assert.strictEqual(staleHold.active, true);
  assert.strictEqual(staleHold.reason, 'stale-hold-last-active');
  const staleActiveAfterRestart = resolvePara14aSignal({ enabled: true, mapped: true, rawValue: true, ageMs: 60000, maxAgeMs: 30000, lastFreshActive: null, nowMs: 100000 });
  assert.strictEqual(staleActiveAfterRestart.active, true);
  assert.strictEqual(staleActiveAfterRestart.reason, 'stale-hold-active-value');
  const staleInactive = resolvePara14aSignal({ enabled: true, mapped: true, rawValue: false, ageMs: 60000, maxAgeMs: 30000, lastFreshActive: false, nowMs: 100000 });
  assert.strictEqual(staleInactive.active, false);
  const staleForce = resolvePara14aSignal({ enabled: true, mapped: true, rawValue: false, ageMs: 60000, maxAgeMs: 30000, stalePolicy: 'force-active', nowMs: 100000 });
  assert.strictEqual(staleForce.active, true);

  // Constraint distribution: only configured categories get caps.
  const snapshot = buildPara14aConstraintSnapshot({
    active: true,
    mode: 'direct',
    minPerDeviceW: 4200,
    evcs: [{ safe: 'lp1', maxPowerW: 11040 }, { safe: 'lp2', maxPowerW: 11000 }],
    consumers: [
      { id: 'storage', type: 'storage', controlType: 'limitW', installedPowerW: 10000 },
      { id: 'hp', type: 'heatPump', controlType: 'limitW', installedPowerW: 9000 },
      { id: 'rod', type: 'heatingRod', controlType: 'limitW', installedPowerW: 6000 },
    ],
  });
  assert.strictEqual(snapshot.constraintOnly, true);
  assert.strictEqual(snapshot.evcsTotalCapW, 8400);
  assert(snapshot.appCapsW.storage > 0, 'Speicher-Ladecap fehlt');
  assert(snapshot.appCapsW.thermal > 0, 'Thermik-Cap fehlt');
  assert(snapshot.appCapsW.heatingRod > 0, 'Heizstab-Cap fehlt');
  assert.strictEqual(snapshot.appCapsW.airCondition, null, 'Nicht konfigurierte Kategorie darf kein 0-W-Cap erzeugen');

  // §14a formula hardening regressions.
  const minClamp = buildPara14aConstraintSnapshot({
    active: true,
    mode: 'direct',
    minPerDeviceW: 1000,
    evcs: [{ safe: 'lp1', maxPowerW: 11000 }],
  });
  assert.strictEqual(minClamp.pMinW, 4200, 'Mindestleistung darf nicht unter 4,2 kW fallen');
  assert.strictEqual(minClamp.totalCapW, 4200);

  const externalZeroClamped = buildPara14aConstraintSnapshot({
    active: true,
    mode: 'ems',
    minPerDeviceW: 4200,
    externalTotalSetpointW: 0,
    evcs: [
      { safe: 'lp1', maxPowerW: 11000 },
      { safe: 'lp2', maxPowerW: 11000 },
      { safe: 'lp3', maxPowerW: 11000 },
    ],
  });
  assert.strictEqual(externalZeroClamped.pMinW, 10500, 'Drei SteuVE muessen Pmin,14a mit GZF 0,75 bilden');
  assert.strictEqual(externalZeroClamped.totalCapW, 10500, 'Externer 0-W-Wert darf Pmin,14a nicht unterschreiten');
  assert.strictEqual(externalZeroClamped.forceZero, false, 'Normaler §14a-0-W-Wert ist kein EOS-Safety-Stop');

  const internalSafetyStop = buildPara14aConstraintSnapshot({
    active: true,
    mode: 'ems',
    forceZero: true,
    minPerDeviceW: 4200,
    evcs: [{ safe: 'lp1', maxPowerW: 11000 }],
  });
  assert.strictEqual(internalSafetyStop.totalCapW, 0, 'Separater EOS-Safety-Stop muss weiterhin 0 W erzwingen koennen');
  assert.strictEqual(internalSafetyStop.forceZero, true);

  const externalHeadroom = buildPara14aConstraintSnapshot({
    active: true,
    mode: 'ems',
    minPerDeviceW: 4200,
    externalTotalSetpointW: 8000,
    evcs: [{ safe: 'lp1', maxPowerW: 11000 }],
  });
  assert.strictEqual(externalHeadroom.totalCapW, 8000, 'Externer EMS-Sollwert muss auch oberhalb pMin verteilt werden');
  assert.strictEqual(externalHeadroom.evcsCapsBySafe.lp1, 8000);

  const unknownInstalledPower = buildPara14aConstraintSnapshot({
    active: true,
    mode: 'ems',
    minPerDeviceW: 4200,
    externalTotalSetpointW: 8000,
    consumers: [{ id: 'unknown', type: 'custom', controlType: 'limitW', installedPowerW: 0 }],
  });
  assert.strictEqual(unknownInstalledPower.totalCapW, 4200, 'Unbekannte Anschlussleistung darf kein externes Zusatzbudget aufnehmen');

  const largeStorage = buildPara14aConstraintSnapshot({
    active: true,
    mode: 'direct',
    minPerDeviceW: 4200,
    consumers: [{ id: 'storage22', type: 'storage', controlType: 'limitW', installedPowerW: 22000 }],
  });
  assert.strictEqual(largeStorage.appCapsW.storage, 4200, '40%-Regel gilt nicht pauschal fuer Speicher');

  const largeHeatPump = buildPara14aConstraintSnapshot({
    active: true,
    mode: 'direct',
    minPerDeviceW: 4200,
    consumers: [{ id: 'hp22', type: 'heatPump', controlType: 'limitW', installedPowerW: 22000 }],
  });
  assert.strictEqual(largeHeatPump.appCapsW.thermal, 8800, 'Grosse Waermepumpe muss mit 40% der Anschlussleistung eingehen');

  const independentStorages = buildPara14aConstraintSnapshot({
    active: true,
    mode: 'direct',
    minPerDeviceW: 4200,
    consumers: [
      { id: 's1', type: 'storage', controlType: 'limitW', installedPowerW: 10000 },
      { id: 's2', type: 'storage', controlType: 'limitW', installedPowerW: 10000 },
    ],
  });
  assert.strictEqual(independentStorages.appCapsW.storage, 8400, 'Unabhaengige Speicher muessen als zwei SteuVE zaehlen');

  const groupedStorages = buildPara14aConstraintSnapshot({
    active: true,
    mode: 'direct',
    minPerDeviceW: 4200,
    consumers: [
      { id: 's1', type: 'storage', controlType: 'limitW', installedPowerW: 10000, groupId: 'construct-a' },
      { id: 's2', type: 'storage', controlType: 'limitW', installedPowerW: 10000, groupId: 'construct-a' },
    ],
  });
  assert.strictEqual(groupedStorages.appCapsW.storage, 4200, 'Explizites Speicherkonstrukt muss genau eine SteuVE bilden');

  // Central grants consume app-specific caps; unrelated apps remain uncapped by §14a.
  const runtime = {
    remainingTotalW: 20000,
    remainingPvW: 20000,
    gates: { para14a: { active: true, appCapsW: snapshot.appCapsW } },
  };
  const storageGrant = computeCentralBudgetGrant(runtime, { key: 'storage', app: 'storage', requestedW: 9000, pvOnly: true });
  assert.strictEqual(storageGrant.grantW, snapshot.appCapsW.storage);
  assert.strictEqual(storageGrant.para14aCapApplied, true);
  const heatingGrant = computeCentralBudgetGrant(runtime, { key: 'heatingRod', app: 'heatingRod', requestedW: 9000, pvOnly: true });
  assert.strictEqual(heatingGrant.grantW, snapshot.appCapsW.heatingRod);
  const runtimeWithLocalPv = {
    remainingTotalW: 9200,
    remainingPvW: 5000,
    gates: {
      para14a: {
        active: true,
        appCapsW: { evcs: 4200 },
        localPvGrantW: 5000,
      },
      pvAllocation: { evcsCapW: 5000, mode: 'evcs', evcsSharePct: 100 },
    },
  };
  const boostWithPv = computeCentralBudgetGrant(runtimeWithLocalPv, { key: 'evcs', app: 'evcs', requestedW: 11000, pvOnly: false });
  assert.strictEqual(boostWithPv.grantW, 9200, '§14a-Netzanteil plus lokaler PV-Anteil muss fuer Boost/Auto nutzbar sein');
  const purePvGrant = computeCentralBudgetGrant(runtimeWithLocalPv, { key: 'evcs', app: 'evcs', requestedW: 9000, pvOnly: true });
  assert.strictEqual(purePvGrant.grantW, 5000, 'Reines PV-Laden darf vom §14a-Netzcap nicht auf 4,2 kW geklemmt werden');

  const unrelatedGrant = computeCentralBudgetGrant(runtime, { key: 'generator', app: 'generator', requestedW: 9000, pvOnly: false });
  assert.strictEqual(unrelatedGrant.grantW, 9000);
  assert.strictEqual(unrelatedGrant.para14aCapApplied, false);

  // Runtime module publishes constraints and does not write hardware by default.
  const installerConfig = {
    para14a: true,
    para14aMode: 'direct',
    para14aMinPerDeviceW: 4200,
    para14aActiveId: 'grid.operator.active',
    para14aSignalMaxAgeSec: 30,
    para14aStalePolicy: 'hold-active',
    para14aLegacyDirectWritesEnabled: false,
    para14aConsumers: [
      { enabled: true, name: 'Speicher', type: 'storage', controlType: 'limitW', maxPowerW: 10000 },
      { enabled: true, name: 'Wärmepumpe', type: 'heatPump', controlType: 'limitW', maxPowerW: 9000, setPowerWId: 'hp.limit' },
    ],
  };
  const dp = new FakeDp();
  const adapter = makeAdapter(installerConfig);
  const module = new Para14aModule(adapter, dp);
  await module.init();
  dp.setValue('p14a.active', true, 100);
  await module.tick();
  assert.strictEqual(adapter._para14a.active, true);
  assert.strictEqual(adapter._para14a.constraintOnly, true);
  assert.strictEqual(adapter._para14a.signalFresh, true);
  assert.strictEqual(dp.writes.length, 0, 'Constraint-only §14a darf keine Verbraucher-DPs schreiben');
  assert.strictEqual(adapter._states.get('para14a.consumers.w_rmepumpe.status').val, 'constraint-only');

  // Runtime parser accepts the UI field maxPowerW and ignores migration auto rows.
  const parserAdapter = makeAdapter({
    para14a: true,
    para14aConsumers: [
      { enabled: true, name: 'WP 22 kW', type: 'heatPump', controlType: 'limitW', maxPowerW: 22000 },
      { enabled: true, automatic: true, name: 'Alte Auto-Zeile', type: 'storage', controlType: 'limitW', maxPowerW: 10000 },
    ],
  }, {}, { evcsList: [] });
  const parserModule = new Para14aModule(parserAdapter, new FakeDp());
  parserModule._buildLoadsFromConfig();
  assert.strictEqual(parserModule._loads.length, 1);
  assert.strictEqual(parserModule._loads[0].installedPowerW, 22000);

  // Fachmodule are auto-linked exactly once; single storage needs a real writable actuator.
  const autoRoot = {
    enableThermalControl: true,
    thermal: {
      devices: [{ enabled: true, slot: 1, maxPowerW: 9000, switchWriteId: 'hp.switch' }],
    },
    enableHeatingRodControl: true,
    heatingRod: {
      devices: [{ enabled: true, slot: 2, maxPowerW: 6000, stages: [{ writeId: 'rod.stage1', powerW: 2000 }] }],
    },
    enableStorageControl: true,
    storage: {
      allowGridCharge: true,
      maxChargeW: 5000,
      datapoints: { targetPowerObjectId: 'storage.target' },
    },
    vis: {
      flowSlots: {
        consumers: [
          { consumerType: 'heatPump', ctrl: { switchWriteId: 'hp.switch' } },
          { consumerType: 'heatingRod', ctrl: { stage1WriteId: 'rod.stage1' } },
        ],
      },
    },
  };
  const autoAdapter = makeAdapter({ para14a: true }, autoRoot, {
    evcsList: [],
    storageAuthority: { selectedTopology: 'single', writerActive: true },
  });
  const autoModule = new Para14aModule(autoAdapter, new FakeDp());
  const automatic = autoModule._getAutomaticConsumers();
  assert(automatic.some((row) => row.id === 'auto-thermal-c1' && row.type === 'heatPump'));
  assert(automatic.some((row) => row.id === 'auto-heating-rod-c2' && row.type === 'heatingRod'));
  assert(automatic.some((row) => row.id === 'auto-storage-single' && row.type === 'storage'));

  autoAdapter.config.storage.allowGridCharge = false;
  assert(!autoModule._getAutomaticConsumers().some((row) => row.id === 'auto-storage-single'), 'Netzladen AUS muss Speicher aus §14a-Automatik entfernen');
  autoAdapter.config.storage.allowGridCharge = true;
  autoAdapter.config.storage.datapoints = {};
  assert(!autoModule._getAutomaticConsumers().some((row) => row.id === 'auto-storage-single'), 'Speicher ohne schreibbaren Aktor darf keine Phantom-SteuVE sein');

  const farmRows = [
    { enabled: true, key: 's1', maxChargeW: 5000, setSignedPowerId: 'farm.s1.target' },
    { enabled: true, key: 's2', maxChargeW: 5000, setSignedPowerId: 'farm.s2.target' },
  ];
  const farmAdapter = makeAdapter({ para14a: true }, {
    storageFarm: { allowGridCharge: true, storages: farmRows },
  }, {
    evcsList: [],
    storageAuthority: { selectedTopology: 'farm', writerActive: true, farm: { rows: farmRows } },
  });
  const farmModule = new Para14aModule(farmAdapter, new FakeDp());
  const farmAutomatic = farmModule._getAutomaticConsumers().filter((row) => row.type === 'storage');
  assert.strictEqual(farmAutomatic.length, 2);
  assert(farmAutomatic.every((row) => row.groupId === ''), 'Farm allein darf unabhaengige Speicher nicht gruppieren');

  // End-to-end automatic EVCS link is sourced directly from adapter.evcsList.
  const autoTickAdapter = makeAdapter({
    para14a: true,
    para14aMode: 'direct',
    para14aMinPerDeviceW: 4200,
    para14aActiveId: 'grid.operator.active',
    para14aSignalMaxAgeSec: 30,
  }, {}, {
    evcsList: [{ key: 'lp-auto', setCurrentAId: 'wb.auto.current', maxPowerW: 11000 }],
  });
  const autoTickDp = new FakeDp();
  const autoTickModule = new Para14aModule(autoTickAdapter, autoTickDp);
  await autoTickModule.init();
  autoTickDp.setValue('p14a.active', true, 10);
  await autoTickModule.tick();
  assert.strictEqual(autoTickAdapter._para14a.evcsCapsBySafe.lp_auto, 4200, 'Zugeordneter Ladepunkt muss ohne zweite §14a-Zuordnung teilnehmen');

  // Upgrade safety: unmarked quick-setup rows from <=0.8.154 must not double-count
  // or compete with the now automatically linked specialist module.
  const legacyAutoRoot = {
    enableThermalControl: true,
    thermal: {
      devices: [{ enabled: true, slot: 1, maxPowerW: 9000, setpointWriteId: 'hp.legacy.limit' }],
    },
    vis: {
      flowSlots: {
        consumers: [{ consumerType: 'heatPump', ctrl: { setpointWriteId: 'hp.legacy.limit' } }],
      },
    },
  };
  const legacyAutoAdapter = makeAdapter({
    para14a: true,
    para14aMode: 'direct',
    para14aActiveId: 'grid.operator.active',
    para14aConsumers: [{
      enabled: true,
      name: 'WP aus altem Schnellsetup',
      type: 'heatPump',
      controlType: 'limitW',
      maxPowerW: 9000,
      setPowerWId: 'hp.legacy.limit',
    }],
  }, legacyAutoRoot, { evcsList: [] });
  const legacyAutoDp = new FakeDp();
  const legacyAutoModule = new Para14aModule(legacyAutoAdapter, legacyAutoDp);
  await legacyAutoModule.init();
  legacyAutoDp.setValue('p14a.active', true, 10);
  await legacyAutoModule.tick();
  assert.strictEqual(legacyAutoAdapter._para14a.automaticConsumerCount, 1);
  assert.strictEqual(legacyAutoAdapter._para14a.manualConsumerCount, 0, 'Alt-Schnellsetup-Zeile darf Fachmodul nicht doppelt zaehlen');
  assert.strictEqual(legacyAutoAdapter._para14a.nSteuVE, 1);

  // Manual/extern held thermal requests survive the limited readback and are restored on release.
  const thermalModule = new ThermalControlModule(makeAdapter({}, {}, { evcsList: [] }), {});
  const thermalDevice = { id: 'hp-held', name: 'HP held', type: 'power', maxPowerW: 9000, setWKey: 'hp.target', enableKey: '' };
  let thermalReadback = { targetW: 9000, enable: true };
  const thermalCalls = [];
  thermalModule._readThermalReadback = async () => ({ ...thermalReadback });
  thermalModule._applyThermalCommand = async (_d, _actType, _consumer, target, _reason, options) => {
    thermalCalls.push({ target: { ...target }, options: { ...options } });
    thermalReadback = { targetW: Number(target.targetW) || 0, enable: Number(target.targetW) > 0 };
    return { applied: true, accepted: true, writeAccepted: true, confirmed: true, status: 'test-applied' };
  };
  thermalModule._recordAcceptedThermalEffect = () => {};
  const thermalGuard1 = await thermalModule._enforcePara14aThermalGuard(thermalDevice, 'power', null, 4200, 'test');
  assert.strictEqual(thermalGuard1.targetLoadW, 4200);
  const thermalGuard2 = await thermalModule._enforcePara14aThermalGuard(thermalDevice, 'power', null, 4200, 'test');
  assert.strictEqual(thermalGuard2.targetLoadW, 4200, 'Begrenzter Readback darf Originalwunsch nicht ueberschreiben');
  const thermalRestore = await thermalModule._restorePara14aHeldThermalRequest(thermalDevice, 'power', null, 'test');
  assert.strictEqual(thermalRestore.requestedLoadW, 9000);
  assert.strictEqual(thermalCalls.at(-1).target.targetW, 9000);
  assert.strictEqual(thermalCalls.at(-1).options.releaseAuthority, true);
  assert.strictEqual(thermalModule._para14aHeldRequests.size, 0);

  // Same restore behavior for externally/manual held heating-rod stages.
  const rodModule = new HeatingRodControlModule(makeAdapter({}, {}, { evcsList: [] }), {});
  const rodDevice = {
    id: 'rod-held',
    wiredStages: 3,
    stageCount: 3,
    maxPowerW: 6000,
    stages: [{ powerW: 2000 }, { powerW: 2000 }, { powerW: 2000 }],
  };
  const rodCalls = [];
  rodModule._applyStageState = async (_d, targetStage, _feedback, options) => {
    rodCalls.push({ targetStage, options: { ...options } });
    return { applied: true, accepted: true, writeAccepted: true, status: 'test-applied', targetStage };
  };
  rodModule._recordAcceptedHeatingEffect = () => {};
  const rodFeedback = { anyKnown: true, currentStage: 3, appliedPowerW: 6000, states: [true, true, true] };
  const rodGuard1 = await rodModule._enforcePara14aObservedStage(rodDevice, 3, null, rodFeedback, 2200, 'test');
  assert.strictEqual(rodGuard1.targetStage, 1);
  const rodGuard2 = await rodModule._enforcePara14aObservedStage(rodDevice, 1, null, { ...rodFeedback, currentStage: 1, appliedPowerW: 2000 }, 2200, 'test');
  assert.strictEqual(rodGuard2.requestedStage, 3, 'Begrenzte Heizstab-Stufe darf Originalwunsch nicht verlieren');
  const rodRestore = await rodModule._restorePara14aHeldStage(rodDevice, { ...rodFeedback, currentStage: 1, appliedPowerW: 2000 }, 1, null, 'test');
  assert.strictEqual(rodRestore.targetStage, 3);
  assert.strictEqual(rodCalls.at(-1).targetStage, 3);
  assert.strictEqual(rodCalls.at(-1).options.releaseAuthority, true);
  assert.strictEqual(rodModule._para14aHeldStages.size, 0);

  // Static guards: thermal/heating-rod no longer pause wholesale on §14a.
  const thermal = fs.readFileSync(path.resolve(__dirname, '../src-ts/runtime-executables/ems/modules/thermal-control.ts'), 'utf8');
  const rod = fs.readFileSync(path.resolve(__dirname, '../src-ts/runtime-executables/ems/modules/heating-rod-control.ts'), 'utf8');
  const storage = fs.readFileSync(path.resolve(__dirname, '../src-ts/runtime-executables/ems/modules/storage-control.ts'), 'utf8');
  const frontend = fs.readFileSync(path.resolve(__dirname, '../src-ts/runtime-executables/www/ems-apps.ts'), 'utf8');
  const html = fs.readFileSync(path.resolve(__dirname, '../www/ems-apps.html'), 'utf8');
  assert(!thermal.includes("paused_by_14a"), 'Thermik darf bei §14a nicht komplett pausieren');
  assert(!rod.includes("paused_by_14a"), 'Heizstab darf bei §14a nicht komplett pausieren');
  assert(thermal.includes('_enforcePara14aThermalGuard'));
  assert(thermal.includes('_restorePara14aHeldThermalRequest'));
  assert(thermal.includes('para14a_limited_boost'));
  assert(rod.includes('_enforcePara14aObservedStage'));
  assert(rod.includes('_restorePara14aHeldStage'));
  assert(rod.includes('_maxStageForPara14aBudget'));
  assert(storage.includes('gridChargeBlockedByConfig'));
  assert(storage.includes('Netzladen deaktiviert'));
  assert(html.includes('id="storageAllowGridCharge"'));
  assert(html.includes('id="storageFarmAllowGridCharge"'));
  assert(html.includes('id="para14aMinPerDeviceW"') && html.includes('min="4200"'));
  assert(frontend.includes('patch.storage.allowGridCharge !== false'));
  assert(frontend.includes('patch.storageFarm.allowGridCharge !== false'));

  console.log('[para14a-central-constraint] OK: §14a ist ein frischer zentraler Constraint; Fachmodule bleiben Hardware-Schreiber.');
})().catch((error) => {
  console.error('[para14a-central-constraint] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
