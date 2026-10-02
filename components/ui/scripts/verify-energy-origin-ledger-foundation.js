#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const svc = require(path.join(root, 'ems/services/energy-origin-accounting.js'));
function meterSamples(config, startValues, deltas, startTs = 0, endTs = 900000) {
  const start = {}; const end = {};
  for (const meter of config.meters) {
    const base = Number(startValues[meter.role] ?? startValues[meter.id] ?? 100);
    const delta = Number(deltas[meter.role] ?? deltas[meter.id] ?? 0);
    start[meter.id] = { meterId: meter.id, role: meter.role, dpId: meter.dpId, chargePointId: meter.chargePointId || '', valueKwh: base, rawValue: base, ts: startTs, lc: startTs, ack: true, valid: true, unit: meter.unit, factor: meter.factor };
    end[meter.id] = { ...start[meter.id], valueKwh: base + delta, rawValue: base + delta, ts: endTs, lc: endTs };
  }
  return { start, end };
}
function baseRaw(extra = {}) {
  return { origin: {
    enabled: true,
    intervalMinutes: 15,
    dataPoints: {
      gridImportEnergyKwh: 'meter.grid.import', gridExportEnergyKwh: 'meter.grid.export', pvGenerationEnergyKwh: 'meter.pv', storageChargeEnergyKwh: 'meter.storage.charge', storageDischargeEnergyKwh: 'meter.storage.discharge',
    },
    chargePoints: [{ id: 'lp1', energyMeterKwhId: 'meter.ev.lp1', publiclyAccessible: true, meteringComplianceDeclared: true, meterIntegrated: true }],
    storage: { chargeEfficiencyPct: 100, dischargeEfficiencyPct: 100, exclusiveRenewableChargingDeclared: true },
    evidence: { sameGridConnectionDeclared: true, meteringComplianceDeclared: true, publicChargingDeclared: true, sameWozObjectDeclared: true, noOperatingSubsidyDeclared: true, integratedMidMeterDeclared: true, operatorType: 'business', nlGridRenewableSharePct: 50.5 },
    ...extra,
  }};
}
// Home/Pro availability and limits.
const home = svc.normalizeOriginConfig(baseRaw({ chargePoints: [1,2,3,4,5].map(i => ({ id:`lp${i}`, energyMeterKwhId:`ev.${i}` })) }), 'home');
assert.equal(home.edition, 'home'); assert.equal(home.maxSites, 1); assert.equal(home.chargePoints.length, 3);
const pro = svc.normalizeOriginConfig(baseRaw({ chargePoints: [1,2,3,4,5].map(i => ({ id:`lp${i}`, energyMeterKwhId:`ev.${i}` })) }), 'pro');
assert.equal(pro.edition, 'pro'); assert.equal(pro.chargePoints.length, 5);
assert.equal(home.intervalMinutes, 15);
// Direct PV/grid allocation.
const cfg = svc.normalizeOriginConfig(baseRaw(), 'home');
let samples = meterSamples(cfg, {}, { 'grid-import-energy': 1, 'grid-export-energy': 0, 'pv-generation-energy': 5, 'storage-charge-energy': 1, 'storage-discharge-energy': 0, 'evcs-delivery-energy': 3 });
let result = svc.calculateOriginInterval({ config: cfg, startSamples: samples.start, endSamples: samples.end, storageInventory: svc.emptyStorageInventory(cfg.storage), previousHash: '', startTs: 0, endTs: 900000, edition: 'home' });
assert.equal(result.interval.quality.status, 'complete');
assert.equal(result.interval.evcs.totalKwh, 3);
assert.equal(result.interval.evcs.chargePoints[0].chargePointId, 'lp1');
assert.equal(result.interval.evcs.chargePoints[0].label, 'lp1');
assert.equal(result.interval.evcs.chargePoints[0].stationId, 'station_1');
assert.equal(result.interval.evcs.chargePoints[0].connectorNo, 1);
assert.equal(result.interval.evcs.chargePoints[0].publiclyAccessible, true);
assert.equal(result.interval.evcs.chargePoints[0].meteringComplianceDeclared, true);
assert.ok(result.interval.evcs.sourceBreakdown.pvDirectKwh > 0);
assert.ok(result.interval.evcs.sourceBreakdown.gridDirectKwh > 0);
assert.equal(result.interval.evidence.de.ready, true);
assert.equal(result.interval.evidence.nl.ready, true);
// Stored PV carries into next interval.
const inventoryAfterPvCharge = result.storageInventory;
samples = meterSamples(cfg, {}, { 'grid-import-energy': 1, 'grid-export-energy': 0, 'pv-generation-energy': 0, 'storage-charge-energy': 0, 'storage-discharge-energy': 0.5, 'evcs-delivery-energy': 1 }, 900000, 1800000);
const result2 = svc.calculateOriginInterval({ config: cfg, startSamples: samples.start, endSamples: samples.end, storageInventory: inventoryAfterPvCharge, previousHash: result.interval.hash, startTs: 900000, endTs: 1800000, edition: 'home' });
assert.equal(result2.interval.previousHash, result.interval.hash);
assert.notEqual(result2.interval.hash, result.interval.hash);
assert.ok(result2.interval.evcs.sourceBreakdown.storedPvKwh > 0);
assert.ok(result2.interval.evidence.de.storedRenewableKwh > 0);
// Storage discharge and simultaneous PV must never be double-counted on EVCS.
const cfgNoDouble = svc.normalizeOriginConfig(baseRaw({
  allocationMethod: 'proportional',
  dataPoints: {
    gridImportEnergyKwh: 'meter.grid.import', gridExportEnergyKwh: 'meter.grid.export', pvGenerationEnergyKwh: 'meter.pv',
    buildingEnergyKwh: 'meter.building', storageChargeEnergyKwh: 'meter.storage.charge', storageDischargeEnergyKwh: 'meter.storage.discharge',
  },
}), 'home');
samples = meterSamples(cfgNoDouble, {}, { 'grid-import-energy': 0, 'grid-export-energy': 0, 'pv-generation-energy': 1, 'building-load-energy': 0, 'storage-charge-energy': 0, 'storage-discharge-energy': 1, 'evcs-delivery-energy': 1 });
const noDouble = svc.calculateOriginInterval({ config: cfgNoDouble, startSamples: samples.start, endSamples: samples.end, storageInventory: { schema: svc.ORIGIN_INVENTORY_VERSION, pvKwh: 1, otherRenewableKwh: 0, gridKwh: 0, unknownKwh: 0, totalKwh: 1, updatedAt: 0 }, previousHash: '', startTs: 0, endTs: 900000, edition: 'home' });
const noDoubleSources = Object.values(noDouble.interval.evcs.chargePoints[0].sources).reduce((a,b) => a + Number(b || 0), 0);
assert.ok(Math.abs(noDoubleSources - 1) < 0.00001, `EVCS source sum must equal measured energy, got ${noDoubleSources}`);
// Conservative EVCS-last allocates local renewable to building before EVCS.
const cfgConservative = svc.normalizeOriginConfig(baseRaw({
  allocationMethod: 'conservative-evcs-last',
  dataPoints: {
    gridImportEnergyKwh: 'meter.grid.import', gridExportEnergyKwh: 'meter.grid.export', pvGenerationEnergyKwh: 'meter.pv',
    buildingEnergyKwh: 'meter.building', storageChargeEnergyKwh: 'meter.storage.charge', storageDischargeEnergyKwh: 'meter.storage.discharge',
  },
}), 'home');
samples = meterSamples(cfgConservative, {}, { 'grid-import-energy': 1, 'grid-export-energy': 0, 'pv-generation-energy': 1, 'building-load-energy': 1, 'storage-charge-energy': 0, 'storage-discharge-energy': 0, 'evcs-delivery-energy': 1 });
const conservative = svc.calculateOriginInterval({ config: cfgConservative, startSamples: samples.start, endSamples: samples.end, storageInventory: svc.emptyStorageInventory(cfgConservative.storage), previousHash: '', startTs: 0, endTs: 900000, edition: 'home' });
assert.ok(Number(conservative.interval.evcs.sourceBreakdown.gridDirectKwh || 0) > 0.99);
assert.ok(Number(conservative.interval.evcs.sourceBreakdown.pvDirectKwh || 0) < 0.01);
// Mixed/non-exclusive storage remains operationally visible but is excluded from formal DE stored renewable candidate.
const cfgMixed = svc.normalizeOriginConfig(baseRaw({ storage: { chargeEfficiencyPct: 100, dischargeEfficiencyPct: 100, exclusiveRenewableChargingDeclared: false } }), 'home');
const mixedInventory = { schema: svc.ORIGIN_INVENTORY_VERSION, pvKwh: 1, otherRenewableKwh: 0, gridKwh: 1, unknownKwh: 0, totalKwh: 2, updatedAt: 0 };
samples = meterSamples(cfgMixed, {}, { 'grid-import-energy': 1, 'grid-export-energy': 0, 'pv-generation-energy': 0, 'storage-charge-energy': 0, 'storage-discharge-energy': 1, 'evcs-delivery-energy': 1 });
const mixed = svc.calculateOriginInterval({ config: cfgMixed, startSamples: samples.start, endSamples: samples.end, storageInventory: mixedInventory, previousHash: '', startTs: 0, endTs: 900000, edition: 'home' });
assert.ok(mixed.interval.evcs.sourceBreakdown.storedPvKwh > 0);
assert.equal(mixed.interval.evidence.de.storedRenewableKwh, 0);
assert.ok(mixed.interval.evidence.de.reasonCodes.includes('storage-not-exclusive-renewable'));
// Counter reset is invalid, never silently estimated.
assert.equal(svc.deltaFromSamples({ valid:true, valueKwh:10 }, { valid:true, valueKwh:9 }).reason, 'counter-reset');
// Hash chain and canonical stability.
assert.equal(svc.hashObject({ b:2, a:1 }), svc.hashObject({ a:1, b:2 }));
// Static read-only contract: no foreign writes in the accounting, runtime, API or AppCenter layers.
const moduleText = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/energy-ledger.ts'), 'utf8');
const serviceText = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/services/energy-origin-accounting.ts'), 'utf8');
const runtimeText = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/services/energy-origin-ledger-runtime.ts'), 'utf8');
const apiText = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/lib/energy-origin-api.ts'), 'utf8');
const appCenterText = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/www/energy-origin-appcenter.ts'), 'utf8');
const apiRuntime = require(path.join(root, 'lib/energy-origin-api.js'));
assert.equal(/setForeignState|setForeignObject|sendToHost/.test(moduleText + serviceText + runtimeText + apiText + appCenterText), false);
assert.ok(runtimeText.includes('energyLedger.origin.intervalsRecentJson'));
assert.ok(runtimeText.includes('energyLedger.origin.configHistoryJson'));
assert.ok(runtimeText.includes('getForeignStateAsync'));
assert.ok(runtimeText.includes('Nachweiskandidat; keine automatische behördliche Anerkennung oder Vergütungszusage.'));
const html = fs.readFileSync(path.join(root, 'www/ems-apps.html'), 'utf8');
assert.ok(html.includes('Energieherkunft &amp; Ladebilanz'));
assert.ok(html.includes('ledgerGridImportDp'));
assert.ok(html.includes('ledgerChargePoints'));
const mainText = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/main.ts'), 'utf8');
assert.ok(mainText.includes('registerEnergyOriginApi'));
assert.ok(mainText.includes('hasEnergyLedger: energyLedgerEnabledEffective'));
assert.ok(mainText.includes('isEnabled: _nwEnergyOriginAppEnabled'));
assert.ok(apiText.includes('/api/ledger/energy-origin.csv'));
assert.ok(apiText.includes('/ledger/energy-origin'));
assert.ok(apiText.includes('app_not_active'));
assert.ok(apiText.includes("if (!isLicensed() || !appIsEnabled()) return res.redirect(302, '/');"));

// Route-Level-Gate: Direkt-URL darf die optionale Betreiberseite nur bei
// installierter+aktivierter App und gültiger Lizenz ausliefern.
function capturePageRoute(licensed, enabled) {
  const routes = [];
  const fakeApp = { get(paths, handler) { routes.push({ paths, handler }); } };
  apiRuntime.registerEnergyOriginApi({
    app: fakeApp, rootDir: root, sendNoStore() {},
    isLicensed: () => licensed, isEnabled: () => enabled,
    readJson: (_id, fallback) => fallback, readState: (_id, fallback) => fallback,
    csvEscape: value => String(value == null ? '' : value),
  });
  return routes.find(row => Array.isArray(row.paths) && row.paths.includes('/ledger/energy-origin'));
}
function runPageRoute(licensed, enabled) {
  const route = capturePageRoute(licensed, enabled);
  assert.ok(route, 'energy-origin page route missing');
  const out = { redirect: null, file: null, noStore: false };
  const res = {
    redirect(code, target) { out.redirect = [code, target]; return this; },
    sendFile(file) { out.file = file; return this; },
  };
  route.handler({}, res);
  return out;
}
function isEnergyLedgerPage(file) {
  return String(file || '').replace(/\\/g, '/').endsWith('/www/energy-ledger.html');
}
assert.deepEqual(runPageRoute(true, false).redirect, [302, '/']);
assert.deepEqual(runPageRoute(false, true).redirect, [302, '/']);
assert.ok(isEnergyLedgerPage(runPageRoute(true, true).file));
assert.ok(isEnergyLedgerPage('C:\\NexoWatt-ui\\www\\energy-ledger.html'), 'Windows-Pfade müssen im Release-Test akzeptiert werden.');
assert.ok(apiText.includes('cp.energyKwh !== undefined ? cp.energyKwh : cp.totalKwh'));
const cockpitText = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/www/cockpit-shell.ts'), 'utf8');
const ledgerHtml = fs.readFileSync(path.join(root, 'www/energy-ledger.html'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'www/index.html'), 'utf8');
assert.ok(cockpitText.includes('tabEnergyLedger'));
assert.ok(cockpitText.includes('menuEnergyLedgerLink'));
assert.ok(cockpitText.includes('fv.hasEnergyLedger === true'));
assert.ok(ledgerHtml.includes('nw-page-energy-ledger'));
assert.ok(ledgerHtml.includes('nw-feature-gated'));
assert.ok(ledgerHtml.includes('id="tabEnergyLedger"'));
assert.ok(ledgerHtml.includes('/static/cockpit-shell.js'));
assert.ok(indexHtml.includes('/static/cockpit-shell.js'));
const ledgerViewText = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/www/energy-origin-ledger-view.ts'), 'utf8');
const stylesText = fs.readFileSync(path.join(root, 'www/styles.css'), 'utf8');
assert.ok(ledgerViewText.includes('cfg.featureVisibility.hasEnergyLedger === true'));
assert.ok(ledgerViewText.includes("payload.error === 'app_not_active'"));
assert.ok(stylesText.includes('.menu-item.hidden'));
assert.ok(stylesText.includes('display:none !important'));
console.log('[energy-origin-ledger] OK: Home/Pro, 15-min accounting, storage provenance, evidence candidates, hash chain, read-only contract and AppCenter-gated frontend page verified.');
