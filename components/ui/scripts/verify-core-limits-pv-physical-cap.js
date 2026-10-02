#!/usr/bin/env node
'use strict';

/**
 * Regression: Das zentrale PV-Budget muss zugleich
 * 1) den signierten NVP berücksichtigen,
 * 2) alle frischen direkten PV-Quellen konfliktfrei auflösen und
 * 3) ohne physikalischen PV-Beleg bei 0 W bleiben.
 *
 * Eine vorhandene 0-W-Quelle darf `derived.core.pv.totalW` nicht verdecken.
 * Umgekehrt dürfen alte EVCS-/Speicherwerte nachts kein PV-Budget erzeugen.
 */
const assert = require('assert');
const fs = require('fs');
const {
  CoreLimitsModule,
  computePvBudgetFlowRawW,
  resolvePvBudgetPhysicalCapW,
} = require('../ems/modules/core-limits');

function read(p) { return fs.readFileSync(p, 'utf8'); }
function must(file, needle) {
  const s = read(file);
  if (!s.includes(needle)) {
    console.error(`[pv-physical-cap] Missing in ${file}: ${needle}`);
    process.exit(1);
  }
}
function mustNot(file, needle) {
  const s = read(file);
  if (s.includes(needle)) {
    console.error(`[pv-physical-cap] Forbidden in ${file}: ${needle}`);
    process.exit(1);
  }
}

const ts = 'src-ts/runtime-executables/ems/modules/core-limits.ts';
const pkg = JSON.parse(read('package.json'));
assert(/^\d+\.\d+\.\d+$/.test(String(pkg.version || '')), 'package.json braucht eine gültige SemVer-Version');
must(ts, 'function computePvBudgetFlowRawW');
must(ts, 'function resolvePvBudgetPhysicalCapW');
must(ts, '_resolveDirectPvPower(maxAgeMs)');
must(ts, "'derived.core.pv.totalW'");
must(ts, 'const pvPhysicalResolution = resolvePvBudgetPhysicalCapW({');
must(ts, 'const pvBudgetRawW = gridMeasurementUsable ? Math.min(pvBudgetFlowRawW, pvPhysicalCapW) : 0;');
must(ts, 'const totalBudgetW = gridMeasurementUsable ? Math.max(0, Math.min(gridHeadroomW, highLevelCapW)) : 0;');
must(ts, 'ems.budget.pvBudgetPhysicalCapW');
must(ts, 'ems.budget.pvBudgetDirectSource');
must(ts, 'const flexibleFlowMaxAgeMs = Math.max(staleMs * 3, 45000);');
must(ts, "this._readCacheNumberFresh([\n            'chargingManagement.control.pvEvcsPhysicalPvManagedW'");
mustNot(ts, 'const pvBudgetFlowRawW = Math.max(0, gridExportW + flexUsedW + storageChargeW - storageDischargeW);');

// Eine frische 0-W-Registryquelle darf die gleichzeitig frische zentrale
// PV-Summe nicht verdecken. Es wird die höchste plausible Quelle gewählt,
// aber bewusst nichts addiert.
const now = Date.now();
const adapter = {
  config: {},
  stateCache: {
    'derived.core.pv.totalW': { value: 17700, ts: now },
    pvPower: { value: 0, ts: now },
    productionTotal: { value: 0, ts: now },
  },
};
const dp = {
  getNumberFresh(key, _maxAgeMs, fallback = null) {
    if (key === 'ps.pvW' || key === 'cm.pvPowerW') return 0;
    return fallback;
  },
};
const mod = new CoreLimitsModule(adapter, dp);
const direct = mod._resolveDirectPvPower(45000);
assert.strictEqual(direct.powerW, 17700, 'derived.core.pv.totalW muss eine parallele 0-W-Quelle überstimmen');
assert.strictEqual(direct.source, 'adapter-cache:derived.core.pv.totalW');


// Alte flexible Verbraucherwerte duerfen das zentrale PV-Budget nicht weiter
// aufblasen. Der Core verwendet sie nur innerhalb des endlichen Flow-Fensters.
const staleAdapter = {
  config: {},
  stateCache: {
    'chargingManagement.control.pvEvcsPhysicalPvManagedW': { value: 8100, ts: now - 120000 },
    'thermal.summary.budgetUsedW': { value: 3000, ts: now - 120000 },
    'heatingRod.summary.budgetUsedW': { value: 2000, ts: now - 120000 },
  },
};
const staleModule = new CoreLimitsModule(staleAdapter, null);
assert.strictEqual(
  staleModule._readCacheNumberFresh(['chargingManagement.control.pvEvcsPhysicalPvManagedW'], 45000, 0),
  0,
  'veraltete EVCS-PV-Leistung darf kein zentrales PV-Potential erzeugen',
);

const calc = ({ measuredPvW, measuredPvFresh, gridW, flexUsedW, storageChargeW, storageDischargeW, lastTrustedW = 0, lastTrustedAgeMs = null }) => {
  const flow = computePvBudgetFlowRawW({ gridW, flexUsedW, storageChargeW, storageDischargeW });
  const physical = resolvePvBudgetPhysicalCapW({
    measuredPvW,
    measuredPvFresh,
    flowRawW: flow,
    gridExportW: Math.max(0, -gridW),
    gridImportW: Math.max(0, gridW),
    activePvSinkW: Math.max(0, flexUsedW + storageChargeW),
    lastTrustedW,
    lastTrustedAgeMs,
    holdMs: 45000,
  });
  const raw = Math.min(flow, Math.max(0, Number(physical.capW) || 0));
  return { flow, physical, raw, clamped: Math.max(0, flow - raw) };
};

const night = calc({
  measuredPvW: 0,
  measuredPvFresh: true,
  gridW: -70,
  flexUsedW: 10970,
  storageChargeW: 0,
  storageDischargeW: 2460,
});
assert.strictEqual(night.flow, 8580);
assert.strictEqual(night.raw, 0, 'Frische 0-W-PV-Messung muss Ghost-PV-Budget verhindern');
assert.strictEqual(night.physical.source, 'no-physical-pv-evidence');

const day = calc({
  measuredPvW: 20000,
  measuredPvFresh: true,
  gridW: -5000,
  flexUsedW: 10000,
  storageChargeW: 0,
  storageDischargeW: 0,
});
assert.strictEqual(day.flow, 15000);
assert.strictEqual(day.raw, 15000, 'PV-Export plus reale flexible PV-Last muss rekonstruiert werden');

const customer = calc({
  measuredPvW: 17700,
  measuredPvFresh: true,
  gridW: -7400,
  flexUsedW: 0,
  storageChargeW: 3000,
  storageDischargeW: 0,
});
assert.strictEqual(customer.flow, 10400, '7,4 kW Export + 3,0 kW Speicherladung ergeben 10,4 kW flexibles PV-Potential');
assert.strictEqual(customer.raw, 10400, 'Direkte PV-Erzeugung darf den bilanzierten Kundenwert nicht auf 0 klemmen');

const importedWhileCharging = calc({
  measuredPvW: 17000,
  measuredPvFresh: true,
  gridW: 5900,
  flexUsedW: 8100,
  storageChargeW: 8400,
  storageDischargeW: 0,
});
assert.strictEqual(importedWhileCharging.flow, 10600, 'Netzbezug muss vom rekonstruierten PV-Budget abgezogen werden');
assert.strictEqual(importedWhileCharging.raw, 10600);


const freshZeroButRealExport = calc({
  measuredPvW: 0,
  measuredPvFresh: true,
  gridW: -2500,
  flexUsedW: 0,
  storageChargeW: 0,
  storageDischargeW: 0,
});
assert.strictEqual(freshZeroButRealExport.raw, 2500, 'Klarer NVP-Export darf trotz konfliktbehaftetem frischem 0-W-PV-DP nicht verschwinden');
assert.strictEqual(freshZeroButRealExport.physical.source, 'nvp-export-minimum-despite-zero-pv');

const fallbackExport = calc({
  measuredPvW: 0,
  measuredPvFresh: false,
  gridW: -2500,
  flexUsedW: 0,
  storageChargeW: 0,
  storageDischargeW: 0,
});
assert.strictEqual(fallbackExport.raw, 2500, 'Ohne PV-Mapping darf realer NVP-Export als physikalischer Fallback dienen');
assert.strictEqual(fallbackExport.physical.source, 'nvp-export-flow-fallback');

const trustedHold = calc({
  measuredPvW: 0,
  measuredPvFresh: true,
  gridW: 50,
  flexUsedW: 0,
  storageChargeW: 3000,
  storageDischargeW: 0,
  lastTrustedW: 10400,
  lastTrustedAgeMs: 5000,
});
assert.strictEqual(trustedHold.raw, 2950, 'Kurzer 0-Einspeise-Telemetrieversatz darf mit aktiver PV-Senke gehalten werden');
assert.strictEqual(trustedHold.physical.held, true);

console.log('[pv-physical-cap] OK: zentrale PV-Quellenauflösung, signierter NVP und physikalische Sicherheitsgrenzen sind konsistent.');
