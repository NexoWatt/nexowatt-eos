#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const strategyRuntime = require(path.join(root, 'ems/services/operating-strategy-runtime.js'));
const { OperatingStrategiesModule } = require(path.join(root, 'ems/modules/operating-strategies.js'));

function liveAdapter(runtimeOverrides = {}, linkOverrides = {}) {
  const now = Date.now();
  const link = {
    sourceId: 'evcs:lp1',
    enabled: true,
    controlMode: 'active',
    commissioningConfirmed: true,
    writeEnabled: true,
    autoSource: 'strategy',
    fallback: 'standardAuto',
    ...linkOverrides,
  };
  return {
    config: {
      emsApps: { apps: { operatingStrategies: { installed: true, enabled: true } } },
      operatingStrategies: {
        enabled: true,
        mode: 'active',
        commissioningConfirmed: true,
        controlTakeoverEnabled: true,
        writeExecutionEnabled: true,
        autoControl: { enabled: true, stage: 'active', requestTtlSeconds: 15, fallback: 'standardAuto' },
        resourceLinks: [link],
      },
    },
    _nwOperatingStrategyRuntime: {
      schemaVersion: 3,
      version: 3,
      appEnabled: true,
      activeControl: true,
      controlReason: 'live-control-active',
      resourceAliases: { 'evcs:lp1': 'evcs:lp1' },
      requestsByResource: {
        'evcs:lp1': {
          version: 3,
          selected: true,
          controlEligible: true,
          issuedAt: now - 500,
          expiresAt: now + 15000,
          action: 'charge-to-soc',
          requestedPowerW: 8000,
          minPowerW: 4200,
          maxPowerW: 11000,
          targetSocPct: 70,
          reason: 'Fahrzeugziel 70 % bis 12:00 Uhr',
        },
      },
      storageOverlaysByResource: {},
      decisionsByResource: {},
      ...runtimeOverrides,
    },
  };
}

// 1. Shared single-writer contract: only native Fachmodule receive fresh overlays.
{
  const adapter = liveAdapter();
  let overlay = strategyRuntime.resolveChargingStrategyOverlay(adapter, ['evcs:lp1'], {
    userMode: 'auto',
    autoSource: 'strategy',
  });
  assert.equal(overlay.active, true);
  assert.equal(overlay.targetPowerW, 8000);
  assert.equal(overlay.targetSocPct, 70);

  overlay = strategyRuntime.resolveChargingStrategyOverlay(adapter, ['evcs:lp1'], {
    userMode: 'boost',
    autoSource: 'strategy',
  });
  assert.equal(overlay.eligible, false);
  assert.equal(overlay.active, false);
  assert.equal(overlay.reason, 'charging-mode-not-auto');

  overlay = strategyRuntime.resolveChargingStrategyOverlay(adapter, ['evcs:lp1'], {
    userMode: 'auto',
    autoSource: 'standard',
  });
  assert.equal(overlay.active, false);
  assert.equal(overlay.reason, 'charging-auto-source-standard');

  const expired = liveAdapter({
    requestsByResource: {
      'evcs:lp1': {
        selected: true,
        controlEligible: true,
        issuedAt: Date.now() - 20000,
        expiresAt: Date.now() - 1,
        requestedPowerW: 8000,
      },
    },
  });
  overlay = strategyRuntime.resolveChargingStrategyOverlay(expired, ['evcs:lp1'], {
    userMode: 'auto',
    autoSource: 'strategy',
  });
  assert.equal(overlay.active, false);
  assert.equal(overlay.fallbackPause, false, 'standard fallback must restore the existing Auto controller');

  const pauseFallback = liveAdapter({
    requestsByResource: {},
  }, { fallback: 'pause' });
  overlay = strategyRuntime.resolveChargingStrategyOverlay(pauseFallback, ['evcs:lp1'], {
    userMode: 'auto',
    autoSource: 'strategy',
  });
  assert.equal(overlay.active, false);
  assert.equal(overlay.fallbackPause, true);
}

// 2. Storage reserve may only raise an existing floor; thermic/heating only in their Auto mode.
{
  const now = Date.now();
  const adapter = liveAdapter({
    resourceAliases: {
      'storage:primary': 'storage:primary',
      'thermal:1': 'thermal:1',
      'heatingRod:1': 'heatingRod:1',
    },
    requestsByResource: {
      'thermal:1': { selected: true, controlEligible: true, issuedAt: now - 100, expiresAt: now + 10000, action: 'pause', requestedPowerW: 0, reason: 'Nachtpause' },
      'heatingRod:1': { selected: true, controlEligible: true, issuedAt: now - 100, expiresAt: now + 10000, action: 'target-power', requestedPowerW: 2000, reason: 'Überschuss' },
    },
    storageOverlaysByResource: {
      'storage:primary': { selected: true, controlEligible: true, issuedAt: now - 100, expiresAt: now + 10000, minSocPct: 40, targetSocPct: 40, absoluteMinSocPct: 10, phase: 'day-protect', reason: 'Nachtreserve' },
    },
  });
  adapter.config.operatingStrategies.resourceLinks = [
    { sourceId: 'storage:primary', enabled: true, controlMode: 'active', commissioningConfirmed: true, writeEnabled: true },
    { sourceId: 'thermal:1', enabled: true, controlMode: 'active', commissioningConfirmed: true, writeEnabled: true },
    { sourceId: 'heatingRod:1', enabled: true, controlMode: 'active', commissioningConfirmed: true, writeEnabled: true },
  ];

  const storage = strategyRuntime.resolveStorageStrategyOverlay(adapter, ['storage:primary']);
  assert.equal(storage.active, true);
  assert.equal(storage.minSocPct, 40);
  assert.equal(Math.max(20, storage.minSocPct), 40, 'strategy reserve must never lower the existing storage floor');

  // Farm contract: an inactive first storage must not block a later, explicitly
  // commissioned storage overlay that shares the same storage controller.
  const farmAdapter = liveAdapter({
    resourceAliases: { 'storagefarm:1': 'storagefarm:1', 'storagefarm:2': 'storagefarm:2' },
    requestsByResource: {},
    storageOverlaysByResource: {
      'storagefarm:1': { selected: true, controlEligible: false, issuedAt: now - 100, expiresAt: now + 10000, minSocPct: 30, targetSocPct: 30, absoluteMinSocPct: 10 },
      'storagefarm:2': { selected: true, controlEligible: true, issuedAt: now - 100, expiresAt: now + 10000, minSocPct: 55, targetSocPct: 55, absoluteMinSocPct: 10 },
    },
  });
  farmAdapter.config.operatingStrategies.resourceLinks = [
    { sourceId: 'storagefarm:1', enabled: false, controlMode: 'observe', commissioningConfirmed: false, writeEnabled: false },
    { sourceId: 'storagefarm:2', enabled: true, controlMode: 'active', commissioningConfirmed: true, writeEnabled: true },
  ];
  const farmOverlay = strategyRuntime.resolveStorageStrategyOverlay(farmAdapter, ['storagefarm:1', 'storagefarm:2']);
  assert.equal(farmOverlay.active, true);
  assert.equal(farmOverlay.minSocPct, 55);

  assert.equal(strategyRuntime.resolveThermalStrategyOverlay(adapter, ['thermal:1'], { effectiveMode: 'manual' }).active, false);
  assert.equal(strategyRuntime.resolveThermalStrategyOverlay(adapter, ['thermal:1'], { effectiveMode: 'pvAuto' }).active, true);
  assert.equal(strategyRuntime.resolveHeatingRodStrategyOverlay(adapter, ['heatingRod:1'], { effectiveMode: 'manual' }).active, false);
  assert.equal(strategyRuntime.resolveHeatingRodStrategyOverlay(adapter, ['heatingRod:1'], { effectiveMode: 'pvAuto' }).maxPowerW, 2000);
}

// 3. Planner integration: fresh target-SoC creates a short-lived request but no hardware write.
(async () => {
  const now = Date.now();
  const ownStates = new Map([
    ['chargingManagement.wallboxes.lp1.actualPowerW', { val: 0, ts: now }],
    ['chargingManagement.wallboxes.lp1.online', { val: true, ts: now }],
    ['chargingManagement.wallboxes.lp1.vehicleDemandConfirmed', { val: true, ts: now }],
    ['chargingManagement.wallboxes.lp1.vehicleStateNormalized', { val: 'charging', ts: now }],
    ['chargingManagement.wallboxes.lp1.sessionEnergyKWh', { val: 0, ts: now }],
    ['evcs.1.vehicleSoc', { val: 30, ts: now }],
  ]);
  const writtenStates = new Map();
  const mapped = new Map();
  const objectValues = new Map([
    ['ev.1.power', 0],
    ['ev.1.status', 'charging'],
    ['ev.1.soc', 30],
    ['ev.1.online', true],
  ]);
  let hardwareWrites = 0;
  const dp = {
    async upsert(spec) { mapped.set(spec.key, spec.objectId); },
    getRaw(key, fallback = null) { return objectValues.has(mapped.get(key)) ? objectValues.get(mapped.get(key)) : fallback; },
    getNumber(key, fallback = null) { const value = this.getRaw(key, fallback); return Number.isFinite(Number(value)) ? Number(value) : fallback; },
    getAgeMs() { return 100; },
    writeNumber() { hardwareWrites += 1; return true; },
    writeBoolean() { hardwareWrites += 1; return true; },
  };
  const adapter = {
    config: {
      emsApps: { apps: { operatingStrategies: { installed: true, enabled: true }, charging: { installed: true, enabled: true } } },
      enableChargingManagement: true,
      settingsConfig: { evcsList: [{ enabled: true, key: 'lp1', name: 'Ladepunkt 1', powerId: 'ev.1.power', statusId: 'ev.1.status', vehicleSocId: 'ev.1.soc', onlineId: 'ev.1.online', setPowerWId: 'ev.1.set', minPowerW: 4200, maxPowerW: 11000, vehicleCapacityKWh: 60 }] },
      operatingStrategies: {
        enabled: true,
        mode: 'active',
        commissioningConfirmed: true,
        controlTakeoverEnabled: true,
        writeExecutionEnabled: true,
        autoControl: { enabled: true, stage: 'active', requestTtlSeconds: 15, fallback: 'standardAuto' },
        activeProfileId: 'winter',
        resourceLinks: [{ sourceId: 'evcs:lp1', enabled: true, controlMode: 'active', commissioningConfirmed: true, writeEnabled: true, autoSource: 'strategy', staleTimeoutSec: 30 }],
        profiles: [{ id: 'winter', enabled: true, nightReserve: { enabled: false } }],
        rules: [{
          id: 'vehicle-70', name: 'Fahrzeug 70 %', enabled: true, requirement: 'must', priority: 100, profileScope: 'active', targetResourceId: 'evcs:lp1', ruleType: 'targetSoc',
          schedule: { mode: 'continuous', weekdays: ['mon','tue','wed','thu','fri','sat','sun'] },
          target: { value: 70, dueTime: '12:00', dueDay: 'next-day', energySourcePolicy: 'pv-preferred' },
          safety: { requireFresh: true, requireOnline: true, blockOnAlarm: true },
          conditions: [], executionEnabled: true,
        }],
      },
    },
    async getStateAsync(id) { return ownStates.get(id) || null; },
    async setStateAsync(id, value) { writtenStates.set(id, value); },
    async setObjectNotExistsAsync() {},
    updateValue() {},
  };
  const planner = new OperatingStrategiesModule(adapter, dp);
  await planner.tick();
  const runtime = adapter._nwOperatingStrategyRuntime;
  assert.ok(runtime && runtime.activeControl === true);
  assert.equal(runtime.version, 3);
  assert.equal(runtime.hardwareWrites, 0);
  assert.equal(hardwareWrites, 0, 'planner must not call hardware DP writers');
  assert.ok(runtime.requestsByResource['evcs:lp1']);
  assert.equal(runtime.requestsByResource['evcs:lp1'].controlEligible, true);
  assert.ok(runtime.requestsByResource['evcs:lp1'].expiresAt > runtime.requestsByResource['evcs:lp1'].issuedAt);
  assert.equal(writtenStates.get('operatingStrategies.summary.hardwareWrites'), 0);

  // A stale SoC must block the target rule instead of reusing an old vehicle value.
  ownStates.set('evcs.1.vehicleSoc', { val: 30, ts: now - 120000 });
  dp.getAgeMs = (key) => mapped.get(key) === 'ev.1.soc' ? 120000 : 100;
  await planner.tick();
  assert.equal(Boolean(adapter._nwOperatingStrategyRuntime.requestsByResource['evcs:lp1']), false);
  assert.ok(adapter._nwOperatingStrategyRuntime.decisions.some((decision) => decision.headline === 'Messwerte veraltet' || decision.headline === 'SoC veraltet'));

  // 4. UI import: only active + mapped resources; compact rows by default.
  const uiCode = read('www/operating-strategies-appcenter.js');
  const context = vm.createContext({
    window: { NexoWattOperatingStrategiesRuleBuilder: {} },
    document: { getElementById: () => null, querySelectorAll: () => [] },
    console, Date, JSON, Math, Number, String, Boolean, Object, Array, Set, Map, RegExp,
  });
  vm.runInContext(uiCode, context, { filename: 'www/operating-strategies-appcenter.js' });
  const ui = context.window.NexoWattOperatingStrategiesAppCenter;
  assert.ok(ui && typeof ui.deriveExistingResources === 'function');
  const placeholders = Array.from({ length: 10 }, (_, index) => ({ enabled: false, name: `Thermisches Gerät ${index + 1}`, id: `placeholder-${index + 1}` }));
  const resources = ui.deriveExistingResources({
    emsApps: { apps: {
      charging: { installed: true, enabled: true },
      thermal: { installed: true, enabled: true },
      heatingrod: { installed: true, enabled: true },
      storage: { installed: false, enabled: false },
    } },
    enableChargingManagement: true,
    enableThermalControl: true,
    enableHeatingRodControl: true,
    settingsConfig: { evcsList: [
      { enabled: false, name: 'Inaktiver Ladepunkt', powerId: 'ev.off.power', setPowerWId: 'ev.off.set' },
      { enabled: true, name: 'Aktiver Ladepunkt', powerId: 'ev.on.power', setPowerWId: 'ev.on.set' },
    ] },
    thermal: { devices: [...placeholders, { enabled: true, slot: 1, name: 'Kühlhaus', temperatureReadId: 'cold.temp', switchWriteId: 'cold.enable' }] },
    heatingRod: { devices: [
      { enabled: false, slot: 2, name: 'Inaktiver Heizstab', stages: [{ writeId: 'rod.off.stage1' }] },
      { enabled: true, slot: 3, name: 'Aktiver Heizstab', stages: [{ writeId: 'rod.on.stage1' }] },
    ] },
    vis: { flowSlots: { consumers: [
      { enabled: true, name: 'Kühlhaus', consumerType: 'cooling', ctrl: {} },
      { enabled: false, name: 'Heizstab aus', consumerType: 'heatingRod', ctrl: {} },
      { enabled: true, name: 'Heizstab an', consumerType: 'heatingRod', ctrl: {} },
      { enabled: true, name: 'Pumpe', consumerType: 'generic', ctrl: { switchWriteId: 'pump.enable' } },
    ] } },
    datapoints: { consumer1Power: 'cold.power', consumer3Power: 'rod.power', consumer4Power: 'pump.power' },
  });
  const names = resources.map((entry) => entry.name);
  assert.ok(names.includes('Aktiver Ladepunkt'));
  assert.ok(names.includes('Kühlhaus'));
  assert.ok(names.includes('Aktiver Heizstab'));
  assert.ok(names.includes('Pumpe'));
  assert.equal(names.includes('Inaktiver Ladepunkt'), false);
  assert.equal(names.includes('Inaktiver Heizstab'), false);
  assert.equal(names.some((name) => /^Thermisches Gerät \d+$/.test(name)), false);
  assert.equal(resources.filter((entry) => entry.sourceId.startsWith('thermal:')).length, 1);
  assert.equal(resources.filter((entry) => entry.sourceId.startsWith('heatingRod:')).length, 1);
  assert.match(read('src-ts/runtime-executables/www/operating-strategies-appcenter.ts'), /<details class="nw-os-resource nw-os-compact"/);
  assert.match(read('src-ts/runtime-executables/www/operating-strategies-appcenter.ts'), /Optionale Strategiemesswerte \/ DP-Zuordnung/);

  const noInactiveModuleRows = ui.deriveExistingResources({
    emsApps: { apps: {
      thermal: { installed: true, enabled: false },
      heatingrod: { installed: false, enabled: false },
    } },
    enableThermalControl: true,
    enableHeatingRodControl: true,
    thermal: { devices: [{ enabled: true, slot: 1, temperatureReadId: 'cold.temp', switchWriteId: 'cold.enable' }] },
    heatingRod: { devices: [{ enabled: true, slot: 2, stages: [{ writeId: 'rod.stage1' }] }] },
    vis: { flowSlots: { consumers: [] } },
    datapoints: {},
  });
  assert.equal(noInactiveModuleRows.some((entry) => entry.sourceId.startsWith('thermal:') || entry.sourceId.startsWith('heatingRod:')), false, 'disabled apps must not leak device placeholders into the strategy app');

  // 5. Structural contracts: planner before consumers, no parallel direct writer.
  const manager = read('src-ts/runtime-executables/ems/module-manager.ts');
  assert.ok(manager.indexOf("key: 'operatingStrategies'") < manager.indexOf("key: 'chargingManagement'"));
  const plannerSource = read('src-ts/runtime-executables/ems/modules/operating-strategies.ts');
  assert.equal(/\b(?:writeNumber|writeBoolean|setForeignState(?:Async)?)\s*\(/.test(plannerSource), false);
  for (const file of [
    'src-ts/runtime-executables/ems/modules/charging-management.ts',
    'src-ts/runtime-executables/ems/modules/storage-control.ts',
    'src-ts/runtime-executables/ems/modules/thermal-control.ts',
    'src-ts/runtime-executables/ems/modules/heating-rod-control.ts',
  ]) {
    assert.match(read(file), /resolve(?:Charging|Storage|Thermal|HeatingRod)StrategyOverlay/);
  }
  const charging = read('src-ts/runtime-executables/ems/modules/charging-management.ts');
  assert.match(charging, /strategyOwnsAutoTarget|applyStrategyOverlay/,
    'Charging management must keep operating strategies inside the central Auto arbitration.');
  assert.equal(charging.includes('!(w.strategyOverlay && w.strategyOverlay.eligible === true)'), false, 'standard fallback must keep the existing Auto target logic');
  const main = read('src-ts/runtime-executables/main.ts');
  assert.match(main, /customResources:[\s\S]*normalizeCustomResource/);
  assert.match(main, /controlMode:\s*'observe',[\s\S]*writeEnabled:\s*false/);

  console.log('RC56 operating strategies field-test contracts passed.');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
