#!/usr/bin/env node
'use strict';

/**
 * RC54: modularer MUSS-/SOLL-/KANN-Regelbaukasten und sicherer Trockenlauf.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

const builderTs = read('src-ts/runtime-executables/www/operating-strategies-rule-builder.ts');
const builderJs = read('www/operating-strategies-rule-builder.js');
const appTs = read('src-ts/runtime-executables/www/operating-strategies-appcenter.ts');
const appJs = read('www/operating-strategies-appcenter.js');
const emsAppsTs = read('src-ts/runtime-executables/www/ems-apps.ts');
const html = read('www/ems-apps.html');
const mainTs = read('src-ts/runtime-executables/main.ts');
const pkg = JSON.parse(read('package.json'));

// 1. Release-/Ladevertrag.
assert.match(html, /\/static\/operating-strategies-rule-builder\.js[\s\S]*\/static\/operating-strategies-appcenter\.js/);
assert.ok(pkg.files.includes('www/operating-strategies-rule-builder.js'));
assert.match(emsAppsTs, /MUSS-\/SOLL-\/KANN-Regeln/);
assert.match(builderTs, /BUILDER_VERSION\s*=\s*'0\.8\.178'/);
assert.match(appTs, /RULE_BUILDER_VERSION\s*=\s*'0\.8\.178'/);

// 2. Die neue Schicht darf keinen Hardware-Schreibpfad enthalten.
const forbiddenWriter = /\b(?:setForeignState(?:Async)?|setState(?:Async)?|writeForeignState|sendToHost)\s*\(|\/api\/(?:state|object)\/set/i;
for (const [label, source] of [
  ['builder TS', builderTs], ['builder JS', builderJs], ['app TS', appTs], ['app JS', appJs],
]) {
  assert.equal(forbiddenWriter.test(source), false, `${label} enthält einen direkten Hardware-Schreibpfad`);
}
assert.match(builderTs, /simulationOnly:\s*true/);
assert.match(builderTs, /executionEnabled:\s*false/);
assert.match(builderTs, /hardwareWrites:\s*0/);
assert.match(appTs, /controlTakeoverEnabled:\s*false/);
assert.match(appTs, /writeExecutionEnabled:\s*false/);

// 3. Browser-APIs real in einer VM ausführen.
const context = vm.createContext({
  window: {},
  document: {},
  console,
  Date,
  JSON,
  Math,
  Number,
  String,
  Boolean,
  Object,
  Array,
  Set,
  Map,
  RegExp,
});
vm.runInContext(builderJs, context, { filename: 'operating-strategies-rule-builder.js' });
vm.runInContext(appJs, context, { filename: 'operating-strategies-appcenter.js' });
const builder = context.window.NexoWattOperatingStrategiesRuleBuilder;
const app = context.window.NexoWattOperatingStrategiesAppCenter;
assert.ok(builder && typeof builder.simulate === 'function');
assert.ok(app && typeof app.normalizeConfig === 'function');

const resources = [
  { sourceId: 'storage:primary', name: 'Speicher', resourceType: 'storage', resourceSubtype: 'battery', controlType: 'setpoint', usableCapacityKWh: 30, efficiencyPct: 92, writes: 1, strategyEnabled: true },
  { sourceId: 'evcs:lp1', name: 'Fahrzeug', resourceType: 'chargingPoint', resourceSubtype: 'ev', controlType: 'energyTarget', usableCapacityKWh: 70, efficiencyPct: 92, writes: 1, strategyEnabled: true },
  { sourceId: 'flow-consumer:1', name: 'Kühlhaus', resourceType: 'thermal', resourceSubtype: 'cooling', controlType: 'switch', writes: 1, strategyEnabled: true },
  { sourceId: 'heatingRod:1', name: 'Heizstab', resourceType: 'thermal', resourceSubtype: 'heatingRod', controlType: 'stepped', writes: 1, strategyEnabled: true },
];

const generated = builder.createCustomerExampleRules(resources, []);
assert.equal(generated.length, 5);
assert.deepEqual(Array.from(generated.map((rule) => rule.requirement)), ['should', 'must', 'should', 'can', 'can']);
assert.ok(generated.every((rule) => rule.simulationOnly === true && rule.executionEnabled === false));
assert.ok(generated.some((rule) => rule.ruleType === 'thermalPause'));
assert.ok(generated.some((rule) => rule.ruleType === 'targetSoc' && rule.target.value === 70));
assert.ok(generated.some((rule) => rule.ruleType === 'switchState'));

// Ohne Speicher muss die Vorlagenbedingung sichtbar unvollständig bleiben und darf
// nicht unbemerkt zu einer Systembedingung umgedeutet werden.
const missingStorageRules = builder.createCustomerExampleRules(resources.filter((entry) => entry.resourceType !== 'storage'), []);
const coolingWithoutStorage = missingStorageRules.find((rule) => rule.templateKey === 'customer-cooling-night-pause');
assert.ok(coolingWithoutStorage.conditions.some((condition) => String(condition.sourceRef).startsWith('missing:')));
assert.equal(builder.validateRule(coolingWithoutStorage, resources.filter((entry) => entry.resourceType !== 'storage'), 'winter').valid, false);

const config = app.normalizeConfig({
  enabled: true,
  mode: 'control',
  controlTakeoverEnabled: true,
  writeExecutionEnabled: true,
  profiles: [
    { id: 'winter', name: 'Winter', enabled: true, season: 'winter', nightReserve: { targetSocPct: 40, absoluteMinSocPct: 10 } },
    { id: 'summer', name: 'Sommer', enabled: true, season: 'summer', nightReserve: { targetSocPct: 60, absoluteMinSocPct: 10 } },
  ],
  activeProfileId: 'winter',
  rules: generated,
});
assert.equal(config.schemaVersion, 3);
assert.equal(config.mode, 'observe');
assert.equal(config.controlTakeoverEnabled, false);
assert.equal(config.writeExecutionEnabled, false);
assert.equal(config.rules.length, 5);
assert.ok(config.rules.every((rule) => rule.simulationOnly === true && rule.executionEnabled === false));

const simulation = builder.ensureSimulationStates({
  activeProfileId: 'winter',
  nowLocal: '2026-08-11T19:00',
  outsideTemperatureC: 5,
  pvForecastKWh: 30,
  pvSurplusW: 3000,
  gridPowerW: 0,
  electricityPriceCtKWh: 30,
  weekend: true,
  cheapTariff: false,
  resourceStates: {
    'storage:primary': { socPct: 96, capacityKWh: 30, online: true, fresh: true, alarm: false },
    'evcs:lp1': { socPct: 40, capacityKWh: 70, online: true, fresh: true, alarm: false },
    'flow-consumer:1': { temperatureC: 3, offDurationMin: 0, online: true, fresh: true, alarm: false },
    'heatingRod:1': { online: true, fresh: true, alarm: false },
  },
}, resources);
const result = builder.simulate({ ...config, simulation }, resources, simulation);
assert.equal(result.simulationOnly, true);
assert.equal(result.hardwareWrites, 0);
const ev70 = result.decisions.find((row) => row.ruleId === 'customer-vehicle-70-by-noon');
const ev100 = result.decisions.find((row) => row.ruleId === 'customer-vehicle-100-weekend');
assert.equal(ev70.status, 'request');
assert.equal(ev70.selected, true, 'MUSS-Ziel 70 % muss die EV-Kaskade gewinnen');
assert.equal(ev100.status, 'shadowed', 'KANN-Ziel 100 % muss bei gleichem Ziel zurückgestellt werden');
assert.equal(ev100.selected, false);
assert.match(ev70.details, /Energiebedarf ca\./);
assert.match(ev70.details, /Erforderlicher Mittelwert ca\./);

// Thermische Sicherheitsgrenzen übersteuern die normale Freigabebedingung.
const safetySimulation = builder.ensureSimulationStates({
  ...simulation,
  resourceStates: {
    ...simulation.resourceStates,
    'flow-consumer:1': { temperatureC: 7.5, offDurationMin: 0, online: true, fresh: true, alarm: false },
  },
}, resources);
const safetyResult = builder.simulate({ ...config, simulation: safetySimulation }, resources, safetySimulation);
const coolingSafety = safetyResult.decisions.find((row) => row.ruleId === 'customer-cooling-night-pause');
assert.equal(coolingSafety.status, 'safety');
assert.equal(coolingSafety.selected, true);
assert.match(coolingSafety.headline, /Wiedereinschalten|Freigabe/);

// 4. Backend-Normalisierer dynamisch ausführen und manipulierte Payloads fail-closed normalisieren.
function extractClassMethod(source, signature) {
  const start = source.indexOf(signature);
  assert.ok(start >= 0, `${signature} nicht gefunden`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = brace; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    if (lineComment) { if (ch === '\n') lineComment = false; continue; }
    if (blockComment) { if (ch === '*' && next === '/') { blockComment = false; i += 1; } continue; }
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '/' && next === '/') { lineComment = true; i += 1; continue; }
    if (ch === '/' && next === '*') { blockComment = true; i += 1; continue; }
    if (ch === '\'' || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Methode ${signature} nicht vollständig gefunden`);
}

const methodSource = extractClassMethod(mainTs, 'nwNormalizeOperatingStrategies(configIn, appEnabled = false)');
const Normalizer = Function(`return class Normalizer {
  _nwIsPlainObject(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
  _nwDeepClone(value) { return JSON.parse(JSON.stringify(value)); }
  ${methodSource}
}`)();
const backend = new Normalizer();
const backendOut = backend.nwNormalizeOperatingStrategies({
  mode: 'control',
  controlTakeoverEnabled: true,
  writeExecutionEnabled: true,
  activeProfileId: 'winter',
  profiles: config.profiles,
  rules: [{
    id: 'r1', name: 'Manipuliert', enabled: true, requirement: 'must', priority: 999,
    profileScope: 'active', targetResourceId: 'evcs:lp1', ruleType: 'targetSoc',
    schedule: { mode: 'dailyTime', atTime: '99:99', windowMinutes: 9999, weekdays: ['mon', 'bad'] },
    target: { value: 999, dueTime: '99:99', dueDay: 'bad', energySourcePolicy: 'bad' },
    safety: { minRunDurationMin: -5, minStopDurationMin: 9999 }, conditions: [{ sourceRef: 'system', metric: 'weekend', operator: 'gt', value: true }],
    simulationOnly: false, executionEnabled: true,
  }],
  simulation: { activeProfileId: 'unknown', nowLocal: 'bad', resourceStates: { 'evcs:lp1': { socPct: 200, runDurationMin: -5, online: false } } },
}, true);
assert.equal(backendOut.schemaVersion, 3);
assert.equal(backendOut.enabled, true);
assert.equal(backendOut.mode, 'observe');
assert.equal(backendOut.controlTakeoverEnabled, false);
assert.equal(backendOut.writeExecutionEnabled, false);
assert.equal(backendOut.rules.length, 1);
assert.equal(backendOut.rules[0].priority, 100);
assert.equal(backendOut.rules[0].target.value, 100);
assert.equal(backendOut.rules[0].target.dueTime, '12:00');
assert.equal(backendOut.rules[0].schedule.atTime, '00:00');
assert.equal(backendOut.rules[0].schedule.windowMinutes, 1440);
assert.deepEqual(backendOut.rules[0].schedule.weekdays, ['mon']);
assert.equal(backendOut.rules[0].safety.minRunDurationMin, 0);
assert.equal(backendOut.rules[0].safety.minStopDurationMin, 1440);
assert.equal(backendOut.rules[0].conditions[0].operator, 'eq');
assert.equal(backendOut.rules[0].simulationOnly, true);
assert.equal(backendOut.rules[0].executionEnabled, false);
assert.equal(backendOut.simulation.activeProfileId, 'winter');
assert.equal(backendOut.simulation.resourceStates['evcs:lp1'].socPct, 100);
assert.equal(backendOut.simulation.resourceStates['evcs:lp1'].runDurationMin, 0);
assert.equal(backendOut.controlContract.chargingScope, 'auto-only');
assert.equal(backendOut.controlContract.existingChargingModesUntouched, true);

// 5. Produktive Regler konsumieren die neue Planung weiterhin nicht.
for (const file of [
  'src-ts/runtime-executables/ems/modules/charging-management.ts',
  'src-ts/runtime-executables/ems/modules/storage-control.ts',
  'src-ts/runtime-executables/ems/modules/heating-rod-control.ts',
  'src-ts/runtime-executables/ems/modules/thermal-control.ts',
]) {
  assert.equal(read(file).includes('operatingStrategies'), false, `${file} darf RC54 noch nicht ausführen`);
}

console.log('[rc54-operating-strategies] OK: modularer Regelbaukasten, Vorlagen, thermische Sicherheit, Prioritätskaskade, Backend-Persistenz und 0 Hardware-Schreibpfade verifiziert.');
