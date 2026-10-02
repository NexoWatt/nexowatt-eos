#!/usr/bin/env node
'use strict';

/**
 * Prüft Tarif-Netzbezug im echten Heizstab-Tick einschließlich Stufen-Writer.
 * Die kanonische TS-Quelle wird mit Module geladen, ohne Laufzeitartefakte zu
 * erzeugen. Nur Messwerte, Adapter-I/O und der zentrale Budgetvertrag werden
 * im Speicher bereitgestellt; Schutz-, Eigentums- und Stufenlogik bleiben echt.
 * Ausgangslage: EMS-eigene 2-kW-Stufe, 0 W PV und 2 kW Netzbezug. Nur ein
 * frischer, ausreichender Gesamt-Grant im aktiven 0-Einspeise-Tarifbetrieb darf
 * den lokalen PV-Netzbezugsschutz umgehen. Andere Grenzen bleiben wirksam.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const root = path.resolve(__dirname, '..');

function loadCanonical(relativePath) {
  const runtimePath = path.join(root, relativePath.replace(/\.ts$/, '.js'));
  const loaded = new Module(runtimePath, module);
  loaded.filename = runtimePath;
  loaded.paths = Module._nodeModulePaths(path.dirname(runtimePath));
  const normalRequire = Module.createRequire(runtimePath);
  loaded.require = name => name === '../services/zero-export-pv-coordinator'
    ? coordinator : normalRequire(name);
  loaded._compile(fs.readFileSync(path.join(root, 'src-ts/runtime-executables', relativePath), 'utf8'), runtimePath);
  return loaded.exports;
}

const coordinator = loadCanonical('ems/services/zero-export-pv-coordinator.ts');
const { HeatingRodControlModule } = loadCanonical('ems/modules/heating-rod-control.ts');

/**
 * Erzeugt genau einen vorhandenen Heizstab ohne reale Adapterverbindung.
 * Zeit und Messalter sind deterministisch; Writer aktualisieren Readback und
 * Istleistung wie ein sofort antwortendes Relais. Grants sind vor dem Heizstab
 * bereits um vorgelagerte Verbraucher bereinigt, wie im zentralen Vertrag.
 */
function fixture() {
  const writes = [];
  const states = new Map();
  const reservations = [];
  const records = {
    'grid.powerW': { val: 2000, ts: Date.now(), objectId: 'fixture.grid' },
    pvPower: { val: 0, ts: Date.now(), objectId: 'fixture.pv' },
    'rod.power': { val: 2000, ts: Date.now(), objectId: 'fixture.rod.power' },
    'rod.stage1': { val: true, ts: Date.now(), objectId: 'fixture.rod.stage1' },
    batteryPower: { val: 0, ts: Date.now(), objectId: 'fixture.battery' },
    storageSoc: { val: 100, ts: Date.now(), objectId: 'fixture.soc' },
  };
  const snapshot = {
    ts: Date.now(), remainingTotalW: 2000, remainingPvW: 0,
    gates: { grid: { measurementUsable: true }, tariff: { gridImportPreferred: true } },
  };
  const budget = {
    peek: () => snapshot,
    getTotalGrant: () => ({ grantW: snapshot.remainingTotalW }),
    getPvGrant: () => ({ grantW: snapshot.remainingPvW }),
    reserve: request => reservations.push({ ...request }),
  };
  const writeRelay = (key, value) => {
    assert.equal(key, 'rod.stage1', 'Fixture darf ausschließlich den Heizstab schreiben');
    writes.push({ key, value });
    records[key].val = !!value;
    records[key].ts = Date.now();
    records['rod.power'].val = value ? 2000 : 0;
    records['rod.power'].ts = Date.now();
    return true;
  };
  const dp = {
    getEntry: key => records[key] || null,
    getMeasurementAgeMs: key => records[key] ? Date.now() - records[key].ts : null,
    getAgeMs: key => records[key] ? Date.now() - records[key].ts : null,
    isStale: (key, maxAge) => !records[key] || Date.now() - records[key].ts > maxAge,
    getNumber: (key, fallback = null) => records[key] && typeof records[key].val === 'number'
      && Number.isFinite(records[key].val) ? records[key].val : fallback,
    getNumberFresh(key, maxAge, fallback = null) {
      return this.isStale(key, maxAge) ? fallback : this.getNumber(key, fallback);
    },
    getBoolean: (key, fallback = null) => records[key] ? !!records[key].val : fallback,
    getRaw: (key, fallback = null) => records[key] ? records[key].val : fallback,
    writeBoolean: async (key, value) => writeRelay(key, value),
    lastWriteByObjectId: new Map(),
  };
  const adapter = {
    namespace: 'nexowatt-ui.0', stateCache: {}, _emsBudget: budget,
    config: {
      enableHeatingRodControl: true, enableStorageControl: true,
      gridConstraints: { zeroExportEnabled: true, exportLimitMaxFeedInW: 0 },
      heatingRod: { autoMode: 'pvSurplus', blockPvAutoAtNight: false,
        storageReserveW: 0, minPvPowerW: 0, staleTimeoutSec: 15 },
    },
    log: { warn() {}, info() {}, debug() {}, error() {} },
    async setStateAsync(id, val) { states.set(id, { val, ts: Date.now() }); },
    async getStateAsync(id) { return states.get(id) || null; },
    async setForeignStateAsync(id, val) {
      assert.equal(id, 'fixture.rod.stage1');
      return writeRelay('rod.stage1', val);
    },
  };
  const device = {
    id: 'rod1', name: 'Fixture rod', slot: 1, enabled: true, consumerType: 'heatingRod',
    mode: 'pvAuto', stageCount: 1, wiredStages: 1, maxPowerW: 2000,
    minOnSec: 600, minOffSec: 0, requireReadback: true, pWKey: 'rod.power',
    stages: [{ index: 1, powerW: 2000, onAboveW: 2000, offBelowW: 1800,
      writeKey: 'rod.stage1', readKey: 'rod.stage1' }],
  };
  const controller = new HeatingRodControlModule(adapter, dp);
  controller._devices = [device];
  controller._setStageCtlTarget(device.id, 1, 1);
  controller._markAutoOwnership(device, true, 1, 'pvAuto');
  const refresh = () => {
    snapshot.ts = Date.now();
    for (const rec of Object.values(records)) rec.ts = Date.now();
    coordinator.updateZeroExportProbe(adapter, {
      now: Date.now(), gridW: records['grid.powerW'].val, gridFresh: true,
      pvW: 0, pvFresh: true, storageFresh: true,
      storageDischargeW: Math.max(0, records.batteryPower.val), safetyReady: true,
    });
  };
  const state = suffix => states.get(`heatingRod.devices.rod1.${suffix}`)?.val;
  return { adapter, controller, device, snapshot, budget, records, writes, states, reservations, refresh, state };
}

/** Setzt eine echte, freigegebene Strategieanforderung; explizite 0 W ist AUS. */
function setStrategyCap(f, powerW) {
  f.adapter.config.operatingStrategies = { resourceLinks: [{ sourceId: 'heatingRod:1',
    enabled: true, controlMode: 'active', commissioningConfirmed: true, writeEnabled: true }] };
  f.adapter._nwOperatingStrategyRuntime = { activeControl: true, requestsByResource: {
    'heatingRod:1': { selected: true, controlEligible: true, issuedAt: Date.now(),
      expiresAt: Date.now() + 60000, action: 'standard', requestedPowerW: powerW },
  } };
}

async function assertStopped(name, configure) {
  const f = fixture();
  f.refresh();
  configure(f);
  await f.controller.tick();
  assert.equal(f.state('targetStage'), 0, `${name}: Stufenziel muss AUS sein`);
  assert.equal(f.records['rod.stage1'].val, false, `${name}: echter Writer muss AUS schreiben`);
  assert(f.writes.some(write => write.value === false), `${name}: AUS-Schreibauftrag fehlt`);
  assert.equal(f.writes.some(write => write.value === true), false, `${name}: kein EIN-Schreibauftrag`);
}

async function main() {
  const allowed = fixture();
  for (let tick = 0; tick < 5; tick++) {
    fixtureNow += 30000;
    allowed.refresh();
    await allowed.controller.tick();
    assert.equal(allowed.state('targetStage'), 1, `Tarif-Netzbezug: Tick ${tick + 1} darf 2 kW halten`);
    assert.equal(allowed.records['rod.stage1'].val, true, 'Tarif-Netzbezug muss das reale Relais halten');
    assert.equal(allowed.records.pvPower.val, 0, 'Die Freigabe darf keine PV-Erzeugung erfordern');
    assert.equal(allowed.writes.some(write => write.value === false), false, 'Kein kurzer AUS-Puls zwischen Ticks');
    assert.equal(allowed.reservations.at(-1).pvOnly, false, 'Tariflast gehört in das Gesamtbudget');
  }

  const cappedStrategy = fixture();
  cappedStrategy.refresh();
  setStrategyCap(cappedStrategy, 2000);
  await cappedStrategy.controller.tick();
  assert.equal(cappedStrategy.state('targetStage'), 1, 'Explizites 2-kW-Strategie-Cap lässt die gedeckte Stufe zu');
  assert.equal(cappedStrategy.records['rod.stage1'].val, true);
  await assertStopped('Explizites 0-W-Strategie-Cap', f => { setStrategyCap(f, 0); });
  await assertStopped('Gesamt-Grant unter vorhandener Stufenleistung', f => { f.snapshot.remainingTotalW = 1999; });
  await assertStopped('Gesamt-Grant entzogen', f => { f.snapshot.remainingTotalW = 0; });
  await assertStopped('Reiner PV-Betrieb', f => { f.snapshot.gates.tariff.gridImportPreferred = false; });
  await assertStopped('0-Einspeisung deaktiviert', f => { f.adapter.config.gridConstraints.zeroExportEnabled = false; });
  await assertStopped('0-Einspeisung nur Diagnose', f => { f.adapter.config.gridConstraints.exportLimitRunMode = 'diagnostic'; });
  await assertStopped('Gesamt-Grant älter als 5 Sekunden', f => { f.snapshot.ts -= 5001; });
  await assertStopped('Gesamt-Grant aus der Zukunft', f => { f.snapshot.ts += 1; });
  await assertStopped('Kein direkter Gesamt-Grant', f => { delete f.budget.getTotalGrant; });
  await assertStopped('Unendlicher direkter Gesamt-Grant', f => { f.budget.getTotalGrant = () => ({ grantW: Infinity }); });
  await assertStopped('NVP zentral nicht nutzbar', f => { f.snapshot.gates.grid.measurementUsable = false; });
  await assertStopped('Harte Batterieentladung', f => { f.records.batteryPower.val = 2500; });
  console.log('[heating-rod-zero-export-tariff] OK: 5 echte Tarif-Ticks ohne PV/Strategie; explizite Strategiegrenzen, Gesamtgrenzen, PV-only, Aus/Diagnose, Grant-Frische, NVP und Batterie bleiben geschützt.');
}

// Deterministische Zeit: Grenzfälle dürfen nicht von Ausführungsdauer abhängen.
const realNow = Date.now;
let fixtureNow = 1789462800000;
Date.now = () => fixtureNow;
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { Date.now = realNow; });
