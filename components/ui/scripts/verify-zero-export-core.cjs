#!/usr/bin/env node
'use strict';

/**
 * Nulleinspeise-Integration: echter Core-Budgetsnapshot, echte zentrale Lease
 * und direkt gemappte Wärmemessung. Die Fixture folgt dem RC78-NVP-Vertrag.
 * Testet die zeitliche Budgetübergabe vor dem nächsten Verbraucheraufruf;
 * keine Hardware, keine Netzwerkdienste, keine nachgebildete PV-Formel.
 */
const assert = require('node:assert/strict');
const { CoreLimitsModule, makeBudgetRuntime } = require('../ems/modules/core-limits');
const {
  collectZeroExportSample, updateZeroExportProbe, requestZeroExportProbe,
  unconfirmedZeroExportW, isZeroExportGrantValid,
} = require('../ems/services/zero-export-pv-coordinator');

const realNow = Date.now;
let clock = realNow();
Date.now = () => clock;

function fixture({ enabled = true, rodW = 0, storagePresent = false, evcsW = 0 } = {}) {
  const values = { pvW: 2000 + rodW, rodW, evcsW, gridW: 0, evcsAge: 0, storageChargeW: 0, storageDischargeW: 0, pvAge: 0, rodAge: 0 };
  const stateCache = {};
  const adapter = {
    config: {
      enableChargingManagement: true, enableThermalControl: true, enableHeatingRodControl: true,
      enableStorageControl: storagePresent,
      chargingManagement: { staleTimeoutSec: 15, pvChargeReserveW: 500 },
      gridConstraints: { zeroExportEnabled: enabled, zeroExportInstallerApproved: true, zeroExportMaxExportW: 0, exportLimitRunMode: 'active' },
      datapoints: { pvPower: 'test.pv', ...(storagePresent ? { batteryPower: 'test.battery' } : {}) },
      heatingRod: { devices: [{ enabled: true, slot: 1 }, { enabled: true, slot: 2 }] },
      thermal: { devices: [] },
      storage: {}, storageFarm: {}, installerConfig: {},
    },
    stateCache,
    _heatingRodBudgetUsedW: rodW,
    _thermalBudgetUsedW: 8000,
    _nwGetStorageControlAuthority() { return { selectedTopology: storagePresent ? 'single' : 'none', writerActive: storagePresent }; },
    _nwResolveBatteryFlowFromCache() {
      return { chargeW: values.storageChargeW, dischargeW: values.storageDischargeW, signedW: values.storageDischargeW - values.storageChargeW, src: 'batteryPower', derived: false, staleMs: { batteryPower: 0 } };
    },
    log: { debug() {}, info() {}, warn() {}, error() {} },
    async setStateAsync() {}, updateValue() {},
  };
  const dp = {
    getNumberFresh(key, _maxAge, fallback = null) {
      if (key.startsWith('cm.wb.')) return values.evcsAge <= _maxAge ? values.evcsW : fallback;
      if (key === 'ps.pvW' || key === 'cm.pvPowerW') return values.pvAge <= _maxAge ? values.pvW : fallback;
      if (key === 'hr.c1.pW' || key === 'hr.c2.pW' || key === 'th.c3.pW') return values.rodAge <= _maxAge ? values.rodW : fallback;
      return fallback;
    },
    getMeasurementAgeMs(key) { return key.startsWith('cm.wb.') ? values.evcsAge : key.startsWith('hr.') || key === 'th.c3.pW' ? values.rodAge : key === 'ps.pvW' || key === 'cm.pvPowerW' ? values.pvAge : null; },
    getNumber() { return null; }, getRaw() { return null; },
    // Beide Geräteeinträge zeigen absichtlich auf denselben physikalischen Zähler.
    getEntry(key) { return key.startsWith('cm.wb.') ? { srcObjectId: 'test.evcs.actual' } : key.startsWith('hr.c') || key === 'th.c3.pW' ? { srcObjectId: 'test.rod.actual' } : null; },
  };
  function refresh() {
    for (const [id, value] of Object.entries({
      pvPower: values.pvW,
      'thermal.summary.appliedTotalW': 8000,
      'thermal.summary.budgetUsedW': 8000,
      'heatingRod.summary.currentHeatingRodW': values.rodW,
      'heatingRod.summary.budgetUsedW': values.rodW,
      'heatingRod.devices.c1.effectiveMode': 'pvAuto',
      'heatingRod.devices.c2.effectiveMode': 'pvAuto',
    })) stateCache[id] = { value, ack: true, ts: clock, lc: clock };
    stateCache.pvPower.ts = clock - values.pvAge;
    adapter._zeroExportEvcsMeters = { ts: clock, keys: ['cm.wb.lp1.pW', 'cm.wb.alias.pW'] };
    adapter._zeroExportPvOwnedHeatingRod = { c1: { owned: true, ts: clock }, c2: { owned: true, ts: clock } };
    adapter._zeroExportPvOwnedThermal = { c3: { owned: true, ts: clock } };
    adapter._nvpFreshnessSnapshot = { ts: clock, usable: true, fresh: true, connected: true, netW: values.gridW, status: 'ok', source: 'test-signed-nvp', reason: 'fresh-test-value', measurementAgeMs: 0, heartbeatAgeMs: 0 };
    adapter._emsSafetyEnvelope = { valid: true, forceZero: false, emergencyStop: false, expiresAt: clock + 5000 };
  }
  const core = new CoreLimitsModule(adapter, dp);
  const coreSnapshot = { grid: { gridImportLimitW_effective: 30000 }, para14a: { active: false }, tariff: {} };
  const budget = () => core._makeBudgetSnapshot(clock, coreSnapshot);
  const update = () => updateZeroExportProbe(adapter, collectZeroExportSample(adapter, dp, {}, clock));
  const advance = (ms = 1000) => { clock += ms; refresh(); };
  refresh();
  return { adapter, dp, values, budget, update, advance, refresh };
}

try {
  // Echte PV-Aufnahme hält bei Nulleinspeisung ohne zyklischen Reserveabzug.
  const active = fixture({ rodW: 1200 });
  let snapshot = active.budget();
  assert.equal(snapshot.raw.pvReserveW, 0);
  assert.equal(snapshot.raw.heatingRodUsedW, 1200, 'Doppelte Zählerzuordnung darf tatsächliche Heizleistung nicht verdoppeln');
  assert.equal(snapshot.raw.thermalUsedW, 0, '8-kW-Sollwert ohne Wärmemessung erzeugt keinen PV-Anteil');
  assert.equal(snapshot.gates.pv.effectiveW, 1200);
  active.adapter._zeroExportPvOwnedHeatingRod.c1.owned = false;
  active.adapter._zeroExportPvOwnedHeatingRod.c2.owned = false;
  snapshot = active.budget();
  assert.equal(snapshot.raw.heatingRodUsedW, 0, 'Manuelle/externe Aufnahme darf nicht als PV-Automatiklast rekonstruiert werden');
  assert.equal(snapshot.gates.pv.effectiveW, 0);
  active.refresh();
  for (const mode of ['boost', 'manual', 'off']) {
    active.adapter.stateCache['heatingRod.devices.c1.effectiveMode'].value = mode;
    active.adapter.stateCache['heatingRod.devices.c2.effectiveMode'].value = mode;
    assert.equal(active.budget().raw.heatingRodUsedW, 0, `${mode} bleibt auch bei Aktoreigentümerschaft gewöhnliche Hauslast`);
  }
  active.refresh();
  active.adapter._zeroExportPvOwnedHeatingRod.c1.ts = clock - 5001;
  active.adapter._zeroExportPvOwnedHeatingRod.c2.ts = clock - 5001;
  assert.equal(active.budget().raw.heatingRodUsedW, 0, 'Veraltete Eigentümerschaft gibt keine frische Messung frei');
  active.refresh();
  active.adapter.config.thermal.devices = [{ enabled: true, slot: 3 }];
  snapshot = active.budget();
  assert.equal(snapshot.raw.thermalUsedW + snapshot.raw.heatingRodUsedW, 1200, 'Derselbe Zähler zählt auch über Thermal-/Heizstabgrenzen nur einmal');
  assert.equal(snapshot.gates.pv.effectiveW, 1200);
  active.adapter.config.thermal.devices = [];
  active.values.rodAge = 5001;
  snapshot = active.budget();
  assert.equal(snapshot.raw.heatingRodUsedW, 0, 'Alter Messwert darf nicht durch frisch publizierten Heizstab-Sollwert ersetzt werden');
  assert.equal(snapshot.gates.pv.effectiveW, 0);

  const disabled = fixture({ enabled: false, rodW: 1200 });
  disabled.adapter.config.enableThermalControl = false;
  snapshot = disabled.budget();
  assert.equal(snapshot.raw.pvReserveW, 500, 'Bestehender PV-Modus behält seine konfigurierte Reserve');
  assert.equal(snapshot.gates.pv.effectiveW, 700);

  // Frische Nullmessung und fehlende Messung sind verschiedene Zustände.
  const missing = fixture();
  missing.values.pvW = null;
  missing.refresh();
  let measurement = collectZeroExportSample(missing.adapter, missing.dp, {}, clock);
  assert.equal(measurement.pvFresh, false, 'Null darf nicht als frischer 0-W-Nachweis gelten');
  assert.equal(missing.budget().gates.pv.effectiveW, 0);
  missing.values.pvW = 0;
  missing.refresh();
  measurement = collectZeroExportSample(missing.adapter, missing.dp, {}, clock);
  assert.equal(measurement.pvFresh, true);
  assert.equal(measurement.pvW, 0);

  // Speicher reagiert zwischen zwei Core-Zyklen: schon der reservierte Zielwert
  // muss exklusiv bleiben, bevor sein Verbraucher lastActualW aktualisiert.
  const site = fixture({ storagePresent: true });
  const ask = (extra = {}) => requestZeroExportProbe(site.adapter, {
    key: 'storage', now: clock, eligible: true, actualFresh: true, actualW: site.values.storageChargeW,
    baseW: 0, nextW: 1000, maxW: 3000, technicalMinW: 100, priority: 90, ...extra,
  });
  site.update();
  assert.equal(ask().granted, false);
  site.advance(); site.update();
  const grant = ask();
  assert.equal(grant.granted, true);
  assert.equal(site.adapter._zeroExportPvCoordinator.lease.lastActualW, 0);
  assert.equal(unconfirmedZeroExportW(site.adapter), 1000);
  site.values.storageChargeW = 1000;
  site.values.pvW = 3000;
  site.advance();
  snapshot = site.budget();
  assert.equal(snapshot.raw.storageChargeW, 1000);
  assert.equal(snapshot.gates.pv.effectiveW, 0, 'Neue Speicheraufnahme darf vor Bestätigung kein zweites PV-Budget erzeugen');
  site.update(); ask();
  site.advance(3000); site.update(); ask();
  assert.ok(site.adapter._zeroExportPvCoordinator.lease.confirmedAt, 'Frische PV-Reaktion muss bestätigt werden');

  // Reihenfolge wie Core.tick: Snapshot berechnen, Messbasis/Lease atomar
  // übergeben, erst anschließend laufen die einzelnen Verbraucher-Writer.
  site.advance();
  snapshot = site.budget();
  assert.equal(snapshot.gates.pv.effectiveW, 1000);
  site.update();
  assert.equal(site.adapter._zeroExportPvCoordinator.lease, null, 'Vor Verbrauchern muss die alte Testfreigabe enden');
  assert.equal(isZeroExportGrantValid(site.adapter, 'storage', grant.leaseId, clock), false);
  const runtime = makeBudgetRuntime(site.adapter, snapshot);
  runtime.reserve({ key: 'other', requestedW: 1000, reserveW: 1000, pvReserveW: 1000, actualW: 1000, pvOnly: true });
  const allocated = runtime.getPvGrant({ key: 'storage', requestedW: 1000 }).grantW;
  assert.equal(allocated, 0);
  const noDoubleGrant = ask({ baseW: allocated });
  assert.equal(noDoubleGrant.granted, false, 'Bei anderweitig verteiltem PV darf die alte Lease nicht weiterlaufen');
  assert.equal(noDoubleGrant.extraW, 0);

  // 1.0.19: Core und Writer müssen dieselbe physikalische Quelle verwenden.
  // 2 kW Hauslast, 7 kW PV, 8,7 kW EV ergeben 3,7 kW NVP-Bezug. Nur der
  // vollständige EV-Istwert rekonstruiert 5 kW PV ohne doppelten Netzabzug.
  const charging = fixture({ evcsW: 8700, storagePresent: true });
  charging.values.pvW = 7000;
  charging.values.gridW = 3700;
  for (let tick = 0; tick < 120; tick++) {
    charging.advance();
    const flow = charging.budget();
    assert.equal(flow.raw.evcsPvUsedW, 8700, 'Frische EV-Gesamtleistung genau einmal zählen');
    assert.equal(flow.gates.pv.effectiveW, 5000, 'PV darf nicht zyklisch um den Netzanteil schrumpfen');
    charging.values.evcsW = 3700 + flow.gates.pv.effectiveW;
    charging.values.gridW = charging.values.evcsW + 2000 - charging.values.pvW;
  }
  charging.values.storageDischargeW = 2000;
  charging.values.gridW = 1700;
  charging.advance();
  assert.equal(charging.budget().gates.pv.effectiveW, 5000, 'Batterieentladung darf keine zusätzliche PV erzeugen');
  charging.values.evcsAge = 5001;
  charging.advance();
  assert.equal(charging.budget().raw.evcsPvUsedW, 0, 'Veraltete LP-Messung erzeugt keine PV-Gutschrift');
  assert.equal(charging.budget().gates.pv.effectiveW, 0);
  charging.values.evcsAge = 0;
  charging.adapter._zeroExportEvcsMeters.ts = clock - 5001;
  assert.equal(charging.budget().raw.evcsPvUsedW, 0, 'Stillgelegte Charging-App erzeugt keine EV-Gutschrift');

  console.log('[zero-export-core] OK: Core-Reserve, echte Wärmemessung, Null/0, Prüflast, 120 Netz/PV-Rückkopplungszyklen und Batterieabzug.');
} finally {
  Date.now = realNow;
}
