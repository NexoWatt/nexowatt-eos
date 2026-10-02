#!/usr/bin/env node
'use strict';

/**
 * RC53: Sichere AppCenter-Grundlage für EOS-Betriebsstrategien.
 *
 * Prüft App/Tab, Pro-Lizenzierung, Ressourcen-/Profilnormalisierung,
 * vorhandene Geräteübernahme und den fail-closed Beobachtungsvertrag.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const canonicalUiPath = 'src-ts/runtime-executables/www/operating-strategies-appcenter.ts';
const runtimeUiPath = 'www/operating-strategies-appcenter.js';
assert.ok(fs.existsSync(path.join(root, canonicalUiPath)), 'canonical operating-strategies UI source missing');
assert.ok(fs.existsSync(path.join(root, runtimeUiPath)), 'generated operating-strategies runtime missing; run sync:ts-runtime-executables');

const canonicalUi = read(canonicalUiPath);
const runtimeUi = read(runtimeUiPath);
const emsAppsTs = read('src-ts/runtime-executables/www/ems-apps.ts');
const emsAppsRuntime = read('www/ems-apps.js');
const html = read('www/ems-apps.html');
const mainTs = read('src-ts/runtime-executables/main.ts');
const featureTs = read('src-ts/runtime-executables/ems/services/feature-flags.ts');

// 1. AppCenter- und Reitervertrag.
assert.match(html, /data-tab="strategies"[^>]*>Betriebsstrategien</);
assert.match(html, /id="operatingStrategiesConfigSlot"/);
assert.match(html, /\/static\/operating-strategies-appcenter\.js/);
assert.match(emsAppsTs, /id:\s*'operatingStrategies'/);
assert.match(emsAppsTs, /operatingStrategies:\s*'operatingStrategies'/);
assert.match(emsAppsTs, /tab:\s*'strategies'/);
assert.match(emsAppsTs, /NexoWattOperatingStrategiesAppCenter\.collect/);
assert.match(emsAppsRuntime, /NexoWattOperatingStrategiesAppCenter/);

// 2. Keine direkte Hardwareausführung im neuen Browsermodul.
const forbiddenWriter = /\b(?:setForeignState(?:Async)?|setState(?:Async)?|writeForeignState|sendToHost)\s*\(|\/api\/(?:state|object)\/set/i;
assert.equal(forbiddenWriter.test(canonicalUi), false, 'canonical UI must not contain a direct writer');
assert.equal(forbiddenWriter.test(runtimeUi), false, 'runtime UI must not contain a direct writer');
assert.match(canonicalUi, /controlTakeoverEnabled:\s*false/);
assert.match(canonicalUi, /writeExecutionEnabled:\s*false/);
assert.match(canonicalUi, /chargingScope:\s*'auto-only'/);
assert.match(canonicalUi, /existingChargingModesUntouched:\s*true/);
assert.match(canonicalUi, /fallbackAutoSource:\s*'standard-auto'/);
assert.match(canonicalUi, /simulationOnly:\s*true/);
assert.match(canonicalUi, /executionEnabled:\s*false/);

// 3. Browsernormalisierung real ausführen.
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
vm.runInContext(runtimeUi, context, { filename: runtimeUiPath });
const api = context.window.NexoWattOperatingStrategiesAppCenter;
assert.ok(api && typeof api.normalizeConfig === 'function' && typeof api.deriveExistingResources === 'function');

const defaults = api.normalizeConfig({});
assert.equal(defaults.mode, 'observe');
assert.equal(defaults.controlTakeoverEnabled, false);
assert.equal(defaults.writeExecutionEnabled, false);
assert.equal(defaults.profiles.length, 2);
assert.equal(defaults.profiles.find((row) => row.id === 'winter').nightReserve.targetSocPct, 40);
assert.equal(defaults.profiles.find((row) => row.id === 'summer').nightReserve.targetSocPct, 60);
assert.equal(defaults.controlContract.chargingScope, 'auto-only');
assert.equal(defaults.controlContract.explicitAutoSourceOptInRequired, true);
assert.equal(defaults.controlContract.singleWriterRequired, true);
assert.equal(JSON.stringify(defaults.rules), '[]');

const malicious = api.normalizeConfig({
  enabled: true,
  mode: 'control',
  controlTakeoverEnabled: true,
  writeExecutionEnabled: true,
  controlContract: { chargingScope: 'all-modes', existingChargingModesUntouched: false },
  resourceLinks: [
    { sourceId: 'evcs:lp1', enabled: true, writeEnabled: true, autoOnly: false, priority: 999 },
    { sourceId: 'evcs:lp1', enabled: false },
  ],
  customResources: [
    { id: 'duplicate', resourceType: 'chargingPoint', writeEnabled: true, autoOnly: false, mappings: { setpointWriteId: 'wallbox.write' } },
    { id: 'duplicate', resourceType: 'consumer', writeEnabled: true },
  ],
  profiles: [
    { id: 'same', name: 'A', nightReserve: { targetSocPct: 30, absoluteMinSocPct: 90 } },
    { id: 'same', name: 'B', nightReserve: { targetSocPct: 70, absoluteMinSocPct: 10 } },
  ],
  rules: [{ action: 'write', value: 22000 }],
});
assert.equal(malicious.mode, 'observe');
assert.equal(malicious.controlTakeoverEnabled, false);
assert.equal(malicious.writeExecutionEnabled, false);
assert.equal(malicious.resourceLinks.length, 1);
assert.equal(malicious.resourceLinks[0].autoOnly, true);
assert.equal(malicious.resourceLinks[0].writeEnabled, false);
assert.equal(malicious.resourceLinks[0].priority, 100);
assert.equal(malicious.customResources[0].autoOnly, true);
assert.ok(malicious.customResources.every((row) => row.writeEnabled === false && row.observeOnly === true));
assert.notEqual(malicious.customResources[0].id, malicious.customResources[1].id);
assert.notEqual(malicious.profiles[0].id, malicious.profiles[1].id);
assert.equal(malicious.profiles[0].nightReserve.absoluteMinSocPct, 30);
assert.equal(JSON.stringify(malicious.rules), '[]');
assert.equal(malicious.controlContract.chargingScope, 'auto-only');
assert.equal(malicious.controlContract.existingChargingModesUntouched, true);

// 4. Vorhandene Ressourcen werden aus den aktuellen EOS-Konfigurationen abgeleitet.
const derived = api.deriveExistingResources({
  emsApps: { apps: { storagefarm: { installed: true }, storage: { installed: true } } },
  storageFarm: {
    storages: [{ name: 'Farm Speicher 1', socId: 'farm.soc', signedPowerId: 'farm.power', setSignedPowerId: 'farm.set' }],
  },
  storage: { name: 'Einzelspeicher', datapoints: { socObjectId: 'single.soc', targetPowerObjectId: 'single.set' } },
  settingsConfig: {
    evcsList: [{ name: 'LP 1', enabled: true, stationKey: 'dc-a', connectorNo: 1, powerId: 'ev.power', vehicleSocId: 'ev.soc', setPowerWId: 'ev.set' }],
  },
  datapoints: { consumer1Power: 'flow.consumer.1.power' },
  vis: { flowSlots: { consumers: [{ name: 'Kühlhaus', consumerType: 'generic', ctrl: { switchWriteId: 'cold.enable', switchReadId: 'cold.run' } }] } },
  thermal: { devices: [{ name: 'Wärmepumpe', temperatureId: 'hp.temp', runWriteId: 'hp.run' }] },
  heatingRod: { devices: [{ name: 'Heizstab', stage1WriteId: 'rod.stage1' }] },
});
const ids = derived.map((row) => row.sourceId);
assert.ok(ids.includes('storagefarm:1'));
assert.equal(ids.includes('storage:primary'), false, 'farm resources must suppress the duplicate single-storage card');
assert.ok(ids.includes('evcs:lp1'));
assert.ok(ids.includes('flow-consumer:1'));
assert.ok(ids.includes('thermal:1'));
assert.ok(ids.includes('heatingRod:1'));
const evcs = derived.find((row) => row.sourceId === 'evcs:lp1');
assert.ok(evcs.capabilities.some((entry) => String(entry).includes('ausschließlich in Auto')));

// 5. Backend erzwingt denselben Fail-closed-Vertrag und persistiert den neuen Root.
assert.match(mainTs, /nwNormalizeOperatingStrategies\(configIn, appEnabled = false\)/);
assert.match(mainTs, /mode:\s*'observe'/);
assert.match(mainTs, /controlTakeoverEnabled:\s*false/);
assert.match(mainTs, /writeExecutionEnabled:\s*false/);
assert.match(mainTs, /simulationOnly:\s*true/);
assert.match(mainTs, /executionEnabled:\s*false/);
assert.match(mainTs, /'operatingStrategies'/);
assert.match(mainTs, /operatingStrategies:\s*this\.nwNormalizeOperatingStrategies\(n\.operatingStrategies, operatingStrategiesActive\)/);
assert.match(mainTs, /operatingStrategiesApp\.installed && operatingStrategiesApp\.enabled/);
assert.match(mainTs, /chargingScope:\s*'auto-only'/);
assert.match(mainTs, /fallbackAutoSource:\s*'standard-auto'/);

// 6. Pro-only-Lizenzvertrag.
assert.match(featureTs, /operatingStrategies:\s*'operatingStrategies'/);
assert.match(featureTs, /EOS_ONLY_FEATURES[\s\S]*'operatingStrategies'/);
const features = require(path.join(root, 'ems/services/feature-flags.js'));
assert.equal(features.appFeature('operatingStrategies'), 'operatingStrategies');
assert.equal(features.allowsApp('eos', 'operatingStrategies'), true);
assert.equal(features.allowsApp('hems', 'operatingStrategies'), false);
assert.ok(features.eosOnlyFeatures().includes('operatingStrategies'));
assert.equal(features.homeIncludedApps().includes('operatingStrategies'), false);

// 7. Produktive Fachregler konsumieren die neue Konfiguration in RC53 nicht.
const unchangedOwners = [
  'src-ts/runtime-executables/ems/modules/charging-management.ts',
  'src-ts/runtime-executables/ems/modules/storage-control.ts',
  'src-ts/runtime-executables/ems/modules/heating-rod-control.ts',
  'src-ts/runtime-executables/ems/modules/thermal-control.ts',
];
for (const file of unchangedOwners) {
  assert.equal(read(file).includes('operatingStrategies'), false, `${file} must not consume operatingStrategies in RC53`);
}

console.log('[rc53-operating-strategies] OK: AppCenter, resources, DP preparation, night reserve profiles, Pro gate and fail-closed observation contract verified.');
