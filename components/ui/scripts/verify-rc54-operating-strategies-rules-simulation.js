#!/usr/bin/env node
'use strict';

/**
 * RC54: Modularer Regelbaukasten und schreibfreier Trockenlauf.
 *
 * Prüft Schema v2, Muss-/Soll-/Kann-Kaskade, Zeitpläne, Nachtreserve,
 * thermische Fail-Safes und die migrationssicheren RC54-Defaults.
 * Ab RC56 darf ausschließlich der zentrale Planer von freigegebenen Fachmodulen
 * konsumiert werden; direkte Hardware-Schreibpfade bleiben weiterhin verboten.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const appTsPath = 'src-ts/runtime-executables/www/operating-strategies-appcenter.ts';
const builderTsPath = 'src-ts/runtime-executables/www/operating-strategies-rule-builder.ts';
const appJsPath = 'www/operating-strategies-appcenter.js';
const builderJsPath = 'www/operating-strategies-rule-builder.js';

for (const file of [appTsPath, builderTsPath, appJsPath, builderJsPath]) {
  assert.ok(fs.existsSync(path.join(root, file)), `${file} fehlt`);
}

const appTs = read(appTsPath);
const builderTs = read(builderTsPath);
const appJs = read(appJsPath);
const builderJs = read(builderJsPath);
const html = read('www/ems-apps.html');
const mainTs = read('src-ts/runtime-executables/main.ts');
const pkg = JSON.parse(read('package.json'));

// 1. Laufzeitintegration: Regelbaukasten muss vor der AppCenter-Hülle geladen werden.
const builderPos = html.indexOf('/static/operating-strategies-rule-builder.js');
const appPos = html.indexOf('/static/operating-strategies-appcenter.js');
assert.ok(builderPos >= 0 && appPos > builderPos, 'Regelbaukasten muss vor operating-strategies-appcenter.js geladen werden');
assert.ok(pkg.files.includes(builderJsPath), 'Regelbaukasten fehlt in package.json files');
assert.ok(pkg.files.includes(appJsPath), 'AppCenter-Hülle fehlt in package.json files');

// 2. Strikter Schreibschutz in beiden Browsermodulen.
const forbiddenWriter = /\b(?:setForeignState(?:Async)?|setState(?:Async)?|writeForeignState|sendToHost)\s*\(|\/api\/(?:state|object)\/set/i;
for (const [label, source] of [['app TS', appTs], ['builder TS', builderTs], ['app JS', appJs], ['builder JS', builderJs]]) {
  assert.equal(forbiddenWriter.test(source), false, `${label} enthält einen direkten Hardware-Schreibpfad`);
}
assert.match(appTs, /mode:\s*'observe'/);
assert.match(appTs, /controlTakeoverEnabled:\s*false/);
assert.match(appTs, /writeExecutionEnabled:\s*false/);
assert.match(builderTs, /simulationOnly:\s*true/);
assert.match(builderTs, /executionEnabled:\s*false/);
assert.match(builderTs, /hardwareWrites:\s*0/);
assert.match(appTs, /chargingScope:\s*'auto-only'/);
assert.match(appTs, /existingChargingModesUntouched:\s*true/);
assert.match(appTs, /fallbackAutoSource:\s*'standard-auto'/);

// 3. Browsernormalisierung und Simulation real ausführen.
const documentStub = {
  getElementById() { return null; },
  querySelectorAll() { return []; },
  querySelector() { return null; },
};
const context = vm.createContext({
  window: {}, document: documentStub, console, Date, JSON, Math, Number, String,
  Boolean, Object, Array, Set, Map, RegExp,
});
vm.runInContext(builderJs, context, { filename: builderJsPath });
vm.runInContext(appJs, context, { filename: appJsPath });
const builder = context.window.NexoWattOperatingStrategiesRuleBuilder;
const app = context.window.NexoWattOperatingStrategiesAppCenter;
assert.ok(builder && typeof builder.simulate === 'function');
assert.ok(app && typeof app.normalizeConfig === 'function');

const defaults = app.normalizeConfig({});
assert.equal(defaults.schemaVersion, 3);
assert.equal(defaults.mode, 'observe');
assert.equal(defaults.controlTakeoverEnabled, false);
assert.equal(defaults.writeExecutionEnabled, false);
assert.equal(defaults.profiles.length, 2);
assert.equal(defaults.profiles.find((row) => row.id === 'winter').nightReserve.targetSocPct, 40);
assert.equal(defaults.profiles.find((row) => row.id === 'summer').nightReserve.targetSocPct, 60);

const malicious = app.normalizeConfig({
  mode: 'control', controlTakeoverEnabled: true, writeExecutionEnabled: true,
  resourceLinks: [{ sourceId: 'evcs:lp1', enabled: true, autoOnly: false, writeEnabled: true, priority: 999 }],
  customResources: [{ id: 'custom', resourceType: 'chargingPoint', writeEnabled: true, autoOnly: false, mappings: { setpointWriteId: 'evil.write' } }],
  profiles: [{ id: 'winter', nightReserve: { storageResourceId: 'storage:1', targetSocPct: 40, absoluteMinSocPct: 90 } }],
  rules: [{
    id: 'unsafe', name: 'Manipulierte Regel', ruleType: 'targetPower', requirement: 'must', priority: 999,
    targetResourceId: 'evcs:lp1', executionEnabled: true, simulationOnly: false,
    schedule: { mode: 'dailyTime', atTime: '19:00', windowMinutes: 99999, weekdays: ['mon', 'bad'] },
    target: { value: 999999999999 },
  }],
});
assert.equal(malicious.mode, 'observe');
assert.equal(malicious.controlTakeoverEnabled, false);
assert.equal(malicious.writeExecutionEnabled, false);
assert.equal(malicious.resourceLinks[0].autoOnly, true);
assert.equal(malicious.resourceLinks[0].writeEnabled, false);
assert.equal(malicious.customResources[0].autoOnly, true);
assert.equal(malicious.customResources[0].writeEnabled, false);
assert.equal(malicious.profiles[0].nightReserve.absoluteMinSocPct, 40);
assert.equal(malicious.rules.length, 1);
assert.equal(malicious.rules[0].simulationOnly, true);
assert.equal(malicious.rules[0].executionEnabled, false);
assert.equal(malicious.rules[0].priority, 100);
assert.equal(malicious.rules[0].schedule.windowMinutes, 1440);
assert.deepEqual(malicious.rules[0].schedule.weekdays, ['mon']);

const resources = [
  { sourceId: 'storage:1', name: 'Speicher', resourceType: 'storage', controlType: 'setpoint', strategyEnabled: true, usableCapacityKWh: 30, efficiencyPct: 92, maxPowerW: 10000 },
  { sourceId: 'evcs:1', name: 'Fahrzeug', resourceType: 'chargingPoint', controlType: 'energyTarget', strategyEnabled: true, usableCapacityKWh: 70, efficiencyPct: 92, minPowerW: 4200, maxPowerW: 11000 },
  { sourceId: 'thermal:1', name: 'Kühlhaus', resourceType: 'thermal', resourceSubtype: 'cooling', controlType: 'thermal', strategyEnabled: true, maxPowerW: 5000 },
  { sourceId: 'rod:1', name: 'Heizstab', resourceType: 'thermal', resourceSubtype: 'heatingRod', controlType: 'stepped', strategyEnabled: true, maxPowerW: 6000 },
];

let config = app.normalizeConfig({
  activeProfileId: 'winter',
  profiles: [{ id: 'winter', name: 'Winterbetrieb', enabled: true, season: 'winter', nightReserve: { enabled: true, storageResourceId: 'storage:1', targetSocPct: 40, absoluteMinSocPct: 10, startTime: '18:00', endTime: '07:00' } }],
});
config.rules = builder.createCustomerExampleRules(resources, []);
assert.equal(config.rules.length, 5);
assert.ok(config.rules.some((row) => row.requirement === 'must'));
assert.ok(config.rules.some((row) => row.requirement === 'should'));
assert.ok(config.rules.some((row) => row.requirement === 'can'));
const coolingRule = config.rules.find((row) => row.templateKey === 'customer-cooling-night-pause');
assert.equal(coolingRule.schedule.mode, 'dailyTime');
assert.equal(coolingRule.schedule.atTime, '19:00');
assert.equal(coolingRule.simulationOnly, true);
assert.equal(coolingRule.executionEnabled, false);

const simulation = builder.ensureSimulationStates({
  activeProfileId: 'winter', nowLocal: '2026-08-11T19:05', outsideTemperatureC: 5,
  pvForecastKWh: 30, pvSurplusW: 3000, gridPowerW: 0, weekend: true,
  resourceStates: {
    'storage:1': { socPct: 65, capacityKWh: 30, online: true, fresh: true, alarm: false },
    'evcs:1': { socPct: 40, capacityKWh: 70, online: true, fresh: true, alarm: false },
    'thermal:1': { temperatureC: 3, active: true, state: 'running', runDurationMin: 120, offDurationMin: 0, online: true, fresh: true, alarm: false },
    'rod:1': { active: false, online: true, fresh: true, alarm: false },
  },
}, resources);
const result = builder.simulate({ ...config, simulation }, resources, simulation);
assert.equal(result.simulationOnly, true);
assert.equal(result.hardwareWrites, 0);
assert.ok(result.decisions.some((row) => row.name.includes('Fahrzeug: 70') && row.status === 'request' && row.selected));
assert.ok(result.decisions.some((row) => row.name.includes('Kühlhaus') && row.status === 'request' && row.selected));
assert.ok(result.decisions.some((row) => row.ruleType === 'nightReserve' && row.status === 'completed'));
assert.ok(result.selectedRequests.every((row) => row.simulationOnly === true));

const outsideWindow = builder.simulate(
  { ...config, simulation: { ...simulation, nowLocal: '2026-08-11T18:00' } },
  resources,
  { ...simulation, nowLocal: '2026-08-11T18:00' },
);
assert.ok(outsideWindow.decisions.some((row) => row.name.includes('Kühlhaus') && row.status === 'inactive' && /Zeitplan/.test(row.headline)));

const thermalSafety = builder.simulate(
  { ...config, simulation: { ...simulation, resourceStates: { ...simulation.resourceStates, 'thermal:1': { ...simulation.resourceStates['thermal:1'], temperatureC: 7.5, active: false, state: 'paused', offDurationMin: 20 } } } },
  resources,
);
assert.ok(thermalSafety.decisions.some((row) => row.name.includes('Kühlhaus') && row.status === 'safety' && row.action === 'release'));

const daytimeReserve = builder.simulate(
  { ...config, simulation: { ...simulation, nowLocal: '2026-08-11T12:00', resourceStates: { ...simulation.resourceStates, 'storage:1': { ...simulation.resourceStates['storage:1'], socPct: 25 } } } },
  resources,
);
const reserveBuild = daytimeReserve.decisions.find((row) => row.ruleType === 'nightReserve');
assert.equal(reserveBuild.status, 'request');
assert.equal(reserveBuild.action, 'build-and-protect-reserve');
assert.equal(reserveBuild.selected, true);

const floorSafety = builder.simulate(
  { ...config, simulation: { ...simulation, nowLocal: '2026-08-11T23:00', resourceStates: { ...simulation.resourceStates, 'storage:1': { ...simulation.resourceStates['storage:1'], socPct: 9 } } } },
  resources,
);
const floorDecision = floorSafety.decisions.find((row) => row.ruleType === 'nightReserve');
assert.equal(floorDecision.status, 'safety');
assert.equal(floorDecision.action, 'block-discharge-below-floor');

// Eine Zielressource ohne explizite Teilnahme darf nie als gültiges Regelziel gelten.
const notOptedIn = builder.validateRule({ ...config.rules[0], targetResourceId: 'evcs:no-opt-in' }, [...resources, { sourceId: 'evcs:no-opt-in', name: 'Nicht freigegeben', resourceType: 'chargingPoint', strategyEnabled: false }], 'winter');
assert.equal(notOptedIn.valid, false);
assert.ok(notOptedIn.errors.some((entry) => /nicht ausdrücklich/.test(entry)));

// 4. Backend hält die RC54-Defaults fail-closed, unterstützt ab RC56 aber den
//    vollständigen, ausdrücklich bestätigten Live-Vertrag.
assert.match(mainTs, /nwNormalizeOperatingStrategies\(configIn, appEnabled = false\)/);
assert.match(mainTs, /schemaVersion:\s*3/);
assert.match(mainTs, /mode:\s*'observe'/);
assert.match(mainTs, /controlTakeoverEnabled:\s*false/);
assert.match(mainTs, /writeExecutionEnabled:\s*false/);
assert.match(mainTs, /simulationOnly:\s*true/);
assert.match(mainTs, /executionEnabled:\s*false/);
assert.match(mainTs, /ruleBuilderVersion:\s*'0\.8\.178'/);
assert.match(mainTs, /autoControl\.stage === 'active'/);
assert.match(mainTs, /commissioningConfirmed/);
assert.match(mainTs, /storageResourceId/);
assert.match(mainTs, /minRunDurationMin/);

// 5. RC56-Migrationsvertrag: genau ein schreibfreier Planer erzeugt kurzlebige
//    Anforderungen; ausschließlich die bestehenden Fachmodule konsumieren sie.
const plannerTs = read('src-ts/runtime-executables/ems/modules/operating-strategies.ts');
const runtimeTs = read('src-ts/runtime-executables/ems/services/operating-strategy-runtime.ts');
const managerTs = read('src-ts/runtime-executables/ems/module-manager.ts');
const chargingTs = read('src-ts/runtime-executables/ems/modules/charging-management.ts');
const storageTs = read('src-ts/runtime-executables/ems/modules/storage-control.ts');
const thermalTs = read('src-ts/runtime-executables/ems/modules/thermal-control.ts');
const heatingTs = read('src-ts/runtime-executables/ems/modules/heating-rod-control.ts');

assert.match(plannerTs, /hardwareWrites['"]?\s*[:,]\s*0/);
assert.equal(/\b(?:writeNumber|writeBoolean|setForeignState(?:Async)?|setState(?:Async)?)\s*\(/.test(plannerTs), false, 'Strategieplaner darf keinen Hardware-Datenpunkt beschreiben');
assert.match(runtimeTs, /isOperatingStrategiesLiveConfig/);
assert.match(runtimeTs, /isRuntimeRequestFresh/);
assert.match(runtimeTs, /resolveChargingStrategyOverlay/);
assert.match(runtimeTs, /resolveStorageStrategyOverlay/);
assert.match(runtimeTs, /resolveThermalStrategyOverlay/);
assert.match(runtimeTs, /resolveHeatingRodStrategyOverlay/);

const strategyPos = managerTs.indexOf("key: 'operatingStrategies'");
const chargingPos = managerTs.indexOf("key: 'chargingManagement'");
assert.ok(strategyPos >= 0 && chargingPos > strategyPos, 'Strategieplaner muss vor dem Lademanagement laufen');
assert.match(chargingTs, /resolveChargingStrategyOverlay/);
assert.match(storageTs, /resolveStorageStrategyOverlay/);
assert.match(thermalTs, /resolveThermalStrategyOverlay/);
assert.match(heatingTs, /resolveHeatingRodStrategyOverlay/);

console.log('[rc54-operating-strategies-rules-simulation] OK: RC54-Regelbaukasten bleibt simulationsfähig; RC56 koppelt ihn ausschließlich über kurzlebige Anforderungen an bestehende Single-Writer-Fachmodule.');
