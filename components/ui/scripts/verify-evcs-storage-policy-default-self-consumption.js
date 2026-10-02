#!/usr/bin/env node
'use strict';

/**
 * Runtime-Regression 0.8.107: EVCS-Speicherpolicy und Eigenverbrauch.
 *
 * Fachliche Regeln:
 * - Ist die Kundenwahl im AppCenter nicht freigegeben, bleibt die normale
 *   Speicher-Eigenverbrauchsoptimierung aktiv. Eine Wallboxlast darf dann wie
 *   jede andere NVP-Last durch den Speicher gedeckt werden.
 * - Erst die explizite Wahl "Speicher schützen" nimmt die reale Wallboxlast aus
 *   dem Speicher-NVP-Regelkreis heraus.
 * - "Speicher mitnutzen" aktiviert den optionalen Assist, aber keinen Schutz.
 * - Der same-cycle EMS-Snapshot ist autoritativ und darf nicht durch einen alten
 *   asynchron veröffentlichten Schutz-State überschrieben werden.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  ChargingManagementModule,
  resolveEvcsStoragePolicy,
  resolveEvcsStoragePolicyActualLoad,
} = require(path.join(__dirname, '..', 'ems', 'modules', 'charging-management.js'));
const {
  SpeicherRegelungModule,
  resolveEvcsProtectedStorageTarget,
} = require(path.join(__dirname, '..', 'ems', 'modules', 'storage-control.js'));

assert.strictEqual(typeof ChargingManagementModule, 'function', 'charging module export missing');
assert.strictEqual(typeof resolveEvcsStoragePolicy, 'function', 'storage policy helper must be exported');
assert.strictEqual(typeof resolveEvcsStoragePolicyActualLoad, 'function', 'actual EVCS vehicle-load helper must be exported');
assert.strictEqual(typeof resolveEvcsProtectedStorageTarget, 'function', 'EVCS protected storage target helper must be exported');

const normal = resolveEvcsStoragePolicy(false, false);
assert.deepStrictEqual(normal, {
  mode: 'normal',
  assistRequested: false,
  protectionRequested: false,
}, 'disabled installer feature must keep normal self-consumption');

const normalLegacyTrue = resolveEvcsStoragePolicy(false, true);
assert.deepStrictEqual(normalLegacyTrue, {
  mode: 'normal',
  assistRequested: false,
  protectionRequested: false,
}, 'hidden/locked feature must not activate assist or protection from stale user state');

const protect = resolveEvcsStoragePolicy(true, false);
assert.deepStrictEqual(protect, {
  mode: 'protect',
  assistRequested: false,
  protectionRequested: true,
}, 'explicit protect choice must exclude wallbox load from storage');

const assist = resolveEvcsStoragePolicy(true, true);
assert.deepStrictEqual(assist, {
  mode: 'assist',
  assistRequested: true,
  protectionRequested: false,
}, 'explicit assist choice must allow storage use without protection');


// RC22: Reine PV-Ueberschussladung ist bereits physikalisch auf PV begrenzt.
// Speicherschutz und Speicher-Assist duerfen deshalb nur in Auto, Boost und
// Min+PV eingreifen. Die gespeicherte Kundenwahl wird lediglich zur Laufzeit
// neutralisiert und wirkt nach einem Moduswechsel wieder.
const purePvProtectBypassed = resolveEvcsStoragePolicy(true, false, 'pv');
assert.deepStrictEqual(purePvProtectBypassed, {
  mode: 'normal',
  assistRequested: false,
  protectionRequested: false,
}, 'pure PV mode must bypass storage protection');

const purePvAssistBypassed = resolveEvcsStoragePolicy(true, true, 'pv');
assert.deepStrictEqual(purePvAssistBypassed, {
  mode: 'normal',
  assistRequested: false,
  protectionRequested: false,
}, 'pure PV mode must bypass stationary-storage assist');

const autoProtect = resolveEvcsStoragePolicy(true, false, 'auto');
assert.strictEqual(autoProtect.protectionRequested, true, 'auto mode must keep storage protection active');
const boostProtect = resolveEvcsStoragePolicy(true, false, 'boost');
assert.strictEqual(boostProtect.protectionRequested, true, 'boost mode must keep storage protection active');
const minPvProtect = resolveEvcsStoragePolicy(true, false, 'min+pv');
assert.strictEqual(minPvProtect.protectionRequested, true, 'Min+PV mode must keep storage protection active');
const minPvAssist = resolveEvcsStoragePolicy(true, true, 'minpv');
assert.strictEqual(minPvAssist.assistRequested, true, 'Min+PV mode must keep storage assist active when selected');

const chargingRuntimeSource = fs.readFileSync(path.join(__dirname, '..', 'src-ts', 'runtime-executables', 'ems', 'modules', 'charging-management.ts'), 'utf8');
assert(
  chargingRuntimeSource.includes('resolveEvcsStoragePolicy(storageAssistCustomerAllowed, userStorageAssistEnabled, userMode)'),
  'runtime must scope EVCS storage policy by the selected wallbox mode',
);

// RC21: Speicherschutz darf nur echte Fahrzeugladeleistung verwenden. Ein
// ladebereiter ABL-eMH1-Status mit ca. 69 W Elektronik-/Standbyverbrauch ist
// normale Gebaeudelast und darf weder Schutzbudget noch 0-W-Pulse erzeugen.
const ablStandby = resolveEvcsStoragePolicyActualLoad({
  actualPowerW: 69,
  meterFresh: true,
  online: true,
  enabled: true,
  vehicleDemandConfirmed: true,
  vehicleStateNormalized: 'ready_to_charge',
  activityThresholdW: 100,
  storageProtectionRequested: true,
});
assert.strictEqual(ablStandby.actualVehicleLoadW, 0, 'ABL B2 standby below threshold must not count as vehicle charging load');
assert.strictEqual(ablStandby.protectedLoadW, 0, 'ABL B2 standby must not create protected storage load');
assert.strictEqual(ablStandby.protectedWallbox, false, 'ABL B2 standby must not count as actively charging protected wallbox');
assert.strictEqual(ablStandby.reason, 'standby-below-activity-threshold', 'standby diagnostic reason missing');

const realVehicleCharge = resolveEvcsStoragePolicyActualLoad({
  actualPowerW: 4200,
  meterFresh: true,
  online: true,
  enabled: true,
  vehicleDemandConfirmed: true,
  vehicleStateNormalized: 'charging',
  activityThresholdW: 100,
  storageProtectionRequested: true,
});
assert.strictEqual(realVehicleCharge.protectedLoadW, 4200, 'real confirmed vehicle charging load must be protected');
assert.strictEqual(realVehicleCharge.protectedWallbox, true, 'real charging wallbox must count as protected wallbox');

const staleVehicleCharge = resolveEvcsStoragePolicyActualLoad({
  actualPowerW: 4200,
  meterFresh: false,
  online: true,
  enabled: true,
  vehicleDemandConfirmed: true,
  vehicleStateNormalized: 'charging',
  activityThresholdW: 100,
  storageProtectionRequested: true,
});
assert.strictEqual(staleVehicleCharge.protectedLoadW, 0, 'stale EVCS meter must not reserve protected load');

// Zwischen zwei langsameren Speicher-Telemetrieproben darf ein bestaetigter
// Entlade-Kommandoanker als zeitlich begrenzte Berechnungsbasis dienen. Bei
// 4,2 kW EVCS-Last, 4,2 kW NVP-Bezug und zuletzt bestaetigten 1,5 kW Entladung
// bleiben rund 1,45 kW Hausentladung erlaubt; 0 W waere ein falscher Puls.
const asyncDischargeNoPulse = resolveEvcsProtectedStorageTarget({
  requestedTargetW: 1500,
  lastTargetW: 1500,
  protectedEvcsLoadW: 4200,
  nvpW: 4200,
  targetNvpW: 50,
  storageActualW: null,
  storageDischargeBasisW: 1500,
  storageDischargeBasisSource: 'confirmed-command-anchor',
  deadbandW: 20,
});
assert.strictEqual(asyncDischargeNoPulse.targetW, 1450, `async feedback gap must cap to 1450 W instead of pulsing to 0 W, got ${asyncDischargeNoPulse.targetW}`);
assert.strictEqual(asyncDischargeNoPulse.explicitStop, false, 'async feedback gap with house load must not be an explicit storage stop');
assert.strictEqual(asyncDischargeNoPulse.storageDischargeBasisSource, 'confirmed-command-anchor', 'command-anchor source diagnostic missing');

const evcsOnlyStillStops = resolveEvcsProtectedStorageTarget({
  requestedTargetW: 1500,
  lastTargetW: 1500,
  protectedEvcsLoadW: 4200,
  nvpW: 2750,
  targetNvpW: 50,
  storageActualW: null,
  storageDischargeBasisW: 1500,
  storageDischargeBasisSource: 'confirmed-command-anchor',
  deadbandW: 20,
});
assert.strictEqual(evcsOnlyStillStops.targetW, 0, 'EVCS-only demand must still stop storage discharge');
assert.strictEqual(evcsOnlyStillStops.explicitStop, true, 'EVCS-only discharge stop must remain explicit');

const nowMs = () => Date.now();
const entry = (val, objectId) => ({ val, ts: nowMs(), objectId });

class FakeDp {
  constructor(entries) {
    this.entries = entries || {};
    this.writes = [];
  }
  getEntry(key) { return this.entries[key] || null; }
  getAgeMs(key) {
    const rec = this.entries[key];
    return rec && Number.isFinite(Number(rec.ts)) ? Math.max(0, nowMs() - Number(rec.ts)) : null;
  }
  getNumberFresh(key, staleMs, fallback = null) {
    const rec = this.entries[key];
    if (!rec) return fallback;
    const age = this.getAgeMs(key);
    if (age !== null && Number.isFinite(Number(staleMs)) && age > Number(staleMs)) return fallback;
    const n = Number(rec.val);
    return Number.isFinite(n) ? n : fallback;
  }
  getNumber(key, fallback = null) {
    const rec = this.entries[key];
    if (!rec) return fallback;
    const n = Number(rec.val);
    return Number.isFinite(n) ? n : fallback;
  }
  getBoolean(key, fallback = false) {
    const rec = this.entries[key];
    if (!rec) return fallback;
    return rec.val === true || rec.val === 'true' || rec.val === 1 || rec.val === '1';
  }
  async writeNumber(key, value) {
    this.writes.push({ key, value: Number(value) });
    return true;
  }
  async writeBoolean(key, value) {
    this.writes.push({ key, value: !!value });
    return true;
  }
  lastWrite(key = 'st.targetPowerW') {
    const rows = this.writes.filter((row) => row.key === key);
    return rows.length ? rows[rows.length - 1].value : null;
  }
}

function makeAdapter({ runtimePolicy, stateProtectedLoadW = null, stateProtectedAgeMs = 0, storagePatch = {} } = {}) {
  const states = new Map();
  if (stateProtectedLoadW !== null) {
    const policyStateTs = nowMs() - Math.max(0, Number(stateProtectedAgeMs) || 0);
    states.set('chargingManagement.control.storageProtectedLoadW', { val: stateProtectedLoadW, ts: policyStateTs });
    states.set('chargingManagement.control.storageProtectedWallboxes', { val: stateProtectedLoadW > 0 ? 1 : 0, ts: policyStateTs });
    states.set('chargingManagement.control.storageAssistRequestedLoadW', { val: 0, ts: policyStateTs });
  }
  return {
    config: {
      enableStorageControl: true,
      enableStorageFarm: false,
      enableMultiUse: false,
      enablePeakShaving: false,
      enableGridConstraints: false,
      storage: {
        controlMode: 'targetPower',
        staleTimeoutSec: 15,
        maxDeltaWPerTick: 10000,
        pvMaxDeltaWPerTick: 10000,
        stepW: 1,
        pvEnabled: true,
        pvExportThresholdW: 50,
        selfTargetGridImportW: 50,
        selfImportThresholdW: 50,
        selfMinSocPct: 20,
        selfMaxSocPct: 100,
        ...storagePatch,
      },
    },
    _emsCaps: runtimePolicy ? {
      evcsStoragePolicy: {
        ...runtimePolicy,
        ts: nowMs(),
      },
    } : {},
    stateCache: {},
    log: { warn() {}, info() {}, debug() {}, error() {} },
    async setObjectNotExistsAsync() {},
    async setStateAsync(id, val) { states.set(id, { val, ts: nowMs() }); },
    async getStateAsync(id) { return states.get(id) || null; },
    _nwGetNumberFromCache(id) {
      const rec = this.stateCache && this.stateCache[id];
      const n = Number(rec && rec.value);
      return Number.isFinite(n) ? n : null;
    },
    _testStates: states,
  };
}

async function runStorageTick({
  runtimePolicy,
  stateProtectedLoadW = null,
  stateProtectedAgeMs = 0,
  lastTargetW = 0,
  lastSource = 'eigenverbrauch',
  gridW = 4200,
  battPowerW = null,
  socPct = 80,
  storagePatch = {},
}) {
  // 4,2 kW Bezug entsprechen im Basisszenario praktisch einer laufenden Wallbox.
  // Fuer Baustein 7 koennen NVP und Speicher-Istleistung explizit gesetzt werden.
  const entries = {
    'grid.powerW': entry(gridW, 'grid.filtered'),
    'grid.powerRawW': entry(gridW, 'grid.raw'),
    'st.socPct': entry(socPct, 'battery.soc'),
    'st.targetPowerW': entry(0, 'battery.target'),
  };
  if (battPowerW !== null && battPowerW !== undefined) {
    entries['st.batteryPowerW'] = entry(battPowerW, 'battery.actualPower');
  }
  const dp = new FakeDp(entries);
  const adapter = makeAdapter({ runtimePolicy, stateProtectedLoadW, stateProtectedAgeMs, storagePatch });
  const module = new SpeicherRegelungModule(adapter, dp);
  module._lastTargetW = lastTargetW;
  module._lastSource = lastSource;
  await module.tick();
  return {
    targetW: dp.lastWrite(),
    source: adapter._testStates.get('speicher.regelung.evcsSpeicherSchutzQuelle')?.val,
    protectedLoadW: adapter._testStates.get('speicher.regelung.evcsSpeicherSchutzLastW')?.val,
    protectionAction: adapter._testStates.get('speicher.regelung.evcsSpeicherSchutzAktion')?.val,
    protectionJson: adapter._testStates.get('speicher.regelung.evcsSpeicherSchutzJson')?.val,
    zeroAction: adapter._testStates.get('speicher.regelung.zeroWriteFirewallAction')?.val,
    zeroExplicitStop: adapter._testStates.get('speicher.regelung.zeroWriteFirewallExplicitStop')?.val,
  };
}

(async () => {
  const normalTick = await runStorageTick({
    runtimePolicy: {
      protectedLoadW: 0,
      protectedWallboxes: 0,
      assistRequestedLoadW: 0,
      source: 'charging-runtime',
    },
  });
  assert(normalTick.targetW >= 4000, `normal self-consumption must discharge for EVCS/NVP load, got ${normalTick.targetW} W`);
  assert.strictEqual(normalTick.protectedLoadW, 0, 'normal mode must not publish protected EVCS load');

  const protectTick = await runStorageTick({
    runtimePolicy: {
      protectedLoadW: 4100,
      protectedWallboxes: 1,
      assistRequestedLoadW: 0,
      source: 'charging-runtime',
    },
  });
  assert.strictEqual(protectTick.targetW, null, `explicit protect without a running storage command must stay no-write instead of creating a needless 0-W command, got ${protectTick.targetW} W`);
  assert.strictEqual(protectTick.protectedLoadW, 4100, 'explicit protect load must reach storage control');

  const protectActiveTick = await runStorageTick({
    runtimePolicy: {
      protectedLoadW: 4100,
      protectedWallboxes: 1,
      assistRequestedLoadW: 0,
      source: 'charging-runtime',
    },
    lastTargetW: 4100,
    battPowerW: 4100,
    gridW: 50,
  });
  assert.strictEqual(protectActiveTick.targetW, 0, 'explicit protect must stop a previously active discharge with one real 0-W command');


  // Baustein 7 / Kundenfall 20.07.2026: Die Wallbox ist geschuetzt, am NVP
  // besteht Netzbezug und der Speicher laedt noch aus einem alten Befehl. Ohne
  // echten Gesamtueberschuss muss ein ausdruecklicher 0-W-Stop geschrieben werden.
  const customerStop = await runStorageTick({
    runtimePolicy: {
      protectedLoadW: 3580,
      protectedWallboxes: 4,
      assistRequestedLoadW: 0,
      source: 'charging-runtime-global-protect',
    },
    gridW: 3200,
    battPowerW: -2300,
    lastTargetW: -1869,
    lastSource: 'pv',
  });
  assert.strictEqual(customerStop.targetW, 0, `Kundenfall muss laufende Netzladung stoppen, got ${customerStop.targetW} W`);
  assert(String(customerStop.protectionAction || '').includes('stop') && String(customerStop.protectionAction || '').includes('charge'), `Kundenfall braucht eindeutigen Lade-Stop, action=${customerStop.protectionAction}`);
  assert.strictEqual(customerStop.zeroExplicitStop, true, '0-W-Firewall muss den Schutzstop als explizit erkennen');
  assert(String(customerStop.zeroAction || '').includes('write'), `0-W-Stop muss geschrieben werden, action=${customerStop.zeroAction}`);

  // Der Hausverbrauch darf weiterhin durch den Speicher gedeckt werden; die
  // geschuetzte EVCS-Leistung bleibt dagegen am NVP sichtbar.
  const houseStart = await runStorageTick({
    runtimePolicy: {
      protectedLoadW: 3000,
      protectedWallboxes: 1,
      assistRequestedLoadW: 0,
      source: 'charging-runtime-protect',
    },
    gridW: 5000,
    battPowerW: 0,
  });
  assert.strictEqual(houseStart.targetW, 1950, `Hausdefizit ohne EVCS muss 1950 W Entladung ergeben, got ${houseStart.targetW}`);

  const houseStable = await runStorageTick({
    runtimePolicy: {
      protectedLoadW: 3000,
      protectedWallboxes: 1,
      assistRequestedLoadW: 0,
      source: 'charging-runtime-protect',
    },
    gridW: 3050,
    battPowerW: 1950,
    lastTargetW: 1950,
  });
  assert.strictEqual(houseStable.targetW, 1950, `laufender Hausausgleich darf nicht auf 0 W pulsen, got ${houseStable.targetW}`);

  // Laden ist nur bei realem Gesamtexport zulaessig und bleibt im NVP-Zielband stabil.
  const realSurplus = await runStorageTick({
    runtimePolicy: {
      protectedLoadW: 3000,
      protectedWallboxes: 1,
      assistRequestedLoadW: 0,
      source: 'charging-runtime-protect',
    },
    gridW: -400,
    battPowerW: 0,
    lastSource: 'pv',
  });
  assert.strictEqual(realSurplus.targetW, -450, `realer Export muss direkt zur NVP-Zielmitte +50 W genau 450 W Ladung erlauben, got ${realSurplus.targetW}`);

  const chargeStable = await runStorageTick({
    runtimePolicy: {
      protectedLoadW: 3000,
      protectedWallboxes: 1,
      assistRequestedLoadW: 0,
      source: 'charging-runtime-protect',
    },
    gridW: 50,
    battPowerW: -450,
    lastTargetW: -450,
    lastSource: 'pv',
  });
  assert.strictEqual(chargeStable.targetW, -450, `laufende PV-Ueberschussladung muss im Zielband stabil bleiben, got ${chargeStable.targetW}`);

  // PV deckt Haus und EVCS bereits; ein noch laufender Entladebefehl darf
  // nicht weiter Export erzeugen, nur weil die normale Regelung bereits einen
  // (hier nicht erlaubten) Ladewechsel anfordern wuerde.
  const stopOldDischarge = await runStorageTick({
    runtimePolicy: {
      protectedLoadW: 3580,
      protectedWallboxes: 1,
      assistRequestedLoadW: 0,
      source: 'charging-runtime-protect',
    },
    gridW: -2250,
    battPowerW: 2300,
    lastTargetW: 2300,
    lastSource: 'eigenverbrauch',
  });
  assert.strictEqual(stopOldDischarge.targetW, 0, `ueberfluessige Entladung muss mit 0 W gestoppt werden, got ${stopOldDischarge.targetW}`);
  assert.strictEqual(stopOldDischarge.zeroExplicitStop, true, 'Entlade-Stop muss die 0-W-Firewall passieren');

  const assistTick = await runStorageTick({
    runtimePolicy: {
      protectedLoadW: 0,
      protectedWallboxes: 0,
      assistRequestedLoadW: 4100,
      source: 'charging-runtime',
    },
  });
  assert(assistTick.targetW >= 4000, `assist mode must not protect EVCS load from normal discharge, got ${assistTick.targetW} W`);

  const staleStateIgnored = await runStorageTick({
    runtimePolicy: {
      protectedLoadW: 0,
      protectedWallboxes: 0,
      assistRequestedLoadW: 0,
      source: 'charging-tick-reset',
    },
    stateProtectedLoadW: 4100,
  });
  assert(staleStateIgnored.targetW >= 4000, `same-cycle normal policy must override stale protected state, got ${staleStateIgnored.targetW} W`);
  assert.strictEqual(staleStateIgnored.source, 'charging-tick-reset', 'same-cycle runtime policy source must be used');

  const expiredStateFallbackIgnored = await runStorageTick({
    stateProtectedLoadW: 4100,
    stateProtectedAgeMs: 6000,
  });
  // 1.0.5: old watts expire, but missing telemetry cannot cancel the protection intent.
  assert.strictEqual(expiredStateFallbackIgnored.targetW, 0, 'Abgelaufene geschuetzte Last muss Entladung bis zur frischen Policy sperren');
  assert.strictEqual(JSON.parse(expiredStateFallbackIgnored.protectionJson).protectedLoadUnknown, true);
  assert.strictEqual(expiredStateFallbackIgnored.protectedLoadW, 0, 'abgelaufener EVCS-Schutz-State darf keine Last mehr liefern');

  const stateFallbackProtect = await runStorageTick({ stateProtectedLoadW: 4100 });
  assert.strictEqual(stateFallbackProtect.targetW, null, 'state fallback without an active storage command must remain no-write');
  assert.strictEqual(stateFallbackProtect.source, 'state-fallback', 'fallback source diagnostic missing');

  const stateFallbackActiveProtect = await runStorageTick({
    stateProtectedLoadW: 4100,
    lastTargetW: 4100,
    battPowerW: 4100,
    gridW: 50,
  });
  assert.strictEqual(stateFallbackActiveProtect.targetW, 0, 'state fallback must stop an actually active discharge for old runtimes');

  console.log('[evcs-storage-policy-default-self-consumption] OK: normal/protect/assist, ABL-Standbyfilter, asynchroner Entladeanker sowie Hauslast-, Ueberschuss- und echte 0-W-Schutzstopps sind verifiziert.');
})().catch((err) => {
  console.error('[evcs-storage-policy-default-self-consumption] ERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
});
