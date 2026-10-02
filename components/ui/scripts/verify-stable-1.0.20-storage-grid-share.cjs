#!/usr/bin/env node
'use strict';
/**
 * NexoWatt Regression 1.0.20 (DE)
 * Aufgabe: Prüft Nulleinspeisung mit erlaubtem Netzbezug und getrennt
 * nachgewiesener Speicher-Mitnutzung bis zum produktiven Ladepunkt-Writer.
 * Daten und Wirkung: Synthetische, bilanzierbare Messwerte in W/%, Zeit in ms;
 * keine Hardware. Die RC60-Fixture liefert ioBroker-Zustände, keine Regellogik.
 * Bei Änderungen: Netz/PV/Speicher getrennt halten, geschützte LP, SoC-Reserve,
 * fehlende Messung und Widerruf zwischen Allokation und Schreiben mitprüfen.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ze = require('../ems/services/zero-export-pv-coordinator');
const root = path.resolve(__dirname, '..');
const fixtureFile = path.join(root, 'scripts/verify-rc60-universal-auto-wallbox.js');
const fixtureSource = fs.readFileSync(fixtureFile, 'utf8');
const fixtureModule = new Module(fixtureFile, module);
fixtureModule.filename = fixtureFile;
fixtureModule.paths = Module._nodeModulePaths(path.dirname(fixtureFile));
fixtureModule._compile(fixtureSource.slice(0, fixtureSource.indexOf('async function withHarness'))
  + '\nmodule.exports = { makeHarness };', fixtureFile);
const storageFixtureFile = path.join(root, 'scripts/verify-stable-1.0.5-storage-protection-telemetry.cjs');
const storageFixtureSource = fs.readFileSync(storageFixtureFile, 'utf8');
const storageFixtureModule = new Module(storageFixtureFile, module);
storageFixtureModule.filename = storageFixtureFile;
storageFixtureModule.paths = Module._nodeModulePaths(path.dirname(storageFixtureFile));
const storageFixtureBody = storageFixtureSource.slice(storageFixtureSource.indexOf('class FakeDp'),
  storageFixtureSource.indexOf('async function main()'));
const storageStart = 'const mod = new SpeicherRegelungModule(adapter, dp);';
assert(storageFixtureBody.includes(storageStart), 'Storage-Fixture-Vertrag wurde verändert');
storageFixtureModule._compile("const { SpeicherRegelungModule } = require('../ems/modules/storage-control');\n"
  + storageFixtureBody.replace(storageStart,
    'adapter.config.gridConstraints = { zeroExportEnabled: true };\n'
    + 'adapter.config.enableGridConstraints = true;\n' + storageStart)
  + '\nmodule.exports = { storageTick };', storageFixtureFile);
const base = 'chargingManagement.wallboxes.lp1.';
let clock = Date.UTC(2026, 8, 24, 15);
let scenarios = 0;

/**
 * Stellt eine bereits laufende Anlage mit konsistenten Istwerten bereit.
 * Der Speicher wird niemals aus Sollwert oder SoC als tatsächlich liefernd
 * angenommen: Messung, akzeptierter Befehl und Freigaben sind unabhängig.
 * Die Istleistung bleibt pro Szenario eine vorgegebene Momentaufnahme; dies
 * ist kein Modell eines Reglers oder Nachweis für einen Batterie-Kaltstart.
 */
function harness(options = {}) {
  const h = fixtureModule.exports.makeHarness({
    userMode: 'boost', actualPowerW: 6000, status: 'Charging', totalBudgetW: 22000,
    ...options,
    wallbox: { chargerType: 'DC', controlBasis: 'powerW', phases: 1,
      phaseMode: 'fixed-1p', minA: 0, maxA: 0, minPowerW: 1000, maxPowerW: 22000,
      stepW: 1, maxDeltaWPerTick: 100000, setCurrentAId: '', setPowerWId: 'test.dc.setW',
      boostMaxPowerW: 3700, storageAssistCustomerAllowed: true, ...options.wallbox },
  });
  // Der finale Schutz liest wie auf dem Adapter direkt den Ereignis-Cache.
  // Die Fixture bildet State-Schreiben deshalb zugleich in der DB und im Cache ab.
  h.adapter.stateCache = {};
  const setLocal = h.setLocal;
  h.setLocal = (id, value, ts = clock) => {
    setLocal(id, value, ts);
    h.adapter.stateCache[id] = { value, ts };
  };
  for (const [id, value] of h.localStates) h.adapter.stateCache[id] = { value, ts: clock };
  h.module._queueState = async (id, value) => h.setLocal(id, value, clock);
  const cfg = h.adapter.config;
  cfg.gridConstraints = { zeroExportEnabled: options.zero !== false };
  cfg.enableStorageControl = true;
  cfg.enableStorageFarm = true;
  cfg.enableMultiUse = true;
  Object.assign(cfg.chargingManagement, { storageAssistEnabled: true,
    storageAssistApply: 'boostAndAuto', storageAssistStartSocPct: 60,
    storageAssistStopSocPct: 40, storageAssistMaxDischargeW: 5000 });
  h.setLocal(`${base}userStorageAssistEnabled`, options.assist !== false);
  h.setLocal('tarif.currentPriceFresh', true);
  h.setLocal('tarif.dynamicTariffStale', false);
  h.setLocal('tarif.aktiv', !!options.tariffState);
  delete h.module._publishChargingAllocationTsShadow;
  delete h.module._publishChargingPhaseSelectionRuntimeStates;
  delete h.module._publishChargingStationDiagnosticsFromAllocationPlan;
  const plant = { actualW: 6000, gridW: 3100, batteryW: 3000, pvW: 0,
    acceptedW: 3000, acceptedAgeMs: 0, acceptedTopology: 'farm', source: 'evcs',
    effective: true, soc: 80, storageFresh: true, storageAgeMs: 0,
    gridFresh: true, safetyReady: true, dischargeAllowed: true, ...options.plant };
  const getBoolean = h.dp.getBoolean.bind(h.dp);
  h.dp.entries.set('cm.dischargeAllowed', { key: 'cm.dischargeAllowed', objectId: 'test.tariff.dischargeAllowed' });
  h.dp.getBoolean = (key, fallback = false) => key === 'cm.dischargeAllowed'
    ? plant.dischargeAllowed : getBoolean(key, fallback);
  h.adapter._nwGetStorageControlAuthority = () => ({ selectedTopology: 'farm', writerActive: true });
  h.adapter._nwResolveBatteryFlowFromCache = () => ({
    src: 'storageFarmNet', derived: false, signedW: plant.batteryW,
    chargeW: Math.max(0, -plant.batteryW), dischargeW: Math.max(0, plant.batteryW),
    grossChargeW: Math.max(0, -plant.batteryW), grossDischargeW: Math.max(0, plant.batteryW),
    staleMs: { farmPower: plant.storageAgeMs, farmCharge: plant.storageAgeMs,
      farmDischarge: plant.storageAgeMs },
  });
  const points = [{ row: h.wallbox, actual: () => plant.actualW }];

  // Der zweite Ladepunkt verwendet dieselben produktiven Mapping-/Writer-Wege.
  // Seine Istlast wird der Hausbilanz zugerechnet und erhält keine Assist-Freigabe.
  if (options.protectedPoint) {
    const row = { ...h.wallbox, key: 'lp2', evcsIndex: 2, name: 'Geschützter LP',
      actualPowerWId: 'test.protected.powerW', statusId: 'test.protected.status',
      vehicleConnectedId: 'test.protected.connected', onlineId: 'test.protected.online',
      heartbeatId: 'test.protected.lastSeenMs', setPowerWId: 'test.protected.setW',
      enableId: 'test.protected.enable' };
    cfg.chargingManagement.wallboxes.push(row);
    cfg.settingsConfig.evcsCount = 2;
    h.setLocal('chargingManagement.wallboxes.lp2.userMode', 'boost');
    h.setLocal('chargingManagement.wallboxes.lp2.userEnabled', true);
    h.setLocal('chargingManagement.wallboxes.lp2.userStationEnabled', true);
    h.setLocal('chargingManagement.wallboxes.lp2.userStorageAssistEnabled', false);
    h.setObject(row.statusId, 'Charging');
    h.setObject(row.vehicleConnectedId, true);
    h.setObject(row.onlineId, true);
    h.setObject(row.heartbeatId, clock);
    h.setObject(row.setPowerWId, 0);
    h.setObject(row.enableId, true);
    points.push({ row, actual: () => options.protectedPoint.actualW });
    const getObject = h.adapter.getForeignObjectAsync.bind(h.adapter);
    h.adapter.getForeignObjectAsync = async id => [row.setPowerWId, row.enableId].includes(id)
      ? { type: 'state', common: { read: false, write: true }, native: {} } : getObject(id);
  }

  const tick = async (patch = {}) => {
    Object.assign(plant, patch);
    clock += 1000;
    const nvp = h.adapter._nvpFreshnessSnapshot;
    Object.assign(nvp, { ts: clock, netW: plant.gridW, usable: plant.gridFresh, fresh: plant.gridFresh });
    const budget = h.adapter._emsBudget;
    budget.ts = clock;
    budget.gates.pv = { effectiveW: plant.pvW, rawW: plant.pvW };
    budget.gates.pvAllocation = { totalW: plant.pvW, evcsCapW: plant.pvW, mode: 'evcs', evcsSharePct: 100 };
    budget.remainingPvW = plant.pvW;
    for (const point of points) {
      const measurementAgeMs = point.row.key === 'lp2' ? options.protectedPoint?.ageMs || 0 : 0;
      h.setObject(point.row.actualPowerWId, point.actual(), clock - measurementAgeMs);
      h.setObject(point.row.heartbeatId, clock, clock);
    }
    for (const [id, value] of Object.entries({
      'speicher.regelung.topologie': 'farm', 'storageFarm.totalSocOnline': plant.soc,
      'storageFarm.availableDischargePowerW': 5000,
      'speicher.regelung.evcsAssistAcceptedW': plant.acceptedW,
      'speicher.regelung.evcsAssistAcceptedTs': clock - plant.acceptedAgeMs,
      'speicher.regelung.evcsAssistAcceptedTopology': plant.acceptedTopology,
      'speicher.regelung.evcsAssistAcceptedSource': plant.source,
      'speicher.regelung.commandEffective': plant.effective,
    })) h.setLocal(id, value, clock);
    ze.updateZeroExportProbe(h.adapter, { now: clock, gridFresh: plant.gridFresh, gridW: plant.gridW,
      pvFresh: true, pvW: plant.pvW, storageFresh: plant.storageFresh,
      storageDischargeW: Math.max(0, plant.batteryW), storageNetDischargeW: Math.max(0, plant.batteryW),
      safetyReady: plant.safetyReady, externalBlocked: false, tariffCurtail: false });
    return h.tick();
  };
  const settle = async (patch = {}, count = 55) => {
    let out;
    for (let i = 0; i < count; i++) out = await tick(patch);
    return out;
  };
  return { h, plant, tick, settle };
}

async function check(options, fn) {
  const f = harness(options);
  try { await fn(f); scenarios++; } finally { f.h.stop(); }
}

async function main() {
  const originalNow = Date.now;
  Date.now = () => clock;
  try {
    // Kein PV-Ertrag ist kein generelles Bezugsverbot. Auto hält sein Minimum,
    // Boost nutzt nur die konfigurierte Netzgrenze, solange keine andere Quelle da ist.
    for (const userMode of ['boost', 'auto', 'minpv']) {
      await check({ userMode, plant: { actualW: 3700, gridW: 3800, batteryW: 0, acceptedW: 0 } }, async ({ settle }) => {
        const out = await settle();
        assert(out.targetPowerW >= 1000, `${userMode}: erlaubter Netzbezug muss ohne PV laufen`);
        assert(out.targetPowerW <= (userMode === 'boost' ? 3700 : 1000), JSON.stringify(out));
      });
    }

    await check({}, async ({ settle, h }) => {
      const out = await settle();
      assert(out.targetPowerW > 3700, 'Frische, akzeptierte reale Speicherleistung muss den LP zusätzlich versorgen dürfen');
      assert(out.targetPowerW <= 6600, 'Hauslast und tatsächlicher Netzbezug bleiben vorab reserviert');
      assert(h.localStates.get('chargingManagement.control.storageAssistRequestedW') > 0,
        'LP-Netzgrenze allein muss eine Speicheranfrage auslösen');
      assert.equal(h.adapter._emsCaps.evcsStoragePolicy.protectionRequestedWallboxes, 0);
    });

    await check({ userMode: 'auto', tariffState: 'guenstig' }, async ({ settle, h }) => {
      const out = await settle();
      assert(out.targetPowerW > 3700 && out.targetPowerW <= 6600,
        `Günstiges Auto-Fenster: ${JSON.stringify({ targetPowerW: out.targetPowerW, effectiveMode: out.effectiveMode,
          assist: h.localStates.get('chargingManagement.control.storageAssistRequestedW'),
          accepted: h.localStates.get('chargingManagement.control.storageAssistAcceptedW'),
          reason: h.localStates.get(`${base}storageAssistBlockedReason`) })}`);
    });
    await check({ userMode: 'auto', gridAllowed: false, tariffState: 'teuer',
      goalEnabled: true, goalTargetSocPct: 60, vehicleSoc: 50, goalBatteryKwh: 60, deadlineHours: 0.25 },
    async ({ settle }) => {
      const out = await settle();
      assert.equal(out.goalActive, true);
      assert.equal(out.goalTariffOverride, true, 'Dringendes Zeit-Ziel bleibt wirksam');
      assert(out.targetPowerW >= 1000 && out.targetPowerW <= 6600,
        'Zeit-Ziel hält die belegte Netz-/Speichergrenze ein');
    });
    await check({ userMode: 'pv' }, async ({ settle }) => {
      assert.equal((await settle()).targetPowerW, 0, 'Reines PV-Laden darf Speicher nicht als PV verbuchen');
    });

    // Min+PV / Auto sind kein Boost: Speicher füllt nur eine Mindestleistungs-
    // lücke, zusätzliche Leistung über das Minimum verlangt weiterhin PV.
    for (const userMode of ['auto', 'minpv']) {
      await check({ userMode }, async ({ settle }) => {
        const out = await settle();
        assert.equal(out.targetPowerW, 1000, `${userMode}: Speicher darf das Mindestladen nicht zu Boost machen`);
      });
      await check({ userMode, wallbox: { chargerType: 'AC', controlBasis: 'currentA', minA: 6,
        maxA: 32, maxPowerW: 7360, minPowerW: undefined, setCurrentAId: 'test.ac.setA',
        setPowerWId: '', boostMaxPowerW: 1000 },
        plant: { actualW: 1380, gridW: 1000, batteryW: 480, acceptedW: 480 } }, async ({ settle }) => {
        const out = await settle();
        assert.equal(out.targetPowerW, 1380, `${userMode}: frische 380 W Speicher schließen das AC-Minimum`);
      });
    }

    await check({ userMode: 'minpv', wallbox: { chargerType: 'AC', controlBasis: 'currentA',
      phases: 3, phaseMode: 'fixed-3p', minA: 6.1, maxA: 16, stepA: 1,
      maxPowerW: 11040, minPowerW: undefined, setCurrentAId: 'test.ac.setA', setPowerWId: '' },
      plant: { actualW: 4830, gridW: 3700, batteryW: 1230, acceptedW: 1230 } }, async ({ settle }) => {
      const out = await settle();
      assert.equal(out.targetCurrentA, 7, '6,1 A Minimum mit 1-A-Schritt benötigt tatsächlich 7 A');
      assert.equal(out.targetPowerW, 4830, 'Speicher darf die quantisierte 3p-Mindestlücke von 1130 W füllen');
    });

    // Request ist die gesamte Batterieentladung: 1000 W Haus + 440 W LP-Lücke.
    // Ohne bindende Standort-/Phasengrenze darf der Request nicht bei 440 W
    // stehenbleiben, sonst würde der Speicher zunächst nur einen Teil des Hauses versorgen.
    await check({ userMode: 'minpv', wallbox: { chargerType: 'AC', controlBasis: 'currentA',
      phases: 3, phaseMode: 'fixed-3p', minA: 6, maxA: 16, stepA: 1,
      maxPowerW: 11040, minPowerW: undefined, setCurrentAId: 'test.ac.setA', setPowerWId: '' },
      plant: { actualW: 4140, gridW: 3700, batteryW: 1440, acceptedW: 1440 } }, async ({ settle, h }) => {
      h.adapter.config.installerConfig.gridConnectionPower = 100000;
      let observedBudget;
      let observedCreditW;
      const execute = h.module._executeChargingTsSetpointPlan;
      h.module._executeChargingTsSetpointPlan = async function (...args) {
        observedBudget = args[2].find(row => row.type === 'budget')?.details;
        observedCreditW = args[1].find(row => row.safe === 'lp1')?.zeroExportStorageCreditW;
        return execute.apply(this, args);
      };
      const out = await settle();
      assert.equal(observedBudget?.gridCapBudgetApplied, false, 'Test darf keinen Standort-Request verdeckt verwenden');
      assert.equal(observedBudget?.phaseCapBinding, false, 'Test darf keinen Phasen-Request verdeckt verwenden');
      const requestedW = h.localStates.get('chargingManagement.control.storageAssistRequestedW');
      assert(requestedW >= 1440 && requestedW <= h.adapter.config.chargingManagement.storageAssistMaxDischargeW,
        `Gesamte Entladung muss Haus und LP-Lücke abdecken: ${requestedW} W`);
      assert.equal(observedCreditW, 440, 'Nur der nach Hausversorgung belegte Anteil gehört zum LP');
      assert.equal(out.targetPowerW, 4140);
    });

    await check({ protectedPoint: { actualW: 2000 }, plant: { gridW: 5100 } }, async ({ tick, settle, h }) => {
      const first = await tick();
      assert(first.targetPowerW > 3700 && first.targetPowerW <= 4600, JSON.stringify(first));
      const out = await settle();
      assert(out.targetPowerW <= 3700, 'Noch nicht gemessene LP2-Mehrlast muss vorab reserviert bleiben');
      assert(h.localStates.get('chargingManagement.wallboxes.lp2.targetPowerW') <= 3700,
        'Geschützter Ladepunkt darf keine fremde Speicherzuteilung erhalten');
      assert.equal(h.adapter._emsCaps.evcsStoragePolicy.protectedLoadW, 2000);
    });

    for (const kind of ['unknown', 'thermal']) {
      await check({ plant: { gridW: 4100, batteryW: 5000, acceptedW: 5000 } }, async ({ settle, tick, h }) => {
        assert((await settle()).targetPowerW > 3700);
        const budget = h.adapter._emsBudget;
        budget.consumers = { [kind]: { usedW: 3000, actualW: 3000 } };
        budget.raw = { thermalUsedW: kind === 'thermal' ? 3000 : 0,
          thermalActualW: kind === 'thermal' ? 3000 : 0 };
        assert((await tick()).targetPowerW <= 3700,
          `${kind}: Reservierungs-actualW und Summary-Istwert ersetzen keinen Messnachweis`);
        if (kind === 'thermal') {
          h.adapter.config.thermal = { devices: [{ enabled: true, slot: 3 }] };
          h.adapter._zeroExportPvOwnedThermal = { c3: { owned: true, ts: clock } };
          h.dp.entries.set('th.c3.pW', { objectId: 'test.thermal.actualW' });
          const getFresh = h.dp.getNumberFresh.bind(h.dp);
          const getAge = h.dp.getMeasurementAgeMs.bind(h.dp);
          h.dp.getNumberFresh = (key, age, fallback) => key === 'th.c3.pW' ? 3000 : getFresh(key, age, fallback);
          h.dp.getMeasurementAgeMs = key => key === 'th.c3.pW' ? 0 : getAge(key);
          const out = await tick();
          assert(out.targetPowerW > 3700 && out.targetPowerW <= 5600,
            'Direkte frische 3-kW-Wärmemessung darf die bereits physische Last aus der Zusatzreservierung lösen');
        }
      });
    }

    const protectedPoint = { actualW: 3700, ageMs: 0 };
    await check({ protectedPoint, plant: { gridW: 4800, batteryW: 5000, acceptedW: 5000 } },
    async ({ settle, tick }) => {
      assert((await settle()).targetPowerW > 3700);
      protectedPoint.ageMs = 6000;
      assert((await tick()).targetPowerW <= 3700,
        'Veraltete Istleistung des anderen LP darf dessen 3700-W-Befehlsreservierung nicht aufheben');
    });

    for (const patch of [{ acceptedW: 0 }, { acceptedAgeMs: 360000 }, { effective: false },
      { acceptedTopology: 'single' }, { source: 'eigenverbrauch' }, { storageFresh: false },
      { storageAgeMs: 6000 }, { batteryW: 0 }, { soc: 20 }, { safetyReady: false },
      { dischargeAllowed: false }]) {
      await check({}, async ({ settle, tick }) => {
        assert((await settle()).targetPowerW > 3700);
        const out = await tick(patch);
        assert(out.targetPowerW <= 3700, `Speicherfreigabe entfällt sofort: ${JSON.stringify(patch)} ${JSON.stringify(out)}`);
      });
    }

    await check({}, async ({ settle, tick, h }) => {
      assert((await settle()).targetPowerW > 3700);
      h.setLocal(`${base}userStorageAssistEnabled`, false);
      assert((await tick()).targetPowerW <= 3700, 'Kundenschalter aktiviert Schutz im selben Regeltick');
      assert.equal(h.adapter._emsCaps.evcsStoragePolicy.protectedLoadW, 6000);
    });

    // Schutz muss nach der LP-Policy bis zum echten Speicher-Writer durchlaufen.
    // 4,5 kW geschütztes EV + 2 kW Haus dürfen nur 1,95 kW Speicher anfordern
    // (bestehender 50-W-Netzbezug). Dieselbe Anlage mit Kundenerlaubnis darf
    // normalen Eigenverbrauch decken. Beide Ticks haben Nulleinspeisung aktiv.
    for (const assist of [false, true]) {
      await check({ assist, plant: { actualW: 4500, gridW: 6500, batteryW: 0, acceptedW: 0 } },
      async ({ tick, h }) => {
        await tick();
        const storage = await storageFixtureModule.exports.storageTick({
          policy: h.adapter._emsCaps.evcsStoragePolicy, gridW: 6500 });
        assert.equal(storage.signed, assist ? 6450 : 1950,
          'Nulleinspeisung darf den Kunden-Speicherschutz am Speicher-Writer nicht umgehen');
      });
    }

    // Ein leerer Speicher oder eine noch nicht liefernde Batterie ist kein
    // Startnachweis. Auch eine hohe akzeptierte Sollleistung reicht dafür nicht.
    await check({ wallbox: { boostMaxPowerW: 0 },
      plant: { actualW: 0, batteryW: 0, gridW: 100, acceptedW: 5000 } }, async ({ settle }) => {
      assert.equal((await settle()).targetPowerW, 0, 'Kein spekulativer Batterie-Kaltstart bei Netzgrenze 0');
    });

    // Writer-Grenze erneut prüfen: Akzeptanz, Kundenschalter, Reserve oder
    // Messnachweis können nach der Allokation vor dem Fremdschreiben entfallen.
    for (const revoke of ['sample', 'accepted', 'effective', 'customer', 'soc', 'discharge', 'mode', 'installer']) {
      await check({}, async ({ settle, tick, h, plant }) => {
        assert((await settle()).targetPowerW > 3700);
        const execute = h.module._executeChargingTsSetpointPlan;
        h.module._executeChargingTsSetpointPlan = async function (...args) {
          if (revoke === 'sample') {
            plant.batteryW = 0;
            ze.updateZeroExportProbe(h.adapter, { ...h.adapter._zeroExportPvCoordinator.sample,
              now: clock, storageFresh: false, storageDischargeW: 0, storageNetDischargeW: 0 });
          }
          if (revoke === 'accepted') h.setLocal('speicher.regelung.evcsAssistAcceptedW', 0);
          if (revoke === 'effective') h.setLocal('speicher.regelung.commandEffective', false);
          if (revoke === 'customer') h.setLocal(`${base}userStorageAssistEnabled`, false);
          if (revoke === 'soc') h.setLocal('storageFarm.totalSocOnline', 20);
          if (revoke === 'discharge') plant.dischargeAllowed = false;
          if (revoke === 'mode') h.setLocal(`${base}userMode`, 'pv');
          if (revoke === 'installer') h.wallbox.storageAssistCustomerAllowed = false;
          return execute.apply(this, args);
        };
        const before = h.writes.length;
        assert((await tick()).targetPowerW <= 3700, `Finaler Writer muss Widerruf beachten: ${revoke}`);
        for (const write of h.writes.slice(before).filter(w => /\.setW$/.test(w.key))) {
          assert(write.value <= 3700, `Tatsächlich geschriebener Leistungssollwert muss sinken: ${revoke}`);
        }
      });
    }

    await check({ userMode: 'auto', tariffState: 'guenstig' }, async ({ settle, tick, h }) => {
      assert((await settle()).targetPowerW > 3700);
      const execute = h.module._executeChargingTsSetpointPlan;
      h.module._executeChargingTsSetpointPlan = async function (...args) {
        h.adapter.config.chargingManagement.storageAssistApply = 'boostOnly';
        return execute.apply(this, args);
      };
      const before = h.writes.length;
      assert((await tick()).targetPowerW <= 3700, 'Boost-only darf Auto vor dem Writer keine Speicherfreigabe lassen');
      for (const write of h.writes.slice(before).filter(w => /\.setW$/.test(w.key))) {
        assert(write.value <= 3700, 'Geänderte Modusfreigabe muss den geschriebenen Sollwert begrenzen');
      }
    });

    await check({ zero: false, assist: false }, async ({ settle }) => {
      assert((await settle()).targetPowerW > 3700, 'Ohne Nulleinspeisung bleibt die bisherige Boost-Regelung erhalten');
    });
    console.log(`[1.0.20-storage-grid-share] OK: ${scenarios} reale Regler-/Writer-Szenarien, Netzbezug, Speicherfreigabe/-schutz, Mindestladen und Widerruf.`);
  } finally { Date.now = originalNow; }
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
