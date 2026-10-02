#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildOverviewContract, AdminOverviewPublisher } = require('../ems/services/admin-overview-publisher');

const now = Date.UTC(2026, 7, 22, 13, 30, 0);
const stateCache = Object.create(null);
const put = (key, value, ts = now) => { stateCache[key] = { value, ts }; };
put('chargingManagement.wallboxCount', 2);
put('chargingManagement.control.active', true);
put('chargingManagement.control.status', 'active');
put('chargingManagement.control.mode', 'mixed');
put('chargingManagement.control.budgetW', 30000);
put('chargingManagement.control.usedW', 15300);
put('chargingManagement.control.remainingW', 14700);
put('chargingManagement.summary.totalPowerW', 4100);
put('chargingManagement.summary.totalTargetPowerW', 4200);
put('chargingManagement.summary.totalReservedPowerW', 4200);
put('chargingManagement.summary.lastUpdate', now - 1200);
put('chargingManagement.audit.snapshotJson', JSON.stringify({
  ts: now - 1200,
  status: 'limited',
  mode: 'mixed',
  activeLimiter: 'para14a',
  safetyStage: 'PARA14A',
  safetyActive: true,
  problemCount: 0,
  budgetW: 30000,
  actualPowerW: 4100,
  targetPowerW: 4200,
  reservedPowerW: 4200,
  remainingPowerW: 14700,
  wallboxes: [
    { safe: 'lp1', name: 'Hof 1', userMode: 'auto', online: true, connected: true, charging: true, actualPowerW: 4100, targetPowerW: 4200, requestedPowerW: 11000, limiter: 'para14a', reason: '§14a fallback' },
    { safe: 'lp2', name: 'Hof 2', userMode: 'auto', online: true, connected: true, charging: false, actualPowerW: 0, targetPowerW: 0, requestedPowerW: 0, limiter: 'no-charge-demand', reason: 'Fahrzeug fordert keine Energie' },
  ],
}));
put('chargingManagement.audit.recentEventsJson', JSON.stringify([{ ts: now - 5000, type: 'wallbox', severity: 'warn', safe: 'lp1', name: 'Hof 1', limiter: 'para14a', actualPowerW: 4100, targetPowerW: 4200, message: 'Soll 11000→4200 W', reason: '§14a' }]));
put('ems.budget.pvBudgetW', 6200);
put('ems.budget.remainingPvW', 2000);
put('para14a.active', true);
put('para14a.communicationFallbackActive', true);
put('para14a.communicationFallbackReason', 'gateway-heartbeat-stale');
put('para14a.fallbackEvcsCapW', 4200);
put('para14a.signalFresh', false);
put('speicher.regelung.aktiv', true);
put('speicher.regelung.aktivKonfig', true);
put('speicher.regelung.topologie', 'farm');
put('speicher.regelung.socPct', 63);
put('speicher.regelung.sollW', -2500);
put('speicher.regelung.acceptedSollW', -2500);
put('speicher.regelung.batteryPowerFeedbackMeasuredW', -2400);
put('speicher.regelung.schreibOk', true);
put('speicher.regelung.grund', 'Eigenverbrauch');
put('tarif.aktiv', true);
put('tarif.state', 'guenstig');
put('tarif.currentPriceFresh', true);
put('tarif.preisAktuellEurProKwh', 0.22);
put('forecast.effective.source', 'open-meteo');
put('forecast.effective.fresh', true);
put('forecast.effective.powerNowW', 5200);
put('forecast.effective.energy6hWh', 18400);
put('peakShaving.control.status', 'inactive');

const adapter = { stateCache, version: '0.8.198', config: { port: 8188 } };
const contract = buildOverviewContract(adapter, now);
assert.equal(contract.schemaVersion, 1);
assert.equal(contract.available, true);
assert.equal(contract.status, 'warning');
assert.match(contract.headline, /§14a/);
assert.equal(contract.budget.totalW, 30000);
assert.equal(contract.budget.remainingW, 14700);
assert.equal(contract.budget.remainingPvW, 2000);
assert.equal(contract.charging.activeCount, 1);
assert.equal(contract.charging.waitingCount, 1);
assert.equal(contract.charging.wallboxes[0].name, 'Hof 1');
assert.equal(contract.storage.topology, 'farm');
assert.equal(contract.storage.actualW, -2400);
assert.equal(contract.storage.targetW, -2500);
assert.equal(contract.para14a.communicationFallbackActive, true);
assert.equal(contract.para14a.fallbackCapW, 4200);
assert.equal(contract.forecast.source, 'open-meteo');
assert.equal(contract.details.port, 8188);

// Missing optional modules must produce a valid compact contract without empty errors.
const minimal = buildOverviewContract({ stateCache: {}, version: '0.8.198', config: { port: 8188 } }, now);
assert.equal(minimal.available, true);
assert.equal(minimal.charging.available, false);
assert.equal(minimal.storage.available, false);
assert.equal(minimal.tariff.available, false);
assert.equal(minimal.forecast.available, false);
assert.equal(minimal.status, 'ok');

// Publisher is diagnosis-only: every write must stay inside info.adminOverview.*.
const writes = [];
const objects = [];
const mockAdapter = {
  ...adapter,
  namespace: 'nexowatt-ui.0',
  _nwShuttingDown: false,
  subscribeForeignStatesAsync: async () => undefined,
  setObjectNotExistsAsync: async (id) => { objects.push(id); },
  getStateAsync: async (id) => ({ val: stateCache[id] ? stateCache[id].value : null, ts: now }),
  setStateAsync: async (id, payload) => { writes.push([id, payload]); },
  updateValue: (id, value, ts) => { stateCache[id] = { value, ts }; },
  _nwSetInterval: () => ({ fake: true }),
  _nwClearInterval: () => undefined,
};
(async () => {
  const publisher = new AdminOverviewPublisher(mockAdapter);
  await publisher.initialize();
  publisher.stop();
  assert(objects.includes('info.adminOverview'));
  assert(writes.length >= 6);
  assert(writes.every(([id]) => String(id).startsWith('info.adminOverview.')));
  const summaryWrite = writes.find(([id]) => id === 'info.adminOverview.summaryJson');
  assert(summaryWrite);
  assert.equal(JSON.parse(summaryWrite[1].val).schemaVersion, 1);

  const source = fs.readFileSync(path.join(__dirname, '..', 'src-ts', 'runtime-executables', 'ems', 'services', 'admin-overview-publisher.ts'), 'utf8');
  assert.doesNotMatch(source, /setForeignState|setStateAsync\(['"](?:chargingManagement|speicher|para14a|ems\.)/);
  const main = fs.readFileSync(path.join(__dirname, '..', 'src-ts', 'runtime-executables', 'main.ts'), 'utf8');
  assert.match(main, /new AdminOverviewPublisher\(this\)/);
  assert.match(main, /_adminOverviewPublisher\.stop\(\)/);
  console.log('[RC73] OK: read-only EMS overview contract, optional-module fallback and lifecycle verified.');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
