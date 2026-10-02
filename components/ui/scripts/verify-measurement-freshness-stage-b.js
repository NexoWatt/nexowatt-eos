#!/usr/bin/env node
'use strict';

/**
 * Regression 0.8.109: Connected, Messwert und Heartbeat sind getrennt;
 * getrennte NVP-Kanäle dürfen keine alten Gegenwerte miteinander verrechnen.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const { buildNvpSnapshotFromRegistry, evaluateMeasurementFreshness, resolveNvpDisplay, resolveNvpMeasurement } = require(path.join(root, 'ems/services/measurement-freshness.js'));
const { DatapointRegistry } = require(path.join(root, 'ems/datapoints.js'));
const { CoreLimitsModule } = require(path.join(root, 'ems/modules/core-limits.js'));

function fresh(measurementAgeMs, heartbeatAgeMs, connected = true, extra = {}) {
  return evaluateMeasurementFreshness({ mapped: true, present: true, measurementAgeMs, heartbeatAgeMs, connected, ...extra }, {
    staleMs: 5000,
    heartbeatStaleMs: 5000,
    maxHeartbeatHoldMs: 60000,
  });
}

// connected=true ist nur Health, kein Frische-Ersatz.
assert.strictEqual(fresh(20000, null, true).fresh, false, 'connected=true darf einen alten Messwert nicht frisch machen');
assert.strictEqual(fresh(1000, null, false).fresh, false, 'connected=false muss auch einen frischen Messwert sperren');
assert.strictEqual(fresh(20000, 1000, true).fresh, true, 'frischer Heartbeat darf einen unveränderten Wert innerhalb der Haltezeit bestätigen');
assert.strictEqual(fresh(120000, 1000, true).fresh, false, 'Heartbeat darf einen Messwert nicht unbegrenzt frisch halten');

const coherent = resolveNvpMeasurement({
  import: { mapped: true, value: 1500, sampleTs: 100000, freshness: fresh(1000, 1000) },
  export: { mapped: true, value: 200, sampleTs: 101000, freshness: fresh(1000, 1000) },
  maxSkewMs: 5000,
});
assert.strictEqual(coherent.netW, 1300);
assert.strictEqual(coherent.coherent, true);

const skewed = resolveNvpMeasurement({
  import: { mapped: true, value: 1500, sampleTs: 110000, freshness: fresh(1000, 1000) },
  export: { mapped: true, value: 5000, sampleTs: 90000, freshness: fresh(1000, 1000) },
  maxSkewMs: 5000,
});
assert.strictEqual(skewed.netW, 1500, 'alter Export-Gegenkanal muss bei neuem Import auf 0 W gesetzt werden');
assert.strictEqual(skewed.source, 'split-newer-import');
assert.strictEqual(skewed.degraded, true);

const now = Date.now();
const foreignStates = new Map([
  ['nexowatt-devices.0.devices.meter.r.power', { val: 0, ts: now - 30000, lc: now - 30000, ack: true }],
  ['nexowatt-devices.0.devices.meter.comm.connected', { val: true, ts: now - 50, lc: now - 50000, ack: true }],
]);
const adapter = {
  log: { warn() {}, debug() {}, info() {}, error() {} },
  async getForeignObjectAsync() { return null; },
  async subscribeForeignStatesAsync() {},
  async getForeignStateAsync(id) { return foreignStates.get(id) || null; },
};

(async () => {
  const registry = new DatapointRegistry(adapter, []);
  await registry.init();
  await registry.upsert({
    key: 'meter.power',
    objectId: 'nexowatt-devices.0.devices.meter.r.power',
    dataType: 'number',
    direction: 'in',
    unit: 'W',
    useAliveForStale: true,
  });
  assert.strictEqual(registry.getConnectionStatus('meter.power'), true);
  assert.ok(registry.getMeasurementAgeMs('meter.power') >= 25000, 'Messwertalter muss original erhalten bleiben');
  assert.ok(registry.getAgeMs('meter.power') >= 25000, 'connected=true darf getAgeMs nicht auf 0 setzen');

  registry.handleStateChange('nexowatt-devices.0.devices.meter.r.voltageL1', { val: 230, ts: Date.now(), lc: Date.now(), ack: true });
  assert.ok(registry.getAliveAgeMs('meter.power') < 1000, 'echtes Geräteereignis muss als Heartbeat sichtbar sein');
  assert.ok(registry.getAgeMs('meter.power') < 1000, 'Heartbeat darf unveränderten Wert vorübergehend bestätigen');

  const fakeRegistry = {
    getEntry(key) { return ['vis.gridBuyW', 'vis.gridSellW', 'cm.gridConnected'].includes(key) ? { objectId: key } : null; },
    getRaw(key) { return key === 'cm.gridConnected' ? true : null; },
    getNumber(key) { return key === 'vis.gridBuyW' ? 1200 : (key === 'vis.gridSellW' ? 4000 : null); },
    getAgeMs(key) { return key === 'vis.gridBuyW' ? 500 : 20000; },
    getMeasurementAgeMs(key) { return this.getAgeMs(key); },
    getMeasurementTimestampMs(key) { return Date.now() - this.getAgeMs(key); },
    getAliveAgeMs() { return null; },
    getConnectionStatus() { return true; },
  };
  const registrySnapshot = buildNvpSnapshotFromRegistry({ registry: fakeRegistry, staleMs: 5000, maxSkewMs: 5000 });
  assert.strictEqual(registrySnapshot.netW, 1200, 'staler Exportkanal darf den frischen Import nicht verrechnen');
  assert.strictEqual(registrySnapshot.source, 'split-import-only');

  const display = resolveNvpDisplay({
    maxAgeMs: 15000,
    canonicalKnown: true,
    canonicalFresh: false,
    canonicalNetW: 9999,
    canonicalStatus: 'stale',
    gridNetRaw: 5000,
    gridBuyRaw: 5000,
    gridSellRaw: 0,
    gridBuyTs: Date.now(),
    gridSellTs: Date.now(),
    gridBuyMapped: true,
    gridSellMapped: true,
    gridNetMapped: true,
  });
  assert.strictEqual(display.hasGrid, false, 'bekannt staler kanonischer NVP darf im Energiefluss nicht durch alte Fallbacks wiederaufleben');

  const normalizedSplitDisplay = resolveNvpDisplay({
    maxAgeMs: 15000,
    canonicalKnown: false,
    canonicalFresh: null,
    canonicalNetW: null,
    gridNetRaw: null,
    gridBuyRaw: 3000,
    gridSellRaw: 1000,
    gridBuyTs: Date.now(),
    gridSellTs: Date.now(),
    gridBuyMapped: true,
    gridSellMapped: true,
    gridNetMapped: false,
  });
  assert.strictEqual(normalizedSplitDisplay.gridNetRaw, 2000, 'gleichzeitige Split-Kanaele muessen als signierter Nettofluss aufgeloest werden');
  assert.strictEqual(normalizedSplitDisplay.gridBuyW, 2000, 'History/LIVE darf nur den Netto-Netzbezug darstellen');
  assert.strictEqual(normalizedSplitDisplay.gridSellW, 0, 'History/LIVE darf nicht gleichzeitig Einspeisung darstellen');
  assert(String(normalizedSplitDisplay.src).includes('net-normalized'), 'Diagnose muss die Split-Normalisierung ausweisen');

  const engine = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/engine.ts'), 'utf8');
  const charging = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/charging-management.ts'), 'utf8');
  const coreLimits = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/core-limits.ts'), 'utf8');
  const gridConstraints = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/grid-constraints.ts'), 'utf8');
  const peakShaving = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/peak-shaving.ts'), 'utf8');
  const storageControl = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/storage-control.ts'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/main.ts'), 'utf8');
  assert.ok(engine.includes("require('./services/measurement-freshness')"), 'EMS-Engine muss den zentralen Frische-Resolver verwenden');
  assert.ok(engine.includes('_nvpFreshnessSnapshot'), 'EMS-Engine muss den kanonischen NVP-Snapshot veröffentlichen');
  assert.ok(charging.includes('resolveCurrentNvpSnapshot(this.adapter && this.adapter._nvpFreshnessSnapshot'), 'Lademanagement muss denselben NVP-Snapshot verwenden');
  assert.ok(coreLimits.includes('gridMeasurementUsable ? Math.max(0, Math.min(gridHeadroomW, highLevelCapW)) : 0'), 'Zentrales Budget muss bei unbrauchbarem NVP auf 0 W fallen');
  assert.ok(gridConstraints.includes('resolveCurrentNvpSnapshot(this.adapter && this.adapter._nvpFreshnessSnapshot'), 'Netzconstraints müssen die zentrale NVP-Frische erzwingen');
  assert.ok(peakShaving.includes('const centralNvpCurrent'), 'Peak-Shaving muss die zentrale NVP-Auflösung verwenden');
  assert.ok(storageControl.includes('const centralNvpCurrent'), 'Speicherregelung muss die zentrale NVP-Auflösung verwenden');
  assert.ok(main.includes('resolveNvpDisplay({'), 'Energiefluss muss die zentrale NVP-Frische berücksichtigen');

  const makeCore = (snapshot) => new CoreLimitsModule({
    config: { chargingManagement: { staleTimeoutSec: 15 }, enableChargingManagement: true },
    stateCache: {},
    _nvpFreshnessSnapshot: snapshot,
    _nwResolveBatteryFlowFromCache() { return { chargeW: 0, dischargeW: 0 }; },
    log: { warn() {}, debug() {}, info() {}, error() {} },
  }, { getNumberFresh() { return null; } });
  const staleCore = makeCore({ ts: Date.now(), usable: false, status: 'stale', source: 'signed', reason: 'measurement-stale' });
  const staleBudget = staleCore._makeBudgetSnapshot(Date.now(), { grid: { gridImportLimitW_effective: 40000 }, evcsHighLevel: { capW: null } });
  assert.strictEqual(staleBudget.gates.total.effectiveW, 0, 'staler NVP muss das zentrale Gesamtbudget sicher sperren');
  assert.strictEqual(staleBudget.gates.pv.effectiveW, 0, 'staler NVP darf kein PV-Budget freigeben');
  assert.strictEqual(staleBudget.gates.grid.measurementUsable, false);

  const freshCore = makeCore({ ts: Date.now(), usable: true, status: 'ok', source: 'signed', reason: 'measurement-fresh', netW: 2000, measurementAgeMs: 500 });
  const freshBudget = freshCore._makeBudgetSnapshot(Date.now(), { grid: { gridImportLimitW_effective: 40000 }, evcsHighLevel: { capW: null } });
  assert.strictEqual(freshBudget.gates.total.effectiveW, 38000, 'frischer 2-kW-Bezug muss bei 40-kW-Limit 38 kW Headroom ergeben');
  assert.strictEqual(freshBudget.gates.grid.measurementUsable, true);

  console.log('[measurement-freshness-stage-b] OK: Connected/Heartbeat/Messwert sind getrennt und Split-NVP wird zeitlich kohärent aufgelöst.');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
